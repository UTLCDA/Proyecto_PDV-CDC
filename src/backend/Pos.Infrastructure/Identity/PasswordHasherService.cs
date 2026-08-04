using System.Security.Cryptography;
using Microsoft.AspNetCore.Cryptography.KeyDerivation;
using Pos.Application.Common.Interfaces;

namespace Pos.Infrastructure.Identity;

public class PasswordHasherService : IPasswordHasherService
{
    public string HashPassword(string password)
    {
        byte[] salt = RandomNumberGenerator.GetBytes(128 / 8);

        string hashed = Convert.ToBase64String(KeyDerivation.Pbkdf2(
            password: password,
            salt: salt,
            prf: KeyDerivationPrf.HMACSHA256,
            iterationCount: 100000,
            numBytesRequested: 256 / 8));

        return $"{Convert.ToBase64String(salt)}.{hashed}";
    }

    public bool VerifyPassword(string hashedPassword, string providedPassword)
    {
        if (string.IsNullOrWhiteSpace(hashedPassword)) return false;

        var parts = hashedPassword.Split('.');
        if (parts.Length != 2) return false;

        byte[] salt = Convert.FromBase64String(parts[0]);
        string hash = parts[1];

        string newHash = Convert.ToBase64String(KeyDerivation.Pbkdf2(
            password: providedPassword,
            salt: salt,
            prf: KeyDerivationPrf.HMACSHA256,
            iterationCount: 100000,
            numBytesRequested: 256 / 8));

        return CryptographicOperations.FixedTimeEquals(
            Convert.FromBase64String(hash),
            Convert.FromBase64String(newHash));
    }
}
