using System.Text;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;
using Pos.Api.Middleware;
using Pos.Application.Common.Interfaces;
using Pos.Application.Common.Security;
using Pos.Infrastructure;
using Pos.Infrastructure.Persistence;
using Serilog;
using Serilog.Sinks.InMemory;

var builder = WebApplication.CreateBuilder(args);

// Configure Serilog (File + Console only — InMemory sink desactivado tras eliminar Dashboard Serilog externo)
Log.Logger = new LoggerConfiguration()
    .ReadFrom.Configuration(builder.Configuration)
    .Enrich.FromLogContext()
    .WriteTo.Console()
    .WriteTo.File(
        path: "logs/auditoria-.log",
        rollingInterval: RollingInterval.Day,
        outputTemplate: "{Timestamp:yyyy-MM-dd HH:mm:ss.fff zzz} [{Level:u3}] {Message:lj}{NewLine}{Exception}")
    .CreateLogger();

builder.Host.UseSerilog();

// Add services to the container
builder.Services.AddControllers().AddJsonOptions(options =>
{
    options.JsonSerializerOptions.Converters.Add(new UtcDateTimeJsonConverter());
});
builder.Services.AddEndpointsApiExplorer();

// Swagger with JWT Security Definition
builder.Services.AddSwaggerGen(c =>
{
    c.SwaggerDoc("v1", new OpenApiInfo { Title = "WPC Bajio POS API", Version = "v1" });

    c.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
    {
        Description = "JWT Authorization header usando el esquema Bearer. Ejemplo: \"Authorization: Bearer {token}\"",
        Name = "Authorization",
        In = ParameterLocation.Header,
        Type = SecuritySchemeType.Http,
        Scheme = "Bearer"
    });

    c.AddSecurityRequirement(new OpenApiSecurityRequirement
    {
        {
            new OpenApiSecurityScheme
            {
                Reference = new OpenApiReference
                {
                    Type = ReferenceType.SecurityScheme,
                    Id = "Bearer"
                }
            },
            Array.Empty<string>()
        }
    });
});

// Infrastructure & Services DI
builder.Services.AddInfrastructureServices(builder.Configuration);

// JWT Authentication Setup
var jwtSecret = builder.Configuration["JwtSettings:Secret"] ?? "LambrinPosSuperSecretKey_MustBeLongerThan32BytesForSecurity!";
builder.Services.AddAuthentication(options =>
{
    options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
    options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
})
.AddJwtBearer(options =>
{
    options.RequireHttpsMetadata = false;
    options.SaveToken = true;
    options.TokenValidationParameters = new TokenValidationParameters
    {
        ValidateIssuerSigningKey = true,
        IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtSecret)),
        ValidateIssuer = true,
        ValidIssuer = builder.Configuration["JwtSettings:Issuer"] ?? "LambrinPosApi",
        ValidateAudience = true,
        ValidAudience = builder.Configuration["JwtSettings:Audience"] ?? "LambrinPosApp",
        ValidateLifetime = true,
        ClockSkew = TimeSpan.Zero
    };
});

builder.Services.AddAuthorization(options =>
{
    foreach (var permission in PermissionCodes.All)
    {
        options.AddPolicy(permission, policy =>
            policy.RequireClaim(PermissionCodes.ClaimType, permission));
    }

    var cashPermissions = new HashSet<string>(StringComparer.OrdinalIgnoreCase)
    {
        PermissionCodes.Cash.Open,
        PermissionCodes.Cash.Close,
        PermissionCodes.Cash.ZReport,
        PermissionCodes.Cash.Withdrawal,
        PermissionCodes.Cash.Deposit
    };
    options.AddPolicy(AuthorizationPolicyNames.CashShiftRead, policy =>
        policy.RequireAssertion(context => context.User
            .FindAll(PermissionCodes.ClaimType)
            .Any(claim => cashPermissions.Contains(claim.Value))));

    var salesPermissions = new HashSet<string>(StringComparer.OrdinalIgnoreCase)
    {
        PermissionCodes.Sales.Process,
        PermissionCodes.Sales.History
    };
    options.AddPolicy(AuthorizationPolicyNames.SalesRead, policy =>
        policy.RequireAssertion(context => context.User
            .FindAll(PermissionCodes.ClaimType)
            .Any(claim => salesPermissions.Contains(claim.Value))));
});

// CORS for React Frontend
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowFrontend", policy =>
    {
        policy.WithOrigins("http://localhost:5173", "http://localhost:3000")
              .AllowAnyHeader()
              .AllowAnyMethod()
              .AllowCredentials();
    });
});

var app = builder.Build();

// Apply versioned migrations, validate the schema and seed only when required.
using (var scope = app.Services.CreateScope())
{
    var context = scope.ServiceProvider.GetRequiredService<PosDbContext>();
    var passwordHasher = scope.ServiceProvider.GetRequiredService<IPasswordHasherService>();
    try
    {
        if (context.Database.IsRelational())
        {
            await context.Database.MigrateAsync();
        }
        else
        {
            await context.Database.EnsureCreatedAsync();
        }

        // Schema validation check (triggers exception if any new column is missing in SQL Server AAM)
        _ = await context.Users.FirstOrDefaultAsync(u => u.NombreUsuario == "admin");
        _ = await context.Products.Select(p => new {
            p.ImagenUrl,
            p.PiezasPorCaja,
            p.CoberturaM2Caja,
            p.LargoCm,
            p.AltoCm,
            p.AnchoCm,
            p.CantidadInventarioInicial
        }).FirstOrDefaultAsync();
        _ = await context.InventoryMovements
            .Select(m => m.EvidenceImageUrl)
            .FirstOrDefaultAsync();

        await DbInitializer.SeedAsync(context, passwordHasher);
    }
    catch (Exception ex)
    {
        app.Logger.LogCritical(ex, "No fue posible migrar o validar PosLambrinDb. La base de datos se conservó sin recrearla.");
        throw;
    }
}

// Configure HTTP pipeline
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI(c => c.SwaggerEndpoint("/swagger/v1/swagger.json", "WPC Bajio POS API v1"));
}

// Serilog UI Dashboard Endpoint & Basic Auth Middleware (administrador / Aaron096)
app.UseMiddleware<SerilogAuthMiddleware>();
app.UseMiddleware<AuditMiddleware>();
app.UseHttpsRedirection();
app.UseCors("AllowFrontend");
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();

app.Run();

public partial class Program { }

public class UtcDateTimeJsonConverter : System.Text.Json.Serialization.JsonConverter<DateTime>
{
    public override DateTime Read(ref System.Text.Json.Utf8JsonReader reader, Type typeToConvert, System.Text.Json.JsonSerializerOptions options)
    {
        var str = reader.GetString();
        if (string.IsNullOrWhiteSpace(str)) return DateTime.MinValue;
        return DateTime.Parse(str, null, System.Globalization.DateTimeStyles.AdjustToUniversal).ToUniversalTime();
    }

    public override void Write(System.Text.Json.Utf8JsonWriter writer, DateTime value, System.Text.Json.JsonSerializerOptions options)
    {
        var utc = DateTime.SpecifyKind(value, DateTimeKind.Utc);
        writer.WriteStringValue(utc.ToString("yyyy-MM-ddTHH:mm:ss.fffZ"));
    }
}
