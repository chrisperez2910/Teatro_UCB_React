import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
if (!process.env.DATABASE_URL) {
  console.error("Configura DATABASE_URL en esta terminal antes de iniciar.");
  process.exit(1);
}
const vitePath = fileURLToPath(
  new URL("../node_modules/vite/bin/vite.js", import.meta.url),
);
const options = {
  stdio: "inherit",
  env: { ...process.env, VITE_USE_API: "true" },
};
const api = spawn(
  process.execPath,
  [fileURLToPath(new URL("./index.js", import.meta.url))],
  options,
);
const vite = spawn(process.execPath, [vitePath], options);
let stopping = false;
function stop(code = 0) {
  if (stopping) return;
  stopping = true;
  api.kill();
  vite.kill();
  process.exitCode = code;
}
process.on("SIGINT", () => stop());
process.on("SIGTERM", () => stop());
api.on("error", (error) => {
  console.error(error);
  stop(1);
});
vite.on("error", (error) => {
  console.error(error);
  stop(1);
});
api.on("exit", (code) => {
  if (!stopping) {
    console.error("La API se cerró.");
    stop(code || 1);
  }
});
vite.on("exit", (code) => {
  if (!stopping) stop(code || 0);
});
