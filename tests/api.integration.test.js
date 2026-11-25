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
  socket = new PGLiteSocketServer({ db: database, port, host: "127.0.0.1" });
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
