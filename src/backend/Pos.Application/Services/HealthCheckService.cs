using Pos.Application.Common.Interfaces;
using Pos.Domain.Entidades;

namespace Pos.Application.Services;

public class HealthCheckService : IHealthCheckService
{
    public Task<SaludSistema> CheckHealthAsync(CancellationToken cancellationToken = default)
    {
        return Task.FromResult(new SaludSistema
        {
            Estado = "Operativo",
            NombreServicio = "WPC Bajío POS API",
            TimestampUtc = DateTime.UtcNow
        });
    }
}
