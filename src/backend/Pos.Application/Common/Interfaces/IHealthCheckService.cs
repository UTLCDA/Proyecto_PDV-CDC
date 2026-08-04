using Pos.Domain.Entidades;

namespace Pos.Application.Common.Interfaces;

public interface IHealthCheckService
{
    Task<SaludSistema> CheckHealthAsync(CancellationToken cancellationToken = default);
}
