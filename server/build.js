import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
const result = spawnSync(
  process.execPath,
  [
    fileURLToPath(new URL("../node_modules/vite/bin/vite.js", import.meta.url)),
    "build",
  ],
  {
    stdio: "inherit",
    env: { ...process.env, VITE_USE_API: "true", VITE_API_BASE: "" },
  },
);
if (result.error) console.error(result.error.message);
process.exit(result.status ?? 1);
