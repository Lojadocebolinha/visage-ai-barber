import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Tables } from "@/integrations/supabase/types";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Search, Trash2, Download, Eye } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";

interface EnhancedClientHistoryProps {
  onSelectAnalysis?: (analysis: Tables<"analyses">) => void;
}

export default function EnhancedClientHistory({ onSelectAnalysis }: EnhancedClientHistoryProps) {
  const { user } = useAuth();
  const [analyses, setAnalyses] = useState<Tables<"analyses">[]>([]);
  const [filteredAnalyses, setFilteredAnalyses] = useState<Tables<"analyses">[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState<"all" | "completed" | "pending">("all");

  useEffect(() => {
    if (!user) return;
    fetchAnalyses();
  }, [user]);

  useEffect(() => {
    filterAnalyses();
  }, [analyses, searchTerm, filterStatus]);

  const fetchAnalyses = async () => {
    try {
      const { data, error } = await supabase
        .from("analyses")
        .select("*")
        .eq("user_id", user?.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setAnalyses(data || []);
      setLoading(false);
    } catch (error) {
      toast.error("Erro ao carregar histórico");
      setLoading(false);
    }
  };

  const filterAnalyses = () => {
    let filtered = analyses;

    if (searchTerm) {
      filtered = filtered.filter(
        (a) =>
          a.suggested_cut?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          a.face_shape?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (filterStatus !== "all") {
      filtered = filtered.filter((a) => a.status === filterStatus);
    }

    setFilteredAnalyses(filtered);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Tem certeza que deseja deletar esta análise?")) return;

    try {
      const { error } = await supabase.from("analyses").delete().eq("id", id);
      if (error) throw error;
      setAnalyses(analyses.filter((a) => a.id !== id));
      toast.success("Análise deletada com sucesso!");
    } catch (error) {
      toast.error("Erro ao deletar análise");
    }
  };

  const handleDownload = async (analysis: Tables<"analyses">) => {
    if (!analysis.generated_image_url) {
      toast.error("Imagem não disponível");
      return;
    }

    try {
      const response = await fetch(analysis.generated_image_url);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `visagismo-${analysis.id}.png`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast.success("Imagem baixada!");
    } catch (error) {
      toast.error("Erro ao baixar imagem");
    }
  };

  if (loading) {
    return <div className="text-center py-8 text-muted-foreground">Carregando histórico...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-2 mb-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por corte ou forma do rosto..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      <div className="flex gap-2 mb-4">
        {(["all", "completed", "pending"] as const).map((status) => (
          <Button
            key={status}
            variant={filterStatus === status ? "default" : "outline"}
            size="sm"
            onClick={() => setFilterStatus(status)}
          >
            {status === "all" ? "Todas" : status === "completed" ? "Concluídas" : "Pendentes"}
          </Button>
        ))}
      </div>

      {filteredAnalyses.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          {analyses.length === 0 ? "Nenhuma análise realizada ainda" : "Nenhuma análise encontrada"}
        </div>
      ) : (
        <div className="space-y-3 max-h-96 overflow-y-auto">
          {filteredAnalyses.map((analysis) => (
            <Card key={analysis.id} className="p-4">
              <div className="flex gap-4">
                {analysis.photo_url && (
                  <img
                    src={analysis.photo_url}
                    alt=""
                    className="w-16 h-16 rounded-lg object-cover flex-shrink-0"
                  />
                )}

                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-medium text-foreground truncate">
                        {analysis.suggested_cut || "Pendente"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(analysis.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                      </p>
                    </div>
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full whitespace-nowrap ${
                        analysis.status === "completed"
                          ? "bg-primary/20 text-primary"
                          : "bg-secondary text-muted-foreground"
                      }`}
                    >
                      {analysis.status === "completed" ? "Concluída" : "Pendente"}
                    </span>
                  </div>

                  {analysis.face_shape && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Rosto: <span className="capitalize">{analysis.face_shape}</span>
                    </p>
                  )}
                </div>
              </div>

              <div className="flex gap-2 mt-3 pt-3 border-t border-border">
                {onSelectAnalysis && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onSelectAnalysis(analysis)}
                    className="flex-1"
                  >
                    <Eye className="w-3 h-3 mr-1" />
                    Ver
                  </Button>
                )}

                {analysis.generated_image_url && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleDownload(analysis)}
                  >
                    <Download className="w-3 h-3" />
                  </Button>
                )}

                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleDelete(analysis.id)}
                  className="text-red-500 hover:text-red-600"
                >
                  <Trash2 className="w-3 h-3" />
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
