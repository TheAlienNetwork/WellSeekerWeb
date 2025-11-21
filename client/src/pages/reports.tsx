import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useSearch, useLocation } from "wouter";
import type { Well } from "@shared/schema";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  FileSpreadsheet,
  Download,
  Activity,
  Shield,
  RadioTower,
  Zap,
  Battery,
  Loader2,
  AlertCircle,
  CheckCircle2
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { ComponentReportData } from "@shared/schema";
import * as XLSX from "xlsx";

interface ReportsPageProps {
  selectedWell: Well | null;
}

interface BHARun {
  id: string;
  runNumber: number;
  bhaNumber: number;
  mwdNumber: number;
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

export default function ReportsPage({ selectedWell }: ReportsPageProps) {
  const searchParams = new URLSearchParams(useSearch());
  const wellId = searchParams.get("wellId") || selectedWell?.id;
  const runId = searchParams.get("runId") || "run-1";
  const [generatingReport, setGeneratingReport] = useState<string | null>(null);
  const [selectedWellId, setSelectedWellId] = useState<string>(wellId || "");
  const [selectedRunId, setSelectedRunId] = useState<string>(runId || "run-1");
  const [exportedComponents, setExportedComponents] = useState<Set<string>>(new Set());
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  // Reset exported components when run changes
  useEffect(() => {
    setExportedComponents(new Set());
  }, [selectedRunId]);

  if (!wellId) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-lg font-semibold mb-2">No Well Selected</p>
          <p className="text-sm text-muted-foreground mb-4">Please select a well to generate reports</p>
          <Button onClick={() => setLocation("/wells")}>Go to Wells</Button>
        </div>
      </div>
    );
  }

  // Fetch wells list
  const { data: wellsResponse } = useQuery<WellsResponse>({
    queryKey: ["/api/wells"],
  });

  const wells = wellsResponse?.wells || [];

  // Fetch BHA runs for selected well
  const { data: bhaRuns } = useQuery<BHARun[]>({
    queryKey: ["/api/bha-runs", selectedWellId],
    queryFn: async () => {
      if (!selectedWellId || selectedWellId.trim() === "") throw new Error("Invalid well ID");
      const response = await fetch(`/api/bha-runs/${selectedWellId}`, { credentials: "include" });
      if (!response.ok) throw new Error("Failed to fetch BHA runs");
      const data = await response.json();
      return Array.isArray(data) ? data : [];
    },
    enabled: !!selectedWellId && selectedWellId.trim() !== "",
  });

  // Generate Excel file for a component
  const generateExcel = async (componentType: string) => {
    // Validate IDs are non-empty strings
    if (!wellId || wellId.trim() === "" || !runId || runId.trim() === "") {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Please select a well and run first",
      });
      return;
    }

    setGeneratingReport(componentType);

    try {
      // Fetch component report data
      const response = await fetch(
        `/api/component-report/${wellId}/${runId}/${componentType}`,
        { credentials: "include" }
      );

      if (!response.ok) {
        throw new Error("Failed to fetch report data");
      }

      const reportData = await response.json();

      // Create Excel workbook
      const workbook = XLSX.utils.book_new();

      // Define column headers based on the image
      const headers = [
        "DATE OF ACTIVITY",
        "DRIVR #",
        "Project (Job) Num",
        "Run Num",
        "Circulating Hours",
        "EDT",
        "PERSON UPDATING ACTIVITY",
        "COMMENTS"
      ];

      // Create worksheet data with headers and report data
      const worksheetData = [
        headers,
        [
          reportData.dateOfActivity || "",
          reportData.driverId || "",
          reportData.projectNumber || "",
          reportData.runNumber || "",
          reportData.circulatingHours || "",
          reportData.edt || "",
          reportData.personUpdating || "",
          reportData.comments || ""
        ]
      ];

      const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);

      // Auto-size columns
      const columnWidths = headers.map((header, i) => {
        const maxLength = Math.max(
          header.length,
          String(worksheetData[1][i] || "").length
        );
        return { wch: maxLength + 2 };
      });
      worksheet['!cols'] = columnWidths;

      XLSX.utils.book_append_sheet(workbook, worksheet, componentType);

      // Generate filename
      const filename = `${componentType}_Report_${reportData.well}_Run${reportData.runNumber}_${new Date().toISOString().split('T')[0]}.xlsx`;

      // Download the file
      XLSX.writeFile(workbook, filename);

      // Mark this component as exported for this run
      setExportedComponents(prev => new Set([...prev, componentType]));

      toast({
        title: "Success",
        description: `${componentType} report exported successfully`,
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Export failed",
        description: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      setGeneratingReport(null);
    }
  };

  const componentButtons = [
    { name: "UBHO", icon: Activity, type: "ubho" },
    { name: "MuleShoe", icon: Shield, type: "muleshoe" },
    { name: "Helix", icon: RadioTower, type: "helix" },
    { name: "Pulser", icon: Zap, type: "pulser" },
    { name: "Gamma", icon: Activity, type: "gamma" },
    { name: "SEA", icon: Activity, type: "sea" },
    { name: "Battery 1", icon: Battery, type: "battery1" },
    { name: "Battery 2", icon: Battery, type: "battery2" },
    { name: "Battery 3", icon: Battery, type: "battery3" },
    { name: "Shock Tool", icon: Shield, type: "shock" },
    { name: "Babelfish", icon: Activity, type: "babelfish" },
  ];

  // Default empty report data if well data is missing
  const defaultReportData = {
    dateOfActivity: new Date().toLocaleDateString(),
    drivrNumber: "0",
    projectJobNum: "N/A",
    runNum: 0,
    circulatingHours: 0,
    edt: 0,
    personUpdatingActivity: "",
    comments: "No data available",
  };

  return (
    <div className="h-full overflow-auto bg-background">
      <div className="p-6 space-y-6">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold">Component Reports</h1>
          <p className="text-muted-foreground">
            Export component-specific data to Excel spreadsheets
          </p>
        </div>

        {/* Well and Run Selection */}
        <Card>
          <CardHeader>
            <CardTitle>Select Well and Run</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="well-select">Well</Label>
                <Select value={wellId} onValueChange={(value) => {
                  setSelectedWellId(value);
                  setLocation(`/reports?wellId=${value}`);
                }}>
                  <SelectTrigger id="well-select" data-testid="select-well">
                    <SelectValue placeholder="Select well" />
                  </SelectTrigger>
                  <SelectContent>
                    {wells.map((well: Well) => (
                      <SelectItem key={well.id} value={well.id} data-testid={`option-well-${well.id}`}>
                        {well.actualWell} - {well.operator}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="run-select">Run #</Label>
                <Select
                  value={selectedRunId}
                  onValueChange={(value) => {
                    setSelectedRunId(value);
                    setLocation(`/reports?wellId=${wellId}&runId=${value}`);
                  }}
                  disabled={!wellId}
                >
                  <SelectTrigger id="run-select" data-testid="select-run">
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
                      <SelectItem value="no-runs" disabled>
                        No runs available
                      </SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Component Export Buttons */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileSpreadsheet className="w-5 h-5" />
              Export Component Reports
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {componentButtons.map((component) => {
                const Icon = component.icon;
                const isExported = exportedComponents.has(component.type);
                return (
                  <Button
                    key={component.type}
                    onClick={() => generateExcel(component.type)}
                    variant="outline"
                    className={`h-auto py-4 flex flex-col items-center gap-2 transition-colors ${
                      isExported 
                        ? "bg-success/10 border-success text-success hover:bg-success/20" 
                        : ""
                    }`}
                    disabled={!wellId || !runId || generatingReport !== null}
                    data-testid={`button-export-${component.type}`}
                  >
                    {generatingReport === component.type ? (
                      <Loader2 className="w-6 h-6 animate-spin" />
                    ) : isExported ? (
                      <CheckCircle2 className="w-6 h-6" />
                    ) : (
                      <Icon className="w-6 h-6" />
                    )}
                    <span className="text-sm">{component.name}</span>
                    {generatingReport === component.type ? (
                      <span>Exporting...</span>
                    ) : isExported ? (
                      <span className="text-xs">Logged</span>
                    ) : (
                      <Download className="w-3 h-3 text-muted-foreground" />
                    )}
                  </Button>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Instructions */}
        <Card>
          <CardHeader>
            <CardTitle>How to Use</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <ol className="list-decimal list-inside space-y-1">
              <li>Select a well from the dropdown</li>
              <li>Select a Run # for that well</li>
              <li>Click on any component button to export its data to Excel</li>
              <li>The Excel file will download automatically with the component data populated</li>
              <li>Data includes: Date, Driver #, Project/Job #, Run #, Circulating Hours, EDT, Person Updating, and Comments</li>
            </ol>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}