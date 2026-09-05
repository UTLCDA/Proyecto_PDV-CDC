SET ANSI_NULLS ON;
GO
SET QUOTED_IDENTIFIER ON;
GO

CREATE TABLE [Categories] (
    [Id] uniqueidentifier NOT NULL,
    [Nombre] nvarchar(120) NOT NULL,
    [Slug] nvarchar(140) NOT NULL,
    [Descripcion] nvarchar(max) NOT NULL,
    [CategoriaPadreId] uniqueidentifier NULL,
    [FechaCreacionUtc] datetime2 NOT NULL,
    [FechaActualizacionUtc] datetime2 NULL,
    [EstaActivo] bit NOT NULL,
    CONSTRAINT [PK_Categories] PRIMARY KEY ([Id]),
    CONSTRAINT [FK_Categories_Categories_CategoriaPadreId] FOREIGN KEY ([CategoriaPadreId]) REFERENCES [Categories] ([Id])
);
GO


CREATE TABLE [Customers] (
    [Id] uniqueidentifier NOT NULL,
    [Nombre] nvarchar(max) NOT NULL,
    [Apellido] nvarchar(max) NOT NULL,
    [NombreEmpresa] nvarchar(max) NULL,
    [Rfc] nvarchar(13) NULL,
    [Email] nvarchar(256) NOT NULL,
    [Telefono] nvarchar(max) NOT NULL,
    [Direccion] nvarchar(max) NOT NULL,
    [Ciudad] nvarchar(max) NOT NULL,
    [Estado] nvarchar(max) NOT NULL,
    [CodigoPostal] nvarchar(max) NOT NULL,
    [TipoCliente] nvarchar(max) NOT NULL,
    [PorcentajeDescuentoEspecial] decimal(18,2) NOT NULL,
    [LimiteCajasDiarias] decimal(18,2) NOT NULL DEFAULT 0,
    [Notas] nvarchar(max) NOT NULL,
    [FechaCreacionUtc] datetime2 NOT NULL,
    [FechaActualizacionUtc] datetime2 NULL,
    [EstaActivo] bit NOT NULL,
    CONSTRAINT [PK_Customers] PRIMARY KEY ([Id])
);
GO


CREATE TABLE [DocumentTemplates] (
    [Id] uniqueidentifier NOT NULL,
    [Titulo] nvarchar(max) NOT NULL,
    [Categoria] nvarchar(max) NOT NULL,
    [ContenidoHtmlPlantilla] nvarchar(max) NOT NULL,
    [FechaCreacionUtc] datetime2 NOT NULL,
    [FechaActualizacionUtc] datetime2 NULL,
    [EstaActivo] bit NOT NULL,
    CONSTRAINT [PK_DocumentTemplates] PRIMARY KEY ([Id])
);
GO


CREATE TABLE [Employees] (
    [Id] uniqueidentifier NOT NULL,
    [Nombre] nvarchar(max) NOT NULL,
    [Apellido] nvarchar(max) NOT NULL,
    [Email] nvarchar(max) NOT NULL,
    [Puesto] nvarchar(max) NOT NULL,
    [FechaCreacionUtc] datetime2 NOT NULL,
    [FechaActualizacionUtc] datetime2 NULL,
    [EstaActivo] bit NOT NULL,
    CONSTRAINT [PK_Employees] PRIMARY KEY ([Id])
);
GO


CREATE TABLE [HealthStatuses] (
    [Id] uniqueidentifier NOT NULL,
    [Estado] nvarchar(max) NOT NULL,
    [NombreServicio] nvarchar(max) NOT NULL,
    [TimestampUtc] datetime2 NOT NULL,
    CONSTRAINT [PK_HealthStatuses] PRIMARY KEY ([Id])
);
GO


CREATE TABLE [Permissions] (
    [Id] uniqueidentifier NOT NULL,
    [Modulo] nvarchar(max) NOT NULL,
    [Accion] nvarchar(max) NOT NULL,
    [Descripcion] nvarchar(max) NOT NULL,
    [FechaCreacionUtc] datetime2 NOT NULL,
    [FechaActualizacionUtc] datetime2 NULL,
    [EstaActivo] bit NOT NULL,
    CONSTRAINT [PK_Permissions] PRIMARY KEY ([Id])
);
GO


CREATE TABLE [Roles] (
    [Id] uniqueidentifier NOT NULL,
    [Nombre] nvarchar(max) NOT NULL,
    [Descripcion] nvarchar(max) NOT NULL,
    [FechaCreacionUtc] datetime2 NOT NULL,
    [FechaActualizacionUtc] datetime2 NULL,
    [EstaActivo] bit NOT NULL,
    CONSTRAINT [PK_Roles] PRIMARY KEY ([Id])
);
GO


CREATE TABLE [Products] (
    [Id] uniqueidentifier NOT NULL,
    [Sku] nvarchar(64) NOT NULL,
    [Barcode] nvarchar(64) NOT NULL,
    [Nombre] nvarchar(200) NOT NULL,
    [Descripcion] nvarchar(max) NOT NULL,
    [CategoriaId] uniqueidentifier NOT NULL,
    [PrecioUnitario] decimal(18,2) NOT NULL,
    [CostoUnitario] decimal(18,2) NOT NULL DEFAULT 0,
    [PrecioMayoreo] decimal(18,2) NOT NULL,
    [CantidadMinimaMayoreo] decimal(18,2) NOT NULL,
    [UnidadMedida] nvarchar(16) NOT NULL,
    [CoberturaPorUnidadM2] decimal(18,2) NOT NULL,
    [ImagenUrl] nvarchar(max) NOT NULL,
    [PiezasPorCaja] int NOT NULL,
    [CoberturaM2Caja] decimal(18,2) NOT NULL,
    [LargoCm] decimal(18,2) NOT NULL,
    [AltoCm] decimal(18,2) NOT NULL,
    [AnchoCm] decimal(18,2) NOT NULL,
    [CantidadInventarioInicial] decimal(18,2) NOT NULL,
    [AnchoMm] int NOT NULL,
    [LargoMm] int NOT NULL,
    [EspesorMm] int NOT NULL,
    [Material] nvarchar(100) NOT NULL,
    [Color] nvarchar(100) NOT NULL DEFAULT '',
    [SoloCotizacion] bit NOT NULL,
    [VisibleMasVendido] bit NOT NULL,
    [FechaCreacionUtc] datetime2 NOT NULL,
    [FechaActualizacionUtc] datetime2 NULL,
    [EstaActivo] bit NOT NULL,
    CONSTRAINT [PK_Products] PRIMARY KEY ([Id]),
    CONSTRAINT [FK_Products_Categories_CategoriaId] FOREIGN KEY ([CategoriaId]) REFERENCES [Categories] ([Id]) ON DELETE CASCADE
);
GO


CREATE TABLE [Users] (
    [Id] uniqueidentifier NOT NULL,
    [NombreUsuario] nvarchar(max) NOT NULL,
    [Email] nvarchar(max) NOT NULL,
    [PasswordHash] nvarchar(max) NOT NULL,
    [EmpleadoId] uniqueidentifier NULL,
    [FechaCreacionUtc] datetime2 NOT NULL,
    [FechaActualizacionUtc] datetime2 NULL,
    [EstaActivo] bit NOT NULL,
    CONSTRAINT [PK_Users] PRIMARY KEY ([Id]),
    CONSTRAINT [FK_Users_Employees_EmpleadoId] FOREIGN KEY ([EmpleadoId]) REFERENCES [Employees] ([Id])
);
GO


CREATE TABLE [RolePermissions] (
    [RolId] uniqueidentifier NOT NULL,
    [PermisoId] uniqueidentifier NOT NULL,
    CONSTRAINT [PK_RolePermissions] PRIMARY KEY ([RolId], [PermisoId]),
    CONSTRAINT [FK_RolePermissions_Permissions_PermisoId] FOREIGN KEY ([PermisoId]) REFERENCES [Permissions] ([Id]) ON DELETE CASCADE,
    CONSTRAINT [FK_RolePermissions_Roles_RolId] FOREIGN KEY ([RolId]) REFERENCES [Roles] ([Id]) ON DELETE CASCADE
);
GO


CREATE TABLE [ProductImages] (
    [Id] uniqueidentifier NOT NULL,
    [ProductoId] uniqueidentifier NOT NULL,
    [UrlImagen] nvarchar(max) NOT NULL,
    [EsPrincipal] bit NOT NULL,
    [FechaCreacionUtc] datetime2 NOT NULL,
    [FechaActualizacionUtc] datetime2 NULL,
    [EstaActivo] bit NOT NULL,
    CONSTRAINT [PK_ProductImages] PRIMARY KEY ([Id]),
    CONSTRAINT [FK_ProductImages_Products_ProductoId] FOREIGN KEY ([ProductoId]) REFERENCES [Products] ([Id]) ON DELETE CASCADE
);
GO


CREATE TABLE [Stocks] (
    [Id] uniqueidentifier NOT NULL,
    [ProductoId] uniqueidentifier NOT NULL,
    [CantidadDisponible] decimal(18,2) NOT NULL,
    [UmbralMinimoAlerta] decimal(18,2) NOT NULL,
    [CantidadReorden] decimal(18,2) NOT NULL,
    [Ubicacion] nvarchar(200) NOT NULL,
    [VersionFila] rowversion NOT NULL,
    [FechaCreacionUtc] datetime2 NOT NULL,
    [FechaActualizacionUtc] datetime2 NULL,
    [EstaActivo] bit NOT NULL,
    CONSTRAINT [PK_Stocks] PRIMARY KEY ([Id]),
    CONSTRAINT [FK_Stocks_Products_ProductoId] FOREIGN KEY ([ProductoId]) REFERENCES [Products] ([Id]) ON DELETE CASCADE
);
GO


CREATE TABLE [AuditLogs] (
    [Id] uniqueidentifier NOT NULL,
    [IdCorrelacion] nvarchar(100) NOT NULL,
    [UsuarioId] uniqueidentifier NULL,
    [Accion] nvarchar(100) NOT NULL,
    [NombreEntidad] nvarchar(max) NOT NULL,
    [EntidadId] nvarchar(max) NULL,
    [ValoresAnterioresJson] nvarchar(max) NULL,
    [ValoresNuevosJson] nvarchar(max) NULL,
    [DireccionIp] nvarchar(max) NOT NULL,
    [Motivo] nvarchar(max) NULL,
    [FechaCreacionUtc] datetime2 NOT NULL,
    [FechaActualizacionUtc] datetime2 NULL,
    [EstaActivo] bit NOT NULL,
    CONSTRAINT [PK_AuditLogs] PRIMARY KEY ([Id]),
    CONSTRAINT [FK_AuditLogs_Users_UsuarioId] FOREIGN KEY ([UsuarioId]) REFERENCES [Users] ([Id])
);
GO


CREATE TABLE [CashShifts] (
    [Id] uniqueidentifier NOT NULL,
    [NumeroTurno] nvarchar(64) NOT NULL,
    [UsuarioId] uniqueidentifier NOT NULL,
    [MontoApertura] decimal(18,2) NOT NULL,
    [TotalVentasEfectivo] decimal(18,2) NOT NULL,
    [TotalVentasTarjeta] decimal(18,2) NOT NULL,
    [TotalVentasTransferencia] decimal(18,2) NOT NULL,
    [TotalEntradas] decimal(18,2) NOT NULL,
    [TotalRetiros] decimal(18,2) NOT NULL,
    [MontoCierreEsperado] decimal(18,2) NOT NULL,
    [MontoCierreReal] decimal(18,2) NOT NULL,
    [MontoDiferencia] decimal(18,2) NOT NULL,
    [Estado] nvarchar(max) NOT NULL,
    [FechaAperturaUtc] datetime2 NOT NULL,
    [FechaCierreUtc] datetime2 NULL,
    [Notas] nvarchar(max) NOT NULL,
    [FechaCreacionUtc] datetime2 NOT NULL,
    [FechaActualizacionUtc] datetime2 NULL,
    [EstaActivo] bit NOT NULL,
    CONSTRAINT [PK_CashShifts] PRIMARY KEY ([Id]),
    CONSTRAINT [FK_CashShifts_Users_UsuarioId] FOREIGN KEY ([UsuarioId]) REFERENCES [Users] ([Id]) ON DELETE CASCADE
);
GO


CREATE TABLE [InventoryMovements] (
    [Id] uniqueidentifier NOT NULL,
    [ProductoId] uniqueidentifier NOT NULL,
    [IdVenta] int NULL,
    [TipoMovimiento] nvarchar(max) NOT NULL,
    [Cantidad] decimal(18,2) NOT NULL,
    [CantidadAnterior] decimal(18,2) NOT NULL,
    [CantidadNueva] decimal(18,2) NOT NULL,
    [Motivo] nvarchar(max) NOT NULL,
    [NumeroReferencia] nvarchar(max) NOT NULL,
    [EvidenceImageUrl] nvarchar(max) NOT NULL,
    [UsuarioId] uniqueidentifier NULL,
    [FechaCreacionUtc] datetime2 NOT NULL,
    [FechaActualizacionUtc] datetime2 NULL,
    [EstaActivo] bit NOT NULL,
    CONSTRAINT [PK_InventoryMovements] PRIMARY KEY ([Id]),
    CONSTRAINT [FK_InventoryMovements_Products_ProductoId] FOREIGN KEY ([ProductoId]) REFERENCES [Products] ([Id]) ON DELETE CASCADE,
    CONSTRAINT [FK_InventoryMovements_Users_UsuarioId] FOREIGN KEY ([UsuarioId]) REFERENCES [Users] ([Id])
);
GO


CREATE TABLE [Quotes] (
    [Id] uniqueidentifier NOT NULL,
    [NumeroCotizacion] nvarchar(64) NOT NULL,
    [ClienteId] uniqueidentifier NULL,
    [UsuarioId] uniqueidentifier NULL,
    [SubTotal] decimal(18,2) NOT NULL,
    [MontoDescuento] decimal(18,2) NOT NULL,
    [MontoIva] decimal(18,2) NOT NULL,
    [MontoTotal] decimal(18,2) NOT NULL,
    [FechaVigenciaUtc] datetime2 NOT NULL,
    [Estado] nvarchar(max) NOT NULL,
    [Notas] nvarchar(max) NOT NULL,
    [FechaCreacionUtc] datetime2 NOT NULL,
    [FechaActualizacionUtc] datetime2 NULL,
    [EstaActivo] bit NOT NULL,
    CONSTRAINT [PK_Quotes] PRIMARY KEY ([Id]),
    CONSTRAINT [FK_Quotes_Customers_ClienteId] FOREIGN KEY ([ClienteId]) REFERENCES [Customers] ([Id]),
    CONSTRAINT [FK_Quotes_Users_UsuarioId] FOREIGN KEY ([UsuarioId]) REFERENCES [Users] ([Id])
);
GO


CREATE TABLE [RefreshTokens] (
    [Id] uniqueidentifier NOT NULL,
    [UsuarioId] uniqueidentifier NOT NULL,
    [Token] nvarchar(max) NOT NULL,
    [FechaExpiracionUtc] datetime2 NOT NULL,
    [EsRevocado] bit NOT NULL,
    [FechaCreacionUtc] datetime2 NOT NULL,
    [FechaActualizacionUtc] datetime2 NULL,
    [EstaActivo] bit NOT NULL,
    CONSTRAINT [PK_RefreshTokens] PRIMARY KEY ([Id]),
    CONSTRAINT [FK_RefreshTokens_Users_UsuarioId] FOREIGN KEY ([UsuarioId]) REFERENCES [Users] ([Id]) ON DELETE CASCADE
);
GO


CREATE TABLE [Sales] (
    [Id] uniqueidentifier NOT NULL,
    [NumeroFolio] nvarchar(64) NOT NULL,
    [IdVenta] int NOT NULL IDENTITY,
    [ClienteId] uniqueidentifier NULL,
    [UsuarioId] uniqueidentifier NULL,
    [TipoPago] nvarchar(max) NOT NULL,
    [SubTotal] decimal(18,2) NOT NULL,
    [MontoDescuento] decimal(18,2) NOT NULL,
    [MontoIva] decimal(18,2) NOT NULL,
    [MontoTotal] decimal(18,2) NOT NULL,
    [MontoEfectivo] decimal(18,2) NOT NULL,
    [MontoTarjeta] decimal(18,2) NOT NULL,
    [MontoTransferencia] decimal(18,2) NOT NULL,
    [MontoAnticipo] decimal(18,2) NOT NULL,
    [SaldoPendiente] decimal(18,2) NOT NULL,
    [Estado] nvarchar(max) NOT NULL,
    [Notas] nvarchar(max) NOT NULL,
    [FechaCreacionUtc] datetime2 NOT NULL,
    [FechaActualizacionUtc] datetime2 NULL,
    [EstaActivo] bit NOT NULL,
    CONSTRAINT [PK_Sales] PRIMARY KEY ([Id]),
    CONSTRAINT [FK_Sales_Customers_ClienteId] FOREIGN KEY ([ClienteId]) REFERENCES [Customers] ([Id]),
    CONSTRAINT [FK_Sales_Users_UsuarioId] FOREIGN KEY ([UsuarioId]) REFERENCES [Users] ([Id])
);
GO


CREATE TABLE [UserRoles] (
    [UsuarioId] uniqueidentifier NOT NULL,
    [RolId] uniqueidentifier NOT NULL,
    CONSTRAINT [PK_UserRoles] PRIMARY KEY ([UsuarioId], [RolId]),
    CONSTRAINT [FK_UserRoles_Roles_RolId] FOREIGN KEY ([RolId]) REFERENCES [Roles] ([Id]) ON DELETE CASCADE,
    CONSTRAINT [FK_UserRoles_Users_UsuarioId] FOREIGN KEY ([UsuarioId]) REFERENCES [Users] ([Id]) ON DELETE CASCADE
);
GO


CREATE TABLE [CashTransactions] (
    [Id] uniqueidentifier NOT NULL,
    [TurnoCajaId] uniqueidentifier NOT NULL,
    [IdVenta] int NULL,
    [TipoTransaccion] nvarchar(max) NOT NULL,
    [Monto] decimal(18,2) NOT NULL,
    [Motivo] nvarchar(max) NOT NULL,
    [UsuarioId] uniqueidentifier NULL,
    [FechaCreacionUtc] datetime2 NOT NULL,
    [FechaActualizacionUtc] datetime2 NULL,
    [EstaActivo] bit NOT NULL,
    CONSTRAINT [PK_CashTransactions] PRIMARY KEY ([Id]),
    CONSTRAINT [FK_CashTransactions_CashShifts_TurnoCajaId] FOREIGN KEY ([TurnoCajaId]) REFERENCES [CashShifts] ([Id]) ON DELETE CASCADE,
    CONSTRAINT [FK_CashTransactions_Users_UsuarioId] FOREIGN KEY ([UsuarioId]) REFERENCES [Users] ([Id])
);
GO


CREATE TABLE [QuoteItems] (
    [Id] uniqueidentifier NOT NULL,
    [CotizacionId] uniqueidentifier NOT NULL,
    [ProductoId] uniqueidentifier NOT NULL,
    [Cantidad] decimal(18,2) NOT NULL,
    [PrecioUnitario] decimal(18,2) NOT NULL,
    [MontoDescuento] decimal(18,2) NOT NULL,
    [PrecioTotal] decimal(18,2) NOT NULL,
    [FechaCreacionUtc] datetime2 NOT NULL,
    [FechaActualizacionUtc] datetime2 NULL,
    [EstaActivo] bit NOT NULL,
    CONSTRAINT [PK_QuoteItems] PRIMARY KEY ([Id]),
    CONSTRAINT [FK_QuoteItems_Products_ProductoId] FOREIGN KEY ([ProductoId]) REFERENCES [Products] ([Id]) ON DELETE CASCADE,
    CONSTRAINT [FK_QuoteItems_Quotes_CotizacionId] FOREIGN KEY ([CotizacionId]) REFERENCES [Quotes] ([Id]) ON DELETE CASCADE
);
GO


CREATE TABLE [PaymentInstallments] (
    [Id] uniqueidentifier NOT NULL,
    [VentaId] uniqueidentifier NOT NULL,
    [IdVenta] int NULL,
    [NumeroRecibo] nvarchar(64) NOT NULL,
    [MontoAbonado] decimal(18,2) NOT NULL,
    [SaldoPendienteAnterior] decimal(18,2) NOT NULL,
    [SaldoPendienteNuevo] decimal(18,2) NOT NULL,
    [FormaPago] nvarchar(max) NOT NULL,
    [UsuarioId] uniqueidentifier NULL,
    [Notas] nvarchar(max) NOT NULL,
    [FechaCreacionUtc] datetime2 NOT NULL,
    [FechaActualizacionUtc] datetime2 NULL,
    [EstaActivo] bit NOT NULL,
    CONSTRAINT [PK_PaymentInstallments] PRIMARY KEY ([Id]),
    CONSTRAINT [FK_PaymentInstallments_Sales_VentaId] FOREIGN KEY ([VentaId]) REFERENCES [Sales] ([Id]) ON DELETE CASCADE,
    CONSTRAINT [FK_PaymentInstallments_Users_UsuarioId] FOREIGN KEY ([UsuarioId]) REFERENCES [Users] ([Id])
);
GO


CREATE TABLE [ReturnHeaders] (
    [Id] uniqueidentifier NOT NULL,
    [NumeroDevolucion] nvarchar(64) NOT NULL,
    [VentaId] uniqueidentifier NOT NULL,
    [IdVenta] int NULL,
    [UsuarioId] uniqueidentifier NULL,
    [MontoTotalDevuelto] decimal(18,2) NOT NULL,
    [MontoAplicadoSaldoPendiente] decimal(18,2) NOT NULL,
    [MontoReembolsado] decimal(18,2) NOT NULL,
    [FormaReembolso] nvarchar(32) NOT NULL,
    [Motivo] nvarchar(max) NOT NULL,
    [Estado] nvarchar(max) NOT NULL,
    [FechaCreacionUtc] datetime2 NOT NULL,
    [FechaActualizacionUtc] datetime2 NULL,
    [EstaActivo] bit NOT NULL,
    CONSTRAINT [PK_ReturnHeaders] PRIMARY KEY ([Id]),
    CONSTRAINT [FK_ReturnHeaders_Sales_VentaId] FOREIGN KEY ([VentaId]) REFERENCES [Sales] ([Id]) ON DELETE CASCADE,
    CONSTRAINT [FK_ReturnHeaders_Users_UsuarioId] FOREIGN KEY ([UsuarioId]) REFERENCES [Users] ([Id])
);
GO


CREATE TABLE [SaleItems] (
    [Id] uniqueidentifier NOT NULL,
    [VentaId] uniqueidentifier NOT NULL,
    [IdVenta] int NULL,
    [ProductoId] uniqueidentifier NOT NULL,
    [Cantidad] decimal(18,2) NOT NULL,
    [PrecioUnitario] decimal(18,2) NOT NULL,
    [MontoDescuento] decimal(18,2) NOT NULL,
    [PrecioTotal] decimal(18,2) NOT NULL,
    [FechaCreacionUtc] datetime2 NOT NULL,
    [FechaActualizacionUtc] datetime2 NULL,
    [EstaActivo] bit NOT NULL,
    CONSTRAINT [PK_SaleItems] PRIMARY KEY ([Id]),
    CONSTRAINT [FK_SaleItems_Products_ProductoId] FOREIGN KEY ([ProductoId]) REFERENCES [Products] ([Id]) ON DELETE CASCADE,
    CONSTRAINT [FK_SaleItems_Sales_VentaId] FOREIGN KEY ([VentaId]) REFERENCES [Sales] ([Id]) ON DELETE CASCADE
);
GO


CREATE TABLE [ReturnItems] (
    [Id] uniqueidentifier NOT NULL,
    [DevolucionCabeceraId] uniqueidentifier NOT NULL,
    [ProductoId] uniqueidentifier NOT NULL,
    [Cantidad] decimal(18,2) NOT NULL,
    [PrecioUnitarioDevolucion] decimal(18,2) NOT NULL,
    [PrecioTotalDevolucion] decimal(18,2) NOT NULL,
    [FechaCreacionUtc] datetime2 NOT NULL,
    [FechaActualizacionUtc] datetime2 NULL,
    [EstaActivo] bit NOT NULL,
    CONSTRAINT [PK_ReturnItems] PRIMARY KEY ([Id]),
    CONSTRAINT [FK_ReturnItems_Products_ProductoId] FOREIGN KEY ([ProductoId]) REFERENCES [Products] ([Id]) ON DELETE CASCADE,
    CONSTRAINT [FK_ReturnItems_ReturnHeaders_DevolucionCabeceraId] FOREIGN KEY ([DevolucionCabeceraId]) REFERENCES [ReturnHeaders] ([Id]) ON DELETE CASCADE
);
GO


CREATE INDEX [IX_AuditLogs_Accion] ON [AuditLogs] ([Accion]);
GO


CREATE INDEX [IX_AuditLogs_FechaCreacionUtc] ON [AuditLogs] ([FechaCreacionUtc]);
GO


CREATE INDEX [IX_AuditLogs_IdCorrelacion] ON [AuditLogs] ([IdCorrelacion]);
GO


CREATE INDEX [IX_AuditLogs_UsuarioId] ON [AuditLogs] ([UsuarioId]);
GO


CREATE UNIQUE INDEX [IX_CashShifts_NumeroTurno] ON [CashShifts] ([NumeroTurno]);
GO


CREATE INDEX [IX_CashShifts_UsuarioId] ON [CashShifts] ([UsuarioId]);
GO


CREATE INDEX [IX_CashTransactions_IdVenta] ON [CashTransactions] ([IdVenta]);
GO


CREATE INDEX [IX_CashTransactions_TurnoCajaId] ON [CashTransactions] ([TurnoCajaId]);
GO


CREATE INDEX [IX_CashTransactions_UsuarioId] ON [CashTransactions] ([UsuarioId]);
GO


CREATE INDEX [IX_Categories_CategoriaPadreId] ON [Categories] ([CategoriaPadreId]);
GO


CREATE UNIQUE INDEX [IX_Categories_Slug] ON [Categories] ([Slug]);
GO


CREATE UNIQUE INDEX [IX_Customers_Email] ON [Customers] ([Email]);
GO


CREATE UNIQUE INDEX [IX_Customers_Rfc] ON [Customers] ([Rfc]) WHERE [Rfc] IS NOT NULL AND [Rfc] <> N'';
GO


CREATE INDEX [IX_InventoryMovements_IdVenta] ON [InventoryMovements] ([IdVenta]);
GO


CREATE INDEX [IX_InventoryMovements_ProductoId] ON [InventoryMovements] ([ProductoId]);
GO


CREATE INDEX [IX_InventoryMovements_UsuarioId] ON [InventoryMovements] ([UsuarioId]);
GO


CREATE INDEX [IX_PaymentInstallments_IdVenta] ON [PaymentInstallments] ([IdVenta]);
GO


CREATE INDEX [IX_PaymentInstallments_NumeroRecibo] ON [PaymentInstallments] ([NumeroRecibo]);
GO


CREATE INDEX [IX_PaymentInstallments_UsuarioId] ON [PaymentInstallments] ([UsuarioId]);
GO


CREATE INDEX [IX_PaymentInstallments_VentaId] ON [PaymentInstallments] ([VentaId]);
GO


CREATE INDEX [IX_ProductImages_ProductoId] ON [ProductImages] ([ProductoId]);
GO


CREATE UNIQUE INDEX [IX_Products_Barcode] ON [Products] ([Barcode]);
GO


CREATE INDEX [IX_Products_CategoriaId] ON [Products] ([CategoriaId]);
GO


CREATE UNIQUE INDEX [IX_Products_Sku] ON [Products] ([Sku]);
GO


CREATE INDEX [IX_QuoteItems_CotizacionId] ON [QuoteItems] ([CotizacionId]);
GO


CREATE INDEX [IX_QuoteItems_ProductoId] ON [QuoteItems] ([ProductoId]);
GO


CREATE INDEX [IX_Quotes_ClienteId] ON [Quotes] ([ClienteId]);
GO


CREATE UNIQUE INDEX [IX_Quotes_NumeroCotizacion] ON [Quotes] ([NumeroCotizacion]);
GO


CREATE INDEX [IX_Quotes_UsuarioId] ON [Quotes] ([UsuarioId]);
GO


CREATE INDEX [IX_RefreshTokens_UsuarioId] ON [RefreshTokens] ([UsuarioId]);
GO


CREATE INDEX [IX_ReturnHeaders_IdVenta] ON [ReturnHeaders] ([IdVenta]);
GO


CREATE UNIQUE INDEX [IX_ReturnHeaders_NumeroDevolucion] ON [ReturnHeaders] ([NumeroDevolucion]);
GO


CREATE INDEX [IX_ReturnHeaders_UsuarioId] ON [ReturnHeaders] ([UsuarioId]);
GO


CREATE INDEX [IX_ReturnHeaders_VentaId] ON [ReturnHeaders] ([VentaId]);
GO


CREATE INDEX [IX_ReturnItems_DevolucionCabeceraId] ON [ReturnItems] ([DevolucionCabeceraId]);
GO


CREATE INDEX [IX_ReturnItems_ProductoId] ON [ReturnItems] ([ProductoId]);
GO


CREATE INDEX [IX_RolePermissions_PermisoId] ON [RolePermissions] ([PermisoId]);
GO


CREATE INDEX [IX_SaleItems_IdVenta] ON [SaleItems] ([IdVenta]);
GO


CREATE INDEX [IX_SaleItems_ProductoId] ON [SaleItems] ([ProductoId]);
GO


CREATE INDEX [IX_SaleItems_VentaId] ON [SaleItems] ([VentaId]);
GO


CREATE INDEX [IX_Sales_ClienteId] ON [Sales] ([ClienteId]);
GO


CREATE UNIQUE INDEX [IX_Sales_IdVenta] ON [Sales] ([IdVenta]);
GO


CREATE UNIQUE INDEX [IX_Sales_NumeroFolio] ON [Sales] ([NumeroFolio]);
GO


CREATE INDEX [IX_Sales_UsuarioId] ON [Sales] ([UsuarioId]);
GO


CREATE UNIQUE INDEX [IX_Stocks_ProductoId] ON [Stocks] ([ProductoId]);
GO


CREATE INDEX [IX_UserRoles_RolId] ON [UserRoles] ([RolId]);
GO


CREATE INDEX [IX_Users_EmpleadoId] ON [Users] ([EmpleadoId]);
GO

-- EF Core Migrations History Table
CREATE TABLE [__EFMigrationsHistory] (
    [MigrationId] nvarchar(150) NOT NULL,
    [ProductVersion] nvarchar(32) NOT NULL,
    CONSTRAINT [PK___EFMigrationsHistory] PRIMARY KEY ([MigrationId])
);
GO

INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion]) VALUES (N'20260804135557_AddInventoryMovementEvidenceImage', N'9.0.0');
INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion]) VALUES (N'20260805071520_RestrictCashierToPointOfSale', N'9.0.0');
INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion]) VALUES (N'20260805085801_AddUniqueOperationalFolios', N'9.0.0');
INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion]) VALUES (N'20260805092442_CompleteCommercialOperations', N'9.0.0');
INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion]) VALUES (N'20260805095319_CompleteReportsAndCatalog', N'9.0.0');
INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion]) VALUES (N'20260805095914_NormalizeDefaultWarehouseLocation', N'9.0.0');
INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion]) VALUES (N'20260809223936_AddCashShiftTotalEntradas', N'9.0.0');
INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion]) VALUES (N'20260810111538_AddIdVentaOperationalFolio', N'9.0.0');
INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion]) VALUES (N'20260810123707_BackfillOperationalSaleReferences', N'9.0.0');
INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion]) VALUES (N'20260810131157_StandardizeReceiptReferencesByIdVenta', N'9.0.0');
GO

-- =========================================================================
-- SEED DE DATOS INICIALES: ROL ADMINISTRADOR ÚNICO, PERMISOS Y USUARIO ADMIN
-- =========================================================================

-- 1. Insert Roles Administrador y Cajero
DECLARE @RolAdminId UNIQUEIDENTIFIER = 'E7B81234-5678-4900-A111-000000000001';
DECLARE @RolCajeroId UNIQUEIDENTIFIER = 'E7B81234-5678-4900-A111-000000000005';

INSERT INTO [Roles] ([Id], [Nombre], [Descripcion], [FechaCreacionUtc], [EstaActivo])
VALUES 
(@RolAdminId, N'Administrador', N'Acceso total al sistema WPC Bajío', GETUTCDATE(), 1),
(@RolCajeroId, N'Cajero', N'Operación del Punto de Venta y Cobro en Caja', GETUTCDATE(), 1);
GO

-- 2. Insert Empleado Administrador General
DECLARE @EmpleadoAdminId UNIQUEIDENTIFIER = 'E7B81234-5678-4900-A111-000000000002';
INSERT INTO [Employees] ([Id], [Nombre], [Apellido], [Email], [Puesto], [FechaCreacionUtc], [EstaActivo])
VALUES (@EmpleadoAdminId, N'Administrador', N'General', N'admin@lambrin.com', N'Gerente General WPC Bajío', GETUTCDATE(), 1);
GO

-- 3. Insert Usuario Admin (Password: Admin123!) y Rol
DECLARE @UsuarioAdminId UNIQUEIDENTIFIER = 'E7B81234-5678-4900-A111-000000000003';
DECLARE @EmpleadoAdminId UNIQUEIDENTIFIER = 'E7B81234-5678-4900-A111-000000000002';
DECLARE @RolAdminId UNIQUEIDENTIFIER = 'E7B81234-5678-4900-A111-000000000001';

INSERT INTO [Users] ([Id], [NombreUsuario], [Email], [PasswordHash], [EmpleadoId], [FechaCreacionUtc], [EstaActivo])
VALUES (@UsuarioAdminId, N'admin', N'admin@lambrin.com', N'daVwdKGBG42jeywmJ2wdoA==.OTX9k9rt1ULy5atdXQar4x6uqZoNjmlVKSQbH34iX+o=', @EmpleadoAdminId, GETUTCDATE(), 1);

INSERT INTO [UserRoles] ([UsuarioId], [RolId])
VALUES (@UsuarioAdminId, @RolAdminId);
GO

-- 4. Insert Cliente Público en General (Requerido para ventas mostrador)
DECLARE @ClientePublicoId UNIQUEIDENTIFIER = 'E7B81234-5678-4900-A111-000000000004';
INSERT INTO [Customers] ([Id], [Nombre], [Apellido], [NombreEmpresa], [Rfc], [Email], [Telefono], [Direccion], [Ciudad], [Estado], [CodigoPostal], [TipoCliente], [PorcentajeDescuentoEspecial], [Notas], [FechaCreacionUtc], [EstaActivo])
VALUES (@ClientePublicoId, N'Público en General', N'Venta Mostrador', NULL, NULL, N'publico@wpcbajio.com', N'4770000000', N'Mostrador WPC Bajío', N'León', N'Guanajuato', N'37000', N'Particular', 0.00, N'Cliente por defecto', GETUTCDATE(), 1);
GO

-- 5. Insert 27 Permisos y Asignación Directa al Rol Administrador
DECLARE @RolAdminId UNIQUEIDENTIFIER = 'E7B81234-5678-4900-A111-000000000001';

DECLARE @Perms TABLE (Id UNIQUEIDENTIFIER, Modulo NVARCHAR(50), Accion NVARCHAR(50), Descripcion NVARCHAR(200));

INSERT INTO @Perms VALUES
(NEWID(), N'ventas', N'procesar', N'Procesar ventas'),
(NEWID(), N'ventas', N'cancelar', N'Cancelar ventas'),
(NEWID(), N'ventas', N'descuento', N'Aplicar descuentos'),
(NEWID(), N'ventas', N'historial', N'Ver historial de ventas'),
(NEWID(), N'caja', N'aperturar', N'Apertura de turno de caja'),
(NEWID(), N'caja', N'cerrar', N'Cierre de turno de caja'),
(NEWID(), N'caja', N'corte_z', N'Ejecutar corte Z de caja'),
(NEWID(), N'caja', N'sangria', N'Registrar retiro o sangría'),
(NEWID(), N'caja', N'entrada', N'Registrar entrada manual de efectivo'),
(NEWID(), N'catalogo', N'productos_ver', N'Ver catálogo de productos'),
(NEWID(), N'catalogo', N'productos_crear', N'Crear productos en catálogo'),
(NEWID(), N'catalogo', N'productos_editar', N'Editar productos en catálogo'),
(NEWID(), N'catalogo', N'categorias_ver', N'Ver categorías de productos'),
(NEWID(), N'catalogo', N'categorias_crear', N'Crear categorías de productos'),
(NEWID(), N'inventario', N'ver', N'Ver niveles de existencias'),
(NEWID(), N'inventario', N'ajustar', N'Ajustar inventarios'),
(NEWID(), N'inventario', N'movimientos', N'Registrar movimientos de stock'),
(NEWID(), N'clientes', N'ver', N'Ver directorio de clientes'),
(NEWID(), N'clientes', N'crear', N'Dar de alta nuevos clientes'),
(NEWID(), N'clientes', N'editar', N'Editar información de clientes'),
(NEWID(), N'comercial', N'cotizaciones', N'Administrar cotizaciones'),
(NEWID(), N'comercial', N'abonos', N'Registrar abonos a ventas'),
(NEWID(), N'comercial', N'devoluciones', N'Procesar devoluciones'),
(NEWID(), N'comercial', N'contratos', N'Administrar plantillas de contratos'),
(NEWID(), N'reportes', N'ver_ventas', N'Ver reportes ejecutivos de venta'),
(NEWID(), N'reportes', N'ver_inventario', N'Ver reportes de inventario'),
(NEWID(), N'usuarios', N'administrar', N'Administrar usuarios y permisos');

INSERT INTO [Permissions] ([Id], [Modulo], [Accion], [Descripcion], [FechaCreacionUtc], [EstaActivo])
SELECT Id, Modulo, Accion, Descripcion, GETUTCDATE(), 1 FROM @Perms;

DECLARE @RolCajeroId UNIQUEIDENTIFIER = 'E7B81234-5678-4900-A111-000000000005';

INSERT INTO [RolePermissions] ([RolId], [PermisoId])
SELECT @RolAdminId, Id FROM @Perms;

INSERT INTO [RolePermissions] ([RolId], [PermisoId])
SELECT @RolCajeroId, Id FROM @Perms
WHERE (Modulo = 'ventas' AND Accion IN ('procesar', 'cancelar', 'descuento', 'historial'))
   OR (Modulo = 'caja' AND Accion IN ('aperturar', 'cerrar', 'corte_z', 'sangria', 'entrada'))
   OR (Modulo = 'catalogo' AND Accion IN ('productos_ver', 'categorias_ver'))
   OR (Modulo = 'inventario' AND Accion IN ('ver'))
   OR (Modulo = 'clientes' AND Accion IN ('ver', 'crear', 'editar'))
   OR (Modulo = 'comercial' AND Accion IN ('cotizaciones', 'abonos'));
GO
