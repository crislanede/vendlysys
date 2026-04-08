import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Layout } from "@/components/layout";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";

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
  if (res.status === 204) return null;
  return res.json();
}

interface Bloqueio {
  id: number;
  data: string;
  hora_inicio: string | null;
  hora_fim: string | null;
  motivo: string | null;
}

const MESES = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];
const DIAS_SEMANA = ["Dom","Seg","Ter","Qua","Qui","Sex","Sáb"];

function hojeISO() { return new Date().toISOString().split("T")[0]; }

function formatarData(iso: string) {
  const [a, m, d] = iso.split("-");
  return `${d}/${m}/${a}`;
}

function diaSemana(iso: string) {
  const [a, m, d] = iso.split("-").map(Number);
  const dt = new Date(a, m - 1, d);
  return DIAS_SEMANA[dt.getDay()];
}

export default function Bloqueios() {
  const { empresa } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const hoje = new Date();
  const [mes, setMes] = useState(hoje.getMonth() + 1);
  const [ano, setAno] = useState(hoje.getFullYear());
  const [modalAberto, setModalAberto] = useState(false);
  const [excluindoId, setExcluindoId] = useState<number | null>(null);

  const [form, setForm] = useState({
    data: hojeISO(),
    diaInteiro: true,
    hora_inicio: "09:00",
    hora_fim: "18:00",
    motivo: "",
  });

  const corPrimaria = (empresa as any)?.cor_primaria || "#b8956f";
  const corSecundaria = (empresa as any)?.cor_secundaria || "#59463b";

  const queryKey = ["bloqueios", mes, ano];
  const { data: bloqueios = [], isLoading } = useQuery<Bloqueio[]>({
    queryKey,
    queryFn: () => apiFetch(`/api/bloqueios?mes=${mes}&ano=${ano}`),
  });

  const criarMutation = useMutation({
    mutationFn: (payload: any) => apiFetch("/api/bloqueios", { method: "POST", body: JSON.stringify(payload) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bloqueios"] });
      setModalAberto(false);
      setForm({ data: hojeISO(), diaInteiro: true, hora_inicio: "09:00", hora_fim: "18:00", motivo: "" });
      toast({ title: "Bloqueio criado." });
    },
    onError: (e: any) => toast({ title: e.message || "Erro ao criar bloqueio.", variant: "destructive" }),
  });

  const excluirMutation = useMutation({
    mutationFn: (id: number) => apiFetch(`/api/bloqueios/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bloqueios"] });
      setExcluindoId(null);
      toast({ title: "Bloqueio removido." });
    },
    onError: (e: any) => toast({ title: e.message || "Erro ao remover.", variant: "destructive" }),
  });

  function handleSalvar() {
    if (!form.data) { toast({ title: "Informe a data.", variant: "destructive" }); return; }
    const payload: any = { data: form.data, motivo: form.motivo || null };
    if (!form.diaInteiro) {
      payload.hora_inicio = form.hora_inicio;
      payload.hora_fim = form.hora_fim;
    }
    criarMutation.mutate(payload);
  }

  // Mini calendário
  const diasNoMes = new Date(ano, mes, 0).getDate();
  const primeiroDia = new Date(ano, mes - 1, 1).getDay();
  const datasComBloqueio = new Set(bloqueios.map(b => b.data));
  const diasCalendario = Array.from({ length: primeiroDia + diasNoMes }, (_, i) =>
    i < primeiroDia ? null : `${ano}-${String(mes).padStart(2, "0")}-${String(i - primeiroDia + 1).padStart(2, "0")}`
  );

  function mudarMes(delta: number) {
    let nm = mes + delta;
    let na = ano;
    if (nm < 1) { nm = 12; na--; }
    if (nm > 12) { nm = 1; na++; }
    setMes(nm); setAno(na);
  }

  return (
    <Layout>
      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

        {/* Header */}
        <section style={{ background: "#fff", borderRadius: 20, padding: 24, boxShadow: "0 4px 14px rgba(0,0,0,0.06)", borderTop: `5px solid ${corPrimaria}` }}>
          <div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
            <div style={{ width: 54, height: 54, borderRadius: 16, background: `linear-gradient(135deg, ${corSecundaria}, ${corPrimaria})`, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 20, flexShrink: 0, boxShadow: "0 8px 20px rgba(0,0,0,0.10)" }}>
              🚫
            </div>
            <div style={{ flex: 1 }}>
              <p style={{ margin: 0, fontSize: 11, fontWeight: 800, letterSpacing: 1.4, textTransform: "uppercase", color: "#6b7280" }}>Gestão</p>
              <h1 style={{ margin: "5px 0 0", fontSize: 28, lineHeight: 1.1, color: "#111827", fontWeight: 800 }}>Bloqueios de Agenda</h1>
            </div>
            <button
              onClick={() => setModalAberto(true)}
              style={{ background: `linear-gradient(135deg, ${corSecundaria}, ${corPrimaria})`, color: "#fff", border: 0, borderRadius: 14, padding: "12px 20px", fontWeight: 800, cursor: "pointer", fontSize: 14, boxShadow: "0 8px 20px rgba(0,0,0,0.12)", display: "flex", alignItems: "center", gap: 8, whiteSpace: "nowrap" }}
            >
              + Novo Bloqueio
            </button>
          </div>
        </section>

        <div style={{ display: "grid", gridTemplateColumns: "auto 1fr", gap: 20, alignItems: "start" }}>

          {/* Mini calendário */}
          <div style={{ background: "#fff", borderRadius: 18, padding: 20, boxShadow: "0 4px 14px rgba(0,0,0,0.06)", minWidth: 280 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
              <button onClick={() => mudarMes(-1)} style={{ background: "none", border: "1px solid #e5e7eb", borderRadius: 8, width: 32, height: 32, cursor: "pointer", fontSize: 16, display: "flex", alignItems: "center", justifyContent: "center" }}>‹</button>
              <span style={{ fontWeight: 800, fontSize: 15, color: "#111827" }}>{MESES[mes - 1]} {ano}</span>
              <button onClick={() => mudarMes(1)} style={{ background: "none", border: "1px solid #e5e7eb", borderRadius: 8, width: 32, height: 32, cursor: "pointer", fontSize: 16, display: "flex", alignItems: "center", justifyContent: "center" }}>›</button>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 4, marginBottom: 8 }}>
              {DIAS_SEMANA.map(d => (
                <div key={d} style={{ textAlign: "center", fontSize: 11, fontWeight: 700, color: "#9ca3af", padding: "4px 0" }}>{d}</div>
              ))}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 4 }}>
              {diasCalendario.map((dia, i) => {
                if (!dia) return <div key={i} />;
                const bloqueado = datasComBloqueio.has(dia);
                const isHoje = dia === hojeISO();
                return (
                  <div
                    key={dia}
                    title={bloqueado ? "Dia bloqueado" : undefined}
                    style={{
                      textAlign: "center", borderRadius: 8, padding: "6px 0", fontSize: 13, fontWeight: isHoje ? 800 : 500,
                      background: bloqueado ? "#fef2f2" : isHoje ? "#f0f9ff" : "transparent",
                      color: bloqueado ? "#dc2626" : isHoje ? "#2563eb" : "#374151",
                      border: bloqueado ? "1px solid #fecaca" : isHoje ? "1px solid #bfdbfe" : "1px solid transparent",
                      cursor: bloqueado ? "default" : "default",
                      position: "relative",
                    }}
                  >
                    {dia.split("-")[2].replace(/^0/, "")}
                    {bloqueado && <span style={{ position: "absolute", top: 2, right: 3, fontSize: 7, color: "#dc2626" }}>●</span>}
                  </div>
                );
              })}
            </div>
            <div style={{ marginTop: 16, display: "flex", gap: 12, fontSize: 12, color: "#6b7280" }}>
              <span style={{ display: "flex", alignItems: "center", gap: 4 }}><span style={{ width: 10, height: 10, borderRadius: 3, background: "#fef2f2", border: "1px solid #fecaca", display: "inline-block" }} />Bloqueado</span>
              <span style={{ display: "flex", alignItems: "center", gap: 4 }}><span style={{ width: 10, height: 10, borderRadius: 3, background: "#f0f9ff", border: "1px solid #bfdbfe", display: "inline-block" }} />Hoje</span>
            </div>
          </div>

          {/* Lista de bloqueios */}
          <div style={{ background: "#fff", borderRadius: 18, boxShadow: "0 4px 14px rgba(0,0,0,0.06)", overflow: "hidden" }}>
            <div style={{ padding: "18px 22px", borderBottom: "1px solid #f3f4f6", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <h2 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: "#111827" }}>
                Bloqueios — {MESES[mes - 1]} {ano}
              </h2>
              <span style={{ fontSize: 13, color: "#6b7280", background: "#f3f4f6", borderRadius: 20, padding: "3px 12px", fontWeight: 600 }}>
                {bloqueios.length} bloqueio{bloqueios.length !== 1 ? "s" : ""}
              </span>
            </div>

            {isLoading ? (
              <div style={{ padding: 40, textAlign: "center", color: "#9ca3af" }}>Carregando...</div>
            ) : bloqueios.length === 0 ? (
              <div style={{ padding: 40, textAlign: "center" }}>
                <div style={{ fontSize: 40, marginBottom: 12 }}>✅</div>
                <p style={{ margin: 0, fontSize: 15, fontWeight: 600, color: "#6b7280" }}>Nenhum bloqueio neste mês</p>
                <p style={{ margin: "6px 0 0", fontSize: 13, color: "#9ca3af" }}>Clique em "+ Novo Bloqueio" para adicionar</p>
              </div>
            ) : (
              <div>
                {bloqueios.map((b) => (
                  <div key={b.id} style={{ display: "flex", alignItems: "center", gap: 16, padding: "14px 22px", borderBottom: "1px solid #f9fafb" }}>
                    <div style={{ width: 48, height: 48, borderRadius: 14, background: "#fef2f2", border: "1px solid #fecaca", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      <span style={{ fontSize: 16, fontWeight: 800, color: "#dc2626", lineHeight: 1 }}>{b.data.split("-")[2]}</span>
                      <span style={{ fontSize: 10, fontWeight: 600, color: "#ef4444", textTransform: "uppercase" }}>{MESES[Number(b.data.split("-")[1]) - 1].slice(0, 3)}</span>
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{ fontWeight: 700, fontSize: 15, color: "#111827" }}>{formatarData(b.data)}</span>
                        <span style={{ fontSize: 12, color: "#9ca3af", fontWeight: 500 }}>{diaSemana(b.data)}</span>
                        {!b.hora_inicio && (
                          <span style={{ background: "#fee2e2", color: "#dc2626", fontSize: 11, fontWeight: 700, borderRadius: 20, padding: "2px 10px" }}>Dia inteiro</span>
                        )}
                      </div>
                      <div style={{ display: "flex", gap: 12, marginTop: 3, fontSize: 13, color: "#6b7280" }}>
                        {b.hora_inicio && b.hora_fim && (
                          <span>🕐 {b.hora_inicio} – {b.hora_fim}</span>
                        )}
                        {b.motivo && <span>📝 {b.motivo}</span>}
                        {!b.hora_inicio && !b.motivo && <span style={{ color: "#d1d5db" }}>Sem motivo informado</span>}
                      </div>
                    </div>
                    {excluindoId === b.id ? (
                      <div style={{ display: "flex", gap: 6 }}>
                        <button
                          onClick={() => excluirMutation.mutate(b.id)}
                          disabled={excluirMutation.isPending}
                          style={{ background: "#dc2626", color: "#fff", border: 0, borderRadius: 10, padding: "6px 14px", fontSize: 13, fontWeight: 700, cursor: "pointer" }}
                        >
                          {excluirMutation.isPending ? "..." : "Confirmar"}
                        </button>
                        <button
                          onClick={() => setExcluindoId(null)}
                          style={{ background: "#f3f4f6", color: "#374151", border: 0, borderRadius: 10, padding: "6px 14px", fontSize: 13, fontWeight: 600, cursor: "pointer" }}
                        >
                          Cancelar
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setExcluindoId(b.id)}
                        style={{ background: "none", border: "1px solid #fecaca", color: "#dc2626", borderRadius: 10, padding: "6px 12px", fontSize: 13, cursor: "pointer", fontWeight: 600 }}
                      >
                        Remover
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal novo bloqueio */}
      {modalAberto && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
          <div style={{ background: "#fff", borderRadius: 20, width: "100%", maxWidth: 460, boxShadow: "0 20px 60px rgba(0,0,0,0.2)", overflow: "hidden" }}>
            <div style={{ padding: "22px 24px 18px", borderBottom: "1px solid #f3f4f6" }}>
              <h2 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: "#111827" }}>Novo Bloqueio</h2>
              <p style={{ margin: "4px 0 0", fontSize: 13, color: "#6b7280" }}>Bloqueia a agenda nesta data ou período</p>
            </div>
            <div style={{ padding: "20px 24px", display: "flex", flexDirection: "column", gap: 16 }}>

              {/* Data */}
              <div>
                <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "#374151", marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.6 }}>Data *</label>
                <input
                  type="date"
                  value={form.data}
                  onChange={e => setForm(f => ({ ...f, data: e.target.value }))}
                  style={{ width: "100%", border: "1px solid #e5e7eb", borderRadius: 10, padding: "9px 12px", fontSize: 14, color: "#111827", boxSizing: "border-box", outline: "none" }}
                />
              </div>

              {/* Motivo */}
              <div>
                <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "#374151", marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.6 }}>Motivo</label>
                <input
                  type="text"
                  value={form.motivo}
                  onChange={e => setForm(f => ({ ...f, motivo: e.target.value }))}
                  placeholder="Ex: Feriado, Compromisso pessoal, Manutenção..."
                  style={{ width: "100%", border: "1px solid #e5e7eb", borderRadius: 10, padding: "9px 12px", fontSize: 14, color: "#111827", boxSizing: "border-box", outline: "none" }}
                />
              </div>

              {/* Dia inteiro toggle */}
              <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", background: "#f9fafb", borderRadius: 12, border: "1px solid #e5e7eb" }}>
                <input
                  type="checkbox"
                  id="dia-inteiro"
                  checked={form.diaInteiro}
                  onChange={e => setForm(f => ({ ...f, diaInteiro: e.target.checked }))}
                  style={{ width: 16, height: 16, cursor: "pointer", accentColor: corPrimaria }}
                />
                <label htmlFor="dia-inteiro" style={{ fontSize: 14, fontWeight: 600, color: "#374151", cursor: "pointer" }}>
                  Bloquear o dia inteiro
                </label>
              </div>

              {/* Horários (só se não for dia inteiro) */}
              {!form.diaInteiro && (
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <div>
                    <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "#374151", marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.6 }}>Início</label>
                    <input
                      type="time"
                      value={form.hora_inicio}
                      onChange={e => setForm(f => ({ ...f, hora_inicio: e.target.value }))}
                      style={{ width: "100%", border: "1px solid #e5e7eb", borderRadius: 10, padding: "9px 12px", fontSize: 14, color: "#111827", boxSizing: "border-box", outline: "none" }}
                    />
                  </div>
                  <div>
                    <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "#374151", marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.6 }}>Fim</label>
                    <input
                      type="time"
                      value={form.hora_fim}
                      onChange={e => setForm(f => ({ ...f, hora_fim: e.target.value }))}
                      style={{ width: "100%", border: "1px solid #e5e7eb", borderRadius: 10, padding: "9px 12px", fontSize: 14, color: "#111827", boxSizing: "border-box", outline: "none" }}
                    />
                  </div>
                </div>
              )}
            </div>
            <div style={{ padding: "16px 24px", borderTop: "1px solid #f3f4f6", display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <button
                onClick={() => { setModalAberto(false); setForm({ data: hojeISO(), diaInteiro: true, hora_inicio: "09:00", hora_fim: "18:00", motivo: "" }); }}
                style={{ background: "#f3f4f6", color: "#374151", border: 0, borderRadius: 12, padding: "10px 20px", fontWeight: 600, fontSize: 14, cursor: "pointer" }}
              >
                Cancelar
              </button>
              <button
                onClick={handleSalvar}
                disabled={criarMutation.isPending}
                style={{ background: `linear-gradient(135deg, ${corSecundaria}, ${corPrimaria})`, color: "#fff", border: 0, borderRadius: 12, padding: "10px 22px", fontWeight: 800, fontSize: 14, cursor: "pointer", opacity: criarMutation.isPending ? 0.7 : 1 }}
              >
                {criarMutation.isPending ? "Salvando..." : "Salvar Bloqueio"}
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
