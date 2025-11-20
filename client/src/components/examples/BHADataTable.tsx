import { useState } from 'react';
import BHADataTable, { type BHAComponent } from '../BHADataTable';

const mockComponents: BHAComponent[] = [
  { num: 1, bha: 0, description: '8 3/4 Security FXGSD', nm: 'N', id: '0.00', od: '8.75', length: '1.00', toBit: '1.00' },
  { num: 2, bha: 0, description: '6 3/4 7/8 5 7stg fxd @ 1.83°', nm: 'N', id: '0.00', od: '7.00', length: '25.40', toBit: '27.40' },
  { num: 3, bha: 0, description: 'UBHO', nm: 'Y', id: '3.13', od: '6.38', length: '3.47', toBit: '30.87' },
  { num: 4, bha: 0, description: 'NMDC', nm: 'Y', id: '2.88', od: '6.00', length: '29.46', toBit: '60.33' },
  { num: 5, bha: 0, description: 'NMDC', nm: 'Y', id: '2.81', od: '5.88', length: '28.53', toBit: '88.86' },
  { num: 6, bha: 0, description: 'X/O', nm: 'N', id: '2.88', od: '6.50', length: '3.26', toBit: '92.12' },
  { num: 7, bha: 0, description: '±5 HWDP', nm: 'N', id: '2.50', od: '6.50', length: '1375.24', toBit: '1467.36' },
];

export default function BHADataTableExample() {
  const [selectedBHA, setSelectedBHA] = useState(1);

  return (
    <div className="p-6">
      <BHADataTable
        components={mockComponents}
        selectedBHA={selectedBHA}
        availableBHAs={[1, 2, 3, 4]}
        onSelectBHA={(bha) => {
          console.log('Selected BHA:', bha);
          setSelectedBHA(bha);
        }}
      />
    </div>
  );
}
