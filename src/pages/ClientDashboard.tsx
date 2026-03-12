import { useState, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import PreAnalysisForm from "@/components/PreAnalysisForm";
import PhotoUpload from "@/components/PhotoUpload";
import AnalysisResult from "@/components/AnalysisResult";
import { Tables } from "@/integrations/supabase/types";
import { Scissors, History, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import ClientHistory from "@/components/ClientHistory";

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

  const handlePhotoUpload = async (file: File) => {
    if (!user) return;
    setUploading(true);

    try {
      // Upload photo
      const fileName = `${user.id}/${Date.now()}-${file.name}`;
      const { error: uploadError } = await supabase.storage
        .from("analysis-photos")
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from("analysis-photos")
        .getPublicUrl(fileName);

      // Create analysis record
      const { data, error } = await supabase
        .from("analyses")
        .insert({
          user_id: user.id,
          photo_url: publicUrl,
          answers: answers,
          status: "pending",
        })
        .select()
        .single();

      if (error) throw error;

      setAnalysis(data);
      setStep("analyzing");

      // Call real AI analysis edge function
      const { data: aiResult, error: aiError } = await supabase.functions.invoke("analyze-face", {
        body: {
          analysisId: data.id,
          photoUrl: publicUrl,
          answers: answers,
        },
      });

      if (aiError) {
        console.error("AI analysis error:", aiError);
        toast.error("Erro na análise. Tente novamente.");
        setStep("photo");
        return;
      }

      if (aiResult?.error) {
        if (aiResult.error === "RATE_LIMITED") {
          toast.error("Muitas requisições. Aguarde um momento e tente novamente.");
        } else if (aiResult.error === "PAYMENT_REQUIRED") {
          toast.error("Créditos insuficientes para análise IA.");
        } else {
          toast.error("Erro na análise: " + aiResult.error);
        }
        setStep("photo");
        return;
      }

      // Fetch updated analysis from DB
      const { data: updated } = await supabase
        .from("analyses")
        .select()
        .eq("id", data.id)
        .single();

      if (updated) setAnalysis(updated);
      setStep("result");
    } catch (err: any) {
      toast.error(err.message || "Erro ao enviar foto");
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
      {/* Header */}
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

      {/* Content */}
      <main className="max-w-lg mx-auto px-4 py-8">
        {step === "questionnaire" && (
          <div>
            <h2 className="text-2xl font-display font-bold text-foreground mb-2">
              Pré-Análise
            </h2>
            <p className="text-muted-foreground text-sm mb-6">
              Responda algumas perguntas para personalizarmos sua sugestão.
            </p>
            <PreAnalysisForm onComplete={handlePreAnalysisComplete} />
          </div>
        )}

        {step === "photo" && (
          <PhotoUpload onUpload={handlePhotoUpload} uploading={uploading} />
        )}

        {step === "analyzing" && (
          <div className="text-center py-16 animate-fade-in">
            <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-gradient-gold flex items-center justify-center animate-pulse">
              <Scissors className="w-8 h-8 text-primary-foreground" />
            </div>
            <h3 className="text-xl font-display font-semibold text-foreground mb-2">
              Analisando...
            </h3>
            <p className="text-muted-foreground text-sm">
              Nosso visagista IA está avaliando seu rosto e preferências.
            </p>
          </div>
        )}

        {step === "result" && analysis && (
          <div>
            <AnalysisResult analysis={analysis} onSave={handleSave} />
            <Button
              variant="outline"
              onClick={startNew}
              className="w-full mt-4 border-border text-foreground"
            >
              Nova Análise
            </Button>
          </div>
        )}

        {step === "history" && <ClientHistory />}
      </main>
    </div>
  );
}
