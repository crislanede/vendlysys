import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useCallback, useContext, useEffect, useState } from "react";

export type UsuarioStaff = {
  id: number;
  nome: string;
  email: string;
  perfil: "admin" | "agenda";
  empresa_id: number;
  empresa?: {
    id: number;
    nome: string;
    slug: string;
    logo_url?: string | null;
    cor_primaria?: string | null;
    termos_aceitos_em?: string | null;
  };
};

export type UsuarioCliente = {
  id: number;
  nome: string;
  telefone: string;
  email?: string | null;
  data_nascimento?: string | null;
  empresa: {
    id: number;
    nome: string;
    slug: string;
    logo_url?: string | null;
    cor_primaria?: string | null;
  };
};

type AuthState =
  | { tipo: "staff"; token: string; usuario: UsuarioStaff }
  | { tipo: "cliente"; token: string; usuario: UsuarioCliente }
  | { tipo: "none" };

type AuthContextType = {
  auth: AuthState;
  loading: boolean;
  loginStaff: (token: string, usuario: UsuarioStaff) => Promise<void>;
  loginCliente: (token: string, usuario: UsuarioCliente) => Promise<void>;
  logout: () => Promise<void>;
  setClienteData: (updated: Partial<UsuarioCliente>) => void;
  updateStaffEmpresa: (empresa: Partial<UsuarioStaff["empresa"]>) => void;
};

const AuthContext = createContext<AuthContextType | null>(null);

const STORAGE_KEY = "vendlysys_auth";

const API_BASE = process.env.EXPO_PUBLIC_DOMAIN
  ? `https://${process.env.EXPO_PUBLIC_DOMAIN}/api`
  : "http://localhost:8080/api";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [auth, setAuth] = useState<AuthState>({ tipo: "none" });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then(async (raw) => {
        if (!raw) return;
        const parsed = JSON.parse(raw) as AuthState;
        setAuth(parsed);
        if (parsed.tipo === "staff") {
          try {
            const res = await fetch(`${API_BASE}/auth/me`, {
              headers: { Authorization: `Bearer ${parsed.token}` },
            });
            if (res.ok) {
              const data = await res.json();
              if (data.empresa) {
                const next: AuthState = {
                  ...parsed,
                  usuario: { ...parsed.usuario, empresa: data.empresa },
                };
                setAuth(next);
                AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next)).catch(() => {});
              }
            }
          } catch {}
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const loginStaff = useCallback(async (token: string, usuario: UsuarioStaff) => {
    const state: AuthState = { tipo: "staff", token, usuario };
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    setAuth(state);
  }, []);

  const loginCliente = useCallback(async (token: string, usuario: UsuarioCliente) => {
    const state: AuthState = { tipo: "cliente", token, usuario };
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    setAuth(state);
  }, []);

  const logout = useCallback(async () => {
    await AsyncStorage.removeItem(STORAGE_KEY);
    setAuth({ tipo: "none" });
  }, []);

  const setClienteData = useCallback((updated: Partial<UsuarioCliente>) => {
    setAuth((prev) => {
      if (prev.tipo !== "cliente") return prev;
      const next: AuthState = { ...prev, usuario: { ...prev.usuario, ...updated } };
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next)).catch(() => {});
      return next;
    });
  }, []);

  const updateStaffEmpresa = useCallback((empresa: Partial<UsuarioStaff["empresa"]>) => {
    setAuth((prev) => {
      if (prev.tipo !== "staff") return prev;
      const next: AuthState = {
        ...prev,
        usuario: {
          ...prev.usuario,
          empresa: { ...prev.usuario.empresa, ...empresa } as UsuarioStaff["empresa"],
        },
      };
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next)).catch(() => {});
      return next;
    });
  }, []);

  return (
    <AuthContext.Provider value={{ auth, loading, loginStaff, loginCliente, logout, setClienteData, updateStaffEmpresa }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
