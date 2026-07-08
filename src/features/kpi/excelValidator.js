import * as XLSX from 'xlsx-js-style';

export async function validateRoutingFile(file) {
  try {
    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: 'array' });

    const firstSheetName = workbook.SheetNames[0];
    const isSheetNameMatch = firstSheetName === 'Summary';

    const worksheet = workbook.Sheets[firstSheetName];
    const getCellVal = (cellRef) => {
      const cell = worksheet ? worksheet[cellRef] : null;
      return cell ? String(cell.v).trim() : '';
    };

    const expectedHeaders = [
      'Vehicle Optimized',
      'Total Vehicle',
      'Vehicle Percentage',
      'Visit Optimized',
      'Total Visit',
      'Visit Percentage',
      'Total Distance (m)',
      'Average Speed (Km/h)',
    ];

    const cellRefs = ['A1', 'B1', 'C1', 'D1', 'E1', 'F1', 'G1', 'H1'];

    let isCellsMatch = true;
    for (let i = 0; i < expectedHeaders.length; i++) {
      if (getCellVal(cellRefs[i]) !== expectedHeaders[i]) {
        isCellsMatch = false;
        break;
      }
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

    // Cari baris header yang mengandung assignedTo dan status delivery
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

    // Syarat wajib kolom-kolom Task baru (Sudah dibersihkan dari spasi/karakter aneh)
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
