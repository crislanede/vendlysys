import { useState } from "react";
import { Layout } from "@/components/layout";
import {
  useListAgendamentos,
  useCreateAgendamento,
  useUpdateAgendamento,
  useDeleteAgendamento,
  useListClientes,
  getListAgendamentosQueryKey,
  getListClientesQueryKey,
} from "@workspace/api-client-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Pencil, Trash2, Clock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { useCep, formatarCep, enderecoVazio, type EnderecoForm } from "@/hooks/use-cep";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");
function getToken() { return localStorage.getItem("vendlysys_token"); }
async function apiFetch(path: string, options: RequestInit = {}) {
  const token = getToken();
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  const res = await fetch(`${BASE}${path}`, { ...options, headers });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Erro" }));
    throw new Error(err.error || "Erro na requisição");
  }
  return res.json();
}

interface Servico { id: number; nome: string; valor: number; duracao_minutos: number; ativo: boolean; }

const STATUS_LABELS: Record<string, string> = {
  agendado: "Agendado",
  confirmado: "Confirmado",
  concluido: "Concluído",
  cancelado: "Cancelado",
};

const STATUS_CORES: Record<string, string> = {
  agendado: "bg-blue-100 text-blue-800",
  confirmado: "bg-purple-100 text-purple-800",
  concluido: "bg-green-100 text-green-800",
  cancelado: "bg-red-100 text-red-800",
};

interface AgForm {
  cliente_id: string;
  profissional_id: string;
  servico: string;
  data: string;
  hora_inicio: string;
  hora_fim: string;
  valor: string;
  status: string;
  observacoes: string;
}

const formVazio: AgForm = {
  cliente_id: "",
  profissional_id: "",
  servico: "",
  data: new Date().toISOString().split("T")[0],
  hora_inicio: "09:00",
  hora_fim: "10:00",
  valor: "",
  status: "agendado",
  observacoes: "",
};

export default function Agenda() {
  const { usuario, empresa } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const hoje = new Date().toISOString().split("T")[0];
  const [dateFrom, setDateFrom] = useState(hoje);
  const [dateTo, setDateTo] = useState(hoje);
  const [filtroStatus, setFiltroStatus] = useState("todos");
  const [busca, setBusca] = useState("");
  const [modalAberto, setModalAberto] = useState(false);
  const [editandoId, setEditandoId] = useState<number | null>(null);
  const [excluindoId, setExcluindoId] = useState<number | null>(null);
  const [form, setForm] = useState<AgForm>(formVazio);

  // Novo cliente inline
  const [novoClienteAberto, setNovoClienteAberto] = useState(false);
  const [novoClienteForm, setNovoClienteForm] = useState({
    nome: "", telefone: "", email: "", data_nascimento: "", endereco: { ...enderecoVazio },
  });
  const [salvandoCliente, setSalvandoCliente] = useState(false);
  const { buscarCep, buscandoCep, erroCep, setErroCep } = useCep();

  const queryKey = getListAgendamentosQueryKey({ data_inicio: dateFrom, data_fim: dateTo });

  const { data: agendamentos, isLoading } = useListAgendamentos(
    { data_inicio: dateFrom, data_fim: dateTo },
    { query: { enabled: true, queryKey } }
  );

  const { data: clientes } = useListClientes(
    {},
    { query: { queryKey: getListClientesQueryKey({}) } }
  );

  const { data: servicos = [] } = useQuery<Servico[]>({
    queryKey: ["servicos"],
    queryFn: () => apiFetch("/api/servicos?ativo=true"),
  });

  const { data: profissionais = [] } = useQuery<{ id: number; nome: string; ativo: boolean }[]>({
    queryKey: ["profissionais"],
    queryFn: () => apiFetch("/api/profissionais"),
  });

  const criarMutation = useCreateAgendamento({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListAgendamentosQueryKey({}) });
        setModalAberto(false);
        toast({ title: "Agendamento criado." });
      },
      onError: () => {
        toast({ title: "Erro ao criar agendamento.", variant: "destructive" });
      },
    },
  });

  const atualizarMutation = useUpdateAgendamento({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListAgendamentosQueryKey({}) });
        setModalAberto(false);
        setEditandoId(null);
        toast({ title: "Agendamento atualizado." });
      },
      onError: () => {
        toast({ title: "Erro ao atualizar agendamento.", variant: "destructive" });
      },
    },
  });

  const excluirMutation = useDeleteAgendamento({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListAgendamentosQueryKey({}) });
        setExcluindoId(null);
        toast({ title: "Agendamento removido." });
      },
      onError: () => {
        toast({ title: "Erro ao remover agendamento.", variant: "destructive" });
      },
    },
  });

  function calcularHoraFim(horaInicio: string, duracaoMin: number): string {
    const [h, m] = horaInicio.split(":").map(Number);
    const totalMin = h * 60 + m + duracaoMin;
    const hFim = Math.floor(totalMin / 60) % 24;
    const mFim = totalMin % 60;
    return `${String(hFim).padStart(2, "0")}:${String(mFim).padStart(2, "0")}`;
  }

  function handleSelecionarServico(nome: string) {
    const s = servicos.find((s) => s.nome === nome);
    if (s) {
      const horaFim = calcularHoraFim(form.hora_inicio, s.duracao_minutos);
      setForm((f) => ({ ...f, servico: s.nome, valor: String(s.valor), hora_fim: horaFim }));
    } else {
      setForm((f) => ({ ...f, servico: nome }));
    }
  }

  function setNovoEnd(partial: Partial<EnderecoForm>) {
    setNovoClienteForm((f) => ({ ...f, endereco: { ...f.endereco, ...partial } }));
  }

  function handleNovoCep(valor: string) {
    const formatado = formatarCep(valor);
    setNovoEnd({ cep: formatado });
    setErroCep("");
    if (valor.replace(/\D/g, "").length === 8) {
      buscarCep(valor, (end) => setNovoEnd(end));
    }
  }

  async function criarNovoCliente() {
    if (!novoClienteForm.nome.trim()) {
      toast({ title: "Informe o nome do cliente.", variant: "destructive" });
      return;
    }
    setSalvandoCliente(true);
    try {
      const { endereco } = novoClienteForm;
      const novo = await apiFetch("/api/clientes", {
        method: "POST",
        body: JSON.stringify({
          nome: novoClienteForm.nome.trim(),
          telefone: novoClienteForm.telefone.trim() || undefined,
          email: novoClienteForm.email.trim() || undefined,
          data_nascimento: novoClienteForm.data_nascimento || undefined,
          cep: endereco.cep || undefined,
          logradouro: endereco.logradouro || undefined,
          numero: endereco.numero || undefined,
          complemento: endereco.complemento || undefined,
          bairro: endereco.bairro || undefined,
          cidade: endereco.cidade || undefined,
          estado: endereco.estado || undefined,
        }),
      });
      queryClient.invalidateQueries({ queryKey: getListClientesQueryKey({}) });
      setForm((f) => ({ ...f, cliente_id: String(novo.id) }));
      setNovoClienteAberto(false);
      setNovoClienteForm({ nome: "", telefone: "", email: "", data_nascimento: "", endereco: { ...enderecoVazio } });
      toast({ title: `Cliente "${novo.nome}" cadastrado e selecionado.` });
    } catch (e: any) {
      toast({ title: e.message || "Erro ao cadastrar cliente.", variant: "destructive" });
    } finally {
      setSalvandoCliente(false);
    }
  }

  function abrirNovo() {
    setForm({ ...formVazio, data: dateFrom });
    setEditandoId(null);
    setNovoClienteAberto(false);
    setNovoClienteForm({ nome: "", telefone: "", email: "", data_nascimento: "", endereco: { ...enderecoVazio } });
    setModalAberto(true);
  }

  function abrirEdicao(ag: any) {
    if (ag.status === "concluido" || ag.status === "cancelado") return;
    setForm({
      cliente_id: String(ag.cliente_id || ""),
      profissional_id: String(ag.profissional_id || ""),
      servico: ag.servico || "",
      data: ag.data || date,
      hora_inicio: ag.hora_inicio || "09:00",
      hora_fim: ag.hora_fim || "10:00",
      valor: String(ag.valor || ""),
      status: ag.status || "agendado",
      observacoes: ag.observacoes || "",
    });
    setEditandoId(ag.id);
    setModalAberto(true);
  }

  function handleSalvar() {
    if (!form.servico.trim()) {
      toast({ title: "Informe o serviço.", variant: "destructive" });
      return;
    }
    const valor = parseFloat(form.valor.replace(",", "."));
    const payload: any = {
      servico: form.servico,
      data: form.data,
      hora_inicio: form.hora_inicio,
      hora_fim: form.hora_fim,
      status: form.status as any,
    };
    if (form.profissional_id) payload.profissional_id = parseInt(form.profissional_id);
    if (form.cliente_id) payload.cliente_id = parseInt(form.cliente_id);
    if (!isNaN(valor) && valor > 0) payload.valor = valor;
    if (form.observacoes) payload.observacoes = form.observacoes;

    if (editandoId) {
      atualizarMutation.mutate({ id: editandoId, data: payload });
    } else {
      criarMutation.mutate({ data: payload });
    }
  }

  const agendamentosFiltrados = agendamentos?.filter(ag => {
    if (filtroStatus !== "todos" && ag.status !== filtroStatus) return false;
    if (busca.trim()) {
      const q = busca.trim().toLowerCase();
      const nome = (ag.cliente_nome ?? "").toLowerCase();
      const servico = (ag.servico ?? "").toLowerCase();
      if (!nome.includes(q) && !servico.includes(q)) return false;
    }
    return true;
  });

  const isSalvando = criarMutation.isPending || atualizarMutation.isPending;

  const corPrimaria = (empresa as any)?.cor_primaria || "#b8956f";
  const corSecundaria = (empresa as any)?.cor_secundaria || "#59463b";

  return (
    <Layout>
      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        {/* Header */}
        <section
          style={{
            background: "#ffffff",
            borderRadius: 20,
            padding: 24,
            boxShadow: "0 4px 14px rgba(0,0,0,0.06)",
            borderTop: `5px solid ${corPrimaria}`,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
            <div
              style={{
                width: 54, height: 54, borderRadius: 16,
                background: `linear-gradient(135deg, ${corSecundaria}, ${corPrimaria})`,
                color: "#fff", display: "flex", alignItems: "center", justifyContent: "center",
                fontWeight: 800, fontSize: 20, flexShrink: 0,
                boxShadow: "0 8px 20px rgba(0,0,0,0.10)",
              }}
            >
              📅
            </div>
            <div style={{ flex: 1 }}>
              <p style={{ margin: 0, fontSize: 11, fontWeight: 800, letterSpacing: 1.4, textTransform: "uppercase", color: "#6b7280" }}>
                Gestão
              </p>
              <h1 style={{ margin: "5px 0 0", fontSize: 28, lineHeight: 1.1, color: "#111827", fontWeight: 800 }}>
                Agenda
              </h1>
            </div>
            <button
              onClick={abrirNovo}
              style={{
                background: `linear-gradient(135deg, ${corSecundaria}, ${corPrimaria})`,
                color: "#fff", border: 0, borderRadius: 14,
                padding: "12px 20px", fontWeight: 800, cursor: "pointer",
                fontSize: 14, boxShadow: "0 8px 20px rgba(0,0,0,0.12)",
                display: "flex", alignItems: "center", gap: 8, whiteSpace: "nowrap",
              }}
            >
              + Novo Agendamento
            </button>
          </div>
        </section>

        <div className="flex gap-3 items-center flex-wrap">
          <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: "#57493f" }}>De:</span>
            <Input
              type="date"
              value={dateFrom}
              onChange={(e) => { setDateFrom(e.target.value); if (e.target.value > dateTo) setDateTo(e.target.value); }}
              className="w-auto"
              style={{ maxWidth: 150 }}
            />
            <span style={{ fontSize: 13, fontWeight: 600, color: "#57493f" }}>Até:</span>
            <Input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              min={dateFrom}
              className="w-auto"
              style={{ maxWidth: 150 }}
            />
            <button
              onClick={() => { setDateFrom(hoje); setDateTo(hoje); }}
              style={{ fontSize: 12, fontWeight: 700, color: corPrimaria, background: "none", border: `1px solid ${corPrimaria}`, borderRadius: 8, padding: "6px 12px", cursor: "pointer" }}
            >
              Hoje
            </button>
          </div>
          <Select value={filtroStatus} onValueChange={setFiltroStatus}>
            <SelectTrigger className="w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos os status</SelectItem>
              <SelectItem value="agendado">Agendado</SelectItem>
              <SelectItem value="confirmado">Confirmado</SelectItem>
              <SelectItem value="concluido">Concluído</SelectItem>
              <SelectItem value="cancelado">Cancelado</SelectItem>
            </SelectContent>
          </Select>
          <div style={{ position: "relative", flex: 1, minWidth: 200 }}>
            <input
              type="text"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar cliente ou serviço..."
              style={{
                width: "100%", border: "1px solid #e2e8f0", borderRadius: 8,
                padding: "8px 32px 8px 12px", fontSize: 14, color: "#1e293b",
                background: "#fff", outline: "none", boxSizing: "border-box",
              }}
            />
            {busca && (
              <button
                onClick={() => setBusca("")}
                style={{
                  position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)",
                  background: "none", border: "none", cursor: "pointer", color: "#94a3b8",
                  fontSize: 16, lineHeight: 1, padding: 0,
                }}
              >×</button>
            )}
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>
              {dateFrom === dateTo
                ? `Agendamentos — ${new Date(dateFrom + "T12:00:00").toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long" })}`
                : `Agendamentos — ${new Date(dateFrom + "T12:00:00").toLocaleDateString("pt-BR")} a ${new Date(dateTo + "T12:00:00").toLocaleDateString("pt-BR")}`}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
              </div>
            ) : agendamentosFiltrados?.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                Nenhum agendamento para esta data.
              </div>
            ) : (
              <div className="space-y-3">
                {agendamentosFiltrados?.map((ag) => (
                  <div key={ag.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/30 transition-colors">
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-1 text-sm text-muted-foreground w-24">
                        <Clock className="h-3.5 w-3.5" />
                        {ag.hora_inicio}
                      </div>
                      <div>
                        <div className="font-semibold">{ag.servico}</div>
                        <div className="text-sm text-muted-foreground">
                          {ag.cliente_nome || "Sem cliente"} • {ag.profissional_nome}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      {ag.valor && (
                        <span className="text-sm font-medium">
                          {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(ag.valor)}
                        </span>
                      )}
                      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS_CORES[ag.status] || "bg-muted text-muted-foreground"}`}>
                        {STATUS_LABELS[ag.status] || ag.status}
                      </span>
                      <div className="flex gap-1">
                        {ag.status !== "concluido" && ag.status !== "cancelado" && (
                          <Button size="icon" variant="ghost" onClick={() => abrirEdicao(ag)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                        )}
                        <Button
                          size="icon"
                          variant="ghost"
                          className="text-destructive hover:text-destructive"
                          onClick={() => setExcluindoId(ag.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={modalAberto} onOpenChange={(v) => { if (!v) { setModalAberto(false); setEditandoId(null); } }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editandoId ? "Editar Agendamento" : "Novo Agendamento"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Serviço *</Label>
              {servicos.length > 0 ? (
                <Select value={form.servico} onValueChange={handleSelecionarServico}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o serviço" />
                  </SelectTrigger>
                  <SelectContent>
                    {servicos.map((s) => (
                      <SelectItem key={s.id} value={s.nome}>
                        {s.nome} — {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(s.valor)} · {s.duracao_minutos} min
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Input
                  value={form.servico}
                  onChange={(e) => setForm(f => ({ ...f, servico: e.target.value }))}
                  placeholder="Ex: Corte + Escova (cadastre serviços para usar o seletor)"
                />
              )}
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Cliente</Label>
                <button
                  type="button"
                  onClick={() => { setNovoClienteAberto(!novoClienteAberto); setNovoClienteForm({ nome: "", telefone: "", email: "", data_nascimento: "", endereco: { ...enderecoVazio } }); }}
                  style={{
                    fontSize: 12,
                    fontWeight: 700,
                    color: "#b8956f",
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    padding: "2px 6px",
                    borderRadius: 8,
                    textDecoration: "underline",
                  }}
                >
                  {novoClienteAberto ? "Cancelar" : "+ Novo cliente"}
                </button>
              </div>

              {novoClienteAberto ? (
                <div
                  style={{
                    background: "#f9f6f2",
                    border: "1px solid #e6d9cf",
                    borderRadius: 14,
                    padding: 14,
                    display: "flex",
                    flexDirection: "column",
                    gap: 10,
                  }}
                >
                  <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: "#8b735d", textTransform: "uppercase", letterSpacing: 0.8 }}>
                    Cadastrar novo cliente
                  </p>

                  {/* Nome + Telefone */}
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                    <Input
                      placeholder="Nome completo *"
                      value={novoClienteForm.nome}
                      onChange={(e) => setNovoClienteForm((f) => ({ ...f, nome: e.target.value }))}
                      style={{ borderRadius: 10, border: "1px solid #e6d9cf", fontSize: 13 }}
                    />
                    <Input
                      placeholder="Telefone"
                      value={novoClienteForm.telefone}
                      onChange={(e) => setNovoClienteForm((f) => ({ ...f, telefone: e.target.value }))}
                      style={{ borderRadius: 10, border: "1px solid #e6d9cf", fontSize: 13 }}
                    />
                  </div>

                  {/* E-mail + Nascimento */}
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                    <Input
                      placeholder="E-mail (opcional)"
                      value={novoClienteForm.email}
                      onChange={(e) => setNovoClienteForm((f) => ({ ...f, email: e.target.value }))}
                      style={{ borderRadius: 10, border: "1px solid #e6d9cf", fontSize: 13 }}
                    />
                    <div>
                      <label style={{ fontSize: 11, color: "#8b735d", fontWeight: 700, display: "block", marginBottom: 3 }}>Data de nascimento</label>
                      <Input
                        type="date"
                        value={novoClienteForm.data_nascimento}
                        onChange={(e) => setNovoClienteForm((f) => ({ ...f, data_nascimento: e.target.value }))}
                        style={{ borderRadius: 10, border: "1px solid #e6d9cf", fontSize: 13 }}
                      />
                    </div>
                  </div>

                  {/* CEP + Logradouro */}
                  <div style={{ display: "grid", gridTemplateColumns: "120px 1fr", gap: 8 }}>
                    <div>
                      <label style={{ fontSize: 11, color: "#8b735d", fontWeight: 700, display: "block", marginBottom: 3 }}>CEP</label>
                      <div style={{ position: "relative" }}>
                        <Input
                          placeholder="00000-000"
                          maxLength={9}
                          value={novoClienteForm.endereco.cep}
                          onChange={(e) => handleNovoCep(e.target.value)}
                          style={{ borderRadius: 10, border: "1px solid #e6d9cf", fontSize: 13 }}
                        />
                        {buscandoCep && (
                          <span style={{ position: "absolute", right: 6, top: "50%", transform: "translateY(-50%)", fontSize: 10, color: "#8b735d" }}>
                            ...
                          </span>
                        )}
                      </div>
                      {erroCep && <p style={{ fontSize: 10, color: "#b91c1c", margin: "2px 0 0" }}>{erroCep}</p>}
                    </div>
                    <div>
                      <label style={{ fontSize: 11, color: "#8b735d", fontWeight: 700, display: "block", marginBottom: 3 }}>Logradouro</label>
                      <Input
                        placeholder="Rua, Avenida..."
                        value={novoClienteForm.endereco.logradouro}
                        onChange={(e) => setNovoEnd({ logradouro: e.target.value })}
                        style={{ borderRadius: 10, border: "1px solid #e6d9cf", fontSize: 13 }}
                      />
                    </div>
                  </div>

                  {/* Número + Complemento + Bairro */}
                  <div style={{ display: "grid", gridTemplateColumns: "80px 1fr 1fr", gap: 8 }}>
                    <div>
                      <label style={{ fontSize: 11, color: "#8b735d", fontWeight: 700, display: "block", marginBottom: 3 }}>Nº</label>
                      <Input
                        placeholder="123"
                        value={novoClienteForm.endereco.numero}
                        onChange={(e) => setNovoEnd({ numero: e.target.value })}
                        style={{ borderRadius: 10, border: "1px solid #e6d9cf", fontSize: 13 }}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: 11, color: "#8b735d", fontWeight: 700, display: "block", marginBottom: 3 }}>Complemento</label>
                      <Input
                        placeholder="Apto, bloco..."
                        value={novoClienteForm.endereco.complemento}
                        onChange={(e) => setNovoEnd({ complemento: e.target.value })}
                        style={{ borderRadius: 10, border: "1px solid #e6d9cf", fontSize: 13 }}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: 11, color: "#8b735d", fontWeight: 700, display: "block", marginBottom: 3 }}>Bairro</label>
                      <Input
                        placeholder="Bairro"
                        value={novoClienteForm.endereco.bairro}
                        onChange={(e) => setNovoEnd({ bairro: e.target.value })}
                        style={{ borderRadius: 10, border: "1px solid #e6d9cf", fontSize: 13 }}
                      />
                    </div>
                  </div>

                  {/* Cidade + UF */}
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 60px", gap: 8 }}>
                    <div>
                      <label style={{ fontSize: 11, color: "#8b735d", fontWeight: 700, display: "block", marginBottom: 3 }}>Cidade</label>
                      <Input
                        placeholder="Cidade"
                        value={novoClienteForm.endereco.cidade}
                        onChange={(e) => setNovoEnd({ cidade: e.target.value })}
                        style={{ borderRadius: 10, border: "1px solid #e6d9cf", fontSize: 13 }}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: 11, color: "#8b735d", fontWeight: 700, display: "block", marginBottom: 3 }}>UF</label>
                      <Input
                        placeholder="SP"
                        maxLength={2}
                        value={novoClienteForm.endereco.estado}
                        onChange={(e) => setNovoEnd({ estado: e.target.value })}
                        style={{ borderRadius: 10, border: "1px solid #e6d9cf", fontSize: 13 }}
                      />
                    </div>
                  </div>

                  <button
                    type="button"
                    disabled={salvandoCliente}
                    onClick={criarNovoCliente}
                    style={{
                      background: `linear-gradient(135deg, ${corSecundaria}, ${corPrimaria})`,
                      color: "#fff",
                      border: 0,
                      borderRadius: 10,
                      padding: "10px 14px",
                      fontWeight: 800,
                      cursor: "pointer",
                      fontSize: 14,
                      opacity: salvandoCliente ? 0.7 : 1,
                      marginTop: 4,
                    }}
                  >
                    {salvandoCliente ? "Cadastrando..." : "Cadastrar e selecionar"}
                  </button>
                </div>
              ) : (
                <Select value={form.cliente_id} onValueChange={(v) => setForm(f => ({ ...f, cliente_id: v }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o cliente" />
                  </SelectTrigger>
                  <SelectContent>
                    {clientes?.map((c) => (
                      <SelectItem key={c.id} value={String(c.id)}>{c.nome}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
            {profissionais.length > 0 && (
              <div className="space-y-2">
                <Label>Profissional</Label>
                <Select value={form.profissional_id} onValueChange={(v) => setForm(f => ({ ...f, profissional_id: v }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o profissional" />
                  </SelectTrigger>
                  <SelectContent>
                    {profissionais.filter(p => p.ativo).map((p) => (
                      <SelectItem key={p.id} value={String(p.id)}>{p.nome}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-2">
                <Label>Data</Label>
                <Input
                  type="date"
                  value={form.data}
                  onChange={(e) => setForm(f => ({ ...f, data: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Início</Label>
                <Input
                  type="time"
                  value={form.hora_inicio}
                  onChange={(e) => setForm(f => ({ ...f, hora_inicio: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Fim</Label>
                <Input
                  type="time"
                  value={form.hora_fim}
                  onChange={(e) => setForm(f => ({ ...f, hora_fim: e.target.value }))}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Valor (R$)</Label>
                <Input
                  value={form.valor}
                  onChange={(e) => setForm(f => ({ ...f, valor: e.target.value }))}
                  placeholder="0,00"
                />
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={form.status} onValueChange={(v) => setForm(f => ({ ...f, status: v }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="agendado">Agendado</SelectItem>
                    <SelectItem value="confirmado">Confirmado</SelectItem>
                    <SelectItem value="concluido">Concluído</SelectItem>
                    <SelectItem value="cancelado">Cancelado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Observações</Label>
              <Input
                value={form.observacoes}
                onChange={(e) => setForm(f => ({ ...f, observacoes: e.target.value }))}
                placeholder="Opcional"
              />
            </div>
          </div>
          <DialogFooter style={{ display: "flex", gap: 10, marginTop: 4 }}>
            <button
              type="button"
              onClick={() => { setModalAberto(false); setEditandoId(null); }}
              style={{
                border: "1px solid #e6d9cf", background: "#f9f6f2", color: "#4f433a",
                borderRadius: 12, padding: "11px 20px", fontWeight: 700, cursor: "pointer", fontSize: 14,
              }}
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleSalvar}
              disabled={isSalvando}
              style={{
                background: `linear-gradient(135deg, ${corSecundaria}, ${corPrimaria})`,
                color: "#fff", border: 0, borderRadius: 12,
                padding: "11px 20px", fontWeight: 800, cursor: "pointer",
                fontSize: 14, opacity: isSalvando ? 0.7 : 1,
                boxShadow: "0 6px 18px rgba(0,0,0,0.12)",
              }}
            >
              {isSalvando ? "Salvando..." : "Salvar"}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={excluindoId !== null} onOpenChange={(v) => { if (!v) setExcluindoId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover agendamento?</AlertDialogTitle>
            <AlertDialogDescription>Esta ação não pode ser desfeita.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => excluindoId && excluirMutation.mutate({ id: excluindoId })}
            >
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Layout>
  );
}
