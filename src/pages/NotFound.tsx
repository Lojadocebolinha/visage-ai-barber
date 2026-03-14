import { useLocation, useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { AlertCircle, Home } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

const NotFound = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, role } = useAuth();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  const handleGoHome = () => {
    if (user) {
      if (role === "admin") {
        navigate("/admin");
      } else {
        navigate("/dashboard");
      }
    } else {
      navigate("/");
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="text-center px-4 max-w-md">
        <div className="flex justify-center mb-4">
          <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center">
            <AlertCircle className="w-8 h-8 text-destructive" />
          </div>
        </div>
        <h1 className="mb-2 text-4xl font-bold text-foreground">404</h1>
        <p className="mb-2 text-xl font-semibold text-foreground">Página não encontrada</p>
        <p className="mb-6 text-muted-foreground">
          Desculpe, a página que você está procurando não existe ou foi movida. Isso pode ter acontecido se a análise ainda está sendo processada.
        </p>
        <p className="mb-6 text-sm text-muted-foreground">
          Rota acessada: <code className="bg-secondary px-2 py-1 rounded text-xs">{location.pathname}</code>
        </p>
        <div className="flex gap-3 justify-center">
          <Button
            onClick={handleGoHome}
            className="gap-2"
          >
            <Home className="w-4 h-4" />
            Voltar para o Início
          </Button>
          <Button
            variant="outline"
            onClick={() => window.location.href = "/"}
          >
            Ir para Home
          </Button>
        </div>
      </div>
    </div>
  );
};

export default NotFound;
