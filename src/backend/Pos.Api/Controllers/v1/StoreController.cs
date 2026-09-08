using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Pos.Application.Catalog.DTOs;
using Pos.Application.Catalog.Services;
using Pos.Domain.Common;
using Pos.Domain.Entidades;
using Pos.Infrastructure.Persistence;

namespace Pos.Api.Controllers.v1;

/// <summary>
/// Controlador público de catálogo, clientes e inventario para la tienda en línea WPC Bajío (E-Commerce).
/// Expone endpoints seguros y de solo lectura/transaccionales públicos sin requerir credenciales internas de Punto de Venta.
/// </summary>
[ApiController]
[Route("api/v1/[controller]")]
[AllowAnonymous]
public class StoreController : ControllerBase
{
    private static readonly List<ContactMessageDto> _contactMessages = new()
    {
        new ContactMessageDto
        {
            Id = Guid.NewGuid(),
            Name = "Arquitectura y Diseño León",
            Email = "proyectos@arqleon.com",
            Phone = "477 555 1234",
            Subject = "Cotización 120m2 Lambrín Nogal",
            Message = "Buenas tardes, nos interesa cotizar 120 metros cuadrados de lambrín WPC nogal para un proyecto residencial.",
            CreatedAtUtc = DateTime.UtcNow.AddHours(-2)
        }
    };

    private readonly ICatalogApplicationService _catalogService;
    private readonly PosDbContext _dbContext;
    private readonly ILogger<StoreController> _logger;

    public StoreController(
        ICatalogApplicationService catalogService,
        PosDbContext dbContext,
        ILogger<StoreController> logger)
    {
        _catalogService = catalogService;
        _dbContext = dbContext;
        _logger = logger;
    }

    /// <summary>
    /// Verificación de conectividad y estado operativo para la tienda en línea.
    /// </summary>
    [HttpGet("ping")]
    public IActionResult Ping()
    {
        return Ok(new
        {
            status = "online",
            store = "WPC Bajío E-Commerce Storefront API",
            version = "2.0.0",
            timestampUtc = DateTime.UtcNow
        });
    }

    /// <summary>
    /// Consulta el listado de categorías activas para menús y filtros de la tienda.
    /// </summary>
    [HttpGet("categories")]
    public async Task<ActionResult<List<CategoryDto>>> GetStoreCategories(CancellationToken cancellationToken)
    {
        var categories = await _catalogService.GetCategoriesAsync(cancellationToken);
        var activeCategories = categories.Where(c => c.IsActive).ToList();
        return Ok(activeCategories);
    }

    /// <summary>
    /// Consulta el catálogo de productos disponibles para la venta en línea.
    /// Oculta costos confidenciales de adquisición y excluye productos inactivos.
    /// </summary>
    [HttpGet("products")]
    public async Task<ActionResult<List<ProductDto>>> GetStoreProducts(
        [FromQuery] string? search,
        [FromQuery] Guid? categoryId,
        [FromQuery] bool? isTopSellerOnly,
        [FromQuery] bool? inStockOnly,
        CancellationToken cancellationToken)
    {
        var products = await _catalogService.GetProductsAsync(search, categoryId, isTopSellerOnly, cancellationToken);

        var storeProducts = products
            .Where(p => p.IsActive && !p.IsQuoteOnly)
            .Where(p => inStockOnly != true || p.AvailableQuantity > 0)
            .Select(SanitizeForStore)
            .ToList();

        return Ok(storeProducts);
    }

    /// <summary>
    /// Consulta el detalle de un producto específico por su Id (GUID), SKU o Código.
    /// </summary>
    [HttpGet("products/{idOrCode}")]
    public async Task<ActionResult<ProductDto>> GetStoreProductByIdOrCode(
        string idOrCode,
        CancellationToken cancellationToken)
    {
        ProductDto? product = null;

        if (Guid.TryParse(idOrCode, out var productId))
        {
            product = await _catalogService.GetProductByIdAsync(productId, cancellationToken);
        }
        else
        {
            product = await _catalogService.GetProductByCodeAsync(idOrCode, cancellationToken);
        }

        if (product == null || !product.IsActive || product.IsQuoteOnly)
        {
            return NotFound(new { message = $"Producto no encontrado o no disponible para venta en línea: '{idOrCode}'" });
        }

        return Ok(SanitizeForStore(product));
    }

    /// <summary>
    /// Consulta el stock disponible en tiempo real de un producto específico por ID o SKU.
    /// </summary>
    [HttpGet("inventory/{idOrCode}")]
    public async Task<IActionResult> GetProductInventory(
        string idOrCode,
        CancellationToken cancellationToken)
    {
        var term = idOrCode.Trim().ToLower();
        var isGuid = Guid.TryParse(idOrCode, out var productId);

        var product = isGuid
            ? await _dbContext.Products.AsNoTracking().FirstOrDefaultAsync(p => p.Id == productId, cancellationToken)
            : await _dbContext.Products.AsNoTracking().FirstOrDefaultAsync(p => p.Sku.ToLower() == term || p.Barcode.ToLower() == term, cancellationToken);

        if (product == null || !product.EstaActivo)
        {
            return NotFound(new { message = $"Producto no encontrado: '{idOrCode}'" });
        }

        var stock = await _dbContext.Stocks
            .AsNoTracking()
            .FirstOrDefaultAsync(s => s.ProductoId == product.Id, cancellationToken);

        var available = stock?.CantidadDisponible ?? 0m;
        var status = available switch
        {
            <= 0 => "out",
            <= 10 => "low",
            _ => "available"
        };

        return Ok(new
        {
            productId = product.Id,
            sku = product.Sku,
            name = product.Nombre,
            availableStock = available,
            piecesPerBox = product.PiezasPorCaja > 0 ? product.PiezasPorCaja : 1,
            status,
            updatedAtUtc = stock?.FechaActualizacionUtc ?? product.FechaCreacionUtc
        });
    }

    /// <summary>
    /// Verifica en tiempo real la disponibilidad de inventario para una lista de productos.
    /// </summary>
    [HttpPost("inventory/check")]
    public async Task<IActionResult> CheckBatchInventory(
        [FromBody] CheckInventoryBatchRequest request,
        CancellationToken cancellationToken)
    {
        if (request?.Items == null || request.Items.Count == 0)
        {
            return BadRequest(new { message = "La lista de productos para verificar está vacía." });
        }

        var productIds = request.Items.Select(i => i.ProductId).Distinct().ToList();
        var products = await _dbContext.Products
            .AsNoTracking()
            .Where(p => productIds.Contains(p.Id))
            .ToDictionaryAsync(p => p.Id, cancellationToken);

        var stocks = await _dbContext.Stocks
            .AsNoTracking()
            .Where(s => productIds.Contains(s.ProductoId))
            .ToDictionaryAsync(s => s.ProductoId, cancellationToken);

        var results = new List<object>();
        var allAvailable = true;

        foreach (var item in request.Items)
        {
            if (!products.TryGetValue(item.ProductId, out var prod) || !prod.EstaActivo)
            {
                allAvailable = false;
                results.Add(new
                {
                    productId = item.ProductId,
                    isAvailable = false,
                    requestedQuantity = item.Quantity,
                    availableStock = 0m,
                    message = "Producto no encontrado o inactivo."
                });
                continue;
            }

            var stock = stocks.GetValueOrDefault(item.ProductId);
            var availablePieces = stock?.CantidadDisponible ?? 0m;
            var piecesPerBox = prod.PiezasPorCaja > 0 ? prod.PiezasPorCaja : 1;
            var requiredPieces = string.Equals(item.Unit, "box", StringComparison.OrdinalIgnoreCase)
                ? item.Quantity * piecesPerBox
                : item.Quantity;

            var isItemAvailable = availablePieces >= requiredPieces;
            if (!isItemAvailable) allAvailable = false;

            results.Add(new
            {
                productId = prod.Id,
                sku = prod.Sku,
                name = prod.Nombre,
                unit = item.Unit,
                requestedQuantity = item.Quantity,
                requiredPieces,
                availableStock = availablePieces,
                isAvailable = isItemAvailable,
                message = isItemAvailable ? "Disponible" : $"Stock insuficiente. Disponibles: {availablePieces} pzs."
            });
        }

        return Ok(new
        {
            allAvailable,
            items = results,
            checkedAtUtc = DateTime.UtcNow
        });
    }

    /// <summary>
    /// Valida integralmente el carrito de compras en el servidor:
    /// 1. Verifica existencia y estado activo de cada producto.
    /// 2. Valida y rectifica el precio unitario oficial contra la base de datos.
    /// 3. Comprueba stock disponible en tiempo real (desglosando cajas a piezas).
    /// 4. Calcula subtotal, costos de envío según reglas de negocio ($350 MXN < $5000, gratis >= $5000 o recolección) y total exacto.
    /// 5. Retorna si el carrito es válido para proceder al checkout.
    /// </summary>
    [HttpPost("cart/validate")]
    public async Task<IActionResult> ValidateCart(
        [FromBody] ValidateCartRequest request,
        CancellationToken cancellationToken)
    {
        if (request?.Items == null || request.Items.Count == 0)
        {
            return BadRequest(new { message = "El carrito no contiene artículos para validar." });
        }

        var productGuids = request.Items
            .Select(i => Guid.TryParse(i.ProductId, out var g) ? g : (Guid?)null)
            .Where(g => g.HasValue && g.Value != Guid.Empty)
            .Select(g => g!.Value)
            .Distinct()
            .ToList();

        var skus = request.Items
            .Where(i => !string.IsNullOrWhiteSpace(i.Sku))
            .Select(i => i.Sku!.Trim().ToLower())
            .Distinct()
            .ToList();

        var products = await _dbContext.Products
            .AsNoTracking()
            .Where(p => productGuids.Contains(p.Id) || (p.Sku != null && skus.Contains(p.Sku.ToLower())))
            .ToListAsync(cancellationToken);

        var foundIds = products.Select(p => p.Id).ToList();
        var stocks = await _dbContext.Stocks
            .AsNoTracking()
            .Where(s => foundIds.Contains(s.ProductoId))
            .ToDictionaryAsync(s => s.ProductoId, cancellationToken);

        var validatedItems = new List<object>();
        var globalWarnings = new List<string>();
        decimal verifiedSubtotal = 0m;
        bool isCartValid = true;

        foreach (var item in request.Items)
        {
            var itemGuid = Guid.TryParse(item.ProductId, out var g) ? g : (Guid?)null;
            var product = products.FirstOrDefault(p =>
                (itemGuid.HasValue && p.Id == itemGuid.Value) ||
                (!string.IsNullOrWhiteSpace(item.Sku) && string.Equals(p.Sku, item.Sku, StringComparison.OrdinalIgnoreCase)) ||
                (!string.IsNullOrWhiteSpace(item.ProductId) && string.Equals(p.Sku, item.ProductId, StringComparison.OrdinalIgnoreCase))
            );

            if (product == null || !product.EstaActivo || product.SoloCotizacion)
            {
                isCartValid = false;
                var missingWarning = $"El producto '{item.Sku ?? item.ProductId?.ToString()}' ya no está disponible para venta en línea.";
                globalWarnings.Add(missingWarning);

                validatedItems.Add(new
                {
                    productId = product?.Id ?? (itemGuid ?? Guid.Empty),
                    sku = item.Sku ?? string.Empty,
                    name = "Producto no disponible",
                    unit = item.Unit,
                    quantity = item.Quantity,
                    requiredPieces = 0,
                    availablePieces = 0m,
                    originalPrice = item.PricePerUnit ?? 0m,
                    verifiedPrice = 0m,
                    hasPriceChanged = false,
                    lineTotal = 0m,
                    isAvailable = false,
                    warning = missingWarning
                });
                continue;
            }

            var stock = stocks.GetValueOrDefault(product.Id);
            var availablePieces = stock?.CantidadDisponible ?? 0m;
            var piecesPerBox = product.PiezasPorCaja > 0 ? product.PiezasPorCaja : 1;
            var isBox = string.Equals(item.Unit, "box", StringComparison.OrdinalIgnoreCase);
            var requiredPieces = isBox ? item.Quantity * piecesPerBox : item.Quantity;

            var isStockSufficient = availablePieces >= requiredPieces;
            if (!isStockSufficient)
            {
                isCartValid = false;
            }

            var piecePrice = product.PrecioUnitario;
            var verifiedPrice = isBox
                ? Math.Round(piecePrice * piecesPerBox, 2)
                : piecePrice;

            var hasPriceChanged = item.PricePerUnit.HasValue &&
                Math.Abs(item.PricePerUnit.Value - verifiedPrice) > 0.01m;

            var lineTotal = verifiedPrice * item.Quantity;
            verifiedSubtotal += lineTotal;

            string? itemWarning = null;
            if (!isStockSufficient)
            {
                itemWarning = $"Stock insuficiente: requieres {requiredPieces} pzs y solo hay {availablePieces} pzs disponibles.";
                globalWarnings.Add($"'{product.Nombre}': {itemWarning}");
            }
            else if (hasPriceChanged)
            {
                itemWarning = $"El precio se actualizó de ${item.PricePerUnit:N2} a ${verifiedPrice:N2} MXN.";
                globalWarnings.Add($"'{product.Nombre}': {itemWarning}");
            }

            validatedItems.Add(new
            {
                productId = product.Id,
                sku = product.Sku,
                name = product.Nombre,
                unit = isBox ? "box" : "piece",
                quantity = item.Quantity,
                requiredPieces = requiredPieces,
                availablePieces = availablePieces,
                originalPrice = item.PricePerUnit ?? verifiedPrice,
                verifiedPrice = verifiedPrice,
                hasPriceChanged = hasPriceChanged,
                lineTotal = lineTotal,
                isAvailable = isStockSufficient,
                warning = itemWarning
            });
        }

        var isPickup = string.Equals(request.DeliveryMethod, "pickup", StringComparison.OrdinalIgnoreCase);
        const decimal freeShippingThreshold = 5000m;
        const decimal standardShippingFee = 350m;

        decimal shippingCost = 0m;
        if (!isPickup)
        {
            shippingCost = verifiedSubtotal >= freeShippingThreshold ? 0m : standardShippingFee;
        }

        var total = verifiedSubtotal + shippingCost;
        var amountNeededForFreeShipping = (!isPickup && verifiedSubtotal < freeShippingThreshold)
            ? freeShippingThreshold - verifiedSubtotal
            : 0m;

        return Ok(new
        {
            isValid = isCartValid,
            subtotal = verifiedSubtotal,
            shippingCost = shippingCost,
            total = total,
            deliveryMethod = isPickup ? "pickup" : "delivery",
            freeShippingThreshold = freeShippingThreshold,
            amountNeededForFreeShipping = amountNeededForFreeShipping,
            items = validatedItems,
            globalWarnings = globalWarnings,
            validatedAtUtc = DateTime.UtcNow
        });
    }

    /// <summary>
    /// Registra o actualiza de manera segura a un cliente invitado (Guest Checkout) para la tienda en línea.
    /// Permite asociar la orden y la dirección de envío sin requerir creación previa de credenciales de acceso.
    /// </summary>
    [HttpPost("customers/ensure")]
    public async Task<IActionResult> EnsureGuestCustomer(
        [FromBody] EnsureCustomerRequest request,
        CancellationToken cancellationToken)
    {
        if (request == null)
        {
            return BadRequest(new { message = "Datos del cliente no proporcionados." });
        }

        if (string.IsNullOrWhiteSpace(request.Email) || !request.Email.Contains('@'))
        {
            return BadRequest(new { message = "El correo electrónico es obligatorio y debe tener un formato válido." });
        }

        if (string.IsNullOrWhiteSpace(request.FirstName) || string.IsNullOrWhiteSpace(request.LastName))
        {
            return BadRequest(new { message = "El nombre y apellidos son obligatorios." });
        }

        var normalizedEmail = request.Email.Trim().ToLower();
        var customer = await _dbContext.Customers
            .FirstOrDefaultAsync(c => c.Email.ToLower() == normalizedEmail, cancellationToken);

        var fullAddress = $"{request.Street?.Trim()} #{request.ExteriorNumber?.Trim()}{(string.IsNullOrWhiteSpace(request.InteriorNumber) ? "" : $" Int. {request.InteriorNumber.Trim()}")}, Col. {request.Neighborhood?.Trim()}".Trim(' ', ',');

        bool isNew = false;
        if (customer == null)
        {
            isNew = true;
            customer = new Cliente
            {
                Id = Guid.NewGuid(),
                Nombre = request.FirstName.Trim(),
                Apellido = request.LastName.Trim(),
                Email = normalizedEmail,
                Telefono = request.Phone?.Trim() ?? string.Empty,
                Direccion = fullAddress,
                Ciudad = request.Municipality?.Trim() ?? string.Empty,
                Estado = request.State?.Trim() ?? string.Empty,
                CodigoPostal = request.ZipCode?.Trim() ?? string.Empty,
                TipoCliente = CustomerTypes.Retail,
                PorcentajeDescuentoEspecial = 0m,
                LimiteCajasDiarias = 0m,
                PasswordHash = "WPC123",
                Notas = "Cliente registrado vía E-Commerce WPC Bajío (Checkout).",
                EstaActivo = true,
                FechaCreacionUtc = DateTime.UtcNow
            };
            _dbContext.Customers.Add(customer);
        }
        else
        {
            customer.Nombre = request.FirstName.Trim();
            customer.Apellido = request.LastName.Trim();
            if (!string.IsNullOrWhiteSpace(request.Phone))
            {
                customer.Telefono = request.Phone.Trim();
            }
            if (!string.IsNullOrWhiteSpace(fullAddress))
            {
                customer.Direccion = fullAddress;
            }
            if (!string.IsNullOrWhiteSpace(request.Municipality))
            {
                customer.Ciudad = request.Municipality.Trim();
            }
            if (!string.IsNullOrWhiteSpace(request.State))
            {
                customer.Estado = request.State.Trim();
            }
            if (!string.IsNullOrWhiteSpace(request.ZipCode))
            {
                customer.CodigoPostal = request.ZipCode.Trim();
            }
            customer.FechaActualizacionUtc = DateTime.UtcNow;
        }

        await _dbContext.SaveChangesAsync(cancellationToken);

        return Ok(new
        {
            id = customer.Id,
            firstName = customer.Nombre,
            lastName = customer.Apellido,
            fullName = customer.NombreMostrar,
            email = customer.Email,
            phone = customer.Telefono,
            address = new
            {
                street = request.Street ?? string.Empty,
                exteriorNumber = request.ExteriorNumber ?? string.Empty,
                interiorNumber = request.InteriorNumber,
                neighborhood = request.Neighborhood ?? string.Empty,
                municipality = customer.Ciudad,
                state = customer.Estado,
                zipCode = customer.CodigoPostal,
                references = request.References
            },
            isNewCustomer = isNew,
            message = isNew ? "Cliente registrado exitosamente." : "Datos del cliente actualizados para el checkout."
        });
    }

    /// <summary>
    /// Valida el formato de código postal mexicano (5 dígitos) y resuelve estado y municipio de referencia en la República Mexicana.
    /// </summary>
    [HttpGet("addresses/validate-zip/{zipCode}")]
    public IActionResult ValidateZipCode(string zipCode)
    {
        if (string.IsNullOrWhiteSpace(zipCode) || zipCode.Length != 5 || !int.TryParse(zipCode, out _))
        {
            return BadRequest(new { isValid = false, message = "El código postal debe tener exactamente 5 dígitos numéricos." });
        }

        var prefix = int.Parse(zipCode[..2]);
        string state = prefix switch
        {
            >= 01 and <= 19 => "Ciudad de México",
            >= 20 and <= 20 => "Aguascalientes",
            >= 21 and <= 22 => "Baja California",
            >= 23 and <= 23 => "Baja California Sur",
            >= 24 and <= 24 => "Campeche",
            >= 25 and <= 27 => "Coahuila",
            >= 28 and <= 28 => "Colima",
            >= 29 and <= 30 => "Chiapas",
            >= 31 and <= 33 => "Chihuahua",
            >= 34 and <= 35 => "Durango",
            >= 36 and <= 38 => "Guanajuato",
            >= 39 and <= 41 => "Guerrero",
            >= 42 and <= 43 => "Hidalgo",
            >= 44 and <= 49 => "Jalisco",
            >= 50 and <= 57 => "Estado de México",
            >= 58 and <= 61 => "Michoacán",
            >= 62 and <= 62 => "Morelos",
            >= 63 and <= 63 => "Nayarit",
            >= 64 and <= 67 => "Nuevo León",
            >= 68 and <= 71 => "Oaxaca",
            >= 72 and <= 75 => "Puebla",
            >= 76 and <= 76 => "Querétaro",
            >= 77 and <= 77 => "Quintana Roo",
            >= 78 and <= 79 => "San Luis Potosí",
            >= 80 and <= 82 => "Sinaloa",
            >= 83 and <= 85 => "Sonora",
            >= 86 and <= 86 => "Tabasco",
            >= 87 and <= 89 => "Tamaulipas",
            >= 90 and <= 90 => "Tlaxcala",
            >= 91 and <= 96 => "Veracruz",
            >= 97 and <= 97 => "Yucatán",
            >= 98 and <= 99 => "Zacatecas",
            _ => "México"
        };

        string suggestedCity = prefix switch
        {
            36 => "Irapuato / Guanajuato",
            37 => "León",
            38 => "Celaya",
            44 or 45 => "Guadalajara / Zapopan",
            76 => "Santiago de Querétaro",
            64 or 66 => "Monterrey",
            _ => string.Empty
        };

        return Ok(new
        {
            isValid = true,
            zipCode,
            state,
            suggestedCity
        });
    }

    /// <summary>
    /// Limpia campos confidenciales del negocio (como costo unitario) antes de exponer al público.
    /// </summary>

    /// <summary>
    /// Recibe un mensaje de contacto enviado por clientes desde la tienda en línea.
    /// </summary>
    [HttpPost("contact")]
    public IActionResult SubmitContactMessage([FromBody] ContactMessageDto message)
    {
        if (string.IsNullOrWhiteSpace(message.Name) || string.IsNullOrWhiteSpace(message.Email))
        {
            return BadRequest(new { message = "El nombre y correo electrónico son requeridos." });
        }

        message.Id = Guid.NewGuid();
        message.CreatedAtUtc = DateTime.UtcNow;
        _contactMessages.Insert(0, message);

        _logger.LogInformation("Mensaje de contacto recibido de {Name} ({Email}): {Subject}", message.Name, message.Email, message.Subject);

        return Ok(new
        {
            success = true,
            id = message.Id,
            message = "Tu mensaje ha sido recibido con éxito. Nos pondremos en contacto contigo a la brevedad."
        });
    }

    /// <summary>
    /// Consulta los mensajes de contacto de clientes para atención en PDV.
    /// </summary>
    [HttpGet("contact-messages")]
    public IActionResult GetContactMessages()
    {
        return Ok(_contactMessages);
    }

    /// <summary>
    /// Consulta las promociones vigentes configuradas para la tienda en línea.
    /// </summary>
    [HttpGet("promotions")]
    public IActionResult GetPromotions()
    {
        return Ok(new[]
        {
            new
            {
                code = "WPC15",
                title = "15% de Descuento Gran Apertura",
                discountPercent = 15,
                description = "Válido en la primera compra de paneles de lambrín.",
                isActive = true
            },
            new
            {
                code = "ENVIOGRATIS",
                title = "Envío Gratis Nacional",
                discountPercent = 0,
                description = "Flete bonificado en pedidos elegibles.",
                isActive = true
            }
        });
    }

    /// <summary>
    /// Registro de cliente desde el CDC (Tienda en Línea) con contraseña.
    /// </summary>
    [HttpPost("customers/register")]
    public async Task<IActionResult> RegisterStoreCustomer(
        [FromBody] RegisterCustomerRequest request,
        CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(request.Email))
            return BadRequest(new { message = "El correo electrónico es obligatorio." });
        if (string.IsNullOrWhiteSpace(request.Password) || request.Password.Trim().Length < 6)
            return BadRequest(new { message = "La contraseña debe tener al menos 6 caracteres." });

        var normalizedEmail = request.Email.Trim().ToLower();
        var customer = await _dbContext.Customers
            .FirstOrDefaultAsync(c => c.Email.ToLower() == normalizedEmail, cancellationToken);

        if (customer != null)
        {
            if (string.IsNullOrEmpty(customer.PasswordHash) || customer.PasswordHash == "WPC123")
            {
                customer.PasswordHash = request.Password.Trim();
                if (!string.IsNullOrWhiteSpace(request.FirstName)) customer.Nombre = request.FirstName.Trim();
                if (!string.IsNullOrWhiteSpace(request.LastName)) customer.Apellido = request.LastName.Trim();
                if (!string.IsNullOrWhiteSpace(request.Phone)) customer.Telefono = request.Phone.Trim();
                customer.FechaActualizacionUtc = DateTime.UtcNow;
                await _dbContext.SaveChangesAsync(cancellationToken);

                return Ok(new
                {
                    id = customer.Id,
                    firstName = customer.Nombre,
                    lastName = customer.Apellido,
                    fullName = customer.NombreMostrar,
                    email = customer.Email,
                    phone = customer.Telefono,
                    message = "¡Tu cuenta ha sido activada y vinculada exitosamente con tu registro de tienda física!"
                });
            }

            return BadRequest(new { message = "Ya existe una cuenta con este correo electrónico. Por favor inicia sesión o recupera tu contraseña." });
        }

        customer = new Cliente
        {
            Id = Guid.NewGuid(),
            Nombre = string.IsNullOrWhiteSpace(request.FirstName) ? "Cliente" : request.FirstName.Trim(),
            Apellido = request.LastName?.Trim() ?? string.Empty,
            Email = normalizedEmail,
            Telefono = request.Phone?.Trim() ?? string.Empty,
            Direccion = request.Address?.Trim() ?? string.Empty,
            Ciudad = request.City?.Trim() ?? string.Empty,
            Estado = request.State?.Trim() ?? string.Empty,
            CodigoPostal = request.PostalCode?.Trim() ?? string.Empty,
            TipoCliente = CustomerTypes.Retail,
            PorcentajeDescuentoEspecial = 0m,
            LimiteCajasDiarias = 0m,
            PasswordHash = request.Password.Trim(),
            Notas = "Cliente registrado desde la tienda en línea (CDC).",
            EstaActivo = true,
            FechaCreacionUtc = DateTime.UtcNow
        };

        _dbContext.Customers.Add(customer);
        await _dbContext.SaveChangesAsync(cancellationToken);

        return Ok(new
        {
            id = customer.Id,
            firstName = customer.Nombre,
            lastName = customer.Apellido,
            fullName = customer.NombreMostrar,
            email = customer.Email,
            phone = customer.Telefono,
            message = "Registro completado exitosamente."
        });
    }

    /// <summary>
    /// Inicio de sesión de cliente en CDC validando correo y contraseña.
    /// Soporta contraseña por default WPC123 para clientes registrados previamente en PDV.
    /// </summary>
    [HttpPost("customers/login")]
    public async Task<IActionResult> LoginStoreCustomer(
        [FromBody] LoginCustomerRequest request,
        CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(request.Email) || string.IsNullOrWhiteSpace(request.Password))
            return BadRequest(new { message = "Debes ingresar correo electrónico y contraseña." });

        var normalizedEmail = request.Email.Trim().ToLower();
        var customer = await _dbContext.Customers
            .FirstOrDefaultAsync(c => c.Email.ToLower() == normalizedEmail, cancellationToken);

        if (customer == null)
        {
            return BadRequest(new { message = "Correo electrónico o contraseña incorrectos." });
        }

        var effectiveHash = string.IsNullOrWhiteSpace(customer.PasswordHash) ? "WPC123" : customer.PasswordHash;
        if (effectiveHash != request.Password.Trim())
        {
            return BadRequest(new { message = "Correo electrónico o contraseña incorrectos." });
        }

        return Ok(new
        {
            id = customer.Id,
            firstName = customer.Nombre,
            lastName = customer.Apellido,
            fullName = customer.NombreMostrar,
            email = customer.Email,
            phone = customer.Telefono,
            address = new
            {
                street = customer.Direccion,
                municipality = customer.Ciudad,
                state = customer.Estado,
                zipCode = customer.CodigoPostal
            },
            message = "Inicio de sesión exitoso."
        });
    }

    /// <summary>
    /// Restablecimiento sencillo de contraseña para clientes del CDC.
    /// </summary>
    [HttpPost("customers/reset-password")]
    public async Task<IActionResult> ResetCustomerPassword(
        [FromBody] ResetPasswordRequest request,
        CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(request.Email))
            return BadRequest(new { message = "El correo electrónico es obligatorio." });
        if (string.IsNullOrWhiteSpace(request.NewPassword) || request.NewPassword.Trim().Length < 6)
            return BadRequest(new { message = "La nueva contraseña debe tener al menos 6 caracteres." });

        var normalizedEmail = request.Email.Trim().ToLower();
        var customer = await _dbContext.Customers
            .FirstOrDefaultAsync(c => c.Email.ToLower() == normalizedEmail, cancellationToken);

        if (customer == null)
        {
            return NotFound(new { message = "No se encontró ningún cliente registrado con este correo." });
        }

        customer.PasswordHash = request.NewPassword.Trim();
        customer.FechaActualizacionUtc = DateTime.UtcNow;
        await _dbContext.SaveChangesAsync(cancellationToken);

        return Ok(new
        {
            success = true,
            message = "Contraseña restablecida exitosamente. Ya puedes iniciar sesión con tu nueva contraseña."
        });
    }

    private static ProductDto SanitizeForStore(ProductDto p)
    {
        return p with { UnitCost = 0m };
    }
}

public record CheckInventoryItemRequest(Guid ProductId, string Unit, decimal Quantity);
public record CheckInventoryBatchRequest(List<CheckInventoryItemRequest> Items);

public class CartValidationItemRequest
{
    public string? ProductId { get; set; }
    public string? Sku { get; set; }
    public string Unit { get; set; } = "piece";
    public int Quantity { get; set; } = 1;
    public decimal? PricePerUnit { get; set; }
}

public class ValidateCartRequest
{
    public List<CartValidationItemRequest> Items { get; set; } = new();
    public string? DeliveryMethod { get; set; }
}

public record EnsureCustomerRequest(
    string FirstName,
    string LastName,
    string Email,
    string? Phone,
    string? Street,
    string? ExteriorNumber,
    string? InteriorNumber,
    string? Neighborhood,
    string? Municipality,
    string? State,
    string? ZipCode,
    string? References
);

public record RegisterCustomerRequest(
    string FirstName,
    string LastName,
    string Email,
    string? Phone,
    string Password,
    string? Address = null,
    string? City = null,
    string? State = null,
    string? PostalCode = null
);

public record LoginCustomerRequest(
    string Email,
    string Password
);

public record ResetPasswordRequest(
    string Email,
    string NewPassword
);

public class ContactMessageDto
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string Phone { get; set; } = string.Empty;
    public string Subject { get; set; } = string.Empty;
    public string Message { get; set; } = string.Empty;
    public DateTime CreatedAtUtc { get; set; }
}
