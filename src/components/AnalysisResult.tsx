import { Tables } from "@/integrations/supabase/types";
import { Button } from "@/components/ui/button";
import { Scissors, Lightbulb, Wrench, Save } from "lucide-react";

interface AnalysisResultProps {
  analysis: Tables<"analyses">;
  onSave?: () => void;
  saved?: boolean;
}

export default function AnalysisResult({ analysis, onSave, saved }: AnalysisResultProps) {
  return (
    <div className="animate-slide-up space-y-6">
      <h2 className="text-2xl font-display font-bold text-gradient-gold text-center">
        Resultado da Análise
      </h2>

      {/* Face shape */}
      {analysis.face_shape && (
        <div className="glass-card rounded-xl p-4">
          <p className="text-sm text-muted-foreground mb-1">Formato do Rosto</p>
          <p className="text-foreground font-semibold">{analysis.face_shape}</p>
        </div>
      )}

      {/* Suggested cut */}
      {analysis.suggested_cut && (
        <div className="glass-card rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <Scissors className="w-5 h-5 text-primary" />
            <p className="text-sm text-muted-foreground">Corte Sugerido</p>
          </div>
          <p className="text-foreground font-display text-lg font-semibold">
            {analysis.suggested_cut}
          </p>
        </div>
      )}

      {/* Explanation */}
      {analysis.cut_explanation && (
        <div className="glass-card rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <Lightbulb className="w-5 h-5 text-primary" />
            <p className="text-sm text-muted-foreground">Por que este corte?</p>
          </div>
          <p className="text-foreground text-sm leading-relaxed">
            {analysis.cut_explanation}
          </p>
        </div>
      )}

      {/* Generated image */}
      {analysis.generated_image_url && (
        <div className="rounded-xl overflow-hidden shadow-gold">
          <img
            src={analysis.generated_image_url}
            alt="Visualização do corte sugerido"
            className="w-full"
          />
        </div>
      )}

      {/* Tips */}
      {analysis.maintenance_tips && (
        <div className="glass-card rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <Wrench className="w-5 h-5 text-primary" />
            <p className="text-sm text-muted-foreground">Dicas de Manutenção</p>
          </div>
          <p className="text-foreground text-sm leading-relaxed">
            {analysis.maintenance_tips}
          </p>
        </div>
      )}

      {/* Save */}
      {onSave && !saved && (
        <Button
          onClick={onSave}
          className="w-full bg-gradient-gold text-primary-foreground hover:opacity-90"
        >
          <Save className="w-4 h-4 mr-2" /> Salvar no Histórico
        </Button>
      )}
      {saved && (
        <p className="text-center text-primary text-sm font-medium">
          ✓ Salvo no seu histórico
        </p>
      )}
    </div>
  );
}
