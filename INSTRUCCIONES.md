# Panel de administrador · Space Wings

## Qué incluye
| Archivo | Para qué sirve | Dónde va |
|---|---|---|
| `admin.html` | El panel (precios, disponibilidad, medias, salsas, horario, anuncios) | Rama `desarrollo` del repositorio |
| `Admin.gs` | Código del "servidor" que guarda en tu hoja de cálculo | Un proyecto NUEVO de Apps Script |
| `index.html` | Ahora lee la marquesina y el mensaje secreto desde la hoja | Rama `desarrollo` |
| `pedido.html` | Rediseño + aviso "agregado" (sin abrir el carrito) | Rama `desarrollo` |
| `ofuscar.yml` | Igual que el tuyo, pero también procesa `admin.html` | `.github/workflows/` |

## Paso 1 · Crear el servidor del panel (una sola vez, 5 minutos)
1. Abre https://script.google.com con la misma cuenta dueña de la hoja → **Nuevo proyecto**. Nómbralo "Space Wings Admin".
   (Es un proyecto aparte del que recibe los pedidos: no toca lo que ya funciona.)
2. Borra el contenido y pega todo el archivo `Admin.gs`. Guarda.
3. En el menú de funciones elige `configuracionInicial` y pulsa **Ejecutar**. Acepta los permisos (acceso a tus hojas de cálculo).
   Esto crea la pestaña **Anuncios** en tu Excel/Google Sheets con textos de ejemplo.
4. Ícono de engrane ⚙️ **Configuración del proyecto** → **Propiedades de la secuencia de comandos** → **Agregar propiedad**:
   `ADMIN_PASSWORD` = la contraseña que tú quieras (larga; no la compartas).
5. **Implementar → Nueva implementación → Aplicación web**
   - Ejecutar como: **Yo**
   - Quién tiene acceso: **Cualquier persona**
   - Implementar y copia la **URL de la aplicación web** (termina en `/exec`).
   Cada vez que cambies `Admin.gs` tendrás que crear una *nueva versión* de la implementación.

## Paso 2 · Conectar el panel
1. Abre `admin.html` y en la parte del script cambia:
   `const URL_ADMIN = 'PEGA_AQUI_LA_URL_DEL_APPS_SCRIPT_ADMIN';` por tu URL `/exec`.
2. Sube a la rama `desarrollo`: `admin.html`, `index.html`, `pedido.html` y `.github/workflows/ofuscar.yml`.
3. Cuando termine el Action, entra a `https://space-wings.pages.dev/admin.html` (guárdalo en favoritos; no hay enlace desde la página pública).

## Cómo se usa
- **Platillos / Combos**: cambia el precio con el teclado, apaga lo agotado con el interruptor. Las filas modificadas se marcan en amarillo.
  Abajo aparece **Guardar N cambios**. Al guardar, la página de pedidos ya muestra lo nuevo (puede tardar ~1 minuto por el caché de Google).
- **Medias**: activa si el platillo se puede pedir en media orden.
- **Salsas**: apaga una salsa para ocultarla del menú, o cambia su nombre/intensidad.
- **Horario**: apertura, cierre, días cerrado y el mensaje.
- **Anuncios**: marquesina y mensaje secreto. Cada mensaje secreto se muestra solo los días que marques (ya no hay que comentar código). Usa `**texto**` para resaltar en cian.

## Seguridad
- La contraseña vive solo en Apps Script (no está en el código de la página). 5 intentos fallidos bloquean 10 minutos.
- La sesión dura 6 horas; el panel solo puede editar las columnas permitidas (no puede borrar filas ni tocar `Ordenes`).
- Usa una contraseña única. Cualquiera con la URL y la contraseña puede editar precios.

## Límites actuales (decisiones de diseño)
- No agrega ni elimina productos/salsas: `Hoja 1` usa fórmulas fijas por fila, así que eso se sigue haciendo en el Excel. Se puede añadir después ajustando esas fórmulas.
- La pestaña `Anuncios` no se edita a mano normalmente; el panel la maneja.
- Si algún día el sitio no encuentra la pestaña `Anuncios`, la marquesina y el secreto simplemente no se muestran (como hoy).

## Tres estados: Disponible · Agotado · Oculto
En Platillos y Combos cada producto tiene un selector de 3 opciones:
- **Disponible**: se vende normal (`SI` en la hoja).
- **Agotado**: aparece en el menú en gris con el sello "AGOTADO HOY", sin botón de agregar (`NO` en la hoja).
- **Oculto**: no aparece en el menú (`OCULTO` en la hoja).

Los platillos ya transmiten el valor tal cual a la página. **Para los combos** hay que ejecutar UNA vez `activarTresEstados` en Apps Script (editor → elegir la función → Ejecutar):
crea una copia de respaldo de "Hoja 1" y ajusta las fórmulas de la columna E de los combos para que "Oculto" funcione. Es seguro repetirla.
Las salsas siguen con 2 estados (Disponible / No disponible), porque no se muestran como "agotadas".
Un combo marcado "Agotado" se muestra al final con el sello; si solo se agota un ingrediente, el combo sigue disponible con las demás opciones.

## Pedidos desde el panel (pestaña 🧾 Pedidos)
Muestra los pedidos que caen en tu pestaña **"ordenes por intenet"** (los últimos 120), del más nuevo al más viejo:
- Contadores por estatus y filtros **Activos** (Recibido + En Ruta) · **Hoy** · **Todos**.
- Cada pedido: nombre, hora, total, Domicilio/Recoger, dirección, botones de llamar y WhatsApp, productos tal como los ve el cliente.
- Cambia el estatus con un toque: **Recibido · En Ruta · Entregado · Cancelado**. Se escribe de inmediato en la columna *Estatus* de tu hoja (Cancelar pide confirmación).
- La lista se actualiza sola cada 30 segundos mientras la pestaña está abierta; si llega un pedido nuevo suena un aviso y aparece un globo rojo con los pedidos activos.
- El panel solo cambia la celda "Estatus"; no modifica ni borra nada más. Antes de escribir comprueba que la fila sigue siendo ese pedido (fecha y teléfono) por si insertaste filas.
- Las columnas se localizan por el **encabezado** de la fila 1 (Fecha, Nombre, Método de Entrega, Calle, Colonia, Telefono, Productos, Sub total, Costo envio, Total, Estatus). Si renombras la pestaña, cambia `NOMBRE_ORDENES` en Admin.gs.
- Un pedido con Estatus vacío se muestra como "Recibido".

## Instalar como app en el teléfono
Sube también `admin.webmanifest` y los 4 `admin-*.png` junto a `admin.html` (rama `desarrollo`; el workflow ya los copia a `main`).
- **Android (Chrome):** abre `/admin.html` → menú ⋮ → **Instalar aplicación** / Agregar a pantalla de inicio.
- **iPhone (Safari):** botón Compartir → **Agregar a pantalla de inicio**.
Se abre a pantalla completa con el ícono "SW".

## Recordar dispositivo y huella (nuevo)
**IMPORTANTE:** pega el nuevo `Admin.gs` en Apps Script y haz **Implementar → Administrar implementaciones → ✏️ → Versión nueva** (la URL no cambia). Sube el nuevo `admin.html`.
- Al entrar, deja marcada **"Recordar este dispositivo (30 días)"**: no volverás a escribir la contraseña en ese teléfono durante 30 días.
- Botón **🔐** (arriba) → **Activar huella**: la app se bloquea y pide huella al abrirla y al volver tras 1 minuto fuera. La huella solo se valida en el teléfono; nunca se envía.
- La huella requiere abrir la página por HTTPS (tu Cloudflare Pages ya lo es) y tener huella configurada en el teléfono.
- Si pierdes el teléfono o quieres revocar accesos: 🔐 → **Cerrar sesión en todos los dispositivos** (o cambia `ADMIN_PASSWORD` y repite).
- Si no marcas "Recordar", la sesión dura 6 horas y se borra al cerrar la pestaña.

## WhatsApp editable y tiempos (nuevo)
- En la pestaña **Anuncios** hay una tarjeta **📱 WhatsApp de pedidos**: el número al que llegan los pedidos y que se muestra en "Soporte Base" del inicio. Acepta 10 dígitos (ej. 3411594355) o con lada (523411594355). Si no hay número guardado, se usa el que ya tenías.
- Al abrir el panel con el nuevo `Admin.gs` se agregan solas a la hoja "Anuncios" las filas que falten (`whatsapp`, `tiempo_entrega`, `tiempo_recoger`).
- Corregido: los días **Miércoles** y **Sábado** marcados como cerrados no se reconocían en el aviso "Cerrado · abrimos …" (por el acento). Ahora el aviso da el siguiente día abierto correcto.

## Seguimiento del pedido, WhatsApp configurable y botón "Avisar al cliente"

### 1. Interruptor del WhatsApp (panel → Anuncios → "🛵 Envío del pedido y avisos al cliente")
- **Encendido (por defecto):** todo igual que antes: el cliente envía su pedido por WhatsApp y a ti te llega por ahí.
- **Apagado:** el pedido se guarda en la hoja y no se abre WhatsApp al cliente. Úsalo solo si estás pendiente del panel de Pedidos.

### 2. Seguimiento en la página del cliente
- Al hacer su pedido, el cliente ve Enviado → Recibido → En ruta → Entregado; cambia cuando tú cambias el estatus en el panel.
- Si cierra la página y vuelve (desde el mismo teléfono y navegador), arriba del menú ve el aviso de su pedido en curso. Desaparece solo 10 minutos después de Entregado/Cancelado, o a las 3 horas.
- Si hace otro pedido, cada uno se sigue por separado.
- La pestaña **"Seguimiento"** de tu hoja se crea sola y guarda solo un código del teléfono y el estatus (sin nombres ni direcciones). No la edites.
- El seguimiento se actualiza cuando el panel está abierto (revisa cada 20-30 s) o al cambiar un estatus. Para que se actualice también con el panel cerrado, ejecuta UNA vez la función `activarSeguimientoAuto` en Apps Script (opcional; `desactivarSeguimientoAuto` la apaga).

### 3. Avisar al cliente (un toque)
- En cada pedido, botón verde **💬 Confirmar pedido / Avisar: va en camino / Avisar: entregado**: abre WhatsApp con el mensaje listo; solo pulsas enviar.
- Textos editables en Anuncios; usa `{nombre}`, `{total}` y `{tiempo}`.
- Un envío totalmente automático requiere la API de WhatsApp Business o SMS de pago (no incluido).

### Cambios recientes
- **Seguimiento activable:** en Anuncios hay un interruptor "Seguimiento del pedido para el cliente" (por defecto encendido). Apagado, el cliente no ve los pasos ni el aviso al volver a la página.
- **WhatsApp apagado:** el aviso previo al envío ya no menciona WhatsApp; dice que el pedido se envía directo a la estación (y que verá el seguimiento, si está activo).
- **Pedidos en el mismo minuto:** si el mismo cliente hace dos pedidos en el mismo minuto, cada uno se sigue por separado (antes solo se tomaba el primero).
