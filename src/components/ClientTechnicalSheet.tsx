import { useState } from "react";
import { Tables } from "@/integrations/supabase/types";
import { Button } from "@/components/ui/button";
import { Download, Share2, Printer } from "lucide-react";
import { toast } from "sonner";
import { motion } from "framer-motion";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";

interface ClientTechnicalSheetProps {
  analysis: Tables<"analyses">;
  clientName?: string;
  clientEmail?: string;
}

export default function ClientTechnicalSheet({
  analysis,
  clientName = "Cliente",
  clientEmail,
}: ClientTechnicalSheetProps) {
  const [isExporting, setIsExporting] = useState(false);
  const sheetRef = React.useRef<HTMLDivElement>(null);

  // Extrair dados da análise
  const analysisData = analysis.analysis_result as any || {};
  const faceShape = analysisData.face_shape || "Não identificada";
  const recommendedCut = analysisData.suggested_cut || "Não recomendado";
  const beardRecommendation = analysisData.beard_recommendation || "Sem recomendação";
  const cutExplanation = analysisData.cut_explanation || "Análise indisponível";
  const maintenanceTips = Array.isArray(analysisData.maintenance_tips)
    ? analysisData.maintenance_tips
    : [];
  const cutDifficulty = analysisData.cut_difficulty || "Média";
  const barberLevel = analysisData.barber_level || "Profissional";

  // Exportar como PDF
  const exportPDF = async () => {
    if (!sheetRef.current) return;

    setIsExporting(true);
    try {
      const canvas = await html2canvas(sheetRef.current, {
        backgroundColor: "#ffffff",
        scale: 2,
      });

      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
      });

      const imgData = canvas.toDataURL("image/png");
      const imgWidth = 210;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      pdf.addImage(imgData, "PNG", 0, 0, imgWidth, imgHeight);
      pdf.save(`ficha-tecnica-${clientName}.pdf`);

      toast.success("✅ PDF exportado com sucesso!");
    } catch (error) {
      toast.error("❌ Erro ao exportar PDF");
      console.error("PDF export error:", error);
    } finally {
      setIsExporting(false);
    }
  };

  // Exportar como imagem
  const exportImage = async () => {
    if (!sheetRef.current) return;

    setIsExporting(true);
    try {
      const canvas = await html2canvas(sheetRef.current, {
        backgroundColor: "#ffffff",
        scale: 2,
      });

      const link = document.createElement("a");
      link.href = canvas.toDataURL("image/png");
      link.download = `ficha-tecnica-${clientName}.png`;
      link.click();

      toast.success("✅ Imagem exportada com sucesso!");
    } catch (error) {
      toast.error("❌ Erro ao exportar imagem");
      console.error("Image export error:", error);
    } finally {
      setIsExporting(false);
    }
  };

  // Compartilhar
  const shareSheet = async () => {
    try {
      if (navigator.share) {
        await navigator.share({
          title: `Ficha Técnica - ${clientName}`,
          text: `Corte recomendado: ${recommendedCut}`,
        });
      } else {
        toast.info("Compartilhamento não disponível neste navegador");
      }
    } catch (error) {
      console.error("Share error:", error);
    }
  };

  return (
    <motion.div
      className="w-full space-y-4"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
    >
      {/* Ficha Técnica */}
      <div
        ref={sheetRef}
        className="bg-white text-black p-8 rounded-2xl space-y-6 print:p-4"
      >
        {/* Cabeçalho */}
        <div className="border-b-2 border-gray-200 pb-4">
          <h1 className="text-3xl font-bold text-gray-800">VisagiPro</h1>
          <p className="text-sm text-gray-600">Ficha Técnica de Análise Facial</p>
        </div>

        {/* Dados do Cliente */}
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-gray-600 font-semibold">Cliente</p>
            <p className="text-gray-800">{clientName}</p>
          </div>
          {clientEmail && (
            <div>
              <p className="text-gray-600 font-semibold">Email</p>
              <p className="text-gray-800 truncate">{clientEmail}</p>
            </div>
          )}
          <div>
            <p className="text-gray-600 font-semibold">Data</p>
            <p className="text-gray-800">
              {new Date(analysis.created_at || "").toLocaleDateString("pt-BR")}
            </p>
          </div>
          <div>
            <p className="text-gray-600 font-semibold">Status</p>
            <p className="text-gray-800 capitalize">{analysis.status || "Concluída"}</p>
          </div>
        </div>

        {/* Foto Original */}
        {analysis.photo_url && (
          <div>
            <p className="text-gray-600 font-semibold mb-2">Foto Original</p>
            <img
              src={analysis.photo_url}
              alt="Foto original"
              className="w-full h-48 object-cover rounded-lg"
            />
          </div>
        )}

        {/* Análise Facial */}
        <div className="bg-gray-50 p-4 rounded-lg space-y-3">
          <h2 className="text-lg font-bold text-gray-800">Análise Facial</h2>

          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-gray-600 font-semibold">Formato do Rosto</p>
              <p className="text-gray-800 capitalize">{faceShape}</p>
            </div>
            <div>
              <p className="text-gray-600 font-semibold">Dificuldade do Corte</p>
              <p className="text-gray-800 capitalize">{cutDifficulty}</p>
            </div>
            <div>
              <p className="text-gray-600 font-semibold">Nível Profissional</p>
              <p className="text-gray-800 capitalize">{barberLevel}</p>
            </div>
          </div>
        </div>

        {/* Recomendações */}
        <div className="bg-blue-50 p-4 rounded-lg space-y-3">
          <h2 className="text-lg font-bold text-gray-800">Recomendações</h2>

          <div>
            <p className="text-gray-600 font-semibold">Corte Ideal</p>
            <p className="text-lg font-bold text-blue-600">{recommendedCut}</p>
          </div>

          <div>
            <p className="text-gray-600 font-semibold">Barba/Bigode</p>
            <p className="text-gray-800">{beardRecommendation}</p>
          </div>

          <div>
            <p className="text-gray-600 font-semibold">Por que este corte?</p>
            <p className="text-gray-800 text-sm leading-relaxed">{cutExplanation}</p>
          </div>
        </div>

        {/* Dicas de Manutenção */}
        {maintenanceTips.length > 0 && (
          <div className="bg-green-50 p-4 rounded-lg space-y-3">
            <h2 className="text-lg font-bold text-gray-800">Dicas de Manutenção</h2>
            <ul className="space-y-2 text-sm">
              {maintenanceTips.map((tip: string, index: number) => (
                <li key={index} className="flex gap-2 text-gray-800">
                  <span className="font-bold text-green-600">•</span>
                  <span>{tip}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Foto Gerada */}
        {analysis.generated_image_url && (
          <div>
            <p className="text-gray-600 font-semibold mb-2">Resultado Simulado</p>
            <img
              src={analysis.generated_image_url}
              alt="Resultado simulado"
              className="w-full h-48 object-cover rounded-lg"
            />
          </div>
        )}

        {/* Rodapé */}
        <div className="border-t-2 border-gray-200 pt-4 text-center text-xs text-gray-600">
          <p>Ficha técnica gerada por VisagiPro - Sistema de Visagismo com IA</p>
          <p>{new Date().toLocaleString("pt-BR")}</p>
        </div>
      </div>

      {/* Botões de Ação */}
      <div className="flex gap-2 flex-wrap">
        <Button
          onClick={exportPDF}
          disabled={isExporting}
          className="gap-2 flex-1"
          variant="default"
        >
          <Download className="w-4 h-4" />
          PDF
        </Button>
        <Button
          onClick={exportImage}
          disabled={isExporting}
          className="gap-2 flex-1"
          variant="outline"
        >
          <Download className="w-4 h-4" />
          Imagem
        </Button>
        <Button
          onClick={shareSheet}
          disabled={isExporting}
          className="gap-2 flex-1"
          variant="outline"
        >
          <Share2 className="w-4 h-4" />
          Compartilhar
        </Button>
        <Button
          onClick={() => window.print()}
          className="gap-2 flex-1"
          variant="outline"
        >
          <Printer className="w-4 h-4" />
          Imprimir
        </Button>
      </div>
    </motion.div>
  );
}
