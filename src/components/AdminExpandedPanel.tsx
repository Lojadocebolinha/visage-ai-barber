import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Tables } from "@/integrations/supabase/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Users,
  BarChart3,
  Settings,
  Trash2,
  Eye,
  Download,
  Search,
  Plus,
} from "lucide-react";
import { toast } from "sonner";
import { motion } from "framer-motion";

type AdminTab = "overview" | "clients" | "analyses" | "settings";

interface ClientData extends Tables<"auth.users"> {
  analysis_count?: number;
  last_analysis?: string;
}

export default function AdminExpandedPanel() {
  const [activeTab, setActiveTab] = useState<AdminTab>("overview");
  const [clients, setClients] = useState<ClientData[]>([]);
  const [analyses, setAnalyses] = useState<Tables<"analyses">[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [stats, setStats] = useState({
    totalClients: 0,
    totalAnalyses: 0,
    completedAnalyses: 0,
    pendingAnalyses: 0,
  });

  // Carregar dados
  useEffect(() => {
    loadData();
  }, [activeTab]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      if (activeTab === "overview" || activeTab === "clients") {
        await loadClients();
      }
      if (activeTab === "overview" || activeTab === "analyses") {
        await loadAnalyses();
      }
      if (activeTab === "overview") {
        await loadStats();
      }
    } catch (error) {
      console.error("Error loading data:", error);
      toast.error("❌ Erro ao carregar dados");
    } finally {
      setIsLoading(false);
    }
  };

  const loadClients = async () => {
    const { data, error } = await supabase.auth.admin.listUsers();
    if (error) throw error;

    // Enriquecer com dados de análises
    const enrichedClients = await Promise.all(
      (data?.users || []).map(async (user) => {
        const { count } = await supabase
          .from("analyses")
          .select("*", { count: "exact", head: true })
          .eq("user_id", user.id);

        const { data: lastAnalysis } = await supabase
          .from("analyses")
          .select("created_at")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(1)
          .single();

        return {
          ...user,
          analysis_count: count || 0,
          last_analysis: lastAnalysis?.created_at,
        };
      })
    );

    setClients(enrichedClients);
  };

  const loadAnalyses = async () => {
    const { data, error } = await supabase
      .from("analyses")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100);

    if (error) throw error;
    setAnalyses(data || []);
  };

  const loadStats = async () => {
    const { count: totalClients } = await supabase.auth.admin.listUsers();
    const { count: totalAnalyses } = await supabase
      .from("analyses")
      .select("*", { count: "exact", head: true });

    const { count: completedAnalyses } = await supabase
      .from("analyses")
      .select("*", { count: "exact", head: true })
      .eq("status", "completed");

    const { count: pendingAnalyses } = await supabase
      .from("analyses")
      .select("*", { count: "exact", head: true })
      .eq("status", "pending");

    setStats({
      totalClients: totalClients?.total || 0,
      totalAnalyses: totalAnalyses || 0,
      completedAnalyses: completedAnalyses || 0,
      pendingAnalyses: pendingAnalyses || 0,
    });
  };

  // Deletar cliente
  const deleteClient = async (userId: string) => {
    if (!confirm("Tem certeza que deseja deletar este cliente?")) return;

    try {
      await supabase.auth.admin.deleteUser(userId);
      setClients(clients.filter((c) => c.id !== userId));
      toast.success("✅ Cliente deletado com sucesso");
    } catch (error) {
      toast.error("❌ Erro ao deletar cliente");
      console.error(error);
    }
  };

  // Deletar análise
  const deleteAnalysis = async (analysisId: string) => {
    if (!confirm("Tem certeza que deseja deletar esta análise?")) return;

    try {
      await supabase.from("analyses").delete().eq("id", analysisId);
      setAnalyses(analyses.filter((a) => a.id !== analysisId));
      toast.success("✅ Análise deletada com sucesso");
    } catch (error) {
      toast.error("❌ Erro ao deletar análise");
      console.error(error);
    }
  };

  const filteredClients = clients.filter((client) =>
    client.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredAnalyses = analyses.filter((analysis) => {
    const clientEmail = clients.find((c) => c.id === analysis.user_id)?.email || "";
    return clientEmail.toLowerCase().includes(searchTerm.toLowerCase());
  });

  return (
    <div className="w-full space-y-6">
      {/* Tabs */}
      <div className="flex gap-2 border-b border-border overflow-x-auto">
        {[
          { id: "overview", label: "Visão Geral", icon: BarChart3 },
          { id: "clients", label: "Clientes", icon: Users },
          { id: "analyses", label: "Análises", icon: Eye },
          { id: "settings", label: "Configurações", icon: Settings },
        ].map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id as AdminTab)}
            className={`flex items-center gap-2 px-4 py-3 border-b-2 transition-colors whitespace-nowrap ${
              activeTab === id
                ? "border-primary text-primary font-semibold"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <Icon className="w-4 h-4" />
            {label}
          </button>
        ))}
      </div>

      {/* Content */}
      <motion.div
        key={activeTab}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
      >
        {/* Visão Geral */}
        {activeTab === "overview" && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                {
                  label: "Total de Clientes",
                  value: stats.totalClients,
                  color: "bg-blue-500/10 text-blue-600",
                },
                {
                  label: "Total de Análises",
                  value: stats.totalAnalyses,
                  color: "bg-green-500/10 text-green-600",
                },
                {
                  label: "Análises Concluídas",
                  value: stats.completedAnalyses,
                  color: "bg-emerald-500/10 text-emerald-600",
                },
                {
                  label: "Análises Pendentes",
                  value: stats.pendingAnalyses,
                  color: "bg-orange-500/10 text-orange-600",
                },
              ].map((stat, index) => (
                <motion.div
                  key={index}
                  className={`${stat.color} p-4 rounded-lg`}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <p className="text-sm font-medium opacity-75">{stat.label}</p>
                  <p className="text-3xl font-bold mt-2">{stat.value}</p>
                </motion.div>
              ))}
            </div>

            {/* Últimas Análises */}
            <div className="bg-secondary/30 rounded-lg p-4">
              <h3 className="font-semibold mb-4">Últimas Análises</h3>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {analyses.slice(0, 5).map((analysis) => (
                  <div
                    key={analysis.id}
                    className="flex items-center justify-between p-2 bg-secondary/50 rounded"
                  >
                    <div className="text-sm">
                      <p className="font-medium">
                        {clients.find((c) => c.id === analysis.user_id)?.email ||
                          "Desconhecido"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(analysis.created_at || "").toLocaleString(
                          "pt-BR"
                        )}
                      </p>
                    </div>
                    <span
                      className={`text-xs px-2 py-1 rounded ${
                        analysis.status === "completed"
                          ? "bg-green-500/20 text-green-600"
                          : "bg-yellow-500/20 text-yellow-600"
                      }`}
                    >
                      {analysis.status === "completed" ? "Concluída" : "Pendente"}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Clientes */}
        {activeTab === "clients" && (
          <div className="space-y-4">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar cliente..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Button className="gap-2">
                <Plus className="w-4 h-4" />
                Novo Cliente
              </Button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left p-3 font-semibold">Email</th>
                    <th className="text-left p-3 font-semibold">Análises</th>
                    <th className="text-left p-3 font-semibold">Última Análise</th>
                    <th className="text-right p-3 font-semibold">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredClients.map((client) => (
                    <tr key={client.id} className="border-b border-border/50 hover:bg-secondary/30">
                      <td className="p-3">{client.email}</td>
                      <td className="p-3">{client.analysis_count || 0}</td>
                      <td className="p-3 text-xs text-muted-foreground">
                        {client.last_analysis
                          ? new Date(client.last_analysis).toLocaleDateString("pt-BR")
                          : "Nunca"}
                      </td>
                      <td className="p-3 text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => deleteClient(client.id)}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Análises */}
        {activeTab === "analyses" && (
          <div className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Buscar análise..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredAnalyses.map((analysis) => (
                <motion.div
                  key={analysis.id}
                  className="bg-secondary/30 rounded-lg p-4 space-y-3"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                >
                  {analysis.photo_url && (
                    <img
                      src={analysis.photo_url}
                      alt="Análise"
                      className="w-full h-32 object-cover rounded"
                    />
                  )}
                  <div>
                    <p className="text-sm font-medium">
                      {clients.find((c) => c.id === analysis.user_id)?.email ||
                        "Desconhecido"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(analysis.created_at || "").toLocaleString("pt-BR")}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    {analysis.generated_image_url && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1 gap-1"
                        onClick={() => window.open(analysis.generated_image_url)}
                      >
                        <Eye className="w-3 h-3" />
                        Ver
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 gap-1 text-destructive"
                      onClick={() => deleteAnalysis(analysis.id)}
                    >
                      <Trash2 className="w-3 h-3" />
                      Deletar
                    </Button>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        )}

        {/* Configurações */}
        {activeTab === "settings" && (
          <div className="space-y-4 max-w-md">
            <div className="bg-secondary/30 rounded-lg p-4 space-y-3">
              <h3 className="font-semibold">Configurações do Sistema</h3>
              <div className="space-y-2">
                <label className="flex items-center gap-2">
                  <input type="checkbox" defaultChecked className="rounded" />
                  <span className="text-sm">Permitir novos registros</span>
                </label>
                <label className="flex items-center gap-2">
                  <input type="checkbox" defaultChecked className="rounded" />
                  <span className="text-sm">Análise automática habilitada</span>
                </label>
                <label className="flex items-center gap-2">
                  <input type="checkbox" className="rounded" />
                  <span className="text-sm">Modo manutenção</span>
                </label>
              </div>
            </div>

            <Button className="w-full">Salvar Configurações</Button>
          </div>
        )}
      </motion.div>
    </div>
  );
}
