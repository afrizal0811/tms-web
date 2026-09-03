'use client';

import BranchManager from '../components/BranchManager';
import ReasonManager from '../components/ReasonManager';
import StandardTypeManager from '../components/StandardTypeManager';
import VehicleMappingManager from '../components/VehicleMappingManager';

export default function GeneralTab({
  vehicleTypes,
  hubs,
  reasons,
  onRefresh,
  isReadOnly,
  translate,
}) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6 lg:gap-8 items-start">
      <BranchManager
        hubs={hubs}
        onRefresh={onRefresh}
        isReadOnly={isReadOnly}
        translate={translate}
      />
      <StandardTypeManager
        vehicleTypes={vehicleTypes}
        onRefresh={onRefresh}
        isReadOnly={isReadOnly}
        translate={translate}
      />
      <VehicleMappingManager
        vehicleTypes={vehicleTypes}
        isReadOnly={isReadOnly}
        translate={translate}
      />
      <ReasonManager
        reasons={reasons}
        onRefresh={onRefresh}
        isReadOnly={isReadOnly}
        translate={translate}
      />
    </div>
  );
}
