import { useState, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { Layout } from "@/components/layout";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle, Clock, AlertCircle, Copy, RefreshCw, CreditCard, FileText, Lock, Unlock, XCircle } from "lucide-react";

interface AssinaturaStatus {
  plano_status: string;
  plano_expira_em: string | null;
  plano_inicio_em: string | null;
  termos_aceitos_em: string | null;
  carencia_fim: string | null;
  em_carencia: boolean;
  ultima_assinatura: {
    id: number;
    status: string;
    payment_id: string | null;
    qr_code: string | null;
    qr_code_text: string | null;
    competencia: string | null;
    pago_em: string | null;
    valor: string;
  } | null;
}

interface PixData {
  assinatura_id: number;
  payment_id: string;
  qr_code: string;
  qr_code_base64: string;
  valor: number;
  status: string;
}

const STATUS_LABEL: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  trial: { label: "Trial — 15 dias grátis", color: "#b8956f", icon: <Clock size={18} /> },
  ativo: { label: "Ativo", color: "#22c55e", icon: <CheckCircle size={18} /> },
  inativo: { label: "Inativo", color: "#ef4444", icon: <AlertCircle size={18} /> },
  vitalicio: { label: "Vitalício ✦", color: "#b8956f", icon: <CheckCircle size={18} /> },
};

const TERMOS_TEXTO = `TERMOS DE USO E RESPONSABILIDADE — VENDLYSYS

Versão vigente: abril de 2026

Ao aceitar este Termo, o representante da empresa contratante declara ter lido, compreendido e concordado integralmente com as condições descritas abaixo.

1. OBJETO

O VendlySys é uma plataforma de gestão para salões, barbearias, clínicas e estabelecimentos afins, oferecida em modelo de assinatura mensal (SaaS). Disponibiliza funcionalidades de agenda, gestão de clientes, módulo financeiro, portal público e aplicativo mobile para a equipe.

2. PLANO E PREÇO

O plano mensal tem valor de R$ 50,00 (cinquenta reais), cobrado mensalmente via PIX. O acesso ao sistema é mantido enquanto a assinatura estiver ativa e em dia.

3. PERÍODO DE CARÊNCIA

A assinatura possui carência de 3 (três) meses a partir da data do primeiro pagamento confirmado. Durante esse período, não é possível solicitar o cancelamento nem reembolso das mensalidades já pagas.

Após o término da carência, o cancelamento pode ser solicitado a qualquer momento, com efeito imediato.

4. CANCELAMENTO

O cancelamento deve ser solicitado diretamente pela tela de Assinatura. Não há cobrança de multa fora do período de carência. Os dados da empresa ficam disponíveis por 30 dias após o cancelamento, sendo excluídos permanentemente após esse prazo.

5. REEMBOLSO

Não são realizados reembolsos de mensalidades já pagas, exceto nos casos previstos em lei (Código de Defesa do Consumidor).

6. RESPONSABILIDADES DO CONTRATANTE

O contratante é responsável por:
- Manter seus dados de acesso (e-mail e senha) em sigilo;
- Utilizar o sistema de forma legal e ética;
- Inserir informações verídicas no cadastro da empresa e dos clientes;
- Cumprir a legislação vigente, incluindo a LGPD, no tratamento dos dados de seus clientes.

7. RESPONSABILIDADES DO VENDLYSYS

O VendlySys se compromete a:
- Manter o sistema disponível com uptime mínimo de 99% ao mês;
- Proteger os dados armazenados com medidas de segurança adequadas;
- Notificar o contratante em caso de incidentes que afetem seus dados;
- Não compartilhar ou vender os dados do contratante a terceiros.

8. LIMITAÇÃO DE RESPONSABILIDADE

O VendlySys não se responsabiliza por perdas financeiras decorrentes de uso indevido da plataforma, falhas de conexão à internet ou decisões comerciais tomadas com base nas informações do sistema.

9. ALTERAÇÕES

O VendlySys pode alterar estes Termos a qualquer momento, notificando os usuários com antecedência mínima de 15 dias.

10. FORO

Fica eleito o foro da comarca do contratante para dirimir eventuais conflitos decorrentes deste Termo.`;

function getApiBase() {
  const base = (import.meta as any).env?.BASE_URL ?? "/";
  return base.endsWith("/") ? `${base}api` : `${base}/api`;
}

export default function Assinatura() {
  const { toast } = useToast();
  const { token } = useAuth() as any;
  const [, setLocation] = useLocation();
  const [status, setStatus] = useState<AssinaturaStatus | null>(null);
  const [loadingStatus, setLoadingStatus] = useState(true);
  const [pix, setPix] = useState<PixData | null>(null);
  const [loadingPix, setLoadingPix] = useState(false);
  const [checkingPayment, setCheckingPayment] = useState(false);
  const [showTermos, setShowTermos] = useState(false);
  const [aceitandoTermos, setAceitandoTermos] = useState(false);
  const [leuTermos, setLeuTermos] = useState(false);
  const [cancelando, setCancelando] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const termosRef = useRef<HTMLDivElement>(null);

  const apiBase = getApiBase();

  function authHeaders() {
    return { "Content-Type": "application/json", Authorization: `Bearer ${token}` };
  }

  async function fetchStatus() {
    setLoadingStatus(true);
    try {
      const res = await fetch(`${apiBase}/assinatura`, { headers: authHeaders() });
      if (res.ok) setStatus(await res.json());
    } finally {
      setLoadingStatus(false);
    }
  }

  useEffect(() => {
    fetchStatus();
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, []);

  async function aceitarTermos() {
    setAceitandoTermos(true);
    try {
      const res = await fetch(`${apiBase}/assinatura/aceitar-termos`, {
        method: "POST",
        headers: authHeaders(),
      });
      if (res.ok) {
        setShowTermos(false);
        toast({ title: "Termos aceitos! Agora você pode assinar." });
        fetchStatus();
      } else {
        const d = await res.json();
        toast({ title: d.error ?? "Erro ao registrar aceite", variant: "destructive" });
      }
    } finally {
      setAceitandoTermos(false);
    }
  }

  function handleTermosScroll(e: React.UIEvent<HTMLDivElement>) {
    const el = e.currentTarget;
    if (el.scrollTop + el.clientHeight >= el.scrollHeight - 30) setLeuTermos(true);
  }

  async function gerarPix() {
    setLoadingPix(true);
    setPix(null);
    try {
      const res = await fetch(`${apiBase}/assinatura/criar-pix`, {
        method: "POST",
        headers: authHeaders(),
      });
      const data = await res.json();
      if (!res.ok) {
        toast({ title: data.error ?? "Erro ao gerar PIX", variant: "destructive" });
        return;
      }
      setPix(data);
      startPolling(data.payment_id);
    } catch {
      toast({ title: "Erro de conexão", variant: "destructive" });
    } finally {
      setLoadingPix(false);
    }
  }

  function startPolling(paymentId: string) {
    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = setInterval(async () => {
      setCheckingPayment(true);
      try {
        const res = await fetch(`${apiBase}/assinatura/verificar/${paymentId}`, { headers: authHeaders() });
        const data = await res.json();
        if (data.status === "approved") {
          clearInterval(pollRef.current!);
          setPix(null);
          toast({ title: "Pagamento confirmado! Plano ativado." });
          fetchStatus();
        }
      } finally {
        setCheckingPayment(false);
      }
    }, 5000);
  }

  function copyPix() {
    if (!pix?.qr_code) return;
    navigator.clipboard.writeText(pix.qr_code);
    toast({ title: "Código PIX copiado!" });
  }

  async function cancelarConta() {
    setCancelando(true);
    try {
      const res = await fetch(`${apiBase}/assinatura/cancelar`, {
        method: "POST",
        headers: authHeaders(),
      });
      const data = await res.json();
      if (!res.ok) {
        toast({ title: data.mensagem ?? data.error ?? "Erro ao cancelar", variant: "destructive" });
      } else {
        setShowCancelConfirm(false);
        toast({ title: data.mensagem ?? "Assinatura cancelada." });
        fetchStatus();
      }
    } finally {
      setCancelando(false);
    }
  }

  const statusInfo = status ? STATUS_LABEL[status.plano_status] ?? STATUS_LABEL.trial : null;
  const isVitalicio = status?.plano_status === "vitalicio";
  const termosAceitos = !!status?.termos_aceitos_em;
  const podeAssinar = !isVitalicio && termosAceitos;

  return (
    <Layout>
      <div style={{ maxWidth: 640, margin: "0 auto", padding: "32px 16px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 28 }}>
          <CreditCard size={26} style={{ color: "#b8956f" }} />
          <h1 style={{ fontSize: 22, fontWeight: 700, color: "#2d241f" }}>Assinatura</h1>
        </div>

        {loadingStatus ? (
          <div style={{ textAlign: "center", padding: 48, color: "#999" }}>Carregando...</div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

            {/* Card Status */}
            <div style={{ background: "#fff", borderRadius: 16, padding: 24, boxShadow: "0 2px 12px rgba(0,0,0,0.07)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                <span style={{ color: statusInfo?.color }}>{statusInfo?.icon}</span>
                <span style={{ fontWeight: 700, fontSize: 18, color: "#2d241f" }}>Plano {statusInfo?.label}</span>
              </div>
              {status?.plano_expira_em && (
                <p style={{ color: "#666", fontSize: 14, margin: "0 0 4px" }}>
                  Válido até: <strong>{new Date(status.plano_expira_em).toLocaleDateString("pt-BR")}</strong>
                </p>
              )}
              {status?.plano_status === "trial" && (
                <p style={{ color: "#b8956f", fontSize: 13, margin: "8px 0 0" }}>
                  {status.plano_expira_em
                    ? `Trial grátis até ${new Date(status.plano_expira_em).toLocaleDateString("pt-BR")}. Assine para continuar após essa data.`
                    : "Você está no período de avaliação. Assine para manter o acesso completo."}
                </p>
              )}
              {status?.plano_status === "vitalicio" && (
                <p style={{ color: "#b8956f", fontSize: 13, margin: "8px 0 0" }}>Sua conta tem acesso vitalício ao sistema — sem cobranças.</p>
              )}
              {status?.plano_status === "inativo" && (
                <p style={{ color: "#ef4444", fontSize: 13, margin: "8px 0 0" }}>Sua assinatura expirou. Renove para continuar usando o sistema.</p>
              )}
            </div>

            {/* Carência Info */}
            {status?.plano_inicio_em && !isVitalicio && (
              <div style={{
                background: status.em_carencia ? "#fffbeb" : "#f0fdf4",
                border: `1px solid ${status.em_carencia ? "#fde68a" : "#bbf7d0"}`,
                borderRadius: 14,
                padding: "16px 20px",
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                  {status.em_carencia
                    ? <Lock size={15} style={{ color: "#d97706" }} />
                    : <Unlock size={15} style={{ color: "#16a34a" }} />}
                  <span style={{ fontWeight: 700, fontSize: 14, color: status.em_carencia ? "#d97706" : "#16a34a" }}>
                    {status.em_carencia ? "Em período de carência" : "Carência encerrada"}
                  </span>
                </div>
                <p style={{ margin: 0, fontSize: 13, color: "#555" }}>
                  {status.em_carencia
                    ? `Cancelamento disponível após ${new Date(status.carencia_fim!).toLocaleDateString("pt-BR")} (carência de 3 meses).`
                    : "O período de carência de 3 meses foi cumprido. Você pode cancelar a qualquer momento."}
                </p>
              </div>
            )}

            {/* Termos de Uso */}
            {!termosAceitos && !isVitalicio && (
              <div style={{
                background: "#fff",
                borderRadius: 16,
                padding: 24,
                border: "1.5px solid #b8956f",
                boxShadow: "0 2px 12px rgba(0,0,0,0.07)",
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                  <FileText size={18} style={{ color: "#b8956f" }} />
                  <span style={{ fontWeight: 700, fontSize: 16, color: "#2d241f" }}>Termos de Uso não aceitos</span>
                </div>
                <p style={{ fontSize: 13, color: "#555", margin: "0 0 14px", lineHeight: 1.6 }}>
                  Leia e aceite os Termos de Uso antes de assinar. O documento inclui informações sobre carência de 3 meses, cancelamento e responsabilidades.
                </p>
                <button
                  type="button"
                  onClick={() => { setShowTermos(true); setLeuTermos(false); }}
                  style={{ background: "linear-gradient(135deg, #59463b, #2d241f)", color: "#fff", border: 0, borderRadius: 10, padding: "11px 20px", fontWeight: 700, cursor: "pointer", fontSize: 14, display: "flex", alignItems: "center", gap: 8 }}
                >
                  <FileText size={15} /> Ler e aceitar os Termos
                </button>
              </div>
            )}

            {termosAceitos && (
              <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "#16a34a", paddingLeft: 4 }}>
                <CheckCircle size={13} />
                Termos aceitos em {new Date(status!.termos_aceitos_em!).toLocaleDateString("pt-BR")}
                <button
                  type="button"
                  onClick={() => setLocation("/termos")}
                  style={{ marginLeft: "auto", background: "none", border: "none", color: "#b8956f", fontSize: 12, fontWeight: 700, cursor: "pointer", padding: 0 }}
                >
                  Ver Termos →
                </button>
              </div>
            )}

            {/* Card Plano */}
            <div style={{ background: "linear-gradient(135deg, #2d241f 0%, #59463b 100%)", borderRadius: 16, padding: 24, color: "#fff" }}>
              <div style={{ fontSize: 13, opacity: 0.7, marginBottom: 4 }}>Plano Mensal</div>
              <div style={{ fontSize: 38, fontWeight: 800, color: "#b8956f" }}>
                R$ 50<span style={{ fontSize: 18, fontWeight: 400 }}>/mês</span>
              </div>
              <ul style={{ listStyle: "none", padding: 0, margin: "16px 0 0", fontSize: 14, opacity: 0.85 }}>
                {["Agenda e agendamentos ilimitados", "Gestão de clientes completa", "Módulo financeiro", "Lembretes via WhatsApp (manual)", "App mobile para equipe", "Suporte prioritário"].map((item) => (
                  <li key={item} style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 6 }}>
                    <CheckCircle size={14} style={{ color: "#b8956f", flexShrink: 0 }} />
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            {/* PIX Section */}
            {podeAssinar && (
              !pix ? (
                <button
                  type="button"
                  onClick={gerarPix}
                  disabled={loadingPix}
                  style={{ width: "100%", padding: "14px 0", background: "#b8956f", color: "#fff", border: "none", borderRadius: 12, fontSize: 16, fontWeight: 700, cursor: loadingPix ? "not-allowed" : "pointer", opacity: loadingPix ? 0.7 : 1 }}
                >
                  {loadingPix ? "Gerando PIX..." : "Pagar com PIX — R$ 50,00"}
                </button>
              ) : (
                <div style={{ background: "#fff", borderRadius: 16, padding: 24, boxShadow: "0 2px 12px rgba(0,0,0,0.07)" }}>
                  <h3 style={{ margin: "0 0 16px", color: "#2d241f", fontSize: 16 }}>Escaneie o QR Code ou copie o código</h3>
                  {pix.qr_code_base64 && (
                    <div style={{ display: "flex", justifyContent: "center", marginBottom: 20 }}>
                      <img src={`data:image/png;base64,${pix.qr_code_base64}`} alt="QR Code PIX" style={{ width: 200, height: 200, borderRadius: 8, border: "2px solid #f0ebe7" }} />
                    </div>
                  )}
                  {pix.qr_code && (
                    <div style={{ background: "#f5f3f2", borderRadius: 8, padding: "10px 14px", fontFamily: "monospace", fontSize: 11, wordBreak: "break-all", color: "#444", marginBottom: 12 }}>
                      {pix.qr_code}
                    </div>
                  )}
                  <div style={{ display: "flex", gap: 10 }}>
                    <button type="button" onClick={copyPix} style={{ flex: 1, padding: "10px 0", background: "#b8956f", color: "#fff", border: "none", borderRadius: 10, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
                      <Copy size={15} /> Copiar código
                    </button>
                    <button type="button" onClick={() => { setPix(null); if (pollRef.current) clearInterval(pollRef.current); }} style={{ padding: "10px 16px", background: "transparent", color: "#666", border: "1px solid #ddd", borderRadius: 10, cursor: "pointer" }}>
                      Cancelar
                    </button>
                  </div>
                  <div style={{ marginTop: 14, display: "flex", alignItems: "center", gap: 6, color: "#999", fontSize: 13 }}>
                    <RefreshCw size={13} />
                    {checkingPayment ? "Verificando pagamento..." : "Aguardando confirmação do PIX..."}
                  </div>
                </div>
              )
            )}

            {!termosAceitos && !isVitalicio && (
              <p style={{ textAlign: "center", fontSize: 13, color: "#999", margin: 0 }}>
                Aceite os Termos de Uso acima para habilitar o pagamento.
              </p>
            )}

            {/* Cancelar Conta */}
            {!isVitalicio && status?.plano_status !== "inativo" && (
              <div style={{ borderRadius: 16, border: "1px solid #fca5a5", background: "#fff5f5", padding: 24 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                  <XCircle size={18} style={{ color: "#dc2626" }} />
                  <span style={{ fontWeight: 700, fontSize: 16, color: "#dc2626" }}>Cancelar assinatura</span>
                </div>
                <p style={{ fontSize: 13, color: "#555", margin: "0 0 14px", lineHeight: 1.6 }}>
                  {status?.em_carencia && status?.carencia_fim
                    ? `Você está em carência de 3 meses. O cancelamento estará disponível após ${new Date(status.carencia_fim).toLocaleDateString("pt-BR")}.`
                    : "Você pode cancelar a qualquer momento. O acesso é encerrado imediatamente e os dados ficam disponíveis por 30 dias."}
                </p>
                {!showCancelConfirm ? (
                  <button
                    type="button"
                    disabled={!!status?.em_carencia}
                    onClick={() => setShowCancelConfirm(true)}
                    style={{ background: "transparent", border: "1px solid #ef4444", color: status?.em_carencia ? "#ccc" : "#ef4444", borderColor: status?.em_carencia ? "#ccc" : "#ef4444", borderRadius: 10, padding: "10px 18px", fontWeight: 600, cursor: status?.em_carencia ? "not-allowed" : "pointer", fontSize: 14, display: "flex", alignItems: "center", gap: 8 }}
                  >
                    <XCircle size={15} />
                    {status?.em_carencia ? "Cancelamento bloqueado (carência)" : "Cancelar assinatura"}
                  </button>
                ) : (
                  <div style={{ background: "#fee2e2", borderRadius: 12, padding: 16 }}>
                    <p style={{ fontWeight: 700, color: "#dc2626", margin: "0 0 8px", fontSize: 14 }}>Tem certeza?</p>
                    <p style={{ fontSize: 13, color: "#555", margin: "0 0 14px" }}>O acesso será encerrado imediatamente. Os dados ficam disponíveis por 30 dias e depois são excluídos permanentemente.</p>
                    <div style={{ display: "flex", gap: 10 }}>
                      <button type="button" onClick={() => setShowCancelConfirm(false)} style={{ padding: "9px 16px", background: "transparent", border: "1px solid #ddd", borderRadius: 8, cursor: "pointer", fontSize: 14 }}>Não, manter</button>
                      <button type="button" onClick={cancelarConta} disabled={cancelando} style={{ padding: "9px 16px", background: "#dc2626", color: "#fff", border: 0, borderRadius: 8, cursor: cancelando ? "not-allowed" : "pointer", fontWeight: 700, fontSize: 14, opacity: cancelando ? 0.7 : 1 }}>
                        {cancelando ? "Cancelando..." : "Sim, cancelar"}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Modal Termos */}
      {showTermos && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
          <div style={{ background: "#fff", borderRadius: 20, width: "100%", maxWidth: 600, maxHeight: "90vh", display: "flex", flexDirection: "column", overflow: "hidden" }}>
            <div style={{ padding: "20px 24px 16px", borderBottom: "1px solid #f0ebe7", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <FileText size={20} style={{ color: "#b8956f" }} />
                <span style={{ fontWeight: 700, fontSize: 17, color: "#2d241f" }}>Termos de Uso e Responsabilidade</span>
              </div>
              <button type="button" onClick={() => setShowTermos(false)} style={{ background: "none", border: 0, cursor: "pointer", color: "#999", padding: 4 }}>✕</button>
            </div>

            <div
              ref={termosRef}
              onScroll={handleTermosScroll}
              style={{ flex: 1, overflowY: "auto", padding: "20px 24px" }}
            >
              <div style={{ background: "#fffbeb", border: "1px solid #fde68a", borderRadius: 10, padding: "12px 14px", marginBottom: 16, fontSize: 13, color: "#92400e" }}>
                Role até o final do documento para habilitar o botão de aceite.
              </div>
              <pre style={{ fontFamily: "inherit", fontSize: 13, color: "#444", lineHeight: 1.7, whiteSpace: "pre-wrap", margin: 0 }}>
                {TERMOS_TEXTO}
              </pre>
            </div>

            <div style={{ padding: "16px 24px", borderTop: "1px solid #f0ebe7", display: "flex", flexDirection: "column", gap: 8 }}>
              {!leuTermos && (
                <p style={{ textAlign: "center", fontSize: 12, color: "#999", margin: 0 }}>Role até o final para aceitar</p>
              )}
              <button
                type="button"
                onClick={aceitarTermos}
                disabled={!leuTermos || aceitandoTermos}
                style={{ width: "100%", padding: "13px 0", background: leuTermos ? "linear-gradient(135deg, #59463b, #2d241f)" : "#e5e7eb", color: leuTermos ? "#fff" : "#9ca3af", border: 0, borderRadius: 12, fontWeight: 700, cursor: leuTermos ? "pointer" : "not-allowed", fontSize: 15, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}
              >
                <CheckCircle size={17} />
                {aceitandoTermos ? "Registrando..." : "Li e aceito os Termos de Uso"}
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
