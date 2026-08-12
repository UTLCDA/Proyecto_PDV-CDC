using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Storage;
using Pos.Application.Common.Interfaces;
using Pos.Application.Sales.DTOs;
using Pos.Application.Sales.Services;
using Pos.Domain.Common;
using Pos.Domain.Entidades;
using Pos.Infrastructure.Persistence;

namespace Pos.Infrastructure.Services;

public class SaleApplicationService : ISaleApplicationService
{
    private const decimal PaymentTolerance = 0.01m;
    private const decimal MaximumSaleAmount = 10_000_000m;
    private readonly PosDbContext _dbContext;
    private readonly IAuditLogService _auditLogService;

    public SaleApplicationService(PosDbContext dbContext, IAuditLogService auditLogService)
    {
        _dbContext = dbContext;
        _auditLogService = auditLogService;
    }

    public async Task<SaleDto> ProcessSaleAsync(
        CreateSaleDto request,
        Guid? currentUserId,
        string correlationId,
        string ipAddress,
        bool canApplyDiscount = false,
        CancellationToken cancellationToken = default,
        IReadOnlyDictionary<Guid, decimal>? authorizedUnitPrices = null)
    {
        if (!currentUserId.HasValue ||
            !await _dbContext.Users.AnyAsync(user => user.Id == currentUserId.Value && user.EstaActivo, cancellationToken))
        {
            throw new InvalidOperationException("La sesión no corresponde a un usuario activo.");
        }
        if (!await _dbContext.CashShifts.AnyAsync(
                shift => shift.Estado == CashShiftStatuses.Open,
                cancellationToken))
        {
            throw new InvalidOperationException("No se puede completar la venta porque no hay una caja abierta. Solicite la apertura del turno antes de cobrar.");
        }
        if (request.Items == null || request.Items.Count == 0)
        {
            throw new ArgumentException("La venta debe contener al menos un producto.");
        }
        if (!SalePaymentTypes.All.Contains(request.PaymentType))
        {
            throw new ArgumentException("El método de pago seleccionado no es válido.");
        }

        var paymentType = SalePaymentTypes.All.Single(type =>
            string.Equals(type, request.PaymentType, StringComparison.OrdinalIgnoreCase));
        var notes = ValidateNotes(request.Notes);
        ValidateNonNegativeAmount(request.DiscountAmount, "El descuento");
        ValidateNonNegativeAmount(request.AdvanceAmount, "El anticipo");
        ValidateNonNegativeAmount(request.CashAmount, "El pago en efectivo");
        ValidateNonNegativeAmount(request.CardAmount, "El pago con tarjeta");
        ValidateNonNegativeAmount(request.TransferAmount, "El pago por transferencia");

        Cliente? customer = null;
        if (request.CustomerId.HasValue)
        {
            customer = await _dbContext.Customers.FirstOrDefaultAsync(
                item => item.Id == request.CustomerId.Value && item.EstaActivo,
                cancellationToken)
                ?? throw new KeyNotFoundException("El cliente seleccionado no existe o se encuentra inactivo.");
        }
        if (paymentType == SalePaymentTypes.AdvanceDeposit && customer == null)
        {
            throw new InvalidOperationException("Seleccione un cliente para registrar una venta con anticipo o apartado.");
        }

        var groupedItems = request.Items
            .GroupBy(item => item.ProductId)
            .Select(group => new
            {
                ProductId = group.Key,
                Quantity = group.Sum(item => item.Quantity),
                RequestedItemDiscount = group.Sum(item => item.DiscountAmount)
            })
            .ToList();
        foreach (var item in groupedItems)
        {
            if (item.ProductId == Guid.Empty || item.Quantity <= 0 || item.Quantity > 100_000m)
            {
                throw new ArgumentException("Cada partida debe tener un producto y una cantidad válida mayor a cero.");
            }
            if (decimal.Truncate(item.Quantity) != item.Quantity)
            {
                throw new ArgumentException("La cantidad de piezas debe ser un número entero.");
            }
            ValidateNonNegativeAmount(item.RequestedItemDiscount, "El descuento de partida");
        }

        var productIds = groupedItems.Select(item => item.ProductId).ToList();
        var products = await _dbContext.Products
            .Where(product => productIds.Contains(product.Id))
            .ToDictionaryAsync(product => product.Id, cancellationToken);
        var stocks = await _dbContext.Stocks
            .Where(stock => productIds.Contains(stock.ProductoId))
            .ToDictionaryAsync(stock => stock.ProductoId, cancellationToken);
        if (products.Count != productIds.Count)
        {
            var missingId = productIds.First(id => !products.ContainsKey(id));
            throw new KeyNotFoundException($"Producto con ID '{missingId}' no encontrado.");
        }

        var isWholesaleCustomer = string.Equals(customer?.TipoCliente, "Mayorista", StringComparison.OrdinalIgnoreCase);
        var pricedItems = new List<(Producto Product, Existencia Stock, decimal Quantity, decimal UnitPrice)>();
        decimal rawSubtotal = 0m;
        decimal requestedItemDiscounts = 0m;
        foreach (var item in groupedItems)
        {
            var product = products[item.ProductId];
            if (!product.EstaActivo)
            {
                throw new InvalidOperationException($"El producto '{product.Nombre}' se encuentra inactivo.");
            }
            if (product.SoloCotizacion)
            {
                throw new InvalidOperationException($"El producto '{product.Nombre}' sólo puede procesarse mediante cotización.");
            }
            if (!stocks.TryGetValue(product.Id, out var stock))
            {
                throw new InvalidOperationException($"El producto '{product.Nombre}' no tiene un registro de existencias.");
            }
            if (stock.CantidadDisponible < item.Quantity)
            {
                throw new InvalidOperationException($"Existencias insuficientes para '{product.Nombre}'. Disponibles: {stock.CantidadDisponible}, solicitadas: {item.Quantity}.");
            }

            var useWholesalePrice = isWholesaleCustomer ||
                (product.CantidadMinimaMayoreo > 0 && item.Quantity >= product.CantidadMinimaMayoreo);
            var unitPrice = authorizedUnitPrices != null && authorizedUnitPrices.TryGetValue(product.Id, out var authorizedPrice)
                ? authorizedPrice
                : useWholesalePrice && product.PrecioMayoreo > 0
                    ? product.PrecioMayoreo
                    : product.PrecioUnitario;
            if (unitPrice < 0)
            {
                throw new InvalidOperationException($"El producto '{product.Nombre}' no tiene un precio válido.");
            }

            rawSubtotal += item.Quantity * unitPrice;
            requestedItemDiscounts += item.RequestedItemDiscount;
            pricedItems.Add((product, stock, item.Quantity, unitPrice));
        }

        var requestedManualDiscount = request.DiscountAmount + requestedItemDiscounts;
        if (requestedManualDiscount > 0 && !canApplyDiscount)
        {
            throw new InvalidOperationException("La sesión no tiene permiso para aplicar descuentos manuales.");
        }
        var customerDiscountPercentage = Math.Clamp(customer?.PorcentajeDescuentoEspecial ?? 0m, 0m, 100m);
        var automaticCustomerDiscount = Math.Round(rawSubtotal * customerDiscountPercentage / 100m, 2);
        var appliedDiscount = Math.Max(automaticCustomerDiscount, requestedManualDiscount);
        if (appliedDiscount > rawSubtotal)
        {
            throw new InvalidOperationException("El descuento no puede ser mayor al subtotal de la venta.");
        }

        var createdAtUtc = DateTime.UtcNow;
        var sale = new Venta
        {
            NumeroFolio = $"VENTA-{createdAtUtc:yyyyMMdd}-{Guid.NewGuid():N}"[..28].ToUpperInvariant(),
            ClienteId = customer?.Id,
            UsuarioId = currentUserId,
            TipoPago = paymentType,
            MontoDescuento = appliedDiscount,
            MontoAnticipo = request.AdvanceAmount,
            MontoEfectivo = request.CashAmount,
            MontoTarjeta = request.CardAmount,
            MontoTransferencia = request.TransferAmount,
            Notas = notes,
            EstaActivo = true,
            FechaCreacionUtc = createdAtUtc
        };
        foreach (var pricedItem in pricedItems)
        {
            var saleItem = new PartidaVenta
            {
                ProductoId = pricedItem.Product.Id,
                Cantidad = pricedItem.Quantity,
                PrecioUnitario = pricedItem.UnitPrice,
                MontoDescuento = 0m
            };
            saleItem.CalcularTotalPartida();
            sale.Partidas.Add(saleItem);
        }
        sale.CalcularTotales();
        ValidatePayments(sale, request);

        foreach (var pricedItem in pricedItems)
        {
            var previousQuantity = pricedItem.Stock.CantidadDisponible;
            pricedItem.Stock.DeducirStock(pricedItem.Quantity);
            _dbContext.InventoryMovements.Add(new MovimientoInventario
            {
                ProductoId = pricedItem.Product.Id,
                TipoMovimiento = InventoryMovementTypes.Sale,
                Cantidad = pricedItem.Quantity,
                CantidadAnterior = previousQuantity,
                CantidadNueva = pricedItem.Stock.CantidadDisponible,
                Motivo = $"Venta folio: {sale.NumeroFolio}",
                NumeroReferencia = sale.NumeroFolio,
                UsuarioId = currentUserId,
                FechaCreacionUtc = createdAtUtc
            });
        }

        _dbContext.Sales.Add(sale);
        try
        {
            if (_dbContext.Database.IsRelational() && _dbContext.Database.CurrentTransaction == null)
            {
                var executionStrategy = _dbContext.Database.CreateExecutionStrategy();
                await executionStrategy.ExecuteInTransactionAsync(
                    async token =>
                    {
                        await _dbContext.SaveChangesAsync(acceptAllChangesOnSuccess: false, token);

                        // With acceptAllChangesOnSuccess:false, EF Core can keep a generated
                        // non-key value in its store-generated sidecar until AcceptAllChanges.
                        // Read the identity from SQL Server in the same transaction so the
                        // operational folio is available before updating related records.
                        var generatedIdVenta = await _dbContext.Sales
                            .AsNoTracking()
                            .Where(existingSale => existingSale.Id == sale.Id)
                            .Select(existingSale => existingSale.IdVenta)
                            .SingleOrDefaultAsync(token);
                        if (generatedIdVenta <= 0)
                        {
                            throw new InvalidOperationException("SQL Server no generó el folio operativo IdVenta de la venta.");
                        }

                        sale.IdVenta = generatedIdVenta;

                        var movements = _dbContext.ChangeTracker.Entries<MovimientoInventario>()
                            .Where(entry => entry.Entity.NumeroReferencia == sale.NumeroFolio)
                            .Select(entry => entry.Entity)
                            .ToList();
                        // SaveChanges(false) deliberately keeps the graph pending for a safe retry.
                        // Update the generated operational folio directly so a second SaveChanges
                        // does not attempt to insert the same GUID entities again.
                        var updatedItems = await _dbContext.SaleItems
                            .Where(item => item.VentaId == sale.Id)
                            .ExecuteUpdateAsync(
                                setters => setters.SetProperty(item => item.IdVenta, generatedIdVenta),
                                token);
                        var updatedMovements = await _dbContext.InventoryMovements
                            .Where(movement => movement.NumeroReferencia == sale.NumeroFolio)
                            .ExecuteUpdateAsync(
                                setters => setters.SetProperty(movement => movement.IdVenta, generatedIdVenta),
                                token);

                        if (updatedItems != sale.Partidas.Count || updatedMovements != movements.Count)
                        {
                            throw new DbUpdateConcurrencyException(
                                "No fue posible propagar IdVenta a todas las partidas y movimientos de inventario.");
                        }

                        foreach (var item in sale.Partidas)
                        {
                            item.IdVenta = generatedIdVenta;
                        }
                        foreach (var movement in movements)
                        {
                            movement.IdVenta = generatedIdVenta;
                        }
                    },
                    async token => await _dbContext.Sales.AsNoTracking()
                        .AnyAsync(existingSale => existingSale.Id == sale.Id, token),
                    System.Data.IsolationLevel.ReadCommitted,
                    cancellationToken);
                _dbContext.ChangeTracker.AcceptAllChanges();
            }
            else
            {
                // SQL Server remains the authoritative IdVenta generator. The non-relational
                // provider used by local development/tests does not emulate this IDENTITY,
                // so assign its in-memory equivalent before exposing operational references.
                if (sale.IdVenta <= 0)
                {
                    var currentMaximum = await _dbContext.Sales
                        .AsNoTracking()
                        .Where(existingSale => existingSale.Id != sale.Id)
                        .Select(existingSale => (int?)existingSale.IdVenta)
                        .MaxAsync(cancellationToken) ?? 0;
                    sale.IdVenta = currentMaximum + 1;
                }

                await _dbContext.SaveChangesAsync(cancellationToken);
                foreach (var item in sale.Partidas)
                {
                    item.IdVenta = sale.IdVenta;
                }
                var movements = _dbContext.ChangeTracker.Entries<MovimientoInventario>()
                    .Where(entry => entry.Entity.NumeroReferencia == sale.NumeroFolio)
                    .Select(entry => entry.Entity);
                foreach (var movement in movements)
                {
                    movement.IdVenta = sale.IdVenta;
                }
                await _dbContext.SaveChangesAsync(cancellationToken);
            }
        }
        catch (DbUpdateConcurrencyException exception)
        {
            throw new InvalidOperationException("Las existencias cambiaron mientras se procesaba la venta. Actualice el catálogo e inténtelo nuevamente.", exception);
        }

        await _auditLogService.LogAsync(
            correlationId,
            currentUserId,
            "SALE_COMPLETED",
            "Venta",
            sale.Id.ToString(),
            null,
            JsonSerializer.Serialize(new
            {
                sale.IdVenta,
                sale.NumeroFolio,
                sale.MontoTotal,
                sale.MontoDescuento,
                sale.MontoIva,
                sale.TipoPago,
                Items = sale.Partidas.Count
            }),
            ipAddress,
            $"Venta #{sale.IdVenta} completada.",
            cancellationToken);

        return (await GetSaleByIdAsync(sale.Id, cancellationToken))!;
    }

    public async Task<List<SaleDto>> GetSalesAsync(
        string? search,
        Guid? customerId,
        string? status,
        DateTime? startDate,
        DateTime? endDate,
        CancellationToken cancellationToken = default)
    {
        ValidateDateRange(startDate, endDate);
        var query = ApplySaleFilters(BuildSaleQuery(), search, status, startDate, endDate);
        if (customerId.HasValue) query = query.Where(sale => sale.ClienteId == customerId.Value);

        var sales = await query
            .AsNoTracking()
            .OrderByDescending(sale => sale.FechaCreacionUtc)
            .Take(500)
            .ToListAsync(cancellationToken);
        return sales.Select(MapSaleToDto).ToList();
    }

    public async Task<SalesSummaryDto> GetSalesSummaryAsync(
        string? search,
        string? status,
        DateTime? startDate,
        DateTime? endDate,
        CancellationToken cancellationToken = default)
    {
        ValidateDateRange(startDate, endDate);
        var sales = await ApplySaleFilters(_dbContext.Sales.Include(sale => sale.Cliente), search, status, startDate, endDate)
            .AsNoTracking()
            .Select(sale => new
            {
                sale.MontoTotal,
                sale.MontoEfectivo,
                sale.MontoTarjeta,
                sale.MontoTransferencia,
                sale.SaldoPendiente,
                Installments = sale.Abonos.Where(payment => payment.EstaActivo).Sum(payment => (decimal?)payment.MontoAbonado) ?? 0m
            })
            .ToListAsync(cancellationToken);

        return new SalesSummaryDto(
            sales.Count,
            sales.Sum(sale => sale.MontoTotal),
            sales.Sum(sale => sale.MontoEfectivo + sale.MontoTarjeta + sale.MontoTransferencia + sale.Installments),
            sales.Sum(sale => sale.SaldoPendiente),
            sales.Sum(sale => sale.MontoEfectivo),
            sales.Sum(sale => sale.MontoTarjeta),
            sales.Sum(sale => sale.MontoTransferencia));
    }

    public async Task<SaleDto?> GetSaleByIdAsync(Guid id, CancellationToken cancellationToken = default)
    {
        var sale = await BuildSaleQuery()
            .AsNoTracking()
            .FirstOrDefaultAsync(item => item.Id == id, cancellationToken);

        return sale == null ? null : MapSaleToDto(sale);
    }

    public async Task<SaleDto?> GetSaleByFolioAsync(int idVenta, CancellationToken cancellationToken = default)
    {
        var sale = await BuildSaleQuery()
            .AsNoTracking()
            .FirstOrDefaultAsync(item => item.IdVenta == idVenta, cancellationToken);

        return sale == null ? null : MapSaleToDto(sale);
    }

    private IQueryable<Venta> BuildSaleQuery() => _dbContext.Sales
        .Include(sale => sale.Cliente)
        .Include(sale => sale.Usuario)
        .Include(sale => sale.Abonos)
            .ThenInclude(payment => payment.Usuario)
        .Include(sale => sale.Partidas)
            .ThenInclude(item => item.Producto);

    private static IQueryable<Venta> ApplySaleFilters(
        IQueryable<Venta> query,
        string? search,
        string? status,
        DateTime? startDate,
        DateTime? endDate)
    {
        query = query.Where(sale => sale.EstaActivo);
        if (startDate.HasValue)
        {
            query = query.Where(sale => sale.FechaCreacionUtc >= startDate.Value);
        }
        if (endDate.HasValue)
        {
            var effectiveEndDate = endDate.Value.TimeOfDay == TimeSpan.Zero
                ? endDate.Value.Date.AddDays(1).AddTicks(-1)
                : endDate.Value;
            query = query.Where(sale => sale.FechaCreacionUtc <= effectiveEndDate);
        }
        if (!string.IsNullOrWhiteSpace(status))
        {
            var normalizedStatus = status.Trim().ToLower();
            if (normalizedStatus == "pendientepago" || normalizedStatus == "apartadopagado" || normalizedStatus == "apartado" || normalizedStatus == "depositpaid")
            {
                query = query.Where(sale => sale.Estado == SaleStatuses.DepositPaid || sale.SaldoPendiente > 0);
            }
            else if (normalizedStatus == "completada" || normalizedStatus == "completed")
            {
                query = query.Where(sale => sale.Estado == SaleStatuses.Completed);
            }
            else if (normalizedStatus == "cancelada" || normalizedStatus == "cancelled")
            {
                query = query.Where(sale => sale.Estado == SaleStatuses.Cancelled);
            }
            else
            {
                query = query.Where(sale => sale.Estado.ToLower() == normalizedStatus);
            }
        }
        if (!string.IsNullOrWhiteSpace(search))
        {
            var term = search.Trim().ToLower();
            if (int.TryParse(term, out var idVenta) && idVenta > 0)
            {
                query = query.Where(sale => sale.IdVenta == idVenta);
            }
            else
            {
                query = query.Where(sale => sale.NumeroFolio.ToLower().Contains(term) ||
                    sale.Id.ToString().ToLower().Contains(term) ||
                    (sale.Cliente != null &&
                        (sale.Cliente.Nombre.ToLower().Contains(term) ||
                         (sale.Cliente.NombreEmpresa != null && sale.Cliente.NombreEmpresa.ToLower().Contains(term)))));
            }
        }
        return query;
    }

    private static void ValidateDateRange(DateTime? startDate, DateTime? endDate)
    {
        if (startDate.HasValue && endDate.HasValue && startDate.Value > endDate.Value)
        {
            throw new ArgumentException("La fecha inicial no puede ser posterior a la fecha final.");
        }
    }

    private static string ValidateNotes(string? notes)
    {
        var normalizedNotes = notes?.Trim() ?? string.Empty;
        if (normalizedNotes.Length > 500)
        {
            throw new ArgumentException("Las notas de la venta no pueden exceder 500 caracteres.");
        }
        return normalizedNotes;
    }

    private static void ValidateNonNegativeAmount(decimal amount, string fieldName)
    {
        if (amount < 0 || amount > MaximumSaleAmount)
        {
            throw new ArgumentException($"{fieldName} debe estar entre $0.00 y ${MaximumSaleAmount:N2}.");
        }
    }

    private static void ValidatePayments(Venta sale, CreateSaleDto request)
    {
        var totalPaid = request.CashAmount + request.CardAmount + request.TransferAmount;
        switch (sale.TipoPago)
        {
            case SalePaymentTypes.FullPayment:
                if (Math.Abs(request.CashAmount - sale.MontoTotal) > PaymentTolerance ||
                    request.CardAmount > 0 || request.TransferAmount > 0)
                {
                    throw new InvalidOperationException($"El pago en efectivo debe ser igual al total de la venta (${sale.MontoTotal:N2}).");
                }
                sale.MontoAnticipo = sale.MontoTotal;
                sale.SaldoPendiente = 0m;
                break;

            case SalePaymentTypes.MixedPayment:
                if (Math.Abs(totalPaid - sale.MontoTotal) > PaymentTolerance)
                {
                    throw new InvalidOperationException($"La suma de efectivo, tarjeta y transferencia debe ser igual al total (${sale.MontoTotal:N2}).");
                }
                sale.MontoAnticipo = sale.MontoTotal;
                sale.SaldoPendiente = 0m;
                break;

            case SalePaymentTypes.AdvanceDeposit:
                if (request.AdvanceAmount <= 0 ||
                    request.AdvanceAmount >= sale.MontoTotal ||
                    Math.Abs(request.CashAmount - request.AdvanceAmount) > PaymentTolerance ||
                    request.CardAmount > 0 || request.TransferAmount > 0)
                {
                    throw new InvalidOperationException($"El anticipo en efectivo debe ser mayor a cero y menor al total (${sale.MontoTotal:N2}).");
                }
                sale.MontoAnticipo = request.AdvanceAmount;
                sale.SaldoPendiente = sale.MontoTotal - request.AdvanceAmount;
                sale.Estado = SaleStatuses.DepositPaid;
                break;
        }
    }

    private static SaleDto MapSaleToDto(Venta sale)
    {
        var payments = new List<SalePaymentDto>();
        if (sale.TipoPago == SalePaymentTypes.AdvanceDeposit)
        {
            var subsequentAbonosSum = sale.Abonos.Where(a => a.EstaActivo).Sum(a => a.MontoAbonado);
            var totalPaid = Math.Max(0m, sale.MontoTotal - sale.SaldoPendiente);
            var initialDepositAmount = Math.Max(0m, totalPaid - subsequentAbonosSum);
            if (initialDepositAmount <= 0m && (sale.MontoEfectivo + sale.MontoTarjeta + sale.MontoTransferencia) > 0m)
            {
                initialDepositAmount = sale.MontoEfectivo + sale.MontoTarjeta + sale.MontoTransferencia;
            }
            if (initialDepositAmount > 0m)
            {
                var initialMethod = sale.MontoTarjeta > 0m ? PaymentMethods.Card : (sale.MontoTransferencia > 0m ? PaymentMethods.Transfer : PaymentMethods.Cash);
                payments.Add(new SalePaymentDto(
                    $"{sale.Id}:initial",
                    ReceiptReferences.Create(sale.IdVenta),
                    initialDepositAmount,
                    initialMethod,
                    sale.Usuario?.NombreUsuario,
                    true,
                    sale.FechaCreacionUtc));
            }
        }
        else
        {
            AddInitialPayment(payments, sale, PaymentMethods.Cash, sale.MontoEfectivo);
            AddInitialPayment(payments, sale, PaymentMethods.Card, sale.MontoTarjeta);
            AddInitialPayment(payments, sale, PaymentMethods.Transfer, sale.MontoTransferencia);
        }

        payments.AddRange(sale.Abonos
            .Where(payment => payment.EstaActivo)
            .Select(payment => new SalePaymentDto(
                payment.Id.ToString(),
                ReceiptReferences.Create(sale.IdVenta),
                payment.MontoAbonado,
                payment.FormaPago,
                payment.Usuario?.NombreUsuario,
                false,
                payment.FechaCreacionUtc)));

        return new SaleDto(
            sale.Id,
            sale.IdVenta,
            sale.NumeroFolio,
            sale.ClienteId,
            sale.Cliente?.NombreMostrar,
            sale.UsuarioId,
            sale.Usuario?.NombreUsuario,
            sale.TipoPago,
            sale.SubTotal,
            sale.MontoDescuento,
            sale.MontoIva,
            sale.MontoTotal,
            sale.MontoEfectivo,
            sale.MontoTarjeta,
            sale.MontoTransferencia,
            sale.MontoAnticipo,
            sale.SaldoPendiente,
            sale.Estado,
            sale.Notas,
            sale.FechaCreacionUtc,
            sale.Partidas.Select(item => new SaleItemDto(
                item.Id,
                item.IdVenta,
                item.ProductoId,
                item.Producto?.Sku ?? string.Empty,
                item.Producto?.Nombre ?? string.Empty,
                item.Producto?.UnidadMedida ?? "Pza",
                item.Cantidad,
                item.PrecioUnitario,
                item.MontoDescuento,
                item.PrecioTotal)).ToList(),
            payments.OrderBy(payment => payment.CreatedAtUtc).ToList());
    }

    private static void AddInitialPayment(List<SalePaymentDto> payments, Venta sale, string method, decimal amount)
    {
        if (amount <= 0m) return;
        payments.Add(new SalePaymentDto(
            $"{sale.Id}:{method.ToLowerInvariant()}",
            ReceiptReferences.Create(sale.IdVenta),
            amount,
            method,
            sale.Usuario?.NombreUsuario,
            true,
            sale.FechaCreacionUtc));
    }
}
