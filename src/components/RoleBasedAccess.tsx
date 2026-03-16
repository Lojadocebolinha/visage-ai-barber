import { ReactNode } from "react";
import { useAuth } from "@/contexts/AuthContext";
import type { Database } from "@/integrations/supabase/types";

type AppRole = Database["public"]["Enums"]["app_role"];

interface RoleBasedAccessProps {
  children: ReactNode;
  requiredRoles: AppRole[];
  fallback?: ReactNode;
}

export function RoleBasedAccess({
  children,
  requiredRoles,
  fallback = null,
}: RoleBasedAccessProps) {
  const { role, loading } = useAuth();

  if (loading) {
    return <div className="text-muted-foreground">Carregando...</div>;
  }

  if (!role || !requiredRoles.includes(role as AppRole)) {
    return fallback || <div className="text-destructive">Acesso negado</div>;
  }

  return <>{children}</>;
}

interface RoleBasedButtonProps {
  children: ReactNode;
  requiredRoles: AppRole[];
  disabled?: boolean;
  className?: string;
  onClick?: () => void;
}

export function RoleBasedButton({
  children,
  requiredRoles,
  disabled = false,
  className = "",
  onClick,
}: RoleBasedButtonProps) {
  const { role, loading } = useAuth();

  const hasAccess = role && requiredRoles.includes(role as AppRole);

  return (
    <button
      onClick={onClick}
      disabled={!hasAccess || disabled || loading}
      className={`${className} ${!hasAccess ? "opacity-50 cursor-not-allowed" : ""}`}
      title={!hasAccess ? "Você não tem permissão para esta ação" : ""}
    >
      {children}
    </button>
  );
}

interface RoleDisplayProps {
  roleLabel?: Record<string, string>;
}

export function RoleDisplay({ roleLabel }: RoleDisplayProps) {
  const { role, loading } = useAuth();

  if (loading) return <span className="text-muted-foreground">...</span>;

  const defaultLabels: Record<string, string> = {
    cliente: "Cliente",
    barbeiro: "Barbeiro",
    admin: "Administrador",
  };

  const labels = { ...defaultLabels, ...roleLabel };

  return (
    <span className="px-2 py-1 bg-primary/10 text-primary rounded text-sm font-medium">
      {labels[role || "cliente"] || role || "Desconhecido"}
    </span>
  );
}
