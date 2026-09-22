using System.Security.Claims;
using System.Text.Json;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Pos.Application.Catalog.DTOs;
using Pos.Application.Catalog.Services;
using Pos.Application.Common.Interfaces;
using Pos.Application.Common.Security;

namespace Pos.Api.Controllers.v1;

/// <summary>
/// Módulo administrativo del CDC para la gestión física y optimizada de imágenes complementarias del catálogo (Miniatura 2 y Miniatura 3).
/// Acceso restringido exclusivamente a admin@lambrin.com con política CDC_CATALOGO_IMAGENES_ADMIN.
/// </summary>
[ApiController]
[Route("api/v1/catalogo-imagenes")]
[Authorize(Policy = PermissionCodes.Cdc.CatalogImagesAdmin)]
public class CatalogoImagenesController : ControllerBase
{
    private const string AllowedAdminEmail = "admin@lambrin.com";
    private readonly ICatalogImageStorageService _storageService;
    private readonly IAuditLogService _auditLogService;
    private readonly ILogger<CatalogoImagenesController> _logger;

    public CatalogoImagenesController(
        ICatalogImageStorageService storageService,
        IAuditLogService auditLogService,
        ILogger<CatalogoImagenesController> logger)
    {
        _storageService = storageService;
        _auditLogService = auditLogService;
        _logger = logger;
    }

    /// <summary>
    /// Consulta el listado de productos del catálogo con el estado actual de Miniatura 2 y Miniatura 3.
    /// </summary>
    [HttpGet]
    public async Task<ActionResult<CatalogProductPagedResultDto>> GetCatalogSummary(
        [FromQuery] string? search,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 100,
        CancellationToken cancellationToken = default)
    {
        if (!IsAuthorizedAdmin(out var _))
        {
            return Forbid();
        }

        try
        {
            var summary = await _storageService.GetCatalogProductsSummaryAsync(search, page, pageSize, cancellationToken);
            return Ok(summary);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error al consultar el resumen del catálogo de imágenes.");
            return StatusCode(500, new { message = "Error interno al consultar el catálogo." });
        }
    }

    /// <summary>
    /// Consulta el estado físico y URLs actuales de Miniatura 2 y Miniatura 3 para un producto específico por SKU.
    /// </summary>
    [HttpGet("{sku}")]
    public async Task<ActionResult<CatalogProductImageStatusDto>> GetProductStatus(
        string sku,
        CancellationToken cancellationToken = default)
    {
        if (!IsAuthorizedAdmin(out var _))
        {
            return Forbid();
        }

        try
        {
            var status = await _storageService.GetProductImageStatusAsync(sku, cancellationToken);
            return Ok(status);
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { message = ex.Message });
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error al consultar imágenes de SKU {Sku}", sku);
            return StatusCode(500, new { message = "Error interno al consultar el estado de las imágenes." });
        }
    }

    /// <summary>
    /// Sube y optimiza físicamente en disco la imagen correspondiente a Miniatura 2 para el SKU especificado.
    /// </summary>
    [HttpPut("{sku}/2")]
    [Consumes("multipart/form-data")]
    public async Task<ActionResult<CatalogImageUploadResultDto>> UploadMiniatura2(
        string sku,
        [FromForm] IFormFile file,
        CancellationToken cancellationToken = default)
    {
        return await ProcessImageUpload(sku, 2, file, cancellationToken);
    }

    /// <summary>
    /// Sube y optimiza físicamente en disco la imagen correspondiente a Miniatura 3 para el SKU especificado.
    /// </summary>
    [HttpPut("{sku}/3")]
    [Consumes("multipart/form-data")]
    public async Task<ActionResult<CatalogImageUploadResultDto>> UploadMiniatura3(
        string sku,
        [FromForm] IFormFile file,
        CancellationToken cancellationToken = default)
    {
        return await ProcessImageUpload(sku, 3, file, cancellationToken);
    }

    private async Task<ActionResult<CatalogImageUploadResultDto>> ProcessImageUpload(
        string sku,
        int slot,
        IFormFile file,
        CancellationToken cancellationToken)
    {
        if (!IsAuthorizedAdmin(out var userEmail))
        {
            _logger.LogWarning("Intento no autorizado de modificación de catálogo por usuario no autorizado.");
            return Forbid();
        }

        if (file == null || file.Length == 0)
        {
            return BadRequest(new { message = "Se requiere adjuntar un archivo de imagen válido." });
        }

        var correlationId = HttpContext.Items["CorrelationId"]?.ToString() ?? Guid.NewGuid().ToString();
        var ipAddress = HttpContext.Connection.RemoteIpAddress?.ToString() ?? "127.0.0.1";
        string cleanSku;

        try
        {
            cleanSku = _storageService.SanitizeSku(sku);
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { message = ex.Message });
        }

        try
        {
            await using var stream = file.OpenReadStream();
            var result = await _storageService.SaveCatalogThumbnailAsync(cleanSku, slot, stream, file.FileName, cancellationToken);

            // Registro obligatorio en bitácora de auditoría (AuditLogs)
            await _auditLogService.LogAsync(
                correlationId,
                null,
                "CATALOG_IMAGE_UPLOAD",
                "CatalogoImagenes",
                cleanSku,
                null,
                $"Slot={slot};FileName={result.FileName};Size={result.FileSizeBytes};Url={result.Url}",
                ipAddress,
                $"{userEmail} actualizó Miniatura {slot} del producto {cleanSku}.",
                module: "Catalogo",
                eventType: "CATALOG_IMAGE_UPLOAD",
                resultStatus: "SUCCESS",
                cancellationToken: cancellationToken);

            return Ok(result);
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { message = ex.Message });
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error al procesar subida de miniatura {Slot} para SKU {Sku}", slot, cleanSku);
            return StatusCode(500, new { message = $"Error al procesar la imagen: {ex.Message}" });
        }
    }

    private bool IsAuthorizedAdmin(out string userEmail)
    {
        userEmail = User.FindFirst(ClaimTypes.Email)?.Value
            ?? User.FindFirst("email")?.Value
            ?? User.FindFirst(ClaimTypes.Name)?.Value
            ?? string.Empty;

        return string.Equals(userEmail, AllowedAdminEmail, StringComparison.OrdinalIgnoreCase);
    }
}
