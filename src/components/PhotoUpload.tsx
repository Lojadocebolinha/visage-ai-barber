import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Camera, Upload, X } from "lucide-react";

interface PhotoUploadProps {
  onUpload: (file: File) => void;
  uploading?: boolean;
}

export default function PhotoUpload({ onUpload, uploading }: PhotoUploadProps) {
  const [preview, setPreview] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = (f: File) => {
    setFile(f);
    const reader = new FileReader();
    reader.onloadend = () => setPreview(reader.result as string);
    reader.readAsDataURL(f);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) handleFile(f);
  };

  const clear = () => {
    setPreview(null);
    setFile(null);
  };

  return (
    <div className="animate-fade-in">
      <h3 className="text-xl font-display font-semibold text-foreground mb-2">
        Envie sua foto
      </h3>
      <p className="text-muted-foreground text-sm mb-6">
        Tire uma foto frontal com boa iluminação para uma análise precisa.
      </p>

      {!preview ? (
        <div
          onClick={() => inputRef.current?.click()}
          className="border-2 border-dashed border-border rounded-xl p-12 flex flex-col items-center justify-center cursor-pointer hover:border-primary/50 transition-colors"
        >
          <Camera className="w-12 h-12 text-muted-foreground mb-4" />
          <p className="text-foreground font-medium mb-1">Toque para enviar foto</p>
          <p className="text-muted-foreground text-sm">JPG, PNG até 10MB</p>
        </div>
      ) : (
        <div className="relative">
          <img
            src={preview}
            alt="Preview"
            className="w-full max-h-80 object-cover rounded-xl"
          />
          <button
            onClick={clear}
            className="absolute top-2 right-2 w-8 h-8 rounded-full bg-background/80 flex items-center justify-center"
          >
            <X className="w-4 h-4 text-foreground" />
          </button>
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="user"
        onChange={handleChange}
        className="hidden"
      />

      {preview && file && (
        <Button
          onClick={() => onUpload(file)}
          disabled={uploading}
          className="w-full mt-4 bg-gradient-gold text-primary-foreground hover:opacity-90"
        >
          <Upload className="w-4 h-4 mr-2" />
          {uploading ? "Enviando..." : "Enviar e Analisar"}
        </Button>
      )}
    </div>
  );
}
