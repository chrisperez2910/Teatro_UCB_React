import pg from "pg";
const correo = process.argv[2]?.trim().toLowerCase();
if (!process.env.DATABASE_URL || !correo) {
  console.error(
    "Configura DATABASE_URL y ejecuta: npm.cmd run admin:grant -- tu-correo@example.com",
  );
  process.exit(1);
}
const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  connectionTimeoutMillis: 5000,
});
try {
  const result = await pool.query(
    "UPDATE usuario SET rol='ADMIN' WHERE lower(correo)=$1 RETURNING nombre",
    [correo],
  );
  if (!result.rowCount)
    throw new Error("Primero crea esa cuenta desde la página.");
  console.log(
    `Permiso de administración asignado a ${result.rows[0].nombre}. Recarga la página.`,
  );
} catch (e) {
  console.error(e.message);
  process.exitCode = 1;
} finally {
  await pool.end();
}
