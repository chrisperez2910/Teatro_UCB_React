# Teatro UCB

Portal de teatro universitario desarrollado con React, Vite, Node.js y PostgreSQL. Esta versión permite crear una cuenta, iniciar sesión y guardar reservas e inscripciones asociadas a ella.

Las obras son textos teatrales reales. Los afiches y la imagen principal son ilustrativos; las fechas, duraciones, reseñas y funciones siguen siendo datos de ejemplo. Los videos enlazados pertenecen a otras compañías y se presentan como referencias, no como montajes de la UCB.

## Abrir el proyecto con la base de datos

Necesitas Node.js 22.12 o superior de la rama 22, o Node.js 24 o superior, además de PostgreSQL. Si ya tenías el avance anterior, utiliza la misma base `teatro_ucb`; no hace falta borrarla.

En PowerShell, dentro de la carpeta del proyecto:

```powershell
npm.cmd ci
$env:DATABASE_URL = 'postgresql://postgres:TU_CLAVE@localhost:5432/teatro_ucb'
npm.cmd run db:setup
npm.cmd run dev:full
```

Cambia `TU_CLAVE` por tu contraseña de PostgreSQL y abre el enlace que aparezca en la terminal, normalmente `http://localhost:5173/`. Mantén la terminal abierta. El primer comando necesita internet para instalar las dependencias. El segundo asigna la conexión solo a esta terminal; vuelve a introducirlo cuando abras una nueva.

`db:setup` crea las tablas que faltan, incorpora los campos de cuenta a las tablas anteriores y carga la cartelera de ejemplo. No borra reservas previas. Las antiguas reservas sin cuenta se conservan en la BD y mantienen su ocupación, pero no se asignan automáticamente a ningún usuario ni aparecen en el historial de una cuenta nueva.

Si el puerto 5173 está ocupado, cierra los servidores anteriores antes de iniciar. Si `dev:full` no funciona en tu computadora, la [guía de PostgreSQL](docs/POSTGRESQL.md) explica cómo arrancar la API y React por separado.

## Qué se puede hacer

- Registrar una cuenta e ingresar o cerrar sesión.
- Recorrer la cartelera destacada y filtrar obras por nombre, autor o género.
- Consultar una ficha y acceder a videos de referencia de otras producciones.
- Seleccionar hasta seis butacas y guardar una reserva de prueba en la cuenta.
- Consultar, descargar o cancelar una reserva; la cancelación libera las butacas.
- Inscribirse en talleres de ejemplo y consultar sus cupos.

El servidor verifica que el usuario haya iniciado sesión para reservar y controla las butacas y cupos con transacciones. Las contraseñas se guardan con `scrypt` y sal; las sesiones se gestionan mediante cookies `HttpOnly`. El acceso es una base académica: todavía faltan recuperación de contraseña, verificación de correo y administración de usuarios.

## Carpetas principales

| Ruta                             | Contenido                                                  |
| -------------------------------- | ---------------------------------------------------------- |
| `src/components/` y `src/pages/` | Interfaz, carrusel, formularios y páginas                  |
| `src/TheaterContext.jsx`         | Estado compartido de la sesión y las reservas              |
| `src/services/`                  | Llamadas a la API, validaciones y referencias de las obras |
| `src/styles/`                    | Colores, distribución y diseño responsive                  |
| `server/index.js`                | API, cuentas, sesiones, reservas y talleres                |
| `server/security.js`             | Hash y comprobación de contraseñas                         |
| `server/db/schema.sql`           | Tablas, relaciones y migración de la versión anterior      |
| `server/db/setup.js`             | Creación de tablas y carga de datos iniciales              |
| `public/assets/`                 | Imágenes y afiches ilustrativos                            |
| `public/data/teatro.json`        | Datos de ejemplo utilizados para la carga inicial          |
| `tests/`                         | Pruebas del frontend y de la API                           |
| `docs/`                          | Guías de instalación, React, imágenes y fuentes            |

## Pruebas y modo visual

```powershell
npm.cmd test
npm.cmd run build
```

Para revisar solamente la interfaz sin PostgreSQL, ejecuta `npm.cmd run dev` con `VITE_USE_API` sin activar. En ese modo se usa el archivo JSON y localStorage; las cuentas requieren la API y la BD.

Esta versión está pensada para desarrollo local. Las funciones y reservas no son reales, no se procesan pagos ni se envían correos. Antes de una publicación abierta deben configurarse HTTPS y cookies seguras, recuperación y verificación de cuentas, permisos administrativos, límites de solicitudes compartidos y políticas de datos.
