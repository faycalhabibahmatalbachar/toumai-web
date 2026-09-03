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
  SESSION_STORAGE_KEY,
  clearSession,
  ensureFreshSession,
  guestLogin,
  loadSession,
  login as apiLogin,
  loginAvecCode as apiLoginAvecCode,
  estUnDefiMfa,
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
  /** Rend `{ mfaPendingToken }` quand un second facteur est exigé — la
   *  session n'est PAS ouverte dans ce cas —, `null` quand elle l'est. */
  loginWithPassword: (
    email: string,
    password: string,
    turnstileToken?: string | null,
  ) => Promise<{ mfaPendingToken: string } | null>;
  /** Étape 2 : le code à six chiffres, ou l'un des codes de secours. */
  finirAvecCode: (pendingToken: string, code: string) => Promise<void>;
  loginWithGoogle: (idToken: string) => Promise<void>;
  registerAccount: (
    email: string,
    password: string,
    name: string,
    turnstileToken?: string | null,
  ) => Promise<boolean>;
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

  // ── La session s'entretient toute seule ────────────────────────────────
  //
  // Le jeton d'accès dure trente minutes. Attendre un 401 pour le renouveler,
  // c'est laisser au moins une requête échouer — et une requête de trop
  // renvoyait la personne sur « votre session a expiré ». On renouvelle donc
  // AVANT l'échéance : à intervalle régulier, au retour sur l'onglet, et au
  // retour du réseau. Chaque appel est mutualisé côté `api.ts`, donc trois
  // déclencheurs ne font pas trois rotations de jeton.
  useEffect(() => {
    if (!session) return;
    const tick = () => void ensureFreshSession();
    const onVisible = () => {
      if (document.visibilityState === "visible") tick();
    };
    const id = window.setInterval(tick, 5 * 60_000);
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("online", tick);
    window.addEventListener("focus", tick);
    return () => {
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("online", tick);
      window.removeEventListener("focus", tick);
    };
  }, [session]);

  // Un autre onglet vient de renouveler (ou de se déconnecter) : on adopte sa
  // session au lieu de continuer avec un jeton que le serveur a fait tourner.
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key !== SESSION_STORAGE_KEY) return;
      setSession(loadSession());
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const loginAsGuest = useCallback(async () => {
    const s = await guestLogin();
    setSession(s);
    void registerDeviceOnce();
  }, []);

  /** Connexion par mot de passe.
   *
   * Rend le jeton d'attente quand un second facteur est exigé — et n'ouvre
   * alors AUCUNE session. L'écran de connexion demande le code, puis appelle
   * `finirAvecCode`. Poser des jetons ici pour les retirer ensuite laisserait
   * une fenêtre, courte mais réelle, où le compte est ouvert sans le code. */
  const loginWithPassword = useCallback(async (
    email: string,
    password: string,
    turnstileToken?: string | null,
  ): Promise<{ mfaPendingToken: string } | null> => {
    const s = await apiLogin(email, password, turnstileToken);
    if (estUnDefiMfa(s)) return { mfaPendingToken: s.pending_token };
    cachePurge(); // changement d'identité : jamais servir le cache d'un autre compte
    setSession(s);
    void registerDeviceOnce();
    return null;
  }, []);

  /** Étape 2 : le code à six chiffres, ou l'un des codes de secours. */
  const finirAvecCode = useCallback(async (pendingToken: string, code: string) => {
    const s = await apiLoginAvecCode(pendingToken, code);
    cachePurge();
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
    async (
      email: string,
      password: string,
      name: string,
      turnstileToken?: string | null,
    ) => {
      const s = await apiRegister(email, password, name, turnstileToken);
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
      value={{ session, loading, loginAsGuest, loginWithPassword, finirAvecCode, loginWithGoogle, registerAccount, logout }}
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
