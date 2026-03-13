import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Tables } from "@/integrations/supabase/types";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Users, Zap, TrendingUp, MoreVertical } from "lucide-react";
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

  if (loading) {
    return <div className="text-center py-8 text-muted-foreground">Carregando usuários...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-6">
        <Users className="w-5 h-5 text-primary" />
        <h3 className="text-lg font-semibold text-foreground">Gerenciar Usuários</h3>
      </div>

      <div className="space-y-3 max-h-96 overflow-y-auto">
        {users.map((user) => {
          const credits = user.user_credits?.[0];
          const role = user.user_roles?.[0]?.role || "cliente";

          return (
            <Card key={user.id} className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <p className="font-medium text-foreground">{user.full_name || "Sem nome"}</p>
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
            </Card>
          );
        })}
      </div>
    </div>
  );
}
