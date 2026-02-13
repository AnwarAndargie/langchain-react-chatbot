import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { login as apiLogin, register as apiRegister, logout as apiLogout } from "@/api/auth";
import { getAuthToken, getStoredUser, setAuthToken, setStoredUser } from "@/api/client";
import type { LoginCredentials, RegisterCredentials, User } from "@/types/auth";

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

interface AuthContextValue extends AuthState {
  login: (credentials: LoginCredentials) => Promise<void>;
  register: (credentials: RegisterCredentials) => Promise<void>;
  logout: () => Promise<void>;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const isAuthenticated = !!token && !!user;

  const login = useCallback(async (credentials: LoginCredentials) => {
    setError(null);
    try {
      const data = await apiLogin(credentials);
      setToken(data.access_token);
      setUser(data.user);
    } catch (e) {
      const message = e instanceof Error ? e.message : "Sign in failed";
      setError(message);
      throw e;
    }
  }, []);

  const register = useCallback(async (credentials: RegisterCredentials) => {
    setError(null);
    try {
      const data = await apiRegister(credentials);
      setToken(data.access_token);
      setUser(data.user);
    } catch (e) {
      const message = e instanceof Error ? e.message : "Sign up failed";
      setError(message);
      throw e;
    }
  }, []);

  const logout = useCallback(async () => {
    setError(null);
    try {
      await apiLogout();
    } finally {
      setToken(null);
      setUser(null);
      setAuthToken(null);
      setStoredUser(null);
    }
  }, []);

  const clearError = useCallback(() => setError(null), []);

  // Restore session from storage on mount
  useEffect(() => {
    const storedToken = getAuthToken();
    const storedUser = getStoredUser();
    if (storedToken && storedUser) {
      setToken(storedToken);
      setUser(storedUser);
    }
    setIsLoading(false);
  }, []);

  // Listen for 401 unauthorized events from api client
  useEffect(() => {
    const handleUnauthorized = () => {
      logout();
    };
    window.addEventListener("auth:unauthorized", handleUnauthorized);
    return () => window.removeEventListener("auth:unauthorized", handleUnauthorized);
  }, [logout]);

  // Check token expiration and set timer
  useEffect(() => {
    if (!token) return;

    try {
      // Basic JWT decoding
      const base64Url = token.split(".")[1];
      if (!base64Url) return;

      const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
      const jsonPayload = decodeURIComponent(
        atob(base64)
          .split("")
          .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
          .join("")
      );

      const payload = JSON.parse(jsonPayload);

      if (payload.exp) {
        const currentTime = Date.now();
        const expiryTime = payload.exp * 1000;
        const timeLeft = expiryTime - currentTime;

        // If expired or about to expire in 1s, logout
        if (timeLeft <= 1000) {
          logout();
        } else {
          const timeoutId = setTimeout(() => {
            logout();
          }, timeLeft);
          return () => clearTimeout(timeoutId);
        }
      }
    } catch {
      // Token invalid or unparseable; ignore (user will be logged out on next 401)
    }
  }, [token, logout]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      token,
      isAuthenticated,
      isLoading,
      error,
      login,
      register,
      logout,
      clearError,
    }),
    [user, token, isAuthenticated, isLoading, error, login, register, logout, clearError]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return ctx;
}
