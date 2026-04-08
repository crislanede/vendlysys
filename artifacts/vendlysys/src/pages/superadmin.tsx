import { useState, useEffect } from "react";

const STORAGE_KEY = "vendlysys_admin_key";
const DEFAULT_KEY = "vendlysys-admin-2026";

interface Empresa {
  id: number;
  nome: string;
  slug: string;
  plano_status: string;
  plano_expira_em: string | null;
  criado_em: string;
  total_usuarios: number;
  total_agendamentos: number;
  agendamentos_mes: number;
}

function getApiBase() {
  const base = (import.meta as any).env?.BASE_URL ?? "/";
  return base.endsWith("/") ? `${base}api` : `${base}/api`;
}

const STATUS_COLORS: Record<string, { bg: string; text: string; label: string }> = {
  trial:    { bg: "#fef3c7", text: "#92400e", label: "Trial" },
  ativo:    { bg: "#d1fae5", text: "#065f46", label: "Ativo" },
  inativo:  { bg: "#fee2e2", text: "#991b1b", label: "Inativo" },
  vitalicio:{ bg: "#ede9fe", text: "#4c1d95", label: "Vitalício" },
};

export default function Superadmin() {
  const [chave, setChave] = useState(localStorage.getItem(STORAGE_KEY) || "");
  const [autenticado, setAutenticado] = useState(false);
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState("");
  const [busca, setBusca] = useState("");
  const [editando, setEditando] = useState<{ id: number; status: string; dias: string } | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [filtroStatus, setFiltroStatus] = useState("todos");

  async function carregar(key: string) {
    setLoading(true);
    setErro("");
    try {
      const res = await fetch(`${getApiBase()}/admin/empresas`, {
        headers: { "x-admin-key": key },
      });
      if (!res.ok) {
        setErro("Chave inválida. Verifique e tente novamente.");
        setAutenticado(false);
        return;
      }
      const data = await res.json();
      setEmpresas(data);
      setAutenticado(true);
      localStorage.setItem(STORAGE_KEY, key);
    } catch {
      setErro("Erro ao conectar. Verifique a conexão.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) carregar(saved);
  }, []);

  async function salvarPlano() {
    if (!editando) return;
    setSalvando(true);
    try {
      await fetch(`${getApiBase()}/admin/empresas/${editando.id}/plano`, {
        method: "PATCH",
        headers: { "x-admin-key": chave, "Content-Type": "application/json" },
        body: JSON.stringify({ plano_status: editando.status, dias: Number(editando.dias) }),
      });
      setEditando(null);
      await carregar(chave);
    } finally {
      setSalvando(false);
    }
  }

  const filtradas = empresas.filter(e => {
    const ok = busca === "" || e.nome.toLowerCase().includes(busca.toLowerCase()) || e.slug.includes(busca.toLowerCase());
    const statusOk = filtroStatus === "todos" || e.plano_status === filtroStatus;
    return ok && statusOk;
  });

  const totais = {
    total: empresas.length,
    ativas: empresas.filter(e => e.plano_status === "ativo" || e.plano_status === "vitalicio").length,
    trial: empresas.filter(e => e.plano_status === "trial").length,
    inativas: empresas.filter(e => e.plano_status === "inativo").length,
    agendamentosMes: empresas.reduce((s, e) => s + Number(e.agendamentos_mes), 0),
  };

  if (!autenticado) {
    return (
      <div style={{ minHeight: "100vh", background: "linear-gradient(135deg, #1C3A6E 0%, #0BA5A0 100%)", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
        <div style={{ background: "#fff", borderRadius: 24, padding: 48, maxWidth: 420, width: "100%", boxShadow: "0 20px 60px rgba(0,0,0,0.3)", textAlign: "center" }}>
          <div style={{ fontSize: 48, marginBottom: 8 }}>🛡️</div>
          <h1 style={{ fontSize: 22, fontWeight: 900, color: "#1C3A6E", margin: "0 0 4px" }}>Superadmin</h1>
          <p style={{ color: "#6B80A0", fontSize: 14, margin: "0 0 32px" }}>VendlySys · Painel de Gestão de Empresas</p>

          {erro && (
            <div style={{ background: "#fee2e2", color: "#991b1b", borderRadius: 12, padding: "10px 16px", fontSize: 13, marginBottom: 16 }}>
              {erro}
            </div>
          )}

          <div style={{ textAlign: "left", marginBottom: 16 }}>
            <label style={{ fontSize: 12, fontWeight: 700, color: "#6B80A0", display: "block", marginBottom: 6 }}>CHAVE DE ACESSO</label>
            <input
              type="password"
              value={chave}
              onChange={e => setChave(e.target.value)}
              onKeyDown={e => e.key === "Enter" && carregar(chave)}
              placeholder="••••••••••••••••"
              style={{ width: "100%", border: "1.5px solid #e5e7eb", borderRadius: 12, padding: "12px 16px", fontSize: 14, outline: "none", boxSizing: "border-box" }}
            />
          </div>

          <button
            onClick={() => carregar(chave)}
            disabled={loading || !chave}
            style={{ width: "100%", background: loading ? "#93c5fd" : "linear-gradient(135deg, #1C3A6E, #2B5BA5)", color: "#fff", border: 0, borderRadius: 14, padding: "14px 0", fontWeight: 800, fontSize: 15, cursor: loading ? "not-allowed" : "pointer" }}
          >
            {loading ? "Entrando..." : "Acessar →"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: "#f1f5f9" }}>
      {/* Header */}
      <div style={{ background: "linear-gradient(135deg, #1C3A6E, #2B5BA5)", padding: "20px 32px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ fontSize: 28 }}>🛡️</span>
          <div>
            <div style={{ color: "#fff", fontWeight: 900, fontSize: 18 }}>Superadmin — VendlySys</div>
            <div style={{ color: "#93c5fd", fontSize: 12 }}>Painel de gestão de empresas</div>
          </div>
        </div>
        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          <button
            onClick={() => carregar(chave)}
            style={{ background: "rgba(255,255,255,0.15)", color: "#fff", border: "1px solid rgba(255,255,255,0.3)", borderRadius: 10, padding: "8px 16px", fontSize: 13, fontWeight: 600, cursor: "pointer" }}
          >
            ↻ Atualizar
          </button>
          <button
            onClick={() => { localStorage.removeItem(STORAGE_KEY); setAutenticado(false); setChave(""); }}
            style={{ background: "rgba(239,68,68,0.2)", color: "#fca5a5", border: "1px solid rgba(239,68,68,0.3)", borderRadius: 10, padding: "8px 16px", fontSize: 13, fontWeight: 600, cursor: "pointer" }}
          >
            Sair
          </button>
        </div>
      </div>

      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "28px 24px" }}>

        {/* Métricas */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 16, marginBottom: 28 }}>
          {[
            { label: "Total de empresas", value: totais.total, icon: "🏢", color: "#1C3A6E" },
            { label: "Ativas / Vitalício", value: totais.ativas, icon: "✅", color: "#059669" },
            { label: "Em trial", value: totais.trial, icon: "⏳", color: "#d97706" },
            { label: "Inativas", value: totais.inativas, icon: "🔒", color: "#dc2626" },
            { label: "Agendamentos (mês)", value: totais.agendamentosMes, icon: "📅", color: "#2B5BA5" },
          ].map((m, i) => (
            <div key={i} style={{ background: "#fff", borderRadius: 16, padding: "20px 20px", boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
              <div style={{ fontSize: 24, marginBottom: 8 }}>{m.icon}</div>
              <div style={{ fontSize: 28, fontWeight: 900, color: m.color }}>{m.value}</div>
              <div style={{ fontSize: 12, color: "#6B80A0", marginTop: 2 }}>{m.label}</div>
            </div>
          ))}
        </div>

        {/* Filtros */}
        <div style={{ background: "#fff", borderRadius: 16, padding: "16px 20px", marginBottom: 20, display: "flex", gap: 12, alignItems: "center", boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
          <input
            type="text"
            placeholder="Buscar empresa..."
            value={busca}
            onChange={e => setBusca(e.target.value)}
            style={{ flex: 1, border: "1.5px solid #e5e7eb", borderRadius: 10, padding: "9px 14px", fontSize: 14, outline: "none" }}
          />
          <select
            value={filtroStatus}
            onChange={e => setFiltroStatus(e.target.value)}
            style={{ border: "1.5px solid #e5e7eb", borderRadius: 10, padding: "9px 14px", fontSize: 14, outline: "none", background: "#fff", color: "#374151" }}
          >
            <option value="todos">Todos os status</option>
            <option value="trial">Trial</option>
            <option value="ativo">Ativo</option>
            <option value="inativo">Inativo</option>
            <option value="vitalicio">Vitalício</option>
          </select>
          <span style={{ fontSize: 13, color: "#6B80A0", whiteSpace: "nowrap" }}>{filtradas.length} resultado{filtradas.length !== 1 ? "s" : ""}</span>
        </div>

        {/* Tabela */}
        <div style={{ background: "#fff", borderRadius: 16, boxShadow: "0 1px 4px rgba(0,0,0,0.06)", overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "#f8fafc", borderBottom: "1px solid #e5e7eb" }}>
                {["Empresa", "Slug", "Status", "Vencimento", "Usuários", "Agendamentos", "Mês atual", "Cadastro", "Ações"].map(h => (
                  <th key={h} style={{ padding: "12px 16px", textAlign: "left", fontSize: 11, fontWeight: 700, color: "#6B80A0", textTransform: "uppercase", letterSpacing: "0.05em" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtradas.length === 0 ? (
                <tr>
                  <td colSpan={9} style={{ padding: 48, textAlign: "center", color: "#6B80A0", fontSize: 14 }}>
                    {empresas.length === 0 ? "Nenhuma empresa cadastrada ainda." : "Nenhum resultado para a busca."}
                  </td>
                </tr>
              ) : filtradas.map((e, i) => {
                const st = STATUS_COLORS[e.plano_status] ?? { bg: "#f3f4f6", text: "#374151", label: e.plano_status };
                const venc = e.plano_expira_em ? new Date(e.plano_expira_em).toLocaleDateString("pt-BR") : "—";
                const cad = new Date(e.criado_em).toLocaleDateString("pt-BR");
                const vencido = e.plano_expira_em && new Date(e.plano_expira_em) < new Date() && e.plano_status === "ativo";
                return (
                  <tr key={e.id} style={{ borderBottom: "1px solid #f1f5f9", background: i % 2 === 0 ? "#fff" : "#fafafa" }}>
                    <td style={{ padding: "14px 16px" }}>
                      <div style={{ fontWeight: 700, color: "#1C3A6E", fontSize: 14 }}>{e.nome}</div>
                      <div style={{ color: "#9ca3af", fontSize: 11 }}>ID #{e.id}</div>
                    </td>
                    <td style={{ padding: "14px 16px" }}>
                      <code style={{ background: "#f1f5f9", borderRadius: 6, padding: "2px 8px", fontSize: 12, color: "#374151" }}>{e.slug}</code>
                    </td>
                    <td style={{ padding: "14px 16px" }}>
                      <span style={{ background: st.bg, color: st.text, borderRadius: 20, padding: "3px 12px", fontSize: 12, fontWeight: 700 }}>
                        {st.label}
                      </span>
                    </td>
                    <td style={{ padding: "14px 16px", fontSize: 13, color: vencido ? "#dc2626" : "#374151", fontWeight: vencido ? 700 : 400 }}>
                      {venc}{vencido ? " ⚠️" : ""}
                    </td>
                    <td style={{ padding: "14px 16px", fontSize: 13, color: "#374151", textAlign: "center" }}>{e.total_usuarios}</td>
                    <td style={{ padding: "14px 16px", fontSize: 13, color: "#374151", textAlign: "center" }}>{e.total_agendamentos}</td>
                    <td style={{ padding: "14px 16px", fontSize: 13, color: "#374151", textAlign: "center" }}>{e.agendamentos_mes}</td>
                    <td style={{ padding: "14px 16px", fontSize: 12, color: "#6B80A0" }}>{cad}</td>
                    <td style={{ padding: "14px 16px" }}>
                      <button
                        onClick={() => setEditando({ id: e.id, status: e.plano_status, dias: "30" })}
                        style={{ background: "#EEF3FF", color: "#1C3A6E", border: 0, borderRadius: 8, padding: "6px 12px", fontSize: 12, fontWeight: 700, cursor: "pointer" }}
                      >
                        ✏️ Plano
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal editar plano */}
      {editando && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9999 }}>
          <div style={{ background: "#fff", borderRadius: 20, padding: 32, maxWidth: 380, width: "100%", boxShadow: "0 20px 60px rgba(0,0,0,0.3)" }}>
            <h3 style={{ margin: "0 0 20px", fontWeight: 800, color: "#1C3A6E", fontSize: 17 }}>Alterar Plano</h3>
            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 12, fontWeight: 700, color: "#6B80A0", display: "block", marginBottom: 6 }}>STATUS</label>
              <select
                value={editando.status}
                onChange={e => setEditando({ ...editando, status: e.target.value })}
                style={{ width: "100%", border: "1.5px solid #e5e7eb", borderRadius: 10, padding: "10px 14px", fontSize: 14, outline: "none" }}
              >
                <option value="trial">Trial</option>
                <option value="ativo">Ativo</option>
                <option value="inativo">Inativo</option>
                <option value="vitalicio">Vitalício</option>
              </select>
            </div>
            {editando.status === "ativo" && (
              <div style={{ marginBottom: 20 }}>
                <label style={{ fontSize: 12, fontWeight: 700, color: "#6B80A0", display: "block", marginBottom: 6 }}>DIAS DE ACESSO</label>
                <input
                  type="number"
                  value={editando.dias}
                  onChange={e => setEditando({ ...editando, dias: e.target.value })}
                  style={{ width: "100%", border: "1.5px solid #e5e7eb", borderRadius: 10, padding: "10px 14px", fontSize: 14, outline: "none", boxSizing: "border-box" }}
                />
              </div>
            )}
            <div style={{ display: "flex", gap: 10 }}>
              <button
                onClick={() => setEditando(null)}
                style={{ flex: 1, background: "#f1f5f9", color: "#374151", border: 0, borderRadius: 12, padding: "12px 0", fontWeight: 700, cursor: "pointer" }}
              >
                Cancelar
              </button>
              <button
                onClick={salvarPlano}
                disabled={salvando}
                style={{ flex: 1, background: "linear-gradient(135deg, #1C3A6E, #2B5BA5)", color: "#fff", border: 0, borderRadius: 12, padding: "12px 0", fontWeight: 800, cursor: "pointer" }}
              >
                {salvando ? "Salvando..." : "Salvar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
