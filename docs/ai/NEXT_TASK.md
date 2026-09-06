# NEXT_TASK — Siguiente Tarea Recomendada

## 📌 Fase 2: Plataforma E-Commerce, Carrito de Compras y Atención al Cliente (v3.0.0)

### 🎯 Estado Actual y Contexto
- **Fase 1 (Punto de Venta e Infraestructura en la Nube)**: **COMPLETADA AL 100% Y OPERANDO EN PRODUCCIÓN**.
  - Frontend publicado en Cloudflare Edge CDN (`https://pos-wpcbajio.com` / `https://pos-wpcbajio.aaronarenasmartinez.workers.dev`).
  - Backend .NET 9 Web API operando en VPS Cloud Ubuntu (`https://api.wpcbajio.com/api/v1`).
  - Base de datos central unificada SQL Server 2022 Express en Docker (`PosLambrinDb`) con 26 tablas físicas.
  - Autenticación, catálogo de productos, inventario, clientes, turnos de caja, comprobantes e historial validados sin errores de CORS.
- **Siguiente Paso**: Inicio de la **Fase 2: Plataforma E-Commerce y Carrito de Compras** para clientes finales, sincronizada en tiempo real con el mismo catálogo y stock central de SQL Server en la nube.

---

### 📋 Esperando Indicaciones del Usuario
El agente se encuentra a la espera del plan de trabajo, requerimientos funcionales y las instrucciones técnicas específicas del desarrollador para arrancar la implementación de la Fase 2.

---

### 📚 Módulos y Referencias Clave
- `AGENTS.md` (Reglas principales y Definition of Done).
- `docs/ai/CURRENT_STATE.md` (Estado real en producción).
- `docs/ai/PROJECT_CONTEXT.md` (Arquitectura monolítica modular y reglas de dominio).
- `src/backend/Pos.Domain/` (Entidades centrales: Producto, Stock, Venta, Cliente).
- `src/frontend/` (Aplicaciones cliente).
