import { useQuery, useMutation } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { useLocation, useSearch } from "wouter";
import type { WellDashboardData, BHARun, Well } from "@shared/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  Loader2, 
  MapPin, 
  Drill, 
  Clock, 
  Users, 
  AlertCircle,
  CheckCircle2,
  XCircle,
  Calendar,
  Gauge,
  Layers,
  Save
} from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface DashboardProps {
  selectedWell: Well | null;
}

export default function Dashboard({ selectedWell }: DashboardProps) {
  const searchParams = new URLSearchParams(useSearch());
  const wellId = searchParams.get("wellId") || selectedWell?.id;
  const runIdFromUrl = searchParams.get("runId");
  
  const [, setLocation] = useLocation();
  const [selectedRunId, setSelectedRunId] = useState<string>(runIdFromUrl || "");
  const [overrides, setOverrides] = useState<Record<string, string>>({});
  const { toast } = useToast();

  // Redirect if no well selected
  if (!wellId) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-lg font-semibold mb-2">No Well Selected</p>
          <p className="text-sm text-muted-foreground mb-4">Please select a well from the Wells page</p>
          <Button onClick={() => setLocation("/wells")}>Go to Wells</Button>
        </div>
      </div>
    );
  }

  // Fetch BHA runs for this well
  const { data: bhaRuns, isLoading: runsLoading } = useQuery<BHARun[]>({
    queryKey: ["/api/bha-runs", wellId],
    queryFn: async () => {
      if (!wellId || wellId.trim() === "") throw new Error("Invalid well ID");
      const response = await fetch(`/api/bha-runs/${wellId}`, { credentials: "include" });
      if (!response.ok) throw new Error("Failed to fetch BHA runs");
      return response.json();
    },
    enabled: !!wellId && wellId.trim() !== "",
  });

  // Set initial run ID when runs are loaded
  useEffect(() => {
    if (bhaRuns && bhaRuns.length > 0 && !selectedRunId) {
      const defaultRunId = bhaRuns[0].id;
      setSelectedRunId(defaultRunId);
      setLocation(`/dashboard?wellId=${wellId}&runId=${defaultRunId}`);
    }
  }, [bhaRuns, selectedRunId, wellId, setLocation]);

  // Fetch well dashboard data
  const { data: wellData, isLoading, error } = useQuery<WellDashboardData>({
    queryKey: ["/api/dashboard/well-data", wellId, selectedRunId],
    queryFn: async () => {
      if (!wellId || wellId.trim() === "" || !selectedRunId || selectedRunId.trim() === "") {
        throw new Error("Invalid well ID or run ID");
      }
      const response = await fetch(`/api/dashboard/well-data?wellId=${wellId}&runId=${selectedRunId}`, { credentials: "include" });
      if (!response.ok) throw new Error("Failed to fetch dashboard data");
      return response.json();
    },
    enabled: !!wellId && wellId.trim() !== "" && !!selectedRunId && selectedRunId.trim() !== "",
  });

  // Save overrides mutation
  const saveOverridesMutation = useMutation({
    mutationFn: async (data: { wellId: string; runId: string; overrides: Partial<WellDashboardData> }) => {
      const response = await fetch("/api/dashboard/overrides", {
        method: "POST",
        body: JSON.stringify(data),
        headers: { "Content-Type": "application/json" },
        credentials: "include",
      });
      if (!response.ok) {
        throw new Error("Failed to save overrides");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/well-data", wellId, selectedRunId] });
      toast({
        title: "Success",
        description: "Overrides saved successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to save overrides",
        variant: "destructive",
      });
    },
  });

  const handleRunChange = (newRunId: string) => {
    setSelectedRunId(newRunId);
    setLocation(`/dashboard?wellId=${wellId}&runId=${newRunId}`);
  };

  const handleSaveOverrides = () => {
    saveOverridesMutation.mutate({
      wellId,
      runId: selectedRunId,
      overrides,
    });
  };

  if (runsLoading || isLoading) {
    return (
      <div className="flex items-center justify-center h-full" data-testid="loading-dashboard">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <XCircle className="w-12 h-12 text-destructive mx-auto mb-4" />
          <p className="text-lg font-semibold mb-2">Failed to load dashboard data</p>
          <p className="text-sm text-muted-foreground">{error instanceof Error ? error.message : 'Unknown error'}</p>
        </div>
      </div>
    );
  }

  if (!wellData) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">No well data available</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-auto bg-background">
      <div className="p-6 space-y-6">
        {/* Run # Selector */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-4 flex-1">
                <Label htmlFor="run-select" className="text-sm font-medium whitespace-nowrap">
                  Run #
                </Label>
                <Select value={selectedRunId} onValueChange={handleRunChange}>
                  <SelectTrigger id="run-select" className="w-48" data-testid="select-run">
                    <SelectValue placeholder="Select run" />
                  </SelectTrigger>
                  <SelectContent>
                    {bhaRuns?.map((run) => (
                      <SelectItem key={run.id} value={run.id} data-testid={`option-run-${run.runNumber}`}>
                        Run #{run.runNumber} (BHA #{run.bhaNumber}, MWD #{run.mwdNumber})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {Object.keys(overrides).length > 0 && (
                <Button 
                  onClick={handleSaveOverrides} 
                  disabled={saveOverridesMutation.isPending}
                  data-testid="button-save-overrides"
                >
                  <Save className="w-4 h-4 mr-2" />
                  Save Overrides
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Header Section */}
        <div className="space-y-2">
          <h1 className="text-3xl font-bold" data-testid="text-well-name">{wellData.well}</h1>
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline" data-testid="badge-operator">
              <Drill className="w-3 h-3 mr-1" />
              {wellData.operator}
            </Badge>
            <Badge variant="outline" data-testid="badge-rig">
              <Gauge className="w-3 h-3 mr-1" />
              {wellData.rig}
            </Badge>
            <Badge variant="outline" data-testid="badge-job">
              Job: {wellData.jobNumber}
            </Badge>
            <Badge variant="outline" data-testid="badge-section">
              <Layers className="w-3 h-3 mr-1" />
              {wellData.section}
            </Badge>
          </div>
        </div>

        {/* Grid Layout */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Location Card */}
          <Card data-testid="card-location">
            <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Location</CardTitle>
              <MapPin className="w-4 h-4 text-muted-foreground" />
            </CardHeader>
            <CardContent className="space-y-2">
              <div>
                <p className="text-xs text-muted-foreground">County</p>
                <p className="text-sm font-medium" data-testid="text-county">{wellData.county}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">State</p>
                <p className="text-sm font-medium" data-testid="text-state">{wellData.state}</p>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <p className="text-xs text-muted-foreground">Latitude</p>
                  <p className="text-xs font-mono" data-testid="text-lat">{wellData.lat.toFixed(6)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Longitude</p>
                  <p className="text-xs font-mono" data-testid="text-long">{wellData.long.toFixed(6)}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Navigation & Survey Card */}
          <Card data-testid="card-navigation">
            <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Navigation & Survey</CardTitle>
              <Gauge className="w-4 h-4 text-muted-foreground" />
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <p className="text-xs text-muted-foreground">VS</p>
                  <p className="text-sm font-medium" data-testid="text-vs">{wellData.vs.toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Grid Conv</p>
                  <p className="text-sm font-medium" data-testid="text-grid-conv">{wellData.gridConv.toFixed(6)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Declination</p>
                  <p className="text-sm font-medium" data-testid="text-declination">{wellData.declination.toFixed(2)}°</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Dip</p>
                  <p className="text-sm font-medium" data-testid="text-dip">{wellData.dip.toFixed(3)}°</p>
                </div>
                <div className="col-span-2">
                  <p className="text-xs text-muted-foreground">Mag Field</p>
                  <p className="text-sm font-medium" data-testid="text-mag-field">{wellData.magField.toFixed(3)} nT</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Mag Model</p>
                  <p className="text-xs" data-testid="text-mag-model">{wellData.magModel}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Mag Date</p>
                  <p className="text-xs" data-testid="text-mag-date">{wellData.magDate}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Depth & Time Card */}
          <Card data-testid="card-depth-time">
            <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Depth & Time</CardTitle>
              <Clock className="w-4 h-4 text-muted-foreground" />
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <p className="text-xs text-muted-foreground">Depth In</p>
                  <p className="text-sm font-medium" data-testid="text-depth-in">{wellData.depthIn.toLocaleString()} ft</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Depth Out</p>
                  <p className="text-sm font-medium" data-testid="text-depth-out">{wellData.depthOut.toLocaleString()} ft</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Time Out</p>
                  <p className="text-xs" data-testid="text-time-out">{wellData.timeOut}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">BHA #</p>
                  <p className="text-sm font-medium" data-testid="text-bha-num">{wellData.bhaNumber}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Hours Metrics Card */}
          <Card data-testid="card-hours">
            <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Hours Metrics</CardTitle>
              <Calendar className="w-4 h-4 text-muted-foreground" />
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <p className="text-xs text-muted-foreground">Drilling</p>
                  <p className="text-lg font-bold" data-testid="text-drilling-hrs">{wellData.drillingHrs.toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Circulating</p>
                  <p className="text-lg font-bold" data-testid="text-circ-hrs">{wellData.circHrs.toFixed(2)}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-xs text-muted-foreground">Total Circulating</p>
                  <p className="text-sm font-medium" data-testid="text-total-circ-hrs">{wellData.totalCirculatingHours.toFixed(2)} hrs</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Status Card */}
          <Card data-testid="card-status">
            <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Status</CardTitle>
              <AlertCircle className="w-4 h-4 text-muted-foreground" />
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Motor Fail</span>
                <Badge variant={wellData.motorFail ? "destructive" : "outline"} data-testid="badge-motor-fail">
                  {wellData.motorFail ? (
                    <><XCircle className="w-3 h-3 mr-1" />Failed</>
                  ) : (
                    <><CheckCircle2 className="w-3 h-3 mr-1" />OK</>
                  )}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">MWD Fail</span>
                <Badge variant={wellData.mwdFail ? "destructive" : "outline"} data-testid="badge-mwd-fail">
                  {wellData.mwdFail ? (
                    <><XCircle className="w-3 h-3 mr-1" />Failed</>
                  ) : (
                    <><CheckCircle2 className="w-3 h-3 mr-1" />OK</>
                  )}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">LIH</span>
                <Badge variant={wellData.lih ? "default" : "outline"} data-testid="badge-lih">
                  {wellData.lih ? "Yes" : "No"}
                </Badge>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">POOH Reason</p>
                <p className="text-xs" data-testid="text-pooh">{wellData.pooh}</p>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <p className="text-xs text-muted-foreground">Stalls</p>
                  <p className="text-sm font-medium" data-testid="text-stalls">{wellData.stalls}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">NPT</p>
                  <p className="text-sm font-medium" data-testid="text-npt">{wellData.npt}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Personnel Card */}
          <Card data-testid="card-personnel">
            <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Personnel</CardTitle>
              <Users className="w-4 h-4 text-muted-foreground" />
            </CardHeader>
            <CardContent className="space-y-2">
              <div>
                <p className="text-xs text-muted-foreground">DD Lead</p>
                <p className="text-sm font-medium" data-testid="text-dd-lead">{wellData.ddLead || "N/A"}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Directional Coordinator</p>
                <p className="text-sm font-medium" data-testid="text-dir-coord">{wellData.directionalCoordinator || "N/A"}</p>
              </div>
              {wellData.mwdCoordinator && (
                <div>
                  <p className="text-xs text-muted-foreground">MWD Coordinator</p>
                  <p className="text-sm font-medium" data-testid="text-mwd-coord">{wellData.mwdCoordinator}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Equipment Serial Numbers Table with Override Inputs */}
        <Card data-testid="card-equipment">
          <CardHeader>
            <CardTitle>Equipment Serial Numbers</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* UBHO */}
                <div className="flex items-center gap-2">
                  <Label className="text-sm font-medium w-28">UBHO</Label>
                  <div className="flex-1 text-sm font-mono" data-testid="text-ubho-sn">{wellData.ubhoSNOverride || wellData.ubhoSN || "N/A"}</div>
                  <Input
                    placeholder="N/N"
                    value={overrides.ubhoSNOverride || ""}
                    onChange={(e) => setOverrides({ ...overrides, ubhoSNOverride: e.target.value })}
                    className="w-32"
                    data-testid="input-ubho-override"
                  />
                </div>
                
                {/* Helix */}
                <div className="flex items-center gap-2">
                  <Label className="text-sm font-medium w-28">Helix</Label>
                  <div className="flex-1 text-sm font-mono" data-testid="text-helix-sn">{wellData.helixSNOverride || wellData.helixSN || "N/A"}</div>
                  <Input
                    placeholder="N/N"
                    value={overrides.helixSNOverride || ""}
                    onChange={(e) => setOverrides({ ...overrides, helixSNOverride: e.target.value })}
                    className="w-32"
                    data-testid="input-helix-override"
                  />
                </div>

                {/* Pulser */}
                <div className="flex items-center gap-2">
                  <Label className="text-sm font-medium w-28">Pulser</Label>
                  <div className="flex-1 text-sm font-mono" data-testid="text-pulser-sn">{wellData.pulserSNOverride || wellData.pulserSN || "N/A"}</div>
                  <Input
                    placeholder="N/N"
                    value={overrides.pulserSNOverride || ""}
                    onChange={(e) => setOverrides({ ...overrides, pulserSNOverride: e.target.value })}
                    className="w-32"
                    data-testid="input-pulser-override"
                  />
                </div>

                {/* Gamma */}
                <div className="flex items-center gap-2">
                  <Label className="text-sm font-medium w-28">Gamma</Label>
                  <div className="flex-1 text-sm font-mono" data-testid="text-gamma-sn">{wellData.gammaSNOverride || wellData.gammaSN || "N/A"}</div>
                  <Input
                    placeholder="N/N"
                    value={overrides.gammaSNOverride || ""}
                    onChange={(e) => setOverrides({ ...overrides, gammaSNOverride: e.target.value })}
                    className="w-32"
                    data-testid="input-gamma-override"
                  />
                </div>

                {/* Directional */}
                <div className="flex items-center gap-2">
                  <Label className="text-sm font-medium w-28">Directional</Label>
                  <div className="flex-1 text-sm font-mono" data-testid="text-dir-sn">{wellData.directionalSNOverride || wellData.directionalSN || "N/A"}</div>
                  <Input
                    placeholder="N/N"
                    value={overrides.directionalSNOverride || ""}
                    onChange={(e) => setOverrides({ ...overrides, directionalSNOverride: e.target.value })}
                    className="w-32"
                    data-testid="input-dir-override"
                  />
                </div>

                {/* Battery 1 */}
                <div className="flex items-center gap-2">
                  <Label className="text-sm font-medium w-28">Battery 1</Label>
                  <div className="flex-1 text-sm font-mono" data-testid="text-battery-sn">{wellData.batterySNOverride || wellData.batterySN || "N/A"}</div>
                  <Input
                    placeholder="N/N"
                    value={overrides.batterySNOverride || ""}
                    onChange={(e) => setOverrides({ ...overrides, batterySNOverride: e.target.value })}
                    className="w-32"
                    data-testid="input-battery-override"
                  />
                </div>

                {/* Battery 2 */}
                <div className="flex items-center gap-2">
                  <Label className="text-sm font-medium w-28">Battery 2</Label>
                  <div className="flex-1 text-sm font-mono" data-testid="text-battery2-sn">{wellData.batterySN2Override || wellData.batterySN2 || "N/A"}</div>
                  <Input
                    placeholder="N/N"
                    value={overrides.batterySN2Override || ""}
                    onChange={(e) => setOverrides({ ...overrides, batterySN2Override: e.target.value })}
                    className="w-32"
                    data-testid="input-battery2-override"
                  />
                </div>

                {/* Battery 3 */}
                <div className="flex items-center gap-2">
                  <Label className="text-sm font-medium w-28">Battery 3</Label>
                  <div className="flex-1 text-sm font-mono" data-testid="text-battery3-sn">{wellData.battery3Override || wellData.battery3 || "N/A"}</div>
                  <Input
                    placeholder="N/N"
                    value={overrides.battery3Override || ""}
                    onChange={(e) => setOverrides({ ...overrides, battery3Override: e.target.value })}
                    className="w-32"
                    data-testid="input-battery3-override"
                  />
                </div>

                {/* Shock Tool */}
                <div className="flex items-center gap-2">
                  <Label className="text-sm font-medium w-28">Shock Tool</Label>
                  <div className="flex-1 text-sm font-mono" data-testid="text-shock-sn">{wellData.shockToolSNOverride || wellData.shockToolSN || "N/A"}</div>
                  <Input
                    placeholder="N/N"
                    value={overrides.shockToolSNOverride || ""}
                    onChange={(e) => setOverrides({ ...overrides, shockToolSNOverride: e.target.value })}
                    className="w-32"
                    data-testid="input-shock-override"
                  />
                </div>

                {/* Babelfish */}
                <div className="flex items-center gap-2">
                  <Label className="text-sm font-medium w-28">Babelfish</Label>
                  <div className="flex-1 text-sm font-mono" data-testid="text-babelfish-sn">{wellData.babelfishSNOverride || wellData.babelfishSN || "N/A"}</div>
                  <Input
                    placeholder="N/N"
                    value={overrides.babelfishSNOverride || ""}
                    onChange={(e) => setOverrides({ ...overrides, babelfishSNOverride: e.target.value })}
                    className="w-32"
                    data-testid="input-babelfish-override"
                  />
                </div>

                {/* MuleShoe */}
                <div className="flex items-center gap-2">
                  <Label className="text-sm font-medium w-28">MuleShoe</Label>
                  <div className="flex-1 text-sm font-mono" data-testid="text-muleshoe-sn">{wellData.muleShoeOverride || wellData.muleShoe || "N/A"}</div>
                  <Input
                    placeholder="N/N"
                    value={overrides.muleShoeOverride || ""}
                    onChange={(e) => setOverrides({ ...overrides, muleShoeOverride: e.target.value })}
                    className="w-32"
                    data-testid="input-muleshoe-override"
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Technical Parameters Table */}
        <Card data-testid="card-technical">
          <CardHeader>
            <CardTitle>Technical Parameters</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-xs text-muted-foreground">PW</p>
                <p className="text-sm font-medium" data-testid="text-pw">{wellData.pw}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">SSQ</p>
                <p className="text-sm font-medium" data-testid="text-ssq">{wellData.ssq}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">TFSQ</p>
                <p className="text-sm font-medium" data-testid="text-tfsq">{wellData.tfsq}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">GCF</p>
                <p className="text-sm font-medium" data-testid="text-gcf">{wellData.gcf}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Svy Offset</p>
                <p className="text-sm font-medium" data-testid="text-svy-offset">{wellData.svyOffset}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Gam Offset</p>
                <p className="text-sm font-medium" data-testid="text-gam-offset">{wellData.gamOffset}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Stickup</p>
                <p className="text-sm font-medium" data-testid="text-stickup">{wellData.stickup}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Pulser Version</p>
                <p className="text-sm font-medium" data-testid="text-pulser-version">{wellData.pulserVersion}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">MWD Min Temp</p>
                <p className="text-sm font-medium" data-testid="text-min-temp">{wellData.mwdMinTemp}°</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">MWD Max Temp</p>
                <p className="text-sm font-medium" data-testid="text-max-temp">{wellData.mwdMaxTemp}°</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* BHA Description */}
        <Card data-testid="card-bha">
          <CardHeader>
            <CardTitle>BHA Information</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div>
                <p className="text-xs text-muted-foreground">Description</p>
                <p className="text-sm font-medium" data-testid="text-bha-desc">{wellData.bhaDescription}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Itemized BHA</p>
                <p className="text-sm font-medium" data-testid="text-itemized-bha">{wellData.itemizedBHA}</p>
              </div>
              {wellData.mwdMake && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-muted-foreground">MWD Make</p>
                    <p className="text-sm font-medium" data-testid="text-mwd-make">{wellData.mwdMake}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">MWD Model</p>
                    <p className="text-sm font-medium" data-testid="text-mwd-model">{wellData.mwdModel}</p>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
