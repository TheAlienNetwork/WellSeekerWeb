import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import WellListTable, { type Well } from "@/components/WellListTable";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";

interface WellsPageProps {
  onSelectWell: (well: Well) => void;
}

export default function WellsPage({ onSelectWell }: WellsPageProps) {
  const [selectedWellId, setSelectedWellId] = useState<string>();
  const { toast } = useToast();

  const { data: wells, isLoading, error, refetch } = useQuery({
    queryKey: ["/api/wells"],
    queryFn: () => api.wells.list(),
    onError: (err) => {
      if (err.message.includes("invalid token") || err.message.includes("expired")) {
        toast({
          title: "Authentication Failed",
          description: "Your session has expired. Please log in again.",
          variant: "destructive",
        });
        // Optionally, redirect to login page or trigger a re-authentication flow here
      } else {
        toast({
          variant: "destructive",
          title: "Error loading wells",
          description: err.message || "An unknown error occurred.",
        });
      }
    },
  });

  const handleSelectWell = (well: Well) => {
    setSelectedWellId(well.id);
    onSelectWell(well);
  };

  const handleRefresh = async () => {
    try {
      // Attempt to refresh the token first
      await api.auth.refreshToken();
      toast({
        title: "Token Refreshed",
        description: "Your session has been refreshed successfully.",
      });
      // After successful token refresh, refetch the wells data
      await refetch();
      toast({
        title: "Wells refreshed",
        description: "Well list has been updated",
      });
    } catch (err: any) {
      // If token refresh fails, show an error and potentially redirect to login
      toast({
        title: "Refresh Failed",
        description: "Please log in again to continue.",
        variant: "destructive",
      });
      // Clear selected well and potentially other state related to authentication
      setSelectedWellId(undefined);
      onSelectWell({ id: "", name: "", location: "", status: "" }); // Reset selected well
      // Invalidate queries to force re-fetch and trigger the onError handler for wells if not already handled
      queryClient.invalidateQueries({ queryKey: ["/api/wells"] });
    }
  };

  // If there's an error, display it with a refresh button
  if (error) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-semibold">Wells</h1>
        <div className="p-4 border border-destructive rounded-md flex flex-col items-center justify-center gap-4">
          <p className="text-destructive">Failed to load wells: {error instanceof Error ? error.message : "Unknown error"}</p>
          <Button onClick={handleRefresh} disabled={isLoading}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Retry
          </Button>
        </div>
      </div>
    );
  }

  // If loading, display a loading indicator
  if (isLoading) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-semibold">Wells</h1>
        <div className="flex items-center justify-center p-12">
          <div className="text-muted-foreground">Loading wells...</div>
        </div>
      </div>
    );
  }

  // Render the well list table
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Wells</h1>
          <p className="text-sm text-muted-foreground">Select a well to view detailed information</p>
        </div>
        <Button onClick={handleRefresh} variant="outline" data-testid="button-refresh-wells">
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>
      <WellListTable
        wells={wells || []}
        onSelectWell={handleSelectWell}
        selectedWellId={selectedWellId}
      />
    </div>
  );
}