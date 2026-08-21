# HANDOFF — Resumen de Trabajo Reciente (v2.1.3)

## Fecha de Handoff
2026-08-21

## Rama Git Activa
`codex/2.1.1-comentarios-finales-clientes`

## Resumen de Cambios Realizados
1. **Apertura Compartida de Caja (Admin -> Cajero)**:
   - Inclusión del permiso `ventas:procesar` en la política `AuthorizationPolicyNames.CashShiftRead` en `Program.cs`.
   - Permite a la cuenta con rol Cajero consultar `GET /api/v1/cashshifts/current` sin recibir 403 Forbidden y vender inmediatamente una vez que la caja fue aperturada.
2. **Restricción Estricta del Rol Cajero**:
   - Ajuste de `tabPermissions.sales` en `accessControl.ts` a `[permissionCodes.reportsSalesView]`.
   - Oculta el módulo **Ventas** (Histórico) para el rol Cajero, permitiendo visualizar únicamente **Punto de Venta**.
3. **Scroll en Detalles Técnicos de Bitácora**:
   - Reestructuración de estilos en `AuditLogPage.css` y `AuditLogPage.tsx` con `.audit-modal-container`, `.audit-modal-body` y contenedor `.audit-json-box` (max-height: 350px).
   - Permite scroll vertical y horizontal sin recortes al desplegar `🛠️ Detalles Técnicos`.

## Estado de la Suite de Pruebas
- Frontend Vitest: **24/24** pasadas (100%).
- Frontend Build (Vite & tsc): Exitosa con **0 errores**.
- Backend xUnit: **67/67** pasadas (100%).
