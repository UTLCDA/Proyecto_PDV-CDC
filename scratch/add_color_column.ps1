$connStr = "Server=localhost;Database=PosLambrinDb;User Id=wpcadminaam;Password=Aaron2804#;TrustServerCertificate=True;"
$conn = New-Object System.Data.SqlClient.SqlConnection($connStr)
$conn.Open()
$cmd = $conn.CreateCommand()
$cmd.CommandText = "IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'Products' AND COLUMN_NAME = 'Color') ALTER TABLE Products ADD Color NVARCHAR(100) NOT NULL DEFAULT '';"
$cmd.ExecuteNonQuery()
$conn.Close()
Write-Host "SQL Server Products Color column added successfully!"
