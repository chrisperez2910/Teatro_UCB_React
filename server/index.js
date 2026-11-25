import { createServer } from "node:http";
import { randomUUID, randomBytes } from "node:crypto";
import pg from "pg";
import {
  hashPassword,
  verifyPassword,
  newToken,
  tokenHash,
} from "./security.js";
pg.types.setTypeParser(1082, (value) => value);
const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  connectionTimeoutMillis: 5000,
});
if (!process.env.DATABASE_URL)
  throw new Error("Configura DATABASE_URL. Consulta docs/POSTGRESQL.md.");
const allowedOrigin = process.env.APP_ORIGIN || "http://localhost:5173";
const cookieSecure = process.env.COOKIE_SECURE === "true";
class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}
const attempts = new Map();
const validatePassword = (password) =>
  typeof password === "string" &&
  password.length >= 8 &&
  password.length <= 128;
function cookieValue(req) {
  const pair = (req.headers.cookie || "")
    .split(";")
    .map((v) => v.trim())
    .find((v) => v.startsWith("teatro_session="));
  const value = pair?.slice("teatro_session=".length);
  return /^[0-9a-f]{64}$/.test(value || "") ? value : null;
}
function cookie(token, expire = false) {
  return `teatro_session=${token || ""}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${expire ? 0 : 604800}${cookieSecure ? "; Secure" : ""}`;
}
async function currentUser(req) {
  const token = cookieValue(req);
  if (!token) return null;
  return (
    (
      await pool.query(
        `SELECT u.id_usuario,u.nombre,u.correo FROM sesion_usuario s JOIN usuario u ON u.id_usuario=s.id_usuario WHERE s.token_hash=$1 AND s.expira_en>now()`,
        [tokenHash(token)],
      )
    ).rows[0] || null
  );
}
async function createSession(user) {
  const token = newToken();
  await pool.query(
    `INSERT INTO sesion_usuario(token_hash,id_usuario,expira_en) VALUES($1,$2,now()+interval '7 days')`,
    [tokenHash(token), user.id_usuario],
  );
  return token;
}
function requireUser(user) {
  if (!user) throw new HttpError(401, "Inicia sesión para continuar.");
  return user;
}
function throttle(req) {
  const key = req.socket.remoteAddress || "local",
    now = Date.now(),
    record = attempts.get(key);
  if (!record || record.until < now) {
    attempts.set(key, { count: 1, until: now + 15 * 60 * 1000 });
    return;
  }
  if (record.count >= 15)
    throw new HttpError(429, "Demasiados intentos. Espera unos minutos.");
  record.count++;
}
const contact = (body) => {
  const nombre = typeof body?.nombre === "string" ? body.nombre.trim() : "",
    correo =
      typeof body?.correo === "string" ? body.correo.trim().toLowerCase() : "";
  if (
    typeof nombre !== "string" ||
    nombre.length < 3 ||
    nombre.length > 80 ||
    typeof correo !== "string" ||
    correo.length > 120 ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo)
  )
    throw new HttpError(400, "Revisa el nombre y el correo.");
  return { nombre, correo };
};
async function readBody(req) {
  let content = "";
  for await (const part of req) {
    content += part;
    if (content.length > 12000)
      throw new HttpError(413, "Solicitud demasiado grande.");
  }
  try {
    return JSON.parse(content);
  } catch {
    throw new HttpError(400, "El cuerpo debe ser JSON válido.");
  }
}
function send(res, status, data, extraHeaders = {}) {
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    ...extraHeaders,
  });
  res.end(JSON.stringify(data));
}
async function transaction(action) {
  const db = await pool.connect();
  try {
    await db.query("BEGIN");
    const data = await action(db);
    await db.query("COMMIT");
    return data;
  } catch (error) {
    await db.query("ROLLBACK");
    throw error;
  } finally {
    db.release();
  }
}
const tables = {
  obras: "obra",
  dramaturgos: "dramaturgo",
  obraDramaturgo: "obra_dramaturgo",
  producciones: "produccion",
  funciones: "funcion",
  salas: "sala",
  butacas: "butaca",
  funcionButaca: "funcion_butaca",
  imagenes: "imagen_produccion",
  resenas: "resena",
  talleres: "taller",
};
async function occupied(db) {
  return (
    await db.query(
      "SELECT id_funcion,id_butaca,vigente FROM ocupacion_ejemplo WHERE vigente UNION ALL SELECT id_funcion,id_butaca,true FROM reserva_butaca WHERE activa",
    )
  ).rows;
}
async function catalog() {
  const out = {};
  for (const [key, table] of Object.entries(tables))
    out[key] = (await pool.query(`SELECT * FROM ${table}`)).rows;
  out.reservaButacaEjemplo = await occupied(pool);
  return out;
}
async function session(user) {
  let reservas = [],
    inscripciones = [];
  if (user) {
    reservas = (
      await pool.query(
        `SELECT id_reserva,id_funcion,nombre_contacto,correo_contacto,codigo_reserva,estado,creada_en FROM reserva WHERE id_usuario=$1 ORDER BY creada_en DESC`,
        [user.id_usuario],
      )
    ).rows;
    for (const r of reservas)
      r.butacas = (
        await pool.query(
          "SELECT id_butaca FROM reserva_butaca WHERE id_reserva=$1 ORDER BY id_butaca",
          [r.id_reserva],
        )
      ).rows.map((s) => s.id_butaca);
    inscripciones = (
      await pool.query(
        `SELECT id_inscripcion,id_taller,nombre_participante,correo_participante,estado,fecha_inscripcion FROM inscripcion_taller WHERE id_usuario=$1 ORDER BY fecha_inscripcion DESC`,
        [user.id_usuario],
      )
    ).rows;
  }
  const workshopCounts = (
    await pool.query(
      "SELECT id_taller,count(*)::integer AS total FROM inscripcion_taller WHERE estado='INSCRITA' GROUP BY id_taller",
    )
  ).rows;
  return {
    user: user || null,
    state: { version: 1, reservas, inscripciones },
    occupied: await occupied(pool),
    workshopCounts,
  };
}
async function book(user, body) {
  const { nombre, correo } = contact(body);
  const id = body.id_funcion,
    seats = body.butacas;
  if (
    !Number.isInteger(id) ||
    !Array.isArray(seats) ||
    seats.length < 1 ||
    seats.length > 6 ||
    seats.some((s) => !Number.isInteger(s)) ||
    new Set(seats).size !== seats.length
  )
    throw new HttpError(400, "Selecciona entre una y seis butacas diferentes.");
  return transaction(async (db) => {
    await db.query(
      "SELECT id_funcion FROM funcion WHERE id_funcion=$1 FOR UPDATE",
      [id],
    );
    const f = (
      await db.query(
        "SELECT id_sala FROM funcion WHERE id_funcion=$1 AND estado='PROGRAMADA'",
        [id],
      )
    ).rows[0];
    if (!f) throw new HttpError(404, "Esta función no está disponible.");
    const valid = (
      await db.query(
        "SELECT fb.id_butaca FROM funcion_butaca fb JOIN butaca b ON b.id_butaca=fb.id_butaca WHERE fb.id_funcion=$1 AND fb.habilitada AND b.activa AND b.id_sala=$2 AND fb.id_butaca=ANY($3::integer[])",
        [id, f.id_sala, seats],
      )
    ).rows;
    if (valid.length !== seats.length)
      throw new HttpError(409, "Hay butacas no habilitadas.");
    const used = (
      await db.query(
        "SELECT id_butaca FROM ocupacion_ejemplo WHERE id_funcion=$1 AND id_butaca=ANY($2::integer[]) AND vigente UNION ALL SELECT id_butaca FROM reserva_butaca WHERE id_funcion=$1 AND id_butaca=ANY($2::integer[]) AND activa",
        [id, seats],
      )
    ).rows;
    if (used.length)
      throw new HttpError(
        409,
        "Una butaca ya está ocupada. Actualiza la página y elige otra.",
      );
    const uuid = randomUUID(),
      code = `UCB-${randomBytes(6).toString("hex").toUpperCase()}`;
    await db.query(
      "INSERT INTO reserva(id_reserva,id_funcion,nombre_contacto,correo_contacto,codigo_reserva,estado,visitor_key,id_usuario) VALUES($1,$2,$3,$4,$5,'CONFIRMADA',$6,$7)",
      [uuid, id, nombre, correo, code, randomUUID(), user.id_usuario],
    );
    for (const seat of seats)
      await db.query(
        "INSERT INTO reserva_butaca(id_reserva,id_funcion,id_butaca) VALUES($1,$2,$3)",
        [uuid, id, seat],
      );
    return {
      reservation: (
        await db.query("SELECT * FROM reserva WHERE id_reserva=$1", [uuid])
      ).rows[0],
    };
  });
}
async function cancel(user, id) {
  return transaction(async (db) => {
    const r = (
      await db.query(
        "SELECT estado FROM reserva WHERE id_reserva=$1 AND id_usuario=$2 FOR UPDATE",
        [id, user.id_usuario],
      )
    ).rows[0];
    if (!r)
      throw new HttpError(404, "No encontramos esa reserva en tu cuenta.");
    if (r.estado !== "CONFIRMADA")
      throw new HttpError(409, "La reserva ya estaba cancelada.");
    await db.query(
      "UPDATE reserva SET estado='CANCELADA' WHERE id_reserva=$1",
      [id],
    );
    await db.query(
      "UPDATE reserva_butaca SET activa=false WHERE id_reserva=$1",
      [id],
    );
    return { ok: true };
  });
}
async function enroll(user, body) {
  const { nombre, correo } = contact(body),
    id = body.id_taller;
  if (!Number.isInteger(id)) throw new HttpError(400, "Taller inválido.");
  return transaction(async (db) => {
    const t = (
      await db.query(
        "SELECT estado,cupo_maximo FROM taller WHERE id_taller=$1 FOR UPDATE",
        [id],
      )
    ).rows[0];
    if (!t || t.estado !== "ABIERTO")
      throw new HttpError(404, "Este taller no admite inscripciones.");
    const count = Number(
      (
        await db.query(
          "SELECT count(*) AS total FROM inscripcion_taller WHERE id_taller=$1 AND estado='INSCRITA'",
          [id],
        )
      ).rows[0].total,
    );
    if (count >= t.cupo_maximo) throw new HttpError(409, "Ya no quedan cupos.");
    await db.query(
      "INSERT INTO inscripcion_taller(id_inscripcion,id_taller,nombre_participante,correo_participante,visitor_key,estado,id_usuario) VALUES($1,$2,$3,$4,$5,'INSCRITA',$6)",
      [randomUUID(), id, nombre, correo, randomUUID(), user.id_usuario],
    );
    return { ok: true };
  });
}
const server = createServer(async (req, res) => {
  try {
    const origin = req.headers.origin;
    if (origin && origin !== allowedOrigin)
      throw new HttpError(403, "Origen no autorizado.");
    const path = new URL(req.url, "http://localhost").pathname;
    if (req.method === "GET" && path === "/api/health")
      return send(res, 200, { ok: true });
    if (req.method === "GET" && path === "/api/catalog")
      return send(res, 200, await catalog());
    if (req.method === "POST" && origin !== allowedOrigin)
      throw new HttpError(403, "Origen no autorizado.");
    if (req.method === "POST" && path === "/api/auth/register") {
      throttle(req);
      const body = await readBody(req),
        { nombre, correo } = contact(body);
      if (!validatePassword(body.password))
        throw new HttpError(
          400,
          "La contraseña debe tener entre 8 y 128 caracteres.",
        );
      const user = { id_usuario: randomUUID(), nombre, correo };
      await pool.query(
        "INSERT INTO usuario(id_usuario,nombre,correo,clave_hash) VALUES($1,$2,$3,$4)",
        [user.id_usuario, nombre, correo, await hashPassword(body.password)],
      );
      const token = await createSession(user);
      return send(res, 201, await session(user), {
        "Set-Cookie": cookie(token),
      });
    }
    if (req.method === "POST" && path === "/api/auth/login") {
      throttle(req);
      const body = await readBody(req);
      const correo =
        typeof body.correo === "string" ? body.correo.trim().toLowerCase() : "";
      if (typeof body.password !== "string" || body.password.length > 128)
        throw new HttpError(400, "Revisa los datos ingresados.");
      const record = (
        await pool.query(
          "SELECT id_usuario,nombre,correo,clave_hash FROM usuario WHERE lower(correo)=$1",
          [correo],
        )
      ).rows[0];
      if (!record || !(await verifyPassword(body.password, record.clave_hash)))
        throw new HttpError(401, "Correo o contraseña incorrectos.");
      const user = {
        id_usuario: record.id_usuario,
        nombre: record.nombre,
        correo: record.correo,
      };
      const token = await createSession(user);
      return send(res, 200, await session(user), {
        "Set-Cookie": cookie(token),
      });
    }
    if (req.method === "POST" && path === "/api/auth/logout") {
      const token = cookieValue(req);
      if (token)
        await pool.query("DELETE FROM sesion_usuario WHERE token_hash=$1", [
          tokenHash(token),
        ]);
      return send(res, 200, await session(null), {
        "Set-Cookie": cookie("", true),
      });
    }
    const user = await currentUser(req);
    if (req.method === "GET" && path === "/api/session")
      return send(res, 200, await session(user));
    if (req.method === "POST" && path === "/api/reservas") {
      requireUser(user);
      const result = await book(user, await readBody(req));
      return send(res, 201, { ...result, ...(await session(user)) });
    }
    const cancellation = path.match(/^\/api\/reservas\/([0-9a-f-]+)\/cancel$/i);
    if (req.method === "POST" && cancellation) {
      requireUser(user);
      await cancel(user, cancellation[1]);
      return send(res, 200, await session(user));
    }
    if (req.method === "POST" && path === "/api/inscripciones") {
      requireUser(user);
      await enroll(user, await readBody(req));
      return send(res, 201, await session(user));
    }
    throw new HttpError(404, "Ruta no encontrada.");
  } catch (error) {
    if (error.code === "23505")
      return send(res, 409, {
        error:
          error.constraint === "uq_usuario_correo"
            ? "Ya existe una cuenta con ese correo."
            : "Ese lugar o correo ya está registrado. Actualiza la página.",
      });
    if (error.code === "22P02")
      return send(res, 400, { error: "Identificador inválido." });
    if (!error.status) console.error(error);
    send(res, error.status || 500, {
      error: error.status
        ? error.message
        : "No se pudo completar la operación. Revisa la conexión a PostgreSQL.",
    });
  }
});
if (process.env.NODE_ENV !== "test")
  server.listen(Number(process.env.API_PORT) || 3001, "127.0.0.1", () =>
    console.log("API Teatro UCB: http://127.0.0.1:3001"),
  );
export { server, pool };
