const domain = process.env.EXPO_PUBLIC_API_URL
  ?? (process.env.EXPO_PUBLIC_DOMAIN ? `https://${process.env.EXPO_PUBLIC_DOMAIN}/api` : null);

if (!domain) {
  console.warn("[api] EXPO_PUBLIC_API_URL ou EXPO_PUBLIC_DOMAIN não definido!");
}

export const API_BASE = domain ?? "https://CONFIGURE_API_URL_HERE/api";

async function request(
  method: string,
  path: string,
  body: unknown,
  token: string | null
): Promise<any> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    let msg = `HTTP ${res.status}`;
    try {
      const json = await res.json();
      msg = json.error ?? json.message ?? msg;
    } catch {}
    throw new Error(msg);
  }

  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

export const api = {
  get: (path: string, token: string | null) => request("GET", path, undefined, token),
  post: (path: string, body: unknown, token: string | null) => request("POST", path, body, token),
  put: (path: string, body: unknown, token: string | null) => request("PUT", path, body, token),
  del: (path: string, token: string | null) => request("DELETE", path, undefined, token),
};
