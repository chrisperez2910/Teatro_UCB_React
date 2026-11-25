# Teatro UCB

Portal de teatro con cartelera, fichas de obras, reservas de butacas y talleres. Los usuarios pueden crear su cuenta y consultar sus reservas. La administración permite gestionar la sala, programar funciones y revisar los reportes.

## Ejecutar en Windows

Abre la carpeta del proyecto en VS Code. Necesitas Node.js 22.12 o posterior de la rama 22, o Node.js 24 o superior, y PostgreSQL.

En PowerShell:

```powershell
npm.cmd ci
$env:DATABASE_URL = 'postgresql://postgres:TU_CLAVE@localhost:5432/teatro_ucb'
npm.cmd run db:setup
npm.cmd run dev:full
```

Cambia `TU_CLAVE` por la contraseña de PostgreSQL y abre http://localhost:5173. La guía completa está en [docs/POSTGRESQL.md](docs/POSTGRESQL.md).

Si ya tienes la base `teatro_ucb`, consérvala. `db:setup` aplica las migraciones y actualiza las imágenes una sola vez; conserva las cuentas y las reservas. Guarda una copia de la base antes de actualizar.

## Administración

Crea una cuenta desde la página. En otra terminal, con `DATABASE_URL` configurada:

```powershell
npm.cmd run admin:grant -- tu-correo@example.com
```

Recarga la página. En **Administrar** encontrarás:

- **Gestionar butacas:** bloquear o habilitar lugares por función.
- **Programar esta función:** cambiar el horario cuando no haya reservas confirmadas. Se comprueban los solapamientos de la sala.
- **Reportes y decisiones:** ocupación, reservas, cancelaciones, demanda por obra y actividad diaria, con filtros por fecha y obra. Permite descargar CSV e imprimir o guardar PDF.

## Organización

| Carpeta          | Contenido                                                         |
| ---------------- | ----------------------------------------------------------------- |
| `src/components` | Formularios, cartelera, carrusel, mapa de butacas y navegación    |
| `src/pages`      | Inicio, cuentas, obras, reservas, administración y reportes       |
| `src/services`   | Peticiones, validaciones, CSV y reglas de lectura del informe     |
| `src/styles`     | Diseño responsive, fondos teatrales y versión impresa del reporte |
| `server`         | API, sesiones, permisos y consultas de reportes                   |
| `server/db`      | Esquema PostgreSQL, carga inicial y migraciones                   |
| `public/assets`  | Imágenes, audio y video                                           |
| `tests`          | Pruebas de interfaz, reglas de reserva y API                      |

Las contraseñas se guardan con scrypt y sal aleatoria. Las sesiones usan cookies HttpOnly; los permisos se validan en el servidor. Las reservas se confirman en transacciones y una restricción de la BD impide ocupar dos veces la misma butaca de una función.

## Comprobaciones

```powershell
npm.cmd test
npm.cmd run build
```

Las pruebas de integración usan PostgreSQL embebido mediante PGlite, sin modificar tu base personal.

## Publicación

- Repositorio: https://github.com/chrisperez2910/Teatro_UCB_React
- Interfaz en GitHub Pages: https://chrisperez2910.github.io/Teatro_UCB_React/

GitHub Pages aloja la interfaz estática. Las cuentas, reservas compartidas y reportes requieren Node.js y PostgreSQL. En la publicación estática sin API, las operaciones de reserva están deshabilitadas para no mostrar confirmaciones que no se guardan en el servidor.

Para publicar el sistema completo con la interfaz y API en el mismo dominio, consulta [docs/PUBLICAR.md](docs/PUBLICAR.md).

Los reportes miden reservas; no registran pagos ni asistencia. La recuperación de contraseña y la verificación de correo no forman parte de esta versión.
