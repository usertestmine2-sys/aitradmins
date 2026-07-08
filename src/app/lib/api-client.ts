// AITradeMinds — Browser API client. Typed fetch wrapper with token handling.
// Consumes the existing /api/v1 surface. No business logic duplicated here.
"use client";

const TOKEN_KEY = "aitm_token";

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string): void {
  window.localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken(): void {
  window.localStorage.removeItem(TOKEN_KEY);
}

export interface ApiError {
  message: string;
  code?: string;
  status: number;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(init?.headers as Record<string, string> | undefined),
  };
  if (token) headers.authorization = `Bearer ${token}`;

  const res = await fetch(path, { ...init, headers });
  let body: { ok: boolean; data?: T; error?: string; code?: string } | null = null;
  try {
    body = await res.json();
  } catch {
    /* non-JSON response */
  }
  if (!res.ok || !body?.ok) {
    const err: ApiError = {
      message: body?.error ?? `Request failed (${res.status})`,
      code: body?.code,
      status: res.status,
    };
    throw err;
  }
  return body.data as T;
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, data?: unknown) =>
    request<T>(path, { method: "POST", body: data ? JSON.stringify(data) : undefined }),
};
