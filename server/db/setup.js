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
  const migration = await db.query(
    "INSERT INTO migracion_aplicada(nombre) VALUES('v5-imagenes-y-catalogo') ON CONFLICT DO NOTHING RETURNING nombre",
  );
  if (migration.rowCount) {
    for (const obra of seed.obras) {
      await db.query(
        "UPDATE obra SET imagen=$1 WHERE id_obra=$2 AND titulo=$3",
        [obra.imagen, obra.id_obra, obra.titulo],
      );
      if (obra.video_avance_url)
        await db.query(
          "UPDATE obra SET video_avance_url=$1 WHERE id_obra=$2 AND titulo=$3 AND (video_avance_url IS NULL OR video_avance_url='assets/video/avance-demo.mp4')",
          [obra.video_avance_url, obra.id_obra, obra.titulo],
        );
    }
    for (const img of seed.imagenes)
      await db.query(
        "UPDATE imagen_produccion SET url_original=$1,url_pequena=$2,texto_alternativo=$3 WHERE id_imagen=$4 AND id_produccion=$5",
        [
          img.url_original,
          img.url_pequena,
          img.texto_alternativo,
          img.id_imagen,
          img.id_produccion,
        ],
      );
    await db.query(
      "UPDATE sala SET nombre='Sala principal' WHERE nombre='Sala principal · ejemplo'",
    );
    // Estos lugares proceden únicamente de la antigua carga de demostración.
    // Las reservas y reserva_butaca de los usuarios permanecen intactas.
    await db.query("UPDATE ocupacion_ejemplo SET vigente=false WHERE vigente");
  }
  await db.query("COMMIT");
  console.log("Base de datos actualizada.");
} catch (error) {
  await db.query("ROLLBACK");
  console.error(error);
  process.exitCode = 1;
} finally {
  db.release();
  await pool.end();
}
