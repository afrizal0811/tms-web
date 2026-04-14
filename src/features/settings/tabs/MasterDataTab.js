'use client';

import VehicleMappingManager from '../components/VehicleMappingManager';

export default function MasterDataTab({ vehicleTypes, onRefresh, isReadOnly, translate }) {
  return (
    <div className="w-full h-[60vh] min-h-[400px] max-h-[600px]">
      <VehicleMappingManager
        vehicleTypes={vehicleTypes}
        isReadOnly={isReadOnly}
        translate={translate}
      />
    </div>
  );
}
