import {
  createContext,
  PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState
} from "react";
import { ApiHttpError, AuthUser, getCurrentUser, getDiscordLoginUrl, logout as apiLogout } from "./api";

interface AuthContextValue {
  user: AuthUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  refreshSession: () => Promise<void>;
  startDiscordLogin: () => void;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: PropsWithChildren) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refreshSession = useCallback(async () => {
    setIsLoading(true);

    try {
      const sessionUser = await getCurrentUser();
      setUser(sessionUser);
    } catch (error) {
      if (error instanceof ApiHttpError && error.status === 401) {
        setUser(null);
      } else {
        setUser(null);
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void refreshSession();
  }, [refreshSession]);

  const startDiscordLogin = useCallback(() => {
    window.location.href = getDiscordLoginUrl();
  }, []);

  const logout = useCallback(async () => {
    await apiLogout();
    setUser(null);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isLoading,
      isAuthenticated: Boolean(user),
      refreshSession,
      startDiscordLogin,
      logout
    }),
    [user, isLoading, refreshSession, startDiscordLogin, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }

  return context;
}