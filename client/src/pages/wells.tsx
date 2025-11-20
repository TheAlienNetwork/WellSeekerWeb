import { useState } from "react";
import WellListTable, { type Well } from "@/components/WellListTable";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

//todo: remove mock functionality
const mockWells: Well[] = [
  { id: '1', jobNum: 'ddmt-140146', actualWell: 'Limousin 6-3H2', rig: 'Nabors 784', operator: 'Continental Resources', wellStatus: 'EOW Sent' },
  { id: '2', jobNum: 'TEST-55555', actualWell: 'Test Well 5', rig: 'Test Rig 123', operator: 'Test Operator', wellStatus: 'N/A' },
  { id: '3', jobNum: 'TEST-44444', actualWell: 'Test Well 4', rig: 'Test Rig 123', operator: 'Test Operator', wellStatus: 'N/A' },
  { id: '4', jobNum: 'TEST-33333', actualWell: 'Test Well 3', rig: 'Test Rig 123', operator: 'Test Operator', wellStatus: 'N/A' },
  { id: '5', jobNum: 'TEST-22222', actualWell: 'Test Well 2', rig: 'Test Rig 123', operator: 'Test Operator', wellStatus: 'N/A' },
  { id: '6', jobNum: 'TEST-11111', actualWell: 'Test Well', rig: 'Test Rig 123', operator: 'Test Operator', wellStatus: 'N/A' },
  { id: '7', jobNum: 'POCO-Prueba', actualWell: 'Ahora Valles - Wellbore 1', rig: 'MSES', operator: 'Addison Resources', wellStatus: 'N/A' },
  { id: '8', jobNum: 'MSPA-85479', actualWell: 'Circle H 105HC - Wellbore 1', rig: 'Patterson 572', operator: 'Chesapeake Appalachia, L.L.C.', wellStatus: 'EOW Sent' },
  { id: '9', jobNum: 'MSPA-85477', actualWell: 'Circle H 104HC - Wellbore 1', rig: 'Patterson 572', operator: 'Chesapeake Appalachia, L.L.C.', wellStatus: 'EOW Sent' },
  { id: '10', jobNum: 'MSPA-85476', actualWell: 'Circle H 6H - Wellbore 1', rig: 'Patterson 572', operator: 'Chesapeake Appalachia, L.L.C.', wellStatus: 'EOW Sent' },
];

interface WellsPageProps {
  onSelectWell: (well: Well) => void;
}

export default function WellsPage({ onSelectWell }: WellsPageProps) {
  const [selectedWellId, setSelectedWellId] = useState<string>();
  const [wells] = useState<Well[]>(mockWells); //todo: remove mock functionality - fetch from API

  const handleSelectWell = (well: Well) => {
    setSelectedWellId(well.id);
    onSelectWell(well);
  };

  const handleRefresh = () => {
    console.log('Refreshing wells from API...');
    //todo: remove mock functionality - implement API refresh
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Wells</h1>
          <p className="text-sm text-muted-foreground">Select a well to view detailed information</p>
        </div>
        <Button onClick={handleRefresh} variant="outline" data-testid="button-refresh-wells">
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>
      <WellListTable
        wells={wells}
        onSelectWell={handleSelectWell}
        selectedWellId={selectedWellId}
      />
    </div>
  );
}
