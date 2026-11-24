# Space Wings · Panel de administración (web instalable)

Sitio estático independiente del sitio de pedidos. Se publica en **Cloudflare Pages** desde este repositorio
y usa un proyecto de **Google Apps Script** (carpeta `apps-script/`) como servidor que lee y escribe la hoja de Space Wings.

## Archivos
- `index.html` — el panel (pedidos, platillos, combos, salsas, horario, anuncios).
- `admin.webmanifest` y `admin-*.png` — permiten instalarlo como app en el teléfono.
- `apps-script/Admin.gs` — código del servidor; **se pega en Apps Script, no se ejecuta desde aquí**.
- `INSTRUCCIONES.md` — guía de configuración.

## Publicar
1. Apps Script: pega `apps-script/Admin.gs`, ejecuta `configuracionInicial`, crea la propiedad `ADMIN_PASSWORD`, implementa como Aplicación web (Ejecutar como: Yo · Acceso: Cualquier persona) y copia la URL `/exec`.
2. En `index.html` reemplaza `PEGA_AQUI_LA_URL_DEL_APPS_SCRIPT_ADMIN` por esa URL.
3. Cloudflare Pages → Create project → Connect to Git → este repositorio.
   - Framework preset: None · Build command: (vacío) · Build output directory: `/`
4. Abre la dirección `*.pages.dev` que te da Cloudflare.

La contraseña no está en el código: vive en las Propiedades de la secuencia de comandos de Apps Script.
