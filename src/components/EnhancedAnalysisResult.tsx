import { Tables } from "@/integrations/supabase/types";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Download, RefreshCw, Share2, Heart } from "lucide-react";
import { toast } from "sonner";
import { useState } from "react";

interface EnhancedAnalysisResultProps {
  analysis: Tables<"analyses">;
  onSave?: () => void;
  onRegenerate?: () => void;
  onDownload?: () => void;
}

export default function EnhancedAnalysisResult({
  analysis,
  onSave,
  onRegenerate,
  onDownload,
}: EnhancedAnalysisResultProps) {
  const [isFavorited, setIsFavorited] = useState(false);
  const [isSharing, setIsSharing] = useState(false);

  const handleDownload = async () => {
    if (!analysis.generated_image_url) {
      toast.error("Imagem não disponível para download");
      return;
    }

    try {
      const response = await fetch(analysis.generated_image_url);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `visagismo-${analysis.id}.png`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast.success("Imagem baixada com sucesso!");
    } catch (error) {
      toast.error("Erro ao baixar imagem");
    }
  };

  const handleShare = async () => {
    if (!analysis.generated_image_url) {
      toast.error("Imagem não disponível para compartilhar");
      return;
    }

    setIsSharing(true);
    try {
      if (navigator.share) {
        await navigator.share({
          title: "Meu Corte de Cabelo VisagiPro",
          text: `Confira meu novo corte: ${analysis.suggested_cut}`,
          url: window.location.href,
        });
        toast.success("Compartilhado com sucesso!");
      } else {
        // Fallback: copiar URL para clipboard
        await navigator.clipboard.writeText(window.location.href);
        toast.success("Link copiado para a área de transferência!");
      }
    } catch (error) {
      toast.error("Erro ao compartilhar");
    } finally {
      setIsSharing(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Generated Image */}
      {analysis.generated_image_url && (
        <div className="relative rounded-xl overflow-hidden shadow-lg">
          <img
            src={analysis.generated_image_url}
            alt="Resultado da análise"
            className="w-full h-auto object-cover"
          />
          <div className="absolute top-3 right-3 flex gap-2">
            <Button
              size="icon"
              variant="secondary"
              onClick={() => setIsFavorited(!isFavorited)}
              className="rounded-full"
            >
              <Heart className={`w-4 h-4 ${isFavorited ? "fill-current text-red-500" : ""}`} />
            </Button>
          </div>
        </div>
      )}

      {/* Analysis Details */}
      <Card className="p-6 space-y-4">
        <div>
          <h3 className="font-display font-semibold text-foreground mb-2">Corte Recomendado</h3>
          <p className="text-lg text-primary font-bold">{analysis.suggested_cut || "Pendente"}</p>
        </div>

        {analysis.face_shape && (
          <div>
            <h4 className="font-medium text-foreground mb-1">Forma do Rosto</h4>
            <p className="text-sm text-muted-foreground capitalize">{analysis.face_shape}</p>
          </div>
        )}

        {analysis.hair_type && (
          <div>
            <h4 className="font-medium text-foreground mb-1">Tipo de Cabelo</h4>
            <p className="text-sm text-muted-foreground capitalize">{analysis.hair_type}</p>
          </div>
        )}

        {analysis.cut_explanation && (
          <div>
            <h4 className="font-medium text-foreground mb-1">Por que este corte?</h4>
            <p className="text-sm text-muted-foreground">{analysis.cut_explanation}</p>
          </div>
        )}

        {analysis.maintenance_tips && (
          <div>
            <h4 className="font-medium text-foreground mb-2">Dicas de Manutenção</h4>
            <ul className="text-sm text-muted-foreground space-y-1">
              {typeof analysis.maintenance_tips === "string"
                ? analysis.maintenance_tips.split("\n").map((tip, i) => (
                    <li key={i} className="flex gap-2">
                      <span>•</span>
                      <span>{tip}</span>
                    </li>
                  ))
                : null}
            </ul>
          </div>
        )}
      </Card>

      {/* Action Buttons */}
      <div className="grid grid-cols-2 gap-3">
        <Button
          onClick={handleDownload}
          variant="outline"
          className="w-full"
        >
          <Download className="w-4 h-4 mr-2" />
          Download
        </Button>

        <Button
          onClick={handleShare}
          disabled={isSharing}
          variant="outline"
          className="w-full"
        >
          <Share2 className="w-4 h-4 mr-2" />
          Compartilhar
        </Button>

        {onRegenerate && (
          <Button
            onClick={onRegenerate}
            variant="outline"
            className="w-full"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Regenerar
          </Button>
        )}

        {onSave && (
          <Button
            onClick={onSave}
            className="w-full"
          >
            Salvar Resultado
          </Button>
        )}
      </div>
    </div>
  );
}
