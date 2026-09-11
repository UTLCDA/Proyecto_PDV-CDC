using System.Text.RegularExpressions;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using Pos.Application.Catalog.DTOs;
using Pos.Application.Common.Interfaces;
using SixLabors.ImageSharp;
using SixLabors.ImageSharp.Formats.Webp;
using SixLabors.ImageSharp.Processing;

namespace Pos.Infrastructure.Services;

public class LocalProductImageStorageService : IProductImageStorageService
{
    private readonly string _baseStoragePath;
    private readonly string _requestPath;
    private readonly long _maxFileSizeBytes;
    private readonly HashSet<string> _allowedExtensions;
    private readonly ILogger<LocalProductImageStorageService> _logger;

    public const string ThumbnailFileName = "thumbnail.webp";
    public const string PosFileName = "pos.webp";
    public const string PreviewFileName = "preview.webp";

    public LocalProductImageStorageService(
        IConfiguration configuration,
        ILogger<LocalProductImageStorageService> logger)
    {
        _logger = logger;

        // Configuración de almacenamiento
        var configuredPath = configuration["Storage:ProductImagesPath"];
        if (string.IsNullOrWhiteSpace(configuredPath))
        {
            configuredPath = Path.Combine(Directory.GetCurrentDirectory(), "data", "products");
        }
        _baseStoragePath = Path.GetFullPath(configuredPath);

        var configuredRequest = configuration["Storage:ProductImagesRequestPath"];
        _requestPath = string.IsNullOrWhiteSpace(configuredRequest) ? "/products" : configuredRequest.TrimEnd('/');

        var configuredMaxBytes = configuration.GetValue<long?>("Storage:MaxFileSizeBytes");
        _maxFileSizeBytes = configuredMaxBytes ?? (10 * 1024 * 1024); // 10 MB default

        var configuredExtensions = configuration.GetSection("Storage:AllowedExtensions").Get<string[]>();
        _allowedExtensions = configuredExtensions != null && configuredExtensions.Length > 0
            ? new HashSet<string>(configuredExtensions, StringComparer.OrdinalIgnoreCase)
            : new HashSet<string>(new[] { ".jpg", ".jpeg", ".png", ".webp" }, StringComparer.OrdinalIgnoreCase);

        EnsureDirectoryExists(_baseStoragePath);
    }

    public async Task<ProductImageResultDto> SaveProductImageAsync(
        Guid productId,
        Stream imageStream,
        string originalFileName,
        CancellationToken cancellationToken = default)
    {
        if (productId == Guid.Empty)
        {
            throw new ArgumentException("El identificador de producto no puede ser vacío.", nameof(productId));
        }

        if (imageStream == null || !imageStream.CanRead)
        {
            throw new ArgumentException("El flujo de la imagen no es válido.", nameof(imageStream));
        }

        // 1. Validar extensión de archivo
        var extension = Path.GetExtension(originalFileName);
        if (string.IsNullOrWhiteSpace(extension) || !_allowedExtensions.Contains(extension))
        {
            throw new ArgumentException($"Extensión '{extension}' no permitida. Formatos válidos: {string.Join(", ", _allowedExtensions)}.");
        }

        // 2. Validar tamaño
        if (imageStream.CanSeek && imageStream.Length > _maxFileSizeBytes)
        {
            throw new ArgumentException($"El archivo excede el tamaño máximo permitido de {_maxFileSizeBytes / (1024 * 1024)} MB.");
        }

        // Asegurar que el stream esté al inicio si es seekable
        if (imageStream.CanSeek && imageStream.Position > 0)
        {
            imageStream.Seek(0, SeekOrigin.Begin);
        }

        // 3. Cargar y validar imagen real mediante ImageSharp (identifica magic bytes reales)
        Image image;
        try
        {
            image = await Image.LoadAsync(imageStream, cancellationToken);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Fallo al decodificar la imagen del producto {ProductId}.", productId);
            throw new ArgumentException("El archivo proporcionado no es una imagen válida o está dañado.", ex);
        }

        using (image)
        {
            // 4. Limpiar metadatos innecesarios (EXIF, GPS, etc.)
            image.Metadata.ExifProfile = null;
            image.Metadata.IccProfile = null;
            image.Metadata.XmpProfile = null;

            // 5. Preparar directorio seguro de destino
            var productFolder = GetProductDirectory(productId);
            EnsureDirectoryExists(productFolder);

            var tempThumbnailPath = Path.Combine(productFolder, $"{ThumbnailFileName}.tmp");
            var tempPosPath = Path.Combine(productFolder, $"{PosFileName}.tmp");
            var tempPreviewPath = Path.Combine(productFolder, $"{PreviewFileName}.tmp");

            var finalThumbnailPath = Path.Combine(productFolder, ThumbnailFileName);
            var finalPosPath = Path.Combine(productFolder, PosFileName);
            var finalPreviewPath = Path.Combine(productFolder, PreviewFileName);

            try
            {
                // Variante 1: Thumbnail (máx 128x128, WebP calidad 80)
                using (var thumbImage = image.Clone(ctx => ctx.Resize(new ResizeOptions
                {
                    Size = new Size(128, 128),
                    Mode = ResizeMode.Max,
                    Sampler = KnownResamplers.Bicubic
                })))
                {
                    var encoder = new WebpEncoder { Quality = 80 };
                    await thumbImage.SaveAsync(tempThumbnailPath, encoder, cancellationToken);
                }

                // Variante 2: POS (máx 256x256, WebP calidad 82)
                using (var posImage = image.Clone(ctx => ctx.Resize(new ResizeOptions
                {
                    Size = new Size(256, 256),
                    Mode = ResizeMode.Max,
                    Sampler = KnownResamplers.Bicubic
                })))
                {
                    var encoder = new WebpEncoder { Quality = 82 };
                    await posImage.SaveAsync(tempPosPath, encoder, cancellationToken);
                }

                // Variante 3: Preview (máx 512x512, WebP calidad 85)
                using (var previewImage = image.Clone(ctx => ctx.Resize(new ResizeOptions
                {
                    Size = new Size(512, 512),
                    Mode = ResizeMode.Max,
                    Sampler = KnownResamplers.Bicubic
                })))
                {
                    var encoder = new WebpEncoder { Quality = 85 };
                    await previewImage.SaveAsync(tempPreviewPath, encoder, cancellationToken);
                }

                // Operación atómica de reemplazo
                File.Move(tempThumbnailPath, finalThumbnailPath, overwrite: true);
                File.Move(tempPosPath, finalPosPath, overwrite: true);
                File.Move(tempPreviewPath, finalPreviewPath, overwrite: true);

                _logger.LogInformation("Variantes de imagen generadas exitosamente para producto {ProductId}.", productId);

                var idStr = productId.ToString("D");
                return new ProductImageResultDto(
                    ThumbnailUrl: $"{_requestPath}/{idStr}/{ThumbnailFileName}",
                    PosUrl: $"{_requestPath}/{idStr}/{PosFileName}",
                    PreviewUrl: $"{_requestPath}/{idStr}/{PreviewFileName}"
                );
            }
            catch
            {
                // Compensación en caso de fallo
                SafeDeleteFile(tempThumbnailPath);
                SafeDeleteFile(tempPosPath);
                SafeDeleteFile(tempPreviewPath);
                throw;
            }
        }
    }

    public Task<bool> DeleteProductImageAsync(Guid productId, CancellationToken cancellationToken = default)
    {
        if (productId == Guid.Empty) return Task.FromResult(false);

        var productFolder = GetProductDirectory(productId);
        if (!Directory.Exists(productFolder)) return Task.FromResult(false);

        try
        {
            var thumbnailPath = Path.Combine(productFolder, ThumbnailFileName);
            var posPath = Path.Combine(productFolder, PosFileName);
            var previewPath = Path.Combine(productFolder, PreviewFileName);

            SafeDeleteFile(thumbnailPath);
            SafeDeleteFile(posPath);
            SafeDeleteFile(previewPath);

            // Eliminar carpeta si está vacía
            if (!Directory.EnumerateFileSystemEntries(productFolder).Any())
            {
                Directory.Delete(productFolder, recursive: false);
            }

            _logger.LogInformation("Imágenes físicas eliminadas para producto {ProductId}.", productId);
            return Task.FromResult(true);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Error al eliminar imágenes físicas de producto {ProductId}.", productId);
            return Task.FromResult(false);
        }
    }

    public async Task<ProductImageResultDto?> MigrateBase64ImageAsync(
        Guid productId,
        string base64Data,
        CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(base64Data)) return null;

        var cleanBase64 = base64Data.Trim();
        var commaIdx = cleanBase64.IndexOf(',');
        if (commaIdx >= 0)
        {
            cleanBase64 = cleanBase64.Substring(commaIdx + 1);
        }

        byte[] bytes;
        try
        {
            bytes = Convert.FromBase64String(cleanBase64);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Cadena Base64 inválida para migrar imagen de producto {ProductId}.", productId);
            throw new ArgumentException("Cadena Base64 inválida.", ex);
        }

        using var memoryStream = new MemoryStream(bytes);
        return await SaveProductImageAsync(productId, memoryStream, "migrated_image.jpg", cancellationToken);
    }

    public string? GetVariantUrl(string? rawImageUrl, ProductImageVariant variant)
    {
        if (string.IsNullOrWhiteSpace(rawImageUrl)) return null;

        // Si es Base64 temporal, se devuelve tal cual
        if (rawImageUrl.StartsWith("data:image/", StringComparison.OrdinalIgnoreCase))
        {
            return rawImageUrl;
        }

        // Si es una ruta interna de producto
        if (rawImageUrl.StartsWith(_requestPath, StringComparison.OrdinalIgnoreCase))
        {
            var targetFileName = variant switch
            {
                ProductImageVariant.Thumbnail => ThumbnailFileName,
                ProductImageVariant.Preview => PreviewFileName,
                _ => PosFileName
            };

            return Regex.Replace(rawImageUrl, @"(thumbnail|pos|preview)\.webp$", targetFileName, RegexOptions.IgnoreCase);
        }

        // URLs externas completas
        return rawImageUrl;
    }

    private string GetProductDirectory(Guid productId)
    {
        // Sanitizar y prevenir path traversal usando productId formateado
        var safeFolder = productId.ToString("D");
        var fullPath = Path.GetFullPath(Path.Combine(_baseStoragePath, safeFolder));

        if (!fullPath.StartsWith(_baseStoragePath, StringComparison.OrdinalIgnoreCase))
        {
            throw new InvalidOperationException("Ruta no autorizada.");
        }

        return fullPath;
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
            // Best-effort suppression
        }
    }
}
