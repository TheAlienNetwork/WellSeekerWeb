import { useState } from "react";
import LoginForm from "@/components/LoginForm";
import { useToast } from "@/hooks/use-toast";
import { api } from "@/lib/api";

interface LoginPageProps {
  onLogin: (email: string) => void;
}

export default function LoginPage({ onLogin }: LoginPageProps) {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleLogin = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const result = await api.auth.login(email, password);
      toast({
        title: "Login successful",
        description: `Welcome back, ${result.email}`,
      });
      onLogin(result.email);
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Login failed",
        description: error instanceof Error ? error.message : "Invalid credentials",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return <LoginForm onLogin={handleLogin} />;
}
