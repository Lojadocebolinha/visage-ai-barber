import { useState } from "react";
import { Tables } from "@/integrations/supabase/types";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Download, RefreshCw, Share2, Heart, Maximize2 } from "lucide-react";
import { toast } from "sonner";
import ImageViewer from "@/components/ImageViewer";
import { translations, traduzirCorte } from "@/lib/translations";

interface ProfessionalAnalysisResultProps {
  analysis: Tables<"analyses">;
  onSave?: () => void;
  onRegenerate?: () => void;
  onDownload?: () => void;
}

export default function ProfessionalAnalysisResult({
  analysis,
  onSave,
  onRegenerate,
  onDownload,
}: ProfessionalAnalysisResultProps) {
  const [isFavorited, setIsFavorited] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const [showImageViewer, setShowImageViewer] = useState(false);

  const handleDownload = async () => {
    if (!analysis.generated_image_url) {
      toast.error(translations.resultado.imagem_nao_disponivel);
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
      toast.success(translations.resultado.imagem_baixada);
    } catch (error) {
      toast.error(translations.resultado.erro_download);
    }
  };

  const handleShare = async () => {
    if (!analysis.generated_image_url) {
      toast.error(translations.resultado.imagem_nao_disponivel);
      return;
    }

    setIsSharing(true);
    try {
      if (navigator.share) {
        await navigator.share({
          title: "Meu Corte de Cabelo VisagiPro",
          text: `Confira meu novo corte: ${traduzirCorte(analysis.suggested_cut || "")}`,
          url: window.location.href,
        });
        toast.success(translations.resultado.compartilhado);
      } else {
        await navigator.clipboard.writeText(window.location.href);
        toast.success(translations.resultado.link_copiado);
      }
    } catch (error) {
      toast.error(translations.resultado.erro_compartilhar);
    } finally {
      setIsSharing(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Generated Image - Portrait Orientation */}
      {analysis.generated_image_url && (
        <div className="flex justify-center">
          <div
            className="relative rounded-xl overflow-hidden shadow-lg group mx-auto"
            style={{
              maxWidth: "400px",
              aspectRatio: "3/4",
              backgroundColor: "var(--secondary)",
            }}
          >
            <img
              src={analysis.generated_image_url}
              alt="Resultado da análise"
              className="w-full h-full object-cover bg-secondary cursor-pointer hover:opacity-90 transition-opacity"
              style={{
                objectFit: "cover",
                objectPosition: "center",
                imageOrientation: "from-image",
              }}
              onClick={() => setShowImageViewer(true)}
              title={translations.resultado.expandir}
            />
            <div className="absolute top-3 right-3 flex gap-2">
              <Button
                size="icon"
                variant="secondary"
                onClick={() => setShowImageViewer(true)}
                className="rounded-full shadow-md hover:shadow-lg"
                title={translations.resultado.expandir}
              >
                <Maximize2 className="w-4 h-4" />
              </Button>
              <Button
                size="icon"
                variant="secondary"
                onClick={() => setIsFavorited(!isFavorited)}
                className="rounded-full shadow-md hover:shadow-lg"
                title={isFavorited ? "Remover dos favoritos" : "Adicionar aos favoritos"}
              >
                <Heart
                  className={`w-4 h-4 ${
                    isFavorited ? "fill-current text-red-500" : ""
                  }`}
                />
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Analysis Details */}
      <Card className="p-6 space-y-4">
        <div>
          <h3 className="font-display font-semibold text-foreground mb-2">
            {translations.resultado.corte_recomendado}
          </h3>
          <p className="text-lg text-primary font-bold">
            {traduzirCorte(analysis.suggested_cut || "Pendente")}
          </p>
        </div>

        {analysis.face_shape && (
          <div>
            <h4 className="font-medium text-foreground mb-1">
              {translations.resultado.forma_rosto}
            </h4>
            <p className="text-sm text-muted-foreground capitalize">
              {analysis.face_shape}
            </p>
          </div>
        )}

        {analysis.hair_type && (
          <div>
            <h4 className="font-medium text-foreground mb-1">
              {translations.resultado.tipo_cabelo}
            </h4>
            <p className="text-sm text-muted-foreground capitalize">
              {analysis.hair_type}
            </p>
          </div>
        )}

        {analysis.cut_explanation && (
          <div>
            <h4 className="font-medium text-foreground mb-1">
              {translations.resultado.por_que_corte}
            </h4>
            <p className="text-sm text-muted-foreground">{analysis.cut_explanation}</p>
          </div>
        )}

        {analysis.maintenance_tips && (
          <div>
            <h4 className="font-medium text-foreground mb-2">
              {translations.resultado.dicas_manutencao}
            </h4>
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
          {translations.resultado.download}
        </Button>

        <Button
          onClick={handleShare}
          disabled={isSharing}
          variant="outline"
          className="w-full"
        >
          <Share2 className="w-4 h-4 mr-2" />
          {translations.resultado.compartilhar}
        </Button>

        {onRegenerate && (
          <Button
            onClick={onRegenerate}
            variant="outline"
            className="w-full"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            {translations.resultado.regenerar}
          </Button>
        )}

        {onSave && (
          <Button
            onClick={onSave}
            className="w-full"
          >
            {translations.resultado.salvar_resultado}
          </Button>
        )}
      </div>

      {/* Image Viewer Modal */}
      {showImageViewer && analysis.generated_image_url && (
        <ImageViewer
          imageUrl={analysis.generated_image_url}
          title={traduzirCorte(analysis.suggested_cut || "Resultado")}
          onClose={() => setShowImageViewer(false)}
        />
      )}
    </div>
  );
}
