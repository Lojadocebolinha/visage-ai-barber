import { useAuth } from "@/contexts/AuthContext";
import AuthPage from "@/pages/AuthPage";
import ClientDashboard from "@/pages/ClientDashboard";
import AdminDashboard from "@/pages/AdminDashboard";

const Index = () => {
  const { user, role, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-8 h-8 rounded-full bg-gradient-gold animate-pulse" />
      </div>
    );
  }

  if (!user) return <AuthPage />;

  if (role === "admin") return <AdminDashboard />;

  return <ClientDashboard />;
};

export default Index;
