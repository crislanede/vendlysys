import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/hooks/use-auth";
import { ProtectedRoute } from "@/components/protected-route";

import NotFound from "@/pages/not-found";
import Login from "@/pages/login";
import Portal from "@/pages/portal";
import BaixarApp from "@/pages/baixar";
import Inicio from "@/pages/inicio";
import Agenda from "@/pages/agenda";
import Agendamentos from "@/pages/agendamentos";
import Clientes from "@/pages/clientes";
import Financeiro from "@/pages/financeiro";
import Despesas from "@/pages/despesas";
import Caixa from "@/pages/caixa";
import Usuarios from "@/pages/usuarios";
import Profissionais from "@/pages/profissionais";
import Relatorios from "@/pages/relatorios";
import RelatorioComissoes from "@/pages/relatorio-comissoes";
import Configuracoes from "@/pages/configuracoes";
import Servicos from "@/pages/servicos";
import Assinatura from "@/pages/assinatura";
import Sinais from "@/pages/sinais";
import Bloqueios from "@/pages/bloqueios";
import Termos from "@/pages/termos";
import Privacidade from "@/pages/privacidade";
import Manual from "@/pages/manual";
import Superadmin from "@/pages/superadmin";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
      refetchOnWindowFocus: false,
    },
  },
});

function Router() {
  return (
    <Switch>
      <Route path="/login" component={Login} />
      <Route path="/portal/:slug" component={Portal} />
      <Route path="/portal" component={Portal} />
      <Route path="/baixar/:slug" component={BaixarApp} />
      <Route path="/baixar" component={BaixarApp} />
      <Route path="/">
        <ProtectedRoute component={Inicio} />
      </Route>
      <Route path="/inicio">
        <ProtectedRoute component={Inicio} />
      </Route>
      <Route path="/agenda">
        <ProtectedRoute component={Agenda} />
      </Route>
      <Route path="/agendamentos">
        <ProtectedRoute component={Agendamentos} />
      </Route>
      <Route path="/clientes">
        <ProtectedRoute component={Clientes} />
      </Route>
      <Route path="/financeiro">
        <ProtectedRoute component={Financeiro} requireAdmin />
      </Route>
      <Route path="/despesas">
        <ProtectedRoute component={Despesas} requireAdmin />
      </Route>
      <Route path="/caixa">
        <ProtectedRoute component={Caixa} requireAdmin />
      </Route>
      <Route path="/usuarios">
        <ProtectedRoute component={Usuarios} requireAdmin />
      </Route>
      <Route path="/profissionais">
        <ProtectedRoute component={Profissionais} requireAdmin />
      </Route>
      <Route path="/relatorios">
        <ProtectedRoute component={Relatorios} requireAdmin />
      </Route>
      <Route path="/comissoes">
        <ProtectedRoute component={RelatorioComissoes} requireAdmin />
      </Route>
      <Route path="/configuracoes">
        <ProtectedRoute component={Configuracoes} requireAdmin />
      </Route>
      <Route path="/servicos">
        <ProtectedRoute component={Servicos} requireAdmin />
      </Route>
      <Route path="/assinatura">
        <ProtectedRoute component={Assinatura} requireAdmin />
      </Route>
      <Route path="/bloqueios">
        <ProtectedRoute component={Bloqueios} requireAdmin />
      </Route>
      <Route path="/sinais">
        <ProtectedRoute component={Sinais} requireAdmin />
      </Route>
      <Route path="/termos">
        <ProtectedRoute component={Termos} />
      </Route>
      <Route path="/privacidade" component={Privacidade} />
      <Route path="/manual" component={Manual} />
      <Route path="/superadmin" component={Superadmin} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
            <Router />
          </WouterRouter>
          <Toaster />
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
