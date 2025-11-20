import WellDetailsHeader, { type WellDetails } from '../WellDetailsHeader';

const mockDetails: WellDetails = {
  wellName: 'Limousin 6-3H2',
  jobNumber: 'ddmt-140146',
  operator: 'Continental Resources',
  rig: 'Nabors 784',
  latitude: '48.76',
  longitude: '-102.572189',
  depthIn: '8,477',
  depthOut: '8,477',
  totalFootage: '6590',
  magCorrection: '7.580',
  gridConv: '-1.542',
  btotal: '56508.3',
  vs: '267.480',
  dec: '7.58',
  dip: '73.10'
};

export default function WellDetailsHeaderExample() {
  return (
    <div className="p-6">
      <WellDetailsHeader details={mockDetails} />
    </div>
  );
}
