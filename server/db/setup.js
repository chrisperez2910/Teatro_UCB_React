import { readFile } from "node:fs/promises";
import pg from "pg";
const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  connectionTimeoutMillis: 5000,
});
if (!process.env.DATABASE_URL)
  throw new Error("Configura DATABASE_URL antes de ejecutar db:setup.");
const seed = JSON.parse(
  await readFile(new URL("../../public/data/teatro.json", import.meta.url)),
);
const tables = [
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
];
const db = await pool.connect();
try {
  await db.query("BEGIN");
  await db.query(
    await readFile(new URL("./schema.sql", import.meta.url), "utf8"),
  );
  for (const [key, table] of tables) {
    for (const row of seed[key]) {
      const columns = Object.keys(row);
      await db.query(
        `INSERT INTO ${table} (${columns.join(",")}) VALUES (${columns.map((_, i) => `$${i + 1}`).join(",")}) ON CONFLICT DO NOTHING`,
        Object.values(row),
      );
    }
  }
  for (const row of seed.reservaButacaEjemplo)
    await db.query(
      "INSERT INTO ocupacion_ejemplo(id_funcion,id_butaca,vigente) VALUES($1,$2,$3) ON CONFLICT DO NOTHING",
      [row.id_funcion, row.id_butaca, row.vigente],
    );
  await db.query("COMMIT");
  console.log("Esquema y cartelera de ejemplo instalados.");
} catch (error) {
  await db.query("ROLLBACK");
  console.error(error);
  process.exitCode = 1;
} finally {
  db.release();
  await pool.end();
}
