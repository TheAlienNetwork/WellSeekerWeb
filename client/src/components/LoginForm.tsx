import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { api } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

interface LoginFormProps {
  onLogin: (email: string) => void;
}

export default function LoginForm({ onLogin }: LoginFormProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email || !password) {
      toast({
        title: "Missing credentials",
        description: "Please enter both email and password",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      const result = await api.auth.login(email, password);
      toast({
        title: "Login successful",
        description: "Welcome to Peeker",
      });
      onLogin(result.email);
    } catch (error: any) {
      toast({
        title: "Login failed",
        description: error.message || "Invalid Peeker credentials. Please check your username and password.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold">Welcome to Peeker</CardTitle>
          <CardDescription>
            Enter your credentials to access well data
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email" data-testid="label-email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="your.email@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                data-testid="input-email"
                disabled={isLoading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password" data-testid="label-password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                data-testid="input-password"
                disabled={isLoading}
              />
            </div>
            <Button type="submit" className="w-full" data-testid="button-login" disabled={isLoading}>
              {isLoading ? "Signing In..." : "Sign In"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}