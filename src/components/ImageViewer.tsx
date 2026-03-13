import { useState } from "react";
import { Button } from "@/components/ui/button";
import { X, ZoomIn, ZoomOut, RotateCw } from "lucide-react";
import { translations } from "@/lib/translations";

interface ImageViewerProps {
  imageUrl: string;
  title?: string;
  onClose: () => void;
}

export default function ImageViewer({ imageUrl, title, onClose }: ImageViewerProps) {
  const [zoom, setZoom] = useState(100);
  const [rotation, setRotation] = useState(0);

  const handleZoomIn = () => setZoom((z) => Math.min(z + 10, 200));
  const handleZoomOut = () => setZoom((z) => Math.max(z - 10, 50));
  const handleRotate = () => setRotation((r) => (r + 90) % 360);

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-background rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h3 className="font-semibold text-foreground">{title || "Visualizar Imagem"}</h3>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground"
          >
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Image Container */}
        <div className="flex-1 overflow-auto flex items-center justify-center bg-secondary/50 p-4">
          <div className="relative">
            <img
              src={imageUrl}
              alt={title}
              style={{
                transform: `scale(${zoom / 100}) rotate(${rotation}deg)`,
                transition: "transform 0.2s ease-out",
                maxWidth: "100%",
                maxHeight: "100%",
                objectFit: "contain",
              }}
              className="rounded-lg"
            />
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center justify-center gap-2 p-4 border-t border-border flex-wrap">
          <Button
            variant="outline"
            size="sm"
            onClick={handleZoomOut}
            className="gap-2"
          >
            <ZoomOut className="w-4 h-4" />
            Reduzir
          </Button>

          <div className="px-4 py-2 bg-secondary rounded-lg text-sm font-medium text-foreground">
            {zoom}%
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={handleZoomIn}
            className="gap-2"
          >
            <ZoomIn className="w-4 h-4" />
            Aumentar
          </Button>

          <div className="w-px h-6 bg-border" />

          <Button
            variant="outline"
            size="sm"
            onClick={handleRotate}
            className="gap-2"
          >
            <RotateCw className="w-4 h-4" />
            Girar
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={onClose}
          >
            {translations.resultado.fechar}
          </Button>
        </div>
      </div>
    </div>
  );
}
