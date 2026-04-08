import { Link, useLocation } from "wouter";
import { useState } from "react";
import {
  CalendarDays,
  Users,
  Settings,
  LogOut,
  Wallet,
  Receipt,
  Home,
  UserCog,
  Scissors,
  BookOpen,
  CreditCard,
  Briefcase,
  BarChart3,
  BadgeDollarSign,
  CalendarX,
  Bell,
  X,
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useLogout } from "@workspace/api-client-react";
import { cn } from "@/lib/utils";
import { useNotificacoes } from "@/hooks/use-notificacoes";

export function Layout({ children }: { children: React.ReactNode }) {
  const { usuario, empresa, isAdmin, logout, planoInativo, planoStatus, planoExpiraEm, refetchAssinatura } = useAuth() as any;
  const [location, setLocation] = useLocation();
  const logoutMutation = useLogout();
  const { novos, total, limpar } = useNotificacoes();
  const [sinoAberto, setSinoAberto] = useState(false);

  const handleLogout = async () => {
    try { await logoutMutation.mutateAsync(); } catch {}
    logout();
    setLocation("/login");
  };

  const navItems = [
    { name: "Início",         path: "/inicio",        icon: Home,            show: true },
    { name: "Agenda",         path: "/agenda",         icon: CalendarDays,    show: true },
    { name: "Agendamentos",   path: "/agendamentos",   icon: BookOpen,        show: true },
    { name: "Clientes",       path: "/clientes",       icon: Users,           show: true },
    { name: "Serviços",       path: "/servicos",       icon: Scissors,        show: isAdmin },
    { name: "Profissionais",  path: "/profissionais",  icon: Briefcase,       show: isAdmin },
    { name: "Financeiro",     path: "/financeiro",     icon: Wallet,          show: isAdmin },
    { name: "Despesas",       path: "/despesas",       icon: Receipt,         show: isAdmin },
    { name: "Relatórios",     path: "/relatorios",     icon: BarChart3,       show: isAdmin },
    { name: "Comissões",      path: "/comissoes",      icon: BadgeDollarSign, show: isAdmin },
    { name: "Bloqueios",      path: "/bloqueios",      icon: CalendarX,       show: isAdmin },
    { name: "Sinais",         path: "/sinais",         icon: CreditCard,      show: isAdmin },
    { name: "Usuários",       path: "/usuarios",       icon: UserCog,         show: isAdmin },
    { name: "Configurações",  path: "/configuracoes",  icon: Settings,        show: isAdmin },
    { name: "Assinatura",     path: "/assinatura",     icon: CreditCard,      show: isAdmin },
  ];

  const corPrimaria  = empresa?.cor_primaria  || "#b8956f";
  const corSecundaria = empresa?.cor_secundaria || "#59463b";

  return (
    <div className="flex h-screen bg-background">

      {/* ── Sidebar ─────────────────────────────────────────── */}
      <aside
        className="flex flex-col shrink-0"
        style={{ background: "hsl(20 19% 15%)" }}
      >
        {/* Brand */}
        <div
          className="border-b flex items-center justify-center sm:justify-start gap-3"
          style={{
            borderColor: "hsl(20 15% 20%)",
            padding: "14px 10px",
          }}
        >
          {/* Logo/avatar — sempre visível */}
          <div
            className="rounded-xl flex items-center justify-center text-white font-black overflow-hidden shrink-0"
            style={{
              width: 34, height: 34, fontSize: 14,
              ...(empresa?.logo_url
                ? { background: "#fff", padding: 2 }
                : { background: `linear-gradient(135deg, ${corSecundaria}, ${corPrimaria})` }),
            }}
          >
            {empresa?.logo_url
              ? <img src={empresa.logo_url} alt={empresa.nome} style={{ width: "100%", height: "100%", objectFit: "contain", borderRadius: 8 }} />
              : empresa?.nome?.charAt(0) || "V"}
          </div>

          {/* Nome — oculto em telas pequenas */}
          <div className="hidden sm:block overflow-hidden min-w-0">
            <div className="font-bold text-sm truncate" style={{ color: "hsl(25 20% 88%)" }}>
              {empresa?.nome || "VendlySys"}
            </div>
            <div className="text-xs truncate" style={{ color: "hsl(25 10% 58%)" }}>
              Painel
            </div>
          </div>
        </div>

        {/* Linha gradiente */}
        <div className="h-0.5 mx-2" style={{ background: `linear-gradient(90deg, ${corSecundaria}, ${corPrimaria})` }} />

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-2 px-1.5 space-y-0.5">
          {navItems.filter(i => i.show).map((item) => {
            const isActive = location === item.path;
            return (
              <Link key={item.path} href={item.path} title={item.name}>
                <div
                  className={cn(
                    "flex items-center rounded-xl font-medium transition-all cursor-pointer",
                    /* mobile: centraliza ícone; desktop: mostra texto */
                    "justify-center sm:justify-start",
                    "gap-0 sm:gap-2.5",
                    isActive ? "text-white" : "hover:text-white"
                  )}
                  style={{
                    padding: "9px 10px",
                    /* no mobile (sm-) limita largura ao ícone */
                    ...(isActive
                      ? { background: `linear-gradient(135deg, ${corSecundaria}, ${corPrimaria})`, boxShadow: "0 4px 14px rgba(0,0,0,0.18)" }
                      : { color: "hsl(25 15% 62%)" }),
                  }}
                  onMouseEnter={(e) => {
                    if (!isActive) {
                      (e.currentTarget as HTMLElement).style.background = "hsl(20 15% 22%)";
                      (e.currentTarget as HTMLElement).style.color = "hsl(25 20% 88%)";
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isActive) {
                      (e.currentTarget as HTMLElement).style.background = "";
                      (e.currentTarget as HTMLElement).style.color = "hsl(25 15% 62%)";
                    }
                  }}
                >
                  <item.icon className="h-4 w-4 shrink-0" />
                  <span className="hidden sm:block text-sm truncate">{item.name}</span>
                </div>
              </Link>
            );
          })}
        </nav>

        {/* Sino de notificações */}
        <div className="px-1.5 pb-1">
          <button
            title="Novos agendamentos"
            onClick={() => { setSinoAberto((v) => !v); if (!sinoAberto && total > 0) limpar(); }}
            style={{
              position: "relative",
              width: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 0,
              padding: "9px 10px",
              borderRadius: 12,
              border: "none",
              background: total > 0 ? "hsl(38 90% 20%)" : "transparent",
              color: total > 0 ? "hsl(38 90% 75%)" : "hsl(25 15% 62%)",
              cursor: "pointer",
              transition: "background 0.2s",
            }}
            onMouseEnter={(e) => { if (total === 0) (e.currentTarget as HTMLElement).style.background = "hsl(20 15% 22%)"; }}
            onMouseLeave={(e) => { if (total === 0) (e.currentTarget as HTMLElement).style.background = "transparent"; }}
          >
            <Bell className="h-4 w-4 shrink-0" />
            <span className="hidden sm:block text-sm truncate" style={{ marginLeft: 10 }}>Notificações</span>
            {total > 0 && (
              <span style={{
                position: "absolute", top: 6, left: 28,
                background: "#ef4444", color: "#fff",
                borderRadius: 999, fontSize: 10, fontWeight: 800,
                minWidth: 16, height: 16, display: "flex", alignItems: "center", justifyContent: "center",
                padding: "0 4px", lineHeight: 1,
              }}>
                {total > 9 ? "9+" : total}
              </span>
            )}
          </button>
        </div>

        {/* User + Logout */}
        <div className="border-t p-1.5" style={{ borderColor: "hsl(20 15% 20%)" }}>
          <div className="hidden sm:block px-2.5 py-1.5 mb-1">
            <div className="text-xs font-semibold truncate" style={{ color: "hsl(25 20% 80%)" }}>
              {usuario?.nome}
            </div>
            <div className="text-xs capitalize truncate" style={{ color: "hsl(25 10% 52%)" }}>
              {usuario?.perfil}
            </div>
          </div>
          <button
            onClick={handleLogout}
            title="Sair"
            className="w-full flex items-center justify-center sm:justify-start gap-0 sm:gap-2.5 rounded-xl font-medium transition-all cursor-pointer"
            style={{ padding: "9px 10px", color: "hsl(25 15% 55%)" }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.background = "hsl(0 50% 25%)";
              (e.currentTarget as HTMLElement).style.color = "hsl(0 90% 80%)";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.background = "";
              (e.currentTarget as HTMLElement).style.color = "hsl(25 15% 55%)";
            }}
          >
            <LogOut className="h-4 w-4 shrink-0" />
            <span className="hidden sm:block text-sm truncate">Sair</span>
          </button>
        </div>
      </aside>

      {/* ── Conteúdo principal ──────────────────────────────── */}
      <main className="flex-1 flex flex-col overflow-hidden min-w-0">
        {planoInativo ? (
          <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: 24, background: "#f9fafb" }}>
            {(() => {
              const cancelado = planoStatus === "inativo" && !planoExpiraEm;
              const expiraData = planoExpiraEm ? new Date(planoExpiraEm) : null;
              const diasAtraso = expiraData ? Math.floor((Date.now() - expiraData.getTime()) / 86400000) : 0;
              const motivoTitulo = cancelado ? "Assinatura cancelada" : "Pagamento vencido";
              const motivoDescricao = cancelado
                ? "A assinatura desta conta foi cancelada. Para voltar a usar o sistema, faça uma nova assinatura."
                : `O pagamento mensal não foi identificado. O acesso foi bloqueado ${diasAtraso > 0 ? `há ${diasAtraso} dia${diasAtraso > 1 ? "s" : ""}` : "hoje"}.`;
              const motivoDetalhe = cancelado
                ? { label: "Motivo", valor: "Cancelamento solicitado pelo titular" }
                : { label: "Vencimento", valor: expiraData ? expiraData.toLocaleDateString("pt-BR") : "—" };
              return (
                <div style={{ maxWidth: 480, width: "100%", background: "#fff", borderRadius: 24, padding: 40, textAlign: "center", boxShadow: "0 8px 32px rgba(0,0,0,0.10)", border: "2px solid #fecaca" }}>
                  <div style={{ fontSize: 56, marginBottom: 16 }}>🔒</div>
                  <h2 style={{ fontSize: 22, fontWeight: 800, color: "#111827", margin: "0 0 10px" }}>{motivoTitulo}</h2>
                  <p style={{ fontSize: 15, color: "#6b7280", margin: "0 0 24px", lineHeight: 1.6 }}>
                    {motivoDescricao}
                  </p>
                  <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 14, padding: "16px 20px", marginBottom: 28, textAlign: "left", display: "flex", flexDirection: "column", gap: 8 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ fontSize: 13, color: "#9ca3af", fontWeight: 500 }}>Status</span>
                      <span style={{ fontSize: 13, color: "#dc2626", fontWeight: 700, background: "#fee2e2", borderRadius: 20, padding: "2px 12px" }}>
                        {cancelado ? "Cancelado" : "Vencido"}
                      </span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ fontSize: 13, color: "#9ca3af", fontWeight: 500 }}>{motivoDetalhe.label}</span>
                      <span style={{ fontSize: 13, color: "#374151", fontWeight: 600 }}>{motivoDetalhe.valor}</span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ fontSize: 13, color: "#9ca3af", fontWeight: 500 }}>Plano</span>
                      <span style={{ fontSize: 13, color: "#374151", fontWeight: 600 }}>Mensal · R$ 50,00 via PIX</span>
                    </div>
                  </div>
                  <button
                    onClick={() => setLocation("/assinatura")}
                    style={{ width: "100%", background: "linear-gradient(135deg, #b45309, #d97706)", color: "#fff", border: 0, borderRadius: 14, padding: "14px 0", fontWeight: 800, fontSize: 16, cursor: "pointer", marginBottom: 12, boxShadow: "0 4px 14px rgba(180,83,9,0.3)" }}
                  >
                    💳 Renovar agora — R$ 50,00
                  </button>
                  <button
                    onClick={() => { refetchAssinatura?.(); }}
                    style={{ width: "100%", background: "transparent", color: "#6b7280", border: "1px solid #e5e7eb", borderRadius: 14, padding: "11px 0", fontWeight: 600, fontSize: 14, cursor: "pointer" }}
                  >
                    Já paguei — verificar agora
                  </button>
                  <p style={{ fontSize: 12, color: "#9ca3af", marginTop: 16 }}>
                    Dúvidas? Entre em contato com o suporte VendlySys.
                  </p>
                </div>
              );
            })()}
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto p-3 sm:p-6">
            {children}
          </div>
        )}
      </main>

      {/* ── Painel de notificações ───────────────────────────── */}
      {sinoAberto && (
        <div
          style={{
            position: "fixed", bottom: 80, left: 8, zIndex: 200,
            background: "#1c1c1c", color: "#f0ece6",
            borderRadius: 16, boxShadow: "0 8px 32px rgba(0,0,0,0.45)",
            width: 300, maxHeight: 400, overflow: "hidden",
            display: "flex", flexDirection: "column",
            border: "1px solid hsl(20 15% 25%)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 16px", borderBottom: "1px solid hsl(20 15% 25%)" }}>
            <span style={{ fontWeight: 800, fontSize: 13, letterSpacing: 0.5 }}>
              🔔 Novos agendamentos
            </span>
            <button
              onClick={() => setSinoAberto(false)}
              style={{ background: "none", border: "none", cursor: "pointer", color: "hsl(25 15% 62%)", lineHeight: 1, padding: 2 }}
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div style={{ overflowY: "auto", flex: 1 }}>
            {novos.length === 0 ? (
              <div style={{ padding: "24px 16px", textAlign: "center", color: "hsl(25 10% 52%)", fontSize: 13 }}>
                Nenhum novo agendamento desde que você entrou.
              </div>
            ) : (
              novos.map((ag) => (
                <div
                  key={ag.id}
                  style={{ padding: "10px 16px", borderBottom: "1px solid hsl(20 15% 20%)", display: "flex", flexDirection: "column", gap: 2 }}
                >
                  <div style={{ fontWeight: 700, fontSize: 13, color: "#f0ece6" }}>
                    {ag.servico}
                  </div>
                  <div style={{ fontSize: 12, color: "hsl(25 10% 62%)" }}>
                    {ag.cliente_nome ? `Cliente: ${ag.cliente_nome}` : "Sem cliente"} · {ag.hora_inicio}
                  </div>
                  <div style={{ fontSize: 11, color: "hsl(38 90% 65%)", fontWeight: 600 }}>
                    {ag.data ? new Date(ag.data + "T12:00:00").toLocaleDateString("pt-BR") : ""}
                  </div>
                </div>
              ))
            )}
          </div>

          {novos.length > 0 && (
            <div style={{ padding: "10px 16px", borderTop: "1px solid hsl(20 15% 25%)" }}>
              <button
                onClick={() => { limpar(); setSinoAberto(false); }}
                style={{ width: "100%", background: "hsl(20 15% 22%)", border: "none", borderRadius: 8, padding: "8px 0", fontSize: 12, fontWeight: 600, color: "hsl(25 15% 62%)", cursor: "pointer" }}
              >
                Marcar todos como lidos
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── CSS: largura da sidebar via container query ──────── */}
      <style>{`
        aside { width: 56px; }
        @media (min-width: 640px) { aside { width: 220px; } }
        @media (min-width: 1024px) { aside { width: 256px; } }
      `}</style>
    </div>
  );
}
