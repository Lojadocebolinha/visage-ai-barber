import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Tables } from "@/integrations/supabase/types";
import { Scissors, Calendar } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function ClientHistory() {
  const { user } = useAuth();
  const [analyses, setAnalyses] = useState<Tables<"analyses">[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("analyses")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        setAnalyses(data || []);
        setLoading(false);
      });
  }, [user]);

  if (loading) {
    return <p className="text-muted-foreground text-center py-8">Carregando...</p>;
  }

  if (analyses.length === 0) {
    return (
      <div className="text-center py-16">
        <Scissors className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
        <p className="text-foreground font-medium">Nenhuma análise ainda</p>
        <p className="text-muted-foreground text-sm">Faça sua primeira análise visagista!</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-display font-bold text-foreground mb-4">Seu Histórico</h2>
      {analyses.map((a) => (
        <div key={a.id} className="glass-card rounded-xl p-4 flex gap-4">
          {a.photo_url && (
            <img
              src={a.photo_url}
              alt="Foto da análise"
              className="w-16 h-16 rounded-lg object-cover flex-shrink-0"
            />
          )}
          <div className="flex-1 min-w-0">
            <p className="font-display font-semibold text-foreground truncate">
              {a.suggested_cut || "Análise pendente"}
            </p>
            <p className="text-muted-foreground text-xs flex items-center gap-1 mt-1">
              <Calendar className="w-3 h-3" />
              {format(new Date(a.created_at), "dd 'de' MMM, yyyy", { locale: ptBR })}
            </p>
            <span
              className={`inline-block mt-2 text-xs px-2 py-0.5 rounded-full ${
                a.status === "completed"
                  ? "bg-primary/20 text-primary"
                  : "bg-secondary text-muted-foreground"
              }`}
            >
              {a.status === "completed" ? "Concluída" : "Pendente"}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}
