import { useState, useMemo } from "react";
import { Layout } from "@/components/layout";
import { useGetDashboardGraficos, getGetDashboardGraficosQueryKey } from "@workspace/api-client-react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, LineChart, Line, Legend } from "recharts";

type DashboardResumo = {
  receita_recebida: number;
  despesas_total: number;
  agendamentos_concluidos: number;
  lucro_liquido: number;
  novos_clientes: number;
};

const anoAtual = new Date().getFullYear();
const ANOS = [anoAtual - 2, anoAtual - 1, anoAtual];

const inputStyle: React.CSSProperties = {
  border: "1.5px solid #C5D4EE",
  borderRadius: 10,
  padding: "7px 12px",
  fontSize: 14,
  fontWeight: 600,
  color: "#1C3A6E",
  background: "#EEF3FF",
  cursor: "pointer",
  outline: "none",
};

const selectStyle: React.CSSProperties = {
  ...inputStyle,
  cursor: "pointer",
};

function todayStr() {
  return new Date().toISOString().split("T")[0];
}

function firstOfMonthStr() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
}

export default function Dashboard() {
  const now = new Date();
  const [dataInicio, setDataInicio] = useState(firstOfMonthStr);
  const [dataFim, setDataFim] = useState(todayStr);
  const [ano, setAno] = useState(now.getFullYear());

  const params = useMemo(() => ({ data_inicio: dataInicio, data_fim: dataFim }), [dataInicio, dataFim]);

  const { data: resumo } = useQuery<DashboardResumo>({
    queryKey: ["dashboard-resumo", params],
    queryFn: async () => {
      const token = localStorage.getItem("vendlysys_token");
      const r = await fetch(
        `/api/dashboard/resumo?data_inicio=${params.data_inicio}&data_fim=${params.data_fim}`,
        {
          credentials: "include",
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        }
      );
      if (!r.ok) throw new Error("Erro ao carregar resumo");
      return r.json();
    },
    enabled: !!params.data_inicio && !!params.data_fim,
  });

  const graficosParams = useMemo(() => ({ ano }), [ano]);
  const { data: graficos } = useGetDashboardGraficos(
    graficosParams,
    { query: { enabled: true, queryKey: getGetDashboardGraficosQueryKey(graficosParams) } }
  );

  const fmt = (v: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);

  return (
    <Layout>
      <div className="flex flex-col gap-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <h1 className="text-3xl font-bold tracking-tight">Dashboard Gerencial</h1>
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <span style={{ fontSize: 13, color: "#6B80A0", fontWeight: 500 }}>Período:</span>
            <input
              type="date"
              value={dataInicio}
              max={dataFim}
              onChange={(e) => setDataInicio(e.target.value)}
              style={inputStyle}
            />
            <span style={{ fontSize: 13, color: "#6B80A0" }}>até</span>
            <input
              type="date"
              value={dataFim}
              min={dataInicio}
              max={todayStr()}
              onChange={(e) => setDataFim(e.target.value)}
              style={inputStyle}
            />
            <select
              value={ano}
              onChange={(e) => setAno(Number(e.target.value))}
              style={selectStyle}
              title="Ano dos gráficos"
            >
              {ANOS.map((a) => (
                <option key={a} value={a}>{a} (gráficos)</option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Receita Recebida</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-primary">
                {fmt(resumo?.receita_recebida || 0)}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Saídas</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">
                {fmt(resumo?.despesas_total || 0)}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Agendamentos</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{resumo?.agendamentos_concluidos || 0}</div>
              <p className="text-xs text-muted-foreground mt-1">Concluídos no período</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Lucro Líquido</CardTitle>
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${(resumo?.lucro_liquido || 0) >= 0 ? "text-green-600" : "text-red-600"}`}>
                {fmt(resumo?.lucro_liquido || 0)}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Novos Clientes</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{resumo?.novos_clientes || 0}</div>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Receita x Despesas ({ano})</CardTitle>
            </CardHeader>
            <CardContent className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={graficos?.receita_por_mes || []}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.3} />
                  <XAxis dataKey="mes_nome" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis fontSize={12} tickLine={false} axisLine={false} tickFormatter={(val) => `R$ ${val}`} />
                  <Tooltip formatter={(value) => fmt(value as number)} />
                  <Legend />
                  <Bar dataKey="receita" fill="hsl(var(--primary))" name="Receita" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="despesas" fill="hsl(var(--destructive))" name="Despesas" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Agendamentos por Mês ({ano})</CardTitle>
            </CardHeader>
            <CardContent className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={graficos?.agendamentos_por_mes || []}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.3} />
                  <XAxis dataKey="mes_nome" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis fontSize={12} tickLine={false} axisLine={false} />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="total" stroke="hsl(var(--muted-foreground))" name="Total" strokeWidth={2} />
                  <Line type="monotone" dataKey="concluidos" stroke="hsl(var(--primary))" name="Concluídos" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
}
