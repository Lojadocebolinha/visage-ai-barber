import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { ChevronRight, ChevronLeft } from "lucide-react";

const questions = [
  { key: "formal", label: "Trabalha em ambiente formal?", options: ["Sim", "Não"] },
  { key: "style", label: "Prefere corte discreto ou moderno?", options: ["Discreto", "Moderno"] },
  { key: "pomade", label: "Usa pomada ou prefere natural?", options: ["Pomada", "Natural"] },
  { key: "hairloss", label: "Tem entradas ou falhas no cabelo?", options: ["Sim", "Não"] },
  { key: "length", label: "Quer manter comprimento em cima?", options: ["Sim", "Não"] },
  { key: "beard", label: "Usa barba?", options: ["Sim", "Não"] },
  { key: "maintenance", label: "Quer corte de baixa manutenção?", options: ["Sim", "Não"] },
  { key: "change", label: "Está disposto a mudar bastante o visual?", options: ["Sim", "Não"] },
];

interface PreAnalysisFormProps {
  onComplete: (answers: Record<string, string>) => void;
}

export default function PreAnalysisForm({ onComplete }: PreAnalysisFormProps) {
  const [currentQ, setCurrentQ] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});

  const q = questions[currentQ];
  const progress = ((currentQ + 1) / questions.length) * 100;

  const handleAnswer = (value: string) => {
    setAnswers((prev) => ({ ...prev, [q.key]: value }));
  };

  const next = () => {
    if (currentQ < questions.length - 1) {
      setCurrentQ((p) => p + 1);
    } else {
      onComplete(answers);
    }
  };

  const prev = () => {
    if (currentQ > 0) setCurrentQ((p) => p - 1);
  };

  return (
    <div className="animate-fade-in">
      {/* Progress bar */}
      <div className="w-full h-1 bg-secondary rounded-full mb-8 overflow-hidden">
        <div
          className="h-full bg-gradient-gold transition-all duration-500"
          style={{ width: `${progress}%` }}
        />
      </div>

      <p className="text-sm text-muted-foreground mb-2">
        Pergunta {currentQ + 1} de {questions.length}
      </p>

      <h3 className="text-xl font-display font-semibold text-foreground mb-6">
        {q.label}
      </h3>

      <RadioGroup
        value={answers[q.key] || ""}
        onValueChange={handleAnswer}
        className="space-y-3"
      >
        {q.options.map((opt) => (
          <label
            key={opt}
            className={`flex items-center gap-3 p-4 rounded-lg border cursor-pointer transition-all ${
              answers[q.key] === opt
                ? "border-primary bg-primary/10"
                : "border-border bg-secondary hover:border-primary/50"
            }`}
          >
            <RadioGroupItem value={opt} />
            <span className="text-foreground">{opt}</span>
          </label>
        ))}
      </RadioGroup>

      <div className="flex gap-3 mt-8">
        {currentQ > 0 && (
          <Button variant="outline" onClick={prev} className="border-border text-foreground">
            <ChevronLeft className="w-4 h-4 mr-1" /> Anterior
          </Button>
        )}
        <Button
          onClick={next}
          disabled={!answers[q.key]}
          className="ml-auto bg-gradient-gold text-primary-foreground hover:opacity-90"
        >
          {currentQ < questions.length - 1 ? (
            <>Próxima <ChevronRight className="w-4 h-4 ml-1" /></>
          ) : (
            "Concluir Pré-Análise"
          )}
        </Button>
      </div>
    </div>
  );
}
