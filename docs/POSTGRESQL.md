# PostgreSQL y cuentas

## Si ya tenías el avance anterior

Conserva la base `teatro_ucb`. El instalador agrega las tablas `usuario` y `sesion_usuario` y el vínculo `id_usuario` a reservas e inscripciones. Los registros anteriores permanecen en su tabla con `id_usuario` vacío; sus butacas activas siguen ocupadas. No los transferimos automáticamente a una cuenta porque todavía no hay una forma segura de verificar quién es su dueño.

1. Detén los servidores anteriores con `Ctrl + C` en sus terminales.
2. Extrae el nuevo ZIP en una carpeta diferente y ábrela en VS Code.
3. En PowerShell, dentro de esa carpeta, ejecuta:

```powershell
npm.cmd ci
$env:DATABASE_URL = 'postgresql://postgres:TU_CLAVE@localhost:5432/teatro_ucb'
npm.cmd run db:setup
npm.cmd run dev:full
```

Reemplaza `TU_CLAVE` por tu contraseña de PostgreSQL. No incluyas la contraseña en capturas ni la subas a Git. Si contiene caracteres especiales de URL como `@`, `/` o `:`, deben codificarse en la dirección.

Abre el enlace de Vite, normalmente `http://localhost:5173/`. `dev:full` arranca React en modo BD y la API en el puerto 3001. Si aparece que el puerto 5173 está ocupado, detén el servidor anterior y vuelve a intentarlo. Para detener ambos procesos, usa `Ctrl + C`.

Si usas un servidor o puerto distinto para PostgreSQL, cambia esa parte de la URL. Si aún no existe la base, créala vacía en pgAdmin antes de ejecutar `db:setup`.

## Alternativa: dos terminales

Si el comando conjunto falla, abre dos terminales PowerShell en la carpeta del proyecto.

Terminal 1:

```powershell
$env:DATABASE_URL = 'postgresql://postgres:TU_CLAVE@localhost:5432/teatro_ucb'
npm.cmd run api
```

Terminal 2:

```powershell
$env:VITE_USE_API = 'true'
npm.cmd run dev
```

Ambas terminales deben permanecer abiertas. Cada variable `$env:` pertenece solo a la terminal donde la escribes.

## Comprobarlo

1. Abre **Mi cuenta → Crear cuenta**, usa un nombre, un correo de prueba y una contraseña de al menos 8 caracteres.
2. Elige una función y una butaca, y guarda la reserva.
3. En pgAdmin, abre el Query Tool de `teatro_ucb`:

```sql
SELECT id_usuario, nombre, correo FROM usuario;
SELECT codigo_reserva, id_usuario, estado FROM reserva ORDER BY creada_en DESC;
SELECT id_funcion, id_butaca, activa FROM reserva_butaca;
SELECT id_taller, id_usuario, nombre_participante, estado FROM inscripcion_taller;
```

4. Cierra sesión e ingresa con la misma cuenta. Tu reserva debe aparecer en **Mis reservas**. Al cancelarla cambia su estado y la butaca vuelve a estar disponible.

Las contraseñas no se guardan en texto plano. No existe recuperación de contraseña ni verificación de correo en este avance; usa contraseñas de prueba que no utilices en otras cuentas.

## Si aparece un error

- `ECONNREFUSED` al ejecutar `db:setup`: revisa que el servicio de PostgreSQL esté iniciado y el puerto sea el correcto.
- `password authentication failed`: revisa el usuario y contraseña de PostgreSQL.
- Pantalla con error de conexión: comprueba que la API siga activa y que ejecutaste `db:setup` con esta versión.
- Puerto 5173 o 3001 ocupado: detén los procesos anteriores en sus terminales.
- Si el modo cuenta aparece deshabilitado, arranca con `dev:full` o define `VITE_USE_API` como se indica arriba antes de ejecutar Vite.

La API está configurada para usarse localmente con el origen `http://localhost:5173`. La versión publicada como sitio estático antes de este avance no incluye el servidor ni la base de datos. Para abrirla al público haría falta un despliegue del frontend, la API y PostgreSQL, con HTTPS y configuración de cookies seguras.
