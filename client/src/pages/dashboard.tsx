
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
  Save,
  Compass,
  TrendingDown,
  TrendingUp,
  Activity,
  Thermometer,
  Wrench,
  Hash,
  Settings,
  Info
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
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
      const data = await response.json();
      return Array.isArray(data) ? data : [];
    },
    enabled: !!wellId && wellId.trim() !== "",
  });

  // Set initial run ID when runs are loaded
  useEffect(() => {
    if (bhaRuns && bhaRuns.length > 0 && !selectedRunId) {
      const defaultRunId = bhaRuns[0].id;
      setSelectedRunId(defaultRunId);
      setLocation(`/dashboard?wellId=${wellId}&runId=${defaultRunId}`);
    } else if (bhaRuns && bhaRuns.length === 0 && !selectedRunId) {
      // No runs found - create a default run ID
      const defaultRunId = `${wellId}-run-1`;
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
      if (!response.ok) {
        // Return null instead of throwing to allow default data to be used
        return null;
      }
      return response.json();
    },
    enabled: !!wellId && wellId.trim() !== "" && !!selectedRunId && selectedRunId.trim() !== "",
  });

  // Create default empty well data if not available
  const displayData: WellDashboardData = wellData || {
    wellId: String(wellId),
    runId: String(selectedRunId),
    operator: selectedWell?.operator || 'N/A',
    rig: selectedWell?.rig || 'N/A',
    well: selectedWell?.actualWell || 'N/A',
    jobNumber: selectedWell?.jobNum || 'N/A',
    wellbore: `${selectedWell?.actualWell || 'N/A'} - Wellbore 1`,
    mwdNumber: 0,
    bhaNumber: 0,
    section: 'N/A',
    county: '',
    state: '',
    lat: 0,
    long: 0,
    northRef: true,
    vs: 0,
    gridConv: 0,
    declination: 0,
    magField: 0,
    dip: 0,
    magModel: 'N/A',
    magDate: new Date().toISOString().split('T')[0],
    plugIn: null,
    unplug: null,
    timeIn: null,
    timeOut: '',
    depthIn: 0,
    depthOut: 0,
    circHrs: 0,
    drillingHrs: 0,
    brtHrs: 0,
    motorFail: false,
    mwdFail: false,
    pooh: 'No data available',
    mwdComments: 'No BHA data found',
    pw: 0,
    ssq: 0,
    tfsq: 0,
    crossover: 0,
    gcf: 0,
    dao: 0,
    surfaceSystemVersion: 0,
    svyOffset: 0,
    gamOffset: 0,
    stickup: 0,
    retrievable: 0,
    pinToSetScrew: 0,
    probeOrder: 0,
    itemizedBHA: 'No BHA data available',
    mwdMake: '',
    mwdModel: '',
    ubhoSN: '0',
    helixSN: '0',
    helixType: '',
    pulserSN: '0',
    gammaSN: '0',
    directionalSN: '',
    batterySN: '0',
    batterySN2: '0',
    shockToolSN: '0',
    lih: false,
    stalls: 0,
    npt: 0,
    mwdCoordinator: '',
    directionalCoordinator: '',
    ddLead: '',
    mwdLead: '',
    pushTimeStamp: 'No data',
    planName: '',
    mwdDay: '',
    mwdNight: '',
    bhaDescription: 'No BHA data available',
    apiNumber: '',
    pulserVersion: 0,
    mwdMinTemp: 0,
    mwdMaxTemp: 0,
    corrShockToolSN: '',
    totalCirculatingHours: 0,
    mudType: '',
    mudWeight: '',
    correctingMDG: '',
    battery3: '0',
    babelfishSN: '0',
    muleShoe: '0',
  };

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

  return (
    <div className="h-full overflow-auto bg-background">
      <div className="p-6 space-y-6">
        {!wellData && (
          <Card className="bg-yellow-50 border-yellow-200">
            <CardContent className="pt-6">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-yellow-600" />
                <p className="text-sm text-yellow-800">
                  No BHA data found for this well. Showing default values (0).
                  {bhaRuns && bhaRuns.length === 0 && " This well may not have any BHA headers configured in Well Seeker Pro."}
                </p>
              </div>
            </CardContent>
          </Card>
        )}

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
                    {bhaRuns && bhaRuns.length > 0 ? (
                      bhaRuns.map((run) => (
                        <SelectItem key={run.id} value={run.id} data-testid={`option-run-${run.runNumber}`}>
                          Run #{run.runNumber} (BHA #{run.bhaNumber}, MWD #{run.mwdNumber})
                        </SelectItem>
                      ))
                    ) : (
                      <SelectItem value={`${wellId}-run-1`} data-testid="option-run-default">
                        No runs available (showing default)
                      </SelectItem>
                    )}
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
          <div className="flex items-center gap-3">
            <Badge className="bg-cyan-500/20 text-cyan-400 border-cyan-400/30 px-3 py-1.5 font-mono text-lg" data-testid="badge-well-name">
              {displayData.well}
            </Badge>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline" data-testid="badge-operator">
              <Drill className="w-3 h-3 mr-1" />
              {displayData.operator}
            </Badge>
            <Badge variant="outline" data-testid="badge-rig">
              <Gauge className="w-3 h-3 mr-1" />
              {displayData.rig}
            </Badge>
            <Badge variant="outline" data-testid="badge-job">
              Job: {displayData.jobNumber}
            </Badge>
            <Badge variant="outline" data-testid="badge-section">
              <Layers className="w-3 h-3 mr-1" />
              {displayData.section}
            </Badge>
          </div>
        </div>

        {/* Grid Layout */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Location Card */}
          <Card data-testid="card-location">
            <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Location</CardTitle>
              <MapPin className="w-4 h-4 text-destructive" />
            </CardHeader>
            <CardContent className="space-y-2">
              <div>
                <p className="text-xs text-muted-foreground">County</p>
                <p className="text-sm font-medium" data-testid="text-county">{displayData.county || 'N/A'}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">State</p>
                <p className="text-sm font-medium" data-testid="text-state">{displayData.state || 'N/A'}</p>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <p className="text-xs text-muted-foreground">Latitude</p>
                  <p className="text-xs font-mono" data-testid="text-lat">{displayData.lat.toFixed(6)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Longitude</p>
                  <p className="text-xs font-mono" data-testid="text-long">{displayData.long.toFixed(6)}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Navigation & Survey Card */}
          <Card data-testid="card-navigation">
            <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Navigation & Survey</CardTitle>
              <Compass className="w-4 h-4 text-info" />
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <p className="text-xs text-muted-foreground">VS</p>
                  <p className="text-sm font-medium" data-testid="text-vs">{displayData.vs.toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Grid Conv</p>
                  <p className="text-sm font-medium" data-testid="text-grid-conv">{displayData.gridConv.toFixed(6)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Declination</p>
                  <p className="text-sm font-medium" data-testid="text-declination">{displayData.declination.toFixed(2)}°</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Dip</p>
                  <p className="text-sm font-medium" data-testid="text-dip">{displayData.dip.toFixed(3)}°</p>
                </div>
                <div className="col-span-2">
                  <p className="text-xs text-muted-foreground">Mag Field</p>
                  <p className="text-sm font-medium" data-testid="text-mag-field">{displayData.magField.toFixed(3)} nT</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Mag Model</p>
                  <p className="text-xs" data-testid="text-mag-model">{displayData.magModel}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Mag Date</p>
                  <p className="text-xs" data-testid="text-mag-date">{displayData.magDate}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Depth & Time Card */}
          <Card data-testid="card-depth-time">
            <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Depth & Time</CardTitle>
              <TrendingDown className="w-4 h-4 text-primary" />
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <p className="text-xs text-muted-foreground">Depth In</p>
                  <p className="text-sm font-medium" data-testid="text-depth-in">{displayData.depthIn.toLocaleString()} ft</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Depth Out</p>
                  <p className="text-sm font-medium" data-testid="text-depth-out">{displayData.depthOut.toLocaleString()} ft</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Time Out</p>
                  <p className="text-xs" data-testid="text-time-out">{displayData.timeOut || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">BHA #</p>
                  <p className="text-sm font-medium" data-testid="text-bha-num">{displayData.bhaNumber}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Hours Metrics Card */}
          <Card data-testid="card-hours">
            <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Hours Metrics</CardTitle>
              <Activity className="w-4 h-4 text-warning" />
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <p className="text-xs text-muted-foreground">Drilling</p>
                  <p className="text-lg font-bold" data-testid="text-drilling-hrs">{displayData.drillingHrs.toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Circulating</p>
                  <p className="text-lg font-bold" data-testid="text-circ-hrs">{displayData.circHrs.toFixed(2)}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-xs text-muted-foreground">Total Circulating</p>
                  <p className="text-sm font-medium" data-testid="text-total-circ-hrs">{displayData.totalCirculatingHours.toFixed(2)} hrs</p>
                </div>
                <div className="col-span-2">
                  <div className="flex items-center gap-2">
                    <Label htmlFor="edt-hrs" className="text-xs text-muted-foreground">EDT Hrs</Label>
                    <Input
                      id="edt-hrs"
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      value={overrides['edtHrs'] || ''}
                      onChange={(e) => setOverrides({...overrides, edtHrs: e.target.value})}
                      className="h-7 text-sm"
                      data-testid="input-edt-hrs"
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Status Card */}
          <Card data-testid="card-status">
            <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Status</CardTitle>
              <Settings className="w-4 h-4 text-success" />
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Motor Fail</span>
                <Badge variant={displayData.motorFail ? "destructive" : "success"} data-testid="badge-motor-fail">
                  {displayData.motorFail ? (
                    <><XCircle className="w-3 h-3 mr-1" />Failed</>
                  ) : (
                    <><CheckCircle2 className="w-3 h-3 mr-1" />OK</>
                  )}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">MWD Fail</span>
                <Badge variant={displayData.mwdFail ? "destructive" : "success"} data-testid="badge-mwd-fail">
                  {displayData.mwdFail ? (
                    <><XCircle className="w-3 h-3 mr-1" />Failed</>
                  ) : (
                    <><CheckCircle2 className="w-3 h-3 mr-1" />OK</>
                  )}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">LIH</span>
                <Badge variant={displayData.lih ? "info" : "outline"} data-testid="badge-lih">
                  {displayData.lih ? "Yes" : "No"}
                </Badge>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">POOH Reason</p>
                <p className="text-xs" data-testid="text-pooh">{displayData.pooh}</p>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <p className="text-xs text-muted-foreground">Stalls</p>
                  <p className="text-sm font-medium" data-testid="text-stalls">{displayData.stalls}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">NPT</p>
                  <p className="text-sm font-medium" data-testid="text-npt">{displayData.npt}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Personnel Card */}
          <Card data-testid="card-personnel">
            <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Personnel</CardTitle>
              <Users className="w-4 h-4 text-primary" />
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <div className="flex items-center gap-1 mb-1">
                  <p className="text-xs text-muted-foreground">DD Lead</p>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="w-3 h-3 text-muted-foreground cursor-help" data-testid="icon-dd-lead-info" />
                    </TooltipTrigger>
                    <TooltipContent side="right" className="text-xs max-w-xs">
                      <p className="font-semibold mb-2">WellRunInfo</p>
                      <p className="text-xs">Sources:</p>
                      <ul className="text-xs mt-1 space-y-1">
                        <li>• /well/wellInfo/getWellInfo</li>
                        <li>• /well/motorReport (mwdData)</li>
                        <li>• /well/actualWellData (verticalSection)</li>
                        <li>• /well/actualWellData (depthReference)</li>
                      </ul>
                    </TooltipContent>
                  </Tooltip>
                </div>
                <p className="text-sm font-medium" data-testid="text-dd-lead">{displayData.ddLead || "N/A"}</p>
              </div>
              <div>
                <div className="flex items-center gap-1 mb-1">
                  <p className="text-xs text-muted-foreground">MWD Lead</p>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="w-3 h-3 text-muted-foreground cursor-help" data-testid="icon-mwd-lead-info" />
                    </TooltipTrigger>
                    <TooltipContent side="right" className="text-xs max-w-xs">
                      <p className="font-semibold mb-2">WellRunInfo</p>
                      <p className="text-xs">Sources:</p>
                      <ul className="text-xs mt-1 space-y-1">
                        <li>• /well/wellInfo/getWellInfo</li>
                        <li>• /well/motorReport (mwdData)</li>
                        <li>• /well/actualWellData (verticalSection)</li>
                        <li>• /well/actualWellData (depthReference)</li>
                      </ul>
                    </TooltipContent>
                  </Tooltip>
                </div>
                <p className="text-sm font-medium" data-testid="text-mwd-lead">{displayData.mwdLead || "N/A"}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Directional Coordinator</p>
                <p className="text-sm font-medium" data-testid="text-dir-coord">{displayData.directionalCoordinator || "N/A"}</p>
              </div>
              {displayData.mwdCoordinator && (
                <div>
                  <p className="text-xs text-muted-foreground">MWD Coordinator</p>
                  <p className="text-sm font-medium" data-testid="text-mwd-coord">{displayData.mwdCoordinator}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Equipment Serial Numbers Table with Override Inputs */}
        <Card data-testid="card-equipment">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0">
            <CardTitle className="flex items-center gap-2">
              <Wrench className="w-5 h-5 text-primary" />
              Equipment Serial Numbers
            </CardTitle>
            <Hash className="w-5 h-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* UBHO */}
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1 w-28">
                    <Label className="text-sm font-medium">UBHO</Label>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Info className="w-3 h-3 text-muted-foreground cursor-help" data-testid="icon-ubho-info" />
                      </TooltipTrigger>
                      <TooltipContent side="right" className="text-xs max-w-xs">
                        <p className="font-semibold mb-1">SelectedBHA</p>
                        <p className="text-xs mb-2">/well/drillString/getBha</p>
                        <p className="text-xs mb-1">wellName | bhaNum</p>
                        <p className="text-xs">Match Type: MWD/LWD</p>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                  <div className="flex-1 text-sm font-mono" data-testid="text-ubho-sn">{displayData.ubhoSNOverride || displayData.ubhoSN || "N/A"}</div>
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
                  <div className="flex items-center gap-1 w-28">
                    <Label className="text-sm font-medium">Helix</Label>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Info className="w-3 h-3 text-muted-foreground cursor-help" data-testid="icon-helix-info" />
                      </TooltipTrigger>
                      <TooltipContent side="right" className="text-xs max-w-xs">
                        <p className="font-semibold mb-1">SelectedBHA</p>
                        <p className="text-xs mb-2">/well/drillString/getBha</p>
                        <p className="text-xs mb-1">wellName | bhaNum</p>
                        <p className="text-xs">Match Type: MWD/LWD</p>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                  <div className="flex-1 text-sm font-mono" data-testid="text-helix-sn">{displayData.helixSNOverride || displayData.helixSN || "N/A"}</div>
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
                  <div className="flex items-center gap-1 w-28">
                    <Label className="text-sm font-medium">Pulser</Label>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Info className="w-3 h-3 text-muted-foreground cursor-help" data-testid="icon-pulser-info" />
                      </TooltipTrigger>
                      <TooltipContent side="right" className="text-xs max-w-xs">
                        <p className="font-semibold mb-1">SelectedBHA</p>
                        <p className="text-xs mb-2">/well/drillString/getBha</p>
                        <p className="text-xs mb-1">wellName | bhaNum</p>
                        <p className="text-xs">Match Type: MWD/LWD</p>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                  <div className="flex-1 text-sm font-mono" data-testid="text-pulser-sn">{displayData.pulserSNOverride || displayData.pulserSN || "N/A"}</div>
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
                  <div className="flex items-center gap-1 w-28">
                    <Label className="text-sm font-medium">Gamma</Label>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Info className="w-3 h-3 text-muted-foreground cursor-help" data-testid="icon-gamma-info" />
                      </TooltipTrigger>
                      <TooltipContent side="right" className="text-xs max-w-xs">
                        <p className="font-semibold mb-1">SelectedBHA</p>
                        <p className="text-xs mb-2">/well/drillString/getBha</p>
                        <p className="text-xs mb-1">wellName | bhaNum</p>
                        <p className="text-xs">Match Type: MWD/LWD</p>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                  <div className="flex-1 text-sm font-mono" data-testid="text-gamma-sn">{displayData.gammaSNOverride || displayData.gammaSN || "N/A"}</div>
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
                  <div className="flex items-center gap-1 w-28">
                    <Label className="text-sm font-medium">Directional</Label>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Info className="w-3 h-3 text-muted-foreground cursor-help" data-testid="icon-directional-info" />
                      </TooltipTrigger>
                      <TooltipContent side="right" className="text-xs max-w-xs">
                        <p className="font-semibold mb-1">SelectedBHA</p>
                        <p className="text-xs mb-2">/well/drillString/getBha</p>
                        <p className="text-xs mb-1">wellName | bhaNum</p>
                        <p className="text-xs">Match Type: MWD/LWD</p>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                  <div className="flex-1 text-sm font-mono" data-testid="text-dir-sn">{displayData.directionalSNOverride || displayData.directionalSN || "N/A"}</div>
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
                  <div className="flex items-center gap-1 w-28">
                    <Label className="text-sm font-medium">Battery 1</Label>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Info className="w-3 h-3 text-muted-foreground cursor-help" data-testid="icon-battery1-info" />
                      </TooltipTrigger>
                      <TooltipContent side="right" className="text-xs max-w-xs">
                        <p className="font-semibold mb-1">SelectedBHA</p>
                        <p className="text-xs mb-2">/well/drillString/getBha</p>
                        <p className="text-xs mb-1">wellName | bhaNum</p>
                        <p className="text-xs">Match Type: MWD/LWD</p>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                  <div className="flex-1 text-sm font-mono" data-testid="text-battery-sn">{displayData.batterySNOverride || displayData.batterySN || "N/A"}</div>
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
                  <div className="flex items-center gap-1 w-28">
                    <Label className="text-sm font-medium">Battery 2</Label>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Info className="w-3 h-3 text-muted-foreground cursor-help" data-testid="icon-battery2-info" />
                      </TooltipTrigger>
                      <TooltipContent side="right" className="text-xs max-w-xs">
                        <p className="font-semibold mb-1">SelectedBHA</p>
                        <p className="text-xs mb-2">/well/drillString/getBha</p>
                        <p className="text-xs mb-1">wellName | bhaNum</p>
                        <p className="text-xs">Match Type: MWD/LWD</p>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                  <div className="flex-1 text-sm font-mono" data-testid="text-battery2-sn">{displayData.batterySN2Override || displayData.batterySN2 || "N/A"}</div>
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
                  <div className="flex-1 text-sm font-mono" data-testid="text-battery3-sn">{displayData.battery3Override || displayData.battery3 || "N/A"}</div>
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
                  <div className="flex items-center gap-1 w-28">
                    <Label className="text-sm font-medium">Shock Tool</Label>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Info className="w-3 h-3 text-muted-foreground cursor-help" data-testid="icon-shock-info" />
                      </TooltipTrigger>
                      <TooltipContent side="right" className="text-xs max-w-xs">
                        <p className="font-semibold mb-1">SelectedBHA</p>
                        <p className="text-xs mb-2">/well/drillString/getBha</p>
                        <p className="text-xs mb-1">wellName | bhaNum</p>
                        <p className="text-xs">Match Type: MWD/LWD</p>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                  <div className="flex-1 text-sm font-mono" data-testid="text-shock-sn">{displayData.shockToolSNOverride || displayData.shockToolSN || "N/A"}</div>
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
                  <div className="flex-1 text-sm font-mono" data-testid="text-babelfish-sn">{displayData.babelfishSNOverride || displayData.babelfishSN || "N/A"}</div>
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
                  <div className="flex-1 text-sm font-mono" data-testid="text-muleshoe-sn">{displayData.muleShoeOverride || displayData.muleShoe || "N/A"}</div>
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
                <p className="text-sm font-medium" data-testid="text-pw">{displayData.pw}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">SSQ</p>
                <p className="text-sm font-medium" data-testid="text-ssq">{displayData.ssq}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">TFSQ</p>
                <p className="text-sm font-medium" data-testid="text-tfsq">{displayData.tfsq}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">GCF</p>
                <p className="text-sm font-medium" data-testid="text-gcf">{displayData.gcf}</p>
              </div>
              <div>
                <div className="flex items-center gap-1">
                  <p className="text-xs text-muted-foreground">Svy Offset</p>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="w-3 h-3 text-muted-foreground cursor-help" data-testid="icon-svy-offset-info" />
                    </TooltipTrigger>
                    <TooltipContent side="right" className="text-xs max-w-xs">
                      <p className="font-semibold mb-1">SelectedBHA</p>
                      <p className="text-xs mb-2">/well/drillString/getBha</p>
                      <p className="text-xs mb-1">wellName | bhaNum</p>
                      <p className="text-xs">Match Type: MWD/LWD</p>
                    </TooltipContent>
                  </Tooltip>
                </div>
                <p className="text-sm font-medium" data-testid="text-svy-offset">{displayData.svyOffset}</p>
              </div>
              <div>
                <div className="flex items-center gap-1">
                  <p className="text-xs text-muted-foreground">Gam Offset</p>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="w-3 h-3 text-muted-foreground cursor-help" data-testid="icon-gam-offset-info" />
                    </TooltipTrigger>
                    <TooltipContent side="right" className="text-xs max-w-xs">
                      <p className="font-semibold mb-1">SelectedBHA</p>
                      <p className="text-xs mb-2">/well/drillString/getBha</p>
                      <p className="text-xs mb-1">wellName | bhaNum</p>
                      <p className="text-xs">Match Type: MWD/LWD</p>
                    </TooltipContent>
                  </Tooltip>
                </div>
                <p className="text-sm font-medium" data-testid="text-gam-offset">{displayData.gamOffset}</p>
              </div>
              <div>
                <div className="flex items-center gap-1">
                  <p className="text-xs text-muted-foreground">Stickup</p>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="w-3 h-3 text-muted-foreground cursor-help" data-testid="icon-stickup-info" />
                    </TooltipTrigger>
                    <TooltipContent side="right" className="text-xs max-w-xs">
                      <p className="font-semibold mb-1">SelectedBHA</p>
                      <p className="text-xs mb-2">/well/drillString/getBha</p>
                      <p className="text-xs mb-1">wellName | bhaNum</p>
                      <p className="text-xs">Match Type: MWD/LWD</p>
                    </TooltipContent>
                  </Tooltip>
                </div>
                <p className="text-sm font-medium" data-testid="text-stickup">{displayData.stickup}</p>
              </div>
              <div>
                <div className="flex items-center gap-1">
                  <p className="text-xs text-muted-foreground">Retrievable</p>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="w-3 h-3 text-muted-foreground cursor-help" data-testid="icon-retrievable-info" />
                    </TooltipTrigger>
                    <TooltipContent side="right" className="text-xs max-w-xs">
                      <p className="font-semibold mb-1">SelectedBHA</p>
                      <p className="text-xs mb-2">/well/drillString/getBha</p>
                      <p className="text-xs mb-1">wellName | bhaNum</p>
                      <p className="text-xs">Match Type: MWD/LWD</p>
                    </TooltipContent>
                  </Tooltip>
                </div>
                <p className="text-sm font-medium" data-testid="text-retrievable">{displayData.retrievable}</p>
              </div>
              <div>
                <div className="flex items-center gap-1">
                  <p className="text-xs text-muted-foreground">Pin To Set Screw</p>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="w-3 h-3 text-muted-foreground cursor-help" data-testid="icon-pin-to-set-info" />
                    </TooltipTrigger>
                    <TooltipContent side="right" className="text-xs max-w-xs">
                      <p className="font-semibold mb-1">SelectedBHA</p>
                      <p className="text-xs mb-2">/well/drillString/getBha</p>
                      <p className="text-xs mb-1">wellName | bhaNum</p>
                      <p className="text-xs">Match Type: MWD/LWD</p>
                    </TooltipContent>
                  </Tooltip>
                </div>
                <p className="text-sm font-medium" data-testid="text-pin-to-set">{displayData.pinToSetScrew}</p>
              </div>
              <div>
                <div className="flex items-center gap-1">
                  <p className="text-xs text-muted-foreground">Probe Order</p>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="w-3 h-3 text-muted-foreground cursor-help" data-testid="icon-probe-order-info" />
                    </TooltipTrigger>
                    <TooltipContent side="right" className="text-xs max-w-xs">
                      <p className="font-semibold mb-1">SelectedBHA</p>
                      <p className="text-xs mb-2">/well/drillString/getBha</p>
                      <p className="text-xs mb-1">wellName | bhaNum</p>
                      <p className="text-xs mb-2">Match Type: MWD/LWD</p>
                      <p className="text-xs text-yellow-300">Status: Not populating - pending</p>
                    </TooltipContent>
                  </Tooltip>
                </div>
                <p className="text-sm font-medium" data-testid="text-probe-order">{displayData.probeOrder}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Pulser Version</p>
                <p className="text-sm font-medium" data-testid="text-pulser-version">{displayData.pulserVersion}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">MWD Min Temp</p>
                <p className="text-sm font-medium" data-testid="text-min-temp">{displayData.mwdMinTemp}°</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">MWD Max Temp</p>
                <p className="text-sm font-medium" data-testid="text-max-temp">{displayData.mwdMaxTemp}°</p>
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
                <p className="text-sm font-medium" data-testid="text-bha-desc">{displayData.bhaDescription}</p>
              </div>
              <div>
                <div className="flex items-center gap-1">
                  <p className="text-xs text-muted-foreground">Itemized BHA</p>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="w-3 h-3 text-muted-foreground cursor-help" data-testid="icon-itemized-bha-info" />
                    </TooltipTrigger>
                    <TooltipContent side="right" className="text-xs max-w-xs">
                      <p className="font-semibold mb-1">SelectedBHA</p>
                      <p className="text-xs mb-2">/well/drillString/getBha</p>
                      <p className="text-xs mb-1">wellName | bhaNum</p>
                      <p className="text-xs mb-2">Always sorted by sequence no</p>
                      <p className="text-xs text-green-300">Confirmed: Yes</p>
                    </TooltipContent>
                  </Tooltip>
                </div>
                <p className="text-sm font-medium" data-testid="text-itemized-bha">{displayData.itemizedBHA}</p>
              </div>
              {displayData.mwdMake && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="flex items-center gap-1">
                      <p className="text-xs text-muted-foreground">MWD Make</p>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Info className="w-3 h-3 text-muted-foreground cursor-help" data-testid="icon-mwd-make-info" />
                        </TooltipTrigger>
                        <TooltipContent side="right" className="text-xs max-w-xs">
                          <p className="font-semibold mb-1">SelectedBHA</p>
                          <p className="text-xs mb-2">/well/drillString/getBha</p>
                          <p className="text-xs mb-1">wellName | bhaNum</p>
                          <p className="text-xs">Match Type: MWD/LWD</p>
                        </TooltipContent>
                      </Tooltip>
                    </div>
                    <p className="text-sm font-medium" data-testid="text-mwd-make">{displayData.mwdMake}</p>
                  </div>
                  <div>
                    <div className="flex items-center gap-1">
                      <p className="text-xs text-muted-foreground">MWD Model</p>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Info className="w-3 h-3 text-muted-foreground cursor-help" data-testid="icon-mwd-model-info" />
                        </TooltipTrigger>
                        <TooltipContent side="right" className="text-xs max-w-xs">
                          <p className="font-semibold mb-1">SelectedBHA</p>
                          <p className="text-xs mb-2">/well/drillString/getBha</p>
                          <p className="text-xs mb-1">wellName | bhaNum</p>
                          <p className="text-xs">Match Type: MWD/LWD</p>
                        </TooltipContent>
                      </Tooltip>
                    </div>
                    <p className="text-sm font-medium" data-testid="text-mwd-model">{displayData.mwdModel}</p>
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
