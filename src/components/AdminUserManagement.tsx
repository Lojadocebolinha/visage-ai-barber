import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Tables } from "@/integrations/supabase/types";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Users, Zap, TrendingUp, MoreVertical, Image as ImageIcon, X } from "lucide-react";
import { toast } from "sonner";
import { addCreditsToUser, updateUserPlan } from "@/lib/creditsManager";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface UserWithCredits extends Tables<"profiles"> {
  user_credits?: {
    total_credits: number;
    used_credits: number;
    remaining_credits: number;
    plan_type: string;
  };
  user_roles?: {
    role: string;
  }[];
}

export default function AdminUserManagement() {
  const [users, setUsers] = useState<UserWithCredits[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<string | null>(null);
  const [creditsToAdd, setCreditsToAdd] = useState<number>(5);
  const [selectedImageUrl, setSelectedImageUrl] = useState<string | null>(null);
  const [userAnalyses, setUserAnalyses] = useState<Record<string, Tables<"analyses">[]>>({});

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const { data: profiles, error } = await supabase
        .from("profiles")
        .select(`
          *,
          user_credits: user_credits(total_credits, used_credits, remaining_credits, plan_type),
          user_roles: user_roles(role)
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setUsers(profiles || []);
      setLoading(false);
    } catch (error) {
      toast.error("Erro ao carregar usuários");
      setLoading(false);
    }
  };

  const fetchUserAnalyses = async (userId: string) => {
    try {
      const { data: analyses, error } = await supabase
        .from("analyses")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setUserAnalyses((prev) => ({
        ...prev,
        [userId]: analyses || [],
      }));
    } catch (error) {
      toast.error("Erro ao carregar análises do usuário");
    }
  };

  const handleAddCredits = async (userId: string) => {
    try {
      const success = await addCreditsToUser(userId, creditsToAdd);
      if (success) {
        toast.success(`${creditsToAdd} créditos adicionados!`);
        await fetchUsers();
        setSelectedUser(null);
      } else {
        toast.error("Erro ao adicionar créditos");
      }
    } catch (error) {
      toast.error("Erro ao adicionar créditos");
    }
  };

  const handleUpdatePlan = async (userId: string, planType: "free" | "pro" | "premium") => {
    try {
      const success = await updateUserPlan(userId, planType);
      if (success) {
        toast.success(`Plano atualizado para ${planType}!`);
        await fetchUsers();
      } else {
        toast.error("Erro ao atualizar plano");
      }
    } catch (error) {
      toast.error("Erro ao atualizar plano");
    }
  };

  const handleViewResults = async (userId: string) => {
    if (!userAnalyses[userId]) {
      await fetchUserAnalyses(userId);
    }
  };

  if (loading) {
    return <div className="text-center py-8 text-muted-foreground">Carregando usuários...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-6">
        <Users className="w-5 h-5 text-primary" />
        <h3 className="text-lg font-semibold text-foreground">Gerenciar Usuários</h3>
      </div>

      <div className="space-y-3 max-h-[600px] overflow-y-auto">
        {users.map((user) => {
          const credits = user.user_credits?.[0];
          const role = user.user_roles?.[0]?.role || "cliente";
          const analyses = userAnalyses[user.id] || [];

          return (
            <Card key={user.id} className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <p className="font-medium text-foreground">{user.full_name || "Sem nome"}</p>
                  <p className="text-xs text-muted-foreground">{user.email}</p>
                  <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                    <span className="capitalize">{role}</span>
                    {credits && (
                      <>
                        <div className="flex items-center gap-1">
                          <Zap className="w-3 h-3" />
                          {credits.remaining_credits} / {credits.total_credits}
                        </div>
                        <span className="capitalize">{credits.plan_type}</span>
                      </>
                    )}
                  </div>
                </div>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon">
                      <MoreVertical className="w-4 h-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => handleViewResults(user.id)}>
                      <ImageIcon className="w-4 h-4 mr-2" />
                      Ver Resultados
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setSelectedUser(user.id)}>
                      Adicionar Créditos
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleUpdatePlan(user.id, "free")}>
                      Plano: Gratuito
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleUpdatePlan(user.id, "pro")}>
                      Plano: Pro
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleUpdatePlan(user.id, "premium")}>
                      Plano: Premium
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              {selectedUser === user.id && (
                <div className="mt-3 pt-3 border-t border-border flex gap-2">
                  <input
                    type="number"
                    min="1"
                    value={creditsToAdd}
                    onChange={(e) => setCreditsToAdd(parseInt(e.target.value) || 1)}
                    className="flex-1 px-2 py-1 text-sm bg-secondary border border-border rounded text-foreground"
                    placeholder="Créditos"
                  />
                  <Button
                    size="sm"
                    onClick={() => handleAddCredits(user.id)}
                  >
                    Adicionar
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setSelectedUser(null)}
                  >
                    Cancelar
                  </Button>
                </div>
              )}

              {/* Mostrar resultados gerados */}
              {analyses.length > 0 && (
                <div className="mt-3 pt-3 border-t border-border">
                  <p className="text-xs font-semibold text-muted-foreground mb-2">
                    Resultados Gerados ({analyses.length})
                  </p>
                  <div className="grid grid-cols-3 gap-2">
                    {analyses.map((analysis) => (
                      <div
                        key={analysis.id}
                        className="relative group cursor-pointer rounded overflow-hidden bg-secondary"
                        onClick={() => setSelectedImageUrl(analysis.generated_image_url)}
                      >
                        {analysis.generated_image_url ? (
                          <>
                            <img
                              src={analysis.generated_image_url}
                              alt={`Resultado ${analysis.suggested_cut}`}
                              className="w-full h-24 object-cover hover:opacity-75 transition-opacity"
                            />
                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center">
                              <ImageIcon className="w-4 h-4 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                            </div>
                          </>
                        ) : (
                          <div className="w-full h-24 flex items-center justify-center text-xs text-muted-foreground">
                            Sem imagem
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </Card>
          );
        })}
      </div>

      {/* Modal para visualizar imagem em tela cheia */}
      {selectedImageUrl && (
        <div
          className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4"
          onClick={() => setSelectedImageUrl(null)}
        >
          <div className="relative max-w-2xl w-full" onClick={(e) => e.stopPropagation()}>
            <Button
              variant="ghost"
              size="icon"
              className="absolute top-2 right-2 text-white hover:bg-white/20"
              onClick={() => setSelectedImageUrl(null)}
            >
              <X className="w-4 h-4" />
            </Button>
            <img
              src={selectedImageUrl}
              alt="Resultado em tela cheia"
              className="w-full h-auto rounded-lg"
            />
          </div>
        </div>
      )}
    </div>
  );
}
