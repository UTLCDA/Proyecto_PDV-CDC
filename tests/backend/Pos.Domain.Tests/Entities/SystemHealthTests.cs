using Pos.Domain.Entities;
using Pos.Domain.Enums;
using Xunit;

namespace Pos.Domain.Tests.Entities;

public class SystemHealthTests
{
    [Fact]
    public void IsOperational_ShouldReturnTrue_WhenStatusIsOperational()
    {
        // Arrange
        var health = new SystemHealth
        {
            Status = SystemStatus.Operational
        };

        // Act
        var result = health.IsOperational();

        // Assert
        Assert.True(result);
    }
}
