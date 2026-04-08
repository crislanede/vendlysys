import { useState } from "react";
import { Layout } from "@/components/layout";
import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle, Clock, RotateCcw, XCircle, TrendingUp, BadgeDollarSign } from "lucide-react";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");
function getToken() { return localStorage.getItem("vendlysys_token"); }
async function apiFetch(path: string, options: RequestInit = {}) {
  const token = getToken();
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  const res = await fetch(`${BASE}${path}`, { ...options, headers });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Erro" }));
    throw new Error(err.error || "Erro");
  }
  if (res.status === 204) return null;
  return res.json();
}

function fmtMoeda(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function fmtData(d: string) {
  if (!d) return "-";
  const [y, m, day] = String(d).slice(0, 10).split("-");
  return `${day}/${m}/${y}`;
}

const STATUS_LABELS: Record<string, { label: string; cor: string; bg: string }> = {
  nao: { label: "Pendente", cor: "#92400e", bg: "#fef3c7" },
  sim: { label: "Pago", cor: "#065f46", bg: "#d1fae5" },
  creditado: { label: "Creditado", cor: "#1e40af", bg: "#dbeafe" },
  expirado: { label: "Expirado", cor: "#6b7280", bg: "#f3f4f6" },
};

type Filtro = "todos" | "nao" | "sim" | "creditado" | "expirado";

export default function Sinais() {
  const { empresa } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [filtro, setFiltro] = useState<Filtro>("todos");
  const cor = (empresa as any)?.cor_primaria || "#1C3A6E";

  const { data: stats } = useQuery({
    queryKey: ["sinais-stats"],
    queryFn: () => apiFetch("/api/sinais/stats"),
  });

  const { data: sinais = [], isLoading } = useQuery({
    queryKey: ["sinais", filtro],
    queryFn: () => apiFetch(`/api/sinais?status=${filtro}`),
  });

  const marcarPagoMut = useMutation({
    mutationFn: (id: number) => apiFetch(`/api/sinais/${id}/marcar-pago`, { method: "PATCH" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["sinais"] });
      qc.invalidateQueries({ queryKey: ["sinais-stats"] });
      toast({ title: "✅ Sinal marcado como pago!" });
    },
    onError: (e: any) => toast({ title: e.message, variant: "destructive" }),
  });

  const abas: { key: Filtro; label: string; count?: number }[] = [
    { key: "todos", label: "Todos" },
    { key: "nao", label: "Pendentes", count: stats?.countPendente },
    { key: "sim", label: "Pagos", count: stats?.countPago },
    { key: "creditado", label: "Creditados", count: stats?.countCreditado },
    { key: "expirado", label: "Expirados", count: stats?.countExpirado },
  ];

  return (
    <Layout>
      <div className="flex flex-col gap-6">
        <div className="flex items-center gap-3">
          <BadgeDollarSign style={{ color: cor, width: 28, height: 28 }} />
          <h1 className="text-3xl font-bold tracking-tight">Painel de Sinais</h1>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: "Total Recebido", value: fmtMoeda(stats?.totalRecebido ?? 0), icon: <TrendingUp style={{ width: 20, height: 20, color: "#065f46" }} />, bg: "#d1fae5", cor: "#065f46" },
            { label: "Pendente", value: fmtMoeda(stats?.totalPendente ?? 0), icon: <Clock style={{ width: 20, height: 20, color: "#92400e" }} />, bg: "#fef3c7", cor: "#92400e" },
            { label: "Creditado", value: fmtMoeda(stats?.totalCreditado ?? 0), icon: <RotateCcw style={{ width: 20, height: 20, color: "#1e40af" }} />, bg: "#dbeafe", cor: "#1e40af" },
            { label: "Expirado", value: fmtMoeda(stats?.totalExpirado ?? 0), icon: <XCircle style={{ width: 20, height: 20, color: "#6b7280" }} />, bg: "#f3f4f6", cor: "#6b7280" },
          ].map((s) => (
            <Card key={s.label}>
              <CardContent style={{ padding: "16px" }}>
                <div className="flex items-center gap-3">
                  <div style={{ background: s.bg, borderRadius: 8, padding: 8 }}>{s.icon}</div>
                  <div>
                    <div style={{ fontSize: 11, color: "#6b7280", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em" }}>{s.label}</div>
                    <div style={{ fontSize: 18, fontWeight: 700, color: s.cor }}>{s.value}</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Filtro tabs */}
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {abas.map((a) => (
            <button
              key={a.key}
              type="button"
              onClick={() => setFiltro(a.key)}
              style={{
                padding: "6px 14px",
                borderRadius: 20,
                border: "none",
                cursor: "pointer",
                fontWeight: 600,
                fontSize: 13,
                background: filtro === a.key ? cor : "#f1f5f9",
                color: filtro === a.key ? "#fff" : "#475569",
                transition: "all 0.15s",
              }}
            >
              {a.label}{a.count != null && a.count > 0 ? ` (${a.count})` : ""}
            </button>
          ))}
        </div>

        {/* Tabela */}
        <Card>
          <CardContent style={{ padding: 0 }}>
            {isLoading ? (
              <div style={{ padding: 32, textAlign: "center", color: "#94a3b8" }}>Carregando...</div>
            ) : (sinais as any[]).length === 0 ? (
              <div style={{ padding: 32, textAlign: "center", color: "#94a3b8" }}>Nenhum sinal encontrado.</div>
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr style={{ borderBottom: "1px solid #e2e8f0" }}>
                      {["Cliente", "Serviço", "Data", "Valor Sinal", "Status Sinal", "Ação"].map((h) => (
                        <th key={h} style={{ padding: "12px 16px", textAlign: "left", fontSize: 12, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.04em" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {(sinais as any[]).map((s: any) => {
                      const st = STATUS_LABELS[s.sinal_pago] ?? { label: s.sinal_pago, cor: "#64748b", bg: "#f1f5f9" };
                      return (
                        <tr key={s.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                          <td style={{ padding: "12px 16px" }}>
                            <div style={{ fontWeight: 600 }}>{s.cliente_nome || "—"}</div>
                            {s.cliente_telefone && <div style={{ fontSize: 12, color: "#94a3b8" }}>{s.cliente_telefone}</div>}
                          </td>
                          <td style={{ padding: "12px 16px", fontSize: 14 }}>{s.servico}</td>
                          <td style={{ padding: "12px 16px", fontSize: 14 }}>{fmtData(s.data)} {s.hora_inicio}</td>
                          <td style={{ padding: "12px 16px", fontWeight: 700, color: "#1e40af" }}>{fmtMoeda(s.sinal_valor)}</td>
                          <td style={{ padding: "12px 16px" }}>
                            <span style={{ background: st.bg, color: st.cor, borderRadius: 12, padding: "3px 10px", fontSize: 12, fontWeight: 700 }}>
                              {st.label}
                            </span>
                            {s.sinal_pago === "creditado" && s.sinal_expira_em && (
                              <div style={{ fontSize: 11, color: "#64748b", marginTop: 2 }}>expira {fmtData(s.sinal_expira_em)}</div>
                            )}
                          </td>
                          <td style={{ padding: "12px 16px" }}>
                            {s.sinal_pago === "nao" && (
                              <button
                                type="button"
                                onClick={() => marcarPagoMut.mutate(s.id)}
                                disabled={marcarPagoMut.isPending}
                                style={{
                                  background: "linear-gradient(135deg, #065f46, #047857)",
                                  color: "#fff", border: 0, borderRadius: 8,
                                  padding: "6px 12px", fontSize: 12, fontWeight: 700,
                                  cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 4,
                                }}
                              >
                                <CheckCircle style={{ width: 14, height: 14 }} />
                                Marcar Pago
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
