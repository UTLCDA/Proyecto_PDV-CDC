using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Pos.Infrastructure.Persistence.Migrations;

public partial class AddInventoryMovementEvidenceImage : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.Sql(
            """
            IF COL_LENGTH('InventoryMovements', 'EvidenceImageUrl') IS NULL
            BEGIN
                ALTER TABLE [InventoryMovements]
                ADD [EvidenceImageUrl] nvarchar(max) NOT NULL
                    CONSTRAINT [DF_InventoryMovements_EvidenceImageUrl] DEFAULT N'';
            END
            """);
    }

    protected override void Down(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.Sql(
            """
            IF COL_LENGTH('InventoryMovements', 'EvidenceImageUrl') IS NOT NULL
            BEGIN
                IF OBJECT_ID(N'DF_InventoryMovements_EvidenceImageUrl', N'D') IS NOT NULL
                BEGIN
                    ALTER TABLE [InventoryMovements]
                    DROP CONSTRAINT [DF_InventoryMovements_EvidenceImageUrl];
                END
                ALTER TABLE [InventoryMovements]
                DROP COLUMN [EvidenceImageUrl];
            END
            """);
    }
}
