import { useState } from "react";
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
import NotFound from "@/pages/not-found";
import type { Well } from "@/components/WellListTable";

function Router() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userEmail, setUserEmail] = useState("");
  const [, setLocation] = useLocation();
  const [currentPage, setCurrentPage] = useState("wells");

  const handleLogin = (email: string, password: string) => {
    console.log('Login attempt:', email);
    //todo: remove mock functionality - implement real authentication with Well Seeker Pro API
    setUserEmail(email);
    setIsAuthenticated(true);
    setLocation("/wells");
  };

  const handleLogout = () => {
    console.log('Logout');
    setIsAuthenticated(false);
    setUserEmail("");
    setLocation("/");
  };

  const handleSelectWell = (well: Well) => {
    console.log('Selected well:', well);
    setCurrentPage("details");
    setLocation("/well-details");
  };

  const handleNavigate = (page: string) => {
    setCurrentPage(page);
    if (page === "wells") setLocation("/wells");
    else if (page === "details") setLocation("/well-details");
    else setLocation(`/${page}`);
  };

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
          <main className="flex-1 overflow-auto p-6">
            <Switch>
              <Route path="/wells">
                <WellsPage onSelectWell={handleSelectWell} />
              </Route>
              <Route path="/well-details">
                <WellDetailsPage />
              </Route>
              <Route path="/reports">
                <div className="space-y-4">
                  <h1 className="text-2xl font-semibold">Reports</h1>
                  <p className="text-muted-foreground">Report generation coming soon</p>
                </div>
              </Route>
              <Route path="/settings">
                <div className="space-y-4">
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
