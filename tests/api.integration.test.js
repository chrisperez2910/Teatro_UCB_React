// @vitest-environment node
import { beforeAll, afterAll, it, expect } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { PGLiteSocketServer } from "@electric-sql/pglite-socket";
import { readFile } from "node:fs/promises";
import { execFile as execFileCb } from "node:child_process";
import { promisify } from "node:util";
const execFile = promisify(execFileCb),
  port = 55432,
  origin = "http://localhost:5173";
let database, socket, api, pool, base;
const legacyId = "dec21be3-4097-4ff5-8212-12421fe7e43c";
async function request(
  path,
  { method = "GET", cookie, body, customOrigin = origin } = {},
) {
  const response = await fetch(base + path, {
    method,
    headers: {
      ...(method === "POST"
        ? { "Content-Type": "application/json", Origin: customOrigin }
        : {}),
      ...(cookie ? { Cookie: cookie } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  return {
    status: response.status,
    data: await response.json(),
    cookie: response.headers.get("set-cookie")?.split(";")[0],
  };
}
beforeAll(async () => {
  database = await PGlite.create();
  socket = new PGLiteSocketServer({
    db: database,
    port,
    host: "127.0.0.1",
    maxConnections: 10,
  });
  await socket.start();
  // Emula la versión anterior: se crean las tablas sin las columnas de cuenta.
  const schema = await readFile(
    new URL("../server/db/schema.sql", import.meta.url),
    "utf8",
  );
  await database.exec(schema.split("-- Las reservas anteriores")[0]);
  const data = JSON.parse(
    await readFile(
      new URL("../public/data/teatro.json", import.meta.url),
      "utf8",
    ),
  );
  for (const [key, table] of [
    ["dramaturgos", "dramaturgo"],
    ["obras", "obra"],
    ["obraDramaturgo", "obra_dramaturgo"],
    ["salas", "sala"],
    ["butacas", "butaca"],
    ["producciones", "produccion"],
    ["funciones", "funcion"],
    ["funcionButaca", "funcion_butaca"],
    ["imagenes", "imagen_produccion"],
    ["resenas", "resena"],
    ["talleres", "taller"],
  ])
    for (const row of data[key]) {
      const columns = Object.keys(row);
      await database.query(
        `INSERT INTO ${table} (${columns.join(",")}) VALUES (${columns.map((_, i) => `$${i + 1}`).join(",")}) ON CONFLICT DO NOTHING`,
        Object.values(row),
      );
    }
  await database.query(
    `INSERT INTO reserva(id_reserva,id_funcion,nombre_contacto,correo_contacto,codigo_reserva,estado,visitor_key) VALUES($1,1,'Antigua','antigua@example.com','UCB-ANTIGUA','CONFIRMADA',$2)`,
    [legacyId, "02e216d3-7b1b-4da0-8cc5-25ccc8fab300"],
  );
  const url = `postgresql://postgres:postgres@127.0.0.1:${port}/postgres`;
  await execFile(process.execPath, ["server/db/setup.js"], {
    cwd: process.cwd(),
    env: { ...process.env, DATABASE_URL: url },
  });
  await database.exec(
    "UPDATE funcion SET fecha_hora_inicio=now()+interval '10 days',fecha_hora_fin=now()+interval '10 days 2 hours'; UPDATE taller SET fecha_limite_inscripcion=current_date+10;",
  );
  process.env.DATABASE_URL = url;
  process.env.NODE_ENV = "test";
  ({ server: api, pool } = await import("../server/index.js"));
  await new Promise((resolve) => api.listen(0, "127.0.0.1", resolve));
  base = `http://127.0.0.1:${api.address().port}`;
}, 30000);
afterAll(async () => {
  if (api) await new Promise((resolve) => api.close(resolve));
  if (pool) await pool.end();
  if (socket) await socket.stop();
  if (database) await database.close();
});
it("migra registros anteriores sin asignarlos ni eliminarlos", async () => {
  const result = await database.query(
    "SELECT id_usuario FROM reserva WHERE id_reserva=$1",
    [legacyId],
  );
  expect(result.rows).toHaveLength(1);
  expect(result.rows[0].id_usuario).toBeNull();
});
it("registro, sesión, reserva, control de dueño, cancelación e inscripción", async () => {
  const catalog = await request("/api/catalog");
  expect(catalog.status).toBe(200);
  expect(catalog.data.obras.length).toBeGreaterThan(0);
  const body = {
    nombre: "Ana Perez",
    correo: "ANA@example.com",
    password: "MiClaveSegura12",
  };
  const first = await request("/api/auth/register", { method: "POST", body });
  expect(first.status).toBe(201);
  expect(first.data.user.correo).toBe("ana@example.com");
  expect(first.cookie).toMatch(/^teatro_session=/);
  const record = await database.query(
    "SELECT clave_hash FROM usuario WHERE correo=$1",
    ["ana@example.com"],
  );
  expect(record.rows[0].clave_hash).not.toContain(body.password);
  expect(record.rows[0].clave_hash).toMatch(/^scrypt:/);
  expect(
    (await request("/api/auth/register", { method: "POST", body })).status,
  ).toBe(409);
  expect(
    (
      await request("/api/reservas", {
        method: "POST",
        body: {
          id_funcion: 1,
          butacas: [1],
          nombre: body.nombre,
          correo: body.correo,
        },
      })
    ).status,
  ).toBe(401);
  const booking = await request("/api/reservas", {
    method: "POST",
    cookie: first.cookie,
    body: {
      id_funcion: 1,
      butacas: [1],
      nombre: body.nombre,
      correo: body.correo,
    },
  });
  expect(booking.status).toBe(201);
  const id = booking.data.reservation.id_reserva;
  expect(booking.data.state.reservas[0].butacas).toEqual([1]);
  const second = await request("/api/auth/register", {
    method: "POST",
    body: {
      nombre: "Beto Perez",
      correo: "beto@example.com",
      password: "OtraClave12",
    },
  });
  expect(second.status).toBe(201);
  expect(
    (
      await request("/api/reservas", {
        method: "POST",
        cookie: second.cookie,
        body: {
          id_funcion: 1,
          butacas: [1],
          nombre: "Beto Perez",
          correo: "beto@example.com",
        },
      })
    ).status,
  ).toBe(409);
  expect(
    (
      await request(`/api/reservas/${id}/cancel`, {
        method: "POST",
        cookie: second.cookie,
      })
    ).status,
  ).toBe(404);
  const enrollment = await request("/api/inscripciones", {
    method: "POST",
    cookie: first.cookie,
    body: { id_taller: 1, nombre: body.nombre, correo: body.correo },
  });
  expect(enrollment.status).toBe(201);
  expect(
    enrollment.data.workshopCounts.find((x) => x.id_taller === 1).total,
  ).toBe(1);
  expect(
    (
      await request("/api/inscripciones", {
        method: "POST",
        cookie: first.cookie,
        body: { id_taller: 1, nombre: body.nombre, correo: body.correo },
      })
    ).status,
  ).toBe(409);
  const canceled = await request(`/api/reservas/${id}/cancel`, {
    method: "POST",
    cookie: first.cookie,
  });
  expect(canceled.status).toBe(200);
  expect(canceled.data.state.reservas[0].estado).toBe("CANCELADA");
  expect(
    (
      await request("/api/auth/logout", {
        method: "POST",
        cookie: first.cookie,
      })
    ).status,
  ).toBe(200);
  expect(
    (await request("/api/session", { cookie: first.cookie })).data.user,
  ).toBeNull();
  expect(
    (
      await request("/api/auth/login", {
        method: "POST",
        body: { correo: body.correo, password: "incorrecta" },
      })
    ).status,
  ).toBe(401);
  const logged = await request("/api/auth/login", {
    method: "POST",
    body: { correo: body.correo, password: body.password },
  });
  expect(logged.status).toBe(200);
  expect(logged.data.state.reservas[0].estado).toBe("CANCELADA");
  expect(
    (
      await request("/api/auth/logout", {
        method: "POST",
        cookie: logged.cookie,
        customOrigin: "https://otra.example",
      })
    ).status,
  ).toBe(403);
}, 30000);

it("protege la administración y sincroniza bloqueos, reservas y cancelaciones", async () => {
  const register = (nombre, correo) =>
    request("/api/auth/register", {
      method: "POST",
      body: { nombre, correo, password: "PruebaSegura123", rol: "ADMIN" },
    });
  const admin = await register("Admin Teatro", "admin@example.com");
  const visitor = await register("Visita Teatro", "visita@example.com");
  expect(admin.status).toBe(201);
  expect(admin.data.user.rol).toBe("USUARIO"); // No permite autoasignarse privilegios.
  expect((await request("/api/admin/funciones/1/butacas")).status).toBe(401);
  expect(
    (
      await request("/api/admin/funciones/1/butacas", {
        cookie: visitor.cookie,
      })
    ).status,
  ).toBe(403);
  await execFile(process.execPath, ["server/admin.js", "admin@example.com"], {
    cwd: process.cwd(),
    env: { ...process.env },
  });
  const snapshot = await request("/api/session", { cookie: admin.cookie });
  expect(snapshot.data.user.rol).toBe("ADMIN");
  const seats = await request("/api/admin/funciones/1/butacas", {
    cookie: admin.cookie,
  });
  expect(seats.status).toBe(200);
  const seat = seats.data.butacas.find(
    (s) => !s.ocupada && s.habilitada && s.activa,
  ).id_butaca;
  const route = `/api/admin/funciones/1/butacas/${seat}`;
  const change = (habilitada) =>
    request(route, {
      method: "POST",
      cookie: admin.cookie,
      body: { habilitada },
    });
  expect(
    (
      await request(route, {
        method: "POST",
        cookie: visitor.cookie,
        body: { habilitada: false },
      })
    ).status,
  ).toBe(403);
  expect((await change("false")).status).toBe(400);
  expect((await change(false)).status).toBe(200);
  const state = await request("/api/session", { cookie: visitor.cookie });
  expect(
    state.data.funcionButaca.find(
      (b) => b.id_funcion === 1 && b.id_butaca === seat,
    ).habilitada,
  ).toBe(false);
  expect(
    state.data.funcionButaca.find(
      (b) => b.id_funcion === 2 && b.id_butaca === seat,
    ).habilitada,
  ).toBe(true);
  const booking = (cookie) =>
    request("/api/reservas", {
      method: "POST",
      cookie,
      body: {
        id_funcion: 1,
        butacas: [seat],
        nombre: "Visita Teatro",
        correo: "visita@example.com",
      },
    });
  expect((await booking(visitor.cookie)).status).toBe(409);
  expect((await change(true)).status).toBe(200);
  const [one, two] = await Promise.all([
    booking(visitor.cookie),
    booking(admin.cookie),
  ]);
  expect([one.status, two.status].sort()).toEqual([201, 409]);
  const winner = one.status === 201 ? one : two;
  const ownerCookie = one.status === 201 ? visitor.cookie : admin.cookie;
  expect((await change(false)).status).toBe(409);
  expect(
    (
      await request(
        `/api/reservas/${winner.data.reservation.id_reserva}/cancel`,
        { method: "POST", cookie: ownerCookie },
      )
    ).status,
  ).toBe(200);
  expect((await change(false)).status).toBe(200);
  const history = await database.query(
    "SELECT * FROM cambio_butaca WHERE id_funcion=1 AND id_butaca=$1",
    [seat],
  );
  expect(history.rows).toHaveLength(3);
  expect(
    history.rows.every((row) => row.id_usuario === admin.data.user.id_usuario),
  ).toBe(true);
  const hashes = (
    await database.query(
      "SELECT clave_hash FROM usuario WHERE correo IN ('admin@example.com','visita@example.com')",
    )
  ).rows;
  expect(hashes[0].clave_hash).not.toBe(hashes[1].clave_hash);
  expect((await request("/api/health")).data.database).toBe("connected");
}, 30000);

it("reporta butacas y solicitudes sin duplicar, filtra fechas y protege los informes", async () => {
  const admin = await request("/api/auth/login", {
    method: "POST",
    body: { correo: "admin@example.com", password: "PruebaSegura123" },
  });
  const visitor = await request("/api/auth/login", {
    method: "POST",
    body: { correo: "visita@example.com", password: "PruebaSegura123" },
  });
  expect((await request("/api/admin/reportes")).status).toBe(401);
  expect(
    (await request("/api/admin/reportes", { cookie: visitor.cookie })).status,
  ).toBe(403);
  await database.exec(`INSERT INTO funcion VALUES(99,2,1,'2099-06-15 19:00:00-04','2099-06-15 20:25:00-04','PROGRAMADA'),(100,2,1,'2099-06-15 21:00:00-04','2099-06-15 22:25:00-04','CANCELADA');
    INSERT INTO funcion_butaca VALUES(99,45,true),(99,46,true),(99,47,true),(99,48,false),(100,45,true);`);
  const book = (butacas) =>
    request("/api/reservas", {
      method: "POST",
      cookie: visitor.cookie,
      body: {
        id_funcion: 99,
        butacas,
        nombre: "Visita Teatro",
        correo: "visita@example.com",
      },
    });
  expect((await book([45, 46])).status).toBe(201);
  const cancelled = await book([47]);
  expect(cancelled.status).toBe(201);
  await request(
    `/api/reservas/${cancelled.data.reservation.id_reserva}/cancel`,
    { method: "POST", cookie: visitor.cookie },
  );
  const response = await request(
    "/api/admin/reportes?desde=2099-06-15&hasta=2099-06-15&obra=2",
    { cookie: admin.cookie },
  );
  expect(response.status).toBe(200);
  expect(response.data.resumen).toMatchObject({
    funciones: 2,
    programadas: 1,
    capacidad: 3,
    ocupadas: 2,
    disponibles: 1,
    bloqueadas: 1,
    confirmadas: 1,
    canceladas: 1,
    reservas: 2,
    ocupacion: 66.7,
    tasa_cancelacion: 50,
  });
  expect(response.data.obras).toHaveLength(1);
  expect(response.data.reservas.map((r) => r.butacas).sort()).toEqual([1, 2]);
  expect(response.data.dias.reduce((sum, d) => sum + d.total, 0)).toBe(2);
  expect(JSON.stringify(response.data)).not.toContain("visita@example.com");
  const empty = await request(
    "/api/admin/reportes?desde=2099-06-16&hasta=2099-06-16",
    { cookie: admin.cookie },
  );
  expect(empty.data.resumen.ocupacion).toBeNull();
  expect(empty.data.funciones).toHaveLength(0);
  for (const query of [
    "desde=2026-02-30",
    "desde=2026-02-02&hasta=2026-01-01",
    "obra=2%20OR%201=1",
  ])
    expect(
      (await request("/api/admin/reportes?" + query, { cookie: admin.cookie }))
        .status,
    ).toBe(400);
  // No se permite alterar una función reservada, solapar horarios ni reservar fechas pasadas.
  const schedule = (id, inicio) =>
    request(`/api/admin/funciones/${id}/programacion`, {
      method: "POST",
      cookie: admin.cookie,
      body: { inicio },
    });
  expect((await schedule(99, "2099-06-16T19:00:00-04:00")).status).toBe(409);
  expect((await schedule(100, "2099-06-15T19:00:00-04:00")).status).toBe(409);
  expect((await schedule(100, "2099-06-16T19:00:00-04:00")).status).toBe(200);
  expect((await schedule(100, "2000-01-01T19:00:00-04:00")).status).toBe(400);
  await database.exec(
    "UPDATE funcion SET fecha_hora_inicio='2000-01-01 19:00:00-04',fecha_hora_fin='2000-01-01 20:25:00-04' WHERE id_funcion=100;",
  );
  expect(
    (
      await request("/api/reservas", {
        method: "POST",
        cookie: visitor.cookie,
        body: {
          id_funcion: 100,
          butacas: [45],
          nombre: "Visita Teatro",
          correo: "visita@example.com",
        },
      })
    ).status,
  ).toBe(404);
}, 30000);

it("repetir la actualización conserva reservas, cuentas y ajustes posteriores", async () => {
  const before = await database.query(
    "SELECT id_reserva,estado,id_usuario FROM reserva ORDER BY id_reserva",
  );
  const users = await database.query(
    "SELECT id_usuario,clave_hash,rol FROM usuario ORDER BY id_usuario",
  );
  await database.query(
    "UPDATE obra SET imagen='portada-personalizada.jpg' WHERE id_obra=1",
  );
  await execFile(process.execPath, ["server/db/setup.js"], {
    cwd: process.cwd(),
    env: { ...process.env, DATABASE_URL: process.env.DATABASE_URL },
  });
  expect(
    (
      await database.query(
        "SELECT id_reserva,estado,id_usuario FROM reserva ORDER BY id_reserva",
      )
    ).rows,
  ).toEqual(before.rows);
  expect(
    (
      await database.query(
        "SELECT id_usuario,clave_hash,rol FROM usuario ORDER BY id_usuario",
      )
    ).rows,
  ).toEqual(users.rows);
  expect(
    (await database.query("SELECT imagen FROM obra WHERE id_obra=1")).rows[0]
      .imagen,
  ).toBe("portada-personalizada.jpg");
  expect(
    (await database.query("SELECT nombre FROM migracion_aplicada")).rows,
  ).toHaveLength(1);
}, 30000);
