import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import WellListTable, { type Well } from "@/components/WellListTable";
import { RefreshCw, ChevronLeft, ChevronRight, Search, Database, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { api } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";

interface WellsPageProps {
  onSelectWell: (well: Well) => void;
}

interface WellsResponse {
  wells: Well[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export default function WellsPage({ onSelectWell }: WellsPageProps) {
  const [selectedWellId, setSelectedWellId] = useState<string>();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const { toast } = useToast();

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1); // Reset to first page on search
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  const { data: wellsResponse, isLoading, error, refetch } = useQuery<WellsResponse>({
    queryKey: ["/api/wells", page, debouncedSearch],
    queryFn: async () => {
      const response = await fetch(`/api/wells?page=${page}&limit=100&search=${encodeURIComponent(debouncedSearch)}`, {
        credentials: "include"
      });
      if (!response.ok) throw new Error("Failed to fetch wells");
      return response.json();
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
      // Invalidate queries to force re-fetch
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

  const wells = wellsResponse?.wells || [];
  const pagination = wellsResponse?.pagination;

  // Render the well list table
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-3">
          <Database className="w-8 h-8 text-primary" />
          <div>
            <h1 className="text-2xl font-semibold">Wells</h1>
            <p className="text-sm text-muted-foreground">
              {pagination ? (
                <span className="flex items-center gap-2">
                  Showing {wells.length} of {pagination.total} wells
                  {debouncedSearch && (
                    <Badge variant="info" className="text-xs">
                      <Filter className="w-3 h-3 mr-1" />
                      Filtered
                    </Badge>
                  )}
                </span>
              ) : (
                'Select a well to view detailed information'
              )}
            </p>
          </div>
        </div>
        <Button onClick={handleRefresh} variant="outline" data-testid="button-refresh-wells">
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>
      
      <div className="flex gap-2 relative">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search wells by name, job number, operator, or rig..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
            data-testid="input-search-wells"
          />
        </div>
      </div>

      <WellListTable
        wells={wells}
        onSelectWell={handleSelectWell}
        selectedWellId={selectedWellId}
      />

      {pagination && pagination.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Page {pagination.page} of {pagination.totalPages}
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1 || isLoading}
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(p => Math.min(pagination.totalPages, p + 1))}
              disabled={page === pagination.totalPages || isLoading}
            >
              Next
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}