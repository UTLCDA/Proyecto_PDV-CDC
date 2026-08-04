using Pos.Domain.Entities;
using Xunit;

namespace Pos.Domain.Tests.Entities;

public class UserDomainTests
{
    [Fact]
    public void NewUser_ShouldHaveSecurityStampAndActiveStatus()
    {
        // Act
        var user = new User
        {
            Username = "seller1",
            Email = "vendedor@lambrin.com"
        };

        // Assert
        Assert.NotNull(user.SecurityStamp);
        Assert.NotEmpty(user.SecurityStamp);
        Assert.True(user.IsActive);
        Assert.NotEqual(Guid.Empty, user.Id);
    }
}
