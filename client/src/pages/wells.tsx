import { useState } from "react";
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

  const { data: wells, isLoading, error } = useQuery({
    queryKey: ["/api/wells"],
    queryFn: () => api.wells.list(),
  });

  const handleSelectWell = (well: Well) => {
    setSelectedWellId(well.id);
    onSelectWell(well);
  };

  const handleRefresh = async () => {
    try {
      await queryClient.invalidateQueries({ queryKey: ["/api/wells"] });
      toast({
        title: "Wells refreshed",
        description: "Well list has been updated",
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Refresh failed",
        description: "Failed to refresh wells",
      });
    }
  };

  if (error) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-semibold">Wells</h1>
        <div className="p-4 border border-destructive rounded-md">
          <p className="text-destructive">Failed to load wells: {error instanceof Error ? error.message : "Unknown error"}</p>
        </div>
      </div>
    );
  }

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
