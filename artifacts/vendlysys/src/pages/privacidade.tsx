import { Shield } from "lucide-react";

export default function Privacidade() {
  return (
    <div style={{ minHeight: "100vh", background: "#EEF3FF", padding: "32px 16px" }}>
      <div style={{ maxWidth: 760, margin: "0 auto", background: "#fff", borderRadius: 12, boxShadow: "0 2px 12px rgba(28,58,110,0.08)", padding: "40px 32px" }}>

        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
          <Shield size={28} color="#2B5BA5" />
          <h1 style={{ fontSize: 22, fontWeight: 700, color: "#1C3A6E", margin: 0 }}>
            Política de Privacidade
          </h1>
        </div>
        <p style={{ color: "#6B80A0", fontSize: 13, marginBottom: 32 }}>
          VendlySys — Versão vigente: abril de 2026
        </p>

        {[
          {
            titulo: "1. Quem somos",
            texto: `O VendlySys é uma plataforma de gestão para salões, barbearias, clínicas estéticas e estabelecimentos afins, operada em modelo de assinatura (SaaS). Esta Política de Privacidade descreve como coletamos, usamos, armazenamos e protegemos os dados pessoais de nossos usuários e dos clientes cadastrados pelas empresas usuárias.`,
          },
          {
            titulo: "2. Dados que coletamos",
            texto: `Coletamos os seguintes dados:

• Dados cadastrais da empresa: nome, CNPJ (opcional), endereço, telefone e e-mail.
• Dados dos usuários (administradores e profissionais): nome, e-mail, telefone, perfil de acesso e senha (armazenada com hash criptográfico).
• Dados dos clientes cadastrados pela empresa: nome, telefone, e-mail e histórico de atendimentos.
• Dados financeiros: registros de agendamentos, pagamentos e despesas inseridos pela própria empresa.
• Dados de uso: logs de acesso, endereço IP e informações do dispositivo para segurança e suporte.`,
          },
          {
            titulo: "3. Como usamos os dados",
            texto: `Os dados são utilizados exclusivamente para:

• Prestar os serviços contratados (agenda, gestão de clientes, módulo financeiro, aplicativo mobile).
• Enviar notificações de lembretes de agendamento via WhatsApp, quando habilitado pela empresa.
• Processar cobranças de assinatura via Mercado Pago (PIX).
• Garantir a segurança e integridade das informações.
• Prestar suporte técnico e melhorar a plataforma.

Não utilizamos os dados para fins publicitários nem os vendemos a terceiros.`,
          },
          {
            titulo: "4. Compartilhamento de dados",
            texto: `Os dados são compartilhados apenas com:

• Mercado Pago: para processamento de pagamentos via PIX (conforme a Política de Privacidade do Mercado Pago).
• Z-API: para envio de mensagens WhatsApp de lembrete de agendamento, quando habilitado pela empresa.
• Provedores de infraestrutura (hospedagem em nuvem): para armazenamento e operação da plataforma.

Nenhum dado é vendido, alugado ou cedido a terceiros para fins comerciais.`,
          },
          {
            titulo: "5. Armazenamento e segurança",
            texto: `Os dados são armazenados em banco de dados PostgreSQL hospedado em ambiente seguro na nuvem. Adotamos as seguintes medidas de segurança:

• Senhas armazenadas com hash criptográfico (não são legíveis nem por nós).
• Autenticação por token JWT com prazo de expiração.
• Comunicação criptografada via HTTPS.
• Acesso aos dados restrito por perfil (admin/profissional).`,
          },
          {
            titulo: "6. Retenção dos dados",
            texto: `Os dados são mantidos enquanto a assinatura estiver ativa. Após o cancelamento, os dados ficam disponíveis por 30 (trinta) dias, sendo excluídos permanentemente após esse prazo, salvo obrigação legal em contrário.`,
          },
          {
            titulo: "7. Direitos do titular",
            texto: `Nos termos da Lei Geral de Proteção de Dados (LGPD — Lei nº 13.709/2018), você tem direito a:

• Confirmar a existência de tratamento dos seus dados.
• Acessar os dados que possuímos sobre você.
• Solicitar correção de dados incompletos ou incorretos.
• Solicitar a eliminação dos dados, respeitados os prazos legais.
• Revogar o consentimento a qualquer momento.

Para exercer seus direitos, entre em contato pelo e-mail abaixo.`,
          },
          {
            titulo: "8. Cookies",
            texto: `O aplicativo mobile não utiliza cookies. A versão web utiliza armazenamento local (localStorage) apenas para manter a sessão de login ativa, sem rastreamento de navegação ou publicidade.`,
          },
          {
            titulo: "9. Dados de menores",
            texto: `O VendlySys é destinado exclusivamente a empresas e profissionais maiores de 18 anos. Não coletamos intencionalmente dados de menores de idade.`,
          },
          {
            titulo: "10. Alterações nesta política",
            texto: `Esta Política pode ser atualizada periodicamente. Em caso de alterações relevantes, notificaremos os usuários pelo e-mail cadastrado ou por aviso no sistema. A versão vigente sempre estará disponível nesta página.`,
          },
          {
            titulo: "11. Contato",
            texto: `Para dúvidas, solicitações ou reclamações relacionadas à privacidade, entre em contato:

E-mail: contato@vendlysys.com.br
Plataforma: https://sistema-finalizador.replit.app`,
          },
        ].map(({ titulo, texto }) => (
          <div key={titulo} style={{ marginBottom: 28 }}>
            <h2 style={{ fontSize: 15, fontWeight: 700, color: "#1C3A6E", marginBottom: 8 }}>
              {titulo}
            </h2>
            <p style={{ fontSize: 14, color: "#374151", lineHeight: 1.75, whiteSpace: "pre-line", margin: 0 }}>
              {texto}
            </p>
          </div>
        ))}

        <div style={{ borderTop: "1px solid #C5D4EE", paddingTop: 20, marginTop: 8, textAlign: "center" }}>
          <p style={{ fontSize: 12, color: "#6B80A0", margin: 0 }}>
            © {new Date().getFullYear()} VendlySys — Todos os direitos reservados.
          </p>
        </div>
      </div>
    </div>
  );
}
