export const STYLES = {
  header: { font: { bold: true }, alignment: { horizontal: 'center', vertical: 'center' } },
  center: { alignment: { horizontal: 'center', vertical: 'center' } },
  left: { alignment: { horizontal: 'left', vertical: 'center' } },
  wrap: { alignment: { wrapText: true, vertical: 'center', horizontal: 'left' } },
  greenHeader: {
    font: { bold: true },
    alignment: { horizontal: 'center', vertical: 'center' },
    fill: { patternType: 'solid', fgColor: { rgb: '84fa92' } },
  },
  separator: {
    alignment: { horizontal: 'center', vertical: 'center' },
    fill: { patternType: 'solid', fgColor: { rgb: 'FA9D9D' } },
  },
  hubRed: {
    font: { bold: true, color: { rgb: 'FF0000' } },
    alignment: { horizontal: 'center', vertical: 'center' },
  },
  blueFill: { fill: { patternType: 'solid', fgColor: { rgb: '4f76c7' } } },
  magentaFill: { fill: { patternType: 'solid', fgColor: { rgb: 'c85d86' } } },
  indigoFill: { fill: { patternType: 'solid', fgColor: { rgb: '5c5fb2' } } },
  orangeFill: { fill: { patternType: 'solid', fgColor: { rgb: 'ff8904' } } },
  redFill: { fill: { patternType: 'solid', fgColor: { rgb: 'F6C5C0' } } },
  orangeBorder: {
    border: {
      top: { style: 'thick', color: { rgb: 'FF8904' } },
      bottom: { style: 'thick', color: { rgb: 'FF8904' } },
      left: { style: 'thick', color: { rgb: 'FF8904' } },
      right: { style: 'thick', color: { rgb: 'FF8904' } },
    },
  },
};

export const getRawPlate = (i) =>
  i.plat ||
  i.vehicleName ||
  i.vehiclePlat ||
  i.licenseNumber ||
  i.licensePlate ||
  i.vehicleId ||
  i.vehicle_name ||
  i.vehicle_plate ||
  i.plate_number ||
  i.plat_nomor ||
  (typeof i.vehicle === 'string' ? i.vehicle : '') ||
  i.assignedVehicle?.name ||
  i.assignedVehicle?.plat ||
  i.nopol ||
  '';

export const isValidValue = (val) => val && val !== '-' && val !== 'N/A';
export const getCleanString = (val) => (isValidValue(val) ? val.trim() : '');
