using Pos.Domain.Entidades;

namespace Pos.Application.Common.Interfaces;

public interface IJwtTokenGenerator
{
    (string Token, DateTime ExpiresAtUtc) GenerateAccessToken(Usuario user, IEnumerable<string> roles, IEnumerable<string> permissions);
    string GenerateRefreshToken();
}
