# Git y publicación

Repositorio: https://github.com/chrisperez2910/Teatro_UCB_React

## Incorporar los commits de esta entrega

El ZIP incluye `cambios-teatro.bundle`, que conserva los commits nuevos y el historial del repositorio. No incluye contraseñas ni una sesión de GitHub.

Si ya tienes un clon del repositorio, guarda primero tus cambios locales. Copia el bundle a una carpeta fuera del clon y ejecuta dentro de tu repositorio, ajustando la ruta:

```powershell
git status
git fetch 'C:\ruta\cambios-teatro.bundle' main
git merge --ff-only FETCH_HEAD
git push origin main
```

Si el merge informa que no puede avanzar directamente, no uses `--force`: tu clon tiene otros cambios que deben integrarse.

También puedes reconstruir el repositorio completo desde el bundle:

```powershell
git clone '.\cambios-teatro.bundle' Teatro_UCB_React
cd Teatro_UCB_React
git remote set-url origin https://github.com/chrisperez2910/Teatro_UCB_React.git
git push -u origin main
```

Los commits ya existen en el bundle. No necesitas repetirlos manualmente.

## Actualizar GitHub Pages

Después de incorporar los cambios, dentro del repositorio:

```powershell
npm.cmd ci
$env:VITE_USE_API = 'false'
npm.cmd run deploy
```

Este comando usa el despliegue `gh-pages` que ya tenía el proyecto. El repositorio debe seguir publicando desde la rama `gh-pages`. Comprueba el estado en Settings → Pages.

GitHub Pages sirve el catálogo estático; no ejecuta Node.js ni PostgreSQL. Las reservas no se confirman en el navegador cuando no existe un servidor conectado. La administración y los reportes se muestran al ejecutar la aplicación completa.

## Ejecutar la versión completa compilada

Esta versión puede servir la interfaz y la API desde el mismo servidor, lo que evita depender de cookies entre dominios distintos.

```powershell
$env:DATABASE_URL = 'postgresql://postgres:TU_CLAVE@localhost:5432/teatro_ucb'
npm.cmd run db:setup
npm.cmd run build:full
$env:SERVE_FRONTEND = 'true'
$env:APP_ORIGIN = 'http://localhost:3001'
npm.cmd start
```

Abre http://localhost:3001. `build:full` activa el modo conectado; `npm start` sirve el contenido de `dist` y la API. Para volver a `dev:full`, restablece `APP_ORIGIN` a `http://localhost:5173` en esa terminal.

## Llevar el sistema completo a internet

Necesitas un alojamiento que ejecute Node.js y una base PostgreSQL. Configura estas variables en el servidor:

- `DATABASE_URL`: conexión privada a PostgreSQL.
- `APP_ORIGIN`: dirección HTTPS exacta de la aplicación, sin barra final.
- `SERVE_FRONTEND=true`.
- `COOKIE_SECURE=true`.
- `API_HOST=0.0.0.0` para que el alojamiento pueda recibir las conexiones.
- `PORT` o `API_PORT`: puerto asignado por el alojamiento.

Instalación y compilación: `npm ci` y `npm run build:full`. Aplica `npm run db:setup` con la conexión configurada y arranca con `npm start`. Conserva HTTPS y el mismo dominio para la interfaz y API. El catálogo estático de Pages puede mantenerse como presentación, pero no es el servidor de reservas.

Antes de abrirlo al público, confirma la programación con el responsable del teatro y define el uso de los datos de contacto. El sistema no incluye pagos, verificación del correo ni recuperación de contraseña. Los límites de intentos de login actuales son por proceso; si despliegas varias instancias, necesitan almacenamiento compartido.
