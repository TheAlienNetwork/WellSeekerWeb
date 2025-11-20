import { useState } from 'react';
import WellListTable, { type Well } from '../WellListTable';

const mockWells: Well[] = [
  { id: '1', jobNum: 'ddmt-140146', actualWell: 'Limousin 6-3H2', rig: 'Nabors 784', operator: 'Continental Resources', wellStatus: 'EOW Sent' },
  { id: '2', jobNum: 'TEST-55555', actualWell: 'Test Well 5', rig: 'Test Rig 123', operator: 'Test Operator', wellStatus: 'N/A' },
  { id: '3', jobNum: 'POCO-Prueba', actualWell: 'Ahora Valles - Wellbore 1', rig: 'MSES', operator: 'Addison Resources', wellStatus: 'N/A' },
  { id: '4', jobNum: 'MSPA-85479', actualWell: 'Circle H 105HC - Wellbore 1', rig: 'Patterson 572', operator: 'Chesapeake Appalachia, L.L.C.', wellStatus: 'EOW Sent' },
  { id: '5', jobNum: 'MSPA-85474', actualWell: 'Circle H 5HC - Wellbore 1', rig: 'Patterson 572', operator: 'Chesapeake Appalachia, L.L.C.', wellStatus: 'EOW Sent' },
];

export default function WellListTableExample() {
  const [selectedId, setSelectedId] = useState<string>();

  return (
    <div className="p-6">
      <WellListTable
        wells={mockWells}
        onSelectWell={(well) => {
          console.log('Selected well:', well);
          setSelectedId(well.id);
        }}
        selectedWellId={selectedId}
      />
    </div>
  );
}
