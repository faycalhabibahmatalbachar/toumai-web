"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

import {
  clearSession,
  guestLogin,
  loadSession,
  login as apiLogin,
  loginWithGoogle as apiLoginWithGoogle,
  register as apiRegister,
  type TokenPayload,
} from "./api";
import { cachePurge } from "./swr-cache";
import { registerDeviceOnce } from "./device-fingerprint";

interface AuthState {
  session: TokenPayload | null;
  loading: boolean;
  loginAsGuest: () => Promise<void>;
  loginWithPassword: (email: string, password: string) => Promise<void>;
  loginWithGoogle: (idToken: string) => Promise<void>;
  registerAccount: (email: string, password: string, name: string) => Promise<boolean>;
  logout: () => void;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<TokenPayload | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const s = loadSession();
    setSession(s);
    setLoading(false);
    if (s) void registerDeviceOnce();
  }, []);

  const loginAsGuest = useCallback(async () => {
    const s = await guestLogin();
    setSession(s);
    void registerDeviceOnce();
  }, []);

  const loginWithPassword = useCallback(async (email: string, password: string) => {
    const s = await apiLogin(email, password);
    cachePurge(); // changement d'identité : jamais servir le cache d'un autre compte
    setSession(s);
    void registerDeviceOnce();
  }, []);

  const loginWithGoogle = useCallback(async (idToken: string) => {
    const s = await apiLoginWithGoogle(idToken);
    cachePurge();
    setSession(s);
    void registerDeviceOnce();
  }, []);

  const registerAccount = useCallback(
    async (email: string, password: string, name: string) => {
      const s = await apiRegister(email, password, name);
      if (s) {
        cachePurge();
        setSession(s);
        void registerDeviceOnce();
        return true;
      }
      return false;
    },
    [],
  );

  const logout = useCallback(() => {
    clearSession();
    cachePurge(); // les données mises en cache appartiennent à la session close
    window.sessionStorage.removeItem("toumai_device_registered_v1");
    setSession(null);
  }, []);

  return (
    <AuthContext.Provider
      value={{ session, loading, loginAsGuest, loginWithPassword, loginWithGoogle, registerAccount, logout }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth doit être utilisé dans <AuthProvider>");
  return ctx;
}
