import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Scissors, Sparkles, Users, Zap } from "lucide-react";

export default function LandingPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <section className="min-h-screen flex items-center justify-center px-4 py-20">
        <div className="max-w-3xl mx-auto text-center space-y-8">
          {/* Logo */}
          <div className="flex justify-center">
            <div className="w-16 h-16 rounded-full bg-gradient-gold flex items-center justify-center">
              <Scissors className="w-8 h-8 text-primary-foreground" />
            </div>
          </div>

          {/* Title */}
          <div className="space-y-4">
            <h1 className="text-5xl md:text-6xl font-display font-bold text-foreground">
              VisagiPro
            </h1>
            <p className="text-xl text-muted-foreground">
              Descubra o corte de cabelo perfeito para você com IA
            </p>
          </div>

          {/* Description */}
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Análise facial profissional + Visagismo capilar inteligente = O corte ideal para sua forma de rosto e estilo pessoal
          </p>

          {/* CTA Button */}
          <div className="pt-4">
            <Button
              size="lg"
              onClick={() => navigate("/auth")}
              className="text-lg px-8 py-6"
            >
              Começar Agora
            </Button>
          </div>

          {/* Features */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 pt-16">
            <div className="glass-card rounded-xl p-6 space-y-3">
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mx-auto">
                <Sparkles className="w-6 h-6 text-primary" />
              </div>
              <h3 className="font-semibold text-foreground">Análise Inteligente</h3>
              <p className="text-sm text-muted-foreground">
                IA avançada analisa sua forma de rosto e características de cabelo
              </p>
            </div>

            <div className="glass-card rounded-xl p-6 space-y-3">
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mx-auto">
                <Scissors className="w-6 h-6 text-primary" />
              </div>
              <h3 className="font-semibold text-foreground">Cortes Profissionais</h3>
              <p className="text-sm text-muted-foreground">
                Recomendações de barbeiros profissionais baseadas em visagismo
              </p>
            </div>

            <div className="glass-card rounded-xl p-6 space-y-3">
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mx-auto">
                <Zap className="w-6 h-6 text-primary" />
              </div>
              <h3 className="font-semibold text-foreground">Resultados Rápidos</h3>
              <p className="text-sm text-muted-foreground">
                Visualize seu novo corte em segundos com simulação realista
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-8 px-4">
        <div className="max-w-4xl mx-auto text-center text-sm text-muted-foreground">
          <p>© 2026 VisagiPro. Todos os direitos reservados.</p>
        </div>
      </footer>
    </div>
  );
}
