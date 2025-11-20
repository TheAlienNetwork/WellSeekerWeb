import { useState, useEffect } from "react";
import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { ThemeToggle } from "@/components/ThemeToggle";
import LoginPage from "@/pages/login";
import WellsPage from "@/pages/wells";
import WellDetailsPage from "@/pages/well-details";
import Dashboard from "@/pages/dashboard";
import ReportsPage from "@/pages/reports";
import NotFound from "@/pages/not-found";
import type { Well } from "@/components/WellListTable";
import { api } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

function App() {
  const [user, setUser] = useState<string | null>(null);
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [selectedWell, setSelectedWell] = useState<Well | null>(null);

  // Check if user is already authenticated on mount
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const user = await api.auth.me();
        setUser(user.email);
        setIsAuthenticated(true);
      } catch (error) {
        setUser(null);
        setIsAuthenticated(false);
      } finally {
        setIsCheckingAuth(false);
      }
    };

    checkAuth();
  }, []);

  // Setup global error handler for token expiration
  useEffect(() => {
    const originalFetch = window.fetch;
    window.fetch = async (...args) => {
      const response = await originalFetch(...args);

      if (response.status === 500) {
        const clonedResponse = response.clone();
        try {
          const errorData = await clonedResponse.json();
          if (errorData.error && errorData.error.includes("TOKEN_EXPIRED")) {
            toast({
              title: "Session Expired",
              description: "Your session has expired. Please log in again.",
              variant: "destructive",
            });
            setUser(null);
            setIsAuthenticated(false);
            setSelectedWell(null);
            setLocation("/");
          }
        } catch (e) {
          // Not a JSON response, ignore
        }
      }

      return response;
    };

    return () => {
      window.fetch = originalFetch;
    };
  }, [toast, setLocation]);


  const handleLogin = (email: string) => {
    setUser(email);
    setIsAuthenticated(true);
    setCurrentPage("dashboard");
    setLocation("/dashboard");
  };

  const handleLogout = async () => {
    try {
      await api.auth.logout();
      setIsAuthenticated(false);
      setUser("");
      setSelectedWell(null);
      setLocation("/");
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  const handleSelectWell = (well: Well) => {
    setSelectedWell(well);
    setCurrentPage("dashboard");
    setLocation(`/dashboard?wellId=${well.id}`);
  };

  const handleNavigate = (page: string) => {
    setCurrentPage(page);
    if (page === "dashboard") setLocation("/dashboard");
    else if (page === "wells") setLocation("/wells");
    else if (page === "details") setLocation("/well-details");
    else setLocation(`/${page}`);
  };

  if (isCheckingAuth) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <LoginPage onLogin={handleLogin} />;
  }

  const style = {
    "--sidebar-width": "20rem",
    "--sidebar-width-icon": "4rem",
  };

  return (
    <SidebarProvider style={style as React.CSSProperties}>
      <div className="flex h-screen w-full">
        <AppSidebar
          currentPage={currentPage}
          onNavigate={handleNavigate}
          onLogout={handleLogout}
          userEmail={user}
        />
        <div className="flex flex-col flex-1">
          <header className="flex items-center justify-between p-4 border-b">
            <SidebarTrigger data-testid="button-sidebar-toggle" />
            <ThemeToggle />
          </header>
          <main className="flex-1 overflow-hidden">
            <Switch>
              <Route path="/dashboard">
                <Dashboard selectedWell={selectedWell} />
              </Route>
              <Route path="/wells">
                <WellsPage onSelectWell={handleSelectWell} />
              </Route>
              <Route path="/well-details">
                <WellDetailsPage selectedWellId={selectedWell?.id} />
              </Route>
              <Route path="/reports">
                <ReportsPage selectedWell={selectedWell} />
              </Route>
              <Route path="/settings">
                <div className="space-y-4 p-6">
                  <h1 className="text-2xl font-semibold">Settings</h1>
                  <p className="text-muted-foreground">Application settings coming soon</p>
                </div>
              </Route>
              <Route component={NotFound} />
            </Switch>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}


function Router() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [location, setLocation] = useLocation();
  const { toast } = useToast();
  const [selectedWell, setSelectedWell] = useState<Well | null>(null);


  useEffect(() => {
    async function checkAuth() {
      try {
        await api.auth.me();
        setIsAuthenticated(true);
      } catch (error) {
        setIsAuthenticated(false);
        if (location !== "/login") {
          setLocation("/login");
        }
      } finally {
        setIsCheckingAuth(false);
      }
    }

    checkAuth();
  }, [location, setLocation]);

  const handleLogin = () => {
    setIsAuthenticated(true);
    setLocation("/wells");
  };

  const handleLogout = async () => {
    try {
      await api.auth.logout();
      setIsAuthenticated(false);
      setSelectedWell(null);
      setLocation("/login");
      toast({
        title: "Logged out",
        description: "You have been successfully logged out",
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to log out",
      });
    }
  };

  if (isCheckingAuth) {
    return <div className="flex items-center justify-center h-screen">Loading...</div>;
  }

  if (!isAuthenticated && location !== "/login") {
    return <LoginPage onLoginSuccess={handleLogin} />;
  }

  return (
    <SidebarProvider>
      <div className="flex h-screen w-full bg-background">
        <AppSidebar onLogout={handleLogout} />
        <main className="flex-1 overflow-hidden">
          <div className="flex items-center gap-2 border-b px-4 py-3">
            <SidebarTrigger />
            <div className="flex-1" />
            <ThemeToggle />
          </div>
          <div className="h-[calc(100vh-57px)] overflow-auto">
            <Switch>
              <Route path="/login">
                <LoginPage onLoginSuccess={handleLogin} />
              </Route>
              <Route path="/wells">
                <WellsPage onSelectWell={(well) => {
                  setSelectedWell(well);
                  setLocation(`/dashboard?wellId=${well.id}`);
                }} />
              </Route>
              <Route path="/well-details">
                <WellDetailsPage />
              </Route>
              <Route path="/dashboard">
                <Dashboard selectedWell={selectedWell} />
              </Route>
              <Route path="/reports">
                <ReportsPage selectedWell={selectedWell} />
              </Route>
              <Route>
                <NotFound />
              </Route>
            </Switch>
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
}


export default App;