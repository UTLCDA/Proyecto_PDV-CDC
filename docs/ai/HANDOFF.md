# HANDOFF — Resumen de Trabajo Reciente (v2.1.4)

## Fecha de Handoff
2026-08-21

## Rama Git Activa
`codex/2.1.1-comentarios-finales-clientes`

## Resumen de Cambios Realizados
1. **Despliegue Local e Instalación en IIS**:
   - Desarrollado el instalador automatizado [`install_local_iis.py`](file:///d:/Proyecto_PDV-CDC/install_local_iis.py) que habilita IIS mediante DISM, compila los bundles de Release y publica tanto la API como el Frontend en IIS.
   - Configurada la identidad `LocalSystem` en los AppPools de IIS y otorgado el rol `sysadmin` en SQL Server a la identidad de IIS.
   - Respuesta de salud de la API validada exitosamente: `http://localhost:5000/api/v1/health` -> `{"estado": "Operativo", "nombreServicio": "WPC Bajío POS API"}`.
2. **Apertura Compartida de Caja y Permisos de Cajero**:
   - Inclusión de `PermissionCodes.Sales.Process` en la política `AuthorizationPolicyNames.CashShiftRead` en `Program.cs`.
   - Ocultamiento de la pestaña Ventas al rol Cajero en `accessControl.ts`.
3. **Scroll en Detalles Técnicos de Bitácora**:
   - Modal reestructurado en `AuditLogPage.tsx` y `AuditLogPage.css` con scroll vertical/horizontal fluido.

## Estado de la Suite de Pruebas
- Frontend Vitest: **24/24** pasadas (100%).
- Frontend Build (Vite & tsc): Exitosa con **0 errores**.
- Backend xUnit: **67/67** pasadas (100%).
- Respuesta Backend IIS: **200 OK — Estado: Operativo**.
