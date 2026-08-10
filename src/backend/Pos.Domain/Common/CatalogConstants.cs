namespace Pos.Domain.Common;

public static class ProductUnitMeasures
{
    public const string Piece = "Pza";
    public const string SquareMeter = "M2";
    public const string LinearMeter = "ML";
    public const string Box = "Caja";
    public const string Kilogram = "Kilo";
    public const string Bag = "Bolsa";
    public const string Tube = "Tubo";
    public const string Set = "Juego";

    public static IReadOnlyCollection<string> All { get; } =
        [Piece, SquareMeter, LinearMeter, Box, Kilogram, Bag, Tube, Set];
}
