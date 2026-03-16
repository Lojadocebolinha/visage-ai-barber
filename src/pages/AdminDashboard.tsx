import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Scissors, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import AdminExpandedPanel from "@/components/AdminExpandedPanel";

export default function AdminDashboard() {
  const { user, signOut } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Verificar se é admin
  useEffect(() => {
    const checkAdmin = async () => {
      if (!user?.email) {
        setIsLoading(false);
        return;
      }

      // Verificar se o email é do admin
      const adminEmail = "at7477829@gmail.com";
      if (user.email === adminEmail) {
        setIsAdmin(true);
      } else {
        toast.error("❌ Acesso negado. Você não é um administrador.");
      }

      setIsLoading(false);
    };

    checkAdmin();
  }, [user]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-secondary/20 flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 rounded-full bg-primary/20 animate-pulse mx-auto" />
          <p className="text-muted-foreground">Carregando painel administrativo...</p>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-secondary/20 flex items-center justify-center">
        <div className="text-center space-y-4 max-w-md">
          <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mx-auto">
            <Scissors className="w-8 h-8 text-destructive" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">Acesso Negado</h1>
          <p className="text-muted-foreground">
            Você não tem permissão para acessar o painel administrativo.
          </p>
          <Button onClick={() => window.location.href = "/"} className="w-full">
            Voltar para o Início
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-secondary/20">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-border/50 bg-background/95 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center">
              <Scissors className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="font-bold text-foreground">VisagiPro Admin</h1>
              <p className="text-xs text-muted-foreground">Painel de Administração</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-right text-sm">
              <p className="font-medium text-foreground">{user?.email}</p>
              <p className="text-xs text-muted-foreground">Administrador</p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={signOut}
              className="text-muted-foreground hover:text-foreground"
            >
              <LogOut className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="bg-card border border-border rounded-2xl p-6 md:p-8 shadow-lg">
          <AdminExpandedPanel />
        </div>
      </main>
    </div>
  );
}
