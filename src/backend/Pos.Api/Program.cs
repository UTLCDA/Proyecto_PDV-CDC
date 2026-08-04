using System.Text;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;
using Pos.Api.Middleware;
using Pos.Application.Common.Interfaces;
using Pos.Infrastructure;
using Pos.Infrastructure.Persistence;
using Serilog;
using Serilog.Sinks.InMemory;

var builder = WebApplication.CreateBuilder(args);

// Configure Serilog Dual-Logging (File + Console + InMemory for Serilog UI)
Log.Logger = new LoggerConfiguration()
    .ReadFrom.Configuration(builder.Configuration)
    .Enrich.FromLogContext()
    .WriteTo.Console()
    .WriteTo.InMemory()
    .WriteTo.File(
        path: "logs/auditoria-.log",
        rollingInterval: RollingInterval.Day,
        outputTemplate: "{Timestamp:yyyy-MM-dd HH:mm:ss.fff zzz} [{Level:u3}] {Message:lj}{NewLine}{Exception}")
    .CreateLogger();

builder.Host.UseSerilog();

// Add services to the container
builder.Services.AddControllers();
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

// Seed Database with automatic schema validation
using (var scope = app.Services.CreateScope())
{
    var context = scope.ServiceProvider.GetRequiredService<PosDbContext>();
    var passwordHasher = scope.ServiceProvider.GetRequiredService<IPasswordHasherService>();
    try
    {
        await context.Database.EnsureCreatedAsync();

        // Schema validation check (triggers exception if columns are in English)
        _ = await context.Users.FirstOrDefaultAsync(u => u.NombreUsuario == "admin");

        await DbInitializer.SeedAsync(context, passwordHasher);
    }
    catch (Exception ex)
    {
        Console.WriteLine($"⚠️ Se detectó una versión previa del esquema de BD en SQL Server AAM ({ex.Message}). Recreando base de datos PosLambrinDb con el esquema en Español...");
        try
        {
            await context.Database.EnsureDeletedAsync();
            await context.Database.EnsureCreatedAsync();
            await DbInitializer.SeedAsync(context, passwordHasher);
            Console.WriteLine("✅ Base de datos PosLambrinDb en SQL Server AAM recreada e inicializada con éxito.");
        }
        catch (Exception innerEx)
        {
            Console.WriteLine($"Error al recrear base de datos: {innerEx.Message}");
        }
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
