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
  const [directToken, setDirectToken] = useState("");
  const [useDirectToken, setUseDirectToken] = useState(false);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      // Send directToken if using direct token mode
      const result = await fetch("/api/auth/login", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          password: useDirectToken ? "" : password,
          directToken: useDirectToken ? directToken : undefined,
        }),
      });

      if (!result.ok) {
        const errorData = await result.json();
        throw new Error(errorData.error || "Login failed");
      }

      const data = await result.json();
      onLogin(data.email);
      toast({
        title: "Login successful",
        description: "Welcome to Peeker",
      });
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
        toast({
          title: "Login failed",
          description: err.message || "Invalid Peeker credentials. Please check your credentials.",
          variant: "destructive",
        });
      } else {
        setError("An unexpected error occurred");
        toast({
          title: "Login failed",
          description: "An unexpected error occurred. Please try again.",
          variant: "destructive",
        });
      }
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
            {!useDirectToken && (
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
            )}
            <div className="flex items-center space-x-2">
              <Input
                id="useDirectToken"
                type="checkbox"
                checked={useDirectToken}
                onChange={(e) => setUseDirectToken(e.target.checked)}
                disabled={isLoading}
              />
              <Label htmlFor="useDirectToken">Use Direct Token</Label>
            </div>
            {useDirectToken && (
              <div className="space-y-2">
                <Label htmlFor="directToken" data-testid="label-direct-token">Direct Token</Label>
                <Input
                  id="directToken"
                  type="text"
                  placeholder="Paste your token here"
                  value={directToken}
                  onChange={(e) => setDirectToken(e.target.value)}
                  required
                  data-testid="input-direct-token"
                  disabled={isLoading}
                />
              </div>
            )}
            {error && <p className="text-destructive text-sm">{error}</p>}
            <Button type="submit" className="w-full" data-testid="button-login" disabled={isLoading}>
              {isLoading ? "Signing In..." : "Sign In"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}