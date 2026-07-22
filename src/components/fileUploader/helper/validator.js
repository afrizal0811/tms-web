import * as XLSX from 'xlsx-js-style';

export async function validateRoutingFile(file) {
  try {
    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: 'array' });

    const isSheetNameMatch = workbook.SheetNames.some(
      (name) => name.toLowerCase().includes('summary') || name.toLowerCase().includes('ringkasan')
    );

    const firstSheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[firstSheetName];
    const rows = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });

    let headerRowClean = [];
    let isCellsMatch = false;

    for (let i = 0; i < Math.min(15, rows.length); i++) {
      const rowStr = rows[i]
        .join('')
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '');

      if (rowStr.includes('vehicleoptimized') && rowStr.includes('totalvehicle')) {
        headerRowClean = rows[i].map((h) =>
          String(h || '')
            .trim()
            .toLowerCase()
            .replace(/[^a-z0-9]/g, '')
        );
        break;
      }
    }

    if (headerRowClean.length > 0) {
      const requiredHeaders = [
        'vehicleoptimized',
        'totalvehicle',
        'vehiclepercentage',
        'visitoptimized',
        'totalvisit',
        'visitpercentage',
        'totaldistancem',
        'averagespeedkmh',
      ];
      isCellsMatch = requiredHeaders.every((req) => headerRowClean.includes(req));
    }

    return isSheetNameMatch || isCellsMatch;
  } catch (error) {
    return false;
  }
}

export async function validateTaskFile(file) {
  try {
    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: 'array' });
    const worksheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });

    let headerRowClean = [];
    let headerFound = false;

    for (let i = 0; i < Math.min(15, rows.length); i++) {
      const rowStr = rows[i]
        .join('')
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '');
      if (rowStr.includes('assignedto') && rowStr.includes('statusdelivery')) {
        headerRowClean = rows[i].map((h) =>
          String(h || '')
            .trim()
            .toLowerCase()
            .replace(/[^a-z0-9]/g, '')
        );
        headerFound = true;
        break;
      }
    }

    if (!headerFound) return false;

    const requiredHeaders = [
      'flow',
      'starttime',
      'assignedto',
      'assignedvehicle',
      'statusgr',
      'alasan',
      'customerorder',
      'typestorage',
      'statusdelivery',
      'gpssesuai',
    ];

    const isMatch = requiredHeaders.every((req) => headerRowClean.includes(req));
    return isMatch;
  } catch (error) {
    return false;
  }
}
