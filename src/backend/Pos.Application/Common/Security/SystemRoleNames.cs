namespace Pos.Application.Common.Security;

public static class SystemRoleNames
{
    public const string Administrator = "Administrador";
    public const string Cashier = "Cajero";

    public static bool IsSystemRole(string roleName) =>
        string.Equals(roleName, Administrator, StringComparison.OrdinalIgnoreCase) ||
        string.Equals(roleName, Cashier, StringComparison.OrdinalIgnoreCase);
}
