import { useAuth } from "@/hooks/use-auth";
import { Layout } from "@/components/layout";
import { useState, useEffect } from "react";
import { TrendingUp, Cake } from "lucide-react";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

function hojeISO() {
  return new Date().toISOString().split("T")[0];
}

interface ProfissionalDia {
  profissional_id: number | null;
  profissional_nome: string;
  total: number;
  count: number;
}

interface Aniversariante {
  id: number;
  nome: string;
  telefone: string | null;
  data_nascimento: string | null;
}

function authHeader(): HeadersInit {
  const token = localStorage.getItem("vendlysys_token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

function useAniversariantes() {
  const [lista, setLista] = useState<Aniversariante[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    fetch(`${BASE}/api/clientes/aniversariantes`, { headers: authHeader() })
      .then((r) => r.json())
      .then((json) => setLista(Array.isArray(json) ? json : []))
      .catch(() => setLista([]))
      .finally(() => setLoading(false));
  }, []);

  return { lista, loading };
}

function useFechamentoDia(data: string) {
  const [resultado, setResultado] = useState<ProfissionalDia[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    fetch(`${BASE}/api/fechamento-dia?data=${data}`, { headers: authHeader() })
      .then((r) => r.json())
      .then((json) => setResultado(json.resultado ?? []))
      .catch(() => setResultado([]))
      .finally(() => setLoading(false));
  }, [data]);

  return { resultado, loading };
}

const MESES_PT = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];

function formatarDataNascimento(data: string | null): string {
  if (!data) return "";
  try {
    const [, mes, dia] = data.split("-");
    return `${parseInt(dia)} de ${MESES_PT[parseInt(mes) - 1]}`;
  } catch {
    return data;
  }
}

export default function Inicio() {
  const { usuario, empresa, isAdmin } = useAuth();
  const [dataDia, setDataDia] = useState(hojeISO());
  const { resultado: fechamento, loading: loadingFechamento } = useFechamentoDia(dataDia);
  const { lista: aniversariantes, loading: loadingAniv } = useAniversariantes();

  const perfil = usuario?.perfil || "agenda";

  const totalDia = fechamento.reduce((acc, p) => acc + p.total, 0);
  const totalAtendimentos = fechamento.reduce((acc, p) => acc + p.count, 0);

  const corPrimaria = (empresa as any)?.cor_primaria || "#b8956f";
  const corSecundaria = (empresa as any)?.cor_secundaria || "#59463b";

  return (
    <Layout>
      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        {/* Hero section */}
        <section
          style={{
            background: "#ffffff",
            borderRadius: 20,
            padding: 24,
            boxShadow: "0 4px 14px rgba(0,0,0,0.06)",
            borderTop: `5px solid ${corPrimaria}`,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: 13,
                background: empresa?.logo_url ? "#fff" : `linear-gradient(135deg, ${corSecundaria}, ${corPrimaria})`,
                color: "#fff",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontWeight: 900,
                fontSize: 17,
                flexShrink: 0,
                boxShadow: "0 4px 12px rgba(0,0,0,0.10)",
                overflow: "hidden",
                padding: empresa?.logo_url ? 3 : 0,
              }}
            >
              {empresa?.logo_url ? (
                <img src={empresa.logo_url} alt={empresa.nome} style={{ width: "100%", height: "100%", objectFit: "contain", borderRadius: 9 }} />
              ) : (
                empresa?.nome?.charAt(0).toUpperCase() || "V"
              )}
            </div>
            <div>
              <p style={{ margin: 0, fontSize: 10, fontWeight: 800, letterSpacing: 1.4, textTransform: "uppercase", color: "#6b7280" }}>
                Central do sistema
              </p>
              <h1 style={{ margin: "4px 0 0", fontSize: 22, lineHeight: 1.2, color: "#111827", fontWeight: 800 }}>
                Olá, {usuario?.nome?.split(" ")[0]}
              </h1>
              <p style={{ margin: "5px 0 0", fontSize: 13, color: "#6b7280" }}>
                Bem-vindo ao painel da <strong>{empresa?.nome}</strong>.
              </p>
            </div>
          </div>
          <div style={{ marginTop: 16, display: "flex", gap: 8, flexWrap: "wrap" }}>
            <Badge texto={`Perfil: ${perfil}`} />
            <Badge texto={`Empresa: ${empresa?.nome || "—"}`} />
          </div>
        </section>

        {/* Aniversariantes do Mês */}
        <section
          style={{
            background: "#ffffff",
            borderRadius: 20,
            padding: 24,
            boxShadow: "0 4px 14px rgba(0,0,0,0.06)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
            <div style={{ width: 30, height: 30, borderRadius: 9, background: "linear-gradient(135deg, #c0796e, #e8a598)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", flexShrink: 0 }}>
              <Cake style={{ width: 14, height: 14 }} />
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: 15, fontWeight: 800, color: "#111827" }}>Aniversariantes do Mês</h2>
              <p style={{ margin: "2px 0 0", fontSize: 12, color: "#6b7280" }}>
                Clientes que fazem aniversário em {MESES_PT[new Date().getMonth()]}
              </p>
            </div>
          </div>

          {loadingAniv ? (
            <div style={{ textAlign: "center", padding: "24px 0", color: "#9ca3af", fontSize: 14 }}>Carregando...</div>
          ) : aniversariantes.length === 0 ? (
            <div style={{ textAlign: "center", padding: "28px 0", color: "#9ca3af", fontSize: 14 }}>
              Nenhum aniversariante cadastrado neste mês.
            </div>
          ) : (
            <div style={{ display: "grid", gap: 10, gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))" }}>
              {aniversariantes.map((a) => {
                const whatsappHref = a.telefone
                  ? `https://wa.me/55${a.telefone.replace(/\D/g, "")}?text=${encodeURIComponent(`Olá ${a.nome.split(" ")[0]}! Feliz aniversário! 🎂🎉`)}`
                  : null;
                return (
                  <div
                    key={a.id}
                    style={{
                      background: "#fff5f4",
                      border: "1px solid #f8d7d3",
                      borderRadius: 14,
                      padding: "14px 16px",
                      display: "flex",
                      alignItems: "center",
                      gap: 12,
                    }}
                  >
                    <div
                      style={{
                        width: 34,
                        height: 34,
                        borderRadius: 10,
                        background: "linear-gradient(135deg, #c0796e, #e8a598)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: "#fff",
                        fontWeight: 900,
                        fontSize: 14,
                        flexShrink: 0,
                      }}
                    >
                      {a.nome.charAt(0).toUpperCase()}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 700, fontSize: 13, color: "#111827", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {a.nome}
                      </div>
                      <div style={{ fontSize: 11, color: "#c0796e", fontWeight: 600, marginTop: 2 }}>
                        {formatarDataNascimento(a.data_nascimento)}
                      </div>
                    </div>
                    {whatsappHref && (
                      <a
                        href={whatsappHref}
                        target="_blank"
                        rel="noopener noreferrer"
                        title="Enviar parabéns no WhatsApp"
                        style={{
                          flexShrink: 0,
                          width: 28,
                          height: 28,
                          borderRadius: 8,
                          background: "#25d366",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          color: "#fff",
                          fontSize: 13,
                          textDecoration: "none",
                        }}
                      >
                        💬
                      </a>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Fechamento do Dia */}
        <section
          style={{
            background: "#ffffff",
            borderRadius: 20,
            padding: 24,
            boxShadow: "0 4px 14px rgba(0,0,0,0.06)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12, marginBottom: 20 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ width: 30, height: 30, borderRadius: 9, background: `linear-gradient(135deg, ${corSecundaria}, ${corPrimaria})`, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", flexShrink: 0 }}>
                <TrendingUp style={{ width: 14, height: 14 }} />
              </div>
              <div>
                <h2 style={{ margin: 0, fontSize: 15, fontWeight: 800, color: "#111827" }}>Fechamento do Dia</h2>
                <p style={{ margin: "2px 0 0", fontSize: 12, color: "#6b7280" }}>Produção por profissional (exceto cancelados)</p>
              </div>
            </div>
            <input
              type="date"
              value={dataDia}
              onChange={(e) => setDataDia(e.target.value)}
              style={{ border: "1px solid #e6d9cf", borderRadius: 10, padding: "7px 12px", fontSize: 13, color: "#2d241f", background: "#f9f6f2", outline: "none", cursor: "pointer" }}
            />
          </div>

          {loadingFechamento ? (
            <div style={{ textAlign: "center", padding: "24px 0", color: "#9ca3af", fontSize: 14 }}>Carregando...</div>
          ) : fechamento.length === 0 ? (
            <div style={{ textAlign: "center", padding: "28px 0", color: "#9ca3af", fontSize: 14 }}>
              Nenhum atendimento registrado neste dia.
            </div>
          ) : (
            <>
              {/* Summary chips */}
              <div style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap" }}>
                <div style={{ background: "#f3ede8", border: "1px solid #e6d9cf", borderRadius: 12, padding: "10px 18px", minWidth: 140 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: "#8b735d", textTransform: "uppercase", letterSpacing: 0.8 }}>Total do dia</div>
                  <div style={{ fontSize: 22, fontWeight: 900, color: "#2d241f", marginTop: 3 }}>
                    {totalDia.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                  </div>
                </div>
                <div style={{ background: "#f3ede8", border: "1px solid #e6d9cf", borderRadius: 12, padding: "10px 18px", minWidth: 120 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: "#8b735d", textTransform: "uppercase", letterSpacing: 0.8 }}>Atendimentos</div>
                  <div style={{ fontSize: 22, fontWeight: 900, color: "#2d241f", marginTop: 3 }}>{totalAtendimentos}</div>
                </div>
                <div style={{ background: "#f3ede8", border: "1px solid #e6d9cf", borderRadius: 12, padding: "10px 18px", minWidth: 120 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: "#8b735d", textTransform: "uppercase", letterSpacing: 0.8 }}>Profissionais</div>
                  <div style={{ fontSize: 22, fontWeight: 900, color: "#2d241f", marginTop: 3 }}>{fechamento.filter(p => p.profissional_id !== null).length}</div>
                </div>
              </div>

              {/* Per-professional table */}
              <div style={{ borderRadius: 14, overflow: "hidden", border: "1px solid #e6d9cf" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
                  <thead>
                    <tr style={{ background: "#f9f6f2" }}>
                      <th style={{ textAlign: "left", padding: "11px 16px", fontWeight: 700, color: "#57493f", fontSize: 12, textTransform: "uppercase", letterSpacing: 0.5 }}>Profissional</th>
                      <th style={{ textAlign: "center", padding: "11px 16px", fontWeight: 700, color: "#57493f", fontSize: 12, textTransform: "uppercase", letterSpacing: 0.5 }}>Atendimentos</th>
                      <th style={{ textAlign: "right", padding: "11px 16px", fontWeight: 700, color: "#57493f", fontSize: 12, textTransform: "uppercase", letterSpacing: 0.5 }}>Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {fechamento.map((p, i) => (
                      <tr key={p.profissional_id ?? "sem"} style={{ borderTop: "1px solid #f0e8e0", background: i % 2 === 0 ? "#fff" : "#fdfaf8" }}>
                        <td style={{ padding: "12px 16px", fontWeight: 600, color: "#111827" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <div style={{ width: 26, height: 26, borderRadius: 8, background: `linear-gradient(135deg, ${corSecundaria}, ${corPrimaria})`, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 800, fontSize: 11, flexShrink: 0 }}>
                              {p.profissional_nome.charAt(0).toUpperCase()}
                            </div>
                            {p.profissional_nome}
                          </div>
                        </td>
                        <td style={{ padding: "12px 16px", textAlign: "center", color: "#57493f", fontWeight: 600 }}>{p.count}</td>
                        <td style={{ padding: "12px 16px", textAlign: "right", fontWeight: 800, color: "#2d241f" }}>
                          {p.total.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr style={{ borderTop: "2px solid #e6d9cf", background: "#f3ede8" }}>
                      <td style={{ padding: "12px 16px", fontWeight: 800, color: "#2d241f" }}>Total geral</td>
                      <td style={{ padding: "12px 16px", textAlign: "center", fontWeight: 800, color: "#2d241f" }}>{totalAtendimentos}</td>
                      <td style={{ padding: "12px 16px", textAlign: "right", fontWeight: 900, color: "#2d241f", fontSize: 15 }}>
                        {totalDia.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </>
          )}
        </section>
      </div>
    </Layout>
  );
}

function Badge({ texto }: { texto: string }) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        padding: "6px 12px",
        borderRadius: 999,
        background: "#f3ede8",
        border: "1px solid #e6d9cf",
        color: "#57493f",
        fontSize: 12,
        fontWeight: 700,
      }}
    >
      {texto}
    </span>
  );
}
