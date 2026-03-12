import { Button } from "@/components/ui/button";
import { Scissors, Lightbulb, Wrench, Save, User, Layers, RefreshCw } from "lucide-react";

interface AnalysisData {
  face_shape?: string | null;
  jaw_shape?: string | null;
  forehead?: string | null;
  proportion?: string | null;
  current_style?: string | null;
  contrast_level?: string | null;
  recommended_style?: string | null;
  suggested_cut?: string | null;
  fade_type?: string | null;
  top_style?: string | null;
  beard_recommendation?: string | null;
  mustache_recommendation?: string | null;
  cut_difficulty?: string | null;
  barber_level?: string | null;
  cut_explanation?: string | null;
  maintenance_tips?: string | null;
  generated_image_url?: string | null;
  photo_url?: string | null;
}

interface AnalysisResultProps {
  analysis: AnalysisData;
  onSave?: () => void;
  onRegenerate?: () => void;
  saved?: boolean;
}

function DetailRow({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null;
  return (
    <div className="flex justify-between items-start py-1.5 border-b border-border/30 last:border-0">
      <span className="text-muted-foreground text-sm">{label}</span>
      <span className="text-foreground text-sm font-medium text-right max-w-[60%]">{value}</span>
    </div>
  );
}

export default function AnalysisResult({ analysis, onSave, onRegenerate, saved }: AnalysisResultProps) {
  // Parse maintenance_tips if it's a JSON string array
  let tipsDisplay = analysis.maintenance_tips || "";
  try {
    const parsed = JSON.parse(tipsDisplay);
    if (Array.isArray(parsed)) {
      tipsDisplay = parsed.map((t: string) => `• ${t}`).join("\n\n");
    }
  } catch {
    // Already a string, check if it starts with bullet
    if (tipsDisplay && !tipsDisplay.startsWith("•")) {
      tipsDisplay = `• ${tipsDisplay}`;
    }
  }

  return (
    <div className="animate-slide-up space-y-5">
      <h2 className="text-2xl font-display font-bold text-gradient-gold text-center">
        Resultado da Análise Visagista
      </h2>

      {/* Before & After */}
      {(analysis.photo_url || analysis.generated_image_url) && (
        <div className="glass-card rounded-xl p-4">
          <p className="text-sm font-semibold text-foreground text-center mb-3">
            {analysis.photo_url && analysis.generated_image_url ? "Antes & Depois" : "Visualização"}
          </p>
          <div className="grid grid-cols-2 gap-3">
            {analysis.photo_url && (
              <div>
                <p className="text-xs text-muted-foreground text-center mb-1">Antes</p>
                <img
                  src={analysis.photo_url}
                  alt="Foto original"
                  className="w-full rounded-lg object-cover aspect-[3/4]"
                />
              </div>
            )}
            {analysis.generated_image_url && (
              <div>
                <p className="text-xs text-muted-foreground text-center mb-1">Depois</p>
                <img
                  src={analysis.generated_image_url}
                  alt="Visualização do corte sugerido"
                  className="w-full rounded-lg object-cover aspect-[3/4]"
                />
              </div>
            )}
          </div>
          {!analysis.generated_image_url && analysis.photo_url && (
            <p className="text-xs text-muted-foreground text-center mt-2">
              A imagem do corte não foi gerada. Tente novamente.
            </p>
          )}
        </div>
      )}

      {/* Generated image full view if no original */}
      {analysis.generated_image_url && !analysis.photo_url && (
        <div className="rounded-xl overflow-hidden shadow-gold">
          <p className="text-xs text-muted-foreground text-center mb-2">Visualização do Corte Sugerido</p>
          <img
            src={analysis.generated_image_url}
            alt="Visualização do corte sugerido"
            className="w-full rounded-xl"
          />
        </div>
      )}

      {/* Face Analysis Card */}
      <div className="glass-card rounded-xl p-4">
        <div className="flex items-center gap-2 mb-3">
          <User className="w-5 h-5 text-primary" />
          <p className="text-sm font-semibold text-foreground">Análise Facial</p>
        </div>
        <DetailRow label="Formato do Rosto" value={analysis.face_shape} />
        <DetailRow label="Mandíbula" value={analysis.jaw_shape} />
        <DetailRow label="Testa" value={analysis.forehead} />
        <DetailRow label="Proporção" value={analysis.proportion} />
        <DetailRow label="Estilo Atual" value={analysis.current_style} />
        <DetailRow label="Nível de Contraste" value={analysis.contrast_level} />
      </div>

      {/* Recommended Cut Card */}
      {analysis.suggested_cut && (
        <div className="glass-card rounded-xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <Scissors className="w-5 h-5 text-primary" />
            <p className="text-sm font-semibold text-foreground">Corte Recomendado</p>
          </div>
          <p className="text-foreground font-display text-lg font-bold mb-3">
            {analysis.suggested_cut}
          </p>
          <DetailRow label="Estilo Recomendado" value={analysis.recommended_style} />
          <DetailRow label="Tipo de Fade" value={analysis.fade_type} />
          <DetailRow label="Topo" value={analysis.top_style} />
          <DetailRow label="Barba Ideal" value={analysis.beard_recommendation} />
          <DetailRow label="Bigode" value={analysis.mustache_recommendation} />
        </div>
      )}

      {/* Difficulty Card */}
      {(analysis.cut_difficulty || analysis.barber_level) && (
        <div className="glass-card rounded-xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <Layers className="w-5 h-5 text-primary" />
            <p className="text-sm font-semibold text-foreground">Nível Técnico</p>
          </div>
          <DetailRow label="Dificuldade do Corte" value={analysis.cut_difficulty} />
          <DetailRow label="Nível do Barbeiro" value={analysis.barber_level} />
        </div>
      )}

      {/* Explanation */}
      {analysis.cut_explanation && (
        <div className="glass-card rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <Lightbulb className="w-5 h-5 text-primary" />
            <p className="text-sm font-semibold text-foreground">Por que este corte?</p>
          </div>
          <p className="text-foreground text-sm leading-relaxed whitespace-pre-line">
            {analysis.cut_explanation}
          </p>
        </div>
      )}

      {/* Tips */}
      {tipsDisplay && (
        <div className="glass-card rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <Wrench className="w-5 h-5 text-primary" />
            <p className="text-sm font-semibold text-foreground">Dicas de Manutenção</p>
          </div>
          <p className="text-foreground text-sm leading-relaxed whitespace-pre-line">
            {tipsDisplay}
          </p>
        </div>
      )}

      {/* Actions */}
      <div className="space-y-2">
        {onRegenerate && (
          <Button
            onClick={onRegenerate}
            variant="outline"
            className="w-full border-border text-foreground"
          >
            <RefreshCw className="w-4 h-4 mr-2" /> Gerar Novamente
          </Button>
        )}

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
    </div>
  );
}
