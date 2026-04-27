'use client';

import BranchAcronymManager from '../components/BranchAcronymManager';
import StandardType from '../components/StandardType';

export default function GeneralTab({ vehicleTypes, hubs, onRefresh, isReadOnly, translate }) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
      <StandardType
        vehicleTypes={vehicleTypes}
        onRefresh={onRefresh}
        isReadOnly={isReadOnly}
        translate={translate}
      />

      <BranchAcronymManager
        hubs={hubs}
        onRefresh={onRefresh}
        isReadOnly={isReadOnly}
        translate={translate}
      />
    </div>
  );
}
