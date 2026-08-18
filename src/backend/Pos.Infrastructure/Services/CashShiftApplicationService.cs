using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Pos.Application.CashShift.DTOs;
using Pos.Application.CashShift.Services;
using Pos.Application.Common.Interfaces;
using Pos.Domain.Common;
using Pos.Domain.Entidades;
using Pos.Infrastructure.Persistence;

namespace Pos.Infrastructure.Services;

public class CashShiftApplicationService : ICashShiftApplicationService
{
    private const decimal MaximumCashAmount = 1_000_000m;
    private readonly PosDbContext _dbContext;
    private readonly IAuditLogService _auditLogService;

    public CashShiftApplicationService(PosDbContext dbContext, IAuditLogService auditLogService)
    {
        _dbContext = dbContext;
        _auditLogService = auditLogService;
    }

    public async Task<CashShiftDto?> GetCurrentOpenShiftAsync(Guid userId, CancellationToken cancellationToken = default)
    {
        var shift = await BuildShiftQuery(asNoTracking: true)
            .OrderByDescending(item => item.FechaAperturaUtc)
            .FirstOrDefaultAsync(item => item.Estado == CashShiftStatuses.Open, cancellationToken);
        if (shift == null)
        {
            return null;
        }

        await RefreshSalesTotalsAsync(shift, DateTime.UtcNow, cancellationToken);
        return MapShiftToDto(shift);
    }

    public async Task<CashShiftDto> OpenShiftAsync(
        OpenCashShiftDto request,
        Guid userId,
        string correlationId,
        string ipAddress,
        CancellationToken cancellationToken = default)
    {
        ValidateAmount(request.OpeningAmount, "El fondo inicial", allowZero: true);
        var notes = ValidateText(request.Notes, "Las notas de apertura", 500, required: false);
        if (!await _dbContext.Users.AnyAsync(user => user.Id == userId && user.EstaActivo, cancellationToken))
        {
            throw new InvalidOperationException("El usuario no existe o se encuentra inactivo.");
        }

        if (await _dbContext.CashShifts.AnyAsync(
                shift => shift.Estado == CashShiftStatuses.Open,
                cancellationToken))
        {
            throw new InvalidOperationException("Ya existe un turno de caja abierto. Ejecute el Corte Z antes de abrir uno nuevo.");
        }

        var openedAtUtc = DateTime.UtcNow;
        var shift = new TurnoCaja
        {
            NumeroTurno = $"CAJA-{openedAtUtc:yyyyMMdd-HHmmss}-{Guid.NewGuid():N}"[..31].ToUpperInvariant(),
            UsuarioId = userId,
            MontoApertura = request.OpeningAmount,
            Estado = CashShiftStatuses.Open,
            FechaAperturaUtc = openedAtUtc,
            Notas = notes
        };
        shift.CalcularEsperado();
        shift.Transacciones.Add(new TransaccionCaja
        {
            TipoTransaccion = CashTransactionTypes.Opening,
            Monto = request.OpeningAmount,
            Motivo = "Fondo inicial de caja",
            UsuarioId = userId,
            FechaCreacionUtc = openedAtUtc
        });

        _dbContext.CashShifts.Add(shift);
        await _dbContext.SaveChangesAsync(cancellationToken);
        await _auditLogService.LogAsync(
            correlationId,
            userId,
            "CASH_SHIFT_OPENED",
            "TurnoCaja",
            shift.Id.ToString(),
            null,
            JsonSerializer.Serialize(new { shift.NumeroTurno, shift.MontoApertura, shift.FechaAperturaUtc, shift.Notas }),
            ipAddress,
            $"Turno de caja abierto: {shift.NumeroTurno}",
            module: "Caja",
            eventType: "CASH_REGISTER_OPENED",
            resultStatus: "SUCCESS",
            cancellationToken: cancellationToken);

        return (await GetCurrentOpenShiftAsync(userId, cancellationToken))!;
    }

    public async Task<CashShiftDto> RegisterDepositAsync(
        CashDepositDto request,
        Guid userId,
        string correlationId,
        string ipAddress,
        CancellationToken cancellationToken = default)
    {
        ValidateAmount(request.Amount, "El monto de entrada", allowZero: false);
        var reason = ValidateText(request.Reason, "El motivo de la entrada", 250, required: true);
        var shift = await GetTrackedOpenShiftAsync(userId, cancellationToken);
        await RefreshSalesTotalsAsync(shift, DateTime.UtcNow, cancellationToken);

        var previousExpectedAmount = shift.MontoCierreEsperado;
        shift.TotalEntradas += request.Amount;
        shift.CalcularEsperado();
        shift.FechaActualizacionUtc = DateTime.UtcNow;
        _dbContext.CashTransactions.Add(new TransaccionCaja
        {
            TurnoCajaId = shift.Id,
            TipoTransaccion = CashTransactionTypes.ManualDeposit,
            Monto = request.Amount,
            Motivo = reason,
            UsuarioId = userId,
            FechaCreacionUtc = DateTime.UtcNow
        });

        await _dbContext.SaveChangesAsync(cancellationToken);
        await _auditLogService.LogAsync(
            correlationId,
            userId,
            "CASH_DEPOSIT_REGISTERED",
            "TurnoCaja",
            shift.Id.ToString(),
            JsonSerializer.Serialize(new { ExpectedCash = previousExpectedAmount, shift.TotalEntradas }),
            JsonSerializer.Serialize(new { Deposit = request.Amount, Reason = reason, ExpectedCash = shift.MontoCierreEsperado, shift.TotalEntradas }),
            ipAddress,
            $"Entrada manual de caja por ${request.Amount:N2}",
            module: "Caja",
            eventType: "CASH_DEPOSIT",
            resultStatus: "SUCCESS",
            cancellationToken: cancellationToken);

        return MapShiftToDto(await ReloadShiftAsync(shift.Id, cancellationToken));
    }

    public async Task<CashShiftDto> RegisterWithdrawalAsync(
        CashWithdrawalDto request,
        Guid userId,
        string correlationId,
        string ipAddress,
        CancellationToken cancellationToken = default)
    {
        ValidateAmount(request.Amount, "El monto a retirar", allowZero: false);
        var reason = ValidateText(request.Reason, "El motivo del retiro", 250, required: true);
        var shift = await GetTrackedOpenShiftAsync(userId, cancellationToken);
        await RefreshSalesTotalsAsync(shift, DateTime.UtcNow, cancellationToken);

        if (request.Amount > shift.MontoCierreEsperado)
        {
            throw new InvalidOperationException($"El retiro excede el efectivo esperado disponible (${shift.MontoCierreEsperado:N2}).");
        }

        var previousExpectedAmount = shift.MontoCierreEsperado;
        shift.TotalRetiros += request.Amount;
        shift.CalcularEsperado();
        shift.FechaActualizacionUtc = DateTime.UtcNow;
        _dbContext.CashTransactions.Add(new TransaccionCaja
        {
            TurnoCajaId = shift.Id,
            TipoTransaccion = CashTransactionTypes.ManualWithdrawal,
            Monto = request.Amount,
            Motivo = reason,
            UsuarioId = userId,
            FechaCreacionUtc = DateTime.UtcNow
        });

        await _dbContext.SaveChangesAsync(cancellationToken);
        await _auditLogService.LogAsync(
            correlationId,
            userId,
            "CASH_WITHDRAWAL_REGISTERED",
            "TurnoCaja",
            shift.Id.ToString(),
            JsonSerializer.Serialize(new { ExpectedCash = previousExpectedAmount, shift.TotalRetiros }),
            JsonSerializer.Serialize(new { Withdrawal = request.Amount, Reason = reason, ExpectedCash = shift.MontoCierreEsperado, shift.TotalRetiros }),
            ipAddress,
            $"Retiro de caja por ${request.Amount:N2}",
            module: "Caja",
            eventType: "CASH_WITHDRAWAL",
            resultStatus: "SUCCESS",
            cancellationToken: cancellationToken);

        return MapShiftToDto(await ReloadShiftAsync(shift.Id, cancellationToken));
    }

    public async Task<CashShiftDto> GenerateXReportAsync(
        Guid userId,
        string correlationId,
        string ipAddress,
        CancellationToken cancellationToken = default)
    {
        var shift = await GetTrackedOpenShiftAsync(userId, cancellationToken);
        await RefreshSalesTotalsAsync(shift, DateTime.UtcNow, cancellationToken);
        shift.FechaActualizacionUtc = DateTime.UtcNow;
        _dbContext.CashTransactions.Add(new TransaccionCaja
        {
            TurnoCajaId = shift.Id,
            TipoTransaccion = CashTransactionTypes.XReport,
            Monto = shift.MontoCierreEsperado,
            Motivo = "Corte X informativo; el turno permanece abierto",
            UsuarioId = userId,
            FechaCreacionUtc = DateTime.UtcNow
        });
        await _dbContext.SaveChangesAsync(cancellationToken);

        await _auditLogService.LogAsync(
            correlationId,
            userId,
            "CASH_X_REPORT_GENERATED",
            "TurnoCaja",
            shift.Id.ToString(),
            null,
            JsonSerializer.Serialize(new
            {
                shift.NumeroTurno,
                shift.MontoApertura,
                shift.TotalVentasEfectivo,
                shift.TotalVentasTarjeta,
                shift.TotalVentasTransferencia,
                shift.TotalEntradas,
                shift.TotalRetiros,
                shift.MontoCierreEsperado
            }),
            ipAddress,
            $"Corte X consultado sin cerrar el turno {shift.NumeroTurno}",
            module: "Caja",
            eventType: "CASH_CUT_CREATED",
            resultStatus: "SUCCESS",
            cancellationToken: cancellationToken);

        return MapShiftToDto(await ReloadShiftAsync(shift.Id, cancellationToken));
    }

    public async Task<CashShiftDto> CloseShiftAsync(
        CloseCashShiftDto request,
        Guid userId,
        string correlationId,
        string ipAddress,
        CancellationToken cancellationToken = default)
    {
        ValidateAmount(request.ActualClosingAmount, "El conteo real", allowZero: true);
        var notes = ValidateText(request.Notes, "La justificación del cierre", 500, required: false);
        var shift = await GetTrackedOpenShiftAsync(userId, cancellationToken);
        var closedAtUtc = DateTime.UtcNow;
        await RefreshSalesTotalsAsync(shift, closedAtUtc, cancellationToken);

        var difference = request.ActualClosingAmount - shift.MontoCierreEsperado;
        if (Math.Abs(difference) > 0.01m && string.IsNullOrWhiteSpace(notes))
        {
            throw new InvalidOperationException("Capture una justificación para el sobrante o faltante antes de ejecutar el Corte Z.");
        }

        var expectedAmount = shift.MontoCierreEsperado;
        shift.CerrarTurno(request.ActualClosingAmount);
        shift.FechaCierreUtc = closedAtUtc;
        shift.FechaActualizacionUtc = closedAtUtc;
        if (!string.IsNullOrWhiteSpace(notes))
        {
            shift.Notas = string.IsNullOrWhiteSpace(shift.Notas) ? notes : $"{shift.Notas} | Cierre: {notes}";
        }
        _dbContext.CashTransactions.Add(new TransaccionCaja
        {
            TurnoCajaId = shift.Id,
            TipoTransaccion = CashTransactionTypes.Closing,
            Monto = request.ActualClosingAmount,
            Motivo = string.IsNullOrWhiteSpace(notes) ? "Cierre sin diferencia" : notes,
            UsuarioId = userId,
            FechaCreacionUtc = closedAtUtc
        });

        await _dbContext.SaveChangesAsync(cancellationToken);
        await _auditLogService.LogAsync(
            correlationId,
            userId,
            "CASH_SHIFT_CLOSED",
            "TurnoCaja",
            shift.Id.ToString(),
            JsonSerializer.Serialize(new { ExpectedAmount = expectedAmount, Status = CashShiftStatuses.Open }),
            JsonSerializer.Serialize(new
            {
                ActualAmount = shift.MontoCierreReal,
                Difference = shift.MontoDiferencia,
                Status = shift.Estado,
                Justification = notes
            }),
            ipAddress,
            $"Corte Z de {shift.NumeroTurno}. Diferencia: ${shift.MontoDiferencia:N2}",
            module: "Caja",
            eventType: "CASH_REGISTER_CLOSED",
            resultStatus: "SUCCESS",
            cancellationToken: cancellationToken);

        return MapShiftToDto(await ReloadShiftAsync(shift.Id, cancellationToken));
    }

    public async Task<List<CashShiftDto>> GetShiftHistoryAsync(CancellationToken cancellationToken = default, int page = 1, int pageSize = 100)
    {
        var (skip, take) = QueryPaging.Normalize(page, pageSize, 100);
        var shifts = await BuildShiftQuery(asNoTracking: false)
            .OrderByDescending(shift => shift.FechaAperturaUtc)
            .ThenByDescending(shift => shift.Id)
            .Skip(skip)
            .Take(take)
            .ToListAsync(cancellationToken);

        foreach (var shift in shifts.Where(s => s.Estado == CashShiftStatuses.Open))
        {
            await RefreshSalesTotalsAsync(shift, DateTime.UtcNow, cancellationToken);
        }

        return shifts.Select(MapShiftToDto).ToList();
    }

    public async Task<List<CashGeneralMovementDto>> GetGeneralMovementsAsync(CancellationToken cancellationToken = default, int page = 1, int pageSize = 250)
    {
        var shift = await _dbContext.CashShifts
            .AsNoTracking()
            .OrderByDescending(item => item.FechaAperturaUtc)
            .FirstOrDefaultAsync(item => item.Estado == CashShiftStatuses.Open, cancellationToken);
        if (shift == null) return [];

        var cashTransactions = await _dbContext.CashTransactions
            .AsNoTracking()
            .Include(item => item.Usuario)
            .Where(item => item.TurnoCajaId == shift.Id &&
                item.TipoTransaccion != CashTransactionTypes.Installment &&
                item.TipoTransaccion != CashTransactionTypes.Refund)
            .Select(item => new CashGeneralMovementDto(
                item.Id.ToString(),
                item.IdVenta,
                item.TipoTransaccion == CashTransactionTypes.Opening ? "Apertura" :
                item.TipoTransaccion == CashTransactionTypes.ManualDeposit ? "Ingreso / Cambio" :
                item.TipoTransaccion == CashTransactionTypes.ManualWithdrawal ? "Retiro / Sangría" :
                item.TipoTransaccion == CashTransactionTypes.XReport ? "Corte X" :
                item.TipoTransaccion == CashTransactionTypes.Closing ? "Corte Z" : item.TipoTransaccion,
                item.TipoTransaccion == CashTransactionTypes.XReport ? "Generación de Corte X de caja" : item.Motivo,
                PaymentMethods.Cash,
                item.TipoTransaccion == CashTransactionTypes.ManualWithdrawal ? -item.Monto : item.Monto,
                item.Usuario != null ? item.Usuario.NombreUsuario : null,
                item.FechaCreacionUtc))
            .ToListAsync(cancellationToken);

        var sales = await _dbContext.Sales
            .AsNoTracking()
            .Include(item => item.Usuario)
            .Where(item => item.EstaActivo && item.Estado != SaleStatuses.Cancelled &&
                item.FechaCreacionUtc >= shift.FechaAperturaUtc)
            .Select(item => new CashGeneralMovementDto(
                item.Id.ToString(),
                item.IdVenta,
                item.TipoPago == SalePaymentTypes.AdvanceDeposit ? "Venta / Abono" :
                item.Notas.StartsWith("Convertida desde cotización") ? "Venta (Cotización)" : "Venta",
                item.TipoPago == SalePaymentTypes.AdvanceDeposit || item.Notas.StartsWith("Convertida desde cotización")
                    ? "Abono a venta"
                    : "Venta #" + item.IdVenta,
                item.TipoPago == SalePaymentTypes.MixedPayment ? "Mixed" :
                    item.MontoTarjeta > 0 ? PaymentMethods.Card :
                    item.MontoTransferencia > 0 ? PaymentMethods.Transfer : PaymentMethods.Cash,
                item.MontoEfectivo + item.MontoTarjeta + item.MontoTransferencia,
                item.Usuario != null ? item.Usuario.NombreUsuario : null,
                item.FechaCreacionUtc))
            .ToListAsync(cancellationToken);

        var installmentRows = await _dbContext.PaymentInstallments
            .AsNoTracking()
            .Include(item => item.Usuario)
            .Include(item => item.Venta)
            .Where(item => item.EstaActivo && item.FechaCreacionUtc >= shift.FechaAperturaUtc)
            .Select(item => new
            {
                item.Id,
                IdVenta = item.IdVenta ?? item.Venta.IdVenta,
                item.FormaPago,
                item.MontoAbonado,
                Usuario = item.Usuario != null ? item.Usuario.NombreUsuario : null,
                item.FechaCreacionUtc
            })
            .ToListAsync(cancellationToken);
        var installments = installmentRows
            .Select(item => new CashGeneralMovementDto(
                item.Id.ToString(),
                item.IdVenta,
                "Abono",
                $"Abono {ReceiptReferences.Create(item.IdVenta)} (Venta #{item.IdVenta})",
                item.FormaPago,
                item.MontoAbonado,
                item.Usuario,
                item.FechaCreacionUtc))
            .ToList();

        var refunds = await _dbContext.ReturnHeaders
            .AsNoTracking()
            .Include(item => item.Usuario)
            .Where(item => item.EstaActivo && item.Estado == ReturnStatuses.Completed &&
                item.FechaCreacionUtc >= shift.FechaAperturaUtc)
            .Select(item => new CashGeneralMovementDto(
                item.Id.ToString(),
                item.IdVenta,
                "Devolución",
                "Devolución " + item.NumeroDevolucion + " (Venta #" + item.IdVenta + ")",
                item.FormaReembolso,
                -item.MontoReembolsado,
                item.Usuario != null ? item.Usuario.NombreUsuario : null,
                item.FechaCreacionUtc))
            .ToListAsync(cancellationToken);

        var (skip, take) = QueryPaging.Normalize(page, pageSize, 250);
        return cashTransactions
            .Concat(sales)
            .Concat(installments)
            .Concat(refunds)
            .OrderByDescending(item => item.CreatedAtUtc)
            .ThenByDescending(item => item.Id)
            .Skip(skip)
            .Take(take)
            .ToList();
    }

    private IQueryable<TurnoCaja> BuildShiftQuery(bool asNoTracking)
    {
        IQueryable<TurnoCaja> query = _dbContext.CashShifts
            .Include(shift => shift.Usuario)
            .Include(shift => shift.Transacciones)
                .ThenInclude(transaction => transaction.Usuario);
        return asNoTracking ? query.AsNoTracking() : query;
    }

    private async Task<TurnoCaja> GetTrackedOpenShiftAsync(Guid userId, CancellationToken cancellationToken)
    {
        return await BuildShiftQuery(asNoTracking: false)
            .OrderByDescending(shift => shift.FechaAperturaUtc)
            .FirstOrDefaultAsync(shift => shift.Estado == CashShiftStatuses.Open, cancellationToken)
            ?? throw new InvalidOperationException("No hay un turno de caja abierto para realizar la operación.");
    }

    private async Task<TurnoCaja> ReloadShiftAsync(Guid shiftId, CancellationToken cancellationToken)
    {
        return await BuildShiftQuery(asNoTracking: true)
            .SingleAsync(shift => shift.Id == shiftId, cancellationToken);
    }

    private static bool IsCashMethod(string? method)
    {
        if (string.IsNullOrWhiteSpace(method)) return false;
        var m = method.Trim().ToLowerInvariant();
        return m == "cash" || m == "efectivo";
    }

    private static bool IsCardMethod(string? method)
    {
        if (string.IsNullOrWhiteSpace(method)) return false;
        var m = method.Trim().ToLowerInvariant();
        return m == "card" || m == "tarjeta";
    }

    private static bool IsTransferMethod(string? method)
    {
        if (string.IsNullOrWhiteSpace(method)) return false;
        var m = method.Trim().ToLowerInvariant();
        return m == "transfer" || m == "spei" || m == "transferencia";
    }

    private async Task RefreshSalesTotalsAsync(TurnoCaja shift, DateTime endAtUtc, CancellationToken cancellationToken)
    {
        var sales = await _dbContext.Sales
            .AsNoTracking()
            .Where(sale => sale.FechaCreacionUtc >= shift.FechaAperturaUtc &&
                sale.FechaCreacionUtc <= endAtUtc &&
                sale.EstaActivo &&
                sale.Estado != "Cancelada")
            .Select(sale => new { sale.MontoEfectivo, sale.MontoTarjeta, sale.MontoTransferencia, sale.MontoAnticipo })
            .ToListAsync(cancellationToken);

        var installments = await _dbContext.PaymentInstallments
            .AsNoTracking()
            .Where(payment => payment.FechaCreacionUtc >= shift.FechaAperturaUtc &&
                payment.FechaCreacionUtc <= endAtUtc &&
                payment.EstaActivo)
            .Select(payment => new { payment.MontoAbonado, payment.FormaPago })
            .ToListAsync(cancellationToken);

        var refunds = await _dbContext.ReturnHeaders
            .AsNoTracking()
            .Where(returnHeader => returnHeader.FechaCreacionUtc >= shift.FechaAperturaUtc &&
                returnHeader.FechaCreacionUtc <= endAtUtc &&
                returnHeader.EstaActivo &&
                returnHeader.Estado == ReturnStatuses.Completed)
            .Select(returnHeader => new { returnHeader.MontoReembolsado, returnHeader.FormaReembolso })
            .ToListAsync(cancellationToken);

        var cashSales = sales.Sum(sale => sale.MontoEfectivo > 0m ? sale.MontoEfectivo : (sale.MontoTarjeta == 0m && sale.MontoTransferencia == 0m ? sale.MontoAnticipo : 0m));
        var cardSales = sales.Sum(sale => sale.MontoTarjeta);
        var transferSales = sales.Sum(sale => sale.MontoTransferencia);

        var cashInstallments = installments.Where(payment => IsCashMethod(payment.FormaPago)).Sum(payment => payment.MontoAbonado);
        var cardInstallments = installments.Where(payment => IsCardMethod(payment.FormaPago)).Sum(payment => payment.MontoAbonado);
        var transferInstallments = installments.Where(payment => IsTransferMethod(payment.FormaPago)).Sum(payment => payment.MontoAbonado);

        var cashRefunds = refunds.Where(refund => IsCashMethod(refund.FormaReembolso)).Sum(refund => refund.MontoReembolsado);
        var cardRefunds = refunds.Where(refund => IsCardMethod(refund.FormaReembolso)).Sum(refund => refund.MontoReembolsado);
        var transferRefunds = refunds.Where(refund => IsTransferMethod(refund.FormaReembolso)).Sum(refund => refund.MontoReembolsado);

        var manualDeposits = await _dbContext.CashTransactions
            .AsNoTracking()
            .Where(t => t.TurnoCajaId == shift.Id &&
                (t.TipoTransaccion == CashTransactionTypes.ManualDeposit || t.TipoTransaccion == "IngresoManual" || t.TipoTransaccion == "ManualDeposit"))
            .SumAsync(t => (decimal?)t.Monto, cancellationToken) ?? 0m;

        var manualWithdrawals = await _dbContext.CashTransactions
            .AsNoTracking()
            .Where(t => t.TurnoCajaId == shift.Id &&
                (t.TipoTransaccion == CashTransactionTypes.ManualWithdrawal || t.TipoTransaccion == "RetiroManual" || t.TipoTransaccion == "ManualWithdrawal"))
            .SumAsync(t => (decimal?)t.Monto, cancellationToken) ?? 0m;

        shift.TotalEntradas = Math.Max(shift.TotalEntradas, manualDeposits);
        shift.TotalRetiros = Math.Max(shift.TotalRetiros, manualWithdrawals);
        shift.TotalVentasEfectivo = cashSales + cashInstallments - cashRefunds;
        shift.TotalVentasTarjeta = cardSales + cardInstallments - cardRefunds;
        shift.TotalVentasTransferencia = transferSales + transferInstallments - transferRefunds;
        shift.CalcularEsperado();
    }

    private static void ValidateAmount(decimal amount, string fieldName, bool allowZero)
    {
        if (amount < 0 || (!allowZero && amount == 0) || amount > MaximumCashAmount)
        {
            var minimum = allowZero ? "cero o mayor" : "mayor a cero";
            throw new InvalidOperationException($"{fieldName} debe ser {minimum} y no exceder ${MaximumCashAmount:N2}.");
        }
    }

    private static string ValidateText(string? value, string fieldName, int maxLength, bool required)
    {
        var normalizedValue = value?.Trim() ?? string.Empty;
        if (required && normalizedValue.Length < 3)
        {
            throw new InvalidOperationException($"{fieldName} debe contener al menos 3 caracteres.");
        }
        if (normalizedValue.Length > maxLength)
        {
            throw new InvalidOperationException($"{fieldName} no puede exceder {maxLength} caracteres.");
        }
        return normalizedValue;
    }

    private static CashShiftDto MapShiftToDto(TurnoCaja shift)
    {
        var transactions = shift.Transacciones
            .OrderByDescending(transaction => transaction.FechaCreacionUtc)
            .Select(transaction => new CashTransactionDto(
                transaction.Id,
                transaction.TipoTransaccion,
                transaction.Monto,
                transaction.Motivo,
                transaction.Usuario?.NombreUsuario,
                transaction.FechaCreacionUtc))
            .ToList();

        return new CashShiftDto(
            shift.Id,
            shift.NumeroTurno,
            shift.UsuarioId,
            shift.Usuario?.NombreUsuario ?? "Usuario",
            shift.MontoApertura,
            shift.TotalVentasEfectivo,
            shift.TotalVentasTarjeta,
            shift.TotalVentasTransferencia,
            shift.TotalEntradas,
            shift.TotalRetiros,
            shift.MontoCierreEsperado,
            shift.MontoCierreReal,
            shift.MontoDiferencia,
            shift.Estado,
            shift.FechaAperturaUtc,
            shift.FechaCierreUtc,
            shift.Notas,
            transactions);
    }
}
