import { useState, useMemo } from "react";
import { Layout } from "@/components/layout";
import { useQuery } from "@tanstack/react-query";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");
function getToken() { return localStorage.getItem("vendlysys_token"); }
async function apiFetch(path: string) {
  const token = getToken();
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  const res = await fetch(`${BASE}${path}`, { headers });
  if (!res.ok) throw new Error("Erro na requisição");
  return res.json();
}

const BRL = (v: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);

function todayStr() { return new Date().toISOString().split("T")[0]; }
function firstOfMonthStr() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
}

const COLORS = ["#2B5BA5", "#0BA5A0", "#F47B1E", "#1C3A6E", "#6B80A0", "#a855f7", "#ec4899"];

const FP_LABELS: Record<string, string> = {
  pix: "PIX",
  cartao_credito: "Cartão de Crédito",
  cartao_debito: "Cartão de Débito",
  dinheiro: "Dinheiro",
  transferencia: "Transferência",
  "Não informado": "Não informado",
};

interface Resumo {
  total_agendamentos: number;
  agendamentos_concluidos: number;
  total_receita: number;
  total_recebido: number;
  ticket_medio: number;
  taxa_conclusao: number;
}
interface ServicoItem { servico: string; qtd: number; total: number; total_recebido: number; }
interface ProfItem { profissional_id: number; nome: string; qtd: number; total: number; recebido: number; }
interface FpItem { forma_pagamento: string; qtd: number; total: number; }
interface ClienteItem { cliente_id: number; nome: string; qtd: number; total: number; }

interface Relatorio {
  resumo: Resumo;
  ranking_servicos: ServicoItem[];
  por_profissional: ProfItem[];
  por_forma_pagamento: FpItem[];
  top_clientes: ClienteItem[];
}

export default function Relatorios() {
  const [dataInicio, setDataInicio] = useState(firstOfMonthStr);
  const [dataFim, setDataFim] = useState(todayStr);

  const params = useMemo(() => ({ dataInicio, dataFim }), [dataInicio, dataFim]);

  const { data, isLoading } = useQuery<Relatorio>({
    queryKey: ["relatorios", params],
    queryFn: () => apiFetch(`/api/financeiro/relatorios?data_inicio=${params.dataInicio}&data_fim=${params.dataFim}`),
  });

  const NAVY = "#1C3A6E";
  const BLUE = "#2B5BA5";
  const ORANGE = "#F47B1E";
  const TEAL = "#0BA5A0";
  const BG = "#EEF3FF";
  const MUTED = "#6B80A0";

  const resumo = data?.resumo;
  const maxServQtd = data?.ranking_servicos?.[0]?.qtd ?? 1;
  const maxFpTotal = data?.por_forma_pagamento?.[0]?.total ?? 1;

  const summaryCards = resumo ? [
    { label: "Atendimentos", value: String(resumo.total_agendamentos), sub: `${resumo.agendamentos_concluidos} concluídos`, cor: BLUE, icon: "📋" },
    { label: "Receita Total", value: BRL(resumo.total_receita), sub: `${BRL(resumo.total_recebido)} recebido`, cor: TEAL, icon: "💰" },
    { label: "Ticket Médio", value: BRL(resumo.ticket_medio), sub: "por atendimento pago", cor: ORANGE, icon: "🎫" },
    { label: "Taxa de Conclusão", value: `${resumo.taxa_conclusao}%`, sub: "atendimentos concluídos", cor: NAVY, icon: "✅" },
  ] : [];

  return (
    <Layout>
      <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>

        {/* Header */}
        <section style={{ background: "#fff", borderRadius: 20, padding: 24, boxShadow: "0 4px 14px rgba(0,0,0,0.06)", borderTop: `5px solid ${BLUE}` }}>
          <div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
            <div style={{ width: 54, height: 54, borderRadius: 16, background: `linear-gradient(135deg, ${NAVY}, ${BLUE})`, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, flexShrink: 0 }}>
              📊
            </div>
            <div style={{ flex: 1 }}>
              <p style={{ margin: 0, fontSize: 11, fontWeight: 800, letterSpacing: 1.4, textTransform: "uppercase", color: MUTED }}>Gestão</p>
              <h1 style={{ margin: "5px 0 0", fontSize: 28, lineHeight: 1.1, color: "#111827", fontWeight: 800 }}>Relatórios</h1>
            </div>
            <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                <label style={{ fontSize: 10, fontWeight: 700, color: MUTED, textTransform: "uppercase", letterSpacing: 0.8 }}>De</label>
                <input
                  type="date"
                  value={dataInicio}
                  onChange={(e) => setDataInicio(e.target.value)}
                  style={{ border: `1.5px solid #C5D4EE`, borderRadius: 10, padding: "7px 12px", fontSize: 14, fontWeight: 600, color: NAVY, background: BG, outline: "none" }}
                />
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                <label style={{ fontSize: 10, fontWeight: 700, color: MUTED, textTransform: "uppercase", letterSpacing: 0.8 }}>Até</label>
                <input
                  type="date"
                  value={dataFim}
                  onChange={(e) => setDataFim(e.target.value)}
                  style={{ border: `1.5px solid #C5D4EE`, borderRadius: 10, padding: "7px 12px", fontSize: 14, fontWeight: 600, color: NAVY, background: BG, outline: "none" }}
                />
              </div>
            </div>
          </div>
        </section>

        {isLoading ? (
          <div style={{ display: "flex", justifyContent: "center", padding: 60 }}>
            <div style={{ width: 40, height: 40, borderRadius: "50%", border: `4px solid ${BG}`, borderTop: `4px solid ${BLUE}`, animation: "spin 0.8s linear infinite" }} />
          </div>
        ) : !data ? null : (
          <>
            {/* Summary Cards */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16 }}>
              {summaryCards.map((c) => (
                <div key={c.label} style={{ background: "#fff", borderRadius: 16, padding: "20px 22px", boxShadow: "0 2px 10px rgba(0,0,0,0.06)", borderLeft: `4px solid ${c.cor}` }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                    <span style={{ fontSize: 22 }}>{c.icon}</span>
                    <span style={{ fontSize: 12, fontWeight: 700, color: MUTED, textTransform: "uppercase", letterSpacing: 0.8 }}>{c.label}</span>
                  </div>
                  <p style={{ margin: 0, fontSize: 26, fontWeight: 800, color: c.cor }}>{c.value}</p>
                  <p style={{ margin: "4px 0 0", fontSize: 12, color: MUTED }}>{c.sub}</p>
                </div>
              ))}
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>

              {/* Ranking de Serviços */}
              <div style={{ background: "#fff", borderRadius: 16, padding: 22, boxShadow: "0 2px 10px rgba(0,0,0,0.06)", gridColumn: data.ranking_servicos.length > 5 ? "span 2" : undefined }}>
                <h2 style={{ margin: "0 0 16px", fontSize: 16, fontWeight: 800, color: NAVY }}>🏆 Ranking de Serviços</h2>
                {data.ranking_servicos.length === 0 ? (
                  <p style={{ color: MUTED, fontSize: 14 }}>Nenhum atendimento no período.</p>
                ) : (
                  <div style={{ overflowX: "auto" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                      <thead>
                        <tr style={{ borderBottom: "2px solid #f0f4ff" }}>
                          <th style={{ textAlign: "left", padding: "6px 10px", color: MUTED, fontWeight: 700, fontSize: 11, textTransform: "uppercase" }}>#</th>
                          <th style={{ textAlign: "left", padding: "6px 10px", color: MUTED, fontWeight: 700, fontSize: 11, textTransform: "uppercase" }}>Serviço</th>
                          <th style={{ textAlign: "center", padding: "6px 10px", color: MUTED, fontWeight: 700, fontSize: 11, textTransform: "uppercase" }}>Qtd</th>
                          <th style={{ textAlign: "right", padding: "6px 10px", color: MUTED, fontWeight: 700, fontSize: 11, textTransform: "uppercase" }}>Receita</th>
                          <th style={{ textAlign: "right", padding: "6px 10px", color: MUTED, fontWeight: 700, fontSize: 11, textTransform: "uppercase" }}>Recebido</th>
                          <th style={{ padding: "6px 10px", width: 120 }}></th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.ranking_servicos.map((s, i) => (
                          <tr key={s.servico} style={{ borderBottom: "1px solid #f4f7ff", background: i % 2 === 0 ? "#fff" : "#fafbff" }}>
                            <td style={{ padding: "8px 10px", color: MUTED, fontWeight: 700 }}>{i + 1}</td>
                            <td style={{ padding: "8px 10px", fontWeight: 600, color: "#111827" }}>{s.servico}</td>
                            <td style={{ padding: "8px 10px", textAlign: "center" }}>
                              <span style={{ background: BG, color: BLUE, borderRadius: 8, padding: "2px 10px", fontWeight: 700 }}>{s.qtd}</span>
                            </td>
                            <td style={{ padding: "8px 10px", textAlign: "right", color: "#374151", fontWeight: 600 }}>{BRL(s.total)}</td>
                            <td style={{ padding: "8px 10px", textAlign: "right", color: TEAL, fontWeight: 700 }}>{BRL(s.total_recebido)}</td>
                            <td style={{ padding: "8px 10px" }}>
                              <div style={{ background: "#f0f4ff", borderRadius: 4, height: 6, overflow: "hidden" }}>
                                <div style={{ height: "100%", background: COLORS[i % COLORS.length], borderRadius: 4, width: `${Math.round((s.qtd / maxServQtd) * 100)}%` }} />
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Por Profissional */}
              {data.por_profissional.length > 0 && (
                <div style={{ background: "#fff", borderRadius: 16, padding: 22, boxShadow: "0 2px 10px rgba(0,0,0,0.06)" }}>
                  <h2 style={{ margin: "0 0 16px", fontSize: 16, fontWeight: 800, color: NAVY }}>👤 Por Profissional</h2>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                    <thead>
                      <tr style={{ borderBottom: "2px solid #f0f4ff" }}>
                        <th style={{ textAlign: "left", padding: "6px 10px", color: MUTED, fontWeight: 700, fontSize: 11, textTransform: "uppercase" }}>Profissional</th>
                        <th style={{ textAlign: "center", padding: "6px 10px", color: MUTED, fontWeight: 700, fontSize: 11, textTransform: "uppercase" }}>Atend.</th>
                        <th style={{ textAlign: "right", padding: "6px 10px", color: MUTED, fontWeight: 700, fontSize: 11, textTransform: "uppercase" }}>Receita</th>
                        <th style={{ textAlign: "right", padding: "6px 10px", color: MUTED, fontWeight: 700, fontSize: 11, textTransform: "uppercase" }}>Recebido</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.por_profissional.map((p, i) => (
                        <tr key={p.profissional_id} style={{ borderBottom: "1px solid #f4f7ff", background: i % 2 === 0 ? "#fff" : "#fafbff" }}>
                          <td style={{ padding: "8px 10px", fontWeight: 600, color: "#111827" }}>{p.nome}</td>
                          <td style={{ padding: "8px 10px", textAlign: "center" }}>
                            <span style={{ background: BG, color: BLUE, borderRadius: 8, padding: "2px 10px", fontWeight: 700 }}>{p.qtd}</span>
                          </td>
                          <td style={{ padding: "8px 10px", textAlign: "right", color: "#374151", fontWeight: 600 }}>{BRL(p.total)}</td>
                          <td style={{ padding: "8px 10px", textAlign: "right", color: TEAL, fontWeight: 700 }}>{BRL(p.recebido)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Formas de Pagamento */}
              {data.por_forma_pagamento.length > 0 && (
                <div style={{ background: "#fff", borderRadius: 16, padding: 22, boxShadow: "0 2px 10px rgba(0,0,0,0.06)" }}>
                  <h2 style={{ margin: "0 0 16px", fontSize: 16, fontWeight: 800, color: NAVY }}>💳 Formas de Pagamento</h2>
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    {data.por_forma_pagamento.map((fp, i) => (
                      <div key={fp.forma_pagamento}>
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                          <span style={{ fontSize: 13, fontWeight: 600, color: "#111827" }}>{FP_LABELS[fp.forma_pagamento] ?? fp.forma_pagamento}</span>
                          <div style={{ display: "flex", gap: 12 }}>
                            <span style={{ fontSize: 12, color: MUTED }}>{fp.qtd}x</span>
                            <span style={{ fontSize: 13, fontWeight: 700, color: COLORS[i % COLORS.length] }}>{BRL(fp.total)}</span>
                          </div>
                        </div>
                        <div style={{ background: "#f0f4ff", borderRadius: 6, height: 8, overflow: "hidden" }}>
                          <div style={{ height: "100%", background: COLORS[i % COLORS.length], borderRadius: 6, width: `${Math.round((fp.total / maxFpTotal) * 100)}%`, transition: "width 0.4s" }} />
                        </div>
                      </div>
                    ))}
                  </div>
                  <div style={{ marginTop: 16, paddingTop: 12, borderTop: "1px solid #f0f4ff", display: "flex", justifyContent: "space-between" }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: MUTED }}>Total recebido</span>
                    <span style={{ fontSize: 15, fontWeight: 800, color: TEAL }}>{BRL(data.por_forma_pagamento.reduce((s, f) => s + f.total, 0))}</span>
                  </div>
                </div>
              )}

              {/* Gráfico de serviços */}
              {data.ranking_servicos.length > 0 && (
                <div style={{ background: "#fff", borderRadius: 16, padding: 22, boxShadow: "0 2px 10px rgba(0,0,0,0.06)" }}>
                  <h2 style={{ margin: "0 0 16px", fontSize: 16, fontWeight: 800, color: NAVY }}>📈 Receita por Serviço</h2>
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={data.ranking_servicos.slice(0, 8)} margin={{ top: 4, right: 4, bottom: 40, left: 4 }}>
                      <XAxis
                        dataKey="servico"
                        tick={{ fontSize: 10, fill: MUTED }}
                        angle={-35}
                        textAnchor="end"
                        interval={0}
                      />
                      <YAxis tick={{ fontSize: 10, fill: MUTED }} tickFormatter={(v) => `R$${v}`} />
                      <Tooltip
                        formatter={(value: number) => [BRL(value), "Recebido"]}
                        contentStyle={{ fontSize: 12, borderRadius: 8 }}
                      />
                      <Bar dataKey="total_recebido" radius={[4, 4, 0, 0]}>
                        {data.ranking_servicos.slice(0, 8).map((_, idx) => (
                          <Cell key={idx} fill={COLORS[idx % COLORS.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}

              {/* Top Clientes */}
              {data.top_clientes.length > 0 && (
                <div style={{ background: "#fff", borderRadius: 16, padding: 22, boxShadow: "0 2px 10px rgba(0,0,0,0.06)" }}>
                  <h2 style={{ margin: "0 0 16px", fontSize: 16, fontWeight: 800, color: NAVY }}>⭐ Top Clientes</h2>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                    <thead>
                      <tr style={{ borderBottom: "2px solid #f0f4ff" }}>
                        <th style={{ textAlign: "left", padding: "6px 10px", color: MUTED, fontWeight: 700, fontSize: 11, textTransform: "uppercase" }}>#</th>
                        <th style={{ textAlign: "left", padding: "6px 10px", color: MUTED, fontWeight: 700, fontSize: 11, textTransform: "uppercase" }}>Cliente</th>
                        <th style={{ textAlign: "center", padding: "6px 10px", color: MUTED, fontWeight: 700, fontSize: 11, textTransform: "uppercase" }}>Visitas</th>
                        <th style={{ textAlign: "right", padding: "6px 10px", color: MUTED, fontWeight: 700, fontSize: 11, textTransform: "uppercase" }}>Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.top_clientes.map((c, i) => (
                        <tr key={c.cliente_id} style={{ borderBottom: "1px solid #f4f7ff", background: i % 2 === 0 ? "#fff" : "#fafbff" }}>
                          <td style={{ padding: "8px 10px", color: i < 3 ? ORANGE : MUTED, fontWeight: 800 }}>
                            {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `${i + 1}º`}
                          </td>
                          <td style={{ padding: "8px 10px", fontWeight: 600, color: "#111827" }}>{c.nome}</td>
                          <td style={{ padding: "8px 10px", textAlign: "center" }}>
                            <span style={{ background: BG, color: BLUE, borderRadius: 8, padding: "2px 10px", fontWeight: 700 }}>{c.qtd}</span>
                          </td>
                          <td style={{ padding: "8px 10px", textAlign: "right", color: NAVY, fontWeight: 700 }}>{BRL(c.total)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

            </div>

            {/* Estado vazio */}
            {resumo && resumo.total_agendamentos === 0 && (
              <div style={{ textAlign: "center", padding: "40px 20px", color: MUTED }}>
                <p style={{ fontSize: 40, margin: "0 0 12px" }}>📭</p>
                <p style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>Nenhum atendimento no período selecionado</p>
                <p style={{ fontSize: 13, margin: "6px 0 0" }}>Altere as datas para ver os dados</p>
              </div>
            )}
          </>
        )}

      </div>
    </Layout>
  );
}
