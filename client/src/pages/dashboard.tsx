import { useQuery } from "@tanstack/react-query";
import type { WellDashboardData } from "@shared/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
  Layers
} from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default function Dashboard() {
  const { data: wellData, isLoading, error } = useQuery<WellDashboardData>({
    queryKey: ["/api/dashboard/well-data"],
  });

  if (isLoading) {
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

        {/* Equipment Serial Numbers Table */}
        <Card data-testid="card-equipment">
          <CardHeader>
            <CardTitle>Equipment Serial Numbers</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Component</TableHead>
                  <TableHead>Serial Number</TableHead>
                  <TableHead>Component</TableHead>
                  <TableHead>Serial Number</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow>
                  <TableCell className="font-medium">UBHO</TableCell>
                  <TableCell data-testid="text-ubho-sn">{wellData.ubhoSN || "N/A"}</TableCell>
                  <TableCell className="font-medium">Helix</TableCell>
                  <TableCell data-testid="text-helix-sn">{wellData.helixSN || "N/A"}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium">Pulser</TableCell>
                  <TableCell data-testid="text-pulser-sn">{wellData.pulserSN || "N/A"}</TableCell>
                  <TableCell className="font-medium">Gamma</TableCell>
                  <TableCell data-testid="text-gamma-sn">{wellData.gammaSN || "N/A"}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium">Directional</TableCell>
                  <TableCell data-testid="text-dir-sn">{wellData.directionalSN || "N/A"}</TableCell>
                  <TableCell className="font-medium">Battery</TableCell>
                  <TableCell data-testid="text-battery-sn">{wellData.batterySN || "N/A"}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium">Battery 2</TableCell>
                  <TableCell data-testid="text-battery2-sn">{wellData.batterySN2 || "N/A"}</TableCell>
                  <TableCell className="font-medium">Battery 3</TableCell>
                  <TableCell data-testid="text-battery3-sn">{wellData.battery3 || "N/A"}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium">Shock Tool</TableCell>
                  <TableCell data-testid="text-shock-sn">{wellData.shockToolSN || "N/A"}</TableCell>
                  <TableCell className="font-medium">Babelfish</TableCell>
                  <TableCell data-testid="text-babelfish-sn">{wellData.babelfishSN || "N/A"}</TableCell>
                </TableRow>
              </TableBody>
            </Table>
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
