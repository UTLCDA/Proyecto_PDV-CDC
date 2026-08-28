using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;

namespace Pos.Infrastructure.Persistence;

public class PosDbContextFactory : IDesignTimeDbContextFactory<PosDbContext>
{
    public PosDbContext CreateDbContext(string[] args)
    {
        var connectionString = Environment.GetEnvironmentVariable("POS_DESIGN_TIME_CONNECTION_STRING")
            ?? "Server=.;Database=PosLambrinDb;User Id=wpcadminaam;Password=Aaron2804#;TrustServerCertificate=True;Encrypt=False;";

        var optionsBuilder = new DbContextOptionsBuilder<PosDbContext>();
        optionsBuilder.UseSqlServer(connectionString);

        return new PosDbContext(optionsBuilder.Options);
    }
}
