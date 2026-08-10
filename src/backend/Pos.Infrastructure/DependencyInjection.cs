using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Diagnostics;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Pos.Application.Auth.Services;
using Pos.Application.Catalog.Services;
using Pos.Application.CashShift.Services;
using Pos.Application.Commercial.Services;
using Pos.Application.Common.Interfaces;
using Pos.Application.Inventory.Services;
using Pos.Application.Reporting.Services;
using Pos.Application.Sales.Services;
using Pos.Application.Services;
using Pos.Application.Users.Services;
using Pos.Infrastructure.Identity;
using Pos.Infrastructure.Persistence;
using Pos.Infrastructure.Services;

namespace Pos.Infrastructure;

public static class DependencyInjection
{
    public static IServiceCollection AddInfrastructureServices(this IServiceCollection services, IConfiguration configuration)
    {
        var connectionString = configuration.GetConnectionString("DefaultConnection");

        services.AddDbContext<PosDbContext>(options =>
        {
            options.ConfigureWarnings(warnings => warnings.Ignore(RelationalEventId.PendingModelChangesWarning));

            if (!string.IsNullOrEmpty(connectionString) && !connectionString.Contains("(localdb)") && !connectionString.Contains("InMemory"))
            {
                options.UseSqlServer(connectionString, sqlOptions => sqlOptions.EnableRetryOnFailure());
            }
            else
            {
                options.UseInMemoryDatabase("PosLambrinInMemoryDb");
            }
        });

        services.AddScoped<IPasswordHasherService, PasswordHasherService>();
        services.AddScoped<IJwtTokenGenerator, JwtTokenGenerator>();
        services.AddScoped<IAuditLogService, AuditLogService>();
        services.AddScoped<IAuthApplicationService, AuthApplicationService>();
        services.AddScoped<ICatalogApplicationService, CatalogApplicationService>();
        services.AddScoped<IInventoryApplicationService, InventoryApplicationService>();
        services.AddScoped<ISaleApplicationService, SaleApplicationService>();
        services.AddScoped<ICommercialOperationsService, CommercialOperationsService>();
        services.AddScoped<ICashShiftApplicationService, CashShiftApplicationService>();
        services.AddScoped<IReportingApplicationService, ReportingApplicationService>();
        services.AddScoped<IUserApplicationService, UserApplicationService>();
        services.AddScoped<IRoleApplicationService, RoleApplicationService>();
        services.AddScoped<IHealthCheckService, HealthCheckService>();

        return services;
    }
}
