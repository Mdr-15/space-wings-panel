# Panel de administrador dentro de Apps Script (sin GitHub ni Cloudflare)

El panel se abre directamente desde la URL de tu Apps Script. No depende de `admin.html`, del repositorio, del caché ni de `sw.js`.

## Pasos
1. https://script.google.com → **Nuevo proyecto** (cuenta dueña de la hoja). Nombre: "Space Wings Admin".
2. En el editor, en `Código.gs`, borra todo y pega el contenido de **Admin.gs**.
3. Botón **+** junto a "Archivos" → **HTML** → nómbralo exactamente **Panel** (queda `Panel.html`). Borra lo que trae y pega todo el contenido de **Panel.html**.
4. Guarda (Ctrl+S). Elige la función `configuracionInicial` y pulsa **Ejecutar**; acepta los permisos. Se crea la pestaña "Anuncios" en tu hoja.
5. ⚙️ **Configuración del proyecto** → **Propiedades de la secuencia de comandos** → agrega `ADMIN_PASSWORD` con tu contraseña.
6. **Implementar → Nueva implementación → Aplicación web**
   - Ejecutar como: **Yo**
   - Quién tiene acceso: **Cualquier persona** (la contraseña protege el panel)
   - Implementar → acepta los permisos → copia la **URL de la aplicación web** (termina en `/exec`).
7. Abre esa URL, escribe la contraseña y entra. Guárdala en favoritos o agrégala a la pantalla de inicio del celular.

## Contraseña y dispositivo recordado
- Acceso **solo por contraseña** (la que pusiste en `ADMIN_PASSWORD`).
- Con **"Recordar este dispositivo (30 días)"** marcado no tendrás que escribirla de nuevo en ese teléfono durante 30 días. Si lo desmarcas, la sesión dura 6 horas.
- 5 intentos fallidos bloquean el acceso 10 minutos.
- Si pierdes un teléfono: en el editor de Apps Script ejecuta la función **`cerrarTodasLasSesiones`** (cierra los dispositivos recordados) y cambia `ADMIN_PASSWORD`.

## Notas
- Si cambias código, **Implementar → Administrar implementaciones → ✏️ → Versión nueva → Implementar** (la URL no cambia).
- La página de pedidos y el index NO cambian: siguen leyendo tu hoja como siempre. El index ya lee la pestaña "Anuncios".
- Con esta opción NO subes `admin.html` ni modificas `ofuscar.yml` (puedes dejar el original).

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
- Filtros con contador: **Activos** · **Recibido** · **En Ruta** · **Entregado** · **Cancelado** · **Hoy** · **Todos**, y buscador por nombre, teléfono o colonia.
- Vista de celular: menú inferior, botón grande de "siguiente paso" (Marcar En Ruta / Entregado) y productos desplegables.
- Cada pedido: nombre, hora, total, Domicilio/Recoger, dirección, botones de llamar y WhatsApp, productos tal como los ve el cliente.
- Cambia el estatus con un toque: **Recibido · En Ruta · Entregado · Cancelado**. Se escribe de inmediato en la columna *Estatus* de tu hoja (Cancelar pide confirmación).
- La lista se actualiza sola cada 30 segundos mientras la pestaña está abierta; si llega un pedido nuevo suena un aviso y aparece un globo rojo con los pedidos activos.
- El panel solo cambia la celda "Estatus"; no modifica ni borra nada más. Antes de escribir comprueba que la fila sigue siendo ese pedido (fecha y teléfono) por si insertaste filas.
- Las columnas se localizan por el **encabezado** de la fila 1 (Fecha, Nombre, Método de Entrega, Calle, Colonia, Telefono, Productos, Sub total, Costo envio, Total, Estatus). Si renombras la pestaña, cambia `NOMBRE_ORDENES` en Admin.gs.
- Un pedido con Estatus vacío se muestra como "Recibido".

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
