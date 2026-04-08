import React, { createContext, useContext, useEffect, useState } from "react";
import { useGetMe } from "@workspace/api-client-react";
import type { UsuarioComEmpresa } from "@workspace/api-client-react";
import { setAuthTokenGetter } from "@workspace/api-client-react";

function aplicarCorPrimaria(hex: string) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return;
  let r = parseInt(result[1], 16) / 255;
  let g = parseInt(result[2], 16) / 255;
  let b = parseInt(result[3], 16) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0, l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
    }
  }
  const hsl = `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
  document.documentElement.style.setProperty("--primary", hsl);
  document.documentElement.style.setProperty("--ring", hsl);
}

interface AuthContextType {
  usuario: UsuarioComEmpresa | null;
  empresa: UsuarioComEmpresa["empresa"] | null;
  perfil: UsuarioComEmpresa["perfil"] | null;
  isAdmin: boolean;
  isLoading: boolean;
  token: string | null;
  planoStatus: string | null;
  planoExpiraEm: string | null;
  planoInativo: boolean;
  login: (token: string) => void;
  logout: () => void;
  refetchUsuario: () => void;
  refetchAssinatura: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(localStorage.getItem("vendlysys_token"));
  const [planoStatus, setPlanoStatus] = useState<string | null>(null);
  const [planoExpiraEm, setPlanoExpiraEm] = useState<string | null>(null);

  useEffect(() => {
    setAuthTokenGetter(() => token);
    if (token) {
      localStorage.setItem("vendlysys_token", token);
    } else {
      localStorage.removeItem("vendlysys_token");
      setPlanoStatus(null);
      setPlanoExpiraEm(null);
    }
  }, [token]);

  const { data: usuario, isLoading, error, refetch: refetchMe } = useGetMe({
    query: {
      enabled: !!token,
      retry: false,
    }
  });

  async function fetchAssinatura(tok: string) {
    try {
      const base = (import.meta as any).env?.BASE_URL ?? "/";
      const apiBase = base.endsWith("/") ? `${base}api` : `${base}/api`;
      const res = await fetch(`${apiBase}/assinatura`, {
        headers: { Authorization: `Bearer ${tok}` },
      });
      if (res.ok) {
        const data = await res.json();
        setPlanoStatus(data.plano_status ?? "trial");
        setPlanoExpiraEm(data.plano_expira_em ?? null);
      }
    } catch {}
  }

  useEffect(() => {
    if (error) {
      setToken(null);
    }
  }, [error]);

  useEffect(() => {
    if (usuario?.empresa?.cor_primaria) {
      aplicarCorPrimaria(usuario.empresa.cor_primaria);
    }
    if (usuario && token) {
      fetchAssinatura(token);
    }
  }, [usuario]);

  const planoInativo = planoStatus === "inativo" || planoStatus === "expirado";

  const contextValue: AuthContextType = {
    usuario: usuario || null,
    empresa: usuario?.empresa || null,
    perfil: usuario?.perfil || null,
    isAdmin: usuario?.perfil === "admin",
    isLoading: isLoading && !!token,
    token,
    planoStatus,
    planoExpiraEm,
    planoInativo,
    login: (newToken: string) => setToken(newToken),
    logout: () => setToken(null),
    refetchUsuario: () => { refetchMe(); },
    refetchAssinatura: () => { if (token) fetchAssinatura(token); },
  };

  return <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
