import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import WellDetailsHeader, { type WellDetails } from "@/components/WellDetailsHeader";
import BHADataTable, { type BHAComponent } from "@/components/BHADataTable";
import DrillingParametersPanel, { type DrillingParameters } from "@/components/DrillingParametersPanel";
import ToolComponentsPanel, { type ToolComponent } from "@/components/ToolComponentsPanel";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

//todo: remove mock functionality
const mockWellDetails: WellDetails = {
  wellName: 'Limousin 6-3H2',
  jobNumber: 'ddmt-140146',
  operator: 'Continental Resources',
  rig: 'Nabors 784',
  latitude: '48.76',
  longitude: '-102.572189',
  depthIn: '8,477',
  depthOut: '8,477',
  totalFootage: '6,590',
  magCorrection: '7.580',
  gridConv: '-1.542',
  btotal: '56508.3',
  vs: '267.480',
  dec: '7.58',
  dip: '73.10'
};

const mockBHAComponents: BHAComponent[] = [
  { num: 1, bha: 0, description: '8 3/4 Security FXGSD', nm: 'N', id: '0.00', od: '8.75', length: '1.00', toBit: '1.00' },
  { num: 2, bha: 0, description: '6 3/4 7/8 5 7stg fxd @ 1.83°', nm: 'N', id: '0.00', od: '7.00', length: '25.40', toBit: '27.40' },
  { num: 3, bha: 0, description: 'UBHO', nm: 'Y', id: '3.13', od: '6.38', length: '3.47', toBit: '30.87' },
  { num: 4, bha: 0, description: 'NMDC', nm: 'Y', id: '2.88', od: '6.00', length: '29.46', toBit: '60.33' },
  { num: 5, bha: 0, description: 'NMDC', nm: 'Y', id: '2.81', od: '5.88', length: '28.53', toBit: '88.86' },
  { num: 6, bha: 0, description: 'X/O', nm: 'N', id: '2.88', od: '6.50', length: '3.26', toBit: '92.12' },
  { num: 7, bha: 0, description: '±5 HWDP', nm: 'N', id: '2.50', od: '6.50', length: '1375.24', toBit: '1467.36' },
];

const mockDrillingParameters: DrillingParameters = {
  plugIn: '1/0/00 0:00',
  timeIn: '1/0/00 0:00',
  timeOut: '3/30/14 17:45',
  unplug: '1/0/00 0:00',
  depthIn: '8,477',
  depthOut: '8,477',
  totalFootage: '6,590',
  drillHours: '75.25',
  operHours: '100149.75',
  circHrs: '0.00',
  pluggedHrs: '0.00',
  bha: 1,
  mwd: 0,
  retrievable: 0,
  reasonPOOH: 'Change BHA'
};

const mockToolComponents: ToolComponent[] = [
  { name: 'UBHO', sn: '65207', snOverride: '', lih: 'Depth In: 1,887', failure: 'None', npt: '0.00' },
  { name: 'MuleShoe', sn: 'NA', snOverride: '', lih: 'Depth Out: 8,477', failure: 'None', npt: '0.00' },
  { name: 'Helix', sn: '0', snOverride: '', lih: 'Total: 6,590', failure: 'None', npt: '0.00' },
  { name: 'Pulser', sn: '0', snOverride: '', lih: '(Circ Hrs: 2.83)', failure: 'None', npt: '0.00' },
  { name: 'Gamma', sn: '0', snOverride: '', lih: 'Drill Hrs: 72.42', failure: 'None', npt: '0.00' },
  { name: 'SEA', sn: '0', snOverride: '', lih: 'Total: 22.00', failure: 'None', npt: '0.00' },
  { name: 'Battery', sn: '0', snOverride: '', lih: '', failure: 'None', npt: '0.00' },
];

export default function WellDetailsPage() {
  const [selectedBHA, setSelectedBHA] = useState(1);

  const handleRefresh = () => {
    console.log('Refreshing well data from API...');
    //todo: remove mock functionality - implement API refresh
  };

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

      <WellDetailsHeader details={mockWellDetails} />

      <Tabs defaultValue="bha" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="bha" data-testid="tab-bha">BHA Components</TabsTrigger>
          <TabsTrigger value="drilling" data-testid="tab-drilling">Drilling Parameters</TabsTrigger>
          <TabsTrigger value="tools" data-testid="tab-tools">Tool Components</TabsTrigger>
        </TabsList>
        <TabsContent value="bha" className="space-y-4">
          <BHADataTable
            components={mockBHAComponents}
            selectedBHA={selectedBHA}
            availableBHAs={[1, 2, 3, 4]}
            onSelectBHA={setSelectedBHA}
          />
        </TabsContent>
        <TabsContent value="drilling" className="space-y-4">
          <DrillingParametersPanel parameters={mockDrillingParameters} />
        </TabsContent>
        <TabsContent value="tools" className="space-y-4">
          <ToolComponentsPanel components={mockToolComponents} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
