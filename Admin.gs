/**
 * SPACE WINGS · API DEL PANEL DE ADMINISTRADOR
 * -------------------------------------------------------------
 * Proyecto de Apps Script INDEPENDIENTE del que recibe los pedidos
 * (así no se toca nada de lo que ya funciona).
 * Versión "todo en Apps Script": este mismo proyecto muestra el panel (Panel.html),
 * no necesitas GitHub ni Cloudflare para el panel.
 *
 * Qué hace:
 *   - Valida una contraseña (guardada en Propiedades de la secuencia de comandos).
 *   - Lee y guarda SOLO las columnas editables de:
 *       Platillos web  -> Precio, Disponible, Medias
 *       Combos WEB     -> Precio, Disponible
 *       Salsas WEB     -> Intensidad, Sabor, Disponible
 *       Configuracion  -> Apertura, Cierre, Dias_Cerrado, Mensaje
 *       Anuncios       -> marquesina y mensaje secreto (hoja nueva, se crea sola)
 */

const ID_DOCUMENTO = '1NrAc-IfSDmd8trVwy1_AkAG3D5gkZYoDqQyvNgULyCk';
const MAX_INTENTOS = 5;          // intentos fallidos antes de bloquear
const BLOQUEO_SEG = 600;         // 10 minutos
const SESION_SEG = 6 * 60 * 60;  // 6 horas (máximo que permite CacheService)

/* ---------- Puntos de entrada ---------- */
// Al abrir la URL de la aplicación web se muestra el panel (archivo Panel.html).
function doGet() {
  return HtmlService.createHtmlOutputFromFile('Panel')
    .setTitle('Space Wings · Administrador')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1, viewport-fit=cover')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

// Lo llama el panel con google.script.run
function apiAdmin(req) {
  try {
    if (req.accion === 'login') return login_(req.clave, req.recordar);
    if (!sesionValida_(req.token)) return { ok: false, error: 'sesion', mensaje: 'Sesión expirada. Vuelve a entrar.' };
    if (req.accion === 'leer') return { ok: true, datos: leerTodo_() };
    if (req.accion === 'pedidos') { sincronizarSeguimientoSuave_(); return { ok: true, pedidos: leerPedidos_() }; }
    if (req.accion === 'estatus') return cambiarEstatus_(req);
    if (req.accion === 'guardar') return guardar_(req.cambios || {});
    if (req.accion === 'salir') { olvidarToken_(req.token); return { ok: true }; }
    if (req.accion === 'salirTodos') { olvidarTodos_(); return { ok: true }; }
    return { ok: false, mensaje: 'Acción no válida' };
  } catch (err) {
    return { ok: false, mensaje: 'Error: ' + err.message };
  }
}

/* ---------- Autenticación ---------- */
const DISPOSITIVO_DIAS = 30;     // "Recordar este dispositivo"
const DISPOSITIVO_CACHE_SEG = 600; // se revalida cada 10 min

function hashToken_(t) {
  return Utilities.base64EncodeWebSafe(Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, String(t)));
}

function login_(clave, recordar) {
  const cache = CacheService.getScriptCache();
  const fallos = Number(cache.get('fallos') || 0);
  if (fallos >= MAX_INTENTOS) return { ok: false, mensaje: 'Demasiados intentos. Espera 10 minutos.' };
  const real = PropertiesService.getScriptProperties().getProperty('ADMIN_PASSWORD');
  if (!real) return { ok: false, mensaje: 'Falta configurar ADMIN_PASSWORD en el script.' };
  if (!clave || String(clave) !== real) {
    cache.put('fallos', String(fallos + 1), BLOQUEO_SEG);
    Utilities.sleep(800);
    return { ok: false, mensaje: 'Contraseña incorrecta.' };
  }
  cache.remove('fallos');
  const token = Utilities.getUuid() + Utilities.getUuid() + Utilities.getUuid();
  if (recordar) {
    const props = PropertiesService.getScriptProperties();
    purgarDispositivos_(props);
    props.setProperty('dev_' + hashToken_(token), String(Date.now() + DISPOSITIVO_DIAS * 86400000));
    return { ok: true, token: token, recordado: true, dias: DISPOSITIVO_DIAS };
  }
  cache.put('tok_' + token, '1', SESION_SEG);
  return { ok: true, token: token };
}

function sesionValida_(token) {
  if (!token) return false;
  const cache = CacheService.getScriptCache();
  if (cache.get('tok_' + token) === '1') return true;
  const h = hashToken_(token);
  const props = PropertiesService.getScriptProperties();
  const exp = Number(props.getProperty('dev_' + h) || 0);
  if (!exp) return false;
  if (Date.now() > exp) { props.deleteProperty('dev_' + h); return false; }
  cache.put('tok_' + token, '1', DISPOSITIVO_CACHE_SEG);
  return true;
}

function olvidarToken_(token) {
  if (!token) return;
  CacheService.getScriptCache().remove('tok_' + token);
  PropertiesService.getScriptProperties().deleteProperty('dev_' + hashToken_(token));
}

// Cierra la sesión de TODOS los dispositivos recordados
function olvidarTodos_() {
  const props = PropertiesService.getScriptProperties();
  Object.keys(props.getProperties()).forEach(k => { if (k.indexOf('dev_') === 0) props.deleteProperty(k); });
}

function purgarDispositivos_(props) {
  const todas = props.getProperties(), ahora = Date.now();
  Object.keys(todas).forEach(k => { if (k.indexOf('dev_') === 0 && Number(todas[k]) < ahora) props.deleteProperty(k); });
}

/** Ejecútala desde el editor si pierdes un teléfono: cierra la sesión recordada en TODOS los dispositivos. */
function cerrarTodasLasSesiones() { olvidarTodos_(); Logger.log('Listo: todas las sesiones recordadas fueron cerradas.'); }

/* ---------- Lectura ---------- */
function hoja_(nombre) {
  const sh = SpreadsheetApp.openById(ID_DOCUMENTO).getSheetByName(nombre);
  if (!sh) throw new Error('No existe la pestaña "' + nombre + '"');
  return sh;
}

function leerTodo_() {
  const platillos = hoja_('Platillos web').getDataRange().getDisplayValues().slice(1)
    .filter(f => f[0]).map(f => ({ id: f[0], categoria: f[1], producto: f[2], precio: f[3], disponible: f[4], medias: f[6] }));
  const combos = hoja_('Combos WEB').getDataRange().getDisplayValues().slice(1)
    .filter(f => f[0]).map(f => ({ id: f[0], producto: f[2], precio: f[3], disponible: f[4] }));
  const salsas = hoja_('Salsas WEB').getDataRange().getDisplayValues().slice(1)
    .filter(f => f[0]).map(f => ({ id: f[0], intensidad: f[1], sabor: f[2], disponible: f[4] }));
  const c = hoja_('Configuracion').getRange('A2:D2').getDisplayValues()[0];
  const config = { apertura: c[0], cierre: c[1], dias: c[2], mensaje: c[3] };
  const anuncios = leerAnuncios_();
  return { platillos: platillos, combos: combos, salsas: salsas, config: config, anuncios: anuncios };
}

/* ---------- Hoja Anuncios (Clave | Valor) ---------- */
const ANUNCIOS_DEFECTO = [
  ['whatsapp', '523411594355'],
  ['whatsapp_activo', 'SI'],
  ['seguimiento_activo', 'SI'],
  ['msg_recibido', 'Hola {nombre} 👋 ¡Recibimos tu pedido en Space Wings! Total: {total}. Tiempo estimado: {tiempo}. Gracias 🚀'],
  ['msg_en_ruta', 'Hola {nombre}, tu pedido de Space Wings ya va en camino 🛵🚀'],
  ['msg_entregado', '¡Listo {nombre}! Tu pedido de Space Wings fue entregado. Gracias por tu preferencia, ¡buen provecho! 🚀'],
  ['tiempo_entrega', '30-40 min'],
  ['tiempo_recoger', '15-20 min'],
  ['marquesina_activa', 'NO'],
  ['marquesina_etiqueta', '🚀'],
  ['marquesina_texto', '⚠️ ALERTA EN LA ESTACIÓN: escribe aquí tu anuncio. Usa **doble asterisco** para resaltar.'],
  ['secreto_activo', 'NO'],
  ['secreto_bloqueo_etiqueta', '🔒 Acceso Restringido'],
  ['secreto_bloqueo_titulo', 'TRANSMISIÓN SECRETA'],
  ['secreto_bloqueo_texto', 'Inicia el escaneo digital para desbloquear la recompensa de vuelo disponible el día de hoy.'],
  ['secreto_boton', 'INICIAR ESCANEO'],
  ['secreto_abierto_etiqueta', '🔓 Acceso Concedido'],
  ['secreto_abierto_titulo', 'RECOMPENSA INTERCEPTADA'],
  ['secreto_abierto_texto', 'Transmisión desde la Base Madre para pilotos experimentados:'],
  ['mision_1_dias', 'Jueves'],
  ['mision_1_etiqueta', '🚀 MISIÓN JUEVES'],
  ['mision_1_texto', 'En la compra de **$200 o más**, ¡llévate un **refresco de 1.5 L de REGALO**!'],
  ['mision_2_dias', 'Viernes'],
  ['mision_2_etiqueta', '🚀 MISIÓN VIERNES'],
  ['mision_2_texto', 'En la compra de **$300 o más**, ¡llévate **media orden de snack de REGALO**!'],
  ['mision_3_dias', 'Sábado'],
  ['mision_3_etiqueta', '🚀 MISIÓN SÁBADO'],
  ['mision_3_texto', 'En la compra de **$200 o más** llévate un **refresco de 1.5 L de REGALO**.']
];
const CLAVES_ANUNCIOS = ANUNCIOS_DEFECTO.map(f => f[0]);

function hojaAnuncios_() {
  const ss = SpreadsheetApp.openById(ID_DOCUMENTO);
  let sh = ss.getSheetByName('Anuncios');
  if (!sh) {
    sh = ss.insertSheet('Anuncios');
    sh.getRange(1, 1, 1, 2).setValues([['Clave', 'Valor']]).setFontWeight('bold');
    sh.getRange(2, 1, ANUNCIOS_DEFECTO.length, 2).setNumberFormat('@').setValues(ANUNCIOS_DEFECTO);
    sh.setColumnWidth(1, 220); sh.setColumnWidth(2, 600);
  }
  return sh;
}

function leerAnuncios_() {
  const sh = hojaAnuncios_();
  const filas = sh.getDataRange().getDisplayValues().slice(1);
  const out = {}, existentes = {};
  filas.forEach(f => { if (f[0]) { out[f[0]] = f[1]; existentes[f[0]] = true; } });
  // Migración: si falta alguna clave nueva (p. ej. tiempos o whatsapp), se escribe en la hoja como texto
  const faltan = ANUNCIOS_DEFECTO.filter(f => !existentes[f[0]]);
  if (faltan.length) {
    const ini = sh.getLastRow() + 1;
    sh.getRange(ini, 1, faltan.length, 2).setNumberFormat('@').setValues(faltan);
    faltan.forEach(f => out[f[0]] = f[1]);
  }
  return out;
}


/* ---------- Guardado (validado) ---------- */
function estado3_(v) { const u = String(v).toUpperCase().trim(); return u === 'SI' ? 'SI' : (u === 'OCULTO' ? 'OCULTO' : 'NO'); }
function si_(v) { return String(v).toUpperCase() === 'SI' ? 'SI' : 'NO'; }
function precio_(v) {
  const n = Number(v);
  if (!isFinite(n) || n < 0 || n > 99999) throw new Error('Precio inválido: ' + v);
  return Math.round(n * 100) / 100;
}
function texto_(v, max) { return String(v == null ? '' : v).replace(/[\u0000-\u001f]/g, ' ').trim().slice(0, max || 500); }
function hora_(v) {
  const m = /^([01]?\d|2[0-3]):([0-5]\d)$/.exec(String(v).trim());
  if (!m) throw new Error('Hora inválida (usa HH:MM): ' + v);
  return ('0' + m[1]).slice(-2) + ':' + m[2];
}

function guardar_(c) {
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(10000)) return { ok: false, mensaje: 'El sistema está ocupado, intenta de nuevo.' };
  try {
    let cuenta = 0;
    // Platillos: D Precio, E Disponible, G Medias
    if (c.platillos && c.platillos.length) {
      const sh = hoja_('Platillos web'), ids = sh.getRange('A:A').getValues().map(r => String(r[0]));
      c.platillos.forEach(p => {
        const fila = ids.indexOf(String(p.id)) + 1; if (fila < 2) throw new Error('Platillo no encontrado: ' + p.id);
        sh.getRange(fila, 4).setValue(precio_(p.precio));
        sh.getRange(fila, 5).setValue(estado3_(p.disponible));
        sh.getRange(fila, 7).setValue(si_(p.medias)); cuenta++;
      });
    }
    // Combos: D Precio, E Disponible
    if (c.combos && c.combos.length) {
      const sh = hoja_('Combos WEB'), ids = sh.getRange('A:A').getValues().map(r => String(r[0]));
      c.combos.forEach(p => {
        const fila = ids.indexOf(String(p.id)) + 1; if (fila < 2) throw new Error('Combo no encontrado: ' + p.id);
        sh.getRange(fila, 4).setValue(precio_(p.precio));
        sh.getRange(fila, 5).setValue(estado3_(p.disponible)); cuenta++;
      });
    }
    // Salsas: B Intensidad, C Sabor, E Disponible
    if (c.salsas && c.salsas.length) {
      const sh = hoja_('Salsas WEB'), ids = sh.getRange('A:A').getValues().map(r => String(r[0]));
      c.salsas.forEach(p => {
        const fila = ids.indexOf(String(p.id)) + 1; if (fila < 2) throw new Error('Salsa no encontrada: ' + p.id);
        const inten = Math.round(Number(p.intensidad));
        if (!(inten >= 0 && inten <= 10)) throw new Error('Intensidad inválida (0 a 10)');
        sh.getRange(fila, 2).setValue(inten);
        sh.getRange(fila, 3).setValue(texto_(p.sabor, 60));
        sh.getRange(fila, 5).setValue(si_(p.disponible)); cuenta++;
      });
    }
    // Horario: A Apertura, B Cierre, C Días, D Mensaje (se guardan como TEXTO, igual que hoy)
    if (c.config) {
      const sh = hoja_('Configuracion'), r = sh.getRange('A2:D2');
      r.setNumberFormat('@');
      const dias = String(c.config.dias || '').split(',').map(d => d.trim()).filter(Boolean)
        .filter(d => ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'].indexOf(d) > -1);
      r.setValues([[hora_(c.config.apertura), hora_(c.config.cierre), dias.join(','), texto_(c.config.mensaje, 300)]]);
      cuenta++;
    }
    // Anuncios
    if (c.anuncios) {
      const sh = hojaAnuncios_(), datos = sh.getDataRange().getValues(), mapa = {};
      datos.forEach((f, i) => { if (i > 0 && f[0]) mapa[f[0]] = i + 1; });
      Object.keys(c.anuncios).forEach(k => {
        if (CLAVES_ANUNCIOS.indexOf(k) < 0) return;           // solo claves conocidas
        const esSwitch = /_activo$/.test(k);
        let val = esSwitch ? si_(c.anuncios[k]) : texto_(c.anuncios[k], 700);
        if (k === 'whatsapp') {
          let d = String(val).replace(/\D/g, '');
          if (d.length === 10) d = '52' + d;
          if (d.length < 12 || d.length > 15) throw new Error('Número de WhatsApp inválido. Escribe 10 dígitos (ej. 3411594355) o con lada de país (523411594355).');
          val = d;
        }
        if (mapa[k]) sh.getRange(mapa[k], 2).setNumberFormat('@').setValue(val);
        else { const fila = sh.getLastRow() + 1; sh.getRange(fila, 1, 1, 2).setNumberFormat('@').setValues([[k, val]]); }
        cuenta++;
      });
    }
    SpreadsheetApp.flush();
    return { ok: true, guardados: cuenta };
  } catch (err) {
    return { ok: false, mensaje: err.message };
  } finally {
    lock.releaseLock();
  }
}

/* ---------- Pedidos (hoja "ordenes por intenet") ---------- */
const NOMBRE_ORDENES = 'ordenes por intenet';       // nombre de la pestaña donde caen los pedidos
const ESTATUS_VALIDOS = ['Recibido', 'En Ruta', 'Entregado', 'Cancelado'];
const MAX_PEDIDOS = 120;                              // cuántos pedidos recientes se muestran

function norm_(s) { return String(s == null ? '' : s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim(); }

function hojaOrdenes_() {
  const hojas = SpreadsheetApp.openById(ID_DOCUMENTO).getSheets();
  const buscado = norm_(NOMBRE_ORDENES);
  let sh = hojas.filter(h => norm_(h.getName()) === buscado)[0];
  if (!sh) sh = hojas.filter(h => /orden/.test(norm_(h.getName())) && /inte/.test(norm_(h.getName())))[0];
  if (!sh) throw new Error('No encuentro la pestaña de pedidos "' + NOMBRE_ORDENES + '". Revisa NOMBRE_ORDENES en Admin.gs');
  return sh;
}

// Localiza las columnas por el ENCABEZADO (fila 1), no por posición.
function columnasOrdenes_(sh) {
  const enc = sh.getRange(1, 1, 1, sh.getLastColumn()).getDisplayValues()[0].map(norm_);
  const col = {};
  enc.forEach((h, i) => {
    const c = i + 1;
    if (h === 'fecha') col.fecha = c;
    else if (h === 'nombre') col.nombre = c;
    else if (h.indexOf('metodo') === 0) col.metodo = c;
    else if (h === 'calle') col.calle = c;
    else if (h === 'colonia') col.colonia = c;
    else if (h.indexOf('telefono') === 0) col.telefono = c;
    else if (h === 'productos') col.productos = c;
    else if (h.replace(/\s/g, '') === 'subtotal') col.subtotal = c;
    else if (h.indexOf('envio') > -1) col.envio = c;
    else if (h === 'total') col.total = c;
    else if (h.indexOf('estatus') === 0 || h.indexOf('estado') === 0) col.estatus = c;
  });
  ['fecha', 'nombre', 'productos', 'estatus'].forEach(k => { if (!col[k]) throw new Error('Falta la columna "' + k + '" en la hoja de pedidos'); });
  return col;
}

function leerPedidos_() {
  const sh = hojaOrdenes_(), col = columnasOrdenes_(sh), ult = sh.getLastRow();
  if (ult < 2) return [];
  const ini = Math.max(2, ult - MAX_PEDIDOS + 1), n = ult - ini + 1;
  const v = sh.getRange(ini, 1, n, sh.getLastColumn()).getDisplayValues();
  const val = (f, k) => col[k] ? f[col[k] - 1] : '';
  const out = [];
  v.forEach((f, i) => {
    if (!val(f, 'fecha') && !val(f, 'nombre') && !val(f, 'productos')) return;   // filas vacías
    out.push({ fila: ini + i, fecha: val(f, 'fecha'), nombre: val(f, 'nombre'), metodo: val(f, 'metodo'), calle: val(f, 'calle'),
      colonia: val(f, 'colonia'), telefono: val(f, 'telefono'), productos: val(f, 'productos'), subtotal: val(f, 'subtotal'),
      envio: val(f, 'envio'), total: val(f, 'total'), estatus: val(f, 'estatus') });
  });
  return out.reverse();   // más recientes primero
}

// Cambia SOLO la celda "Estatus". Comprueba fecha y teléfono para no tocar otro pedido si las filas se movieron.
function cambiarEstatus_(p) {
  if (ESTATUS_VALIDOS.indexOf(p.estatus) < 0) return { ok: false, mensaje: 'Estatus no válido' };
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(10000)) return { ok: false, mensaje: 'El sistema está ocupado, intenta de nuevo.' };
  try {
    const sh = hojaOrdenes_(), col = columnasOrdenes_(sh), fila = Number(p.fila);
    if (!(fila >= 2 && fila <= sh.getLastRow())) return { ok: false, mensaje: 'Pedido no encontrado. Actualiza la lista.' };
    const actual = sh.getRange(fila, 1, 1, sh.getLastColumn()).getDisplayValues()[0];
    if (String(actual[col.fecha - 1]) !== String(p.fecha || '') ||
        (col.telefono && String(actual[col.telefono - 1]) !== String(p.telefono || ''))) {
      return { ok: false, mensaje: 'El pedido cambió de lugar. Actualiza la lista.' };
    }
    sh.getRange(fila, col.estatus).setValue(p.estatus);
    SpreadsheetApp.flush();
    try { sincronizarSeguimiento_(); } catch (e) {}
    return { ok: true };
  } catch (err) {
    return { ok: false, mensaje: err.message };
  } finally {
    lock.releaseLock();
  }
}

/* ---------- Seguimiento público (solo estatus; sin nombres ni direcciones) ---------- */
// La página de pedidos lee esta pestaña para mostrarle al cliente en qué va su pedido.
// Una fila por pedido: Codigo (hash del teléfono) | Pedido (hora del pedido, ms) | Estatus | Actualizado | Fecha (texto de la hoja)
const HOJA_SEGUIMIENTO = 'Seguimiento';
const SEG_ENCABEZADO = ['Codigo', 'Pedido', 'Estatus', 'Actualizado', 'Fecha'];

function hojaSeguimiento_() {
  const ss = SpreadsheetApp.openById(ID_DOCUMENTO);
  let sh = ss.getSheetByName(HOJA_SEGUIMIENTO);
  if (!sh) sh = ss.insertSheet(HOJA_SEGUIMIENTO);
  const enc = sh.getLastRow() ? sh.getRange(1, 1, 1, 5).getDisplayValues()[0] : [];
  if (enc.join('|') !== SEG_ENCABEZADO.join('|')) {          // hoja nueva o con formato anterior: se reinicia
    sh.clear();
    sh.getRange('A:E').setNumberFormat('@');
    sh.getRange(1, 1, 1, 5).setValues([SEG_ENCABEZADO]).setFontWeight('bold');
  }
  return sh;
}

// Código = SHA-256 de los últimos 10 dígitos del teléfono (primeros 16 caracteres hex). La página calcula el mismo.
function codigoTel_(tel) {
  const d = String(tel || '').replace(/\D/g, '').slice(-10);
  if (d.length < 10) return '';
  const bytes = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, d, Utilities.Charset.UTF_8);
  return bytes.map(b => ('0' + (b & 0xff).toString(16)).slice(-2)).join('').slice(0, 16);
}

function sincronizarSeguimiento_() {
  const sh = hojaOrdenes_(), col = columnasOrdenes_(sh), ult = sh.getLastRow();
  if (ult < 2) return;
  const ini = Math.max(2, ult - 39), n = ult - ini + 1, w = sh.getLastColumn();
  const vals = sh.getRange(ini, 1, n, w).getValues(), disp = sh.getRange(ini, 1, n, w).getDisplayValues();
  const seg = hojaSeguimiento_(), datos = seg.getDataRange().getValues(), fila = {};
  datos.forEach((f, i) => { if (i > 0 && f[0]) fila[f[0] + '|' + f[4]] = { n: i + 1, e: String(f[2]) }; });
  const ahora = Date.now(), vistos = {};
  for (let i = 0; i < n; i++) {
    const d = disp[i], tel = col.telefono ? d[col.telefono - 1] : '';
    const cod = codigoTel_(tel); if (!cod) continue;
    const fBase = String(d[col.fecha - 1] || ''); if (!fBase) continue;
    // Varios pedidos del mismo teléfono en el mismo minuto: cada uno es distinto (1º, 2º, 3º…)
    const occ = vistos[cod + '|' + fBase] = (vistos[cod + '|' + fBase] == null ? 0 : vistos[cod + '|' + fBase] + 1);
    const fTxt = occ ? fBase + '#' + occ : fBase;
    const fv = vals[i][col.fecha - 1];
    const e = ESTATUS_VALIDOS.filter(s => norm_(s) === norm_(d[col.estatus - 1]))[0] || 'Recibido';
    const ex = fila[cod + '|' + fTxt];
    if (ex) {
      if (ex.e !== e) seg.getRange(ex.n, 3, 1, 2).setNumberFormat('@').setValues([[e, String(ahora)]]);
    } else {
      const ts = ((fv instanceof Date) ? fv.getTime() : ahora) + occ;   // +occ: marca única aunque coincida el minuto
      seg.getRange(seg.getLastRow() + 1, 1, 1, 5).setNumberFormat('@').setValues([[cod, String(ts), e, String(ahora), fTxt]]);
    }
  }
  // limpieza: se quitan los de más de 3 días
  const todos = seg.getDataRange().getValues();
  for (let r = todos.length - 1; r >= 1; r--) if (Number(todos[r][1]) < ahora - 3 * 86400000) seg.deleteRow(r + 1);
}

// Versión ligera para llamarla seguido desde el panel (máx. una vez cada 20 s)
function sincronizarSeguimientoSuave_() {
  const cache = CacheService.getScriptCache();
  if (cache.get('seg_sync')) return;
  cache.put('seg_sync', '1', 20);
  try { sincronizarSeguimiento_(); } catch (e) {}
}

/** OPCIONAL, ejecútala una vez: actualiza el seguimiento cada minuto aunque el panel esté cerrado
 *  (también refleja los cambios de estatus que hagas directo en la hoja). */
function activarSeguimientoAuto() {
  ScriptApp.getProjectTriggers().filter(t => t.getHandlerFunction() === 'sincronizarSeguimientoSuave_').forEach(t => ScriptApp.deleteTrigger(t));
  ScriptApp.newTrigger('sincronizarSeguimientoSuave_').timeBased().everyMinutes(1).create();
  sincronizarSeguimiento_();
  Logger.log('Seguimiento automático activado (cada minuto).');
}
function desactivarSeguimientoAuto() {
  ScriptApp.getProjectTriggers().filter(t => t.getHandlerFunction() === 'sincronizarSeguimientoSuave_').forEach(t => ScriptApp.deleteTrigger(t));
  Logger.log('Seguimiento automático desactivado.');
}

/** Ejecuta esta función UNA VEZ desde el editor para crear la hoja "Anuncios" y autorizar permisos. */
function configuracionInicial() {
  hojaAnuncios_();
  Logger.log('Listo. Ahora agrega ADMIN_PASSWORD en Propiedades de la secuencia de comandos.');
}

/**
 * EJECUTAR UNA SOLA VEZ para activar el estado "Oculto" en los COMBOS.
 * Crea un respaldo de "Hoja 1" y ajusta las fórmulas de la columna E de los combos para que
 * "Oculto" llegue a la página (los platillos ya lo transmiten sin cambios). Es seguro repetirla.
 */
function activarTresEstados() {
  const ss = SpreadsheetApp.openById(ID_DOCUMENTO), sh = ss.getSheetByName('Hoja 1');
  if (!sh) throw new Error('No encuentro la pestaña "Hoja 1"');
  const copia = sh.copyTo(ss); copia.setName('Respaldo Hoja 1 ' + Utilities.formatDate(new Date(), 'America/Mexico_City', 'yyyy-MM-dd HHmm'));
  ss.setActiveSheet(sh);
  const rango = sh.getRange(1, 5, sh.getLastRow(), 1), f = rango.getFormulas();
  let cambios = 0;
  const re = /^=IF\((VLOOKUP\([^)]*'Combos WEB'[^)]*\))="No","No",([\s\S]*)\)$/;
  for (let i = 0; i < f.length; i++) {
    const m = re.exec(f[i][0]);
    if (m) { f[i][0] = '=IF(' + m[1] + '="Oculto","Oculto",IF(' + m[1] + '="No","No",' + m[2] + '))'; cambios++; }
  }
  if (cambios) rango.setFormulas(f);
  Logger.log('Fórmulas de combos actualizadas: ' + cambios + '. Respaldo: ' + copia.getName());
}
