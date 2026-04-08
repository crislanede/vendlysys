import { useEffect, useState } from "react";
import { useParams } from "wouter";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

type EmpresaPublica = {
  nome: string;
  logo_url?: string | null;
  cor_primaria?: string | null;
};

export default function BaixarApp() {
  const params = useParams<{ slug: string }>();
  const slug = params.slug ?? "";
  const [empresa, setEmpresa] = useState<EmpresaPublica | null>(null);
  const [erro, setErro] = useState(false);

  useEffect(() => {
    if (!slug) return;
    fetch(`${BASE}/api/portal/empresa/${slug}`)
      .then((r) => r.json())
      .then((d) => setEmpresa(d))
      .catch(() => setErro(true));
  }, [slug]);

  const cor = empresa?.cor_primaria || "#b8956f";

  const portalUrl = `${BASE}/portal/${slug}`;

  return (
    <div style={styles.root}>
      {/* Fundo gradiente suave */}
      <div style={{ ...styles.bg, background: `linear-gradient(160deg, ${cor}18 0%, #f5f3f2 50%, #ede8e3 100%)` }} />

      <div style={styles.card}>
        {/* Logo / Avatar */}
        <div style={{ ...styles.logoWrap, borderColor: cor }}>
          {empresa?.logo_url ? (
            <img src={empresa.logo_url} alt={empresa.nome} style={styles.logoImg} />
          ) : (
            <div style={{ ...styles.logoFallback, background: cor }}>
              <span style={styles.logoLetter}>
                {empresa?.nome?.[0]?.toUpperCase() ?? "✦"}
              </span>
            </div>
          )}
        </div>

        {/* Nome */}
        <h1 style={styles.nome}>{erro ? "Estabelecimento" : (empresa?.nome ?? "Carregando...")}</h1>

        {/* Divisor */}
        <div style={{ ...styles.divisor, background: cor }} />

        {/* Mensagem principal */}
        <div style={styles.appIcon}>
          <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
            <rect width="48" height="48" rx="12" fill={cor} />
            <path d="M14 34V22l10-8 10 8v12H30v-8h-4v8H14z" fill="white" opacity="0.9" />
            <circle cx="34" cy="14" r="6" fill="white" opacity="0.3" />
            <path d="M31 14l2 2 4-4" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>

        <h2 style={styles.titulo}>Nosso aplicativo está chegando!</h2>
        <p style={styles.descricao}>
          Em breve você poderá agendar, acompanhar seu histórico e receber
          notificações direto pelo app — disponível para Android e iOS.
        </p>

        {/* Badges em breve */}
        <div style={styles.badgesRow}>
          <div style={styles.badge}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0 }}>
              <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" fill="currentColor"/>
            </svg>
            <div>
              <div style={styles.badgeLabel}>Em breve</div>
              <div style={styles.badgeStore}>App Store</div>
            </div>
          </div>

          <div style={styles.badge}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0 }}>
              <path d="M3.18 23.76c.3.17.64.22.99.13l11.37-11.37L11.85 9 3.18 23.76zM20.7 10.43l-2.83-1.63L14.4 12l3.47 3.47 2.83-1.63c.81-.47.81-1.94 0-2.41zM2.1.24C1.83.55 1.67.99 1.67 1.56v20.88c0 .57.16 1.01.43 1.32l.07.07L13.55 12v-.27L2.17.17 2.1.24zM15.55 8.55L3.18.24C2.83.05 2.49.1 2.24.3l11.37 11.37 1.94-3.12z" fill="currentColor"/>
            </svg>
            <div>
              <div style={styles.badgeLabel}>Em breve</div>
              <div style={styles.badgeStore}>Google Play</div>
            </div>
          </div>
        </div>

        {/* Aviso */}
        <p style={styles.avisoBreve}>
          Aviso de lançamento? Fale com o estabelecimento pelo WhatsApp.
        </p>

        {/* Divisor */}
        <div style={{ ...styles.divisorLight }} />

        {/* Acesso pelo navegador */}
        <p style={styles.ouLabel}>Enquanto isso, acesse pelo navegador:</p>
        <a href={portalUrl} style={{ ...styles.portalBtn, background: cor }}>
          Abrir portal de agendamentos
        </a>
      </div>

      <p style={styles.rodape}>VendlySys © {new Date().getFullYear()}</p>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  root: {
    minHeight: "100vh",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    padding: "24px 16px",
    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
    position: "relative",
    backgroundColor: "#f5f3f2",
  },
  bg: {
    position: "fixed",
    inset: 0,
    zIndex: 0,
    pointerEvents: "none",
  },
  card: {
    position: "relative",
    zIndex: 1,
    backgroundColor: "#fff",
    borderRadius: 24,
    padding: "36px 28px",
    maxWidth: 420,
    width: "100%",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    boxShadow: "0 8px 40px rgba(0,0,0,0.10)",
    textAlign: "center",
  },
  logoWrap: {
    width: 88,
    height: 88,
    borderRadius: 22,
    border: "3px solid",
    overflow: "hidden",
    marginBottom: 16,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#f5f3f2",
  },
  logoImg: {
    width: "100%",
    height: "100%",
    objectFit: "cover",
  },
  logoFallback: {
    width: "100%",
    height: "100%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  logoLetter: {
    fontSize: 36,
    fontWeight: 700,
    color: "#fff",
  },
  nome: {
    fontSize: 22,
    fontWeight: 700,
    color: "#2d241f",
    margin: "0 0 14px",
    lineHeight: 1.2,
  },
  divisor: {
    width: 40,
    height: 3,
    borderRadius: 2,
    marginBottom: 24,
  },
  appIcon: {
    marginBottom: 14,
  },
  titulo: {
    fontSize: 18,
    fontWeight: 700,
    color: "#2d241f",
    margin: "0 0 10px",
    lineHeight: 1.3,
  },
  descricao: {
    fontSize: 14,
    color: "#59463b",
    lineHeight: 1.6,
    margin: "0 0 24px",
  },
  badgesRow: {
    display: "flex",
    gap: 12,
    marginBottom: 16,
    width: "100%",
  },
  badge: {
    flex: 1,
    display: "flex",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#f5f3f2",
    borderRadius: 12,
    padding: "12px 14px",
    color: "#2d241f",
    border: "1px solid #e8e0d8",
  },
  badgeLabel: {
    fontSize: 10,
    fontWeight: 600,
    color: "#b8956f",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    lineHeight: 1,
    marginBottom: 2,
  },
  badgeStore: {
    fontSize: 13,
    fontWeight: 700,
    color: "#2d241f",
    lineHeight: 1,
  },
  avisoBreve: {
    fontSize: 12,
    color: "#8b7355",
    margin: "0 0 20px",
    lineHeight: 1.5,
  },
  divisorLight: {
    width: "100%",
    height: 1,
    backgroundColor: "#f0ebe5",
    marginBottom: 20,
  },
  ouLabel: {
    fontSize: 13,
    color: "#8b7355",
    margin: "0 0 14px",
  },
  portalBtn: {
    display: "block",
    width: "100%",
    padding: "15px 20px",
    borderRadius: 14,
    color: "#fff",
    fontWeight: 700,
    fontSize: 15,
    textDecoration: "none",
    boxSizing: "border-box",
    transition: "opacity 0.15s",
  },
  rodape: {
    position: "relative",
    zIndex: 1,
    marginTop: 24,
    fontSize: 12,
    color: "#b8a898",
  },
};
