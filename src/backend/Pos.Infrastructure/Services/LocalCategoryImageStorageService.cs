using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using Pos.Application.Catalog.DTOs;
using Pos.Application.Common.Interfaces;
using SixLabors.ImageSharp;
using SixLabors.ImageSharp.Formats.Webp;
using SixLabors.ImageSharp.Processing;

namespace Pos.Infrastructure.Services;

public class LocalCategoryImageStorageService : ICategoryImageStorageService
{
    private readonly string _baseStoragePath;
    private readonly string _requestPath;
    private readonly long _maxFileSizeBytes;
    private readonly HashSet<string> _allowedExtensions;
    private readonly ILogger<LocalCategoryImageStorageService> _logger;

    public const string ThumbnailFileName = "thumbnail.webp";
    public const string PosFileName = "pos.webp";
    public const string PreviewFileName = "preview.webp";

    public LocalCategoryImageStorageService(
        IConfiguration configuration,
        ILogger<LocalCategoryImageStorageService> logger)
    {
        _logger = logger;

        var configuredPath = configuration["Storage:CategoryImagesPath"];
        if (string.IsNullOrWhiteSpace(configuredPath))
        {
            configuredPath = Path.Combine(Directory.GetCurrentDirectory(), "data", "categories");
        }
        _baseStoragePath = Path.GetFullPath(configuredPath);

        var configuredRequest = configuration["Storage:CategoryImagesRequestPath"];
        _requestPath = string.IsNullOrWhiteSpace(configuredRequest) ? "/categories" : configuredRequest.TrimEnd('/');

        var configuredMaxBytes = configuration.GetValue<long?>("Storage:MaxFileSizeBytes");
        _maxFileSizeBytes = configuredMaxBytes ?? (10 * 1024 * 1024); // 10 MB default

        var configuredExtensions = configuration.GetSection("Storage:AllowedExtensions").Get<string[]>();
        _allowedExtensions = configuredExtensions != null && configuredExtensions.Length > 0
            ? new HashSet<string>(configuredExtensions, StringComparer.OrdinalIgnoreCase)
            : new HashSet<string>(StringComparer.OrdinalIgnoreCase) { ".jpg", ".jpeg", ".png", ".webp", ".bmp", ".jfif", ".gif", ".heic", ".heif" };

        EnsureDirectoryExists(_baseStoragePath);
    }

    public async Task<ProductImageResultDto> SaveCategoryImageAsync(
        Guid categoryId,
        Stream imageStream,
        string originalFileName,
        CancellationToken cancellationToken = default)
    {
        if (categoryId == Guid.Empty)
        {
            throw new ArgumentException("El identificador de categoría no puede ser vacío.", nameof(categoryId));
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

        if (imageStream.CanSeek && imageStream.Position > 0)
        {
            imageStream.Seek(0, SeekOrigin.Begin);
        }

        // 3. Cargar y validar imagen real mediante ImageSharp
        Image image;
        try
        {
            image = await Image.LoadAsync(imageStream, cancellationToken);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Fallo al decodificar la imagen de la categoría {CategoryId}.", categoryId);
            throw new ArgumentException("El archivo proporcionado no es una imagen válida o está dañado.", ex);
        }

        using (image)
        {
            // 4. Limpiar metadatos innecesarios (EXIF, GPS, etc.)
            image.Metadata.ExifProfile = null;
            image.Metadata.IccProfile = null;
            image.Metadata.XmpProfile = null;

            // 5. Preparar directorio seguro de destino
            var categoryFolder = GetCategoryDirectory(categoryId);
            EnsureDirectoryExists(categoryFolder);

            var tempThumbnailPath = Path.Combine(categoryFolder, $"{ThumbnailFileName}.tmp");
            var tempPosPath = Path.Combine(categoryFolder, $"{PosFileName}.tmp");
            var tempPreviewPath = Path.Combine(categoryFolder, $"{PreviewFileName}.tmp");

            var finalThumbnailPath = Path.Combine(categoryFolder, ThumbnailFileName);
            var finalPosPath = Path.Combine(categoryFolder, PosFileName);
            var finalPreviewPath = Path.Combine(categoryFolder, PreviewFileName);

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

                // Variante 3: Preview (máx 800x800 para catálogo/web, WebP calidad 85)
                using (var previewImage = image.Clone(ctx => ctx.Resize(new ResizeOptions
                {
                    Size = new Size(800, 800),
                    Mode = ResizeMode.Max,
                    Sampler = KnownResamplers.Bicubic
                })))
                {
                    var encoder = new WebpEncoder { Quality = 85 };
                    await previewImage.SaveAsync(tempPreviewPath, encoder, cancellationToken);
                }

                // Reemplazo atómico
                File.Move(tempThumbnailPath, finalThumbnailPath, overwrite: true);
                File.Move(tempPosPath, finalPosPath, overwrite: true);
                File.Move(tempPreviewPath, finalPreviewPath, overwrite: true);

                _logger.LogInformation("Variantes de imagen generadas exitosamente para categoría {CategoryId}.", categoryId);

                var idStr = categoryId.ToString("D");
                return new ProductImageResultDto(
                    ThumbnailUrl: $"{_requestPath}/{idStr}/{ThumbnailFileName}",
                    PosUrl: $"{_requestPath}/{idStr}/{PosFileName}",
                    PreviewUrl: $"{_requestPath}/{idStr}/{PreviewFileName}"
                );
            }
            catch
            {
                SafeDeleteFile(tempThumbnailPath);
                SafeDeleteFile(tempPosPath);
                SafeDeleteFile(tempPreviewPath);
                throw;
            }
        }
    }

    public Task<bool> DeleteCategoryImageAsync(
        Guid categoryId,
        CancellationToken cancellationToken = default)
    {
        if (categoryId == Guid.Empty)
        {
            return Task.FromResult(false);
        }

        try
        {
            var categoryFolder = GetCategoryDirectory(categoryId);
            if (Directory.Exists(categoryFolder))
            {
                Directory.Delete(categoryFolder, recursive: true);
                _logger.LogInformation("Directorio de imágenes de categoría {CategoryId} eliminado.", categoryId);
                return Task.FromResult(true);
            }

            return Task.FromResult(false);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Error al eliminar directorio de imágenes de categoría {CategoryId}.", categoryId);
            return Task.FromResult(false);
        }
    }

    private string GetCategoryDirectory(Guid categoryId)
    {
        return Path.Combine(_baseStoragePath, categoryId.ToString("D"));
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
            // Ignorar errores al limpiar temporales
        }
    }
}
