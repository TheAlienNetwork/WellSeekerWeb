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
import NotFound from "@/pages/not-found";
import type { Well } from "@/components/WellListTable";
import { api } from "@/lib/api";

function Router() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userEmail, setUserEmail] = useState("");
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [, setLocation] = useLocation();
  const [currentPage, setCurrentPage] = useState("wells");
  const [selectedWellId, setSelectedWellId] = useState<string>();

  // Check if user is already authenticated on mount
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const user = await api.auth.me();
        setUserEmail(user.email);
        setIsAuthenticated(true);
      } catch (error) {
        setIsAuthenticated(false);
      } finally {
        setIsCheckingAuth(false);
      }
    };

    checkAuth();
  }, []);

  const handleLogin = (email: string) => {
    setUserEmail(email);
    setIsAuthenticated(true);
    setCurrentPage("dashboard");
    setLocation("/dashboard");
  };

  const handleLogout = async () => {
    try {
      await api.auth.logout();
      setIsAuthenticated(false);
      setUserEmail("");
      setSelectedWellId(undefined);
      setLocation("/");
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  const handleSelectWell = (well: Well) => {
    setSelectedWellId(well.id);
    setCurrentPage("details");
    setLocation("/well-details");
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
          userEmail={userEmail}
        />
        <div className="flex flex-col flex-1">
          <header className="flex items-center justify-between p-4 border-b">
            <SidebarTrigger data-testid="button-sidebar-toggle" />
            <ThemeToggle />
          </header>
          <main className="flex-1 overflow-hidden">
            <Switch>
              <Route path="/dashboard">
                <Dashboard />
              </Route>
              <Route path="/wells">
                <WellsPage onSelectWell={handleSelectWell} />
              </Route>
              <Route path="/well-details">
                <WellDetailsPage selectedWellId={selectedWellId} />
              </Route>
              <Route path="/reports">
                <div className="space-y-4 p-6">
                  <h1 className="text-2xl font-semibold">Reports</h1>
                  <p className="text-muted-foreground">Report generation coming soon</p>
                </div>
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

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
