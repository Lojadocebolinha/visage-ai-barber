import { Button } from "@/components/ui/button";
import { MessageCircle } from "lucide-react";
import { toast } from "sonner";

interface WhatsAppShareProps {
  clientName?: string;
  suggestedCut?: string;
  beardRecommendation?: string;
  cutExplanation?: string;
  generatedImageUrl?: string;
}

export default function WhatsAppShare({
  clientName = "Cliente",
  suggestedCut = "Corte Profissional",
  beardRecommendation = "Conforme análise",
  cutExplanation = "Análise completa realizada",
  generatedImageUrl,
}: WhatsAppShareProps) {
  const handleWhatsAppShare = () => {
    try {
      // Criar mensagem formatada
      const message = `🎨 *Análise de Visagismo - ${clientName}*

✂️ *Corte Recomendado:* ${suggestedCut}
💈 *Barba/Bigode:* ${beardRecommendation}

📝 *Explicação:*
${cutExplanation}

${generatedImageUrl ? `🖼️ *Imagem Gerada:* ${generatedImageUrl}` : ""}

Gerado com IA pelo VisagiPro
https://visagipro.app`;

      // Codificar mensagem para URL
      const encodedMessage = encodeURIComponent(message);

      // Abrir WhatsApp
      const whatsappUrl = `https://wa.me/?text=${encodedMessage}`;
      window.open(whatsappUrl, "_blank");

      toast.success("✅ Abrindo WhatsApp...");
    } catch (error) {
      toast.error("❌ Erro ao compartilhar via WhatsApp");
      console.error(error);
    }
  };

  return (
    <Button
      onClick={handleWhatsAppShare}
      className="gap-2 bg-green-600 hover:bg-green-700 text-white"
    >
      <MessageCircle className="w-4 h-4" />
      Compartilhar via WhatsApp
    </Button>
  );
}
