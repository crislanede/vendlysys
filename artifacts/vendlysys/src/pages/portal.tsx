import { useState, useEffect, useCallback, useRef } from "react";
import { useParams } from "wouter";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import {
  CalendarDays, Clock, X, Edit, LogOut, User, MapPin, Phone,
  Instagram, MessageCircle, ChevronRight, CheckCircle2, Scissors,
  Star, ArrowRight,
} from "lucide-react";

interface ServicoPortal { id: number; nome: string; valor: number; duracao_minutos: number; descricao?: string; }
interface Empresa {
  id: number; nome: string; logo_url?: string; cor_primaria?: string;
  telefone?: string; endereco?: string; descricao?: string;
  horario_funcionamento?: string; instagram?: string; whatsapp?: string;
}
interface Cliente {
  id: number; nome: string; telefone?: string; email?: string; data_nascimento?: string; endereco?: string;
  cep?: string; logradouro?: string; numero?: string; complemento?: string; bairro?: string; cidade?: string; estado?: string; pontos?: number;
}
interface Agendamento { id: number; servico: string; data: string; hora_inicio: string; hora_fim?: string; status: string; observacoes?: string; profissional_nome?: string | null; }

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

async function apiFetch(path: string, options: RequestInit = {}, token?: string) {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  const res = await fetch(`${BASE}${path}`, { ...options, headers: { ...headers, ...(options.headers as any) } });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Erro desconhecido" }));
    throw new Error(err.error || "Erro na requisição");
  }
  return res.json();
}

const STATUS_LABEL: Record<string, string> = {
  agendado: "Agendado", confirmado: "Confirmado", concluido: "Concluído", cancelado: "Cancelado",
  aguardando_sinal: "⏳ Aguardando Sinal",
};
const STATUS_COR: Record<string, { bg: string; color: string }> = {
  agendado:         { bg: "#dbeafe", color: "#1d4ed8" },
  confirmado:       { bg: "#ede9fe", color: "#6d28d9" },
  concluido:        { bg: "#dcfce7", color: "#15803d" },
  cancelado:        { bg: "#fee2e2", color: "#b91c1c" },
  aguardando_sinal: { bg: "#fff7ed", color: "#c2410c" },
};

function fmtBRL(v: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);
}
function fmtData(data: string) {
  return new Date(data.slice(0, 10) + "T12:00:00").toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long" });
}
function calcularHoraFim(horaInicio: string, duracaoMin: number): string {
  const [h, m] = horaInicio.split(":").map(Number);
  const totalMin = h * 60 + m + duracaoMin;
  return `${String(Math.floor(totalMin / 60) % 24).padStart(2, "0")}:${String(totalMin % 60).padStart(2, "0")}`;
}

type Aba = "agendamentos" | "servicos" | "novo" | "dados" | "sinal";

export default function Portal() {
  const params = useParams<{ slug: string }>();
  const slug = params.slug || "studio-bella";
  const { toast } = useToast();

  const [empresa, setEmpresa] = useState<Empresa | null>(null);
  const [servicos, setServicos] = useState<ServicoPortal[]>([]);
  const [profissionais, setProfissionais] = useState<{ id: number; nome: string; especialidade?: string }[]>([]);
  const [token, setToken] = useState<string | null>(() => localStorage.getItem(`portal_token_${slug}`));
  const [cliente, setCliente] = useState<Cliente | null>(() => {
    const s = localStorage.getItem(`portal_cliente_${slug}`);
    return s ? JSON.parse(s) : null;
  });
  const [agendamentos, setAgendamentos] = useState<Agendamento[]>([]);
  const [loadingAgendamentos, setLoadingAgendamentos] = useState(false);
  const [aba, setAba] = useState<Aba>("agendamentos");

  const [telefone, setTelefone] = useState("");
  const [nome, setNome] = useState("");
  const [precisaNome, setPrecisaNome] = useState(false);
  const [loadingIdentificar, setLoadingIdentificar] = useState(false);

  const [regEmail, setRegEmail] = useState("");
  const [regDataNasc, setRegDataNasc] = useState("");
  const [regCep, setRegCep] = useState("");
  const [regLogradouro, setRegLogradouro] = useState("");
  const [regNumero, setRegNumero] = useState("");
  const [regComplemento, setRegComplemento] = useState("");
  const [regBairro, setRegBairro] = useState("");
  const [regCidade, setRegCidade] = useState("");
  const [regEstado, setRegEstado] = useState("");
  const [loadingCep, setLoadingCep] = useState(false);

  const [novoAg, setNovoAg] = useState({ servico_id: 0, servico_nome: "", data: new Date().toISOString().split("T")[0], hora_inicio: "09:00", hora_fim: "10:00", observacoes: "", profissional_id: 0, profissional_nome: "" });
  const [salvandoAg, setSalvandoAg] = useState(false);

  const [cancelandoId, setCancelandoId] = useState<number | null>(null);
  const [confirmandoId, setConfirmandoId] = useState<number | null>(null);
  const [reagendando, setReagendando] = useState<Agendamento | null>(null);
  const [reagForm, setReagForm] = useState({ data: "", hora_inicio: "09:00", hora_fim: "10:00" });
  const [salvandoReag, setSalvandoReag] = useState(false);
  const [slotsDisponiveis, setSlotsDisponiveis] = useState<string[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);

  const [perfil, setPerfil] = useState({ nome: "", email: "", data_nascimento: "", endereco: "" });
  const [salvandoPerfil, setSalvandoPerfil] = useState(false);

  // ── Popup "completar cadastro" ──────────────────────────────────────────────
  const [completarAberto, setCompletarAberto] = useState(false);
  const [compEmail, setCompEmail] = useState("");
  const [compDataNasc, setCompDataNasc] = useState("");
  const [compCep, setCompCep] = useState("");
  const [compLogradouro, setCompLogradouro] = useState("");
  const [compNumero, setCompNumero] = useState("");
  const [compComplemento, setCompComplemento] = useState("");
  const [compBairro, setCompBairro] = useState("");
  const [compCidade, setCompCidade] = useState("");
  const [compEstado, setCompEstado] = useState("");
  const [compLoadingCep, setCompLoadingCep] = useState(false);
  const [salvandoCompleto, setSalvandoCompleto] = useState(false);

  const [sinalPendente, setSinalPendente] = useState<null | {
    agendamento_id: number;
    valor: number;
    percentual: number | null;
    chave_pix: string | null;
    qr_code: string | null;
    qr_code_base64: string | null;
    mp_payment_id: string | null;
    copiado: boolean;
    pollingPago: boolean;
  }>(null);
  const [mostrandoTermosSinal, setMostrandoTermosSinal] = useState(false);
  const [termosSinalAceitos, setTermosSinalAceitos] = useState(false);

  const loginRef = useRef<HTMLDivElement>(null);
  const agendarRef = useRef<HTMLDivElement>(null);

  const cor = empresa?.cor_primaria || "#7C3AED";

  useEffect(() => {
    apiFetch(`/api/portal/empresa/${slug}`).then(setEmpresa).catch(() => {});
    apiFetch(`/api/portal/servicos/${slug}`).then(setServicos).catch(() => {});
    apiFetch(`/api/portal/profissionais/${slug}`).then(setProfissionais).catch(() => {});
  }, [slug]);

  const carregarAgendamentos = useCallback(async () => {
    if (!token) return;
    setLoadingAgendamentos(true);
    try {
      const data = await apiFetch("/api/portal/meus-agendamentos", {}, token);
      setAgendamentos(data);
    } catch { setAgendamentos([]); }
    finally { setLoadingAgendamentos(false); }
  }, [token]);

  useEffect(() => { carregarAgendamentos(); }, [carregarAgendamentos]);

  useEffect(() => {
    if (cliente) setPerfil({ nome: cliente.nome || "", email: cliente.email || "", data_nascimento: cliente.data_nascimento || "", endereco: cliente.endereco || "" });
  }, [cliente]);

  function handleSelecionarServico(s: ServicoPortal) {
    const horaFim = calcularHoraFim("09:00", s.duracao_minutos);
    setNovoAg(f => ({ ...f, servico_id: s.id, servico_nome: s.nome, hora_inicio: "09:00", hora_fim: horaFim }));
    if (!token) {
      setTimeout(() => loginRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
    } else {
      setAba("novo");
      setTimeout(() => agendarRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
    }
  }

  async function handleIdentificar() {
    if (!telefone.trim()) { toast({ title: "Informe seu celular.", variant: "destructive" }); return; }
    if (precisaNome) {
      if (!nome.trim()) { toast({ title: "Informe seu nome completo.", variant: "destructive" }); return; }
      if (!regEmail.trim() || !regEmail.includes("@")) { toast({ title: "Informe um e-mail válido.", variant: "destructive" }); return; }
      if (!regDataNasc.trim()) { toast({ title: "Informe sua data de nascimento.", variant: "destructive" }); return; }
      if (regCep.replace(/\D/g, "").length !== 8) { toast({ title: "Informe um CEP válido (8 dígitos).", variant: "destructive" }); return; }
      if (!regLogradouro.trim()) { toast({ title: "Informe o logradouro.", variant: "destructive" }); return; }
      if (!regNumero.trim()) { toast({ title: "Informe o número.", variant: "destructive" }); return; }
      if (!regBairro.trim()) { toast({ title: "Informe o bairro.", variant: "destructive" }); return; }
      if (!regCidade.trim()) { toast({ title: "Informe a cidade.", variant: "destructive" }); return; }
    }
    setLoadingIdentificar(true);
    try {
      const body: Record<string, string> = { slug, telefone: telefone.trim() };
      if (nome.trim()) body.nome = nome.trim();
      if (precisaNome) {
        body.email = regEmail.trim();
        body.data_nascimento = regDataNasc;
        body.cep = regCep.replace(/\D/g, "");
        body.logradouro = regLogradouro.trim();
        body.numero = regNumero.trim();
        if (regComplemento.trim()) body.complemento = regComplemento.trim();
        body.bairro = regBairro.trim();
        body.cidade = regCidade.trim();
        body.estado = regEstado.trim();
      }
      const res = await apiFetch("/api/portal/identificar", {
        method: "POST",
        body: JSON.stringify(body),
      });
      setToken(res.token);
      setCliente(res.cliente);
      localStorage.setItem(`portal_token_${slug}`, res.token);
      localStorage.setItem(`portal_cliente_${slug}`, JSON.stringify(res.cliente));
      setPrecisaNome(false);
      if (novoAg.servico_nome) setAba("novo");
    } catch (err: any) {
      if (err.message?.includes("nome")) {
        setPrecisaNome(true);
        if (nome.trim()) toast({ title: err.message, variant: "destructive" });
      } else {
        toast({ title: err.message || "Erro ao identificar.", variant: "destructive" });
      }
    } finally { setLoadingIdentificar(false); }
  }

  function handleSair() {
    localStorage.removeItem(`portal_token_${slug}`);
    localStorage.removeItem(`portal_cliente_${slug}`);
    setToken(null); setCliente(null); setAgendamentos([]);
    setTelefone(""); setNome(""); setPrecisaNome(false);
    setRegEmail(""); setRegDataNasc(""); setRegCep(""); setRegLogradouro("");
    setRegNumero(""); setRegComplemento(""); setRegBairro(""); setRegCidade(""); setRegEstado("");
  }

  // Abre popup quando cliente loga mas tem dados incompletos
  useEffect(() => {
    if (!cliente) return;
    const incompleto = !cliente.email || !cliente.data_nascimento || !cliente.logradouro;
    if (incompleto) {
      setCompEmail(cliente.email || "");
      setCompDataNasc(cliente.data_nascimento || "");
      setCompCep(cliente.cep || "");
      setCompLogradouro(cliente.logradouro || "");
      setCompNumero(cliente.numero || "");
      setCompComplemento(cliente.complemento || "");
      setCompBairro(cliente.bairro || "");
      setCompCidade(cliente.cidade || "");
      setCompEstado(cliente.estado || "");
      setCompletarAberto(true);
    }
  }, [cliente?.id]);

  async function handleCompletarCep(val: string) {
    const digits = val.replace(/\D/g, "");
    setCompCep(val);
    if (digits.length !== 8) return;
    setCompLoadingCep(true);
    try {
      const r = await fetch(`https://viacep.com.br/ws/${digits}/json/`);
      const d = await r.json();
      if (!d.erro) {
        setCompLogradouro(d.logradouro || "");
        setCompBairro(d.bairro || "");
        setCompCidade(d.localidade || "");
        setCompEstado(d.uf || "");
      }
    } catch {}
    finally { setCompLoadingCep(false); }
  }

  async function handleSalvarCompletar() {
    if (!compEmail.trim() || !compEmail.includes("@")) { toast({ title: "Informe um e-mail válido.", variant: "destructive" }); return; }
    if (!compDataNasc.trim()) { toast({ title: "Informe sua data de nascimento.", variant: "destructive" }); return; }
    if (compCep.replace(/\D/g, "").length !== 8) { toast({ title: "Informe um CEP válido (8 dígitos).", variant: "destructive" }); return; }
    if (!compLogradouro.trim()) { toast({ title: "Informe o logradouro.", variant: "destructive" }); return; }
    if (!compNumero.trim()) { toast({ title: "Informe o número.", variant: "destructive" }); return; }
    if (!compBairro.trim()) { toast({ title: "Informe o bairro.", variant: "destructive" }); return; }
    if (!compCidade.trim()) { toast({ title: "Informe a cidade.", variant: "destructive" }); return; }
    setSalvandoCompleto(true);
    try {
      const atualizado = await apiFetch("/api/portal/meu-perfil", {
        method: "PUT",
        body: JSON.stringify({
          email: compEmail.trim(),
          data_nascimento: compDataNasc,
          cep: compCep.replace(/\D/g, ""),
          logradouro: compLogradouro.trim(),
          numero: compNumero.trim(),
          complemento: compComplemento.trim() || null,
          bairro: compBairro.trim(),
          cidade: compCidade.trim(),
          estado: compEstado.trim(),
        }),
      }, token!);
      setCliente(atualizado);
      localStorage.setItem(`portal_cliente_${slug}`, JSON.stringify(atualizado));
      setCompletarAberto(false);
      toast({ title: "Cadastro completado! Obrigado." });
    } catch (err: any) {
      toast({ title: err.message || "Erro ao salvar.", variant: "destructive" });
    } finally { setSalvandoCompleto(false); }
  }

  async function handleCepBuscar(cepVal: string) {
    const digits = cepVal.replace(/\D/g, "");
    setRegCep(cepVal);
    if (digits.length !== 8) return;
    setLoadingCep(true);
    try {
      const r = await fetch(`https://viacep.com.br/ws/${digits}/json/`);
      const d = await r.json();
      if (!d.erro) {
        setRegLogradouro(d.logradouro || "");
        setRegBairro(d.bairro || "");
        setRegCidade(d.localidade || "");
        setRegEstado(d.uf || "");
      }
    } catch {}
    finally { setLoadingCep(false); }
  }

  function handleClickConfirmarAgendamento() {
    if (!novoAg.servico_nome.trim()) { toast({ title: "Selecione um serviço.", variant: "destructive" }); return; }
    const pct = empresa ? (empresa as any).percentual_sinal : null;
    const svcSelecionado = servicos.find(s => s.id === novoAg.servico_id);
    const temSinal = pct && pct > 0 && svcSelecionado?.valor && Number(svcSelecionado.valor) > 0;
    if (temSinal) {
      setTermosSinalAceitos(false);
      setMostrandoTermosSinal(true);
    } else {
      handleNovoAgendamento();
    }
  }

  async function handleNovoAgendamento() {
    if (!novoAg.servico_nome.trim()) { toast({ title: "Selecione um serviço.", variant: "destructive" }); return; }
    setMostrandoTermosSinal(false);
    setSalvandoAg(true);
    try {
      const res = await apiFetch("/api/portal/agendar", {
        method: "POST",
        body: JSON.stringify({ servico: novoAg.servico_nome, servico_id: novoAg.servico_id || null, data: novoAg.data, hora_inicio: novoAg.hora_inicio, hora_fim: novoAg.hora_fim, observacoes: novoAg.observacoes, profissional_id: novoAg.profissional_id || null }),
      }, token!);
      setNovoAg({ servico_id: 0, servico_nome: "", data: new Date().toISOString().split("T")[0], hora_inicio: "09:00", hora_fim: "10:00", observacoes: "", profissional_id: 0, profissional_nome: "" });
      if (res.precisaSinal) {
        setSinalPendente({
          agendamento_id: res.id,
          valor: res.valorSinal,
          percentual: res.percentualSinal ?? null,
          chave_pix: res.chave_pix ?? null,
          qr_code: res.pix_qr_code ?? null,
          qr_code_base64: res.pix_qr_code_base64 ?? null,
          mp_payment_id: res.mp_payment_id ?? null,
          copiado: false,
          pollingPago: false,
        });
        setAba("sinal");
      } else {
        toast({ title: "Agendamento realizado! Entraremos em contato para confirmar." });
        setAba("agendamentos");
        carregarAgendamentos();
      }
    } catch (err: any) {
      toast({ title: err.message || "Erro ao agendar.", variant: "destructive" });
    } finally { setSalvandoAg(false); }
  }

  useEffect(() => {
    if (!sinalPendente || !token) return;
    const interval = setInterval(async () => {
      try {
        const res = await apiFetch(`/api/portal/agendamentos/${sinalPendente.agendamento_id}/sinal-status`, {}, token);
        if (res.sinal_pago) {
          clearInterval(interval);
          setSinalPendente(null);
          toast({ title: "✅ Sinal confirmado! Agendamento garantido." });
          setAba("agendamentos");
          carregarAgendamentos();
        }
      } catch {}
    }, 5000);
    return () => clearInterval(interval);
  }, [sinalPendente?.agendamento_id, token]);

  async function handleCancelar() {
    if (!cancelandoId) return;
    try {
      const res = await apiFetch(`/api/portal/agendamentos/${cancelandoId}/cancelar`, { method: "PUT" }, token!);
      if (res.sinalCreditado) {
        const expira = new Date((res.sinalExpiraEm ?? "").slice(0, 10) + "T12:00:00").toLocaleDateString("pt-BR");
        toast({
          title: "Agendamento cancelado",
          description: `Seu sinal de ${Number(res.sinal_valor).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })} ficou como crédito. Você tem até ${expira} para reagendar.`,
        });
      } else {
        toast({ title: "Agendamento cancelado." });
      }
      setCancelandoId(null);
      carregarAgendamentos();
    } catch (err: any) { toast({ title: err.message || "Erro ao cancelar.", variant: "destructive" }); }
  }

  async function handlePagarSinal(ag: Agendamento) {
    try {
      const info = await apiFetch(`/api/portal/agendamentos/${ag.id}/sinal-info`, {}, token!);
      setSinalPendente({
        agendamento_id: ag.id,
        valor: info.valor,
        percentual: null,
        chave_pix: info.chave_pix ?? null,
        qr_code: info.qr_code ?? null,
        qr_code_base64: info.qr_code_base64 ?? null,
        mp_payment_id: null,
        copiado: false,
        pollingPago: false,
      });
      setAba("sinal");
    } catch (err: any) {
      toast({ title: err.message || "Erro ao carregar informações de pagamento.", variant: "destructive" });
    }
  }

  async function handleConfirmar(id: number) {
    setConfirmandoId(id);
    try {
      await apiFetch(`/api/portal/agendamentos/${id}/confirmar`, { method: "PUT" }, token!);
      toast({ title: "✅ Presença confirmada! Até lá!" });
      carregarAgendamentos();
    } catch (err: any) { toast({ title: err.message || "Erro ao confirmar.", variant: "destructive" }); }
    finally { setConfirmandoId(null); }
  }

  useEffect(() => {
    if (!novoAg.servico_id || !novoAg.data || !slug) { setSlotsDisponiveis([]); return; }
    setLoadingSlots(true);
    apiFetch(`/api/portal/horarios-disponiveis?slug=${slug}&data=${novoAg.data}&servico_id=${novoAg.servico_id}`)
      .then((r) => setSlotsDisponiveis(r.horarios || []))
      .catch(() => setSlotsDisponiveis([]))
      .finally(() => setLoadingSlots(false));
  }, [novoAg.servico_id, novoAg.data, slug]);

  async function handleReagendar() {
    if (!reagendando) return;
    setSalvandoReag(true);
    try {
      const res = await apiFetch(`/api/portal/agendamentos/${reagendando.id}/reagendar`, { method: "PUT", body: JSON.stringify(reagForm) }, token!);
      if (res.sinalAplicado) {
        toast({ title: "Reagendado com sucesso!", description: "Seu crédito de sinal foi aproveitado automaticamente. Nenhum novo pagamento é necessário." });
      } else {
        toast({ title: "Reagendado com sucesso!" });
      }
      setReagendando(null);
      carregarAgendamentos();
    } catch (err: any) { toast({ title: err.message || "Erro ao reagendar.", variant: "destructive" }); }
    finally { setSalvandoReag(false); }
  }

  async function handleSalvarPerfil() {
    setSalvandoPerfil(true);
    try {
      const atualizado = await apiFetch("/api/portal/meu-perfil", { method: "PUT", body: JSON.stringify(perfil) }, token!);
      setCliente(atualizado);
      localStorage.setItem(`portal_cliente_${slug}`, JSON.stringify(atualizado));
      toast({ title: "Dados atualizados com sucesso!" });
    } catch (err: any) { toast({ title: err.message || "Erro ao salvar.", variant: "destructive" }); }
    finally { setSalvandoPerfil(false); }
  }

  const agendamentosFuturos = agendamentos.filter(a => a.status !== "cancelado" && a.status !== "concluido");
  const agendamentosCreditados = agendamentos.filter(a => a.status === "cancelado" && (a as any).sinal_pago === "creditado");
  const agendamentosPassados = agendamentos.filter(a => (a.status === "cancelado" && (a as any).sinal_pago !== "creditado") || a.status === "concluido");

  if (!empresa) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#f8f7f6" }}>
        <div style={{ width: 36, height: 36, borderRadius: "50%", border: `3px solid ${cor}`, borderTopColor: "transparent", animation: "spin 0.8s linear infinite" }} />
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    );
  }

  const btnStyle: React.CSSProperties = {
    background: cor, color: "#fff", border: 0, borderRadius: 12,
    padding: "13px 24px", fontWeight: 800, cursor: "pointer", fontSize: 15,
    display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8,
    transition: "opacity 0.15s",
  };
  const btnOutlineStyle: React.CSSProperties = {
    background: "transparent", color: cor, border: `1.5px solid ${cor}`, borderRadius: 12,
    padding: "11px 20px", fontWeight: 700, cursor: "pointer", fontSize: 14,
    display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6,
  };

  const whatsappHref = empresa.whatsapp
    ? `https://wa.me/55${empresa.whatsapp.replace(/\D/g, "")}`
    : null;
  const instagramHref = empresa.instagram
    ? `https://instagram.com/${empresa.instagram.replace("@", "")}`
    : null;

  return (
    <div style={{ minHeight: "100vh", background: "#f8f7f6", fontFamily: "-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif" }}>
      <style>{`
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes fadeUp{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:none}}
        .portal-card{animation:fadeUp 0.4s ease both}
        .srv-card:hover{transform:translateY(-2px);box-shadow:0 8px 24px rgba(0,0,0,0.12)!important}
        .portal-tab{transition:all 0.2s}
        input[type=date]::-webkit-calendar-picker-indicator{opacity:0.5}
      `}</style>

      {/* ── HEADER ── */}
      <header style={{ background: "#fff", borderBottom: "1px solid #ece8e4", position: "sticky", top: 0, zIndex: 50, backdropFilter: "blur(8px)" }}>
        <div style={{ maxWidth: 720, margin: "0 auto", padding: "0 20px", height: 64, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            {empresa.logo_url ? (
              <img src={empresa.logo_url} alt={empresa.nome} style={{ width: 38, height: 38, borderRadius: 10, objectFit: "contain", border: "1px solid #ece8e4" }} />
            ) : (
              <div style={{ width: 38, height: 38, borderRadius: 10, background: cor, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 800, fontSize: 18 }}>
                {empresa.nome.charAt(0)}
              </div>
            )}
            <div>
              <div style={{ fontWeight: 800, fontSize: 15, color: "#1a1a1a" }}>{empresa.nome}</div>
              {empresa.telefone && <div style={{ fontSize: 12, color: "#888" }}>{empresa.telefone}</div>}
            </div>
          </div>
          {cliente ? (
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ fontSize: 13, color: "#555", display: window.innerWidth < 400 ? "none" : undefined }}>{cliente.nome.split(" ")[0]}</span>
              <button type="button" onClick={handleSair} style={{ background: "#f5f3f1", border: 0, borderRadius: 8, padding: "7px 10px", cursor: "pointer", display: "flex", alignItems: "center", gap: 5, fontSize: 13, color: "#666" }}>
                <LogOut style={{ width: 14, height: 14 }} /> Sair
              </button>
            </div>
          ) : (
            <button type="button" onClick={() => loginRef.current?.scrollIntoView({ behavior: "smooth" })} style={{ ...btnStyle, padding: "9px 18px", fontSize: 13 }}>
              Entrar
            </button>
          )}
        </div>
      </header>

      {/* ── HERO / EMPRESA INFO ── */}
      <section style={{ background: `linear-gradient(135deg, ${cor}18 0%, #fff 100%)`, borderBottom: "1px solid #ece8e4", padding: "40px 20px 32px" }}>
        <div style={{ maxWidth: 720, margin: "0 auto" }}>
          <div style={{ display: "flex", alignItems: "flex-start", gap: 20, flexWrap: "wrap" }}>
            <div style={{ flex: 1, minWidth: 220 }}>
              <h1 style={{ margin: "0 0 8px", fontSize: 28, fontWeight: 900, color: "#1a1a1a", lineHeight: 1.2 }}>{empresa.nome}</h1>
              {empresa.descricao && <p style={{ margin: "0 0 16px", fontSize: 15, color: "#555", lineHeight: 1.6 }}>{empresa.descricao}</p>}
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {empresa.endereco && (
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 13, color: "#666", background: "#f5f3f1", borderRadius: 20, padding: "5px 12px" }}>
                    <MapPin style={{ width: 13, height: 13 }} /> {empresa.endereco}
                  </span>
                )}
                {empresa.telefone && (
                  <a href={`tel:${empresa.telefone}`} style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 13, color: "#666", background: "#f5f3f1", borderRadius: 20, padding: "5px 12px", textDecoration: "none" }}>
                    <Phone style={{ width: 13, height: 13 }} /> {empresa.telefone}
                  </a>
                )}
                {empresa.horario_funcionamento && (
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 13, color: "#666", background: "#f5f3f1", borderRadius: 20, padding: "5px 12px" }}>
                    <Clock style={{ width: 13, height: 13 }} /> {empresa.horario_funcionamento}
                  </span>
                )}
              </div>
              <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                {whatsappHref && (
                  <a href={whatsappHref} target="_blank" rel="noreferrer" style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "#25D366", color: "#fff", borderRadius: 10, padding: "8px 14px", fontSize: 13, fontWeight: 700, textDecoration: "none" }}>
                    <MessageCircle style={{ width: 15, height: 15 }} /> WhatsApp
                  </a>
                )}
                {instagramHref && (
                  <a href={instagramHref} target="_blank" rel="noreferrer" style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "linear-gradient(45deg,#f09433,#e6683c,#dc2743,#cc2366,#bc1888)", color: "#fff", borderRadius: 10, padding: "8px 14px", fontSize: 13, fontWeight: 700, textDecoration: "none" }}>
                    <Instagram style={{ width: 15, height: 15 }} /> {empresa.instagram}
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── ÁREA PRINCIPAL ── */}
      <div style={{ maxWidth: 720, margin: "0 auto", padding: "28px 20px 60px" }}>

        {/* ── LOGIN / ÁREA LOGADA ── */}
        {!token ? (
          <>
          {/* Serviços visíveis publicamente */}
          {servicos.length > 0 && (
            <section style={{ marginBottom: 32 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
                <Scissors style={{ width: 18, height: 18, color: cor }} />
                <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: "#1a1a1a" }}>Nossos Serviços</h2>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 12 }}>
                {servicos.map((s) => (
                  <div key={s.id} className="srv-card portal-card"
                    style={{ background: "#fff", borderRadius: 16, padding: "18px 16px", border: novoAg.servico_id === s.id ? `2px solid ${cor}` : "1.5px solid #ece8e4", cursor: "pointer", transition: "all 0.2s", boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}
                    onClick={() => handleSelecionarServico(s)}
                  >
                    <div style={{ fontWeight: 800, fontSize: 15, color: "#1a1a1a", marginBottom: 4 }}>{s.nome}</div>
                    <div style={{ fontSize: 13, color: "#888", marginBottom: 10 }}>{s.duracao_minutos} min</div>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <span style={{ fontWeight: 900, fontSize: 17, color: cor }}>{fmtBRL(s.valor)}</span>
                      <span style={{ background: cor + "18", color: cor, borderRadius: 8, padding: "4px 10px", fontSize: 12, fontWeight: 700 }}>
                        {novoAg.servico_id === s.id ? "✓ Selecionado" : "Agendar"}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}
          <div ref={loginRef}>
            <div style={{ background: "#fff", borderRadius: 20, border: "1.5px solid #ece8e4", overflow: "hidden", boxShadow: "0 4px 20px rgba(0,0,0,0.06)" }} className="portal-card">
              <div style={{ background: `linear-gradient(135deg, ${cor}, ${cor}cc)`, padding: "24px 28px 20px", color: "#fff" }}>
                <h2 style={{ margin: "0 0 4px", fontSize: 20, fontWeight: 900 }}>
                  {novoAg.servico_nome ? `Agendar: ${novoAg.servico_nome}` : "Acesse sua conta"}
                </h2>
                <p style={{ margin: 0, fontSize: 14, opacity: 0.85 }}>
                  Informe seu celular para agendar ou ver seus horários
                </p>
              </div>
              <div style={{ padding: "24px 28px", display: "flex", flexDirection: "column", gap: 14 }}>
                <div>
                  <label style={{ fontSize: 13, fontWeight: 700, color: "#444", display: "block", marginBottom: 6 }}>Celular / WhatsApp</label>
                  <input
                    type="tel"
                    placeholder="(11) 99999-9999"
                    value={telefone}
                    onChange={(e) => setTelefone(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleIdentificar()}
                    style={{ width: "100%", border: "1.5px solid #ddd", borderRadius: 10, padding: "12px 14px", fontSize: 15, outline: "none", boxSizing: "border-box", transition: "border 0.15s" }}
                    onFocus={(e) => (e.target.style.borderColor = cor)}
                    onBlur={(e) => (e.target.style.borderColor = "#ddd")}
                  />
                </div>
                {precisaNome && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    {/* Aviso de privacidade */}
                    <div style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 10, padding: "10px 14px", display: "flex", alignItems: "flex-start", gap: 8 }}>
                      <span style={{ fontSize: 16, flexShrink: 0 }}>🔒</span>
                      <p style={{ margin: 0, fontSize: 12, color: "#166534", lineHeight: 1.5 }}>
                        <strong>Seus dados são privados e não são compartilhados com terceiros.</strong> Utilizamos apenas para oferecer descontos, promoções exclusivas e brindes especiais para você.
                      </p>
                    </div>

                    <div style={{ borderTop: `2px solid ${cor}`, paddingTop: 10 }}>
                      <p style={{ margin: "0 0 10px", fontSize: 12, fontWeight: 700, color: cor, textTransform: "uppercase", letterSpacing: 0.5 }}>Primeiro acesso — complete seu cadastro</p>
                    </div>

                    {/* Nome completo */}
                    <div>
                      <label style={{ fontSize: 12, fontWeight: 700, color: "#444", display: "block", marginBottom: 5 }}>Nome completo *</label>
                      <input placeholder="Como você se chama?" value={nome} onChange={(e) => setNome(e.target.value)}
                        style={{ width: "100%", border: "1.5px solid #ddd", borderRadius: 10, padding: "11px 14px", fontSize: 14, outline: "none", boxSizing: "border-box" }}
                        onFocus={(e) => (e.target.style.borderColor = cor)} onBlur={(e) => (e.target.style.borderColor = "#ddd")} />
                    </div>

                    {/* E-mail */}
                    <div>
                      <label style={{ fontSize: 12, fontWeight: 700, color: "#444", display: "block", marginBottom: 5 }}>E-mail *</label>
                      <input type="email" placeholder="seu@email.com" value={regEmail} onChange={(e) => setRegEmail(e.target.value)}
                        style={{ width: "100%", border: "1.5px solid #ddd", borderRadius: 10, padding: "11px 14px", fontSize: 14, outline: "none", boxSizing: "border-box" }}
                        onFocus={(e) => (e.target.style.borderColor = cor)} onBlur={(e) => (e.target.style.borderColor = "#ddd")} />
                    </div>

                    {/* Data de nascimento */}
                    <div>
                      <label style={{ fontSize: 12, fontWeight: 700, color: "#444", display: "block", marginBottom: 5 }}>Data de nascimento *</label>
                      <input type="date" value={regDataNasc} onChange={(e) => setRegDataNasc(e.target.value)}
                        style={{ width: "100%", border: "1.5px solid #ddd", borderRadius: 10, padding: "11px 14px", fontSize: 14, outline: "none", boxSizing: "border-box", color: regDataNasc ? "#222" : "#aaa" }}
                        onFocus={(e) => (e.target.style.borderColor = cor)} onBlur={(e) => (e.target.style.borderColor = "#ddd")} />
                    </div>

                    {/* CEP */}
                    <div>
                      <label style={{ fontSize: 12, fontWeight: 700, color: "#444", display: "block", marginBottom: 5 }}>CEP *</label>
                      <div style={{ position: "relative" }}>
                        <input placeholder="00000-000" value={regCep} onChange={(e) => handleCepBuscar(e.target.value)} maxLength={9}
                          style={{ width: "100%", border: "1.5px solid #ddd", borderRadius: 10, padding: "11px 14px", fontSize: 14, outline: "none", boxSizing: "border-box" }}
                          onFocus={(e) => (e.target.style.borderColor = cor)} onBlur={(e) => (e.target.style.borderColor = "#ddd")} />
                        {loadingCep && <span style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", fontSize: 11, color: "#888" }}>Buscando...</span>}
                      </div>
                    </div>

                    {/* Logradouro + Número */}
                    <div style={{ display: "flex", gap: 8 }}>
                      <div style={{ flex: 3 }}>
                        <label style={{ fontSize: 12, fontWeight: 700, color: "#444", display: "block", marginBottom: 5 }}>Logradouro *</label>
                        <input placeholder="Rua, Av..." value={regLogradouro} onChange={(e) => setRegLogradouro(e.target.value)}
                          style={{ width: "100%", border: "1.5px solid #ddd", borderRadius: 10, padding: "11px 14px", fontSize: 14, outline: "none", boxSizing: "border-box" }}
                          onFocus={(e) => (e.target.style.borderColor = cor)} onBlur={(e) => (e.target.style.borderColor = "#ddd")} />
                      </div>
                      <div style={{ flex: 1 }}>
                        <label style={{ fontSize: 12, fontWeight: 700, color: "#444", display: "block", marginBottom: 5 }}>Nº *</label>
                        <input placeholder="123" value={regNumero} onChange={(e) => setRegNumero(e.target.value)}
                          style={{ width: "100%", border: "1.5px solid #ddd", borderRadius: 10, padding: "11px 14px", fontSize: 14, outline: "none", boxSizing: "border-box" }}
                          onFocus={(e) => (e.target.style.borderColor = cor)} onBlur={(e) => (e.target.style.borderColor = "#ddd")} />
                      </div>
                    </div>

                    {/* Complemento */}
                    <div>
                      <label style={{ fontSize: 12, fontWeight: 700, color: "#444", display: "block", marginBottom: 5 }}>Complemento <span style={{ fontWeight: 400, color: "#999" }}>(opcional)</span></label>
                      <input placeholder="Apto, Bloco, Casa..." value={regComplemento} onChange={(e) => setRegComplemento(e.target.value)}
                        style={{ width: "100%", border: "1.5px solid #ddd", borderRadius: 10, padding: "11px 14px", fontSize: 14, outline: "none", boxSizing: "border-box" }}
                        onFocus={(e) => (e.target.style.borderColor = cor)} onBlur={(e) => (e.target.style.borderColor = "#ddd")} />
                    </div>

                    {/* Bairro */}
                    <div>
                      <label style={{ fontSize: 12, fontWeight: 700, color: "#444", display: "block", marginBottom: 5 }}>Bairro *</label>
                      <input placeholder="Bairro" value={regBairro} onChange={(e) => setRegBairro(e.target.value)}
                        style={{ width: "100%", border: "1.5px solid #ddd", borderRadius: 10, padding: "11px 14px", fontSize: 14, outline: "none", boxSizing: "border-box" }}
                        onFocus={(e) => (e.target.style.borderColor = cor)} onBlur={(e) => (e.target.style.borderColor = "#ddd")} />
                    </div>

                    {/* Cidade + Estado */}
                    <div style={{ display: "flex", gap: 8 }}>
                      <div style={{ flex: 3 }}>
                        <label style={{ fontSize: 12, fontWeight: 700, color: "#444", display: "block", marginBottom: 5 }}>Cidade *</label>
                        <input placeholder="Cidade" value={regCidade} onChange={(e) => setRegCidade(e.target.value)}
                          style={{ width: "100%", border: "1.5px solid #ddd", borderRadius: 10, padding: "11px 14px", fontSize: 14, outline: "none", boxSizing: "border-box" }}
                          onFocus={(e) => (e.target.style.borderColor = cor)} onBlur={(e) => (e.target.style.borderColor = "#ddd")} />
                      </div>
                      <div style={{ flex: 1 }}>
                        <label style={{ fontSize: 12, fontWeight: 700, color: "#444", display: "block", marginBottom: 5 }}>UF *</label>
                        <input placeholder="SP" maxLength={2} value={regEstado} onChange={(e) => setRegEstado(e.target.value.toUpperCase())}
                          style={{ width: "100%", border: "1.5px solid #ddd", borderRadius: 10, padding: "11px 14px", fontSize: 14, outline: "none", boxSizing: "border-box" }}
                          onFocus={(e) => (e.target.style.borderColor = cor)} onBlur={(e) => (e.target.style.borderColor = "#ddd")} />
                      </div>
                    </div>
                  </div>
                )}
                <button type="button" onClick={handleIdentificar} disabled={loadingIdentificar} style={{ ...btnStyle, width: "100%", opacity: loadingIdentificar ? 0.7 : 1 }}>
                  {loadingIdentificar ? (precisaNome ? "Cadastrando..." : "Buscando...") : (precisaNome ? "Concluir Cadastro" : novoAg.servico_nome ? "Continuar Agendamento" : "Entrar")}
                  <ArrowRight style={{ width: 16, height: 16 }} />
                </button>
                <p style={{ margin: 0, fontSize: 12, color: "#999", textAlign: "center" }}>
                  Sem senha — identificamos você pelo celular.
                </p>
              </div>
            </div>
          </div>
          </>
        ) : (
          <div ref={agendarRef}>
            {/* Saudação */}
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
              <div style={{ width: 36, height: 36, borderRadius: "50%", background: cor + "20", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <User style={{ width: 18, height: 18, color: cor }} />
              </div>
              <div>
                <div style={{ fontWeight: 700, fontSize: 15, color: "#1a1a1a" }}>Olá, {cliente?.nome.split(" ")[0]}!</div>
                <div style={{ fontSize: 12, color: "#888" }}>Bem-vindo ao portal de agendamentos</div>
              </div>
            </div>

            {/* Tabs */}
            <div style={{ display: "flex", background: "#f0ede9", borderRadius: 14, padding: 4, marginBottom: 20, gap: 2, flexWrap: "wrap" }}>
              {([ ["agendamentos", "Meus Horários"], ["novo", "Agendar"], ["dados", "Meus Dados"] ] as [Aba, string][]).map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  className="portal-tab"
                  onClick={() => setAba(id)}
                  style={{
                    flex: 1, padding: "9px 8px", border: 0, borderRadius: 10, fontSize: 13,
                    fontWeight: aba === id ? 800 : 600, cursor: "pointer",
                    background: aba === id ? "#fff" : "transparent",
                    color: aba === id ? cor : "#777",
                    boxShadow: aba === id ? "0 1px 6px rgba(0,0,0,0.10)" : "none",
                    whiteSpace: "nowrap",
                  }}
                >
                  {label}
                </button>
              ))}
            </div>

            {/* ── ABA SERVIÇOS ── */}
            {aba === "servicos" && (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 12 }}>
                {servicos.length === 0 ? (
                  <div style={{ gridColumn: "1/-1", background: "#fff", borderRadius: 16, border: "1.5px solid #ece8e4", padding: "40px 24px", textAlign: "center", color: "#999" }}>
                    Nenhum serviço cadastrado ainda.
                  </div>
                ) : servicos.map((s) => (
                  <div key={s.id} className="srv-card portal-card"
                    style={{ background: "#fff", borderRadius: 16, padding: "18px 16px", border: "1.5px solid #ece8e4", cursor: "pointer", transition: "all 0.2s", boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}
                  >
                    <div style={{ fontWeight: 800, fontSize: 15, color: "#1a1a1a", marginBottom: 4 }}>{s.nome}</div>
                    <div style={{ fontSize: 13, color: "#888", marginBottom: 12 }}>{s.duracao_minutos} min</div>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <span style={{ fontWeight: 900, fontSize: 17, color: cor }}>{fmtBRL(s.valor)}</span>
                      <button type="button"
                        onClick={() => {
                          const hf = calcularHoraFim("09:00", s.duracao_minutos);
                          setNovoAg(f => ({ ...f, servico_id: s.id, servico_nome: s.nome, hora_inicio: "09:00", hora_fim: hf }));
                          setAba("novo");
                        }}
                        style={{ background: cor, color: "#fff", border: 0, borderRadius: 8, padding: "6px 14px", fontSize: 13, fontWeight: 700, cursor: "pointer" }}
                      >
                        Agendar
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* ── ABA AGENDAMENTOS ── */}
            {aba === "agendamentos" && (
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {loadingAgendamentos ? (
                  <div style={{ display: "flex", justifyContent: "center", padding: 40 }}>
                    <div style={{ width: 32, height: 32, borderRadius: "50%", border: `3px solid ${cor}`, borderTopColor: "transparent", animation: "spin 0.8s linear infinite" }} />
                  </div>
                ) : (
                  <>
                    {agendamentosFuturos.length === 0 && agendamentosPassados.length === 0 && (
                      <div style={{ background: "#fff", borderRadius: 16, border: "1.5px solid #ece8e4", padding: "40px 24px", textAlign: "center" }}>
                        <CalendarDays style={{ width: 40, height: 40, color: "#ccc", margin: "0 auto 12px" }} />
                        <div style={{ fontWeight: 700, color: "#555", marginBottom: 6 }}>Nenhum agendamento ainda</div>
                        <div style={{ fontSize: 13, color: "#999", marginBottom: 20 }}>Veja os serviços disponíveis e marque seu horário!</div>
                        <button type="button" onClick={() => setAba("novo")} style={{ ...btnStyle, padding: "11px 20px", fontSize: 14 }}>
                          Agendar agora <ChevronRight style={{ width: 15, height: 15 }} />
                        </button>
                      </div>
                    )}

                    {agendamentosFuturos.length > 0 && (
                      <>
                        <div style={{ fontSize: 12, fontWeight: 700, color: "#999", textTransform: "uppercase", letterSpacing: "0.08em" }}>Próximos</div>
                        {agendamentosFuturos.map((ag) => {
                          const sc = STATUS_COR[ag.status] || { bg: "#f5f5f5", color: "#555" };
                          return (
                            <div key={ag.id} className="portal-card" style={{ background: "#fff", borderRadius: 16, border: "1.5px solid #ece8e4", padding: "16px 18px", boxShadow: "0 2px 8px rgba(0,0,0,0.05)" }}>
                              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
                                <div style={{ flex: 1 }}>
                                  <div style={{ fontWeight: 800, fontSize: 15, color: "#1a1a1a", marginBottom: 6 }}>{ag.servico}</div>
                                  <div style={{ display: "flex", flexWrap: "wrap", gap: 10, fontSize: 13, color: "#666" }}>
                                    <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                                      <CalendarDays style={{ width: 13, height: 13 }} />
                                      {fmtData(ag.data)}
                                    </span>
                                    <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                                      <Clock style={{ width: 13, height: 13 }} />
                                      {ag.hora_inicio}{ag.hora_fim ? ` – ${ag.hora_fim}` : ""}
                                    </span>
                                    {ag.profissional_nome && (
                                      <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                                        <span style={{ fontSize: 12 }}>✂️</span>
                                        {ag.profissional_nome}
                                      </span>
                                    )}
                                  </div>
                                  {ag.observacoes && <div style={{ fontSize: 12, color: "#999", marginTop: 4 }}>{ag.observacoes}</div>}
                                  <span style={{ display: "inline-flex", marginTop: 8, alignItems: "center", background: sc.bg, color: sc.color, borderRadius: 20, padding: "3px 10px", fontSize: 12, fontWeight: 700 }}>
                                    {STATUS_LABEL[ag.status] || ag.status}
                                  </span>
                                </div>
                                {ag.status === "aguardando_sinal" && (
                                  <div style={{ display: "flex", flexDirection: "column", gap: 6, flexShrink: 0 }}>
                                    <button type="button" onClick={() => handlePagarSinal(ag)}
                                      style={{ background: "#fff7ed", border: "1.5px solid #fed7aa", color: "#c2410c", borderRadius: 8, padding: "6px 12px", fontWeight: 700, cursor: "pointer", fontSize: 12, display: "flex", alignItems: "center", gap: 4 }}>
                                      💳 Pagar sinal
                                    </button>
                                    <button type="button" onClick={() => setCancelandoId(ag.id)}
                                      style={{ background: "#fff1f2", border: "1px solid #fca5a5", color: "#b91c1c", borderRadius: 8, padding: "6px 12px", fontWeight: 700, cursor: "pointer", fontSize: 12, display: "flex", alignItems: "center", gap: 4 }}>
                                      <X style={{ width: 12, height: 12 }} /> Cancelar
                                    </button>
                                  </div>
                                )}
                                {ag.status === "agendado" && (
                                  <div style={{ display: "flex", flexDirection: "column", gap: 6, flexShrink: 0 }}>
                                    <button type="button" onClick={() => handleConfirmar(ag.id)} disabled={confirmandoId === ag.id}
                                      style={{ background: "#f0fdf4", border: "1px solid #86efac", color: "#15803d", borderRadius: 8, padding: "6px 12px", fontWeight: 700, cursor: "pointer", fontSize: 12, display: "flex", alignItems: "center", gap: 4, opacity: confirmandoId === ag.id ? 0.7 : 1 }}>
                                      <CheckCircle2 style={{ width: 12, height: 12 }} /> {confirmandoId === ag.id ? "..." : "Confirmar"}
                                    </button>
                                    <button type="button" onClick={() => { setReagForm({ data: ag.data, hora_inicio: ag.hora_inicio, hora_fim: ag.hora_fim || "10:00" }); setReagendando(ag); }}
                                      style={{ background: "#f5f3f1", border: "1px solid #e0dbd5", color: "#444", borderRadius: 8, padding: "6px 12px", fontWeight: 700, cursor: "pointer", fontSize: 12, display: "flex", alignItems: "center", gap: 4 }}>
                                      <Edit style={{ width: 12, height: 12 }} /> Reagendar
                                    </button>
                                    <button type="button" onClick={() => setCancelandoId(ag.id)}
                                      style={{ background: "#fff1f2", border: "1px solid #fca5a5", color: "#b91c1c", borderRadius: 8, padding: "6px 12px", fontWeight: 700, cursor: "pointer", fontSize: 12, display: "flex", alignItems: "center", gap: 4 }}>
                                      <X style={{ width: 12, height: 12 }} /> Cancelar
                                    </button>
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </>
                    )}

                    {agendamentosCreditados.length > 0 && (
                      <>
                        <div style={{ fontSize: 12, fontWeight: 700, color: "#c2410c", textTransform: "uppercase", letterSpacing: "0.08em", marginTop: 8 }}>💰 Crédito de Sinal Disponível</div>
                        {agendamentosCreditados.map((ag) => {
                          const expiraStr = (ag as any).sinal_expira_em as string | null;
                          const expiraFmt = expiraStr ? new Date(expiraStr.slice(0, 10) + "T12:00:00").toLocaleDateString("pt-BR") : null;
                          const sinalValor = (ag as any).sinal_valor ? Number((ag as any).sinal_valor) : null;
                          return (
                            <div key={ag.id} style={{ background: "#fff7ed", borderRadius: 16, border: "2px solid #fed7aa", padding: "16px 18px" }}>
                              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
                                <div style={{ flex: 1 }}>
                                  <div style={{ fontWeight: 800, fontSize: 15, color: "#1a1a1a", marginBottom: 4 }}>{ag.servico}</div>
                                  <div style={{ fontSize: 13, color: "#888", marginBottom: 8 }}>
                                    Cancelado — era em {new Date(ag.data.slice(0, 10) + "T12:00:00").toLocaleDateString("pt-BR")} às {ag.hora_inicio}
                                  </div>
                                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 8 }}>
                                    {sinalValor && (
                                      <span style={{ background: "#fef3c7", border: "1px solid #fde68a", color: "#92400e", borderRadius: 20, padding: "3px 10px", fontSize: 12, fontWeight: 700 }}>
                                        💰 Crédito: {sinalValor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                                      </span>
                                    )}
                                    {expiraFmt && (
                                      <span style={{ background: "#fff", border: "1px solid #fed7aa", color: "#c2410c", borderRadius: 20, padding: "3px 10px", fontSize: 12, fontWeight: 600 }}>
                                        ⏳ Válido até {expiraFmt}
                                      </span>
                                    )}
                                  </div>
                                  <p style={{ margin: 0, fontSize: 12, color: "#92400e" }}>
                                    Reagende antes do prazo e o sinal já pago será automaticamente aproveitado — sem cobrar novamente!
                                  </p>
                                </div>
                                <div style={{ flexShrink: 0 }}>
                                  <button type="button" onClick={() => { setReagForm({ data: new Date().toISOString().split("T")[0], hora_inicio: ag.hora_inicio, hora_fim: ag.hora_fim || "10:00" }); setReagendando(ag); }}
                                    style={{ background: cor, color: "#fff", border: "none", borderRadius: 10, padding: "8px 14px", fontWeight: 800, cursor: "pointer", fontSize: 13, display: "flex", alignItems: "center", gap: 5 }}>
                                    <Edit style={{ width: 13, height: 13 }} /> Reagendar
                                  </button>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </>
                    )}

                    {agendamentosPassados.length > 0 && (
                      <>
                        <div style={{ fontSize: 12, fontWeight: 700, color: "#999", textTransform: "uppercase", letterSpacing: "0.08em", marginTop: 8 }}>Histórico</div>
                        {agendamentosPassados.map((ag) => {
                          const sc = STATUS_COR[ag.status] || { bg: "#f5f5f5", color: "#555" };
                          const sinalExp = (ag as any).sinal_pago === "expirado";
                          return (
                            <div key={ag.id} style={{ background: "#fafaf9", borderRadius: 16, border: "1.5px solid #ece8e4", padding: "14px 18px", opacity: 0.75 }}>
                              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
                                <div>
                                  <div style={{ fontWeight: 700, fontSize: 14, color: "#1a1a1a" }}>{ag.servico}</div>
                                  <div style={{ fontSize: 13, color: "#888" }}>
                                    {new Date(ag.data.slice(0, 10) + "T12:00:00").toLocaleDateString("pt-BR")} às {ag.hora_inicio}
                                    {ag.profissional_nome && <span style={{ marginLeft: 6 }}>· ✂️ {ag.profissional_nome}</span>}
                                  </div>
                                  {sinalExp && (
                                    <div style={{ fontSize: 11, color: "#9ca3af", marginTop: 3 }}>
                                      ⚠️ Crédito de sinal expirado
                                    </div>
                                  )}
                                </div>
                                <span style={{ background: sc.bg, color: sc.color, borderRadius: 20, padding: "3px 10px", fontSize: 12, fontWeight: 700 }}>
                                  {STATUS_LABEL[ag.status]}
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </>
                    )}

                    <button type="button" onClick={() => setAba("novo")} style={{ ...btnOutlineStyle, alignSelf: "flex-start", marginTop: 4 }}>
                      <Star style={{ width: 14, height: 14 }} /> Novo agendamento
                    </button>
                  </>
                )}
              </div>
            )}

            {/* ── ABA NOVO AGENDAMENTO ── */}
            {aba === "novo" && (
              <div className="portal-card" style={{ background: "#fff", borderRadius: 20, border: "1.5px solid #ece8e4", overflow: "hidden", boxShadow: "0 4px 20px rgba(0,0,0,0.06)" }}>
                <div style={{ background: `linear-gradient(135deg, ${cor}, ${cor}cc)`, padding: "20px 24px", color: "#fff" }}>
                  <h2 style={{ margin: 0, fontSize: 18, fontWeight: 900 }}>Solicitar Agendamento</h2>
                  <p style={{ margin: "4px 0 0", fontSize: 13, opacity: 0.85 }}>Entraremos em contato para confirmar o horário</p>
                </div>
                <div style={{ padding: "24px", display: "flex", flexDirection: "column", gap: 18 }}>

                  {/* Serviço */}
                  <div>
                    <label style={{ fontSize: 13, fontWeight: 700, color: "#444", display: "block", marginBottom: 8 }}>Serviço *</label>
                    {servicos.length > 0 ? (
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 8 }}>
                        {servicos.map((s) => (
                          <button
                            key={s.id}
                            type="button"
                            onClick={() => {
                              const hf = calcularHoraFim(novoAg.hora_inicio, s.duracao_minutos);
                              setNovoAg(f => ({ ...f, servico_id: s.id, servico_nome: s.nome, hora_fim: hf }));
                            }}
                            style={{
                              border: novoAg.servico_id === s.id ? `2px solid ${cor}` : "1.5px solid #e0dbd5",
                              background: novoAg.servico_id === s.id ? cor + "10" : "#fafaf9",
                              borderRadius: 10, padding: "10px 12px", cursor: "pointer", textAlign: "left",
                            }}
                          >
                            <div style={{ fontWeight: 700, fontSize: 13, color: "#1a1a1a" }}>{s.nome}</div>
                            <div style={{ fontSize: 12, color: "#888" }}>{s.duracao_minutos} min · {fmtBRL(s.valor)}</div>
                            {novoAg.servico_id === s.id && <CheckCircle2 style={{ width: 14, height: 14, color: cor, marginTop: 4 }} />}
                          </button>
                        ))}
                      </div>
                    ) : (
                      <input
                        placeholder="Ex: Corte de cabelo, Coloração..."
                        value={novoAg.servico_nome}
                        onChange={(e) => setNovoAg(f => ({ ...f, servico_nome: e.target.value }))}
                        style={{ width: "100%", border: "1.5px solid #ddd", borderRadius: 10, padding: "12px 14px", fontSize: 15, outline: "none", boxSizing: "border-box" }}
                      />
                    )}
                  </div>

                  {/* Profissional (opcional) */}
                  {profissionais.length > 0 && (
                    <div>
                      <label style={{ fontSize: 13, fontWeight: 700, color: "#444", display: "block", marginBottom: 8 }}>
                        Profissional <span style={{ fontWeight: 400, color: "#94a3b8", fontSize: 12 }}>(opcional)</span>
                      </label>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                        <button
                          key={0}
                          type="button"
                          onClick={() => setNovoAg(f => ({ ...f, profissional_id: 0, profissional_nome: "" }))}
                          style={{
                            border: novoAg.profissional_id === 0 ? `2px solid ${cor}` : "1.5px solid #e0dbd5",
                            background: novoAg.profissional_id === 0 ? cor + "10" : "#fafaf9",
                            borderRadius: 10, padding: "8px 14px", cursor: "pointer",
                            fontSize: 13, fontWeight: 600, color: "#555",
                          }}
                        >
                          Sem preferência
                        </button>
                        {profissionais.map((p) => (
                          <button
                            key={p.id}
                            type="button"
                            onClick={() => setNovoAg(f => ({ ...f, profissional_id: p.id, profissional_nome: p.nome }))}
                            style={{
                              border: novoAg.profissional_id === p.id ? `2px solid ${cor}` : "1.5px solid #e0dbd5",
                              background: novoAg.profissional_id === p.id ? cor + "10" : "#fafaf9",
                              borderRadius: 10, padding: "8px 14px", cursor: "pointer", textAlign: "left",
                            }}
                          >
                            <div style={{ fontWeight: 700, fontSize: 13, color: "#1a1a1a" }}>{p.nome}</div>
                            {p.especialidade && <div style={{ fontSize: 11, color: "#888" }}>{p.especialidade}</div>}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Data */}
                  <div>
                    <label style={{ fontSize: 13, fontWeight: 700, color: "#444", display: "block", marginBottom: 6 }}>Data preferida *</label>
                    <input
                      type="date"
                      value={novoAg.data}
                      min={new Date().toISOString().split("T")[0]}
                      onChange={(e) => setNovoAg(f => ({ ...f, data: e.target.value }))}
                      style={{ width: "100%", border: "1.5px solid #ddd", borderRadius: 10, padding: "12px 14px", fontSize: 15, outline: "none", boxSizing: "border-box" }}
                      onFocus={(e) => (e.target.style.borderColor = cor)}
                      onBlur={(e) => (e.target.style.borderColor = "#ddd")}
                    />
                  </div>

                  {/* Slots disponíveis */}
                  {novoAg.servico_id > 0 && novoAg.data && (
                    <div>
                      <label style={{ fontSize: 13, fontWeight: 700, color: "#444", display: "block", marginBottom: 8 }}>
                        Horário disponível *
                        {novoAg.hora_inicio && slotsDisponiveis.includes(novoAg.hora_inicio) && (
                          <span style={{ marginLeft: 8, fontWeight: 400, fontSize: 11, color: "#15803d" }}>✓ {novoAg.hora_inicio} – {novoAg.hora_fim} selecionado</span>
                        )}
                      </label>
                      {loadingSlots ? (
                        <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "#999" }}>
                          <div style={{ width: 16, height: 16, borderRadius: "50%", border: `2px solid ${cor}`, borderTopColor: "transparent", animation: "spin 0.8s linear infinite" }} />
                          Verificando horários...
                        </div>
                      ) : slotsDisponiveis.length === 0 ? (
                        <div style={{ fontSize: 13, color: "#b91c1c", padding: "8px 12px", background: "#fff1f2", borderRadius: 8, border: "1px solid #fca5a5" }}>
                          Nenhum horário disponível nesta data. Escolha outra data.
                        </div>
                      ) : (
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                          {slotsDisponiveis.map((slot) => {
                            const svc = servicos.find(s => s.id === novoAg.servico_id);
                            const hf = svc ? calcularHoraFim(slot, svc.duracao_minutos) : "";
                            const selected = novoAg.hora_inicio === slot;
                            return (
                              <button
                                key={slot}
                                type="button"
                                onClick={() => setNovoAg(f => ({ ...f, hora_inicio: slot, hora_fim: hf }))}
                                style={{
                                  padding: "8px 14px",
                                  borderRadius: 10,
                                  fontSize: 13,
                                  fontWeight: 700,
                                  cursor: "pointer",
                                  border: selected ? `2px solid ${cor}` : "1.5px solid #ddd",
                                  background: selected ? cor : "#fff",
                                  color: selected ? "#fff" : "#333",
                                  transition: "all 0.15s",
                                }}
                              >
                                {slot}
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Horários manuais (quando nenhum serviço selecionado) */}
                  {novoAg.servico_id === 0 && (
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                    <div>
                      <label style={{ fontSize: 13, fontWeight: 700, color: "#444", display: "block", marginBottom: 6 }}>Horário início</label>
                      <input
                        type="time"
                        value={novoAg.hora_inicio}
                        onChange={(e) => {
                          const svc = servicos.find(s => s.id === novoAg.servico_id);
                          const hf = svc ? calcularHoraFim(e.target.value, svc.duracao_minutos) : novoAg.hora_fim;
                          setNovoAg(f => ({ ...f, hora_inicio: e.target.value, hora_fim: hf }));
                        }}
                        style={{ width: "100%", border: "1.5px solid #ddd", borderRadius: 10, padding: "12px 14px", fontSize: 15, outline: "none", boxSizing: "border-box" }}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: 13, fontWeight: 700, color: "#444", display: "block", marginBottom: 6 }}>
                        Horário fim {novoAg.servico_id > 0 && <span style={{ fontWeight: 400, fontSize: 11, color: "#999" }}>(calculado automaticamente)</span>}
                      </label>
                      <input
                        type="time"
                        value={novoAg.hora_fim}
                        readOnly={novoAg.servico_id > 0}
                        onChange={(e) => novoAg.servico_id === 0 && setNovoAg(f => ({ ...f, hora_fim: e.target.value }))}
                        style={{ width: "100%", border: "1.5px solid #ddd", borderRadius: 10, padding: "12px 14px", fontSize: 15, outline: "none", boxSizing: "border-box", background: novoAg.servico_id > 0 ? "#f5f5f5" : "#fff", color: novoAg.servico_id > 0 ? "#999" : "#111", cursor: novoAg.servico_id > 0 ? "not-allowed" : "auto" }}
                      />
                    </div>
                  </div>
                  )}

                  {/* Observações */}
                  <div>
                    <label style={{ fontSize: 13, fontWeight: 700, color: "#444", display: "block", marginBottom: 6 }}>Observações</label>
                    <textarea
                      placeholder="Preferências, alergias, etc."
                      value={novoAg.observacoes}
                      onChange={(e) => setNovoAg(f => ({ ...f, observacoes: e.target.value }))}
                      rows={2}
                      style={{ width: "100%", border: "1.5px solid #ddd", borderRadius: 10, padding: "12px 14px", fontSize: 14, outline: "none", boxSizing: "border-box", resize: "none", fontFamily: "inherit" }}
                    />
                  </div>

                  {/* Resumo */}
                  {novoAg.servico_nome && (
                    <div style={{ background: cor + "0f", border: `1px solid ${cor}30`, borderRadius: 12, padding: "14px 16px", fontSize: 14 }}>
                      <div style={{ fontWeight: 700, color: "#1a1a1a", marginBottom: 4 }}>Resumo do pedido</div>
                      <div style={{ color: "#555" }}>
                        <strong>{novoAg.servico_nome}</strong> — {new Date(novoAg.data + "T12:00:00").toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long" })} às {novoAg.hora_inicio}
                      </div>
                    </div>
                  )}

                  {/* Aviso de sinal quando serviço selecionado tem preço */}
                  {(() => {
                    const pct = empresa ? (empresa as any).percentual_sinal : null;
                    const svcSel = servicos.find(s => s.id === novoAg.servico_id);
                    if (!pct || pct <= 0 || !svcSel?.valor || Number(svcSel.valor) <= 0) return null;
                    const valorSinal = Math.round(Number(svcSel.valor) * pct / 100 * 100) / 100;
                    return (
                      <div style={{ background: "#fff7ed", border: "1.5px solid #fed7aa", borderRadius: 12, padding: "14px 16px", fontSize: 13 }}>
                        <div style={{ fontWeight: 800, color: "#92400e", marginBottom: 6, display: "flex", alignItems: "center", gap: 6 }}>
                          💰 Sinal obrigatório para confirmar
                        </div>
                        <div style={{ color: "#92400e", lineHeight: 1.5 }}>
                          Este agendamento exige o pagamento de um sinal de{" "}
                          <strong>{valorSinal.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</strong>{" "}
                          ({pct}% do serviço). O pagamento será solicitado após a confirmação.
                        </div>
                        <div style={{ marginTop: 8, fontSize: 12, color: "#b45309" }}>
                          ⚠️ Em caso de cancelamento, o valor não é reembolsado — mas fica disponível como crédito por 30 dias para reagendar.
                        </div>
                      </div>
                    );
                  })()}

                  <button type="button" onClick={handleClickConfirmarAgendamento} disabled={salvandoAg} style={{ ...btnStyle, opacity: salvandoAg ? 0.7 : 1 }}>
                    {salvandoAg ? "Enviando..." : "Confirmar Agendamento"}
                    <CheckCircle2 style={{ width: 16, height: 16 }} />
                  </button>
                </div>
              </div>
            )}

            {/* ── ABA MEUS DADOS ── */}
            {aba === "dados" && (
              <div className="portal-card" style={{ background: "#fff", borderRadius: 20, border: "1.5px solid #ece8e4", overflow: "hidden", boxShadow: "0 4px 20px rgba(0,0,0,0.06)" }}>
                <div style={{ borderBottom: "1px solid #f0ede9", padding: "18px 24px" }}>
                  <h2 style={{ margin: 0, fontSize: 17, fontWeight: 800, color: "#1a1a1a" }}>Meus Dados</h2>
                </div>
                {/* Pontos de fidelidade */}
                {(empresa as any)?.pontos_por_real > 0 && (
                  <div style={{ margin: "16px 24px 0", background: "#fefce8", border: "1.5px solid #fde047", borderRadius: 14, padding: "14px 18px", display: "flex", alignItems: "center", gap: 14 }}>
                    <span style={{ fontSize: 28 }}>⭐</span>
                    <div>
                      <div style={{ fontWeight: 800, fontSize: 16, color: "#854d0e" }}>
                        {(cliente as any)?.pontos ?? 0} pontos acumulados
                      </div>
                      <div style={{ fontSize: 12, color: "#a16207", marginTop: 2 }}>
                        A cada {(empresa as any).pontos_para_desconto} pontos você ganha R${Number((empresa as any).pontos_valor_desconto).toFixed(2)} de desconto.
                        {(cliente as any)?.pontos >= (empresa as any).pontos_para_desconto && (
                          <span style={{ marginLeft: 6, fontWeight: 700, color: "#15803d" }}>🎉 Você já pode resgatar um desconto! Fale com a gente.</span>
                        )}
                      </div>
                    </div>
                  </div>
                )}
                <div style={{ padding: "24px", display: "flex", flexDirection: "column", gap: 16 }}>
                  {[
                    { label: "Nome completo", key: "nome", type: "text", placeholder: "Seu nome" },
                    { label: "E-mail", key: "email", type: "email", placeholder: "seu@email.com" },
                    { label: "Data de nascimento", key: "data_nascimento", type: "date", placeholder: "" },
                    { label: "Endereço", key: "endereco", type: "text", placeholder: "Rua, número, bairro" },
                  ].map(({ label, key, type, placeholder }) => (
                    <div key={key}>
                      <label style={{ fontSize: 13, fontWeight: 700, color: "#444", display: "block", marginBottom: 6 }}>{label}</label>
                      <input
                        type={type}
                        placeholder={placeholder}
                        value={(perfil as any)[key]}
                        onChange={(e) => setPerfil(p => ({ ...p, [key]: e.target.value }))}
                        style={{ width: "100%", border: "1.5px solid #ddd", borderRadius: 10, padding: "12px 14px", fontSize: 14, outline: "none", boxSizing: "border-box" }}
                        onFocus={(e) => (e.target.style.borderColor = cor)}
                        onBlur={(e) => (e.target.style.borderColor = "#ddd")}
                      />
                    </div>
                  ))}
                  <button type="button" onClick={handleSalvarPerfil} disabled={salvandoPerfil} style={{ ...btnStyle, opacity: salvandoPerfil ? 0.7 : 1 }}>
                    {salvandoPerfil ? "Salvando..." : "Salvar Dados"}
                  </button>
                </div>
              </div>
            )}

            {/* ── ABA SINAL (PAGAMENTO) ── */}
            {aba === "sinal" && sinalPendente && (
              <div style={{ display: "flex", flexDirection: "column", gap: 20, alignItems: "center" }}>
                <div style={{ background: "#fff", borderRadius: 20, border: "1.5px solid #ece8e4", overflow: "hidden", boxShadow: "0 4px 20px rgba(0,0,0,0.06)", width: "100%", maxWidth: 440 }}>
                  <div style={{ background: cor, padding: "20px 24px", textAlign: "center" }}>
                    <div style={{ fontSize: 32 }}>🔐</div>
                    <h2 style={{ margin: "8px 0 4px", fontSize: 18, fontWeight: 800, color: "#fff" }}>Garanta seu horário</h2>
                    <p style={{ margin: 0, fontSize: 13, color: "rgba(255,255,255,0.85)" }}>Pague o sinal para confirmar o agendamento</p>
                  </div>
                  <div style={{ padding: "24px", display: "flex", flexDirection: "column", gap: 20 }}>
                    <div style={{ textAlign: "center" }}>
                      <span style={{ fontSize: 13, color: "#777" }}>Valor do sinal</span>
                      <div style={{ fontSize: 34, fontWeight: 900, color: cor }}>
                        {sinalPendente.valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                      </div>
                      {sinalPendente.percentual && (
                        <span style={{ fontSize: 12, color: "#999" }}>
                          {sinalPendente.percentual}% do valor do serviço
                        </span>
                      )}
                    </div>

                    {sinalPendente.qr_code_base64 ? (
                      <div style={{ textAlign: "center" }}>
                        <img
                          src={`data:image/png;base64,${sinalPendente.qr_code_base64}`}
                          alt="QR Code PIX"
                          style={{ width: 180, height: 180, borderRadius: 12, border: "2px solid #eee", display: "inline-block" }}
                        />
                        <p style={{ fontSize: 12, color: "#999", marginTop: 8 }}>Escaneie com seu banco</p>
                      </div>
                    ) : null}

                    {sinalPendente.qr_code && (
                      <div>
                        <p style={{ fontSize: 13, fontWeight: 700, color: "#444", marginBottom: 6 }}>
                          {sinalPendente.qr_code_base64 ? "Ou copie o código PIX:" : "Código PIX copia-e-cola:"}
                        </p>
                        <div style={{ display: "flex", gap: 8, alignItems: "stretch" }}>
                          <div style={{ flex: 1, background: "#f5f5f5", borderRadius: 10, padding: "10px 12px", fontSize: 11, fontFamily: "monospace", wordBreak: "break-all", color: "#555", border: "1px solid #e0e0e0" }}>
                            {sinalPendente.qr_code}
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              navigator.clipboard.writeText(sinalPendente.qr_code!);
                              setSinalPendente(s => s ? { ...s, copiado: true } : null);
                              setTimeout(() => setSinalPendente(s => s ? { ...s, copiado: false } : null), 2500);
                            }}
                            style={{ background: sinalPendente.copiado ? "#22c55e" : cor, color: "#fff", border: "none", borderRadius: 10, padding: "0 14px", fontWeight: 700, fontSize: 13, cursor: "pointer", whiteSpace: "nowrap", transition: "background 0.2s" }}
                          >
                            {sinalPendente.copiado ? "✓ Copiado!" : "Copiar"}
                          </button>
                        </div>
                      </div>
                    )}

                    {!sinalPendente.qr_code && sinalPendente.chave_pix && (
                      <div style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 12, padding: "16px" }}>
                        <p style={{ margin: "0 0 8px", fontSize: 13, fontWeight: 700, color: "#15803d" }}>Chave PIX para pagamento:</p>
                        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                          <div style={{ flex: 1, background: "#fff", borderRadius: 8, padding: "10px 12px", fontSize: 14, fontWeight: 600, color: "#1a1a1a", border: "1px solid #d1fae5", wordBreak: "break-all" }}>
                            {sinalPendente.chave_pix}
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              navigator.clipboard.writeText(sinalPendente.chave_pix!);
                              setSinalPendente(s => s ? { ...s, copiado: true } : null);
                              setTimeout(() => setSinalPendente(s => s ? { ...s, copiado: false } : null), 2500);
                            }}
                            style={{ background: sinalPendente.copiado ? "#22c55e" : "#15803d", color: "#fff", border: "none", borderRadius: 8, padding: "10px 14px", fontWeight: 700, fontSize: 13, cursor: "pointer" }}
                          >
                            {sinalPendente.copiado ? "✓" : "Copiar"}
                          </button>
                        </div>
                        <p style={{ margin: "10px 0 0", fontSize: 12, color: "#666" }}>
                          Envie o valor de <strong>{sinalPendente.valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</strong> para esta chave.
                          Após o pagamento, envie o comprovante pelo WhatsApp para confirmarmos.
                        </p>
                      </div>
                    )}

                    <div style={{ display: "flex", alignItems: "center", gap: 10, background: "#fffbeb", border: "1px solid #fde68a", borderRadius: 10, padding: "12px 14px" }}>
                      <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#f59e0b", animation: "pulse 1.5s infinite", flexShrink: 0 }} />
                      <span style={{ fontSize: 12, color: "#92400e", fontWeight: 600 }}>
                        Aguardando pagamento… o agendamento será confirmado automaticamente após a confirmação do PIX.
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => { setSinalPendente(null); setAba("agendamentos"); carregarAgendamentos(); }}
                      style={{ background: "transparent", border: "1.5px solid #ddd", borderRadius: 12, padding: "11px 20px", fontWeight: 700, cursor: "pointer", fontSize: 14, color: "#666" }}
                    >
                      Pagar depois (agendamento fica pendente)
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── RODAPÉ ── */}
      <footer style={{ borderTop: "1px solid #ece8e4", padding: "16px 20px", textAlign: "center", background: "#fff" }}>
        <span style={{ fontSize: 12, color: "#bbb" }}>Powered by <strong style={{ color: "#888" }}>VendlySys</strong></span>
      </footer>

      {/* ── DIALOG REAGENDAR ── */}
      <Dialog open={!!reagendando} onOpenChange={(o) => !o && setReagendando(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Reagendar</DialogTitle></DialogHeader>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div>
              <label style={{ fontSize: 13, fontWeight: 700, marginBottom: 6, display: "block" }}>Nova data</label>
              <input type="date" value={reagForm.data} min={new Date().toISOString().split("T")[0]} onChange={(e) => setReagForm(f => ({ ...f, data: e.target.value }))}
                style={{ width: "100%", border: "1.5px solid #ddd", borderRadius: 8, padding: "10px 12px", fontSize: 14, outline: "none", boxSizing: "border-box" }} />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <div>
                <label style={{ fontSize: 13, fontWeight: 700, marginBottom: 6, display: "block" }}>Início</label>
                <input type="time" value={reagForm.hora_inicio} onChange={(e) => setReagForm(f => ({ ...f, hora_inicio: e.target.value }))}
                  style={{ width: "100%", border: "1.5px solid #ddd", borderRadius: 8, padding: "10px 12px", fontSize: 14, outline: "none", boxSizing: "border-box" }} />
              </div>
              <div>
                <label style={{ fontSize: 13, fontWeight: 700, marginBottom: 6, display: "block" }}>Fim</label>
                <input type="time" value={reagForm.hora_fim} onChange={(e) => setReagForm(f => ({ ...f, hora_fim: e.target.value }))}
                  style={{ width: "100%", border: "1.5px solid #ddd", borderRadius: 8, padding: "10px 12px", fontSize: 14, outline: "none", boxSizing: "border-box" }} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <button type="button" onClick={() => setReagendando(null)} style={{ background: "#f5f3f1", border: 0, borderRadius: 8, padding: "10px 16px", fontWeight: 600, cursor: "pointer" }}>Cancelar</button>
            <button type="button" onClick={handleReagendar} disabled={salvandoReag} style={{ ...btnStyle, padding: "10px 20px", fontSize: 14, opacity: salvandoReag ? 0.7 : 1 }}>
              {salvandoReag ? "Salvando..." : "Confirmar"}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── MODAL TERMOS DO SINAL ── */}
      {mostrandoTermosSinal && (() => {
        const pct = empresa ? (empresa as any).percentual_sinal : 0;
        const svcSel = servicos.find(s => s.id === novoAg.servico_id);
        const valorSvc = svcSel?.valor ? Number(svcSel.valor) : 0;
        const valorSinal = Math.round(valorSvc * pct / 100 * 100) / 100;
        return (
          <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
            <div style={{ background: "#fff", borderRadius: 20, maxWidth: 460, width: "100%", overflow: "hidden", boxShadow: "0 20px 60px rgba(0,0,0,0.25)" }}>
              {/* Header */}
              <div style={{ background: "linear-gradient(135deg, #c2410c, #ea580c)", padding: "20px 24px" }}>
                <div style={{ fontSize: 28, marginBottom: 6 }}>📋</div>
                <div style={{ fontWeight: 900, fontSize: 18, color: "#fff" }}>Política de Sinal</div>
                <div style={{ fontSize: 13, color: "rgba(255,255,255,0.85)", marginTop: 2 }}>Leia com atenção antes de confirmar</div>
              </div>

              {/* Corpo */}
              <div style={{ padding: "20px 24px", display: "flex", flexDirection: "column", gap: 16 }}>

                {/* Valor do sinal */}
                <div style={{ background: "#fff7ed", border: "1.5px solid #fed7aa", borderRadius: 12, padding: "14px 16px" }}>
                  <div style={{ fontWeight: 800, color: "#92400e", fontSize: 14, marginBottom: 4 }}>💰 Sinal de confirmação</div>
                  <div style={{ fontSize: 24, fontWeight: 900, color: "#c2410c" }}>
                    {valorSinal.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                  </div>
                  <div style={{ fontSize: 12, color: "#b45309", marginTop: 2 }}>
                    {pct}% do valor do serviço ({svcSel?.nome} — {valorSvc.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })})
                  </div>
                </div>

                {/* Regras */}
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  <div style={{ fontWeight: 700, fontSize: 13, color: "#333" }}>Ao confirmar, você concorda com as seguintes condições:</div>

                  <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                    <span style={{ background: "#dcfce7", borderRadius: "50%", width: 22, height: 22, minWidth: 22, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, marginTop: 1 }}>✓</span>
                    <span style={{ fontSize: 13, color: "#444", lineHeight: 1.5 }}>
                      O sinal deve ser pago via PIX imediatamente após a confirmação. Sem o pagamento, o agendamento não é garantido.
                    </span>
                  </div>

                  <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                    <span style={{ background: "#fef9c3", borderRadius: "50%", width: 22, height: 22, minWidth: 22, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, marginTop: 1 }}>⚠</span>
                    <span style={{ fontSize: 13, color: "#444", lineHeight: 1.5 }}>
                      <strong>O sinal não é reembolsável</strong> em caso de cancelamento. Se cancelar, o valor ficará disponível como crédito.
                    </span>
                  </div>

                  <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                    <span style={{ background: "#eff6ff", borderRadius: "50%", width: 22, height: 22, minWidth: 22, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, marginTop: 1 }}>📅</span>
                    <span style={{ fontSize: 13, color: "#444", lineHeight: 1.5 }}>
                      Após cancelar, você tem <strong>30 dias</strong> para reagendar e aproveitar o crédito do sinal pago — sem pagar novamente.
                    </span>
                  </div>

                  <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                    <span style={{ background: "#fee2e2", borderRadius: "50%", width: 22, height: 22, minWidth: 22, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, marginTop: 1 }}>✕</span>
                    <span style={{ fontSize: 13, color: "#444", lineHeight: 1.5 }}>
                      Se não reagendar dentro de 30 dias, o crédito <strong>expira definitivamente</strong> e o sinal é perdido.
                    </span>
                  </div>
                </div>

                {/* Checkbox de aceite */}
                <label style={{ display: "flex", gap: 10, alignItems: "flex-start", cursor: "pointer", padding: "12px 14px", background: termosSinalAceitos ? "#f0fdf4" : "#fafaf9", border: `1.5px solid ${termosSinalAceitos ? "#86efac" : "#e5e7eb"}`, borderRadius: 10, transition: "all 0.15s" }}>
                  <input
                    type="checkbox"
                    checked={termosSinalAceitos}
                    onChange={(e) => setTermosSinalAceitos(e.target.checked)}
                    style={{ marginTop: 2, width: 16, height: 16, cursor: "pointer", accentColor: "#15803d" }}
                  />
                  <span style={{ fontSize: 13, color: "#333", lineHeight: 1.5 }}>
                    Eu li e compreendo a política de sinal. Estou ciente de que o sinal não é reembolsável e que tenho 30 dias para reagendar após um cancelamento.
                  </span>
                </label>

                {/* Botões */}
                <div style={{ display: "flex", gap: 10 }}>
                  <button type="button" onClick={() => setMostrandoTermosSinal(false)}
                    style={{ flex: 1, border: "1.5px solid #e5e7eb", background: "#fff", borderRadius: 10, padding: "12px", fontWeight: 700, fontSize: 14, cursor: "pointer", color: "#555" }}>
                    Voltar
                  </button>
                  <button type="button" onClick={() => { if (termosSinalAceitos) handleNovoAgendamento(); }} disabled={!termosSinalAceitos || salvandoAg}
                    style={{ flex: 2, background: termosSinalAceitos ? cor : "#ccc", color: "#fff", border: "none", borderRadius: 10, padding: "12px", fontWeight: 800, fontSize: 14, cursor: termosSinalAceitos ? "pointer" : "not-allowed", transition: "background 0.2s", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
                    {salvandoAg ? "Enviando..." : "Aceitar e Confirmar"}
                    {!salvandoAg && <CheckCircle2 style={{ width: 16, height: 16 }} />}
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ── POPUP COMPLETAR CADASTRO ── */}
      {completarAberto && token && (
        <div style={{ position: "fixed", inset: 0, zIndex: 9999, background: "rgba(0,0,0,0.55)", display: "flex", alignItems: "flex-end", justifyContent: "center" }}>
          <div style={{ background: "#fff", borderRadius: "20px 20px 0 0", width: "100%", maxWidth: 560, maxHeight: "92vh", overflowY: "auto", padding: "28px 24px 36px", boxShadow: "0 -8px 40px rgba(0,0,0,0.18)" }}>
            {/* Handle bar */}
            <div style={{ width: 44, height: 5, background: "#e5e7eb", borderRadius: 99, margin: "0 auto 20px" }} />

            <div style={{ textAlign: "center", marginBottom: 20 }}>
              <div style={{ width: 52, height: 52, borderRadius: "50%", background: cor + "18", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 12px", fontSize: 24 }}>🎁</div>
              <div style={{ fontWeight: 900, fontSize: 20, color: "#111827", marginBottom: 6 }}>Complete seu cadastro</div>
              <div style={{ fontSize: 13, color: "#6b7280", lineHeight: 1.5, maxWidth: 380, margin: "0 auto" }}>
                Seus dados são privados e não são compartilhados com terceiros. Usamos apenas para oferecer <strong>descontos, promoções exclusivas e brindes</strong> especiais para você.
              </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {/* E-mail */}
              <div>
                <label style={{ display: "block", fontSize: 13, fontWeight: 700, color: "#374151", marginBottom: 5 }}>E-mail *</label>
                <input type="email" placeholder="seu@email.com" value={compEmail} onChange={e => setCompEmail(e.target.value)}
                  style={{ width: "100%", border: "1.5px solid #d1d5db", borderRadius: 10, padding: "12px 14px", fontSize: 14, outline: "none", boxSizing: "border-box" }} />
              </div>

              {/* Data de nascimento */}
              <div>
                <label style={{ display: "block", fontSize: 13, fontWeight: 700, color: "#374151", marginBottom: 5 }}>Data de nascimento *</label>
                <input type="date" value={compDataNasc} onChange={e => setCompDataNasc(e.target.value)}
                  style={{ width: "100%", border: "1.5px solid #d1d5db", borderRadius: 10, padding: "12px 14px", fontSize: 14, outline: "none", boxSizing: "border-box" }} />
              </div>

              {/* CEP */}
              <div>
                <label style={{ display: "block", fontSize: 13, fontWeight: 700, color: "#374151", marginBottom: 5 }}>
                  CEP * {compLoadingCep && <span style={{ fontWeight: 400, color: "#9ca3af" }}>Buscando...</span>}
                </label>
                <input type="text" inputMode="numeric" maxLength={9} placeholder="00000-000" value={compCep}
                  onChange={e => handleCompletarCep(e.target.value)}
                  style={{ width: "100%", border: "1.5px solid #d1d5db", borderRadius: 10, padding: "12px 14px", fontSize: 14, outline: "none", boxSizing: "border-box" }} />
              </div>

              {/* Logradouro + Número */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 100px", gap: 10 }}>
                <div>
                  <label style={{ display: "block", fontSize: 13, fontWeight: 700, color: "#374151", marginBottom: 5 }}>Logradouro *</label>
                  <input type="text" placeholder="Rua, Avenida..." value={compLogradouro} onChange={e => setCompLogradouro(e.target.value)}
                    style={{ width: "100%", border: "1.5px solid #d1d5db", borderRadius: 10, padding: "12px 14px", fontSize: 14, outline: "none", boxSizing: "border-box" }} />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: 13, fontWeight: 700, color: "#374151", marginBottom: 5 }}>Número *</label>
                  <input type="text" placeholder="123" value={compNumero} onChange={e => setCompNumero(e.target.value)}
                    style={{ width: "100%", border: "1.5px solid #d1d5db", borderRadius: 10, padding: "12px 14px", fontSize: 14, outline: "none", boxSizing: "border-box" }} />
                </div>
              </div>

              {/* Complemento */}
              <div>
                <label style={{ display: "block", fontSize: 13, fontWeight: 700, color: "#374151", marginBottom: 5 }}>Complemento <span style={{ fontWeight: 400, color: "#9ca3af" }}>(opcional)</span></label>
                <input type="text" placeholder="Apto, bloco..." value={compComplemento} onChange={e => setCompComplemento(e.target.value)}
                  style={{ width: "100%", border: "1.5px solid #d1d5db", borderRadius: 10, padding: "12px 14px", fontSize: 14, outline: "none", boxSizing: "border-box" }} />
              </div>

              {/* Bairro */}
              <div>
                <label style={{ display: "block", fontSize: 13, fontWeight: 700, color: "#374151", marginBottom: 5 }}>Bairro *</label>
                <input type="text" value={compBairro} onChange={e => setCompBairro(e.target.value)}
                  style={{ width: "100%", border: "1.5px solid #d1d5db", borderRadius: 10, padding: "12px 14px", fontSize: 14, outline: "none", boxSizing: "border-box" }} />
              </div>

              {/* Cidade + UF */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 80px", gap: 10 }}>
                <div>
                  <label style={{ display: "block", fontSize: 13, fontWeight: 700, color: "#374151", marginBottom: 5 }}>Cidade *</label>
                  <input type="text" value={compCidade} onChange={e => setCompCidade(e.target.value)}
                    style={{ width: "100%", border: "1.5px solid #d1d5db", borderRadius: 10, padding: "12px 14px", fontSize: 14, outline: "none", boxSizing: "border-box" }} />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: 13, fontWeight: 700, color: "#374151", marginBottom: 5 }}>UF *</label>
                  <input type="text" maxLength={2} placeholder="SP" value={compEstado} onChange={e => setCompEstado(e.target.value.toUpperCase())}
                    style={{ width: "100%", border: "1.5px solid #d1d5db", borderRadius: 10, padding: "12px 14px", fontSize: 14, outline: "none", boxSizing: "border-box", textTransform: "uppercase" }} />
                </div>
              </div>

              {/* Botões */}
              <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 4 }}>
                <button type="button" onClick={handleSalvarCompletar} disabled={salvandoCompleto}
                  style={{ background: cor, color: "#fff", border: 0, borderRadius: 12, padding: "14px", fontWeight: 800, fontSize: 15, cursor: salvandoCompleto ? "not-allowed" : "pointer", opacity: salvandoCompleto ? 0.7 : 1 }}>
                  {salvandoCompleto ? "Salvando..." : "Salvar dados"}
                </button>
                <button type="button" onClick={() => setCompletarAberto(false)}
                  style={{ background: "transparent", border: 0, color: "#9ca3af", fontSize: 13, cursor: "pointer", padding: "8px" }}>
                  Preencher depois
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── ALERT CANCELAR ── */}
      <AlertDialog open={!!cancelandoId} onOpenChange={(o) => !o && setCancelandoId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancelar agendamento?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. Caso o sinal já tenha sido pago, o valor ficará como crédito por 30 dias para você reagendar — sem novo pagamento.
              Após 30 dias, o crédito expira e o sinal não é reembolsado.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Manter</AlertDialogCancel>
            <AlertDialogAction onClick={handleCancelar} style={{ background: "#dc2626" }}>Cancelar agendamento</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
