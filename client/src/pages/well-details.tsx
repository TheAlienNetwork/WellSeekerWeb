import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import WellDetailsHeader from "@/components/WellDetailsHeader";
import BHADataTable from "@/components/BHADataTable";
import DrillingParametersPanel from "@/components/DrillingParametersPanel";
import ToolComponentsPanel from "@/components/ToolComponentsPanel";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";

interface WellDetailsPageProps {
  selectedWellId?: string;
}

export default function WellDetailsPage({ selectedWellId }: WellDetailsPageProps) {
  const [selectedBHA, setSelectedBHA] = useState(1);
  const { toast } = useToast();

  const { data: wellDetails, isLoading: isLoadingDetails } = useQuery({
    queryKey: ["/api/wells", selectedWellId],
    queryFn: () => api.wells.get(selectedWellId!),
    enabled: !!selectedWellId,
  });

  const { data: bhaComponents, isLoading: isLoadingBHA } = useQuery({
    queryKey: ["/api/wells", selectedWellId, "bha", selectedBHA],
    queryFn: () => api.wells.getBHA(selectedWellId!, selectedBHA),
    enabled: !!selectedWellId,
  });

  const { data: drillingParameters, isLoading: isLoadingDrilling } = useQuery({
    queryKey: ["/api/wells", selectedWellId, "drilling-parameters"],
    queryFn: () => api.wells.getDrillingParameters(selectedWellId!),
    enabled: !!selectedWellId,
  });

  const { data: toolComponents, isLoading: isLoadingTools } = useQuery({
    queryKey: ["/api/wells", selectedWellId, "tool-components"],
    queryFn: () => api.wells.getToolComponents(selectedWellId!),
    enabled: !!selectedWellId,
  });

  const handleRefresh = async () => {
    try {
      await queryClient.invalidateQueries({ queryKey: ["/api/wells", selectedWellId] });
      toast({
        title: "Data refreshed",
        description: "Well data has been updated",
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Refresh failed",
        description: "Failed to refresh well data",
      });
    }
  };

  if (!selectedWellId) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-semibold">Well Details</h1>
        <p className="text-muted-foreground">Please select a well from the Wells page</p>
      </div>
    );
  }

  if (isLoadingDetails) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-semibold">Well Details</h1>
        <div className="flex items-center justify-center p-12">
          <div className="text-muted-foreground">Loading well details...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Well Details</h1>
          <p className="text-sm text-muted-foreground">Comprehensive well information and drilling parameters</p>
        </div>
        <Button onClick={handleRefresh} variant="outline" data-testid="button-refresh-details">
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {wellDetails && <WellDetailsHeader details={wellDetails} />}

      <Tabs defaultValue="bha" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="bha" data-testid="tab-bha">BHA Components</TabsTrigger>
          <TabsTrigger value="drilling" data-testid="tab-drilling">Drilling Parameters</TabsTrigger>
          <TabsTrigger value="tools" data-testid="tab-tools">Tool Components</TabsTrigger>
        </TabsList>
        <TabsContent value="bha" className="space-y-4">
          {isLoadingBHA ? (
            <div className="flex items-center justify-center p-12">
              <div className="text-muted-foreground">Loading BHA components...</div>
            </div>
          ) : bhaComponents ? (
            <BHADataTable
              components={bhaComponents}
              selectedBHA={selectedBHA}
              availableBHAs={[1, 2, 3, 4]}
              onSelectBHA={setSelectedBHA}
            />
          ) : null}
        </TabsContent>
        <TabsContent value="drilling" className="space-y-4">
          {isLoadingDrilling ? (
            <div className="flex items-center justify-center p-12">
              <div className="text-muted-foreground">Loading drilling parameters...</div>
            </div>
          ) : drillingParameters ? (
            <DrillingParametersPanel parameters={drillingParameters} />
          ) : null}
        </TabsContent>
        <TabsContent value="tools" className="space-y-4">
          {isLoadingTools ? (
            <div className="flex items-center justify-center p-12">
              <div className="text-muted-foreground">Loading tool components...</div>
            </div>
          ) : toolComponents ? (
            <ToolComponentsPanel components={toolComponents} />
          ) : null}
        </TabsContent>
      </Tabs>
    </div>
  );
}
