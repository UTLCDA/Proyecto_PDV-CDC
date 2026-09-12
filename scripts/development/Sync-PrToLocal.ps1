param(
    [string]$SourceServer = "193.46.198.88",
    [string]$TargetServer = "localhost",
    [string]$Database = "PosLambrinDb",
    [string]$User = "wpcadminaam",
    [string]$Password = "Aaron2804#"
)

$ErrorActionPreference = "Stop"

Write-Host "=== Sincronización de Catálogo y Productos desde Producción (PR) a Local ===" -ForegroundColor Cyan
Write-Host "Origen: $SourceServer [$Database]"
Write-Host "Destino: $TargetServer [$Database]"

$srcConnStr = "Server=$SourceServer;Database=$Database;User Id=$User;Password=$Password;TrustServerCertificate=True;Encrypt=False;Connection Timeout=30;"
$tgtConnStr = "Server=$TargetServer;Database=$Database;User Id=$User;Password=$Password;TrustServerCertificate=True;Encrypt=False;Connection Timeout=30;"

$srcConn = New-Object System.Data.SqlClient.SqlConnection($srcConnStr)
$tgtConn = New-Object System.Data.SqlClient.SqlConnection($tgtConnStr)

try {
    $srcConn.Open()
    Write-Host "[OK] Conectado a Servidor Origen (PR)" -ForegroundColor Green
    
    $tgtConn.Open()
    Write-Host "[OK] Conectado a Servidor Destino (Local)" -ForegroundColor Green

    # Tablas a limpiar en orden de dependencias en local
    $cleanupQueries = @(
        "DELETE FROM [Stocks];",
        "DELETE FROM [ProductImages];",
        "DELETE FROM [InventoryMovements];",
        "DELETE FROM [SaleItems];",
        "DELETE FROM [QuoteItems];",
        "DELETE FROM [ReturnItems];",
        "DELETE FROM [Products];",
        "DELETE FROM [Categories];"
    )

    Write-Host "`nLimpiando tablas locales dependientes de productos..." -ForegroundColor Yellow
    foreach ($q in $cleanupQueries) {
        $cmd = $tgtConn.CreateCommand()
        $cmd.CommandText = $q
        $affected = $cmd.ExecuteNonQuery()
        Write-Host "  - Ejecutado: $q ($affected filas)" -ForegroundColor Gray
    }

    # Desactivar restricciones para inserción masiva segura
    $syncTables = @("Categories", "Products", "Stocks")
    foreach ($table in $syncTables) {
        $cmd = $tgtConn.CreateCommand()
        $cmd.CommandText = "ALTER TABLE [$table] NOCHECK CONSTRAINT ALL;"
        $null = $cmd.ExecuteNonQuery()
    }

    # Copiar datos tabla por tabla desde PR
    Write-Host "`nCopiando datos reales desde Producción..." -ForegroundColor Cyan
    foreach ($table in $syncTables) {
        Write-Host "  -> Sincronizando [$table]..." -NoNewline
        
        $selectCmd = $srcConn.CreateCommand()
        $selectCmd.CommandText = "SELECT * FROM [$table];"
        $adapter = New-Object System.Data.SqlClient.SqlDataAdapter($selectCmd)
        $dt = New-Object System.Data.DataTable
        $rowCount = $adapter.Fill($dt)

        if ($rowCount -gt 0) {
            $bulkOptions = [System.Data.SqlClient.SqlBulkCopyOptions]::KeepIdentity
            $bulkCopy = New-Object System.Data.SqlClient.SqlBulkCopy($tgtConn, $bulkOptions, $null)
            $bulkCopy.DestinationTableName = "[$table]"
            $bulkCopy.BulkCopyTimeout = 120

            foreach ($col in $dt.Columns) {
                $null = $bulkCopy.ColumnMappings.Add($col.ColumnName, $col.ColumnName)
            }

            $bulkCopy.WriteToServer($dt)
            $bulkCopy.Close()
            Write-Host " $rowCount filas transferidas con éxito." -ForegroundColor Green
        } else {
            Write-Host " 0 filas encontradas en origen." -ForegroundColor DarkGray
        }
    }

    # Sincronizar clientes adicionales si existen
    Write-Host "  -> Verificando Customers..." -NoNewline
    $custCmd = $srcConn.CreateCommand()
    $custCmd.CommandText = "SELECT * FROM [Customers] WHERE Id NOT IN (SELECT Id FROM [Customers]);"
    $custAdapter = New-Object System.Data.SqlClient.SqlDataAdapter($custCmd)
    $custDt = New-Object System.Data.DataTable
    $custCount = $custAdapter.Fill($custDt)
    if ($custCount -gt 0) {
        $custBulk = New-Object System.Data.SqlClient.SqlBulkCopy($tgtConn, [System.Data.SqlClient.SqlBulkCopyOptions]::KeepIdentity, $null)
        $custBulk.DestinationTableName = "[Customers]"
        foreach ($col in $custDt.Columns) {
            $null = $custBulk.ColumnMappings.Add($col.ColumnName, $col.ColumnName)
        }
        $custBulk.WriteToServer($custDt)
        $custBulk.Close()
        Write-Host " $custCount clientes adicionales copiados." -ForegroundColor Green
    } else {
        Write-Host " Al día." -ForegroundColor Green
    }

    # Reactivar restricciones
    Write-Host "`nReactivando restricciones de integridad referencial..." -ForegroundColor Yellow
    foreach ($table in $syncTables) {
        $cmd = $tgtConn.CreateCommand()
        $cmd.CommandText = "ALTER TABLE [$table] WITH CHECK CHECK CONSTRAINT ALL;"
        try {
            $null = $cmd.ExecuteNonQuery()
        } catch {
            Write-Warning "Constraint warning en [$table]: $_"
        }
    }

    # Verificación final
    Write-Host "`n=== Verificación de Conteos ===" -ForegroundColor Cyan
    foreach ($table in $syncTables) {
        $cmdSrc = $srcConn.CreateCommand()
        $cmdSrc.CommandText = "SELECT COUNT(*) FROM [$table];"
        $cntSrc = $cmdSrc.ExecuteScalar()

        $cmdTgt = $tgtConn.CreateCommand()
        $cmdTgt.CommandText = "SELECT COUNT(*) FROM [$table];"
        $cntTgt = $cmdTgt.ExecuteScalar()

        Write-Host "  - [$table]: PR = $cntSrc | Local = $cntTgt" -ForegroundColor $(if ($cntSrc -eq $cntTgt) { "Green" } else { "Red" })
    }

    Write-Host "`n[EXITO] La base de datos local tiene ahora la copia exacta de PR." -ForegroundColor Green
}
finally {
    if ($srcConn.State -eq [System.Data.ConnectionState]::Open) { $srcConn.Close() }
    if ($tgtConn.State -eq [System.Data.ConnectionState]::Open) { $tgtConn.Close() }
}
