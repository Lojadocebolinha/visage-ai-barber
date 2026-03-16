import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Tables } from "@/integrations/supabase/types";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Home } from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import ProgressBar from "@/components/ProgressBar";
import CameraCapture from "@/components/CameraCapture";
import PreAnalysisForm from "@/components/PreAnalysisForm";
import LoadingAnimation from "@/components/LoadingAnimation";
import ProfessionalAnalysisResult from "@/components/ProfessionalAnalysisResult";
import ClientTechnicalSheet from "@/components/ClientTechnicalSheet";
import { translations } from "@/lib/translations";

type FlowStep = "form" | "camera" | "analyzing" | "result" | "sheet" | "saved";

interface FlowState {
  currentStep: FlowStep;
  answers: Record<string, string>;
  analysis: Tables<"analyses"> | null;
  photoFile: File | null;
}

export default function AnalysisFlow() {
  const { user } = useAuth();
  const [flowState, setFlowState] = useState<FlowState>({
    currentStep: "form",
    answers: {},
    analysis: null,
    photoFile: null,
  });
  const [isLoading, setIsLoading] = useState(false);

  const stepLabels = ["Formulário", "Câmera", "Análise", "Resultado", "Ficha"];
  const stepMap: Record<FlowStep, number> = {
    form: 1,
    camera: 2,
    analyzing: 3,
    result: 4,
    sheet: 5,
    saved: 5,
  };

  // Voltar para o passo anterior
  const goBack = () => {
    const steps: FlowStep[] = ["form", "camera", "analyzing", "result", "sheet"];
    const currentIndex = steps.indexOf(flowState.currentStep);
    if (currentIndex > 0) {
      setFlowState((prev) => ({
        ...prev,
        currentStep: steps[currentIndex - 1],
      }));
    }
  };

  // Avançar para o próximo passo
  const goNext = (nextStep: FlowStep) => {
    setFlowState((prev) => ({
      ...prev,
      currentStep: nextStep,
    }));
  };

  // Completar formulário
  const handleFormComplete = (answers: Record<string, string>) => {
    setFlowState((prev) => ({
      ...prev,
      answers,
      currentStep: "camera",
    }));
  };

  // Capturar foto
  const handlePhotoCapture = async (file: File) => {
    if (!user) return;

    setIsLoading(true);
    try {
      // Upload da foto
      const fileName = `${user.id}/${Date.now()}-${file.name}`;
      const { error: uploadError } = await supabase.storage
        .from("analysis-photos")
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from("analysis-photos")
        .getPublicUrl(fileName);

      // Criar registro de análise
      const { data, error } = await supabase
        .from("analyses")
        .insert({
          user_id: user.id,
          photo_url: publicUrl,
          answers: flowState.answers,
          status: "pending",
        })
        .select()
        .single();

      if (error) throw error;

      setFlowState((prev) => ({
        ...prev,
        photoFile: file,
        analysis: data,
        currentStep: "analyzing",
      }));

      // Executar análise
      await runAnalysis(data, publicUrl);
    } catch (error: any) {
      toast.error("❌ Erro ao capturar foto: " + error.message);
      setFlowState((prev) => ({
        ...prev,
        currentStep: "camera",
      }));
    } finally {
      setIsLoading(false);
    }
  };

  // Executar análise com IA
  const runAnalysis = async (
    analysis: Tables<"analyses">,
    photoUrl: string
  ) => {
    try {
      const { data: aiResult, error: aiError } = await supabase.functions.invoke(
        "analyze-face",
        {
          body: {
            analysisId: analysis.id,
            photoUrl,
            answers: flowState.answers,
          },
        }
      );

      if (aiError) throw aiError;

      if (aiResult?.error) {
        throw new Error(aiResult.error);
      }

      // Buscar resultado atualizado
      const { data: updated, error: fetchError } = await supabase
        .from("analyses")
        .select()
        .eq("id", analysis.id)
        .single();

      if (fetchError || !updated) throw fetchError;

      setFlowState((prev) => ({
        ...prev,
        analysis: updated,
        currentStep: "result",
      }));

      toast.success("✅ Análise concluída com sucesso!");
    } catch (error: any) {
      toast.error("❌ Erro na análise: " + error.message);
      setFlowState((prev) => ({
        ...prev,
        currentStep: "result",
      }));
    }
  };

  // Regenerar análise
  const handleRegenerate = async () => {
    if (!flowState.analysis?.photo_url) return;

    setFlowState((prev) => ({
      ...prev,
      currentStep: "analyzing",
    }));

    await runAnalysis(flowState.analysis, flowState.analysis.photo_url);
  };

  // Salvar cliente
  const handleSaveClient = async () => {
    try {
      toast.success("✅ Cliente salvo com sucesso!");
      setFlowState((prev) => ({
        ...prev,
        currentStep: "sheet",
      }));
    } catch (error) {
      toast.error("❌ Erro ao salvar cliente");
    }
  };

  // Iniciar nova análise
  const startNewAnalysis = () => {
    setFlowState({
      currentStep: "form",
      answers: {},
      analysis: null,
      photoFile: null,
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-secondary/20">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-border/50 bg-background/95 backdrop-blur-sm">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center">
              <span className="text-white font-bold">V</span>
            </div>
            <div>
              <h1 className="font-bold text-foreground">VisagiPro</h1>
              <p className="text-xs text-muted-foreground">Análise Facial com IA</p>
            </div>
          </div>

          <Button variant="ghost" size="icon" onClick={() => window.location.href = "/"}>
            <Home className="w-5 h-5" />
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 py-8">
        {/* Progress Bar */}
        {flowState.currentStep !== "saved" && (
          <div className="mb-8">
            <ProgressBar
              currentStep={stepMap[flowState.currentStep]}
              totalSteps={5}
              stepLabels={stepLabels}
            />
          </div>
        )}

        {/* Content */}
        <AnimatePresence mode="wait">
          <motion.div
            key={flowState.currentStep}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
            className="bg-card border border-border rounded-2xl p-6 md:p-8 shadow-lg"
          >
            {/* Formulário */}
            {flowState.currentStep === "form" && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-2xl font-bold text-foreground mb-2">
                    Informações Iniciais
                  </h2>
                  <p className="text-muted-foreground">
                    Responda algumas perguntas para personalizarmos sua análise
                  </p>
                </div>
                <PreAnalysisForm onComplete={handleFormComplete} />
              </div>
            )}

            {/* Câmera */}
            {flowState.currentStep === "camera" && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-2xl font-bold text-foreground mb-2">
                    Capturar Foto
                  </h2>
                  <p className="text-muted-foreground">
                    Centralize seu rosto na moldura para melhor resultado
                  </p>
                </div>
                <CameraCapture
                  onCapture={() => {}}
                  onUpload={handlePhotoCapture}
                  isLoading={isLoading}
                />
              </div>
            )}

            {/* Analisando */}
            {flowState.currentStep === "analyzing" && (
              <div className="flex flex-col items-center justify-center py-12">
                <LoadingAnimation step="analyzing" />
                <p className="mt-4 text-muted-foreground">
                  Analisando sua foto com IA...
                </p>
              </div>
            )}

            {/* Resultado */}
            {flowState.currentStep === "result" && flowState.analysis && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-2xl font-bold text-foreground mb-2">
                    Resultado da Análise
                  </h2>
                </div>
                <ProfessionalAnalysisResult
                  analysis={flowState.analysis}
                  onSave={handleSaveClient}
                  onRegenerate={handleRegenerate}
                />
              </div>
            )}

            {/* Ficha Técnica */}
            {flowState.currentStep === "sheet" && flowState.analysis && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-2xl font-bold text-foreground mb-2">
                    Ficha Técnica
                  </h2>
                  <p className="text-muted-foreground">
                    Exporte ou compartilhe a análise completa
                  </p>
                </div>
                <ClientTechnicalSheet
                  analysis={flowState.analysis}
                  clientName={user?.user_metadata?.name || "Cliente"}
                  clientEmail={user?.email}
                />
              </div>
            )}
          </motion.div>
        </AnimatePresence>

        {/* Navigation Buttons */}
        <div className="mt-6 flex gap-3">
          {flowState.currentStep !== "form" && (
            <Button
              variant="outline"
              onClick={goBack}
              className="gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Voltar
            </Button>
          )}

          {flowState.currentStep === "sheet" && (
            <Button
              onClick={startNewAnalysis}
              className="flex-1"
            >
              Nova Análise
            </Button>
          )}

          {flowState.currentStep === "result" && (
            <Button
              onClick={() => goNext("sheet")}
              className="flex-1"
            >
              Ver Ficha Técnica
            </Button>
          )}
        </div>
      </main>
    </div>
  );
}
