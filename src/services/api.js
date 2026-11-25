const base = (import.meta.env.VITE_API_BASE || "").replace(/\/$/, "");
export const useDatabase = import.meta.env.VITE_USE_API === "true";
export async function apiRequest(path, options = {}) {
  const response = await fetch(`${base}/api/${path}`, {
    ...options,
    credentials: "same-origin",
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok)
    throw new Error(result.error || `Error HTTP ${response.status}`);
  return result;
}
