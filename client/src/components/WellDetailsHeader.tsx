import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export interface WellDetails {
  wellName: string;
  jobNumber: string;
  operator: string;
  rig: string;
  latitude: string;
  longitude: string;
  depthIn: string;
  depthOut: string;
  totalFootage: string;
  magCorrection: string;
  gridConv: string;
  btotal: string;
  vs: string;
  dec: string;
  dip: string;
}

interface WellDetailsHeaderProps {
  details: WellDetails;
}

export default function WellDetailsHeader({ details }: WellDetailsHeaderProps) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div>
            <h3 className="text-sm font-medium text-muted-foreground mb-1">Well Name</h3>
            <p className="text-base font-semibold" data-testid="text-well-name">{details.wellName}</p>
          </div>
          <div>
            <h3 className="text-sm font-medium text-muted-foreground mb-1">Job Number</h3>
            <p className="text-base font-mono" data-testid="text-job-number">{details.jobNumber}</p>
          </div>
          <div>
            <h3 className="text-sm font-medium text-muted-foreground mb-1">Operator</h3>
            <p className="text-base" data-testid="text-operator">{details.operator}</p>
          </div>
          <div>
            <h3 className="text-sm font-medium text-muted-foreground mb-1">Rig</h3>
            <p className="text-base" data-testid="text-rig">{details.rig}</p>
          </div>
          <div>
            <h3 className="text-sm font-medium text-muted-foreground mb-1">Latitude</h3>
            <p className="text-base font-mono" data-testid="text-latitude">{details.latitude}</p>
          </div>
          <div>
            <h3 className="text-sm font-medium text-muted-foreground mb-1">Longitude</h3>
            <p className="text-base font-mono" data-testid="text-longitude">{details.longitude}</p>
          </div>
          <div>
            <h3 className="text-sm font-medium text-muted-foreground mb-1">Depth In</h3>
            <p className="text-base font-mono" data-testid="text-depth-in">{details.depthIn}</p>
          </div>
          <div>
            <h3 className="text-sm font-medium text-muted-foreground mb-1">Depth Out</h3>
            <p className="text-base font-mono" data-testid="text-depth-out">{details.depthOut}</p>
          </div>
          <div>
            <h3 className="text-sm font-medium text-muted-foreground mb-1">Total Footage</h3>
            <p className="text-base font-mono" data-testid="text-total-footage">{details.totalFootage}</p>
          </div>
          <div>
            <h3 className="text-sm font-medium text-muted-foreground mb-1">Mag Correction</h3>
            <p className="text-base font-mono" data-testid="text-mag-correction">{details.magCorrection}</p>
          </div>
          <div>
            <h3 className="text-sm font-medium text-muted-foreground mb-1">Grid Conv</h3>
            <p className="text-base font-mono" data-testid="text-grid-conv">{details.gridConv}</p>
          </div>
          <div>
            <h3 className="text-sm font-medium text-muted-foreground mb-1">Btotal</h3>
            <p className="text-base font-mono" data-testid="text-btotal">{details.btotal}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
