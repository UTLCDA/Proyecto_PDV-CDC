namespace Pos.Application.Catalog.DTOs;

public enum ProductImageVariant
{
    Thumbnail,
    Pos,
    Preview
}

public record ProductImageResultDto(
    string ThumbnailUrl,
    string PosUrl,
    string PreviewUrl
);

public record MigrateBase64ImagesResultDto(
    int TotalScanned,
    int MigratedCount,
    int SkippedCount,
    int FailedCount,
    List<string> Errors
);
