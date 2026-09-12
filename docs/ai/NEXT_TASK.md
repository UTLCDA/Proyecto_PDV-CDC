# NEXT TASK — Siguiente Tarea Recomendada

## 📌 Estado Actual

- **Rama Git Activa**: `main` (desplegada y sincronizada con `origin/main`).
- **Sincronización Local**: Base de datos local `PosLambrinDb` 100% sincronizada con Producción (105 productos, 13 categorías, 105 stocks).
- **Sistema de Etiquetas**: `D:\Visozr Etiquetas` actualizado con presets de los 104 productos activos y botón de carga masiva de catálogo en lote.

## 📌 Siguiente Tarea Recomendada

Ejecutar el sistema de etiquetas térmicas (`npm run dev` en `D:\Visozr Etiquetas`), cargar los 104 productos con el botón de lote y generar/imprimir las etiquetas térmicas (100mm × 60mm) o descargarlas en PDF multipágina.

### Criterios de Aceptación
1. Iniciar el servidor local de Visozr Etiquetas: `npm --prefix "D:\Visozr Etiquetas" run dev`.
2. Abrir `http://localhost:5173` (o el puerto asignado).
3. Hacer clic en "⚡ Cargar Catálogo Completo (104 Etiquetas)" en la sección de Cola de Impresión por Lote.
4. Validar que se muestren las 104 etiquetas térmicas con datos reales (SKU, código de barras, color, medidas y precio con IVA).
5. Probar la descarga del PDF multipágina o impresión directa en impresora térmica.



