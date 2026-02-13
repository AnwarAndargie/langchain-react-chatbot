import { apiRequest, getApiUrl, getAuthToken, setAuthToken, setStoredUser } from "@/api/client";
import type { LoginCredentials, RegisterCredentials, TokenResponse, User } from "@/types/auth";

/** Backend returns flat shape; we normalize to TokenResponse with nested user */
interface AuthApiResponse {
  access_token: string;
  token_type?: string;
  user_id: string;
  email: string;
  expires_in?: number;
}

/** When email confirmation is enabled, register returns this instead of tokens */
export interface RequiresConfirmationResponse {
  requires_confirmation: true;
  message: string;
}

function normalizeAuthResponse(data: AuthApiResponse): TokenResponse {
  const user: User = {
    id: String(data.user_id),
    email: data.email,
    full_name: null,
  };
  return {
    access_token: data.access_token,
    token_type: data.token_type ?? "bearer",
    user,
  };
}

export async function login(credentials: LoginCredentials): Promise<TokenResponse> {
  const data = await apiRequest<AuthApiResponse>("/auth/login", {
    method: "POST",
    body: JSON.stringify(credentials),
    skipAuth: true,
  });
  const normalized = normalizeAuthResponse(data);
  setAuthToken(normalized.access_token);
  setStoredUser(normalized.user);
  return normalized;
}

export type RegisterResult = TokenResponse | RequiresConfirmationResponse;

export async function register(credentials: RegisterCredentials): Promise<RegisterResult> {
  const data = await apiRequest<AuthApiResponse | RequiresConfirmationResponse>("/auth/register", {
    method: "POST",
    body: JSON.stringify({
      email: credentials.email,
      password: credentials.password,
    }),
    skipAuth: true,
  });

  if ("requires_confirmation" in data && data.requires_confirmation) {
    return { requires_confirmation: true, message: data.message };
  }

  const normalized = normalizeAuthResponse(data as AuthApiResponse);
  setAuthToken(normalized.access_token);
  setStoredUser(normalized.user);
  return normalized;
}

/**
 * Logout: clear local session first (so no 401 handler or double-logout sends
 * a request without a token), then optionally notify the backend if we had a token.
 * Uses direct fetch for the logout request so a 401 (e.g. expired token) does not
 * trigger auth:unauthorized and a logout loop.
 */
export async function logout(): Promise<void> {
  const token = getAuthToken();
  setAuthToken(null);
  setStoredUser(null);

  if (!token) return;

  try {
    const res = await fetch(getApiUrl("/auth/logout"), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    });
    if (!res.ok) {
      // Best-effort: do not throw or dispatch; we are already logged out locally
    }
  } catch {
    // Ignore network errors; local session is already cleared
  }
}
