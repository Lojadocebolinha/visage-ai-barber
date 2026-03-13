import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import PreAnalysisForm from "@/components/PreAnalysisForm";
import PhotoUpload from "@/components/PhotoUpload";
import ProfessionalAnalysisResult from "@/components/ProfessionalAnalysisResult";
import CreditsDisplay from "@/components/CreditsDisplay";
import LoadingAnimation from "@/components/LoadingAnimation";
import { Tables } from "@/integrations/supabase/types";
import { Scissors, History, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import ClientHistory from "@/components/ClientHistory";
import { translations } from "@/lib/translations";

type Step = "questionnaire" | "photo" | "analyzing" | "result" | "history";

export default function ClientDashboard() {
  const { user, signOut } = useAuth();
  const [step, setStep] = useState<Step>("questionnaire");
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [analysis, setAnalysis] = useState<Tables<"analyses"> | null>(null);
  const [uploading, setUploading] = useState(false);

  const handlePreAnalysisComplete = (ans: Record<string, string>) => {
    setAnswers(ans);
    setStep("photo");
  };

  const runAnalysis = async (currentAnalysis: Tables<"analyses">, photoUrl: string) => {
    setStep("analyzing");

    const { data: aiResult, error: aiError } = await supabase.functions.invoke("analyze-face", {
      body: {
        analysisId: currentAnalysis.id,
        photoUrl,
        answers,
      },
    });

    if (aiError) {
      console.error("AI analysis error:", aiError);
      toast.error(translations.dashboard.erro_analise);
      setStep("photo");
      return;
    }

    if (aiResult?.error) {
      if (aiResult.error === "RATE_LIMITED") {
        toast.error("Muitas requisições. Aguarde um momento e tente novamente.");
      } else if (aiResult.error === "PAYMENT_REQUIRED") {
        toast.error(translations.dashboard.sem_creditos);
      } else if (aiResult.error === "IMAGE_GENERATION_FAILED") {
        toast.error("Não foi possível gerar a imagem do corte. Tente novamente.");
      } else {
        toast.error("Erro na análise: " + aiResult.error);
      }
      setStep("photo");
      return;
    }

    const { data: updated, error: fetchError } = await supabase
      .from("analyses")
      .select()
      .eq("id", currentAnalysis.id)
      .single();

    if (fetchError || !updated) {
      toast.error("Não foi possível carregar o resultado da análise.");
      setStep("photo");
      return;
    }

    if (!updated.generated_image_url) {
      toast.error("A análise foi concluída, mas a imagem não foi gerada.");
      setStep("photo");
      return;
    }

    setAnalysis(updated);
    setStep("result");
  };

  const handlePhotoUpload = async (file: File) => {
    if (!user) return;
    setUploading(true);

    try {
      const fileName = `${user.id}/${Date.now()}-${file.name}`;
      const { error: uploadError } = await supabase.storage
        .from("analysis-photos")
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const {
        data: { publicUrl },
      } = supabase.storage.from("analysis-photos").getPublicUrl(fileName);

      const { data, error } = await supabase
        .from("analyses")
        .insert({
          user_id: user.id,
          photo_url: publicUrl,
          answers,
          status: "pending",
        })
        .select()
        .single();

      if (error) throw error;

      setAnalysis(data);
      await runAnalysis(data, publicUrl);
    } catch (err: any) {
      toast.error(err.message || "Erro ao enviar foto");
      setStep("photo");
    } finally {
      setUploading(false);
    }
  };

  const handleRegenerate = async () => {
    if (!analysis?.photo_url) {
      toast.error("Foto original não encontrada para gerar novamente.");
      return;
    }

    try {
      setUploading(true);
      await runAnalysis(analysis, analysis.photo_url);
    } catch {
      toast.error("Erro ao gerar novamente.");
    } finally {
      setUploading(false);
    }
  };

  const handleSave = () => {
    toast.success("Análise salva no histórico!");
  };

  const startNew = () => {
    setStep("questionnaire");
    setAnswers({});
    setAnalysis(null);
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-gradient-gold flex items-center justify-center">
            <Scissors className="w-4 h-4 text-primary-foreground" />
          </div>
          <span className="font-display font-semibold text-foreground">VisagiPro</span>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setStep(step === "history" ? "questionnaire" : "history")}
            className="text-muted-foreground hover:text-foreground"
          >
            <History className="w-4 h-4 mr-1" />
            {step === "history" ? "Nova Análise" : "Histórico"}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={signOut}
            className="text-muted-foreground hover:text-foreground"
          >
            <LogOut className="w-4 h-4" />
          </Button>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-8">
        <CreditsDisplay />

        {step === "questionnaire" && (
          <div>
            <h2 className="text-2xl font-display font-bold text-foreground mb-2">{translations.dashboard.pre_analise}</h2>
            <p className="text-muted-foreground text-sm mb-6">
              {translations.dashboard.responda_perguntas}
            </p>
            <PreAnalysisForm onComplete={handlePreAnalysisComplete} />
          </div>
        )}

        {step === "photo" && <PhotoUpload onUpload={handlePhotoUpload} uploading={uploading} />}

        {step === "analyzing" && <LoadingAnimation step="analyzing" />}

        {step === "result" && analysis && (
          <div>
            <ProfessionalAnalysisResult
              analysis={analysis}
              onSave={handleSave}
              onRegenerate={handleRegenerate}
            />
            <Button
              variant="outline"
              onClick={startNew}
              className="w-full mt-4 border-border text-foreground"
            >
              {translations.dashboard.resultado}
            </Button>
          </div>
        )}

        {step === "history" && <ClientHistory />}
      </main>
    </div>
  );
}
