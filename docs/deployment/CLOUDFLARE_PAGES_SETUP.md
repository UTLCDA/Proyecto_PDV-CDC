# Despliegue del Frontend en Cloudflare Pages

Esta guía detalla los pasos para desplegar la aplicación cliente SPA de WPC Bajío (`pos-web`) en la red CDN global de **Cloudflare Pages** conectada a `pos.wpcbajio.com`.

---

## 🌟 Ventajas de Cloudflare Pages
1. **Velocidad Global Ultrarrápida**: Se sirve desde más de 300 centros de datos mundiales de Cloudflare con latencia < 20ms.
2. **Cero Consumo de Recursos en VPS**: El VPS solo atiende peticiones de API y base de datos.
3. **Certificado SSL / HTTPS Gratuito y Automático**.
4. **Enrutamiento SPA Limpio**: Soporta `_redirects` para que rutas como `/pos`, `/clientes`, `/caja`, etc., funcionen perfectamente al recargar el navegador.
5. **Conexión Automática con la API Cloud**: Enlaza directamente con `https://api.wpcbajio.com/api/v1`.

---

## 🛠️ Método 1: Conexión Automática con GitHub (Recomendado)

Cada vez que hagas un commit o push en GitHub, Cloudflare actualizará el sitio automáticamente:

1. Entra a tu panel de **Cloudflare** ([dash.cloudflare.com](https://dash.cloudflare.com)).
2. En el menú lateral izquierdo, haz clic en **Workers & Pages** (o **Compute (Workers & Pages)**) > **Overview**.
3. Haz clic en **Create application** > pestaña **Pages** > botón **Connect to Git**.
4. Selecciona tu cuenta de GitHub y el repositorio: `UTLCDA/Proyecto_PDV-CDC`.
5. En la pantalla de configuración:
   - **Project name**: `pos-wpcbajio` (o el nombre que prefieras).
   - **Production branch**: `fix/cloudflare-tunnel-mobile-support` (o `main` cuando fusiones el PR).
   - **Framework preset**: `Vite`.
   - **Root directory**: `src/frontend/pos-web` *(¡Muy importante!)*.
   - **Build command**: `npm run build`.
   - **Build output directory**: `dist`.
6. Haz clic en **Save and Deploy**.
7. En unos 60 segundos, Cloudflare compilará y desplegará tu app en un subdominio gratuito (ej. `https://pos-wpcbajio.pages.dev`).

---

## 🔗 Vincular tu Dominio Personalizado (`pos.wpcbajio.com`)

Una vez desplegado el proyecto en Cloudflare Pages:

1. Dentro de tu proyecto en Cloudflare Pages, ve a la pestaña **Custom domains**.
2. Haz clic en **Set up a custom domain**.
3. Escribe: `pos.wpcbajio.com`.
4. Haz clic en **Continue**.
5. Como tu dominio `wpcbajio.com` ya está administrado en la misma cuenta de Cloudflare, el sistema te mostrará **Activate domain** y creará el registro DNS de forma 100% automática.
6. ¡Listo! En segundos podrás ingresar a `https://pos.wpcbajio.com` desde cualquier computadora, laptop, tablet o celular.
