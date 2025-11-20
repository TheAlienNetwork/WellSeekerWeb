
import { Card, CardContent, CardHeader } from "@/components/ui/card";
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
    <div className="space-y-4">
      {/* Header Section with Rig and Well Info */}
      <Card className="bg-pink-50 dark:bg-pink-950/20 border-pink-200 dark:border-pink-900">
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Left Section - Rig Info */}
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <div className="text-4xl font-bold text-pink-600 dark:text-pink-400">
                  {details.rig}
                </div>
              </div>
              <div className="space-y-1">
                <div className="flex gap-2">
                  <span className="font-semibold min-w-[100px]">Job Number:</span>
                  <span className="font-mono">{details.jobNumber}</span>
                </div>
                <div className="flex gap-2">
                  <span className="font-semibold min-w-[100px]">Well Name:</span>
                  <span>{details.wellName}</span>
                </div>
              </div>
            </div>

            {/* Right Section - Mag Correction */}
            <div className="flex flex-col items-end justify-center">
              <div className="text-sm text-muted-foreground mb-1">Mag Correction:</div>
              <div className="text-5xl font-bold text-pink-600 dark:text-pink-400">
                {details.magCorrection}
              </div>
              <div className="grid grid-cols-3 gap-4 mt-3 text-sm">
                <div>
                  <div className="font-semibold">Grid Conv:</div>
                  <div className="font-mono">{details.gridConv}</div>
                </div>
                <div>
                  <div className="font-semibold">BTotal:</div>
                  <div className="font-mono">{details.btotal}</div>
                </div>
                <div>
                  <div className="font-semibold">VS:</div>
                  <div className="font-mono">{details.vs}</div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 mt-2 text-sm">
                <div>
                  <div className="font-semibold">Dec:</div>
                  <div className="font-mono">{details.dec}</div>
                </div>
                <div>
                  <div className="font-semibold">Dip:</div>
                  <div className="font-mono">{details.dip}</div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Well Information Card */}
      <Card>
        <CardHeader>
          <h3 className="text-lg font-semibold">Well Information</h3>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <div className="text-sm font-medium text-muted-foreground mb-1">Operator</div>
              <div className="font-semibold" data-testid="text-operator">{details.operator}</div>
            </div>
            <div>
              <div className="text-sm font-medium text-muted-foreground mb-1">Latitude</div>
              <div className="font-mono" data-testid="text-latitude">{details.latitude}</div>
            </div>
            <div>
              <div className="text-sm font-medium text-muted-foreground mb-1">Longitude</div>
              <div className="font-mono" data-testid="text-longitude">{details.longitude}</div>
            </div>
            <div>
              <div className="text-sm font-medium text-muted-foreground mb-1">Depth In</div>
              <div className="font-mono">{details.depthIn}</div>
            </div>
            <div>
              <div className="text-sm font-medium text-muted-foreground mb-1">Depth Out</div>
              <div className="font-mono">{details.depthOut}</div>
            </div>
            <div>
              <div className="text-sm font-medium text-muted-foreground mb-1">Total Footage</div>
              <div className="font-mono font-semibold text-lg">{details.totalFootage}</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
