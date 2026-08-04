# AGENTS.md — Reglas Principales de Trabajo para Agentes IA

## 1. Objetivo del Proyecto
Desarrollar un sistema de Punto de Venta (PDV) e inventario para **Lambrín decorativo** (Fase 1: Sistema interno y PDV; Fase 2: Plataforma E-commerce y Atención al Cliente).
El desarrollado debe cumplir con alta disponibilidad, trazabilidad auditada al 100%, soporte bilingüe (Español y Chino Simplificado) e integración con escáneres de código de barras USB.

## 2. Tecnologías Obligatorias
- **Backend**: .NET 9 C#, ASP.NET Core Web API, Entity Framework Core 9 (Dapper únicamente cuando esté justificado para reportes/bitácora), ASP.NET Core Identity, JWT con Refresh Tokens, Serilog, FluentValidation, xUnit.
- **Frontend**: React 18, TypeScript, Vite, Vanilla CSS Design Token System, TanStack Query, i18next (es / zh-CN), Vitest, Playwright.
- **Base de Datos**: SQL Server, EF Core Migrations versionadas, tipos `decimal(18,4)` o `decimal(18,2)` para dinero, fechas internas en UTC.

## 3. Archivos que DEBES LEER antes de comenzar cualquier tarea
Cualquier agente IA que inicie o continúe una sesión DEBE leer en este orden:
1. `AGENTS.md` (este archivo)
2. [docs/ai/CURRENT_STATE.md](file:///d:/Proyecto_PDV-CDC/docs/ai/CURRENT_STATE.md)
3. [docs/ai/NEXT_TASK.md](file:///d:/Proyecto_PDV-CDC/docs/ai/NEXT_TASK.md)
4. [docs/ai/PROJECT_CONTEXT.md](file:///d:/Proyecto_PDV-CDC/docs/ai/PROJECT_CONTEXT.md)
5. ADRs relevantes en `docs/adr/`

## 4. Arquitectura y Convenciones
- **Clean Architecture Monolítica Modular**:
  - `Pos.Domain`: Entidades, Value Objects, Enums, Interfaces de Dominio (Sin dependencias externas).
  - `Pos.Application`: Casos de Uso, DTOs, FluentValidation, Interfaces de Servicios.
  - `Pos.Infrastructure`: DbContext, EF Core mappings, Repositorios, Serilog, Servicios de archivos.
  - `Pos.Api`: Controladores REST, Middleware de Excepciones, Configuración Swagger/OpenAPI.
  - `pos-web`: SPA en React + Vite + TypeScript.
- **Nombres técnicos**: En inglés para código C# y TypeScript.
- **Textos funcionales e interfaz**: En español y chino simplificado (diccionarios i18n).
- **Prohibiciones de Código**:
  - No usar `float` o `double` para montos monetarios (usar `decimal`).
  - No usar valores ni cadenas mágicas para estados o permisos (usar `enum` o constantes).
  - No guardar contraseñas, secretos o tokens en texto plano ni en el repositorio.
  - No crear controladores o componentes gigantescos; mantener responsabilidad única (SOLID).
  - No borrar ni modificar registros de Bitácora.

## 5. Reglas para Modificar Documentación
Al terminar cada iteración o tarea, el agente DEBE actualizar:
- `docs/ai/CURRENT_STATE.md` (estado real, pruebas ejecutadas, errores conocidos).
- `docs/ai/HANDOFF.md` (resumen de lo realizado y decisiones pendientes).
- `docs/ai/NEXT_TASK.md` (la siguiente única tarea recomendada con sus criterios de aceptación).
- `docs/CHANGELOG.md` (si hay cambios funcionales relevantes).

## 6. Comandos del Proyecto
- **Compilar Backend**: `dotnet build src/backend/Pos.sln`
- **Ejecutar Pruebas Backend**: `dotnet test src/backend/Pos.sln`
- **Instalar Frontend**: `npm --prefix src/frontend/pos-web install`
- **Compilar Frontend**: `npm --prefix src/frontend/pos-web run build`
- **Ejecutar Pruebas Frontend**: `npm --prefix src/frontend/pos-web run test`

## 7. Definición de Terminado (Definition of Done - DoD)
Una historia o funcionalidad solo está terminada cuando:
1. Criterios de aceptación documentados en la historia.
2. La solución compila sin advertencias ni errores.
3. Las migraciones de base de datos se generan y aplican correctamente.
4. Las pruebas unitarias/integración pasan al 100%.
5. Se verificaron permisos y registro en auditoría (bitácora).
6. Sin secretos ni credenciales en código.
7. Documentos de IA (`CURRENT_STATE.md`, `HANDOFF.md`, `NEXT_TASK.md`) actualizados.
8. Descripción de Pull Request redactada.
9. Validación y aprobación explícita por el desarrollador humano.
