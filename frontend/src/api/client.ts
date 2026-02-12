/**
 * Base API client. Reads VITE_API_URL (e.g. http://localhost:8000).
 * Attaches Authorization header when a token is available.
 */

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:8000";

export function getApiUrl(path: string): string {
  const base = API_URL.replace(/\/$/, "");
  const p = path.startsWith("/") ? path : `/${path}`;
  return `${base}${p}`;
}

export function getAuthToken(): string | null {
  return localStorage.getItem("auth_token");
}

export function setAuthToken(token: string | null): void {
  if (token == null) {
    localStorage.removeItem("auth_token");
  } else {
    localStorage.setItem("auth_token", token);
  }
}

export function getStoredUser(): import("@/types/auth").User | null {
  try {
    const raw = localStorage.getItem("auth_user");
    if (!raw) return null;
    return JSON.parse(raw) as import("@/types/auth").User;
  } catch {
    return null;
  }
}

export function setStoredUser(user: import("@/types/auth").User | null): void {
  if (user == null) {
    localStorage.removeItem("auth_user");
  } else {
    localStorage.setItem("auth_user", JSON.stringify(user));
  }
}

export interface RequestConfig extends RequestInit {
  skipAuth?: boolean;
}

export async function apiRequest<T>(path: string, config: RequestConfig = {}): Promise<T> {
  const { skipAuth, ...init } = config;
  const url = getApiUrl(path);
  const headers = new Headers(init.headers as HeadersInit);
  if (!headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  if (!skipAuth) {
    const token = getAuthToken();
    if (token) {
      headers.set("Authorization", `Bearer ${token}`);
    }
  }
  const res = await fetch(url, { ...init, headers });
  if (!res.ok) {
    const body = await res.text();
    let message = body;
    try {
      const j = JSON.parse(body);
      if (j.detail) message = typeof j.detail === "string" ? j.detail : JSON.stringify(j.detail);
    } catch {
      // use body as message
    }
    throw new Error(message || `Request failed: ${res.status}`);
  }
  const contentType = res.headers.get("Content-Type");
  if (contentType?.includes("application/json")) {
    return res.json() as Promise<T>;
  }
  return res.text() as Promise<T>;
}
