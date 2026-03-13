import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Tables } from "@/integrations/supabase/types";
import { Scissors, Users, BarChart3, LogOut, Clock, Settings, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import AdminUserManagement from "@/components/AdminUserManagement";
import AdminAISettings from "@/components/AdminAISettings";

export default function AdminDashboard() {
  const { signOut } = useAuth();
  const [analyses, setAnalyses] = useState<Tables<"analyses">[]>([]);
  const [profiles, setProfiles] = useState<Tables<"profiles">[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"overview" | "clients" | "analyses" | "users" | "settings" | "usage">("overview");

  useEffect(() => {
    Promise.all([
      supabase.from("analyses").select("*").order("created_at", { ascending: false }),
      supabase.from("profiles").select("*").order("created_at", { ascending: false }),
    ]).then(([aRes, pRes]) => {
      setAnalyses(aRes.data || []);
      setProfiles(pRes.data || []);
      setLoading(false);
    });
  }, []);

  const totalAnalyses = analyses.length;
  const completedAnalyses = analyses.filter((a) => a.status === "completed").length;
  const totalClients = profiles.length;

  const stats = [
    { label: "Total Clientes", value: totalClients, icon: Users },
    { label: "Análises Realizadas", value: totalAnalyses, icon: BarChart3 },
    { label: "Análises Concluídas", value: completedAnalyses, icon: Scissors },
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Carregando painel...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-gradient-gold flex items-center justify-center">
            <Scissors className="w-4 h-4 text-primary-foreground" />
          </div>
          <span className="font-display font-semibold text-foreground">VisagiPro</span>
          <span className="text-xs bg-primary/20 text-primary px-2 py-0.5 rounded-full ml-2">Admin</span>
        </div>
        <Button variant="ghost" size="icon" onClick={signOut} className="text-muted-foreground hover:text-foreground">
          <LogOut className="w-4 h-4" />
        </Button>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8">
        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          {stats.map((s) => (
            <div key={s.label} className="glass-card rounded-xl p-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <s.icon className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{s.value}</p>
                  <p className="text-xs text-muted-foreground">{s.label}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
          {(["overview", "clients", "analyses", "users", "settings", "usage"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
                tab === t
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-muted-foreground hover:text-foreground"
              }`}
            >
              {t === "overview" ? "Visão Geral" : t === "clients" ? "Clientes" : t === "analyses" ? "Análises" : t === "users" ? "Usuários" : t === "settings" ? "IA" : "Uso"}
            </button>
          ))}
        </div>

        {/* Content */}
        {tab === "overview" && (
          <div className="space-y-4">
            <h3 className="font-display font-semibold text-foreground">Últimas Análises</h3>
            {analyses.slice(0, 5).map((a) => (
              <div key={a.id} className="glass-card rounded-xl p-4 flex items-center gap-4">
                {a.photo_url && (
                  <img src={a.photo_url} alt="" className="w-12 h-12 rounded-lg object-cover" />
                )}
                <div className="flex-1">
                  <p className="font-medium text-foreground">{a.suggested_cut || "Pendente"}</p>
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {format(new Date(a.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                  </p>
                </div>
                <span
                  className={`text-xs px-2 py-0.5 rounded-full ${
                    a.status === "completed"
                      ? "bg-primary/20 text-primary"
                      : "bg-secondary text-muted-foreground"
                  }`}
                >
                  {a.status === "completed" ? "Concluída" : "Pendente"}
                </span>
              </div>
            ))}
          </div>
        )}

        {tab === "clients" && (
          <div className="space-y-3">
            <h3 className="font-display font-semibold text-foreground">Clientes Cadastrados</h3>
            {profiles.map((p) => (
              <div key={p.id} className="glass-card rounded-xl p-4 flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center">
                  <Users className="w-5 h-5 text-muted-foreground" />
                </div>
                <div>
                  <p className="font-medium text-foreground">{p.full_name || "Sem nome"}</p>
                  <p className="text-xs text-muted-foreground">
                    Desde {format(new Date(p.created_at), "dd/MM/yyyy", { locale: ptBR })}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}

        {tab === "analyses" && (
          <div className="space-y-3">
            <h3 className="font-display font-semibold text-foreground">Todas as Análises</h3>
            {analyses.map((a) => (
              <div key={a.id} className="glass-card rounded-xl p-4">
                <div className="flex items-center gap-4">
                  {a.photo_url && (
                    <img src={a.photo_url} alt="" className="w-14 h-14 rounded-lg object-cover" />
                  )}
                  <div className="flex-1">
                    <p className="font-display font-semibold text-foreground">
                      {a.suggested_cut || "Pendente"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {a.face_shape && `Rosto: ${a.face_shape} · `}
                      {format(new Date(a.created_at), "dd/MM/yyyy", { locale: ptBR })}
                    </p>
                  </div>
                </div>
                {a.cut_explanation && (
                  <p className="text-sm text-muted-foreground mt-3 pl-0 sm:pl-[72px]">
                    {a.cut_explanation}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}

        {tab === "users" && <AdminUserManagement />}

        {tab === "settings" && <AdminAISettings />}

        {tab === "usage" && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-6">
              <TrendingUp className="w-5 h-5 text-primary" />
              <h3 className="text-lg font-semibold text-foreground">Estatísticas de Uso</h3>
            </div>
            <div className="glass-card rounded-xl p-6 text-center">
              <p className="text-muted-foreground mb-4">Estatísticas de uso serão exibidas aqui</p>
              <p className="text-sm text-muted-foreground">Total de análises: {analyses.length}</p>
              <p className="text-sm text-muted-foreground">Análises concluídas: {completedAnalyses}</p>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
