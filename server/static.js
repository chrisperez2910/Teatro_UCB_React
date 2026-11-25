import { readFile, stat } from "node:fs/promises";
import { resolve, extname, sep } from "node:path";
import { fileURLToPath } from "node:url";
const root = fileURLToPath(new URL("../dist/", import.meta.url));
const types = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".jpg": "image/jpeg",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".webp": "image/webp",
  ".ico": "image/x-icon",
  ".mp4": "video/mp4",
};
export async function serveFrontend(path, res) {
  let decoded;
  try {
    decoded = decodeURIComponent(path);
  } catch {
    return false;
  }
  const file = resolve(root, "." + (decoded === "/" ? "/index.html" : decoded));
  if (!file.startsWith(root.endsWith(sep) ? root : root + sep)) return false;
  try {
    if (!(await stat(file)).isFile()) return false;
    const content = await readFile(file);
    res.writeHead(200, {
      "Content-Type": types[extname(file)] || "application/octet-stream",
      "Cache-Control": file.endsWith(".html")
        ? "no-cache"
        : "public, max-age=3600",
      "X-Content-Type-Options": "nosniff",
    });
    res.end(content);
    return true;
  } catch {
    return false;
  }
}
