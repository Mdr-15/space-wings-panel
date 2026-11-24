# Space Wings · Panel de administración (Apps Script)

Panel para editar precios, estados, salsas, horario, anuncios y WhatsApp, y gestionar pedidos de la hoja de Space Wings.
Es un proyecto de Google Apps Script independiente del sitio (repositorio SPACE-WINGS).

## Archivos
- `Admin.gs` — servidor (lee/escribe la hoja, sesión por contraseña).
- `Panel.html` — interfaz del panel.
- `appsscript.json` — manifiesto (zona horaria, despliegue "ejecutar como yo, acceso cualquier persona").
- `INSTRUCCIONES.md` — configuración paso a paso (`ADMIN_PASSWORD`, implementación).

## Importante
- Repositorio **privado** recomendado. No guardes contraseñas aquí: `ADMIN_PASSWORD` vive en *Propiedades de la secuencia de comandos* de Apps Script, no en el código.
- Apps Script no se publica desde GitHub: lo que está aquí es el respaldo/versionado. Para desplegar, pega los archivos en el editor o usa `clasp`.

## Sincronizar con clasp (opcional)
```
npm i -g @google/clasp
clasp login
clasp create --type webapp --title "Space Wings Admin"   # o: clasp clone <SCRIPT_ID>
clasp push
clasp deploy
```
`.clasp.json` (con tu Script ID) está en `.gitignore`.
