import { useState, useEffect, useRef } from "react";
import { Layout } from "@/components/layout";
import { useAuth } from "@/hooks/use-auth";
import {
  useListAgendamentos,
  useUpdateAgendamento,
  getListAgendamentosQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle2, CreditCard, Banknote, QrCode, ArrowLeftRight, Copy, Check, Loader2, ExternalLink, MessageCircle, XCircle, CalendarX } from "lucide-react";

function formatarTelefoneWA(tel: string): string {
  const digits = tel.replace(/\D/g, "");
  if (digits.startsWith("55") && digits.length >= 12) return digits;
  if (digits.length >= 10) return "55" + digits;
  return digits;
}

function gerarMensagemLembrete(ag: any, slug: string): string {
  const dataFormatada = ag.data
    ? new Date(ag.data.slice(0, 10) + "T12:00:00").toLocaleDateString("pt-BR")
    : "";
  const portalUrl = `${window.location.origin}${import.meta.env.BASE_URL}portal/${slug}`;
  return (
    `Ola ${ag.cliente_nome || ""}! Lembramos que voce tem um horario de ${ag.servico} agendado para ${dataFormatada} as ${ag.hora_inicio}.\n\n` +
    `Para confirmar, reagendar ou cancelar, acesse o link abaixo:\n${portalUrl}\n\n` +
    `Qualquer duvida, e so chamar!`
  );
}

function gerarMensagemAgradecimento(ag: any, empresaNome: string, slug: string): string {
  const nome = (ag.cliente_nome || "").split(" ")[0] || "cliente";
  const portalUrl = `${window.location.origin}${import.meta.env.BASE_URL}portal/${slug}`;
  return (
    `Oi ${nome}!\n\n` +
    `Foi um prazer receber voce hoje aqui na ${empresaNome}! Esperamos que tenha adorado o resultado do seu ${ag.servico}.\n\n` +
    `Sua satisfacao e o que nos motiva a fazer cada detalhe com carinho. Se quiser, conta pra gente como foi a experiencia!\n\n` +
    `Quando quiser agendar novamente, e so acessar:\n${portalUrl}\n\n` +
    `Ate a proxima!`
  );
}

function gerarMensagemReagendamento(ag: any, empresaNome: string, slug: string): string {
  const nome = (ag.cliente_nome || "").split(" ")[0] || "cliente";
  const dataFormatada = ag.data
    ? new Date(ag.data.slice(0, 10) + "T12:00:00").toLocaleDateString("pt-BR")
    : "";
  const portalUrl = `${window.location.origin}${import.meta.env.BASE_URL}portal/${slug}`;
  return (
    `Oi ${nome}, tudo bem?\n\n` +
    `Precisamos comunicar que o seu agendamento de ${ag.servico} marcado para ${dataFormatada} as ${ag.hora_inicio} precisara ser reagendado. Pedimos desculpas pelo inconveniente.\n\n` +
    `Para escolher uma nova data e horario que seja melhor para voce, acesse nosso portal:\n${portalUrl}\n\n` +
    `Estamos a disposicao para qualquer duvida. Conte com a gente!`
  );
}

function hojeISO() {
  return new Date().toISOString().split("T")[0];
}

const STATUS_LABEL: Record<string, { label: string; bg: string; color: string }> = {
  agendado:         { label: "Agendado",         bg: "#eff6ff", color: "#1d4ed8" },
  confirmado:       { label: "Confirmado",       bg: "#f0fdf4", color: "#15803d" },
  concluido:        { label: "Concluído",        bg: "#f0fdf4", color: "#15803d" },
  cancelado:        { label: "Cancelado",        bg: "#fef2f2", color: "#dc2626" },
  faltou:           { label: "Faltou",           bg: "#fffbeb", color: "#b45309" },
  aguardando_sinal: { label: "Aguard. Sinal",    bg: "#fff7ed", color: "#c2410c" },
};

const FORMAS = [
  { value: "dinheiro",       label: "Dinheiro",        icone: Banknote },
  { value: "pix",            label: "PIX",             icone: QrCode },
  { value: "cartao_debito",  label: "Cartão Débito",   icone: CreditCard },
  { value: "cartao_credito", label: "Cartão Crédito",  icone: CreditCard },
  { value: "transferencia",  label: "Transferência",   icone: ArrowLeftRight },
];

const FORMAS_MP_CARTAO = new Set(["cartao_debito", "cartao_credito"]);

interface MpPixData {
  payment_id: string;
  qr_code: string;
  qr_code_base64: string;
  status: string;
}

interface MpCartaoData {
  preference_id: string;
  checkout_url: string;
}

function authHeaders(): HeadersInit {
  const token = localStorage.getItem("vendlysys_token");
  return token ? { Authorization: `Bearer ${token}`, "Content-Type": "application/json" } : { "Content-Type": "application/json" };
}

async function criarPixMP(agendamento_id: number, valor: number): Promise<MpPixData> {
  const res = await fetch("/api/pagamentos/criar-pix", {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({ agendamento_id, valor }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error ?? "Erro ao gerar PIX");
  return data as MpPixData;
}

async function criarCartaoMP(agendamento_id: number, tipo: string, valor: number): Promise<MpCartaoData> {
  const res = await fetch("/api/pagamentos/criar-cartao", {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({ agendamento_id, tipo, valor }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error ?? "Erro ao gerar link de pagamento");
  return data as MpCartaoData;
}

async function consultarStatusPix(payment_id: string): Promise<string> {
  const res = await fetch(`/api/pagamentos/status/${payment_id}`, { headers: authHeaders() });
  if (!res.ok) return "pending";
  return (await res.json())?.status ?? "pending";
}

async function consultarStatusCartao(agendamento_id: number): Promise<string> {
  const res = await fetch(`/api/pagamentos/status-cartao/${agendamento_id}`, { headers: authHeaders() });
  if (!res.ok) return "pending";
  return (await res.json())?.status ?? "pending";
}

export default function Agendamentos() {
  const { empresa } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [dataInicio, setDataInicio] = useState(hojeISO());
  const [dataFim, setDataFim] = useState(hojeISO());
  const [filtroStatus, setFiltroStatus] = useState("");
  const [busca, setBusca] = useState("");
  const [cobrandoAg, setCobrandoAg] = useState<any>(null);
  const [formaPagamento, setFormaPagamento] = useState("dinheiro");

  const [valorLocal, setValorLocal] = useState<string>("");
  const [mpPixData, setMpPixData] = useState<MpPixData | null>(null);
  const [mpCartaoData, setMpCartaoData] = useState<MpCartaoData | null>(null);
  const [mpCarregando, setMpCarregando] = useState(false);
  const [mpAprovado, setMpAprovado] = useState(false);
  const [pixCopiado, setPixCopiado] = useState(false);
  const [linkCopiado, setLinkCopiado] = useState(false);
  const [cancelandoId, setCancelandoId] = useState<number | null>(null);
  const [waModal, setWaModal] = useState<{ numero: string; texto: string; titulo: string } | null>(null);

  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const { data: agendamentos, isLoading } = useListAgendamentos(
    { data_inicio: dataInicio, data_fim: dataFim },
    { query: { enabled: true, queryKey: getListAgendamentosQueryKey({ data_inicio: dataInicio, data_fim: dataFim }) } }
  );

  const updateMutation = useUpdateAgendamento({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListAgendamentosQueryKey({}) });
        setCobrandoAg(null);
        toast({ title: "Pagamento registrado com sucesso!" });
      },
      onError: () => {
        toast({ title: "Erro ao registrar pagamento.", variant: "destructive" });
      },
    },
  });

  useEffect(() => {
    if (mpAprovado) return;
    if (mpPixData) {
      pollingRef.current = setInterval(async () => {
        const status = await consultarStatusPix(mpPixData.payment_id);
        if (status === "approved") {
          setMpAprovado(true);
          stopPolling();
          confirmarPagamento();
        }
      }, 3000);
      return stopPolling;
    }
    if (mpCartaoData && cobrandoAg) {
      pollingRef.current = setInterval(async () => {
        const status = await consultarStatusCartao(cobrandoAg.id);
        if (status === "approved") {
          setMpAprovado(true);
          stopPolling();
          confirmarPagamento();
        }
      }, 3000);
      return stopPolling;
    }
  }, [mpPixData, mpCartaoData, mpAprovado]);

  function stopPolling() {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
  }

  const lista = agendamentos ?? [];
  const filtrados = lista.filter((ag) => {
    if (filtroStatus && ag.status !== filtroStatus) return false;
    if (busca.trim()) {
      const q = busca.trim().toLowerCase();
      const nome = (ag.cliente_nome ?? "").toLowerCase();
      const servico = (ag.servico ?? "").toLowerCase();
      if (!nome.includes(q) && !servico.includes(q)) return false;
    }
    return true;
  });

  const corPrimaria = (empresa as any)?.cor_primaria || "#b8956f";
  const corSecundaria = (empresa as any)?.cor_secundaria || "#59463b";

  function abrirCobrar(ag: any) {
    stopPolling();
    setCobrandoAg(ag);
    setValorLocal(ag.valor != null ? String(Number(ag.valor)) : "");
    setFormaPagamento("dinheiro");
    setMpPixData(null);
    setMpCartaoData(null);
    setMpCarregando(false);
    setMpAprovado(false);
    setPixCopiado(false);
    setLinkCopiado(false);
  }

  function fecharModal() {
    stopPolling();
    setCobrandoAg(null);
    setMpPixData(null);
    setMpCartaoData(null);
    setMpCarregando(false);
    setMpAprovado(false);
  }

  function trocarForma(forma: string) {
    setFormaPagamento(forma);
    setMpPixData(null);
    setMpCartaoData(null);
    setMpAprovado(false);
    stopPolling();
  }

  async function gerarPixMP() {
    if (!cobrandoAg || mpCarregando) return;
    const v = Number(valorLocal);
    if (!v || v <= 0) { toast({ title: "Informe o valor antes de gerar o PIX", variant: "destructive" }); return; }
    setMpCarregando(true);
    try {
      const data = await criarPixMP(cobrandoAg.id, v);
      setMpPixData(data);
    } catch (err: any) {
      toast({ title: err?.message ?? "Erro ao gerar PIX", variant: "destructive" });
    } finally {
      setMpCarregando(false);
    }
  }

  async function gerarLinkCartao() {
    if (!cobrandoAg || mpCarregando) return;
    const v = Number(valorLocal);
    if (!v || v <= 0) { toast({ title: "Informe o valor antes de gerar o link", variant: "destructive" }); return; }
    setMpCarregando(true);
    try {
      const data = await criarCartaoMP(cobrandoAg.id, formaPagamento, v);
      setMpCartaoData(data);
    } catch (err: any) {
      toast({ title: err?.message ?? "Erro ao gerar link", variant: "destructive" });
    } finally {
      setMpCarregando(false);
    }
  }

  function confirmarPagamento() {
    if (!cobrandoAg) return;
    const v = Number(valorLocal);
    updateMutation.mutate({
      id: cobrandoAg.id,
      data: {
        pago: true,
        forma_pagamento: formaPagamento as any,
        status: "concluido" as any,
        ...(v > 0 ? { valor: v } : {}),
      },
    });
  }

  function copiarTexto(texto: string, setter: (v: boolean) => void) {
    navigator.clipboard.writeText(texto).then(() => {
      setter(true);
      setTimeout(() => setter(false), 2500);
    });
  }

  function abrirWaModal(ag: any, tipo: "lembrete" | "agradecimento" | "reagendamento") {
    const tel = (ag as any).cliente_telefone ?? "";
    if (!tel) { alert("Este cliente não tem telefone cadastrado."); return; }
    const numero = formatarTelefoneWA(tel);
    const slug = (empresa as any)?.slug || "";
    const empresaNome = (empresa as any)?.nome || "";
    const texto = tipo === "lembrete"
      ? gerarMensagemLembrete(ag, slug)
      : tipo === "reagendamento"
        ? gerarMensagemReagendamento(ag, empresaNome, slug)
        : gerarMensagemAgradecimento(ag, empresaNome, slug);
    const titulo = tipo === "lembrete"
      ? "Lembrete de Agendamento"
      : tipo === "reagendamento"
        ? "Solicitar Reagendamento"
        : "Mensagem de Agradecimento";
    setWaModal({ numero, texto, titulo });
  }

  async function cancelarAgendamento(id: number) {
    if (!confirm("Cancelar este agendamento?")) return;
    setCancelandoId(id);
    try {
      const res = await fetch(`/api/agendamentos/${id}`, {
        method: "PUT",
        headers: authHeaders(),
        body: JSON.stringify({ status: "cancelado" }),
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d?.error ?? "Erro ao cancelar");
      }
      queryClient.invalidateQueries({ queryKey: getListAgendamentosQueryKey({}) });
      toast({ title: "Agendamento cancelado." });
    } catch (err: any) {
      toast({ title: err?.message ?? "Erro ao cancelar agendamento.", variant: "destructive" });
    } finally {
      setCancelandoId(null);
    }
  }

  const ehCartaoMP = FORMAS_MP_CARTAO.has(formaPagamento);
  const labelTipoCartao = formaPagamento === "cartao_debito" ? "Débito" : "Crédito";

  const cartaoQrUrl = mpCartaoData?.checkout_url
    ? `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(mpCartaoData.checkout_url)}`
    : "";

  const mpAtivo = mpPixData || mpCartaoData;

  return (
    <Layout>
      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

        {/* Header */}
        <div style={{ background: "#fff", borderRadius: 20, padding: 24, boxShadow: "0 4px 14px rgba(0,0,0,0.06)", borderTop: `5px solid ${corPrimaria}` }}>
          <h1 style={{ margin: "0 0 4px", fontSize: 24, fontWeight: 800, color: "#111827" }}>Agendamentos</h1>
          <p style={{ margin: 0, fontSize: 14, color: "#6b7280" }}>Visualize e gerencie os atendimentos do dia.</p>

          <div style={{ marginTop: 16, display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
              <label style={{ fontSize: 13, fontWeight: 600, color: "#57493f" }}>De:</label>
              <input
                type="date"
                value={dataInicio}
                onChange={(e) => { setDataInicio(e.target.value); if (e.target.value > dataFim) setDataFim(e.target.value); }}
                style={{ border: "1px solid #e6d9cf", borderRadius: 10, padding: "7px 12px", fontSize: 13, color: "#2d241f", background: "#f9f6f2", outline: "none" }}
              />
              <label style={{ fontSize: 13, fontWeight: 600, color: "#57493f" }}>Até:</label>
              <input
                type="date"
                value={dataFim}
                min={dataInicio}
                onChange={(e) => setDataFim(e.target.value)}
                style={{ border: "1px solid #e6d9cf", borderRadius: 10, padding: "7px 12px", fontSize: 13, color: "#2d241f", background: "#f9f6f2", outline: "none" }}
              />
              <button
                onClick={() => { setDataInicio(hojeISO()); setDataFim(hojeISO()); }}
                style={{ fontSize: 12, fontWeight: 700, color: corPrimaria, background: "none", border: `1px solid ${corPrimaria}`, borderRadius: 8, padding: "6px 12px", cursor: "pointer" }}
              >
                Hoje
              </button>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <label style={{ fontSize: 13, fontWeight: 600, color: "#57493f" }}>Status:</label>
              <select
                value={filtroStatus}
                onChange={(e) => setFiltroStatus(e.target.value)}
                style={{ border: "1px solid #e6d9cf", borderRadius: 10, padding: "7px 12px", fontSize: 13, color: "#2d241f", background: "#f9f6f2", outline: "none", cursor: "pointer" }}
              >
                <option value="">Todos</option>
                {Object.entries(STATUS_LABEL).map(([v, s]) => (
                  <option key={v} value={v}>{s.label}</option>
                ))}
              </select>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 6, flex: 1, minWidth: 180 }}>
              <label style={{ fontSize: 13, fontWeight: 600, color: "#57493f", whiteSpace: "nowrap" }}>🔍</label>
              <input
                type="text"
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                placeholder="Buscar cliente ou serviço..."
                style={{ border: "1px solid #e6d9cf", borderRadius: 10, padding: "7px 12px", fontSize: 13, color: "#2d241f", background: "#f9f6f2", outline: "none", flex: 1, minWidth: 0 }}
              />
              {busca && (
                <button
                  onClick={() => setBusca("")}
                  style={{ background: "none", border: "none", cursor: "pointer", color: "#9ca3af", fontSize: 16, padding: "0 4px", lineHeight: 1 }}
                  title="Limpar busca"
                >×</button>
              )}
            </div>
          </div>
        </div>

        {/* Lista de agendamentos */}
        <div style={{ background: "#fff", borderRadius: 20, padding: 20, boxShadow: "0 4px 14px rgba(0,0,0,0.06)" }}>
          {isLoading ? (
            <div style={{ textAlign: "center", padding: "32px 0", color: "#9ca3af" }}>Carregando...</div>
          ) : filtrados.length === 0 ? (
            <div style={{ textAlign: "center", padding: "40px 0", color: "#9ca3af", fontSize: 14 }}>
              Nenhum agendamento encontrado para este dia.
            </div>
          ) : (
            <>
              {/* ── MOBILE: cartões ──────────────────────────── */}
              <div className="flex flex-col sm:hidden" style={{ gap: 10 }}>
                {filtrados.map((ag) => {
                  const st = STATUS_LABEL[ag.status] ?? { label: ag.status, bg: "#f9f6f2", color: "#57493f" };
                  const podeCobrar = ag.status !== "cancelado" && !ag.pago;
                  const temTel = !!(ag as any).cliente_telefone;
                  return (
                    <div key={ag.id} style={{ border: "1px solid #e6d9cf", borderRadius: 14, padding: "12px 14px", background: "#fdfaf8" }}>
                      {/* linha 1: hora + status + pagamento */}
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                        <span style={{ fontWeight: 800, fontSize: 16, color: "#2d241f", minWidth: 44 }}>{ag.hora_inicio}</span>
                        <span style={{ background: st.bg, color: st.color, borderRadius: 8, padding: "2px 9px", fontSize: 11, fontWeight: 700 }}>{st.label}</span>
                        {ag.pago && (
                          <span style={{ display: "inline-flex", alignItems: "center", gap: 3, color: "#15803d", fontSize: 11, fontWeight: 700, marginLeft: "auto" }}>
                            <CheckCircle2 style={{ width: 12, height: 12 }} />
                            {ag.forma_pagamento ? ag.forma_pagamento.replace(/_/g, " ") : "Pago"}
                          </span>
                        )}
                        {!ag.pago && <span style={{ marginLeft: "auto", color: "#9ca3af", fontSize: 11 }}>Pendente</span>}
                      </div>
                      {/* linha 2: cliente + valor */}
                      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 2 }}>
                        <span style={{ fontWeight: 700, fontSize: 14, color: "#111827" }}>{(ag as any).cliente_nome || "—"}</span>
                        <span style={{ fontWeight: 800, fontSize: 14, color: "#2d241f" }}>
                          {ag.valor != null ? Number(ag.valor).toLocaleString("pt-BR", { style: "currency", currency: "BRL" }) : "—"}
                        </span>
                      </div>
                      {/* linha 3: serviço + profissional */}
                      <div style={{ fontSize: 12, color: "#57493f", marginBottom: 10 }}>
                        {ag.servico}{(ag as any).profissional_nome ? ` · ${(ag as any).profissional_nome}` : ""}
                      </div>
                      {/* ações */}
                      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                        {ag.status === "concluido" ? (
                          <button type="button" onClick={() => abrirWaModal(ag, "agradecimento")}
                            style={{ background: temTel ? "#25d366" : "#e5e7eb", color: temTel ? "#fff" : "#9ca3af", border: 0, borderRadius: 9, padding: "6px 12px", fontSize: 12, fontWeight: 700, cursor: temTel ? "pointer" : "default", display: "inline-flex", alignItems: "center", gap: 5 }}>
                            <MessageCircle style={{ width: 13, height: 13 }} /> Agradecer
                          </button>
                        ) : (
                          <button type="button" onClick={() => abrirWaModal(ag, "lembrete")} title="Lembrete WhatsApp"
                            style={{ background: temTel ? "#25d366" : "#e5e7eb", color: temTel ? "#fff" : "#9ca3af", border: 0, borderRadius: 9, padding: "6px 12px", fontSize: 12, fontWeight: 700, cursor: temTel ? "pointer" : "default", display: "inline-flex", alignItems: "center", gap: 5 }}>
                            <MessageCircle style={{ width: 13, height: 13 }} /> Lembrete
                          </button>
                        )}
                        {ag.status !== "cancelado" && ag.status !== "concluido" && (
                          <button type="button" onClick={() => abrirWaModal(ag, "reagendamento")} title="Solicitar Reagendamento"
                            style={{ background: temTel ? "#f47b1e" : "#e5e7eb", color: temTel ? "#fff" : "#9ca3af", border: 0, borderRadius: 9, padding: "6px 12px", fontSize: 12, fontWeight: 700, cursor: temTel ? "pointer" : "default", display: "inline-flex", alignItems: "center", gap: 5 }}>
                            <CalendarX style={{ width: 13, height: 13 }} /> Reagendar
                          </button>
                        )}
                        {podeCobrar && (
                          <button type="button" onClick={() => abrirCobrar(ag)}
                            style={{ background: `linear-gradient(135deg, ${corSecundaria}, ${corPrimaria})`, color: "#fff", border: 0, borderRadius: 9, padding: "6px 14px", fontSize: 12, fontWeight: 700, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 5 }}>
                            <CreditCard style={{ width: 13, height: 13 }} /> Cobrar
                          </button>
                        )}
                        {ag.status !== "cancelado" && ag.status !== "concluido" && (
                          <button type="button" onClick={() => cancelarAgendamento(ag.id)} disabled={cancelandoId === ag.id}
                            style={{ background: "#fff1f2", color: "#dc2626", border: "1px solid #fca5a5", borderRadius: 9, padding: "6px 12px", fontSize: 12, fontWeight: 700, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 4, opacity: cancelandoId === ag.id ? 0.6 : 1 }}>
                            <XCircle style={{ width: 13, height: 13 }} />
                            {cancelandoId === ag.id ? "..." : "Cancelar"}
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* ── DESKTOP: tabela ──────────────────────────── */}
              <div className="hidden sm:block" style={{ borderRadius: 14, overflow: "hidden", border: "1px solid #e6d9cf" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
                  <thead>
                    <tr style={{ background: "#f9f6f2" }}>
                      {["Hora", "Cliente", "Serviço", "Profissional", "Valor", "Status", "Pagamento", ""].map((h) => (
                        <th key={h} style={{ textAlign: h === "Valor" ? "right" : "left", padding: "11px 14px", fontWeight: 700, color: "#57493f", fontSize: 12, textTransform: "uppercase", letterSpacing: 0.5, whiteSpace: "nowrap" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filtrados.map((ag, i) => {
                      const st = STATUS_LABEL[ag.status] ?? { label: ag.status, bg: "#f9f6f2", color: "#57493f" };
                      const podeCobrar = ag.status !== "cancelado" && !ag.pago;
                      return (
                        <tr key={ag.id} style={{ borderTop: "1px solid #f0e8e0", background: i % 2 === 0 ? "#fff" : "#fdfaf8" }}>
                          <td style={{ padding: "12px 14px", fontWeight: 700, color: "#2d241f", whiteSpace: "nowrap" }}>{ag.hora_inicio}</td>
                          <td style={{ padding: "12px 14px", color: "#111827", fontWeight: 600 }}>{(ag as any).cliente_nome || "—"}</td>
                          <td style={{ padding: "12px 14px", color: "#57493f" }}>{ag.servico}</td>
                          <td style={{ padding: "12px 14px", color: "#57493f" }}>{(ag as any).profissional_nome || "—"}</td>
                          <td style={{ padding: "12px 14px", textAlign: "right", fontWeight: 700, color: "#2d241f", whiteSpace: "nowrap" }}>
                            {ag.valor != null ? Number(ag.valor).toLocaleString("pt-BR", { style: "currency", currency: "BRL" }) : "—"}
                          </td>
                          <td style={{ padding: "12px 14px" }}>
                            <span style={{ background: st.bg, color: st.color, borderRadius: 8, padding: "3px 10px", fontSize: 12, fontWeight: 700 }}>{st.label}</span>
                          </td>
                          <td style={{ padding: "12px 14px" }}>
                            {ag.pago ? (
                              <span style={{ display: "inline-flex", alignItems: "center", gap: 4, color: "#15803d", fontSize: 12, fontWeight: 700 }}>
                                <CheckCircle2 style={{ width: 14, height: 14 }} />
                                {ag.forma_pagamento ? ag.forma_pagamento.replace(/_/g, " ") : "Pago"}
                              </span>
                            ) : (
                              <span style={{ color: "#9ca3af", fontSize: 12 }}>Pendente</span>
                            )}
                          </td>
                          <td style={{ padding: "12px 14px", textAlign: "right" }}>
                            <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 6 }}>
                              {ag.status === "concluido" ? (
                                <button type="button" onClick={() => abrirWaModal(ag, "agradecimento")}
                                  style={{ background: (ag as any).cliente_telefone ? "#25d366" : "#e5e7eb", color: (ag as any).cliente_telefone ? "#fff" : "#9ca3af", border: 0, borderRadius: 9, padding: "6px 10px", fontSize: 12, fontWeight: 700, cursor: (ag as any).cliente_telefone ? "pointer" : "default", display: "inline-flex", alignItems: "center", gap: 5 }}>
                                  <MessageCircle style={{ width: 13, height: 13 }} /> Agradecer
                                </button>
                              ) : (
                                <button type="button" onClick={() => abrirWaModal(ag, "lembrete")}
                                  style={{ background: (ag as any).cliente_telefone ? "#25d366" : "#e5e7eb", color: (ag as any).cliente_telefone ? "#fff" : "#9ca3af", border: 0, borderRadius: 9, padding: "6px 10px", fontSize: 13, fontWeight: 700, cursor: (ag as any).cliente_telefone ? "pointer" : "default", display: "inline-flex", alignItems: "center", gap: 4 }}>
                                  <MessageCircle style={{ width: 13, height: 13 }} />
                                </button>
                              )}
                              {ag.status !== "cancelado" && ag.status !== "concluido" && (
                                <button type="button" onClick={() => abrirWaModal(ag, "reagendamento")} title="Solicitar Reagendamento"
                                  style={{ background: (ag as any).cliente_telefone ? "#f47b1e" : "#e5e7eb", color: (ag as any).cliente_telefone ? "#fff" : "#9ca3af", border: 0, borderRadius: 9, padding: "6px 10px", fontSize: 13, fontWeight: 700, cursor: (ag as any).cliente_telefone ? "pointer" : "default", display: "inline-flex", alignItems: "center", gap: 4 }} >
                                  <CalendarX style={{ width: 13, height: 13 }} />
                                </button>
                              )}
                              {podeCobrar && (
                                <button type="button" onClick={() => abrirCobrar(ag)}
                                  style={{ background: `linear-gradient(135deg, ${corSecundaria}, ${corPrimaria})`, color: "#fff", border: 0, borderRadius: 9, padding: "6px 14px", fontSize: 13, fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap", display: "inline-flex", alignItems: "center", gap: 5 }}>
                                  <CreditCard style={{ width: 13, height: 13 }} /> Cobrar
                                </button>
                              )}
                              {ag.status !== "cancelado" && ag.status !== "concluido" && (
                                <button type="button" onClick={() => cancelarAgendamento(ag.id)} disabled={cancelandoId === ag.id}
                                  style={{ background: "#fff1f2", color: "#dc2626", border: "1px solid #fca5a5", borderRadius: 9, padding: "6px 10px", fontSize: 13, fontWeight: 700, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 4, opacity: cancelandoId === ag.id ? 0.6 : 1 }}>
                                  <XCircle style={{ width: 13, height: 13 }} />
                                  {cancelandoId === ag.id ? "..." : "Cancelar"}
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Modal de Cobrança */}
      <Dialog open={!!cobrandoAg} onOpenChange={(o) => { if (!o) fecharModal(); }}>
        <DialogContent style={{ maxWidth: 480 }}>
          <DialogHeader>
            <DialogTitle style={{ fontSize: 18, fontWeight: 800, color: "#111827" }}>Registrar Pagamento</DialogTitle>
          </DialogHeader>

          {cobrandoAg && (
            <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
              {/* Resumo + valor editável */}
              <div style={{ background: "#f9f6f2", border: "1px solid #e6d9cf", borderRadius: 14, padding: 16 }}>
                <div style={{ fontSize: 13, color: "#57493f", marginBottom: 10 }}>
                  <strong>{cobrandoAg.cliente_nome || "Cliente"}</strong> · {cobrandoAg.servico}
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: 20, fontWeight: 800, color: "#2d241f" }}>R$</span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="0,00"
                    value={valorLocal}
                    onChange={(e) => {
                      setValorLocal(e.target.value);
                      setMpPixData(null);
                      setMpCartaoData(null);
                      stopPolling();
                    }}
                    style={{
                      flex: 1,
                      fontSize: 22,
                      fontWeight: 900,
                      color: "#2d241f",
                      border: "none",
                      background: "transparent",
                      outline: "none",
                      padding: "2px 0",
                      width: "100%",
                    }}
                  />
                </div>
                {!valorLocal && (
                  <p style={{ margin: "6px 0 0", fontSize: 12, color: "#b45309" }}>
                    Digite o valor para habilitar a cobrança
                  </p>
                )}
              </div>

              {/* Forma de pagamento */}
              <div>
                <Label style={{ fontSize: 13, fontWeight: 700, color: "#57493f", display: "block", marginBottom: 10 }}>Forma de Pagamento</Label>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                  {FORMAS.map((f) => {
                    const sel = formaPagamento === f.value;
                    return (
                      <button
                        key={f.value}
                        type="button"
                        onClick={() => trocarForma(f.value)}
                        style={{
                          border: sel ? `2px solid ${corPrimaria}` : "1px solid #e6d9cf",
                          background: sel ? "#f3ede8" : "#fff",
                          borderRadius: 12,
                          padding: "10px 14px",
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          gap: 8,
                          fontWeight: sel ? 700 : 500,
                          color: sel ? "#2d241f" : "#57493f",
                          fontSize: 13,
                          transition: "all 0.15s ease",
                        }}
                      >
                        <f.icone style={{ width: 15, height: 15, color: sel ? corPrimaria : "#8b735d" }} />
                        {f.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Seção PIX — Mercado Pago */}
              {formaPagamento === "pix" && (
                <MpSection
                  valorDefinido={!!valorLocal && Number(valorLocal) > 0}
                  carregando={mpCarregando}
                  aprovado={mpAprovado}
                  tipo="pix"
                  onGerar={gerarPixMP}
                  label="Gerar QR Code PIX"
                  sublabel="O cliente paga via app do banco, sem taxas"
                  labelAprovado="PIX recebido com sucesso pelo Mercado Pago."
                >
                  {mpPixData && !mpAprovado && (
                    <MpPixDisplay
                      qrCodeBase64={mpPixData.qr_code_base64}
                      qrCode={mpPixData.qr_code}
                      copiado={pixCopiado}
                      onCopiar={() => copiarTexto(mpPixData.qr_code, setPixCopiado)}
                    />
                  )}
                </MpSection>
              )}

              {/* Seção Cartão — Mercado Pago Checkout Pro */}
              {ehCartaoMP && (
                <MpSection
                  valorDefinido={!!valorLocal && Number(valorLocal) > 0}
                  carregando={mpCarregando}
                  aprovado={mpAprovado}
                  tipo="cartao"
                  onGerar={gerarLinkCartao}
                  label={`Gerar link de pagamento — ${labelTipoCartao}`}
                  sublabel={`Juros de parcelamento por conta do cliente · Processado pelo Mercado Pago`}
                  labelAprovado={`Pagamento com cartão ${labelTipoCartao.toLowerCase()} confirmado!`}
                >
                  {mpCartaoData && !mpAprovado && (
                    <MpCartaoDisplay
                      checkoutUrl={mpCartaoData.checkout_url}
                      qrUrl={cartaoQrUrl}
                      copiado={linkCopiado}
                      onCopiar={() => copiarTexto(mpCartaoData.checkout_url, setLinkCopiado)}
                    />
                  )}
                </MpSection>
              )}
            </div>
          )}

          <DialogFooter style={{ display: "flex", gap: 10, marginTop: 4 }}>
            <button
              type="button"
              onClick={fecharModal}
              style={{ flex: 1, border: "1px solid #e6d9cf", background: "#f9f6f2", color: "#4f433a", borderRadius: 10, padding: "10px 0", fontWeight: 700, fontSize: 14, cursor: "pointer" }}
            >
              Cancelar
            </button>
            {/* Botão manual só aparece quando não há MP ativo ou para formas manuais */}
            {(!mpAtivo || (!ehCartaoMP && formaPagamento !== "pix")) && (
              <button
                type="button"
                onClick={() => confirmarPagamento()}
                disabled={updateMutation.isPending}
                style={{ flex: 2, background: "linear-gradient(135deg, #59463b, #2d241f)", color: "#fff", border: 0, borderRadius: 10, padding: "10px 0", fontWeight: 700, fontSize: 14, cursor: "pointer", opacity: updateMutation.isPending ? 0.7 : 1 }}
              >
                {updateMutation.isPending ? "Salvando..." : "Confirmar Pagamento ✓"}
              </button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal de edição de mensagem WhatsApp */}
      <Dialog open={!!waModal} onOpenChange={(o) => { if (!o) setWaModal(null); }}>
        <DialogContent style={{ maxWidth: 500 }}>
          <DialogHeader>
            <DialogTitle style={{ fontSize: 17, fontWeight: 800, color: "#111827" }}>
              {waModal?.titulo}
            </DialogTitle>
          </DialogHeader>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <Label style={{ fontSize: 13, fontWeight: 600, color: "#57493f" }}>
              Edite a mensagem antes de enviar
            </Label>
            <textarea
              value={waModal?.texto || ""}
              onChange={(e) => setWaModal(w => w ? { ...w, texto: e.target.value } : null)}
              rows={10}
              style={{
                width: "100%",
                border: "1px solid #e6d9cf",
                borderRadius: 10,
                padding: "12px 14px",
                fontSize: 13,
                color: "#2d241f",
                lineHeight: 1.65,
                resize: "vertical",
                outline: "none",
                fontFamily: "inherit",
                background: "#fdfaf8",
                boxSizing: "border-box",
              }}
            />
            <p style={{ margin: 0, fontSize: 12, color: "#9ca3af" }}>
              O WhatsApp abrira com esta mensagem pronta — voce ainda podera revisar antes de enviar.
            </p>
          </div>
          <DialogFooter style={{ display: "flex", gap: 10, marginTop: 4 }}>
            <button
              type="button"
              onClick={() => setWaModal(null)}
              style={{ flex: 1, border: "1px solid #e6d9cf", background: "#f9f6f2", color: "#4f433a", borderRadius: 10, padding: "10px 0", fontWeight: 700, fontSize: 14, cursor: "pointer" }}
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={() => {
                if (waModal) {
                  window.open(`https://wa.me/${waModal.numero}?text=${encodeURIComponent(waModal.texto)}`, "_blank");
                  setWaModal(null);
                }
              }}
              style={{ flex: 2, background: "#25d366", color: "#fff", border: 0, borderRadius: 10, padding: "10px 0", fontWeight: 700, fontSize: 14, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}
            >
              <MessageCircle style={{ width: 16, height: 16 }} />
              Abrir no WhatsApp
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </Layout>
  );
}

/* ─── Sub-componente: Shell da seção Mercado Pago ─── */
function MpSection({
  valorDefinido,
  carregando,
  aprovado,
  tipo,
  onGerar,
  label,
  sublabel,
  labelAprovado,
  children,
}: {
  valorDefinido: boolean;
  carregando: boolean;
  aprovado: boolean;
  tipo: "pix" | "cartao";
  onGerar: () => void;
  label: string;
  sublabel: string;
  labelAprovado: string;
  children?: React.ReactNode;
}) {
  const hasChild = !!children;
  const mpColor = tipo === "pix" ? "#009ee3" : "#593aff";
  const mpGradient = tipo === "pix"
    ? "linear-gradient(135deg, #009ee3, #0078c8)"
    : "linear-gradient(135deg, #593aff, #3b24cc)";

  return (
    <div style={{ border: "1px solid #e6d9cf", borderRadius: 14, padding: 16 }}>
      {!valorDefinido ? (
        <div style={{ fontSize: 13, color: "#b45309", background: "#fffbeb", borderRadius: 8, padding: "10px 14px" }}>
          Informe o valor acima para habilitar a cobrança.
        </div>
      ) : aprovado ? (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12, padding: "8px 0" }}>
          <CheckCircle2 style={{ width: 48, height: 48, color: "#15803d" }} />
          <p style={{ margin: 0, fontSize: 15, fontWeight: 800, color: "#15803d" }}>Pagamento confirmado!</p>
          <p style={{ margin: 0, fontSize: 13, color: "#57493f" }}>{labelAprovado}</p>
        </div>
      ) : !hasChild ? (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 14 }}>
          <div style={{ textAlign: "center" }}>
            <p style={{ margin: "0 0 4px", fontSize: 13, fontWeight: 700, color: "#2d241f" }}>{label}</p>
            <p style={{ margin: 0, fontSize: 12, color: "#8b735d" }}>{sublabel}</p>
          </div>
          <button
            type="button"
            onClick={onGerar}
            disabled={carregando}
            style={{
              background: mpGradient,
              color: "#fff",
              border: 0,
              borderRadius: 12,
              padding: "12px 24px",
              fontWeight: 700,
              fontSize: 14,
              cursor: carregando ? "not-allowed" : "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              opacity: carregando ? 0.75 : 1,
              boxShadow: `0 2px 8px ${mpColor}55`,
            }}
          >
            {carregando
              ? <><Loader2 style={{ width: 16, height: 16, animation: "spin 1s linear infinite" }} /> Gerando...</>
              : <><QrCode style={{ width: 16, height: 16 }} /> {label}</>
            }
          </button>
        </div>
      ) : (
        children
      )}
    </div>
  );
}

/* ─── Sub-componente: Exibe QR Code do PIX ─── */
function MpPixDisplay({ qrCodeBase64, qrCode, copiado, onCopiar }: {
  qrCodeBase64: string;
  qrCode: string;
  copiado: boolean;
  onCopiar: () => void;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 14 }}>
      <p style={{ margin: 0, fontSize: 12, fontWeight: 600, color: "#57493f", textTransform: "uppercase", letterSpacing: 0.6 }}>QR Code PIX — Mercado Pago</p>
      {qrCodeBase64 && (
        <img
          src={`data:image/png;base64,${qrCodeBase64}`}
          alt="QR Code PIX"
          style={{ width: 200, height: 200, borderRadius: 12, border: "1px solid #e6d9cf" }}
        />
      )}
      <div style={{ width: "100%", background: "#f9f6f2", borderRadius: 10, padding: "10px 12px", display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ flex: 1, fontSize: 11, color: "#57493f", wordBreak: "break-all", fontFamily: "monospace" }}>
          {qrCode.substring(0, 60)}…
        </span>
        <button type="button" onClick={onCopiar} style={copiarBtnStyle(copiado)}>
          {copiado ? <Check style={{ width: 13, height: 13 }} /> : <Copy style={{ width: 13, height: 13 }} />}
          {copiado ? "Copiado!" : "Copiar"}
        </button>
      </div>
      <AguardandoIndicador texto="Aguardando confirmação do PIX..." />
    </div>
  );
}

/* ─── Sub-componente: Exibe link de pagamento cartão ─── */
function MpCartaoDisplay({ checkoutUrl, qrUrl, copiado, onCopiar }: {
  checkoutUrl: string;
  qrUrl: string;
  copiado: boolean;
  onCopiar: () => void;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 14 }}>
      <p style={{ margin: 0, fontSize: 12, fontWeight: 600, color: "#57493f", textTransform: "uppercase", letterSpacing: 0.6 }}>
        Checkout Mercado Pago
      </p>
      <p style={{ margin: 0, fontSize: 12, color: "#8b735d", textAlign: "center" }}>
        O cliente escaneia o QR Code com o celular e paga pelo site do Mercado Pago
      </p>
      {qrUrl && (
        <img
          src={qrUrl}
          alt="QR Code Link de Pagamento"
          style={{ width: 200, height: 200, borderRadius: 12, border: "1px solid #e6d9cf" }}
        />
      )}
      <div style={{ width: "100%", display: "flex", gap: 8 }}>
        <button type="button" onClick={onCopiar} style={{ ...copiarBtnStyle(copiado), flex: 1, justifyContent: "center" }}>
          {copiado ? <Check style={{ width: 13, height: 13 }} /> : <Copy style={{ width: 13, height: 13 }} />}
          {copiado ? "Copiado!" : "Copiar link"}
        </button>
        <a
          href={checkoutUrl}
          target="_blank"
          rel="noopener noreferrer"
          style={{ flex: 1, border: "1px solid #593aff", background: "#f5f3ff", borderRadius: 8, padding: "6px 12px", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 5, fontSize: 12, fontWeight: 700, color: "#593aff", textDecoration: "none" }}
        >
          <ExternalLink style={{ width: 13, height: 13 }} /> Abrir link
        </a>
      </div>
      <div style={{ fontSize: 11, color: "#8b735d", textAlign: "center", background: "#f9f6f2", borderRadius: 8, padding: "8px 12px" }}>
        Os juros de parcelamento são cobrados diretamente do cliente pelo Mercado Pago
      </div>
      <AguardandoIndicador texto="Aguardando confirmação do pagamento..." />
    </div>
  );
}

function AguardandoIndicador({ texto }: { texto: string }) {
  return (
    <>
      <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "#8b735d" }}>
        <Loader2 style={{ width: 13, height: 13, animation: "spin 1.5s linear infinite", color: "#009ee3" }} />
        {texto}
      </div>
      <div style={{ fontSize: 11, color: "#9ca3af", textAlign: "center" }}>
        Confirmação automática ao receber o pagamento.
      </div>
    </>
  );
}

function copiarBtnStyle(copiado: boolean): React.CSSProperties {
  return {
    flexShrink: 0,
    border: "1px solid #e6d9cf",
    background: copiado ? "#f0fdf4" : "#fff",
    borderRadius: 8,
    padding: "5px 10px",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    gap: 4,
    fontSize: 12,
    fontWeight: 700,
    color: copiado ? "#15803d" : "#57493f",
    transition: "all 0.2s",
  };
}
