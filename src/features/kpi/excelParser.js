import * as XLSX from 'xlsx-js-style';

function parseToNumber(val) {
  if (val === undefined || val === null || val === '') return 0;
  if (typeof val === 'number') return val;
  const str = String(val)
    .replace(/,/g, '')
    .replace(/[^0-9.-]/g, '')
    .trim();
  const num = parseFloat(str);
  return isNaN(num) ? 0 : num;
}

function formatExcelDate(val) {
  if (typeof val === 'number') {
    const date = new Date((val - (25567 + 2)) * 86400 * 1000);
    if (isNaN(date.getTime())) return String(val);
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    const HH = String(date.getHours()).padStart(2, '0');
    const min = String(date.getMinutes()).padStart(2, '0');
    return `${dd}-${mm}-${yyyy} ${HH}:${min}`;
  }
  return String(val || '').trim();
}

export async function parseRoutingFiles(files) {
  const resultsData = [];

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: 'array' });

    let targetSheetName =
      workbook.SheetNames.find((name) => name.toLowerCase().includes('summary')) ||
      workbook.SheetNames[0];

    const ws = workbook.Sheets[targetSheetName];
    const rows = XLSX.utils.sheet_to_json(ws, { header: 1 });

    let routingName = file.name.replace(/\.[^/.]+$/, '');
    if (routingName.includes('-')) {
      const parts = routingName.split('-');
      routingName = parts.slice(1).join('-').trim();
    }

    let headerRowIdx = -1;
    for (let r = 0; r < Math.min(50, rows.length); r++) {
      const rowStr = (rows[r] || [])
        .join('')
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '');
      if (
        rowStr.includes('vehiclename') &&
        (rowStr.includes('totalvisit') || rowStr.includes('assignee'))
      ) {
        headerRowIdx = r;
        break;
      }
    }

    if (headerRowIdx === -1) continue;

    const headers = rows[headerRowIdx];

    const getColIdxForVehicle = () => {
      return headers.findIndex((h) => {
        if (h === undefined || h === null) return false;
        const cleanH = String(h)
          .toLowerCase()
          .replace(/[^a-z0-9]/g, '');
        return (
          (cleanH.includes('assignedvehicle') || cleanH.includes('vehicle')) &&
          !cleanH.includes('id')
        );
      });
    };

    const getColIdx = (keyword) => {
      const cleanKeyword = keyword.toLowerCase().replace(/[^a-z0-9]/g, '');
      return headers.findIndex((h) => {
        if (h === undefined || h === null) return false;
        const cleanH = String(h)
          .toLowerCase()
          .replace(/[^a-z0-9]/g, '');
        return cleanH.includes(cleanKeyword);
      });
    };

    const colIdx = {
      vehicleName: getColIdx('vehiclename'),
      assignee: getColIdx('assignee'),
      visit: getColIdx('visittime'),
      travel: getColIdx('traveltime'),
      wait: getColIdx('waitingtime'),
      spent: getColIdx('spenttime'),
      totalVisits: getColIdx('totalvisit'),
      totalDistance: getColIdx('totaldistance'),
      totalWeight: getColIdx('totalweight'),
      totalVolume: getColIdx('totalvolume'),
      assignedVehicle: getColIdxForVehicle(),
      maxWeight: Math.max(getColIdx('vehiclemaxweight'), getColIdx('maxweight')),
      maxVolume: Math.max(getColIdx('vehiclemaxvolume'), getColIdx('maxvolume')),
    };

    const routingArray = [];

    for (let r = headerRowIdx + 1; r < rows.length; r++) {
      const rowData = rows[r];

      if (
        !rowData ||
        rowData.length === 0 ||
        colIdx.vehicleName === -1 ||
        !rowData[colIdx.vehicleName]
      )
        continue;

      const vehicleName = String(rowData[colIdx.vehicleName] || '').trim();
      const assignee = colIdx.assignee !== -1 ? String(rowData[colIdx.assignee] || '').trim() : '';

      const visit = colIdx.visit !== -1 ? parseToNumber(rowData[colIdx.visit]) : 0;
      const travel = colIdx.travel !== -1 ? parseToNumber(rowData[colIdx.travel]) : 0;
      const wait = colIdx.wait !== -1 ? parseToNumber(rowData[colIdx.wait]) : 0;
      let spent = colIdx.spent !== -1 ? parseToNumber(rowData[colIdx.spent]) : 0;

      const totalVisits =
        colIdx.totalVisits !== -1 ? parseToNumber(rowData[colIdx.totalVisits]) : 0;
      const totalDistance =
        colIdx.totalDistance !== -1 ? parseToNumber(rowData[colIdx.totalDistance]) : 0;
      const totalWeight =
        colIdx.totalWeight !== -1 ? parseToNumber(rowData[colIdx.totalWeight]) : 0;
      const totalVolume =
        colIdx.totalVolume !== -1 ? parseToNumber(rowData[colIdx.totalVolume]) : 0;

      const maxWeight = colIdx.maxWeight !== -1 ? parseToNumber(rowData[colIdx.maxWeight]) : 0;
      const maxVolume = colIdx.maxVolume !== -1 ? parseToNumber(rowData[colIdx.maxVolume]) : 0;

      if (spent <= 0) {
        spent = visit + travel + wait;
      }

      routingArray.push({
        vehicleName: vehicleName,
        assignee: assignee,
        totalVisitTime: visit,
        totalTravelTime: travel,
        totalWaitingTime: wait,
        totalSpentTime: spent,
        totalVisits: totalVisits,
        totalDistance: totalDistance,
        totalWeight: totalWeight,
        totalVolume: totalVolume,
        maxWeight: maxWeight,
        maxVolume: maxVolume,
        trips: [{ isHub: false, weight: 0, volume: 0, distance: 0 }],
      });
    }

    resultsData.push({
      description: routingName,
      result: {
        routing: routingArray,
      },
    });
  }

  return resultsData;
}

export async function parseTaskFiles(files) {
  const parsedTasks = [];
  const dateFrequency = {};

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: 'array' });
    const ws = workbook.Sheets[workbook.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(ws, { header: 1 });

    let headerRowIdx = -1;
    for (let r = 0; r < Math.min(15, rows.length); r++) {
      const rowStr = (rows[r] || [])
        .join('')
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '');
      if (rowStr.includes('assignedto') && rowStr.includes('statusdelivery')) {
        headerRowIdx = r;
        break;
      }
    }

    if (headerRowIdx === -1) continue;
    const headers = rows[headerRowIdx];

    const getColIdx = (keyword) => {
      const cleanKeyword = keyword.toLowerCase().replace(/[^a-z0-9]/g, '');
      return headers.findIndex((h) => {
        if (h === undefined || h === null) return false;
        const cleanH = String(h)
          .toLowerCase()
          .replace(/[^a-z0-9]/g, '');
        return cleanH.includes(cleanKeyword);
      });
    };

    const colIdx = {
      flow: getColIdx('flow'),
      startTime: getColIdx('starttime'),
      assignedTo: getColIdx('assignedto'),
      assignedVehicle: getColIdx('assignedvehicle'),
      statusGr: getColIdx('statusgr'),
      alasan: getColIdx('alasan'),
      customerOrder: getColIdx('customerorder'),
      typeStorage: getColIdx('typestorage'),
      statusDelivery: getColIdx('statusdelivery'),
      gpsSesuai: getColIdx('gpssesuai'),
    };

    for (let r = headerRowIdx + 1; r < rows.length; r++) {
      const row = rows[r];
      if (!row || row.length === 0 || colIdx.assignedTo === -1 || !row[colIdx.assignedTo]) continue;

      const statDeliv =
        colIdx.statusDelivery !== -1 ? String(row[colIdx.statusDelivery] || '').trim() : '';
      const statGr = colIdx.statusGr !== -1 ? String(row[colIdx.statusGr] || '').trim() : '';
      const startTime = colIdx.startTime !== -1 ? formatExcelDate(row[colIdx.startTime]) : '';
      const gps = colIdx.gpsSesuai !== -1 ? String(row[colIdx.gpsSesuai] || '').trim() : '';

      if (startTime) {
        const parts = startTime.split(' ')[0];
        let isoDate = '';
        if (parts.includes('-')) {
          const splitDash = parts.split('-');
          if (splitDash[0].length === 4) isoDate = parts;
          else if (splitDash[2]?.length === 4)
            isoDate = `${splitDash[2]}-${splitDash[1]}-${splitDash[0]}`;
        } else if (parts.includes('/')) {
          const splitSlash = parts.split('/');
          if (splitSlash[2]?.length === 4)
            isoDate = `${splitSlash[2]}-${splitSlash[1]}-${splitSlash[0]}`;
          else if (splitSlash[0].length === 4) isoDate = parts.replace(/\//g, '-');
        }
        if (isoDate) dateFrequency[isoDate] = (dateFrequency[isoDate] || 0) + 1;
      }

      parsedTasks.push({
        flow: colIdx.flow !== -1 ? String(row[colIdx.flow] || '').trim() : '-',
        startTime: startTime,
        assignedVehicle:
          colIdx.assignedVehicle !== -1 ? String(row[colIdx.assignedVehicle] || '').trim() : '-',
        driverName: String(row[colIdx.assignedTo] || '').trim(),
        typeStorage: colIdx.typeStorage !== -1 ? String(row[colIdx.typeStorage] || '').trim() : '-',
        customerOrder:
          colIdx.customerOrder !== -1 ? String(row[colIdx.customerOrder] || '').trim() : '-',
        statusDelivery: statDeliv,
        statusGr: statGr,
        alasan: colIdx.alasan !== -1 ? String(row[colIdx.alasan] || '').trim() : '-',
        gpsSesuai: [gps],
      });
    }
  }

  let majorityDate = null;
  let maxCount = 0;
  for (const [date, count] of Object.entries(dateFrequency)) {
    if (count > maxCount) {
      maxCount = count;
      majorityDate = date;
    }
  }

  return { tasks: parsedTasks, majorityDate };
}
