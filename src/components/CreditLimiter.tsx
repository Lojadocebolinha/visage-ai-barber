import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { AlertCircle, Zap } from "lucide-react";
import { toast } from "sonner";

interface CreditLimiterProps {
  costPerAnalysis?: number;
  onLimitReached?: () => void;
}

interface UserCredits {
  total_credits: number;
  used_credits: number;
  remaining_credits: number;
  daily_limit: number;
  daily_used: number;
  plan: string;
}

export default function CreditLimiter({
  costPerAnalysis = 1,
  onLimitReached,
}: CreditLimiterProps) {
  const { user } = useAuth();
  const [credits, setCredits] = useState<UserCredits | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user?.id) {
      loadCredits();
    }
  }, [user?.id]);

  const loadCredits = async () => {
    if (!user?.id) return;

    try {
      setLoading(true);

      // Buscar créditos do usuário
      const { data: creditData } = await supabase
        .from("user_credits")
        .select("*")
        .eq("user_id", user.id)
        .single();

      if (creditData) {
        const remaining = creditData.total_credits - creditData.used_credits;
        const dailyUsed = creditData.daily_used || 0;
        const dailyRemaining = Math.max(0, creditData.daily_limit - dailyUsed);

        setCredits({
          total_credits: creditData.total_credits,
          used_credits: creditData.used_credits,
          remaining_credits: remaining,
          daily_limit: creditData.daily_limit,
          daily_used: dailyUsed,
          plan: creditData.plan || "free",
        });
      } else {
        // Criar registro padrão para novo usuário
        const { data: newCredit } = await supabase
          .from("user_credits")
          .insert({
            user_id: user.id,
            total_credits: 3, // 3 análises grátis
            used_credits: 0,
            daily_limit: 1,
            daily_used: 0,
            plan: "free",
          })
          .select()
          .single();

        if (newCredit) {
          setCredits({
            total_credits: 3,
            used_credits: 0,
            remaining_credits: 3,
            daily_limit: 1,
            daily_used: 0,
            plan: "free",
          });
        }
      }
    } catch (error) {
      console.error("Error loading credits:", error);
      toast.error("❌ Erro ao carregar créditos");
    } finally {
      setLoading(false);
    }
  };

  const checkCreditsAvailable = (): boolean => {
    if (!credits) return false;

    const hasCredits = credits.remaining_credits >= costPerAnalysis;
    const hasDailyLimit = credits.daily_used < credits.daily_limit;

    if (!hasCredits) {
      toast.error("❌ Você não tem créditos suficientes");
      onLimitReached?.();
      return false;
    }

    if (!hasDailyLimit) {
      toast.error("⏱️ Você atingiu o limite diário de análises");
      onLimitReached?.();
      return false;
    }

    return true;
  };

  const deductCredits = async (): Promise<boolean> => {
    if (!user?.id || !credits) return false;

    try {
      const newUsed = credits.used_credits + costPerAnalysis;
      const newDailyUsed = credits.daily_used + 1;

      const { error } = await supabase
        .from("user_credits")
        .update({
          used_credits: newUsed,
          daily_used: newDailyUsed,
        })
        .eq("user_id", user.id);

      if (error) throw error;

      // Atualizar estado local
      setCredits({
        ...credits,
        used_credits: newUsed,
        remaining_credits: credits.remaining_credits - costPerAnalysis,
        daily_used: newDailyUsed,
      });

      return true;
    } catch (error) {
      console.error("Error deducting credits:", error);
      toast.error("❌ Erro ao deduzir créditos");
      return false;
    }
  };

  if (loading) {
    return <div className="text-muted-foreground">Carregando créditos...</div>;
  }

  if (!credits) {
    return <div className="text-destructive">Erro ao carregar créditos</div>;
  }

  const percentageUsed = (credits.used_credits / credits.total_credits) * 100;
  const isLowCredit = credits.remaining_credits <= 1;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Zap className={`w-4 h-4 ${isLowCredit ? "text-yellow-500" : "text-blue-500"}`} />
          <span className="font-semibold">Créditos</span>
        </div>
        <span className={`font-bold ${isLowCredit ? "text-yellow-600" : "text-foreground"}`}>
          {credits.remaining_credits}/{credits.total_credits}
        </span>
      </div>

      {/* Progress Bar */}
      <div className="w-full bg-secondary rounded-full h-2 overflow-hidden">
        <div
          className={`h-full transition-all ${
            isLowCredit ? "bg-yellow-500" : "bg-blue-500"
          }`}
          style={{ width: `${percentageUsed}%` }}
        />
      </div>

      {/* Daily Limit */}
      <div className="text-xs text-muted-foreground">
        Análises hoje: {credits.daily_used}/{credits.daily_limit}
      </div>

      {/* Plan Info */}
      <div className="text-xs font-medium text-muted-foreground">
        Plano: <span className="capitalize">{credits.plan}</span>
      </div>

      {/* Warning */}
      {isLowCredit && (
        <div className="flex items-center gap-2 p-2 bg-yellow-500/10 border border-yellow-500/30 rounded text-yellow-700 text-xs">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>Créditos baixos. Considere fazer upgrade do plano.</span>
        </div>
      )}

      {/* Upgrade Button */}
      {credits.plan === "free" && (
        <button className="w-full px-3 py-2 bg-primary text-primary-foreground rounded text-sm font-medium hover:bg-primary/90 transition-colors">
          Fazer Upgrade
        </button>
      )}
    </div>
  );
}

// Hook para usar o sistema de créditos
export function useCredits() {
  const { user } = useAuth();
  const [credits, setCredits] = useState<UserCredits | null>(null);

  useEffect(() => {
    if (user?.id) {
      loadCredits();
    }
  }, [user?.id]);

  const loadCredits = async () => {
    if (!user?.id) return;

    try {
      const { data } = await supabase
        .from("user_credits")
        .select("*")
        .eq("user_id", user.id)
        .single();

      if (data) {
        setCredits({
          total_credits: data.total_credits,
          used_credits: data.used_credits,
          remaining_credits: data.total_credits - data.used_credits,
          daily_limit: data.daily_limit,
          daily_used: data.daily_used || 0,
          plan: data.plan || "free",
        });
      }
    } catch (error) {
      console.error("Error loading credits:", error);
    }
  };

  const deductCredits = async (amount: number = 1): Promise<boolean> => {
    if (!user?.id || !credits) return false;

    try {
      const { error } = await supabase
        .from("user_credits")
        .update({
          used_credits: credits.used_credits + amount,
          daily_used: credits.daily_used + 1,
        })
        .eq("user_id", user.id);

      if (error) throw error;

      setCredits({
        ...credits,
        used_credits: credits.used_credits + amount,
        remaining_credits: credits.remaining_credits - amount,
        daily_used: credits.daily_used + 1,
      });

      return true;
    } catch (error) {
      console.error("Error deducting credits:", error);
      return false;
    }
  };

  return { credits, deductCredits, loadCredits };
}
