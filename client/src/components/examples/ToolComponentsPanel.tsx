import ToolComponentsPanel, { type ToolComponent } from '../ToolComponentsPanel';

const mockComponents: ToolComponent[] = [
  { name: 'UBHO', sn: '65207', snOverride: '', lih: 'Depth In: 1,887', failure: 'None', npt: '0.00' },
  { name: 'MuleShoe', sn: 'NA', snOverride: '', lih: 'Depth Out: 8,477', failure: 'None', npt: '0.00' },
  { name: 'Helix', sn: '0', snOverride: '', lih: 'Total: 6,590', failure: 'None', npt: '0.00' },
  { name: 'Pulser', sn: '0', snOverride: '', lih: '(Circ Hrs: 2.83)', failure: 'None', npt: '0.00' },
  { name: 'Gamma', sn: '0', snOverride: '', lih: 'Drill Hrs: 72.42', failure: 'None', npt: '0.00' },
  { name: 'SEA', sn: '0', snOverride: '', lih: 'Total: 22.00', failure: 'None', npt: '0.00' },
  { name: 'Battery', sn: '0', snOverride: '', lih: '', failure: 'None', npt: '0.00' },
  { name: 'Babelfish', sn: '0', snOverride: '', lih: '', failure: 'None', npt: '0.00' },
  { name: 'Probe Config', sn: 'HPBYB', snOverride: '', lih: 'RSS Good Comms %', failure: 'None', npt: '0.00' },
];

export default function ToolComponentsPanelExample() {
  return (
    <div className="p-6">
      <ToolComponentsPanel components={mockComponents} />
    </div>
  );
}
