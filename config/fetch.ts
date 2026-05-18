import { API_URL } from "./api";

export async function apiFetch(endpoint: string, options: RequestInit = {}) {
  const isGet = !options.method || options.method === "GET";

  const headers = {
    ...(isGet ? {} : { "Content-Type": "application/json" }),
    "ngrok-skip-browser-warning": "true",
    ...(options.headers || {}),
  };

  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers,
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(data?.error || "Request failed");
  }

  return data;
}