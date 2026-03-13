import { Scissors } from "lucide-react";

interface LoadingAnimationProps {
  step?: "analyzing" | "generating" | "saving";
  progress?: number;
}

export default function LoadingAnimation({ step = "analyzing", progress = 0 }: LoadingAnimationProps) {
  const messages = {
    analyzing: "Analisando seu rosto e características de cabelo...",
    generating: "Gerando simulação do corte de cabelo...",
    saving: "Salvando resultado...",
  };

  return (
    <div className="text-center py-16 animate-fade-in">
      <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-gradient-gold flex items-center justify-center animate-pulse">
        <Scissors className="w-8 h-8 text-primary-foreground" />
      </div>

      <h3 className="text-xl font-display font-semibold text-foreground mb-2">
        {step === "analyzing" ? "Analisando..." : step === "generating" ? "Gerando..." : "Salvando..."}
      </h3>

      <p className="text-muted-foreground text-sm mb-6">{messages[step]}</p>

      {progress > 0 && (
        <div className="w-full max-w-xs mx-auto">
          <div className="h-2 bg-secondary rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-gold transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="text-xs text-muted-foreground mt-2">{progress}%</p>
        </div>
      )}

      <div className="flex justify-center gap-1 mt-6">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="w-2 h-2 rounded-full bg-primary animate-bounce"
            style={{ animationDelay: `${i * 0.1}s` }}
          />
        ))}
      </div>
    </div>
  );
}
