import DrillingParametersPanel, { type DrillingParameters } from '../DrillingParametersPanel';

const mockParameters: DrillingParameters = {
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

export default function DrillingParametersPanelExample() {
  return (
    <div className="p-6">
      <DrillingParametersPanel parameters={mockParameters} />
    </div>
  );
}
