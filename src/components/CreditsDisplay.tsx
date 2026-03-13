import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { getUserCredits, UserCredits } from "@/lib/creditsManager";
import { Zap, AlertCircle } from "lucide-react";
import { Progress } from "@/components/ui/progress";

export default function CreditsDisplay() {
  const { user } = useAuth();
  const [credits, setCredits] = useState<UserCredits | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const fetchCredits = async () => {
      const data = await getUserCredits(user.id);
      setCredits(data);
      setLoading(false);
    };

    fetchCredits();

    // Refresh every 30 seconds
    const interval = setInterval(fetchCredits, 30000);
    return () => clearInterval(interval);
  }, [user]);

  if (loading || !credits) {
    return null;
  }

  const usagePercentage = (credits.used_credits / credits.total_credits) * 100;
  const isLowCredits = credits.remaining_credits <= 1;

  return (
    <div className="glass-card rounded-lg p-3 mb-4">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Zap className={`w-4 h-4 ${isLowCredits ? "text-red-500" : "text-primary"}`} />
          <span className="text-sm font-medium text-foreground">Créditos</span>
        </div>
        <span className={`text-sm font-bold ${isLowCredits ? "text-red-500" : "text-primary"}`}>
          {credits.remaining_credits} / {credits.total_credits}
        </span>
      </div>

      <Progress value={usagePercentage} className="h-2 mb-2" />

      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground capitalize">
          Plano: {credits.plan_type}
        </span>
        {isLowCredits && (
          <div className="flex items-center gap-1 text-xs text-red-500">
            <AlertCircle className="w-3 h-3" />
            Créditos baixos
          </div>
        )}
      </div>
    </div>
  );
}
