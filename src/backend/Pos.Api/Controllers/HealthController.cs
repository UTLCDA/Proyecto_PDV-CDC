using Microsoft.AspNetCore.Mvc;
using Pos.Application.Common.Interfaces;
using Pos.Domain.Entidades;

namespace Pos.Api.Controllers;

[ApiController]
[Route("api/v1/[controller]")]
public class HealthController : ControllerBase
{
    private readonly IHealthCheckService _healthCheckService;

    public HealthController(IHealthCheckService healthCheckService)
    {
        _healthCheckService = healthCheckService;
    }

    [HttpGet]
    public async Task<ActionResult<SaludSistema>> GetHealthStatus(CancellationToken cancellationToken)
    {
        var status = await _healthCheckService.CheckHealthAsync(cancellationToken);
        return Ok(status);
    }
}
