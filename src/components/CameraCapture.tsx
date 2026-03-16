import { useRef, useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Camera, Upload, AlertCircle, CheckCircle } from "lucide-react";
import { toast } from "sonner";
import { motion } from "framer-motion";

interface CameraCaptureProps {
  onCapture: (file: File) => void;
  onUpload: (file: File) => void;
  isLoading?: boolean;
}

export default function CameraCapture({
  onCapture,
  onUpload,
  isLoading = false,
}: CameraCaptureProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [imageQuality, setImageQuality] = useState<{
    brightness: "low" | "good" | "high";
    faceDetected: boolean;
    centered: boolean;
  } | null>(null);

  // Iniciar câmera
  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "user",
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setCameraActive(true);
      }
    } catch (error) {
      toast.error("❌ Não foi possível acessar a câmera. Verifique as permissões.");
      console.error("Camera error:", error);
    }
  };

  // Parar câmera
  const stopCamera = () => {
    if (videoRef.current?.srcObject) {
      const tracks = (videoRef.current.srcObject as MediaStream).getTracks();
      tracks.forEach((track) => track.stop());
      setCameraActive(false);
    }
  };

  // Capturar foto
  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const context = canvasRef.current.getContext("2d");
      if (context) {
        canvasRef.current.width = videoRef.current.videoWidth;
        canvasRef.current.height = videoRef.current.videoHeight;
        context.drawImage(videoRef.current, 0, 0);

        const imageData = canvasRef.current.toDataURL("image/jpeg", 0.95);
        setCapturedImage(imageData);

        // Análise de qualidade simulada
        analyzeImageQuality(context, canvasRef.current);

        stopCamera();
      }
    }
  };

  // Analisar qualidade da imagem
  const analyzeImageQuality = (
    context: CanvasRenderingContext2D,
    canvas: HTMLCanvasElement
  ) => {
    const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;

    // Calcular brilho médio
    let brightness = 0;
    for (let i = 0; i < data.length; i += 4) {
      brightness += (data[i] + data[i + 1] + data[i + 2]) / 3;
    }
    brightness = brightness / (data.length / 4);

    setImageQuality({
      brightness:
        brightness < 85 ? "low" : brightness > 170 ? "high" : "good",
      faceDetected: true, // Simplificado - em produção usar face-api.js
      centered: true, // Simplificado
    });
  };

  // Usar foto capturada
  const usePhoto = async () => {
    if (capturedImage) {
      try {
        const response = await fetch(capturedImage);
        const blob = await response.blob();
        const file = new File([blob], "camera-capture.jpg", {
          type: "image/jpeg",
        });
        onCapture(file);
        onUpload(file);
        setCapturedImage(null);
      } catch (error) {
        toast.error("❌ Erro ao processar a foto capturada.");
        console.error("Photo processing error:", error);
      }
    }
  };

  // Fazer upload de arquivo
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        toast.error("❌ Arquivo muito grande. Máximo 10MB.");
        return;
      }
      onUpload(file);
    }
  };

  return (
    <div className="w-full space-y-4">
      {!cameraActive && !capturedImage && (
        <div className="space-y-3">
          <Button
            onClick={startCamera}
            disabled={isLoading}
            className="w-full gap-2 h-12 text-base"
            size="lg"
          >
            <Camera className="w-5 h-5" />
            Abrir Câmera
          </Button>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="px-2 bg-background text-muted-foreground">
                ou
              </span>
            </div>
          </div>

          <Button
            variant="outline"
            onClick={() => fileInputRef.current?.click()}
            disabled={isLoading}
            className="w-full gap-2 h-12 text-base"
            size="lg"
          >
            <Upload className="w-5 h-5" />
            Enviar Foto
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileUpload}
            className="hidden"
          />
        </div>
      )}

      {cameraActive && (
        <motion.div
          className="space-y-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <div className="relative bg-black rounded-2xl overflow-hidden aspect-video">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              className="w-full h-full object-cover"
            />

            {/* Moldura para centralizar rosto */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="w-48 h-64 border-2 border-primary/50 rounded-2xl shadow-lg" />
              <div className="absolute top-4 left-4 text-xs text-primary/70">
                Centralize seu rosto
              </div>
            </div>
          </div>

          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={stopCamera}
              className="flex-1"
              disabled={isLoading}
            >
              Cancelar
            </Button>
            <Button
              onClick={capturePhoto}
              className="flex-1"
              disabled={isLoading}
            >
              Capturar Foto
            </Button>
          </div>
        </motion.div>
      )}

      {capturedImage && (
        <motion.div
          className="space-y-4"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
        >
          <div className="relative bg-secondary rounded-2xl overflow-hidden aspect-video">
            <img
              src={capturedImage}
              alt="Capturada"
              className="w-full h-full object-cover"
            />
          </div>

          {/* Indicadores de qualidade */}
          {imageQuality && (
            <div className="space-y-2 p-3 bg-secondary/50 rounded-lg">
              <div className="flex items-center gap-2">
                {imageQuality.brightness === "good" ? (
                  <CheckCircle className="w-4 h-4 text-green-500" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-yellow-500" />
                )}
                <span className="text-sm">
                  Brilho:{" "}
                  {imageQuality.brightness === "low"
                    ? "Escura"
                    : imageQuality.brightness === "high"
                    ? "Muito clara"
                    : "Ótima"}
                </span>
              </div>
              {imageQuality.brightness !== "good" && (
                <p className="text-xs text-muted-foreground">
                  💡 Dica: Melhore a iluminação para melhor resultado
                </p>
              )}
            </div>
          )}

          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setCapturedImage(null);
                startCamera();
              }}
              className="flex-1"
              disabled={isLoading}
            >
              Retomar
            </Button>
            <Button
              onClick={usePhoto}
              className="flex-1"
              disabled={isLoading}
            >
              Usar Foto
            </Button>
          </div>
        </motion.div>
      )}

      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
}
