import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { 
  FileSpreadsheet, 
  Download,
  Battery,
  Zap,
  Activity,
  RadioTower,
  Shield
} from "lucide-react";
import { api } from "@/lib/api";
import type { BHARun } from "@shared/schema";
import * as XLSX from "xlsx";

export default function ReportsPage() {
  const { toast } = useToast();
  const [selectedWellId, setSelectedWellId] = useState<string>("");
  const [selectedRunId, setSelectedRunId] = useState<string>("");

  // Fetch wells list
  const { data: wells } = useQuery<any[]>({
    queryKey: ["/api/wells"],
  });

  // Fetch BHA runs for selected well
  const { data: bhaRuns } = useQuery<BHARun[]>({
    queryKey: ["/api/bha-runs", selectedWellId],
    enabled: !!selectedWellId,
  });

  // Generate Excel file for a component
  const generateExcel = async (componentType: string) => {
    if (!selectedWellId || !selectedRunId) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Please select a well and run first",
      });
      return;
    }

    try {
      // Fetch component report data
      const response = await fetch(
        `/api/reports/component/${componentType}?wellId=${selectedWellId}&runId=${selectedRunId}`,
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
                <Select value={selectedWellId} onValueChange={setSelectedWellId}>
                  <SelectTrigger id="well-select" data-testid="select-well">
                    <SelectValue placeholder="Select well" />
                  </SelectTrigger>
                  <SelectContent>
                    {wells?.map((well: any) => (
                      <SelectItem key={well.id} value={well.id} data-testid={`option-well-${well.id}`}>
                        {well.well} - {well.operator}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="run-select">Run #</Label>
                <Select 
                  value={selectedRunId} 
                  onValueChange={setSelectedRunId}
                  disabled={!selectedWellId}
                >
                  <SelectTrigger id="run-select" data-testid="select-run">
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
                return (
                  <Button
                    key={component.type}
                    onClick={() => generateExcel(component.type)}
                    variant="outline"
                    className="h-auto py-4 flex flex-col items-center gap-2"
                    disabled={!selectedWellId || !selectedRunId}
                    data-testid={`button-export-${component.type}`}
                  >
                    <Icon className="w-6 h-6" />
                    <span className="text-sm">{component.name}</span>
                    <Download className="w-3 h-3 text-muted-foreground" />
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
