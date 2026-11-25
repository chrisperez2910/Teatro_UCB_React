# Instalar y actualizar Teatro UCB

## Preparar el proyecto

1. Detén la versión anterior con Ctrl + C.
2. Extrae el ZIP y abre la carpeta que contiene `package.json` en VS Code.
3. Mantén PostgreSQL iniciado. Puedes seguir usando la base `teatro_ucb`.
4. Antes de actualizar, haz una copia desde pgAdmin: clic derecho en la base → Backup.

En PowerShell:

```powershell
npm.cmd ci
$env:DATABASE_URL = 'postgresql://postgres:TU_CLAVE@localhost:5432/teatro_ucb'
npm.cmd run db:setup
npm.cmd run dev:full
```

Abre http://localhost:5173. No uses Live Server. La variable `DATABASE_URL` pertenece a esa terminal: vuelve a definirla si abres otra.

Si la contraseña tiene caracteres especiales como `@` o `/`, deben codificarse para una URL. También puedes construir la conexión sin escribir la contraseña visible:

```powershell
$clavePg = Read-Host 'Contraseña de PostgreSQL' -AsSecureString
$clavePlana = [System.Net.NetworkCredential]::new('', $clavePg).Password
$env:DATABASE_URL = 'postgresql://postgres:' + [uri]::EscapeDataString($clavePlana) + '@localhost:5432/teatro_ucb'
Remove-Variable clavePg, clavePlana
```

## Qué actualiza la base

- Agrega el rol de usuario, las sesiones y los historiales administrativos si faltan.
- Conserva cuentas, reservas e inscripciones.
- Cambia las rutas de portadas y galerías en una migración que se ejecuta una sola vez.
- Desactiva los lugares precargados en `ocupacion_ejemplo`. Las filas de `reserva` y `reserva_butaca` de los usuarios permanecen intactas.
- Excluye de la cartelera las antiguas reseñas cuyo autor decía «de ejemplo».
- Agrega índices para los reportes. El informe se calcula mediante consultas; no crea copias de las reservas.

Los registros antiguos sin cuenta conservan `id_usuario` vacío. No se asignan automáticamente a otra persona.

## Administrador

Registra tu cuenta en la página. Luego, en otra terminal con la misma conexión:

```powershell
npm.cmd run admin:grant -- tu-correo@example.com
```

Recarga la página y abre **Administrar**.

En **Gestionar butacas**, selecciona una función y pulsa una butaca libre para bloquearla. Pulsa una bloqueada para habilitarla. Las reservadas no se pueden modificar desde este control.

En **Programar esta función**, escribe la fecha y hora de La Paz. El servidor impide fechas pasadas, solapamientos con otra función de la sala y cambios sobre funciones con reservas confirmadas. Las fechas que ya existían se conservan: programa las próximas funciones desde este módulo.

## Reportes

Abre **Administrar → Reportes y decisiones**. Elige el intervalo de fechas de las funciones y, si quieres, una obra. Pulsa **Aplicar filtros**.

El informe incluye ocupación, lugares libres y bloqueados, solicitudes confirmadas y canceladas, demanda por obra, evolución de solicitudes y las últimas 100 reservas. Las tablas no exponen nombres ni correos del público.

- **Ocupación:** butacas con reserva activa / aforo habilitado de las funciones no canceladas. Se calcula con los totales; no promedia porcentajes.
- **Reservas:** solicitudes. Una solicitud puede contener varias butacas.
- **Cancelaciones:** solicitudes canceladas / solicitudes totales de las funciones elegidas, usando el estado actual.
- **Actividad diaria:** últimas 30 fechas con solicitudes de esas funciones, agrupadas por creación de la reserva en horario de La Paz.
- **Alertas:** ocupación desde 80 %, ocupación menor a 30 % con función dentro de siete días, cancelaciones desde 20 % cuando hay al menos cinco solicitudes y butacas bloqueadas. Son criterios de revisión, no predicciones.

**Exportar CSV** descarga todas las funciones filtradas. **Imprimir / PDF** abre la impresión del navegador: elige «Guardar como PDF». La versión impresa oculta los controles y conserva las cifras, tablas y criterios del informe.

## Comprobar el recorrido

1. Crea una cuenta de usuario en una ventana de incógnito.
2. Desde tu cuenta administradora programa una función futura sin reservas y habilita sus butacas.
3. Recarga la cartelera del usuario, elige esa función y guarda una reserva de dos butacas.
4. Comprueba la reserva en **Mis reservas** y la ocupación en administración.
5. Actualiza el reporte: debe sumar una solicitud y dos butacas, no dos solicitudes.
6. Cancela desde la cuenta de usuario antes de que comience la función.
7. Actualiza el reporte: aumentará la cancelación y se liberarán los lugares.
8. Prueba los filtros y descarga el CSV o PDF.

Para ver los registros en pgAdmin:

```sql
SELECT nombre, correo, rol FROM usuario;
SELECT codigo_reserva, id_funcion, estado FROM reserva ORDER BY creada_en DESC;
SELECT id_reserva, id_funcion, id_butaca, activa FROM reserva_butaca;
SELECT * FROM cambio_butaca ORDER BY cambiado_en DESC;
SELECT * FROM cambio_funcion ORDER BY cambiado_en DESC;
```

## Problemas frecuentes

- **ECONNREFUSED:** PostgreSQL está detenido o el puerto es distinto.
- **password authentication failed:** revisa la contraseña y su codificación en la URL.
- **No existe la columna rol:** ejecuta `db:setup` con esta versión.
- **Puerto 5173/3001 ocupado:** cierra los servidores anteriores; no abras dos versiones al mismo tiempo.
- **No aparecen funciones para reservar:** sus fechas ya pasaron. Programa una próxima función desde administración.
- **Inscripción cerrada:** se comprueba la fecha límite de cada taller. Ajusta la convocatoria en la base si corresponde.
- **GitHub Pages muestra la cartelera pero no permite ingresar:** falta publicar la API y PostgreSQL; consulta `PUBLICAR.md`.

Puedes iniciar por separado con `npm.cmd run api` en una terminal con `DATABASE_URL` y `npm.cmd run dev` en otra con `$env:VITE_USE_API = 'true'`.

Para comprobar la conexión:

```powershell
Invoke-RestMethod http://localhost:3001/api/health
```

Debe devolver `ok: True` y `database: connected`.
