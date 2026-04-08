import { useState, useRef, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { FileText, CheckCircle } from "lucide-react";

const TERMOS_TEXTO = `TERMOS DE USO E RESPONSABILIDADE — VENDLYSYS

Versão vigente: abril de 2026

Ao aceitar este Termo, o representante da empresa contratante declara ter lido, compreendido e concordado integralmente com as condições descritas abaixo.

1. OBJETO

O VendlySys é uma plataforma de gestão para salões, barbearias, clínicas e estabelecimentos afins, oferecida em modelo de assinatura mensal (SaaS). Disponibiliza funcionalidades de agenda, gestão de clientes, módulo financeiro, portal público e aplicativo mobile para a equipe.

2. PLATAFORMAS E FUNCIONALIDADES

O VendlySys é composto por duas plataformas complementares, com funcionalidades distintas:

a) Sistema Web (acessado pelo navegador):
- Agenda e gestão de agendamentos
- Cadastro de clientes, serviços e profissionais
- Módulo financeiro (caixa, receitas e despesas)
- Relatórios gerenciais de faturamento e comissões
- Painel de Sinais (controle de sinais e depósitos)
- Programa de fidelidade e pontos
- Configurações da empresa e usuários
- Portal público para agendamento online pelos clientes

b) Aplicativo Mobile para a equipe (iOS e Android):
- Visualização e gestão da agenda do dia
- Cadastro e consulta de clientes
- Criação e acompanhamento de agendamentos
- Módulo financeiro simplificado

O contratante reconhece que os recursos de Relatórios Gerenciais e Painel de Sinais são funcionalidades exclusivas do Sistema Web e não estão disponíveis no aplicativo mobile. O acesso a essas funcionalidades requer o uso do sistema via navegador.

3. PLANO E PREÇO

O plano mensal tem valor de R$ 50,00 (cinquenta reais), cobrado mensalmente via PIX. O acesso ao sistema é mantido enquanto a assinatura estiver ativa e em dia.

4. PERÍODO DE CARÊNCIA

A assinatura possui carência de 3 (três) meses a partir da data do primeiro pagamento confirmado. Durante esse período, não é possível solicitar o cancelamento nem reembolso das mensalidades já pagas.

Após o término da carência, o cancelamento pode ser solicitado a qualquer momento, com efeito imediato.

5. CANCELAMENTO

O cancelamento deve ser solicitado diretamente pela tela de Assinatura. Não há cobrança de multa fora do período de carência. Os dados da empresa ficam disponíveis por 30 dias após o cancelamento, sendo excluídos permanentemente após esse prazo.

6. REEMBOLSO

Não são realizados reembolsos de mensalidades já pagas, exceto nos casos previstos em lei (Código de Defesa do Consumidor).

7. RESPONSABILIDADES DO CONTRATANTE

O contratante é responsável por:
- Manter seus dados de acesso (e-mail e senha) em sigilo;
- Utilizar o sistema de forma legal e ética;
- Inserir informações verídicas no cadastro da empresa e dos clientes;
- Cumprir a legislação vigente, incluindo a LGPD, no tratamento dos dados de seus clientes.

8. RESPONSABILIDADES DO VENDLYSYS

O VendlySys se compromete a:
- Manter o sistema disponível com uptime mínimo de 99% ao mês;
- Proteger os dados armazenados com medidas de segurança adequadas;
- Notificar o contratante em caso de incidentes que afetem seus dados;
- Não compartilhar ou vender os dados do contratante a terceiros.

9. LIMITAÇÃO DE RESPONSABILIDADE

O VendlySys não se responsabiliza por perdas financeiras decorrentes de uso indevido da plataforma, falhas de conexão à internet ou decisões comerciais tomadas com base nas informações do sistema.

10. ALTERAÇÕES

O VendlySys pode alterar estes Termos a qualquer momento, notificando os usuários com antecedência mínima de 15 dias.

11. FORO

Fica eleito o foro da comarca do contratante para dirimir eventuais conflitos decorrentes deste Termo.

Ao clicar em "Li e aceito os Termos", o contratante confirma ciência e concordância integral com as condições acima.`;

function getApiBase() {
  const base = (import.meta as any).env?.BASE_URL ?? "/";
  return base.endsWith("/") ? `${base}api` : `${base}/api`;
}

export default function Termos() {
  const { toast } = useToast();
  const { token, usuario } = useAuth();
  const termosJaAceitos = !!(usuario as any)?.empresa?.termos_aceitos_em;
  const dataAceite = termosJaAceitos
    ? new Date((usuario as any).empresa.termos_aceitos_em).toLocaleDateString("pt-BR")
    : null;
  const [leu, setLeu] = useState(false);
  const [aceitando, setAceitando] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const apiBase = getApiBase();

  function authHeaders() {
    return { "Content-Type": "application/json", Authorization: `Bearer ${token}` };
  }

  function checkLeu(el: HTMLElement) {
    if (el.scrollTop + el.clientHeight >= el.scrollHeight - 60) setLeu(true);
  }

  function handleScroll(e: React.UIEvent<HTMLDivElement>) {
    checkLeu(e.currentTarget);
  }

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const handler = () => checkLeu(el);
    el.addEventListener("scroll", handler, { passive: true });
    if (el.scrollHeight <= el.clientHeight + 60) setLeu(true);
    return () => el.removeEventListener("scroll", handler);
  }, []);

  async function aceitar() {
    setAceitando(true);
    try {
      const res = await fetch(`${apiBase}/assinatura/aceitar-termos`, {
        method: "POST",
        headers: authHeaders(),
      });
      if (res.ok) {
        const base = (import.meta as any).env?.BASE_URL ?? "/";
        const basePath = base.endsWith("/") ? base.slice(0, -1) : base;
        window.location.href = `${basePath}/inicio`;
      } else {
        const d = await res.json();
        toast({ title: d.error ?? "Erro ao registrar aceite", variant: "destructive" });
      }
    } finally {
      setAceitando(false);
    }
  }

  return (
    <div style={{ minHeight: "100vh", background: "#f5f3f2", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
      <div style={{ background: "#fff", borderRadius: 20, width: "100%", maxWidth: 680, boxShadow: "0 8px 40px rgba(0,0,0,0.12)", overflow: "hidden", display: "flex", flexDirection: "column" }}>
        {/* Header */}
        <div style={{ padding: "28px 32px 20px", borderBottom: "1px solid #f0ebe7" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
            <div style={{ width: 44, height: 44, borderRadius: 12, background: "#f5f3f2", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <FileText size={22} style={{ color: "#b8956f" }} />
            </div>
            <div>
              <h1 style={{ fontSize: 20, fontWeight: 800, color: "#2d241f", margin: 0 }}>Termos de Uso</h1>
              <p style={{ fontSize: 13, color: "#999", margin: 0 }}>
                {termosJaAceitos ? `Aceitos em ${dataAceite}` : "Leia o documento completo antes de continuar"}
              </p>
            </div>
          </div>

          {termosJaAceitos ? (
            <div style={{ background: "#f0fdf4", border: "1px solid #86efac", borderRadius: 10, padding: "10px 14px", fontSize: 13, color: "#15803d", display: "flex", alignItems: "center", gap: 8 }}>
              <CheckCircle size={14} style={{ flexShrink: 0 }} />
              Você já aceitou estes Termos. Aqui você pode relê-los a qualquer momento.
            </div>
          ) : (
            <div style={{ background: "#fffbeb", border: "1px solid #fde68a", borderRadius: 10, padding: "10px 14px", fontSize: 13, color: "#92400e" }}>
              Role até o final do documento para habilitar o botão de aceite.
            </div>
          )}
        </div>

        {/* Conteúdo */}
        <div
          ref={scrollRef}
          onScroll={handleScroll}
          style={{ flex: 1, overflowY: "auto", padding: "24px 32px", maxHeight: "50vh" }}
        >
          <pre style={{ fontFamily: "inherit", fontSize: 13, color: "#444", lineHeight: 1.75, whiteSpace: "pre-wrap", margin: 0 }}>
            {TERMOS_TEXTO}
          </pre>
        </div>

        {/* Footer */}
        <div style={{ padding: "20px 32px 28px", borderTop: "1px solid #f0ebe7" }}>
          {termosJaAceitos ? (
            <button
              type="button"
              onClick={() => window.history.back()}
              style={{ width: "100%", padding: "15px 0", background: "linear-gradient(135deg, #59463b, #2d241f)", color: "#fff", border: 0, borderRadius: 12, fontSize: 16, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 10 }}
            >
              ← Voltar
            </button>
          ) : (
            <>
              {!leu && (
                <p style={{ textAlign: "center", fontSize: 13, color: "#aaa", margin: "0 0 12px" }}>
                  Role até o final para habilitar o aceite
                </p>
              )}
              <button
                type="button"
                onClick={aceitar}
                disabled={!leu || aceitando}
                style={{
                  width: "100%",
                  padding: "15px 0",
                  background: leu ? "linear-gradient(135deg, #59463b, #2d241f)" : "#e5e7eb",
                  color: leu ? "#fff" : "#9ca3af",
                  border: 0,
                  borderRadius: 12,
                  fontSize: 16,
                  fontWeight: 700,
                  cursor: leu ? "pointer" : "not-allowed",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 10,
                }}
              >
                <CheckCircle size={18} />
                {aceitando ? "Registrando..." : "Li e aceito os Termos de Uso"}
              </button>
              <p style={{ textAlign: "center", fontSize: 12, color: "#aaa", margin: "12px 0 0" }}>
                Ao aceitar, você confirma que leu e concorda com todos os termos acima.
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
