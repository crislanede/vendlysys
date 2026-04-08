import { useState } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

/* ── Brand Colors (VendlySys logo) ── */
const NAVY         = "#1C3A6E";
const BLUE         = "#2B5BA5";
const ORANGE       = "#F47B1E";
const TEAL         = "#0BA5A0";
const BG           = "#EEF3FF";
const LIGHT_ORANGE = "#FFF4EA";
const MUTED        = "#6B80A0";

async function apiPost(path: string, body: object) {
  const res = await fetch(`${BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? "Erro na requisição.");
  return data;
}

export default function Login() {
  const [, setLocation] = useLocation();
  const { login: setAuthToken } = useAuth();
  const { toast } = useToast();
  const [showRegistro, setShowRegistro] = useState(false);

  /* Login */
  const [loginEmail, setLoginEmail]   = useState("");
  const [loginSenha, setLoginSenha]   = useState("");
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginErro, setLoginErro]     = useState<string | null>(null);
  const [showLoginSenha, setShowLoginSenha] = useState(false);

  /* Registro */
  const [empresaNome, setEmpresaNome]     = useState("");
  const [nome, setNome]                   = useState("");
  const [email, setEmail]                 = useState("");
  const [telefone, setTelefone]           = useState("");
  const [senha, setSenha]                 = useState("");
  const [senhaConfirma, setSenhaConfirma] = useState("");
  const [showSenha, setShowSenha]         = useState(false);
  const [regLoading, setRegLoading]       = useState(false);
  const [regErro, setRegErro]             = useState<string | null>(null);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    if (!loginEmail.trim() || !loginSenha.trim()) {
      setLoginErro("Preencha e-mail e senha.");
      return;
    }
    setLoginErro(null);
    setLoginLoading(true);
    try {
      const data = await apiPost("/api/auth/login", { email: loginEmail.trim(), senha: loginSenha });
      setAuthToken(data.token);
      setLocation("/inicio");
    } catch (e: any) {
      setLoginErro(e.message ?? "Credenciais inválidas.");
    } finally {
      setLoginLoading(false);
    }
  }

  async function handleRegistro(e: React.FormEvent) {
    e.preventDefault();
    setRegErro(null);
    if (!empresaNome.trim())                        { setRegErro("Informe o nome da empresa."); return; }
    if (!nome.trim())                               { setRegErro("Informe o seu nome."); return; }
    if (!email.trim() || !email.includes("@"))      { setRegErro("Informe um e-mail válido."); return; }
    if (!senha || senha.length < 6)                 { setRegErro("Senha deve ter pelo menos 6 caracteres."); return; }
    if (senha !== senhaConfirma)                    { setRegErro("As senhas não coincidem."); return; }
    setRegLoading(true);
    try {
      const data = await apiPost("/api/auth/registro", {
        empresa_nome: empresaNome.trim(),
        nome: nome.trim(),
        email: email.trim().toLowerCase(),
        telefone: telefone.trim() || undefined,
        senha,
      });
      setAuthToken(data.token);
      toast({ title: "Empresa criada com sucesso! Bem-vindo ao VendlySys." });
      setLocation("/inicio");
    } catch (e: any) {
      setRegErro(e.message ?? "Erro ao criar conta.");
    } finally {
      setRegLoading(false);
    }
  }

  const inputStyle: React.CSSProperties = {
    width: "100%",
    border: `1.5px solid #C5D4EE`,
    borderRadius: 12,
    padding: "13px 16px",
    fontSize: 15,
    color: NAVY,
    background: "#F8FAFF",
    outline: "none",
    boxSizing: "border-box",
    fontFamily: "inherit",
  };

  const labelStyle: React.CSSProperties = {
    fontSize: 10,
    fontWeight: 800,
    letterSpacing: 1.2,
    textTransform: "uppercase",
    color: MUTED,
    marginBottom: 6,
    display: "block",
  };

  const fieldWrap: React.CSSProperties = {
    position: "relative",
    display: "flex",
    flexDirection: "column",
  };

  const eyeBtn: React.CSSProperties = {
    position: "absolute",
    right: 14,
    top: "50%",
    transform: "translateY(-50%)",
    background: "none",
    border: "none",
    cursor: "pointer",
    color: MUTED,
    fontSize: 15,
    padding: 0,
    lineHeight: 1,
  };

  const navyBtn: React.CSSProperties = {
    width: "100%",
    background: `linear-gradient(135deg, ${BLUE}, ${NAVY})`,
    color: "#fff",
    border: 0,
    borderRadius: 14,
    padding: "14px 20px",
    fontWeight: 800,
    cursor: "pointer",
    fontSize: 15,
    boxShadow: `0 6px 18px rgba(28,58,110,0.25)`,
    marginTop: 4,
  };

  const orangeBtn: React.CSSProperties = {
    width: "100%",
    background: `linear-gradient(135deg, ${ORANGE}, #D86210)`,
    color: "#fff",
    border: 0,
    borderRadius: 14,
    padding: "14px 20px",
    fontWeight: 800,
    cursor: "pointer",
    fontSize: 15,
    boxShadow: `0 6px 18px rgba(244,123,30,0.28)`,
    marginTop: 4,
  };

  const sectionLabel: React.CSSProperties = {
    fontSize: 10,
    fontWeight: 800,
    letterSpacing: 1.4,
    textTransform: "uppercase",
    color: ORANGE,
    marginBottom: 10,
    marginTop: 4,
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: `linear-gradient(160deg, ${BG} 0%, #F8FAFF 60%, #FFF4EA 100%)`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px 16px",
        fontFamily: "'Inter', sans-serif",
      }}
    >
      {/* Decorative circles */}
      <div style={{ position: "fixed", top: -80, right: -80, width: 300, height: 300, borderRadius: "50%", background: `${TEAL}18`, pointerEvents: "none" }} />
      <div style={{ position: "fixed", bottom: -60, left: -60, width: 220, height: 220, borderRadius: "50%", background: `${ORANGE}14`, pointerEvents: "none" }} />

      <div style={{ width: "100%", maxWidth: 460, position: "relative", zIndex: 1 }}>
        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <img
            src={`${import.meta.env.BASE_URL}vendlysys-logo.png`}
            alt="VendlySys"
            style={{ width: 240, height: "auto", maxHeight: 90, objectFit: "contain" }}
          />
        </div>

        {/* Card */}
        <div
          style={{
            background: "#fff",
            borderRadius: 24,
            boxShadow: `0 8px 40px rgba(28,58,110,0.10)`,
            overflow: "hidden",
            border: `1px solid #DDE8FF`,
          }}
        >
          {/* Colored top bar */}
          <div style={{ height: 4, background: `linear-gradient(90deg, ${TEAL}, ${BLUE}, ${ORANGE})` }} />

          <div style={{ padding: 28 }}>
            {/* ─── LOGIN ─── */}
            {!showRegistro && (
              <form onSubmit={handleLogin} style={{ display: "flex", flexDirection: "column", gap: 18 }}>
                <p style={{ margin: "0 0 4px", fontSize: 15, color: MUTED, lineHeight: 1.5 }}>
                  Acesse o painel de gestão da sua empresa.
                </p>

                <div style={fieldWrap}>
                  <label style={labelStyle}>E-mail</label>
                  <input
                    type="email"
                    placeholder="seu@email.com"
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    autoComplete="email"
                    style={inputStyle}
                    required
                  />
                </div>

                <div style={fieldWrap}>
                  <label style={labelStyle}>Senha</label>
                  <input
                    type={showLoginSenha ? "text" : "password"}
                    placeholder="••••••••"
                    value={loginSenha}
                    onChange={(e) => setLoginSenha(e.target.value)}
                    autoComplete="current-password"
                    style={{ ...inputStyle, paddingRight: 44 }}
                    required
                  />
                  <button type="button" style={eyeBtn} onClick={() => setShowLoginSenha((v) => !v)} tabIndex={-1}>
                    {showLoginSenha ? "🙈" : "👁"}
                  </button>
                </div>

                {loginErro && (
                  <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 12, padding: "10px 14px", fontSize: 13, color: "#dc2626", display: "flex", alignItems: "center", gap: 8 }}>
                    ⚠️ {loginErro}
                  </div>
                )}

                <button type="submit" disabled={loginLoading} style={{ ...navyBtn, opacity: loginLoading ? 0.7 : 1 }}>
                  {loginLoading ? "Entrando..." : "Entrar"}
                </button>

                <p style={{ margin: 0, textAlign: "center", fontSize: 13, color: MUTED }}>
                  Ainda não tem conta?{" "}
                  <button type="button" onClick={() => setShowRegistro(true)} style={{ background: "none", border: "none", color: ORANGE, fontWeight: 700, cursor: "pointer", fontSize: 13, padding: 0 }}>
                    Criar minha empresa
                  </button>
                </p>
              </form>
            )}

            {/* ─── REGISTRO ─── */}
            {showRegistro && (
              <form onSubmit={handleRegistro} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                {/* Empresa */}
                <div>
                  <p style={sectionLabel}>🏢 Dados da Empresa</p>
                  <div style={fieldWrap}>
                    <label style={labelStyle}>Nome do salão / clínica / barbearia *</label>
                    <input type="text" placeholder="Ex: Studio Bella, Clínica Áurea..." value={empresaNome} onChange={(e) => setEmpresaNome(e.target.value)} style={inputStyle} required />
                  </div>
                </div>

                {/* Seus dados */}
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  <p style={sectionLabel}>👤 Seus Dados (Administrador)</p>

                  <div style={fieldWrap}>
                    <label style={labelStyle}>Seu nome completo *</label>
                    <input type="text" placeholder="Nome completo" value={nome} onChange={(e) => setNome(e.target.value)} style={inputStyle} required />
                  </div>

                  <div style={fieldWrap}>
                    <label style={labelStyle}>E-mail de acesso *</label>
                    <input type="email" placeholder="seu@email.com" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" style={inputStyle} required />
                  </div>

                  <div style={fieldWrap}>
                    <label style={labelStyle}>Telefone (opcional)</label>
                    <input type="tel" placeholder="(00) 00000-0000" value={telefone} onChange={(e) => setTelefone(e.target.value)} style={inputStyle} />
                  </div>

                  <div style={fieldWrap}>
                    <label style={labelStyle}>Senha * (mínimo 6 caracteres)</label>
                    <input type={showSenha ? "text" : "password"} placeholder="••••••••" value={senha} onChange={(e) => setSenha(e.target.value)} autoComplete="new-password" style={{ ...inputStyle, paddingRight: 44 }} required />
                    <button type="button" style={eyeBtn} onClick={() => setShowSenha((v) => !v)} tabIndex={-1}>
                      {showSenha ? "🙈" : "👁"}
                    </button>
                  </div>

                  <div style={fieldWrap}>
                    <label style={labelStyle}>Confirmar senha *</label>
                    <input type={showSenha ? "text" : "password"} placeholder="••••••••" value={senhaConfirma} onChange={(e) => setSenhaConfirma(e.target.value)} autoComplete="new-password" style={inputStyle} required />
                  </div>
                </div>

                {regErro && (
                  <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 12, padding: "10px 14px", fontSize: 13, color: "#dc2626", display: "flex", alignItems: "center", gap: 8 }}>
                    ⚠️ {regErro}
                  </div>
                )}

                <button type="submit" disabled={regLoading} style={{ ...orangeBtn, opacity: regLoading ? 0.7 : 1 }}>
                  {regLoading ? "Criando conta..." : "✓ Criar minha empresa"}
                </button>

                {/* Info */}
                <div style={{ background: LIGHT_ORANGE, border: `1px solid #FFD4A0`, borderRadius: 12, padding: "12px 14px", fontSize: 12, color: "#8B4A10", lineHeight: 1.6, display: "flex", gap: 8, alignItems: "flex-start" }}>
                  <span>ℹ️</span>
                  <span>Você entrará como administrador. Poderá cadastrar equipe, serviços e clientes logo em seguida. Trial de 15 dias gratuito.</span>
                </div>

                <p style={{ margin: 0, textAlign: "center", fontSize: 13, color: MUTED }}>
                  Já tem conta?{" "}
                  <button type="button" onClick={() => setShowRegistro(false)} style={{ background: "none", border: "none", color: BLUE, fontWeight: 700, cursor: "pointer", fontSize: 13, padding: 0 }}>
                    Fazer login
                  </button>
                </p>
              </form>
            )}
          </div>
        </div>

        {/* Footer */}
        <p style={{ textAlign: "center", marginTop: 24, fontSize: 12, color: MUTED }}>
          VendlySys © {new Date().getFullYear()} — Sistema PDV Moderno e Eficiente
        </p>
      </div>
    </div>
  );
}
