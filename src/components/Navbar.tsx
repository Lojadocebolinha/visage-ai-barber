import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Scissors, Home, BarChart3, LogOut, Menu, X } from "lucide-react";
import { useState } from "react";
import { translations } from "@/lib/translations";

export default function Navbar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, role, signOut } = useAuth();
  const [isOpen, setIsOpen] = useState(false);

  // Não mostrar navbar na landing page
  if (location.pathname === "/") {
    return null;
  }

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
    setIsOpen(false);
  };

  const isAdmin = role === "admin";

  return (
    <nav className="border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
        {/* Logo */}
        <div
          className="flex items-center gap-2 cursor-pointer"
          onClick={() => {
            navigate(user ? (isAdmin ? "/admin" : "/dashboard") : "/");
            setIsOpen(false);
          }}
        >
          <div className="w-8 h-8 rounded-full bg-gradient-gold flex items-center justify-center">
            <Scissors className="w-4 h-4 text-primary-foreground" />
          </div>
          <span className="font-display font-semibold text-foreground hidden sm:inline">
            VisagiPro
          </span>
        </div>

        {/* Desktop Menu */}
        <div className="hidden md:flex items-center gap-2">
          {user && (
            <>
              {isAdmin && (
                <Button
                  variant="default"
                  onClick={() => navigate("/admin")}
                  className="gap-2 bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 text-white font-semibold shadow-md"
                >
                  <BarChart3 className="w-4 h-4" />
                  {translations.navbar.painel_admin}
                </Button>
              )}

              {!isAdmin && (
                <Button
                  variant={location.pathname === "/dashboard" ? "default" : "ghost"}
                  onClick={() => navigate("/dashboard")}
                  className="gap-2"
                >
                  <Home className="w-4 h-4" />
                  {translations.navbar.inicio}
                </Button>
              )}

              <Button
                variant="ghost"
                onClick={handleSignOut}
                className="gap-2 text-muted-foreground hover:text-foreground"
              >
                <LogOut className="w-4 h-4" />
                {translations.navbar.sair}
              </Button>
            </>
          )}

          {!user && (
            <Button onClick={() => navigate("/auth")}>{translations.navbar.entrar}</Button>
          )}
        </div>

        {/* Mobile Menu Button */}
        <div className="md:hidden">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsOpen(!isOpen)}
          >
            {isOpen ? (
              <X className="w-5 h-5" />
            ) : (
              <Menu className="w-5 h-5" />
            )}
          </Button>
        </div>
      </div>

      {/* Mobile Menu */}
      {isOpen && (
        <div className="md:hidden border-t border-border bg-secondary/50">
          <div className="px-4 py-3 space-y-2">
            {user && (
              <>
                {isAdmin && (
                  <Button
                    variant="default"
                    onClick={() => {
                      navigate("/admin");
                      setIsOpen(false);
                    }}
                    className="w-full justify-start gap-2 bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 text-white font-semibold"
                  >
                    <BarChart3 className="w-4 h-4" />
                    {translations.navbar.painel_admin}
                  </Button>
                )}

                {!isAdmin && (
                  <Button
                    variant={location.pathname === "/dashboard" ? "default" : "outline"}
                    onClick={() => {
                      navigate("/dashboard");
                      setIsOpen(false);
                    }}
                    className="w-full justify-start gap-2"
                  >
                    <Home className="w-4 h-4" />
                    {translations.navbar.inicio}
                  </Button>
                )}

                <Button
                  variant="outline"
                  onClick={handleSignOut}
                  className="w-full justify-start gap-2 text-muted-foreground"
                >
                  <LogOut className="w-4 h-4" />
                  {translations.navbar.sair}
                </Button>
              </>
            )}

            {!user && (
              <Button
                onClick={() => {
                  navigate("/auth");
                  setIsOpen(false);
                }}
                className="w-full"
              >
                {translations.navbar.entrar}
              </Button>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}
