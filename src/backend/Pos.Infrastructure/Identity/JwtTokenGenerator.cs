using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using Microsoft.Extensions.Configuration;
using Microsoft.IdentityModel.Tokens;
using Pos.Application.Common.Interfaces;
using Pos.Domain.Entidades;

namespace Pos.Infrastructure.Identity;

public class JwtTokenGenerator : IJwtTokenGenerator
{
    private readonly IConfiguration _configuration;

    public JwtTokenGenerator(IConfiguration configuration)
    {
        _configuration = configuration;
    }

    public (string Token, DateTime ExpiresAtUtc) GenerateAccessToken(Usuario user, IEnumerable<string> roles, IEnumerable<string> permissions)
    {
        var jwtSecret = _configuration["JwtSettings:Secret"] ?? "LambrinPosSuperSecretKey_MustBeLongerThan32BytesForSecurity!";
        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtSecret));
        var credentials = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

        // Extend token lifetime to 24 hours for seamless work & testing sessions
        var expiresAtUtc = DateTime.UtcNow.AddHours(24);

        var claims = new List<Claim>
        {
            new(JwtRegisteredClaimNames.Sub, user.Id.ToString()),
            new(JwtRegisteredClaimNames.Email, user.Email),
            new(JwtRegisteredClaimNames.UniqueName, user.NombreUsuario),
            new(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString())
        };

        foreach (var role in roles)
        {
            claims.Add(new Claim(ClaimTypes.Role, role));
        }

        foreach (var permission in permissions)
        {
            claims.Add(new Claim("permission", permission));
        }

        var tokenDescriptor = new SecurityTokenDescriptor
        {
            Subject = new ClaimsIdentity(claims),
            Expires = expiresAtUtc,
            SigningCredentials = credentials,
            Issuer = _configuration["JwtSettings:Issuer"] ?? "LambrinPosApi",
            Audience = _configuration["JwtSettings:Audience"] ?? "LambrinPosApp"
        };

        var token = new JwtSecurityTokenHandler().CreateToken(tokenDescriptor);
        return (new JwtSecurityTokenHandler().WriteToken(token), expiresAtUtc);
    }

    public string GenerateRefreshToken()
    {
        var randomBytes = new byte[64];
        using var rng = RandomNumberGenerator.Create();
        rng.GetBytes(randomBytes);
        return Convert.ToBase64String(randomBytes);
    }
}
