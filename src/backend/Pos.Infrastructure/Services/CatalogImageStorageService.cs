using System.Text.RegularExpressions;
using Microsoft.AspNetCore.Hosting;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Pos.Application.Catalog.DTOs;
using Pos.Application.Catalog.Services;
using Pos.Domain.Entidades;
using Pos.Infrastructure.Persistence;
using SixLabors.ImageSharp;
using SixLabors.ImageSharp.Formats.Webp;
using SixLabors.ImageSharp.Processing;

namespace Pos.Infrastructure.Services;

public class CatalogImageStorageService : ICatalogImageStorageService
{
    private const string Miniatura2FileName = "miniatura-2.webp";
    private const string Miniatura3FileName = "miniatura-3.webp";
    private const string UrlPrefix = "/catalogo/productos";

    private readonly PosDbContext _dbContext;
    private readonly IWebHostEnvironment _env;
    private readonly ILogger<CatalogImageStorageService> _logger;

    private readonly string _baseStoragePath;
    private readonly string _requestPath;
    private readonly long _maxFileSizeBytes;
    private readonly HashSet<string> _allowedExtensions;

    public CatalogImageStorageService(
        PosDbContext dbContext,
        IWebHostEnvironment env,
        ILogger<CatalogImageStorageService> logger)
    {
        _dbContext = dbContext;
        _env = env;
        _logger = logger;

        _requestPath = UrlPrefix;
        _maxFileSizeBytes = 15 * 1024 * 1024; // 15 MB
        _allowedExtensions = new HashSet<string>(StringComparer.OrdinalIgnoreCase)
        {
            ".jpg", ".jpeg", ".png", ".webp"
        };

        var webRoot = !string.IsNullOrWhiteSpace(_env.WebRootPath)
            ? _env.WebRootPath
            : Path.Combine(_env.ContentRootPath, "wwwroot");

        _baseStoragePath = Path.Combine(webRoot, "catalogo", "productos");
        EnsureDirectoryExists(_baseStoragePath);
    }

    public string SanitizeSku(string sku)
    {
        if (string.IsNullOrWhiteSpace(sku))
        {
            throw new ArgumentException("El SKU del producto no puede estar vacío.", nameof(sku));
        }

        var trimmed = sku.Trim();
        if (!Regex.IsMatch(trimmed, @"^[a-zA-Z0-9_.-]+$"))
        {
            throw new ArgumentException($"El SKU '{sku}' contiene caracteres inválidos para el almacenamiento físico.", nameof(sku));
        }

        return trimmed;
    }

    public async Task<CatalogProductImageStatusDto> GetProductImageStatusAsync(string sku, CancellationToken cancellationToken = default)
    {
        var cleanSku = SanitizeSku(sku);

        var product = await _dbContext.Products
            .AsNoTracking()
            .FirstOrDefaultAsync(p => p.Sku.ToLower() == cleanSku.ToLower(), cancellationToken);

        if (product == null)
        {
            throw new KeyNotFoundException($"No se encontró ningún producto con SKU '{cleanSku}'.");
        }

        var productFolder = Path.Combine(_baseStoragePath, cleanSku);
        var miniatura2Info = InspectFile(productFolder, cleanSku, 2, Miniatura2FileName);
        var miniatura3Info = InspectFile(productFolder, cleanSku, 3, Miniatura3FileName);

        return new CatalogProductImageStatusDto(
            ProductId: product.Id,
            Sku: product.Sku,
            Name: product.Nombre,
            Miniatura2: miniatura2Info,
            Miniatura3: miniatura3Info
        );
    }

    public async Task<CatalogProductPagedResultDto> GetCatalogProductsSummaryAsync(
        string? search,
        int page = 1,
        int pageSize = 100,
        CancellationToken cancellationToken = default)
    {
        if (page < 1) page = 1;
        if (pageSize < 1) pageSize = 20;

        var query = _dbContext.Products
            .AsNoTracking()
            .Include(p => p.Categoria)
            .Where(p => p.EstaActivo);

        if (!string.IsNullOrWhiteSpace(search))
        {
            var term = search.Trim().ToLower();
            query = query.Where(p => p.Sku.ToLower().Contains(term) || p.Nombre.ToLower().Contains(term));
        }

        var totalCount = await query.CountAsync(cancellationToken);

        var pagedProducts = await query
            .OrderBy(p => p.Sku)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync(cancellationToken);

        var resultItems = new List<CatalogProductSummaryDto>();

        foreach (var p in pagedProducts)
        {
            var folder = Path.Combine(_baseStoragePath, p.Sku);
            var m2 = InspectFile(folder, p.Sku, 2, Miniatura2FileName);
            var m3 = InspectFile(folder, p.Sku, 3, Miniatura3FileName);

            resultItems.Add(new CatalogProductSummaryDto(
                Id: p.Id,
                Sku: p.Sku,
                Name: p.Nombre,
                CategoryName: p.Categoria?.Nombre,
                HasMiniatura2: m2.Exists,
                HasMiniatura3: m3.Exists,
                Miniatura2Url: m2.Url,
                Miniatura3Url: m3.Url
            ));
        }

        return new CatalogProductPagedResultDto(
            Items: resultItems,
            TotalCount: totalCount,
            Page: page,
            PageSize: pageSize
        );
    }

    public async Task<CatalogImageUploadResultDto> SaveCatalogThumbnailAsync(
        string sku,
        int slot,
        Stream imageStream,
        string originalFileName,
        CancellationToken cancellationToken = default)
    {
        var cleanSku = SanitizeSku(sku);

        if (slot != 2 && slot != 3)
        {
            throw new ArgumentException("El número de miniatura debe ser exclusivamente 2 o 3.", nameof(slot));
        }

        var product = await _dbContext.Products
            .AsNoTracking()
            .FirstOrDefaultAsync(p => p.Sku.ToLower() == cleanSku.ToLower(), cancellationToken);

        if (product == null)
        {
            throw new KeyNotFoundException($"El producto con SKU '{cleanSku}' no existe en la base de datos.");
        }

        if (imageStream == null || !imageStream.CanRead)
        {
            throw new ArgumentException("El flujo del archivo enviado está vacío o no es legible.");
        }

        var extension = Path.GetExtension(originalFileName);
        if (string.IsNullOrWhiteSpace(extension) || !_allowedExtensions.Contains(extension))
        {
            throw new ArgumentException($"Extensión '{extension}' no permitida. Formatos válidos: {string.Join(", ", _allowedExtensions)}.");
        }

        if (imageStream.CanSeek && imageStream.Length > _maxFileSizeBytes)
        {
            throw new ArgumentException($"El archivo excede el tamaño máximo permitido de {_maxFileSizeBytes / (1024 * 1024)} MB.");
        }

        if (imageStream.CanSeek && imageStream.Position > 0)
        {
            imageStream.Seek(0, SeekOrigin.Begin);
        }

        Image image;
        try
        {
            image = await Image.LoadAsync(imageStream, cancellationToken);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "El archivo subido para {Sku} slot {Slot} no es una imagen válida.", cleanSku, slot);
            throw new ArgumentException("El archivo proporcionado no es una imagen válida o se encuentra dañado.", ex);
        }

        var targetFileName = slot == 2 ? Miniatura2FileName : Miniatura3FileName;
        var productFolder = Path.Combine(_baseStoragePath, cleanSku);
        EnsureDirectoryExists(productFolder);

        var tempPath = Path.Combine(productFolder, $"{targetFileName}.tmp");
        var finalPath = Path.Combine(productFolder, targetFileName);

        long resultingSize = 0;
        var version = DateTimeOffset.UtcNow.ToUnixTimeSeconds().ToString();

        using (image)
        {
            image.Metadata.ExifProfile = null;
            image.Metadata.IccProfile = null;
            image.Metadata.XmpProfile = null;

            if (image.Width > 1200 || image.Height > 1200)
            {
                image.Mutate(ctx => ctx.Resize(new ResizeOptions
                {
                    Size = new Size(1200, 1200),
                    Mode = ResizeMode.Max,
                    Sampler = KnownResamplers.Bicubic
                }));
            }

            try
            {
                var encoder = new WebpEncoder
                {
                    Quality = 85,
                    Method = WebpEncodingMethod.BestQuality
                };

                await image.SaveAsync(tempPath, encoder, cancellationToken);
                File.Move(tempPath, finalPath, overwrite: true);

                var fileInfo = new FileInfo(finalPath);
                resultingSize = fileInfo.Length;

                _logger.LogInformation("Miniatura {Slot} optimizada y guardada exitosamente en {Path} ({Size} bytes).",
                    slot, finalPath, resultingSize);
            }
            catch (Exception ex)
            {
                SafeDeleteFile(tempPath);
                _logger.LogError(ex, "Error al guardar el archivo WebP en disco para SKU {Sku} slot {Slot}.", cleanSku, slot);
                throw new IOException($"No fue posible guardar la imagen en el servidor: {ex.Message}", ex);
            }
        }

        var publicUrl = $"{_requestPath}/{cleanSku}/{targetFileName}?v={version}";

        // Actualización no bloqueante de metadatos en base de datos si la tabla ProductImages está configurada
        try
        {
            var existingImage = await _dbContext.ProductImages
                .FirstOrDefaultAsync(img => img.ProductoId == product.Id && img.UrlImagen.Contains($"/{cleanSku}/{targetFileName}"), cancellationToken);

            if (existingImage != null)
            {
                existingImage.UrlImagen = publicUrl;
                existingImage.FechaActualizacionUtc = DateTime.UtcNow;
            }
            else
            {
                _dbContext.ProductImages.Add(new ImagenProducto
                {
                    Id = Guid.NewGuid(),
                    ProductoId = product.Id,
                    UrlImagen = publicUrl,
                    EsPrincipal = false,
                    EstaActivo = true,
                    FechaCreacionUtc = DateTime.UtcNow
                });
            }

            await _dbContext.SaveChangesAsync(cancellationToken);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Aviso: Sincronización secundaria en ProductImages para SKU {Sku} omitida: {Message}", cleanSku, ex.Message);
        }

        return new CatalogImageUploadResultDto(
            Sku: cleanSku,
            Slot: slot,
            FileName: targetFileName,
            Url: publicUrl,
            FileSizeBytes: resultingSize,
            Version: version,
            Message: $"Miniatura {slot} actualizada y optimizada a formato WebP exitosamente."
        );
    }

    private CatalogImageInfo InspectFile(string productFolder, string cleanSku, int slot, string fileName)
    {
        var filePath = Path.Combine(productFolder, fileName);
        if (File.Exists(filePath))
        {
            var info = new FileInfo(filePath);
            var version = new DateTimeOffset(info.LastWriteTimeUtc).ToUnixTimeSeconds();
            var url = $"{_requestPath}/{cleanSku}/{fileName}?v={version}";
            return new CatalogImageInfo(
                Slot: slot,
                FileName: fileName,
                Url: url,
                Exists: true,
                FileSizeBytes: info.Length,
                LastModifiedUtc: info.LastWriteTimeUtc
            );
        }

        return new CatalogImageInfo(
            Slot: slot,
            FileName: fileName,
            Url: null,
            Exists: false,
            FileSizeBytes: null,
            LastModifiedUtc: null
        );
    }

    private static void EnsureDirectoryExists(string path)
    {
        if (!Directory.Exists(path))
        {
            Directory.CreateDirectory(path);
        }
    }

    private static void SafeDeleteFile(string path)
    {
        try
        {
            if (File.Exists(path))
            {
                File.Delete(path);
            }
        }
        catch
        {
        }
    }
}
