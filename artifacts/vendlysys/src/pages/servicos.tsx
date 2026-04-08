import { useState, useRef } from "react";
import * as XLSX from "xlsx";
import { Layout } from "@/components/layout";
import { useQueryClient, useQuery, useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

function getToken() {
  return localStorage.getItem("vendlysys_token");
}

async function apiFetch(path: string, options: RequestInit = {}) {
  const token = getToken();
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  const res = await fetch(`${BASE}${path}`, { ...options, headers });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Erro" }));
    throw new Error(err.error || "Erro na requisição");
  }
  if (res.status === 204) return null;
  return res.json();
}

interface Servico {
  id: number;
  nome: string;
  categoria: string;
  descricao?: string | null;
  duracao_minutos: number;
  valor: number;
  preco_promocional?: number | null;
  preco_descricao?: string | null;
  ativo: boolean;
}

interface ServicoForm {
  nome: string;
  categoria: string;
  descricao: string;
  duracao_minutos: string;
  valor: string;
  preco_promocional: string;
  preco_descricao: string;
  ativo: boolean;
}

const CATEGORIAS = [
  "Cabelo",
  "Manicure e Pedicure",
  "Estética",
  "Barba",
  "Maquiagem",
  "Depilação",
  "Massagem",
  "Tratamento Capilar",
  "Sobrancelha e Cílios",
  "Geral",
];

const formVazio: ServicoForm = {
  nome: "",
  categoria: "Geral",
  descricao: "",
  duracao_minutos: "60",
  valor: "",
  preco_promocional: "",
  preco_descricao: "",
  ativo: true,
};

function formatDuracao(min: number) {
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m > 0 ? `${h}h ${m}min` : `${h}h`;
}

const fmt = (v: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);

const SERVICOS_KEY = ["servicos"];

type Aba = "lista" | "cadastrar";

export default function Servicos() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { empresa } = useAuth();
  const [aba, setAba] = useState<Aba>("lista");
  const [form, setForm] = useState<ServicoForm>(formVazio);
  const [editandoId, setEditandoId] = useState<number | null>(null);
  const [confirmandoId, setConfirmandoId] = useState<number | null>(null);
  const [importando, setImportando] = useState(false);
  const [importResultado, setImportResultado] = useState<{ criados: number; erros: number; detalhes: string[] } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const corPrimaria = (empresa as any)?.cor_primaria || "#b8956f";
  const corSecundaria = (empresa as any)?.cor_secundaria || "#59463b";

  const { data: servicos = [], isLoading } = useQuery<Servico[]>({
    queryKey: SERVICOS_KEY,
    queryFn: () => apiFetch("/api/servicos"),
  });

  const criarMutation = useMutation({
    mutationFn: (data: any) => apiFetch("/api/servicos", { method: "POST", body: JSON.stringify(data) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: SERVICOS_KEY });
      setForm(formVazio);
      setAba("lista");
      toast({ title: "Serviço cadastrado com sucesso." });
    },
    onError: (e: any) => toast({ title: e.message || "Erro ao cadastrar.", variant: "destructive" }),
  });

  const atualizarMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) =>
      apiFetch(`/api/servicos/${id}`, { method: "PUT", body: JSON.stringify(data) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: SERVICOS_KEY });
      setForm(formVazio);
      setEditandoId(null);
      setAba("lista");
      toast({ title: "Serviço atualizado." });
    },
    onError: (e: any) => toast({ title: e.message || "Erro ao atualizar.", variant: "destructive" }),
  });

  const excluirMutation = useMutation({
    mutationFn: (id: number) => apiFetch(`/api/servicos/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: SERVICOS_KEY });
      setConfirmandoId(null);
      toast({ title: "Serviço removido." });
    },
    onError: (e: any) => toast({ title: e.message, variant: "destructive" }),
  });

  const toggleAtivo = (s: Servico) =>
    apiFetch(`/api/servicos/${s.id}`, { method: "PUT", body: JSON.stringify({ ativo: !s.ativo }) })
      .then(() => queryClient.invalidateQueries({ queryKey: SERVICOS_KEY }))
      .catch((e: any) => toast({ title: e.message, variant: "destructive" }));

  function abrirEdicao(s: Servico) {
    setForm({
      nome: s.nome,
      categoria: s.categoria || "Geral",
      descricao: s.descricao || "",
      duracao_minutos: String(s.duracao_minutos),
      valor: String(s.valor),
      preco_promocional: s.preco_promocional != null ? String(s.preco_promocional) : "",
      preco_descricao: s.preco_descricao || "",
      ativo: s.ativo,
    });
    setEditandoId(s.id);
    setAba("cadastrar");
  }

  function cancelarEdicao() {
    setForm(formVazio);
    setEditandoId(null);
    setAba("lista");
  }

  function baixarModelo() {
    const wb = XLSX.utils.book_new();
    const dados = [
      {
        nome: "Manicure Simples",
        categoria: "Manicure e Pedicure",
        valor: 30,
        preco_promocional: 25,
        duracao_minutos: 60,
        preco_descricao: "",
        ativo: "sim",
      },
      {
        nome: "Pedicure Completa",
        categoria: "Manicure e Pedicure",
        valor: 50,
        preco_promocional: "",
        duracao_minutos: 80,
        preco_descricao: "a partir de R$50",
        ativo: "sim",
      },
    ];
    const instrucoes = [
      { campo: "nome", descricao: "OBRIGATÓRIO — Nome do serviço" },
      { campo: "categoria", descricao: "Categoria (ex: Cabelo, Manicure e Pedicure, Estética...)" },
      { campo: "valor", descricao: "OBRIGATÓRIO — Preço em R$ (use ponto como decimal: 30.50)" },
      { campo: "preco_promocional", descricao: "Preço promocional (opcional)" },
      { campo: "duracao_minutos", descricao: "Duração em minutos (opcional, padrão: 60)" },
      { campo: "preco_descricao", descricao: "Descrição do preço (ex: 'a partir de R$50')" },
      { campo: "ativo", descricao: "'sim' ou 'não' para ativar/desativar o serviço" },
    ];
    const wsServicos = XLSX.utils.json_to_sheet(dados);
    wsServicos["!cols"] = [
      { wch: 30 }, { wch: 22 }, { wch: 12 }, { wch: 18 }, { wch: 18 }, { wch: 24 }, { wch: 8 },
    ];
    const wsInstrucoes = XLSX.utils.json_to_sheet(instrucoes);
    wsInstrucoes["!cols"] = [{ wch: 22 }, { wch: 60 }];
    XLSX.utils.book_append_sheet(wb, wsServicos, "Serviços");
    XLSX.utils.book_append_sheet(wb, wsInstrucoes, "Instruções");
    XLSX.writeFile(wb, "modelo_servicos.xlsx");
  }

  function exportarServicos() {
    const dados = servicos.map((s) => ({
      nome: s.nome,
      categoria: s.categoria || "",
      valor: s.valor,
      preco_promocional: s.preco_promocional ?? "",
      duracao_minutos: s.duracao_minutos ?? "",
      preco_descricao: s.preco_descricao ?? "",
      ativo: s.ativo ? "sim" : "não",
    }));
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(dados);
    ws["!cols"] = [
      { wch: 30 }, { wch: 22 }, { wch: 12 }, { wch: 18 }, { wch: 18 }, { wch: 24 }, { wch: 8 },
    ];
    XLSX.utils.book_append_sheet(wb, ws, "Serviços");
    XLSX.writeFile(wb, "servicos.xlsx");
  }

  async function handleImportFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    setImportando(true);
    setImportResultado(null);
    try {
      const buffer = await file.arrayBuffer();
      const wb = XLSX.read(buffer, { type: "array" });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rows: any[] = XLSX.utils.sheet_to_json(ws, { defval: "" });
      if (rows.length === 0) {
        toast({ title: "Arquivo sem dados.", variant: "destructive" });
        return;
      }
      const servicos = rows.map((r) => ({
        nome: r.nome ?? r.Nome ?? r.NOME,
        categoria: r.categoria ?? r.Categoria ?? r.CATEGORIA ?? "Geral",
        valor: r.valor ?? r.Valor ?? r.preco ?? r.Preco,
        preco_promocional: r.preco_promocional ?? r.Preco_Promocional ?? r["Preço Promocional"] ?? "",
        duracao_minutos: r.duracao_minutos ?? r.Duracao_Minutos ?? r.duracao ?? "",
        preco_descricao: r.preco_descricao ?? r.Preco_Descricao ?? "",
        ativo: String(r.ativo ?? r.Ativo ?? "sim").toLowerCase() !== "não" && String(r.ativo ?? "sim").toLowerCase() !== "nao" && String(r.ativo ?? "sim").toLowerCase() !== "false",
      }));
      const res = await apiFetch("/api/servicos/importar", {
        method: "POST",
        body: JSON.stringify({ servicos }),
      });
      setImportResultado(res);
      queryClient.invalidateQueries({ queryKey: SERVICOS_KEY });
      toast({ title: `${res.criados} serviço(s) importado(s) com sucesso.` });
    } catch (err: any) {
      toast({ title: err?.message ?? "Erro ao importar.", variant: "destructive" });
    } finally {
      setImportando(false);
    }
  }

  function handleSalvar(e: React.FormEvent) {
    e.preventDefault();
    const valor = parseFloat(form.valor.replace(",", "."));
    if (!form.nome.trim()) {
      toast({ title: "Informe o nome do serviço.", variant: "destructive" });
      return;
    }
    if (isNaN(valor) || valor < 0) {
      toast({ title: "Informe um valor válido.", variant: "destructive" });
      return;
    }
    const promoNum = form.preco_promocional ? parseFloat(form.preco_promocional.replace(",", ".")) : null;
    const payload = {
      nome: form.nome.trim(),
      categoria: form.categoria,
      descricao: form.descricao.trim() || undefined,
      duracao_minutos: parseInt(form.duracao_minutos) || 60,
      valor,
      preco_promocional: promoNum,
      preco_descricao: form.preco_descricao.trim() || undefined,
      ativo: form.ativo,
    };
    if (editandoId) {
      atualizarMutation.mutate({ id: editandoId, data: payload });
    } else {
      criarMutation.mutate(payload);
    }
  }

  const isSalvando = criarMutation.isPending || atualizarMutation.isPending;

  // Group by category
  const porCategoria: Record<string, Servico[]> = {};
  for (const s of servicos) {
    const cat = s.categoria || "Geral";
    if (!porCategoria[cat]) porCategoria[cat] = [];
    porCategoria[cat].push(s);
  }
  const categorias = Object.keys(porCategoria).sort();

  const ativos = servicos.filter((s) => s.ativo);
  const valorMedio = ativos.length > 0 ? ativos.reduce((a, s) => a + s.valor, 0) / ativos.length : 0;

  return (
    <Layout>
      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        {/* Header section */}
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
                width: 54,
                height: 54,
                borderRadius: 16,
                background: `linear-gradient(135deg, ${corSecundaria}, ${corPrimaria})`,
                color: "#fff",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontWeight: 800,
                fontSize: 20,
                flexShrink: 0,
                boxShadow: "0 8px 20px rgba(0,0,0,0.10)",
              }}
            >
              ✂️
            </div>
            <div style={{ flex: 1 }}>
              <p style={{ margin: 0, fontSize: 11, fontWeight: 800, letterSpacing: 1.4, textTransform: "uppercase", color: "#6b7280" }}>
                Catálogo
              </p>
              <h1 style={{ margin: "5px 0 0", fontSize: 28, lineHeight: 1.1, color: "#111827", fontWeight: 800 }}>
                Serviços
              </h1>
              <p style={{ margin: "6px 0 0", fontSize: 14, color: "#6b7280" }}>
                Gerencie o catálogo de serviços, valores e durações.
              </p>
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <button
                type="button"
                onClick={baixarModelo}
                title="Baixar planilha modelo para preenchimento"
                style={{ background: "#f5f3f2", color: "#2d241f", border: "1.5px solid #e5e7eb", borderRadius: 12, padding: "10px 16px", fontWeight: 700, cursor: "pointer", fontSize: 13, whiteSpace: "nowrap" }}
              >
                ⬇ Modelo
              </button>
              <button
                type="button"
                onClick={exportarServicos}
                disabled={servicos.length === 0}
                title="Exportar serviços atuais para Excel"
                style={{ background: "#f5f3f2", color: "#2d241f", border: "1.5px solid #e5e7eb", borderRadius: 12, padding: "10px 16px", fontWeight: 700, cursor: servicos.length === 0 ? "not-allowed" : "pointer", fontSize: 13, whiteSpace: "nowrap", opacity: servicos.length === 0 ? 0.5 : 1 }}
              >
                ⬆ Exportar
              </button>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={importando}
                title="Importar serviços de planilha Excel"
                style={{ background: "#f0fdf4", color: "#15803d", border: "1.5px solid #86efac", borderRadius: 12, padding: "10px 16px", fontWeight: 700, cursor: importando ? "not-allowed" : "pointer", fontSize: 13, whiteSpace: "nowrap" }}
              >
                {importando ? "⏳ Importando..." : "📥 Importar Excel"}
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls,.csv"
                style={{ display: "none" }}
                onChange={handleImportFile}
              />
              <button
                onClick={() => { setForm(formVazio); setEditandoId(null); setAba("cadastrar"); }}
                style={{
                  background: `linear-gradient(135deg, ${corSecundaria}, ${corPrimaria})`,
                  color: "#fff",
                  border: 0,
                  borderRadius: 14,
                  padding: "12px 20px",
                  fontWeight: 800,
                  cursor: "pointer",
                  fontSize: 14,
                  boxShadow: "0 8px 20px rgba(0,0,0,0.12)",
                  whiteSpace: "nowrap",
                }}
              >
                + Novo Serviço
              </button>
            </div>
            {importResultado && (
              <div
                style={{
                  width: "100%",
                  marginTop: 12,
                  padding: "12px 16px",
                  borderRadius: 12,
                  background: importResultado.erros === 0 ? "#f0fdf4" : "#fefce8",
                  border: `1px solid ${importResultado.erros === 0 ? "#86efac" : "#fde68a"}`,
                  fontSize: 13,
                  color: importResultado.erros === 0 ? "#15803d" : "#92400e",
                }}
              >
                <div style={{ fontWeight: 700, marginBottom: 4 }}>
                  ✅ {importResultado.criados} serviço(s) importado(s)
                  {importResultado.erros > 0 && ` · ⚠️ ${importResultado.erros} erro(s)`}
                </div>
                {importResultado.detalhes.length > 0 && (
                  <ul style={{ margin: "6px 0 0", paddingLeft: 20 }}>
                    {importResultado.detalhes.map((d, i) => <li key={i}>{d}</li>)}
                  </ul>
                )}
                <button
                  type="button"
                  onClick={() => setImportResultado(null)}
                  style={{ marginTop: 8, background: "none", border: "none", cursor: "pointer", fontSize: 12, color: "#6b7280", textDecoration: "underline", padding: 0 }}
                >
                  Fechar
                </button>
              </div>
            )}
          </div>

          {/* Summary badges */}
          <div style={{ marginTop: 16, display: "flex", gap: 12, flexWrap: "wrap" }}>
            <StatBadge label="Total" valor={servicos.length} />
            <StatBadge label="Ativos" valor={ativos.length} />
            <StatBadge label="Ticket médio" valor={fmt(valorMedio)} />
          </div>
        </section>

        {/* Tabs */}
        <div
          style={{
            background: "rgba(255,255,255,0.82)",
            backdropFilter: "blur(8px)",
            border: "1px solid rgba(255,255,255,0.7)",
            borderRadius: 20,
            padding: 8,
            display: "inline-flex",
            gap: 8,
            boxShadow: "0 6px 20px rgba(100,80,60,0.07)",
            alignSelf: "flex-start",
          }}
        >
          {(["lista", "cadastrar"] as Aba[]).map((t) => (
            <button
              key={t}
              onClick={() => { if (t === "lista") cancelarEdicao(); else setAba(t); }}
              style={
                aba === t
                  ? {
                      border: 0,
                      background: `linear-gradient(135deg, ${corSecundaria}, ${corPrimaria})`,
                      color: "#fff",
                      padding: "10px 18px",
                      borderRadius: 14,
                      cursor: "pointer",
                      fontWeight: 800,
                      fontSize: 14,
                      boxShadow: "0 6px 16px rgba(45,36,31,0.16)",
                    }
                  : {
                      border: 0,
                      background: "transparent",
                      color: "#7a6a5e",
                      padding: "10px 18px",
                      borderRadius: 14,
                      cursor: "pointer",
                      fontWeight: 700,
                      fontSize: 14,
                    }
              }
            >
              {t === "lista" ? "Lista de Serviços" : editandoId ? "Editar Serviço" : "Cadastrar Serviço"}
            </button>
          ))}
        </div>

        {/* ABA: Lista */}
        {aba === "lista" && (
          <section
            style={{
              background: "#ffffff",
              borderRadius: 20,
              padding: 24,
              boxShadow: "0 4px 14px rgba(0,0,0,0.06)",
            }}
          >
            {isLoading ? (
              <div style={{ textAlign: "center", padding: 40, color: "#6b7280" }}>Carregando...</div>
            ) : servicos.length === 0 ? (
              <div
                style={{
                  textAlign: "center",
                  padding: "48px 24px",
                  background: "#f9f6f2",
                  borderRadius: 16,
                  border: "1px solid #e6d9cf",
                  color: "#7b6858",
                }}
              >
                <div style={{ fontSize: 40, marginBottom: 12 }}>✂️</div>
                <p style={{ margin: 0, fontWeight: 700, fontSize: 16, color: "#3a2f28" }}>Nenhum serviço cadastrado</p>
                <p style={{ margin: "6px 0 0", fontSize: 14 }}>Clique em "Novo Serviço" para começar.</p>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
                {categorias.map((cat) => (
                  <div key={cat}>
                    <h3
                      style={{
                        margin: "0 0 12px",
                        fontSize: 12,
                        fontWeight: 800,
                        letterSpacing: 1.2,
                        textTransform: "uppercase",
                        color: "#8b735d",
                      }}
                    >
                      {cat}
                    </h3>
                    <div style={{ display: "grid", gap: 12, gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))" }}>
                      {porCategoria[cat].map((s) => (
                        <ServicoCard
                          key={s.id}
                          servico={s}
                          corPrimaria={corPrimaria}
                          corSecundaria={corSecundaria}
                          onEditar={() => abrirEdicao(s)}
                          onExcluir={() => setConfirmandoId(s.id)}
                          onToggle={() => toggleAtivo(s)}
                        />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        {/* ABA: Cadastrar / Editar */}
        {aba === "cadastrar" && (
          <section
            style={{
              background: "#ffffff",
              borderRadius: 20,
              padding: 28,
              boxShadow: "0 4px 14px rgba(0,0,0,0.06)",
            }}
          >
            <h2 style={{ margin: "0 0 20px", fontSize: 18, fontWeight: 800, color: "#111827" }}>
              {editandoId ? "Editar Serviço" : "Novo Serviço"}
            </h2>
            <form onSubmit={handleSalvar} style={{ display: "flex", flexDirection: "column", gap: 18, maxWidth: 600 }}>
              <FormRow label="Nome do serviço *">
                <FormInput
                  value={form.nome}
                  onChange={(v) => setForm((f) => ({ ...f, nome: v }))}
                  placeholder="Ex: Corte feminino, Coloração, Manicure..."
                />
              </FormRow>

              <FormRow label="Categoria">
                <FormSelect
                  value={form.categoria}
                  onChange={(v) => setForm((f) => ({ ...f, categoria: v }))}
                  options={CATEGORIAS}
                />
              </FormRow>

              <FormRow label="Descrição">
                <textarea
                  rows={2}
                  value={form.descricao}
                  onChange={(e) => setForm((f) => ({ ...f, descricao: e.target.value }))}
                  placeholder="Detalhes do serviço (opcional)"
                  style={inputStyle}
                />
              </FormRow>

              <div style={{ display: "grid", gap: 16, gridTemplateColumns: "1fr 1fr" }}>
                <FormRow label="Valor (R$) *">
                  <FormInput
                    value={form.valor}
                    onChange={(v) => setForm((f) => ({ ...f, valor: v }))}
                    placeholder="0,00"
                  />
                </FormRow>
                <FormRow label="Duração (minutos)">
                  <FormInput
                    value={form.duracao_minutos}
                    onChange={(v) => setForm((f) => ({ ...f, duracao_minutos: v }))}
                    placeholder="60"
                    type="number"
                  />
                </FormRow>
              </div>

              <div style={{ display: "grid", gap: 16, gridTemplateColumns: "1fr 1fr" }}>
                <FormRow label="Preço promocional (R$)">
                  <FormInput
                    value={form.preco_promocional}
                    onChange={(v) => setForm((f) => ({ ...f, preco_promocional: v }))}
                    placeholder="Opcional"
                  />
                </FormRow>
                <FormRow label="Descrição do preço">
                  <FormInput
                    value={form.preco_descricao}
                    onChange={(v) => setForm((f) => ({ ...f, preco_descricao: v }))}
                    placeholder="Ex: Promoção de segunda"
                  />
                </FormRow>
              </div>

              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  background: "#f9f6f2",
                  border: "1px solid #e6d9cf",
                  borderRadius: 14,
                  padding: "14px 16px",
                }}
              >
                <input
                  type="checkbox"
                  id="ativo"
                  checked={form.ativo}
                  onChange={(e) => setForm((f) => ({ ...f, ativo: e.target.checked }))}
                  style={{ width: 16, height: 16, accentColor: corPrimaria, cursor: "pointer" }}
                />
                <div>
                  <label htmlFor="ativo" style={{ fontSize: 14, fontWeight: 700, color: "#3a2f28", cursor: "pointer" }}>
                    Serviço ativo
                  </label>
                  <p style={{ margin: 0, fontSize: 12, color: "#8b735d" }}>Aparece na agenda e no portal do cliente</p>
                </div>
              </div>

              <div style={{ display: "flex", gap: 12, paddingTop: 4 }}>
                <button
                  type="submit"
                  disabled={isSalvando}
                  style={{
                    flex: 1,
                    background: `linear-gradient(135deg, ${corSecundaria}, ${corPrimaria})`,
                    color: "#fff",
                    border: 0,
                    borderRadius: 14,
                    padding: "14px 20px",
                    fontWeight: 800,
                    cursor: "pointer",
                    fontSize: 15,
                    boxShadow: "0 8px 20px rgba(0,0,0,0.12)",
                    opacity: isSalvando ? 0.7 : 1,
                  }}
                >
                  {isSalvando ? "Salvando..." : editandoId ? "Salvar Alterações" : "Cadastrar Serviço"}
                </button>
                <button
                  type="button"
                  onClick={cancelarEdicao}
                  style={{
                    border: "1px solid #e6d9cf",
                    background: "#f9f6f2",
                    color: "#4f433a",
                    borderRadius: 14,
                    padding: "14px 20px",
                    fontWeight: 700,
                    cursor: "pointer",
                    fontSize: 15,
                  }}
                >
                  Cancelar
                </button>
              </div>
            </form>
          </section>
        )}
      </div>

      {/* Confirm delete overlay */}
      {confirmandoId !== null && (
        <div
          style={{
            position: "fixed", inset: 0, zIndex: 50,
            background: "rgba(0,0,0,0.45)",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}
          onClick={() => setConfirmandoId(null)}
        >
          <div
            style={{
              background: "#fff", borderRadius: 20, padding: 28,
              maxWidth: 400, width: "90%", boxShadow: "0 20px 50px rgba(0,0,0,0.18)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ margin: "0 0 8px", fontSize: 18, fontWeight: 800, color: "#111827" }}>Remover serviço?</h3>
            <p style={{ margin: "0 0 20px", fontSize: 14, color: "#6b7280" }}>Esta ação não pode ser desfeita.</p>
            <div style={{ display: "flex", gap: 12 }}>
              <button
                onClick={() => confirmandoId && excluirMutation.mutate(confirmandoId)}
                style={{
                  flex: 1, background: "#b91c1c", color: "#fff", border: 0,
                  borderRadius: 12, padding: "12px 16px", fontWeight: 800, cursor: "pointer",
                }}
              >
                Remover
              </button>
              <button
                onClick={() => setConfirmandoId(null)}
                style={{
                  flex: 1, border: "1px solid #e6d9cf", background: "#f9f6f2",
                  color: "#4f433a", borderRadius: 12, padding: "12px 16px", fontWeight: 700, cursor: "pointer",
                }}
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}

function ServicoCard({
  servico,
  corPrimaria,
  corSecundaria,
  onEditar,
  onExcluir,
  onToggle,
}: {
  servico: Servico;
  corPrimaria: string;
  corSecundaria: string;
  onEditar: () => void;
  onExcluir: () => void;
  onToggle: () => void;
}) {
  return (
    <div
      style={{
        background: servico.ativo ? "#ffffff" : "#f9f6f2",
        border: "1px solid #ede4da",
        borderRadius: 18,
        padding: 18,
        opacity: servico.ativo ? 1 : 0.65,
        display: "flex",
        flexDirection: "column",
        gap: 0,
        boxShadow: "0 2px 10px rgba(80,60,40,0.06)",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <span
            style={{
              fontSize: 11,
              fontWeight: 700,
              display: "block",
              color: "#8b735d",
              letterSpacing: 0.8,
              textTransform: "uppercase",
              marginBottom: 4,
            }}
          >
            {servico.categoria}
          </span>
          <div
            style={{
              fontSize: 17,
              fontWeight: 700,
              color: "#3a2f28",
              lineHeight: 1.2,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {servico.nome}
          </div>
          {servico.descricao && (
            <p style={{ margin: "5px 0 0", fontSize: 13, color: "#7b6858", fontStyle: "italic" }}>
              {servico.descricao}
            </p>
          )}
        </div>
        <div style={{ display: "flex", gap: 6, marginLeft: 8 }}>
          <button
            onClick={onEditar}
            style={{ background: "#f9f6f2", border: "1px solid #e6d9cf", borderRadius: 10, padding: "6px 9px", cursor: "pointer" }}
            title="Editar"
          >
            ✏️
          </button>
          <button
            onClick={onExcluir}
            style={{ background: "#fdf2f2", border: "1px solid #f5c6c6", borderRadius: 10, padding: "6px 9px", cursor: "pointer" }}
            title="Excluir"
          >
            🗑️
          </button>
        </div>
      </div>

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          gap: 12,
          marginTop: 14,
          paddingTop: 12,
          borderTop: "1px solid #f1e7de",
        }}
      >
        <div>
          <div style={{ fontSize: 11, color: "#8b735d", fontWeight: 700, textTransform: "uppercase" }}>Valor</div>
          <div style={{ fontSize: 18, fontWeight: 700, color: corPrimaria }}>
            {fmt(servico.valor)}
          </div>
          {servico.preco_promocional != null && (
            <div style={{ fontSize: 13, fontWeight: 700, color: "#1d7940" }}>
              Promo: {fmt(servico.preco_promocional)}
            </div>
          )}
          {servico.preco_descricao && (
            <div style={{ fontSize: 11, color: "#8b735d", fontStyle: "italic" }}>{servico.preco_descricao}</div>
          )}
        </div>
        <div>
          <div style={{ fontSize: 11, color: "#8b735d", fontWeight: 700, textTransform: "uppercase" }}>Duração</div>
          <div style={{ fontSize: 16, fontWeight: 700, color: "#3a2f28" }}>{formatDuracao(servico.duracao_minutos)}</div>
        </div>
      </div>

      <div
        style={{
          marginTop: 12,
          paddingTop: 10,
          borderTop: "1px solid #f1e7de",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <span style={{ fontSize: 12, color: "#8b735d" }}>{servico.ativo ? "Visível para clientes" : "Oculto"}</span>
        <button
          onClick={onToggle}
          style={{
            border: 0,
            borderRadius: 999,
            padding: "5px 14px",
            fontSize: 12,
            fontWeight: 700,
            cursor: "pointer",
            background: servico.ativo
              ? `linear-gradient(135deg, ${corSecundaria}, ${corPrimaria})`
              : "#e6d9cf",
            color: servico.ativo ? "#fff" : "#7a6a5e",
          }}
        >
          {servico.ativo ? "Ativo" : "Inativo"}
        </button>
      </div>
    </div>
  );
}

function StatBadge({ label, valor }: { label: string; valor: string | number }) {
  return (
    <div
      style={{
        display: "inline-flex",
        flexDirection: "column",
        alignItems: "center",
        padding: "8px 16px",
        borderRadius: 12,
        background: "#f3ede8",
        border: "1px solid #e6d9cf",
        minWidth: 70,
      }}
    >
      <span style={{ fontSize: 16, fontWeight: 800, color: "#3a2f28" }}>{valor}</span>
      <span style={{ fontSize: 11, fontWeight: 700, color: "#8b735d", textTransform: "uppercase", letterSpacing: 0.5 }}>{label}</span>
    </div>
  );
}

function FormRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <label style={{ fontSize: 13, fontWeight: 700, color: "#6a5a4f" }}>{label}</label>
      {children}
    </div>
  );
}

function FormInput({
  value, onChange, placeholder, type = "text",
}: {
  value: string; onChange: (v: string) => void; placeholder?: string; type?: string;
}) {
  return (
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      style={inputStyle}
    />
  );
}

function FormSelect({ value, onChange, options }: { value: string; onChange: (v: string) => void; options: string[] }) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)} style={inputStyle}>
      {options.map((o) => <option key={o} value={o}>{o}</option>)}
    </select>
  );
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  borderRadius: 14,
  border: "1px solid #e6d9cf",
  background: "#fff",
  padding: "12px 14px",
  fontSize: 14,
  outline: "none",
  color: "#2d241f",
  boxShadow: "inset 0 1px 2px rgba(0,0,0,0.03)",
  boxSizing: "border-box",
};
