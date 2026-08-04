# DIAGRAMAS DE ARQUITECTURA Y COMPONENTES — WPC BAJÍO

Este documento contiene las especificaciones técnicas completas de arquitectura y componentes para la **Fase 1 (Sistema Interno y PDV)** y **Fase 2 (Plataforma E-Commerce y Portal de Clientes)** del proyecto **WPC Bajío**, preparadas para renderizarse sin consumo adicional de tokens.

---

## 1. DIAGRAMA DE ARQUITECTURA — FASE 1 (Sistema Interno & PDV en Red Local)

La Fase 1 contempla una instalación en Red Local (LAN) con 2 estaciones de trabajo conectadas a la base de datos SQL Server en el servidor `AAM`.

```mermaid
graph TD
    subgraph "Estación 1: Punto de Venta (Caja)"
        E1[Navegador Web / React SPA] -->|Lectura USB HID| B1[Escáner Código de Barras USB]
        E1 -->|Peticiones HTTP/REST| API1[ASP.NET Core Web API .NET 9]
    end

    subgraph "Estación 2: Oficina Administración / Gerencia"
        E2[Navegador Web / React SPA] -->|Consultas / Reportes / Cortes| API2[ASP.NET Core Web API .NET 9]
    end

    subgraph "Servidor Principal (AAM)"
        API1 -->|EF Core 9 / Windows Auth| DB[(SQL Server: PosLambrinDb)]
        API2 -->|EF Core 9 / Windows Auth| DB
        LOGS[(Archivos de Bitácora / Serilog)] <--- API1 & API2
    end
```

---

## 2. DIAGRAMA DE ARQUITECTURA — FASE 2 (E-Commerce y Portal de Atención al Cliente)

La Fase 2 extiende el ecosistema conectando la tienda en línea y portal cliente con el backend central a través de servicios seguros en la nube.

```mermaid
graph TD
    subgraph "Clientes E-Commerce & Autoservicio"
        C1[Cliente Web Movil / Desktop] -->|HTTPS / SSL| GW[API Gateway / Cloudflare]
    end

    subgraph "Sucursal / Red Local WPC Bajío (AAM)"
        POS[PDV Caja & Gerencia] -->|LAN| REST[ASP.NET Core Web API .NET 9]
    end

    subgraph "Servicios Cloud / Híbridos"
        GW -->|JWT OAuth2| EC[Portal E-Commerce & Cotizador]
        EC -->|Sincronización Inventarios| REST
        REST -->|SMTP / SendGrid| MAIL[Servicio de Correo de Abonos / Pedidos]
        REST -->|Generador PDF| PDF[Motor PDF Recibos con Código de Barras]
        REST -->|EF Core| DB[(SQL Server: PosLambrinDb)]
    end
```

---

## 3. DIAGRAMA DE COMPONENTES — FASE 1

```mermaid
componentDiagram
    package "Frontend pos-web (React + Vite + TypeScript)" {
        [PaginaPuntoVenta]
        [PaginaCatalogoProductos]
        [PaginaInventario]
        [PaginaTurnoCaja]
        [PaginaReportes]
        [usarEscanerCodigoBarras]
    }

    package "Backend ASP.NET Core (.NET 9)" {
        [ControladorVentas]
        [ControladorProductos]
        [ControladorTurnoCaja]
        [ControladorReportes]
        
        [ServicioVentas]
        [ServicioCatalogo]
        [ServicioTurnoCaja]
        [ServicioBitacoraAuditoria]
        
        [DbContextPos]
    }

    database "Base de Datos" {
        [SQL Server AAM]
    }

    [PaginaPuntoVenta] --> [ControladorVentas]
    [PaginaCatalogoProductos] --> [ControladorProductos]
    [PaginaTurnoCaja] --> [ControladorTurnoCaja]
    [PaginaReportes] --> [ControladorReportes]

    [ControladorVentas] --> [ServicioVentas]
    [ControladorProductos] --> [ServicioCatalogo]
    [ControladorTurnoCaja] --> [ServicioTurnoCaja]

    [ServicioVentas] --> [ServicioBitacoraAuditoria]
    [ServicioVentas] --> [DbContextPos]
    [ServicioTurnoCaja] --> [DbContextPos]
    [DbContextPos] --> [SQL Server AAM]
```

---

## 4. DIAGRAMA DE COMPONENTES — FASE 2

```mermaid
componentDiagram
    package "Portal E-Commerce Clientes" {
        [CatalogoPublicoWeb]
        [CotizadorAutoservicio]
        [ConsultaAbonosCliente]
    }

    package "Servicios Extendidos Backend" {
        [ControladorECommerce]
        [ServicioNotificacionesCorreo]
        [ServicioGeneradorPdfCodigoBarras]
        [ServicioPagosElectronicos]
    }

    package "Base de Datos Central" {
        [SQL Server AAM]
    }

    [CatalogoPublicoWeb] --> [ControladorECommerce]
    [CotizadorAutoservicio] --> [ControladorECommerce]
    [ConsultaAbonosCliente] --> [ServicioGeneradorPdfCodigoBarras]

    [ControladorECommerce] --> [ServicioPagosElectronicos]
    [ControladorECommerce] --> [ServicioNotificacionesCorreo]
    [ServicioPagosElectronicos] --> [SQL Server AAM]
```
