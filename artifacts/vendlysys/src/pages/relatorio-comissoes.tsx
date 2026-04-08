import { useState } from "react";
import { Layout } from "@/components/layout";
import { useQuery } from "@tanstack/react-query";

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

type Comissao = {
  profissional_id: number;
  profissional_nome: string;
  comissao_percentual: number;
  total_servicos: number;
  total_recebido: number;
  valor_comissao: number;
  qtd_atendimentos: number;
};

const NAVY = "#1C3A6E";
const BLUE = "#2B5BA5";
const ORANGE = "#F47B1E";
const TEAL = "#0BA5A0";
const BG = "#EEF3FF";

export default function RelatorioComissoes() {
  const [inicio, setInicio] = useState(firstOfMonthStr());
  const [fim, setFim] = useState(todayStr());

  const { data, isLoading, refetch } = useQuery<{ comissoes: Comissao[]; total_comissoes: number }>({
    queryKey: ["comissoes", inicio, fim],
    queryFn: () => apiFetch(`/api/financeiro/comissoes?data_inicio=${inicio}&data_fim=${fim}`),
    enabled: !!inicio && !!fim,
  });

  const comissoes = data?.comissoes ?? [];
  const totalComissoes = data?.total_comissoes ?? 0;
  const totalServicos = comissoes.reduce((s, c) => s + c.total_servicos, 0);
  const totalRecebido = comissoes.reduce((s, c) => s + c.total_recebido, 0);
  const totalAtendimentos = comissoes.reduce((s, c) => s + c.qtd_atendimentos, 0);

  const inputStyle: React.CSSProperties = {
    border: "1.5px solid #ddd",
    borderRadius: 8,
    padding: "9px 12px",
    fontSize: 14,
    outline: "none",
    background: "#fff",
  };

  const cardStyle: React.CSSProperties = {
    background: "#fff",
    borderRadius: 14,
    padding: "20px 22px",
    boxShadow: "0 1px 6px rgba(0,0,0,0.06)",
    border: "1px solid #e8eef8",
  };

  return (
    <Layout>
      <div style={{ padding: "28px 32px", maxWidth: 1000, margin: "0 auto" }}>
        <div style={{ marginBottom: 28 }}>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: NAVY, margin: 0 }}>Relatório de Comissões</h1>
          <p style={{ fontSize: 14, color: "#6B80A0", margin: "6px 0 0" }}>
            Extrato de comissões por profissional no período selecionado
          </p>
        </div>

        {/* Filtros */}
        <div style={{ ...cardStyle, marginBottom: 24, display: "flex", gap: 16, flexWrap: "wrap", alignItems: "flex-end" }}>
          <div>
            <label style={{ fontSize: 12, fontWeight: 700, color: "#6B80A0", display: "block", marginBottom: 5 }}>Data início</label>
            <input type="date" value={inicio} onChange={(e) => setInicio(e.target.value)} style={inputStyle} />
          </div>
          <div>
            <label style={{ fontSize: 12, fontWeight: 700, color: "#6B80A0", display: "block", marginBottom: 5 }}>Data fim</label>
            <input type="date" value={fim} onChange={(e) => setFim(e.target.value)} style={inputStyle} />
          </div>
          <button
            type="button"
            onClick={() => refetch()}
            style={{ background: BLUE, color: "#fff", border: "none", borderRadius: 8, padding: "9px 20px", fontWeight: 700, fontSize: 14, cursor: "pointer" }}
          >
            Atualizar
          </button>
        </div>

        {/* Cards resumo */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 16, marginBottom: 28 }}>
          {[
            { label: "Total em Serviços", value: BRL(totalServicos), color: NAVY },
            { label: "Total Recebido", value: BRL(totalRecebido), color: TEAL },
            { label: "Total Comissões", value: BRL(totalComissoes), color: ORANGE },
            { label: "Atendimentos", value: String(totalAtendimentos), color: BLUE },
          ].map((c) => (
            <div key={c.label} style={cardStyle}>
              <div style={{ fontSize: 12, color: "#6B80A0", fontWeight: 600, marginBottom: 6 }}>{c.label}</div>
              <div style={{ fontSize: 22, fontWeight: 800, color: c.color }}>{c.value}</div>
            </div>
          ))}
        </div>

        {/* Tabela */}
        <div style={{ ...cardStyle, overflowX: "auto" }}>
          <h2 style={{ fontSize: 15, fontWeight: 700, color: NAVY, margin: "0 0 16px" }}>Detalhamento por Profissional</h2>

          {isLoading ? (
            <div style={{ textAlign: "center", padding: 40, color: "#6B80A0" }}>Carregando...</div>
          ) : comissoes.length === 0 ? (
            <div style={{ textAlign: "center", padding: 40, color: "#9ca3af" }}>
              <div style={{ fontSize: 32, marginBottom: 8 }}>📋</div>
              <div>Nenhum dado no período selecionado</div>
            </div>
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
              <thead>
                <tr style={{ borderBottom: "2px solid #EEF3FF" }}>
                  {["Profissional", "Atendimentos", "Total Serviços", "Total Recebido", "% Comissão", "Valor Comissão"].map((h) => (
                    <th key={h} style={{ textAlign: "left", padding: "10px 14px", fontSize: 12, fontWeight: 700, color: "#6B80A0", whiteSpace: "nowrap" }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {comissoes.map((c, i) => (
                  <tr key={c.profissional_id} style={{ borderBottom: "1px solid #f0f4fb", background: i % 2 === 0 ? "#fff" : BG }}>
                    <td style={{ padding: "12px 14px", fontWeight: 600, color: NAVY }}>
                      {c.profissional_nome}
                    </td>
                    <td style={{ padding: "12px 14px", color: "#374151" }}>{c.qtd_atendimentos}</td>
                    <td style={{ padding: "12px 14px", color: "#374151" }}>{BRL(c.total_servicos)}</td>
                    <td style={{ padding: "12px 14px", color: TEAL, fontWeight: 600 }}>{BRL(c.total_recebido)}</td>
                    <td style={{ padding: "12px 14px" }}>
                      <span style={{ background: "#EEF3FF", color: BLUE, borderRadius: 20, padding: "3px 10px", fontWeight: 700, fontSize: 12 }}>
                        {c.comissao_percentual}%
                      </span>
                    </td>
                    <td style={{ padding: "12px 14px", fontWeight: 800, color: ORANGE }}>
                      {BRL(c.valor_comissao)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr style={{ borderTop: "2px solid #EEF3FF", background: "#f8faff" }}>
                  <td style={{ padding: "12px 14px", fontWeight: 800, color: NAVY }}>TOTAL</td>
                  <td style={{ padding: "12px 14px", fontWeight: 700 }}>{totalAtendimentos}</td>
                  <td style={{ padding: "12px 14px", fontWeight: 700 }}>{BRL(totalServicos)}</td>
                  <td style={{ padding: "12px 14px", fontWeight: 700, color: TEAL }}>{BRL(totalRecebido)}</td>
                  <td />
                  <td style={{ padding: "12px 14px", fontWeight: 800, color: ORANGE }}>{BRL(totalComissoes)}</td>
                </tr>
              </tfoot>
            </table>
          )}
        </div>

        {/* Explicação do cálculo */}
        <div style={{ marginTop: 16, padding: "12px 16px", background: "#fffbf5", border: "1px solid #fde68a", borderRadius: 10, fontSize: 13, color: "#92400e" }}>
          💡 A comissão é calculada apenas sobre os atendimentos <strong>recebidos (pagos)</strong> no período.
          O percentual de cada profissional é configurado na tela de <strong>Profissionais</strong>.
        </div>
      </div>
    </Layout>
  );
}
