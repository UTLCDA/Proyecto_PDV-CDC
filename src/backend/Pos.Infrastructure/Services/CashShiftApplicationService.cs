using Microsoft.EntityFrameworkCore;
using Pos.Application.CashShift.DTOs;
using Pos.Application.CashShift.Services;
using Pos.Application.Common.Interfaces;
using Pos.Domain.Entidades;
using Pos.Infrastructure.Persistence;

namespace Pos.Infrastructure.Services;

public class CashShiftApplicationService : ICashShiftApplicationService
{
    private readonly PosDbContext _dbContext;
    private readonly IAuditLogService _auditLogService;

    public CashShiftApplicationService(PosDbContext dbContext, IAuditLogService auditLogService)
    {
        _dbContext = dbContext;
        _auditLogService = auditLogService;
    }

    public async Task<CashShiftDto?> GetCurrentOpenShiftAsync(Guid userId, CancellationToken cancellationToken = default)
    {
        var shift = await _dbContext.CashShifts
            .Include(s => s.Transacciones)
            .FirstOrDefaultAsync(s => s.UsuarioId == userId && s.Estado == "Abierto", cancellationToken);

        if (shift == null) return null;

        if (shift.Usuario == null)
        {
            shift.Usuario = await _dbContext.Users.FirstOrDefaultAsync(u => u.Id == userId, cancellationToken)
                         ?? new Usuario { NombreUsuario = "Cajero" };
        }

        return MapShiftToDto(shift);
    }

    public async Task<CashShiftDto> OpenShiftAsync(OpenCashShiftDto request, Guid userId, string correlationId, string ipAddress, CancellationToken cancellationToken = default)
    {
        var existingOpenShift = await _dbContext.CashShifts.FirstOrDefaultAsync(s => s.UsuarioId == userId && s.Estado == "Abierto", cancellationToken);
        if (existingOpenShift != null)
        {
            throw new InvalidOperationException("El usuario ya cuenta con un turno de caja abierto.");
        }

        var totalShiftsCount = await _dbContext.CashShifts.CountAsync(cancellationToken);
        var shiftNumber = $"CAJA-{DateTime.UtcNow:yyyy}-{(totalShiftsCount + 1):D5}";

        var shift = new TurnoCaja
        {
            NumeroTurno = shiftNumber,
            UsuarioId = userId,
            MontoApertura = request.OpeningAmount,
            Estado = "Abierto",
            FechaAperturaUtc = DateTime.UtcNow,
            Notas = request.Notes
        };
        shift.CalcularEsperado();

        shift.Transacciones.Add(new TransaccionCaja
        {
            TipoTransaccion = "Apertura",
            Monto = request.OpeningAmount,
            Motivo = "Fondo Inicial de Caja",
            UsuarioId = userId,
            FechaCreacionUtc = DateTime.UtcNow
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
            $"NumeroTurno={shift.NumeroTurno}, MontoApertura={shift.MontoApertura}",
            ipAddress,
            $"Turno de caja abierto WPC Bajío: {shift.NumeroTurno}",
            cancellationToken);

        return (await GetCurrentOpenShiftAsync(userId, cancellationToken))!;
    }

    public async Task<CashShiftDto> RegisterWithdrawalAsync(CashWithdrawalDto request, Guid userId, string correlationId, string ipAddress, CancellationToken cancellationToken = default)
    {
        var shift = await _dbContext.CashShifts
            .Include(s => s.Transacciones)
            .FirstOrDefaultAsync(s => s.UsuarioId == userId && s.Estado == "Abierto", cancellationToken);

        if (shift == null)
        {
            throw new InvalidOperationException("No hay un turno de caja abierto para registrar el retiro.");
        }

        if (request.Amount <= 0)
        {
            throw new ArgumentException("El monto a retirar debe ser mayor a cero.");
        }

        shift.TotalRetiros += request.Amount;
        shift.CalcularEsperado();

        shift.Transacciones.Add(new TransaccionCaja
        {
            TipoTransaccion = "RetiroManual",
            Monto = request.Amount,
            Motivo = request.Reason,
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
            null,
            $"Amount={request.Amount}, Reason={request.Reason}",
            ipAddress,
            $"Sangría de caja: ${request.Amount}",
            cancellationToken);

        return (await GetCurrentOpenShiftAsync(userId, cancellationToken))!;
    }

    public async Task<CashShiftDto> CloseShiftAsync(CloseCashShiftDto request, Guid userId, string correlationId, string ipAddress, CancellationToken cancellationToken = default)
    {
        var shift = await _dbContext.CashShifts
            .Include(s => s.Usuario)
            .Include(s => s.Transacciones)
            .FirstOrDefaultAsync(s => s.UsuarioId == userId && s.Estado == "Abierto", cancellationToken);

        if (shift == null)
        {
            throw new InvalidOperationException("No hay un turno de caja abierto para cerrar.");
        }

        var salesInShift = await _dbContext.Sales
            .Where(s => s.UsuarioId == userId && s.FechaCreacionUtc >= s.FechaCreacionUtc)
            .ToListAsync(cancellationToken);

        shift.TotalVentasEfectivo = salesInShift.Sum(s => s.MontoEfectivo > 0 ? s.MontoEfectivo : (s.TipoPago == "FullPayment" || s.TipoPago == "AdvanceDeposit" ? s.MontoAnticipo : 0m));
        shift.TotalVentasTarjeta = salesInShift.Sum(s => s.MontoTarjeta);
        shift.TotalVentasTransferencia = salesInShift.Sum(s => s.MontoTransferencia);

        shift.CerrarTurno(request.ActualClosingAmount);
        if (!string.IsNullOrWhiteSpace(request.Notes))
        {
            shift.Notas += $" | Cierre: {request.Notes}";
        }

        await _dbContext.SaveChangesAsync(cancellationToken);

        await _auditLogService.LogAsync(
            correlationId,
            userId,
            "CASH_SHIFT_CLOSED",
            "TurnoCaja",
            shift.Id.ToString(),
            $"Esperado={shift.MontoCierreEsperado}",
            $"Real={shift.MontoCierreReal}, Diferencia={shift.MontoDiferencia}",
            ipAddress,
            $"Cierre de caja {shift.NumeroTurno}. Diferencia: ${shift.MontoDiferencia}",
            cancellationToken);

        return MapShiftToDto(shift);
    }

    public async Task<List<CashShiftDto>> GetShiftHistoryAsync(CancellationToken cancellationToken = default)
    {
        var shifts = await _dbContext.CashShifts
            .Include(s => s.Usuario)
            .Include(s => s.Transacciones)
            .OrderByDescending(s => s.FechaAperturaUtc)
            .Take(50)
            .ToListAsync(cancellationToken);

        return shifts.Select(MapShiftToDto).ToList();
    }

    private static CashShiftDto MapShiftToDto(TurnoCaja s)
    {
        var txDtos = s.Transacciones.Select(t => new CashTransactionDto(
            t.Id,
            t.TipoTransaccion,
            t.Monto,
            t.Motivo,
            t.Usuario?.NombreUsuario,
            t.FechaCreacionUtc
        )).ToList();

        return new CashShiftDto(
            s.Id,
            s.NumeroTurno,
            s.UsuarioId,
            s.Usuario?.NombreUsuario ?? "Cajero",
            s.MontoApertura,
            s.TotalVentasEfectivo,
            s.TotalVentasTarjeta,
            s.TotalVentasTransferencia,
            s.TotalRetiros,
            s.MontoCierreEsperado,
            s.MontoCierreReal,
            s.MontoDiferencia,
            s.Estado,
            s.FechaAperturaUtc,
            s.FechaCierreUtc,
            s.Notas,
            txDtos
        );
    }
}
