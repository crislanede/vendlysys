export default function Manual() {
  const base = (import.meta as any).env?.BASE_URL ?? "/";
  const loginImg = `${base}`.replace(/\/$/, "") + "/../screen-login.jpg";

  const Section = ({ id, title, icon, children }: { id: string; title: string; icon: string; children: React.ReactNode }) => (
    <section id={id} style={{ marginBottom: 48, pageBreakInside: "avoid" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16, borderBottom: "2px solid #2B5BA5", paddingBottom: 10 }}>
        <span style={{ fontSize: 22 }}>{icon}</span>
        <h2 style={{ fontSize: 20, fontWeight: 800, color: "#1C3A6E", margin: 0 }}>{title}</h2>
      </div>
      {children}
    </section>
  );

  const Step = ({ num, text }: { num: number; text: string }) => (
    <div style={{ display: "flex", gap: 12, alignItems: "flex-start", marginBottom: 10 }}>
      <div style={{ minWidth: 28, height: 28, borderRadius: "50%", background: "#2B5BA5", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 13, flexShrink: 0 }}>{num}</div>
      <p style={{ margin: "3px 0 0", color: "#374151", fontSize: 14, lineHeight: 1.6 }}>{text}</p>
    </div>
  );

  const Badge = ({ label, color }: { label: string; color: string }) => (
    <span style={{ background: color, color: "#fff", borderRadius: 20, padding: "2px 12px", fontSize: 12, fontWeight: 700, marginRight: 6 }}>{label}</span>
  );

  const InfoBox = ({ children, color = "#EEF3FF" }: { children: React.ReactNode; color?: string }) => (
    <div style={{ background: color, borderRadius: 12, padding: "14px 18px", marginTop: 12, marginBottom: 8, fontSize: 13.5, color: "#374151", lineHeight: 1.7 }}>{children}</div>
  );

  return (
    <div style={{ background: "#f8fafc", minHeight: "100vh", padding: "0 0 60px" }}>
      <style>{`
        @media print {
          body { background: white; }
          .no-print { display: none !important; }
          section { page-break-inside: avoid; }
        }
        @page { margin: 20mm; }
      `}</style>

      {/* Capa */}
      <div style={{ background: "linear-gradient(135deg, #1C3A6E 0%, #2B5BA5 60%, #0BA5A0 100%)", padding: "60px 40px 48px", textAlign: "center", color: "#fff" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 16, marginBottom: 20 }}>
          <div style={{ width: 56, height: 56, background: "#F47B1E", borderRadius: 16, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28 }}>🛒</div>
          <span style={{ fontSize: 36, fontWeight: 900, letterSpacing: -1 }}>VendlySys</span>
        </div>
        <h1 style={{ fontSize: 22, fontWeight: 400, margin: "0 0 8px", opacity: 0.9 }}>Manual do Sistema</h1>
        <p style={{ fontSize: 14, opacity: 0.7, margin: 0 }}>Sistema PDV para Salões, Clínicas e Barbearias · Versão 2026</p>
        <button
          className="no-print"
          onClick={() => window.print()}
          style={{ marginTop: 24, background: "#F47B1E", color: "#fff", border: 0, borderRadius: 12, padding: "10px 28px", fontWeight: 700, fontSize: 14, cursor: "pointer" }}
        >
          🖨️ Imprimir / Salvar PDF
        </button>
      </div>

      <div style={{ maxWidth: 860, margin: "0 auto", padding: "40px 24px 0" }}>

        {/* Índice */}
        <div style={{ background: "#fff", borderRadius: 16, padding: 28, marginBottom: 40, boxShadow: "0 2px 12px rgba(0,0,0,0.06)" }}>
          <h2 style={{ fontSize: 16, fontWeight: 800, color: "#1C3A6E", margin: "0 0 16px" }}>Índice</h2>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px 24px" }}>
            {[
              ["#acesso", "1. Acesso ao Sistema"],
              ["#inicio", "2. Painel Inicial"],
              ["#agenda", "3. Agenda"],
              ["#agendamentos", "4. Lista de Agendamentos"],
              ["#clientes", "5. Clientes"],
              ["#servicos", "6. Serviços"],
              ["#profissionais", "7. Profissionais"],
              ["#financeiro", "8. Financeiro"],
              ["#despesas", "9. Despesas"],
              ["#caixa", "10. Caixa"],
              ["#relatorios", "11. Relatórios"],
              ["#bloqueios", "12. Bloqueios de Agenda"],
              ["#configuracoes", "13. Configurações"],
              ["#assinatura", "14. Assinatura"],
              ["#app", "15. Aplicativo Mobile"],
              ["#perfis", "16. Perfis de Acesso"],
            ].map(([href, label]) => (
              <a key={href} href={href} style={{ color: "#2B5BA5", fontSize: 13.5, textDecoration: "none", padding: "3px 0", display: "block" }}>
                {label}
              </a>
            ))}
          </div>
        </div>

        {/* 1. Acesso */}
        <Section id="acesso" title="Acesso ao Sistema" icon="🔐">
          <p style={{ color: "#6B80A0", fontSize: 14, marginTop: 0 }}>
            O VendlySys é acessado pelo navegador. Não é necessário instalar nada no computador.
          </p>
          <Step num={1} text="Abra o navegador e acesse o endereço fornecido pelo administrador (ex: sistema-finalizador.replit.app)." />
          <Step num={2} text="Digite seu e-mail e senha cadastrados." />
          <Step num={3} text='Clique em "Entrar" para acessar o painel.' />
          <Step num={4} text='Caso esqueça a senha, entre em contato com o administrador do sistema.' />
          <InfoBox color="#EEF3FF">
            💡 <strong>Dica:</strong> Para facilitar o acesso, salve o endereço do sistema nos favoritos do navegador ou crie um atalho na área de trabalho.
          </InfoBox>
          <InfoBox color="#fef3c7">
            ⚠️ <strong>Primeiro acesso:</strong> Se é a primeira vez acessando, sua empresa precisa ter sido cadastrada pelo administrador. Use o link "Criar minha empresa" na tela de login somente se for abrir uma nova conta.
          </InfoBox>
        </Section>

        {/* 2. Início */}
        <Section id="inicio" title="Painel Inicial (Dashboard)" icon="🏠">
          <p style={{ color: "#6B80A0", fontSize: 14, marginTop: 0 }}>
            Ao entrar no sistema, você verá o painel inicial com um resumo do dia.
          </p>
          {[
            ["Agendamentos do dia", "Quantos atendimentos estão agendados para hoje."],
            ["Receita do dia", "Total faturado nos atendimentos já realizados."],
            ["Clientes ativos", "Total de clientes cadastrados."],
            ["Próximos agendamentos", "Lista dos próximos atendimentos com horário e serviço."],
          ].map(([titulo, desc], i) => (
            <div key={i} style={{ display: "flex", gap: 12, background: "#f8fafc", borderRadius: 10, padding: "10px 14px", marginBottom: 8 }}>
              <span style={{ color: "#2B5BA5", fontWeight: 700, fontSize: 13, minWidth: 160 }}>{titulo}</span>
              <span style={{ color: "#6B80A0", fontSize: 13 }}>{desc}</span>
            </div>
          ))}
        </Section>

        {/* 3. Agenda */}
        <Section id="agenda" title="Agenda" icon="📅">
          <p style={{ color: "#6B80A0", fontSize: 14, marginTop: 0 }}>
            A agenda é o coração do sistema. Mostra os atendimentos do dia em formato visual de horários.
          </p>
          <Step num={1} text='Acesse "Agenda" no menu lateral.' />
          <Step num={2} text="Use as setas para navegar entre os dias." />
          <Step num={3} text='Clique no botão "+" ou em um horário vazio para criar um novo agendamento.' />
          <Step num={4} text="Preencha: cliente, serviço, profissional, data, hora e observações." />
          <Step num={5} text='Clique no agendamento para ver detalhes, alterar status ou editar.' />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginTop: 16 }}>
            {[
              ["🟡 Agendado", "Confirmado, aguardando atendimento"],
              ["🟢 Realizado", "Atendimento concluído"],
              ["🔴 Cancelado", "Agendamento cancelado"],
            ].map(([status, desc]) => (
              <div key={status as string} style={{ background: "#f8fafc", borderRadius: 10, padding: 12, fontSize: 13 }}>
                <div style={{ fontWeight: 700, marginBottom: 4 }}>{status}</div>
                <div style={{ color: "#6B80A0" }}>{desc}</div>
              </div>
            ))}
          </div>
          <InfoBox>💡 Use o campo de busca para filtrar por nome do cliente <strong>ou</strong> por serviço.</InfoBox>
        </Section>

        {/* 4. Agendamentos */}
        <Section id="agendamentos" title="Lista de Agendamentos" icon="📋">
          <p style={{ color: "#6B80A0", fontSize: 14, marginTop: 0 }}>
            Visão em lista de todos os agendamentos. Permite filtrar por data, profissional e status.
          </p>
          <Step num={1} text='Acesse "Agendamentos" no menu lateral.' />
          <Step num={2} text="Filtre por período, profissional ou pesquise por cliente/serviço." />
          <Step num={3} text="Clique em qualquer linha para ver o detalhamento completo." />
          <Step num={4} text="Altere o status diretamente na lista ou cancele um agendamento com um clique." />
          <InfoBox color="#f0fdf4">
            ✅ Os agendamentos marcados como <strong>Realizado</strong> geram automaticamente movimentação financeira no caixa do dia.
          </InfoBox>
        </Section>

        {/* 5. Clientes */}
        <Section id="clientes" title="Clientes" icon="👥">
          <p style={{ color: "#6B80A0", fontSize: 14, marginTop: 0 }}>
            Cadastro completo de clientes com histórico de visitas.
          </p>
          <Step num={1} text='Acesse "Clientes" no menu lateral.' />
          <Step num={2} text='Clique em "Novo cliente" para cadastrar. Preencha nome, telefone, e-mail e data de nascimento.' />
          <Step num={3} text="Clique em um cliente para ver o histórico de atendimentos e valor total gasto." />
          <Step num={4} text="Use o campo de busca para encontrar clientes pelo nome." />
          <Step num={5} text='Para excluir, clique no ícone de lixeira. O sistema confirma antes de excluir.' />
          <InfoBox color="#fef3c7">⚠️ Clientes com agendamentos futuros não podem ser excluídos. Cancele os agendamentos pendentes primeiro.</InfoBox>
        </Section>

        {/* 6. Serviços */}
        <Section id="servicos" title="Serviços" icon="✂️">
          <p style={{ color: "#6B80A0", fontSize: 14, marginTop: 0 }}>
            Cadastro de todos os serviços oferecidos pela empresa, com preço e duração.
            <Badge label="Admin" color="#1C3A6E" />
          </p>
          <Step num={1} text='Acesse "Serviços" no menu lateral (visível apenas para admins).' />
          <Step num={2} text='Clique em "Novo serviço". Preencha nome, descrição, preço e duração em minutos.' />
          <Step num={3} text="Os serviços cadastrados aqui aparecem automaticamente na criação de agendamentos." />
          <Step num={4} text="Para editar ou excluir, clique nos ícones ao lado do serviço." />
        </Section>

        {/* 7. Profissionais */}
        <Section id="profissionais" title="Profissionais / Colaboradores" icon="💼">
          <p style={{ color: "#6B80A0", fontSize: 14, marginTop: 0 }}>
            Gerencia os profissionais que realizam atendimentos. <Badge label="Admin" color="#1C3A6E" />
          </p>
          <Step num={1} text='Acesse "Profissionais" no menu lateral.' />
          <Step num={2} text="Cadastre cada colaborador com nome, cargo e percentual de comissão." />
          <Step num={3} text="O profissional aparece na seleção ao criar agendamentos." />
          <InfoBox>
            💡 O relatório de comissões calcula automaticamente o valor a pagar para cada profissional com base nos atendimentos realizados.
          </InfoBox>
        </Section>

        {/* 8. Financeiro */}
        <Section id="financeiro" title="Financeiro" icon="💰">
          <p style={{ color: "#6B80A0", fontSize: 14, marginTop: 0 }}>
            Visão geral das receitas geradas pelos atendimentos. <Badge label="Admin" color="#1C3A6E" />
          </p>
          {[
            ["Receita bruta", "Total faturado no período, incluindo todos os serviços."],
            ["Despesas", "Total de gastos registrados (veja seção Despesas)."],
            ["Lucro líquido", "Receita bruta menos despesas do período."],
            ["Ticket médio", "Valor médio por atendimento realizado."],
          ].map(([t, d], i) => (
            <div key={i} style={{ display: "flex", gap: 12, background: "#f8fafc", borderRadius: 10, padding: "10px 14px", marginBottom: 8 }}>
              <span style={{ color: "#2B5BA5", fontWeight: 700, fontSize: 13, minWidth: 130 }}>{t}</span>
              <span style={{ color: "#6B80A0", fontSize: 13 }}>{d}</span>
            </div>
          ))}
        </Section>

        {/* 9. Despesas */}
        <Section id="despesas" title="Despesas" icon="🧾">
          <p style={{ color: "#6B80A0", fontSize: 14, marginTop: 0 }}>
            Registro de todos os gastos da empresa para cálculo do lucro real. <Badge label="Admin" color="#1C3A6E" />
          </p>
          <Step num={1} text='Acesse "Despesas" no menu lateral.' />
          <Step num={2} text='Clique em "Nova despesa". Informe descrição, valor, categoria e data.' />
          <Step num={3} text="As despesas são descontadas automaticamente no relatório financeiro." />
          <InfoBox color="#fef2f2">📌 Categorias comuns: Aluguel, Produtos, Energia, Mão de obra, Marketing.</InfoBox>
        </Section>

        {/* 10. Caixa */}
        <Section id="caixa" title="Caixa" icon="🏧">
          <p style={{ color: "#6B80A0", fontSize: 14, marginTop: 0 }}>
            Registro diário de entradas e saídas. <Badge label="Admin" color="#1C3A6E" />
          </p>
          <Step num={1} text="O caixa é aberto automaticamente no início de cada dia." />
          <Step num={2} text="Cada atendimento realizado gera uma entrada automática no caixa." />
          <Step num={3} text="Você pode adicionar entradas e saídas avulsas manualmente." />
          <Step num={4} text='Ao final do dia, clique em "Fechar caixa" para registrar o fechamento com saldo.' />
        </Section>

        {/* 11. Relatórios */}
        <Section id="relatorios" title="Relatórios" icon="📊">
          <p style={{ color: "#6B80A0", fontSize: 14, marginTop: 0 }}>
            Relatórios gerenciais para tomada de decisão. <Badge label="Admin" color="#1C3A6E" />
          </p>
          {[
            ["Relatório de Atendimentos", "Todos os serviços realizados por período, profissional e cliente."],
            ["Relatório de Comissões", "Valor de comissão a pagar para cada profissional."],
            ["Relatório Financeiro", "Receita, despesas e lucro por período."],
          ].map(([t, d], i) => (
            <div key={i} style={{ display: "flex", gap: 12, background: "#f8fafc", borderRadius: 10, padding: "10px 14px", marginBottom: 8 }}>
              <span style={{ color: "#2B5BA5", fontWeight: 700, fontSize: 13, minWidth: 200 }}>{t}</span>
              <span style={{ color: "#6B80A0", fontSize: 13 }}>{d}</span>
            </div>
          ))}
        </Section>

        {/* 12. Bloqueios */}
        <Section id="bloqueios" title="Bloqueios de Agenda" icon="🚫">
          <p style={{ color: "#6B80A0", fontSize: 14, marginTop: 0 }}>
            Bloqueia períodos da agenda para evitar agendamentos em dias ou horários específicos. <Badge label="Admin" color="#1C3A6E" />
          </p>
          <Step num={1} text='Acesse "Bloqueios" no menu lateral.' />
          <Step num={2} text='Clique no dia desejado no mini-calendário ou em "Novo bloqueio".' />
          <Step num={3} text="Defina a data, horário de início e fim, e o motivo (ex: Feriado, Férias, Evento)." />
          <Step num={4} text="O período bloqueado fica marcado na agenda e impede novos agendamentos." />
          <Step num={5} text='Para remover, clique no bloqueio na lista e confirme a exclusão.' />
          <InfoBox>💡 Use bloqueios para feriados, recessos, reformas ou qualquer período sem atendimento.</InfoBox>
        </Section>

        {/* 13. Configurações */}
        <Section id="configuracoes" title="Configurações" icon="⚙️">
          <p style={{ color: "#6B80A0", fontSize: 14, marginTop: 0 }}>
            Personalização da empresa no sistema. <Badge label="Admin" color="#1C3A6E" />
          </p>
          {[
            ["Nome da empresa", "Nome exibido no sistema e nas comunicações."],
            ["Logo", "Imagem exibida no topo do painel."],
            ["Cor primária", "Cor da identidade visual do sistema."],
            ["Horário de funcionamento", "Define os horários disponíveis para agendamento."],
            ["WhatsApp / Notificações", "Integração para envio de lembretes automáticos."],
          ].map(([t, d], i) => (
            <div key={i} style={{ display: "flex", gap: 12, background: "#f8fafc", borderRadius: 10, padding: "10px 14px", marginBottom: 8 }}>
              <span style={{ color: "#2B5BA5", fontWeight: 700, fontSize: 13, minWidth: 180 }}>{t}</span>
              <span style={{ color: "#6B80A0", fontSize: 13 }}>{d}</span>
            </div>
          ))}
        </Section>

        {/* 14. Assinatura */}
        <Section id="assinatura" title="Assinatura" icon="💳">
          <p style={{ color: "#6B80A0", fontSize: 14, marginTop: 0 }}>
            Gerencia o plano de acesso ao VendlySys. <Badge label="Admin" color="#1C3A6E" />
          </p>
          <div style={{ background: "linear-gradient(135deg, #1C3A6E, #2B5BA5)", borderRadius: 16, padding: 24, color: "#fff", marginBottom: 16 }}>
            <div style={{ fontSize: 28, fontWeight: 900, marginBottom: 4 }}>R$ 50<span style={{ fontSize: 14, fontWeight: 400 }}>/mês</span></div>
            <div style={{ fontSize: 13, opacity: 0.85 }}>Plano único · Acesso completo · Todos os módulos incluídos</div>
          </div>
          <Step num={1} text='Acesse "Assinatura" no menu lateral.' />
          <Step num={2} text='Clique em "Renovar" para gerar o QR Code PIX.' />
          <Step num={3} text="Pague com qualquer banco usando o PIX. O sistema detecta automaticamente o pagamento." />
          <Step num={4} text="Após confirmação, o acesso é liberado na hora por 30 dias." />
          <InfoBox color="#fef2f2">⚠️ Quando a assinatura vence, o sistema é bloqueado mas todos os dados ficam preservados. Basta renovar para retomar o acesso imediatamente.</InfoBox>
        </Section>

        {/* 15. App Mobile */}
        <Section id="app" title="Aplicativo Mobile" icon="📱">
          <p style={{ color: "#6B80A0", fontSize: 14, marginTop: 0 }}>
            O VendlySys tem um aplicativo para Android e iOS, usado pelos profissionais e clientes.
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <div style={{ background: "#EEF3FF", borderRadius: 12, padding: 16 }}>
              <div style={{ fontWeight: 700, color: "#1C3A6E", marginBottom: 8, fontSize: 14 }}>👤 Perfil Profissional</div>
              <ul style={{ margin: 0, paddingLeft: 16, color: "#6B80A0", fontSize: 13, lineHeight: 2 }}>
                <li>Ver agenda do dia</li>
                <li>Confirmar atendimentos</li>
                <li>Ver histórico de clientes</li>
                <li>Receber notificações</li>
              </ul>
            </div>
            <div style={{ background: "#f0fdf4", borderRadius: 12, padding: 16 }}>
              <div style={{ fontWeight: 700, color: "#1C3A6E", marginBottom: 8, fontSize: 14 }}>👑 Perfil Admin</div>
              <ul style={{ margin: 0, paddingLeft: 16, color: "#6B80A0", fontSize: 13, lineHeight: 2 }}>
                <li>Tudo do profissional</li>
                <li>Criar agendamentos</li>
                <li>Gerenciar clientes</li>
                <li>Ver relatórios</li>
              </ul>
            </div>
          </div>
          <Step num={1} text='Para instalar, acesse a URL de download fornecida pela empresa ou escaneie o QR Code disponível na tela "Baixar App".' />
          <Step num={2} text="Faça login com o mesmo e-mail e senha usados no sistema web." />
          <InfoBox>💡 O app funciona em segundo plano e envia notificações push quando há novos agendamentos ou confirmações.</InfoBox>
        </Section>

        {/* 16. Perfis de Acesso */}
        <Section id="perfis" title="Perfis de Acesso" icon="🛡️">
          <p style={{ color: "#6B80A0", fontSize: 14, marginTop: 0 }}>
            O sistema tem dois perfis com permissões diferentes.
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            {[
              {
                label: "Profissional", color: "#0BA5A0", items: [
                  "Ver agenda do dia",
                  "Criar e editar agendamentos",
                  "Ver e buscar clientes",
                  "Acesso ao app mobile",
                ]
              },
              {
                label: "Administrador", color: "#1C3A6E", items: [
                  "Todos os acessos do Profissional",
                  "Financeiro, caixa e despesas",
                  "Relatórios e comissões",
                  "Configurações da empresa",
                  "Gerenciar usuários e serviços",
                  "Bloqueios de agenda",
                  "Assinatura",
                ]
              },
            ].map(({ label, color, items }) => (
              <div key={label} style={{ background: "#f8fafc", borderRadius: 12, padding: 16, borderTop: `4px solid ${color}` }}>
                <div style={{ fontWeight: 800, color, marginBottom: 10, fontSize: 15 }}>{label}</div>
                <ul style={{ margin: 0, paddingLeft: 16, color: "#6B80A0", fontSize: 13, lineHeight: 1.9 }}>
                  {items.map(i => <li key={i}>{i}</li>)}
                </ul>
              </div>
            ))}
          </div>
        </Section>

        {/* Rodapé */}
        <div style={{ borderTop: "1px solid #e5e7eb", paddingTop: 24, textAlign: "center", color: "#9ca3af", fontSize: 13 }}>
          <strong style={{ color: "#2B5BA5" }}>VendlySys</strong> · Sistema PDV Moderno e Eficiente · sistema-finalizador.replit.app<br />
          Para suporte, entre em contato com o administrador do sistema.
        </div>
      </div>
    </div>
  );
}
