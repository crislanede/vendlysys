import { useEffect } from "react";
import { useLocation, useRoute } from "wouter";
import { useAuth } from "@/hooks/use-auth";

export function ProtectedRoute({
  component: Component,
  requireAdmin = false,
}: {
  component: React.ComponentType;
  requireAdmin?: boolean;
}) {
  const { usuario, isLoading, isAdmin } = useAuth();
  const [, setLocation] = useLocation();
  const [isLoginRoute] = useRoute("/login");
  const [isTermosRoute] = useRoute("/termos");

  const termosAceitos = !!(usuario as any)?.empresa?.termos_aceitos_em;

  useEffect(() => {
    if (isLoading) return;
    if (!usuario && !isLoginRoute) {
      setLocation("/login");
      return;
    }
    if (usuario && !termosAceitos && !isTermosRoute) {
      setLocation("/termos");
    }
  }, [isLoading, usuario, isLoginRoute, isTermosRoute, termosAceitos, setLocation]);

  if (isLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
      </div>
    );
  }

  if (!usuario) {
    return null;
  }

  if (!termosAceitos && !isTermosRoute) {
    return null;
  }

  if (requireAdmin && !isAdmin) {
    setLocation("/inicio");
    return null;
  }

  return <Component />;
}
