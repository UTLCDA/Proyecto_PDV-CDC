using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging.Abstractions;
using Pos.Application.Catalog.DTOs;
using Pos.Infrastructure.Services;
using SixLabors.ImageSharp;
using SixLabors.ImageSharp.PixelFormats;
using Xunit;

namespace Pos.Application.Tests.Catalog;

public class ProductImageStorageServiceTests : IDisposable
{
    private readonly string _testDirectory;
    private readonly LocalProductImageStorageService _storageService;

    public ProductImageStorageServiceTests()
    {
        _testDirectory = Path.Combine(Path.GetTempPath(), "PosTestImages_" + Guid.NewGuid().ToString("N"));
        Directory.CreateDirectory(_testDirectory);

        var inMemorySettings = new Dictionary<string, string?>
        {
            ["Storage:ProductImagesPath"] = _testDirectory,
            ["Storage:ProductImagesRequestPath"] = "/products",
            ["Storage:MaxFileSizeBytes"] = (5 * 1024 * 1024).ToString()
        };

        var configuration = new ConfigurationBuilder()
            .AddInMemoryCollection(inMemorySettings)
            .Build();

        _storageService = new LocalProductImageStorageService(configuration, NullLogger<LocalProductImageStorageService>.Instance);
    }

    public void Dispose()
    {
        try
        {
            if (Directory.Exists(_testDirectory))
            {
                Directory.Delete(_testDirectory, recursive: true);
            }
        }
        catch
        {
            // Ignorar errores en limpieza de temporales
        }
    }

    private static MemoryStream CreateValidTestImageStream(int width = 300, int height = 200)
    {
        using var image = new Image<Rgba32>(width, height);
        // Llenar con color de prueba
        for (int y = 0; y < height; y++)
        {
            for (int x = 0; x < width; x++)
            {
                image[x, y] = new Rgba32((byte)(x % 255), (byte)(y % 255), 150);
            }
        }

        var ms = new MemoryStream();
        image.SaveAsPng(ms);
        ms.Position = 0;
        return ms;
    }

    [Fact]
    public async Task SaveProductImageAsync_ShouldCreateThreeWebPVariants_AndReturnValidUrls()
    {
        // Arrange
        var productId = Guid.NewGuid();
        using var stream = CreateValidTestImageStream(400, 300);

        // Act
        var result = await _storageService.SaveProductImageAsync(productId, stream, "lambrin-test.png");

        // Assert
        Assert.NotNull(result);
        var idStr = productId.ToString("D");
        Assert.Equal($"/products/{idStr}/thumbnail.webp", result.ThumbnailUrl);
        Assert.Equal($"/products/{idStr}/pos.webp", result.PosUrl);
        Assert.Equal($"/products/{idStr}/preview.webp", result.PreviewUrl);

        var productDir = Path.Combine(_testDirectory, idStr);
        Assert.True(File.Exists(Path.Combine(productDir, "thumbnail.webp")));
        Assert.True(File.Exists(Path.Combine(productDir, "pos.webp")));
        Assert.True(File.Exists(Path.Combine(productDir, "preview.webp")));

        // Verificar que los archivos físicos sean válidos y de tamaño no cero
        var thumbInfo = new FileInfo(Path.Combine(productDir, "thumbnail.webp"));
        Assert.True(thumbInfo.Length > 0);
    }

    [Fact]
    public async Task SaveProductImageAsync_ShouldRejectNonImageFiles()
    {
        // Arrange
        var productId = Guid.NewGuid();
        var fakeBytes = System.Text.Encoding.UTF8.GetBytes("Este es un archivo de texto falso haciéndose pasar por imagen");
        using var stream = new MemoryStream(fakeBytes);

        // Act & Assert
        await Assert.ThrowsAsync<ArgumentException>(() =>
            _storageService.SaveProductImageAsync(productId, stream, "malicious.jpg"));
    }

    [Fact]
    public async Task SaveProductImageAsync_ShouldRejectDisallowedExtensions()
    {
        // Arrange
        var productId = Guid.NewGuid();
        using var stream = CreateValidTestImageStream();

        // Act & Assert (ej. .svg no permitido por seguridad XSS)
        await Assert.ThrowsAsync<ArgumentException>(() =>
            _storageService.SaveProductImageAsync(productId, stream, "vector.svg"));
    }

    [Fact]
    public async Task DeleteProductImageAsync_ShouldRemoveFiles_AndReturnTrue()
    {
        // Arrange
        var productId = Guid.NewGuid();
        using (var stream = CreateValidTestImageStream())
        {
            await _storageService.SaveProductImageAsync(productId, stream, "to-delete.jpg");
        }

        var productDir = Path.Combine(_testDirectory, productId.ToString("D"));
        Assert.True(File.Exists(Path.Combine(productDir, "pos.webp")));

        // Act
        var deleted = await _storageService.DeleteProductImageAsync(productId);

        // Assert
        Assert.True(deleted);
        Assert.False(File.Exists(Path.Combine(productDir, "pos.webp")));
    }

    [Fact]
    public async Task MigrateBase64ImageAsync_ShouldConvertBase64StringToWebpFiles()
    {
        // Arrange
        var productId = Guid.NewGuid();
        using var stream = CreateValidTestImageStream(200, 200);
        var base64String = "data:image/png;base64," + Convert.ToBase64String(stream.ToArray());

        // Act
        var result = await _storageService.MigrateBase64ImageAsync(productId, base64String);

        // Assert
        Assert.NotNull(result);
        var productDir = Path.Combine(_testDirectory, productId.ToString("D"));
        Assert.True(File.Exists(Path.Combine(productDir, "thumbnail.webp")));
        Assert.True(File.Exists(Path.Combine(productDir, "pos.webp")));
    }

    [Fact]
    public void GetVariantUrl_ShouldResolveCorrectVariantOrPreserveExternalUrls()
    {
        var productId = Guid.NewGuid();
        var idStr = productId.ToString("D");
        var posUrl = $"/products/{idStr}/pos.webp";

        var thumbUrl = _storageService.GetVariantUrl(posUrl, ProductImageVariant.Thumbnail);
        var previewUrl = _storageService.GetVariantUrl(posUrl, ProductImageVariant.Preview);

        Assert.Equal($"/products/{idStr}/thumbnail.webp", thumbUrl);
        Assert.Equal($"/products/{idStr}/preview.webp", previewUrl);

        // URLs externas se preservan intactas
        var externalUrl = "https://cdn.example.com/images/prod.jpg";
        Assert.Equal(externalUrl, _storageService.GetVariantUrl(externalUrl, ProductImageVariant.Thumbnail));

        // Base64 temporal se preserva intacto
        var base64 = "data:image/jpeg;base64,/9j/4AAQSkZJRg==";
        Assert.Equal(base64, _storageService.GetVariantUrl(base64, ProductImageVariant.Thumbnail));
    }
}
