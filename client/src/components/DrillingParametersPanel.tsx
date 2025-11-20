import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export interface DrillingParameters {
  plugIn: string;
  timeIn: string;
  timeOut: string;
  unplug: string;
  depthIn: string;
  depthOut: string;
  totalFootage: string;
  drillHours: string;
  operHours: string;
  circHrs: string;
  pluggedHrs: string;
  bha: number;
  mwd: number;
  retrievable: number;
  reasonPOOH: string;
}

interface DrillingParametersPanelProps {
  parameters: DrillingParameters;
}

export default function DrillingParametersPanel({ parameters }: DrillingParametersPanelProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium text-muted-foreground">Plug In</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-2xl font-mono" data-testid="text-plug-in">{parameters.plugIn}</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium text-muted-foreground">Time In</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-2xl font-mono" data-testid="text-time-in">{parameters.timeIn}</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium text-muted-foreground">Time Out</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-2xl font-mono" data-testid="text-time-out">{parameters.timeOut}</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium text-muted-foreground">Unplug</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-2xl font-mono" data-testid="text-unplug">{parameters.unplug}</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium text-muted-foreground">Depth In</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-2xl font-mono" data-testid="text-depth-in">{parameters.depthIn}</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium text-muted-foreground">Depth Out</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-2xl font-mono" data-testid="text-depth-out">{parameters.depthOut}</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium text-muted-foreground">Total Footage</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-2xl font-mono" data-testid="text-total-footage">{parameters.totalFootage}</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium text-muted-foreground">Drill + Cir Hrs</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-2xl font-mono" data-testid="text-drill-hours">{parameters.drillHours}</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium text-muted-foreground">Circ Hrs</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-2xl font-mono" data-testid="text-circ-hrs">{parameters.circHrs}</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium text-muted-foreground">Plugged Hrs</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-2xl font-mono" data-testid="text-plugged-hrs">{parameters.pluggedHrs}</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium text-muted-foreground">Reason POOH</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-base" data-testid="text-reason-pooh">{parameters.reasonPOOH}</p>
        </CardContent>
      </Card>
    </div>
  );
}
