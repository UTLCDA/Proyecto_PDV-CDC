using System.Globalization;

namespace Pos.Domain.Common;

public static class ReceiptReferences
{
    public const string Prefix = "RECIBO-";

    public static string Create(int idVenta)
    {
        if (idVenta <= 0)
        {
            throw new ArgumentOutOfRangeException(nameof(idVenta), "IdVenta debe ser mayor a cero.");
        }

        return Prefix + idVenta.ToString(CultureInfo.InvariantCulture);
    }

    public static bool TryParseIdVenta(string? value, out int idVenta)
    {
        idVenta = 0;
        if (string.IsNullOrWhiteSpace(value))
        {
            return false;
        }

        var normalized = value.Trim();
        if (normalized.StartsWith(Prefix, StringComparison.OrdinalIgnoreCase))
        {
            normalized = normalized[Prefix.Length..];
        }

        return int.TryParse(normalized, NumberStyles.None, CultureInfo.InvariantCulture, out idVenta) && idVenta > 0;
    }
}
