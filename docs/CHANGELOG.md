# CHANGELOG — WPC Bajío POS & Platform

All notable changes to this project will be documented in this file.

## [1.0.0-v1.full-modules] - 2026-08-04

### Added
- **Modales ABC (Altas, Bajas y Cambios) para Todos los Módulos de la Fase 1**:
  - **Módulo de Usuarios y Empleados (🛡️)**: `UsersController.cs` y vista `PaginaUsuarios.tsx` con modal para dar de alta usuarios/empleados, editar datos, asignar roles (Administrador / Cajero) y desactivar cuentas.
  - **Módulo de Categorías de Productos (📁)**: Endpoints `POST/PUT /api/v1/categories` y modal en `PaginaCatalogoProductos.tsx` para crear y editar categorías de productos.
  - **Módulo de Clientes (👥)**: Endpoints `POST/PUT /api/v1/customers` y modal en `CustomerListPage.tsx` para alta y edición de datos fiscales (RFC, Dirección, Teléfono, Tipo Particular/Mayorista, % Descuento Especial).
  - **Módulo de Inventarios (🏭)**: Modal en `InventoryListPage.tsx` para capturar Entradas, Salidas y Ajustes de Stock de existencias.
  - **Módulo de Operaciones Comerciales (💰)**: Modal de registro de Abonos a apartado, Modal de Procesamiento de Devoluciones y Visor/Impresor de Contrato Legal A4 en `CommercialOpsPage.tsx`.
- **Doble Sistema de Log (Base de Datos + Serilog)**:
  - Integración de los paquetes `Serilog.AspNetCore`, `Serilog.Sinks.File` y `Serilog.Sinks.Console`.
  - Emisión simultánea de bitácora a SQL Server/EF Core y a archivos rotativos diarios `logs/auditoria-YYYYMMDD.log` con enriquecimiento por `CorrelationId`, `UsuarioId`, `Accion`, `NombreEntidad`, `DireccionIp` y `Motivo`.
