import { motion } from "framer-motion";

interface ProgressBarProps {
  currentStep: number;
  totalSteps: number;
  stepLabels: string[];
}

export default function ProgressBar({
  currentStep,
  totalSteps,
  stepLabels,
}: ProgressBarProps) {
  const progress = (currentStep / totalSteps) * 100;

  return (
    <div className="w-full space-y-3">
      {/* Barra de progresso visual */}
      <div className="w-full bg-secondary/50 rounded-full h-2 overflow-hidden">
        <motion.div
          className="h-full bg-gradient-to-r from-primary to-primary/80"
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.5, ease: "easeInOut" }}
        />
      </div>

      {/* Indicador de etapa */}
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-foreground">
          Etapa {currentStep} de {totalSteps}
        </span>
        <span className="text-xs text-muted-foreground">
          {Math.round(progress)}%
        </span>
      </div>

      {/* Labels das etapas */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
        {stepLabels.map((label, index) => (
          <motion.div
            key={index}
            className={`text-xs text-center py-2 px-1 rounded-lg transition-all ${
              index < currentStep
                ? "bg-primary/20 text-primary font-semibold"
                : index === currentStep - 1
                ? "bg-primary text-primary-foreground font-semibold"
                : "bg-secondary/30 text-muted-foreground"
            }`}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: index * 0.1 }}
          >
            {label}
          </motion.div>
        ))}
      </div>
    </div>
  );
}
