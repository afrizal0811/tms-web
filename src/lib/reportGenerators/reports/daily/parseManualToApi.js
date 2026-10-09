import * as XLSX from 'xlsx-js-style';

function parseToNum(val) {
  if (typeof val === 'number') return val;
  if (!val) return 0;
  const str = String(val).replace(/,/g, '');
  const num = parseFloat(str);
  return isNaN(num) ? 0 : num;
}

export async function parseDeliveryToTasks(deliveryBuffers) {
  let allTasks = [];
  for (const fileBuffer of deliveryBuffers) {
    const wbInput = XLSX.read(fileBuffer, { type: 'array' });
    const targetSheetName =
      wbInput.SheetNames.find((s) => s.toLowerCase() === 'main') || wbInput.SheetNames[0];
    const rawRows = XLSX.utils.sheet_to_json(wbInput.Sheets[targetSheetName], { defval: '' });

    const tasks = rawRows.map((row) => {
      const getVal = (keyStr) => {
        const key = Object.keys(row).find((k) => k.toLowerCase().trim() === keyStr.toLowerCase());
        return key ? row[key] : '';
      };

      return {
        _id: getVal('_id'),
        flow: getVal('flow'),
        status: getVal('status'),
        startTime: getVal('startTime'),
        doneTime: getVal('doneTime') || getVal('endTime'),
        eta: getVal('eta'),
        etd: getVal('etd'),
        routePlannedOrder: getVal('routePlannedOrder'),
        isSplitTask: getVal('splitNum') ? 'true' : 'false',
        weightKg: parseToNum(getVal('Weight (Kg)') || getVal('Weight')),
        volumeCbm: parseToNum(getVal('Volume (CBM)') || getVal('Volume')),
        distance: parseToNum(getVal('distance')) / 1000, // Convert to KM for tasks!
        page1DoneTime: getVal('page1DoneTime'),
        page3DoneTime: getVal('page3DoneTime') || getVal('page1DoneTime'),
        openTime: getVal('Open Time'),
        closeTime: getVal('Close Time'),
        visitTime: getVal('Visit Time'),
        klikJikaSudahSampai:
          getVal('Klik Jika Sudah Sampai') ||
          getVal('Klik Jika Anda Sudah Sampai') ||
          getVal('Klik Jika Anda Sudah Sampai di Gudang'),
        customerName: getVal('Customer Name'),
        customerOrder: getVal('Order ID') || getVal('Customer Order'),
        title: getVal('title'),
        doneCoordinate: getVal('doneCoordinate'),
        expectedCoordinate: getVal('expectedCoordinate'),
        typeStorage:
          getVal('Type Storage (typeStorage)') ||
          getVal('Type Storage') ||
          getVal('Type Storage_1'),
        alasan: getVal('Alasan') || getVal('Alasan Tidak Tercapai') || getVal('Alasan Batal'),
        driverName:
          getVal('driverName') ||
          getVal('Driver Name') ||
          getVal('Driver') ||
          getVal('Nama Driver'),
        assignee: getVal('assignee'),
        assignedTo: { email: getVal('assignedTo') },
        vehicleName:
          getVal('assignedVehicleName') ||
          getVal('assignedVehicle') ||
          getVal('Vehicle') ||
          getVal('vehicleName'),
        statusDelivery: getVal('Status Delivery'),
        statusGr: getVal('Status GR') ? [getVal('Status GR')] : [],
        content: getVal('content') || getVal('Order ID'),
        createdTime: getVal('createdTime'),
        basePlat:
          getVal('assignedVehicleName') ||
          getVal('assignedVehicle') ||
          getVal('Vehicle') ||
          getVal('vehicleName'),
        plat:
          getVal('assignedVehicleName') ||
          getVal('assignedVehicle') ||
          getVal('Plat') ||
          getVal('No Polisi'),
      };
    });
    allTasks = allTasks.concat(tasks);
  }
  return allTasks;
}

export async function parseRoutingToResults(routingBuffers, targetRoutingStr, allTasks) {
  let allResults = [];

  const mockApiResult = {
    _id: 'manual-' + Date.now(),
    createdTime: targetRoutingStr
      ? new Date(targetRoutingStr).toISOString()
      : new Date().toISOString(),
    dispatchStatus: 'done',
    name: 'Manual Routing',
    result: {
      routing: [],
      dropped: [],
    },
  };

  for (const fileBuffer of routingBuffers) {
    const wbInput = XLSX.read(fileBuffer, { type: 'array' });
    const summarySheetName = wbInput.SheetNames.find(
      (s) => s.toLowerCase().includes('summary') || s.toLowerCase().includes('ringkasan')
    );
    if (!summarySheetName) continue;

    const rawData = XLSX.utils.sheet_to_json(wbInput.Sheets[summarySheetName], { header: 1 });
    let headerRowIdx = -1;
    for (let i = 0; i < rawData.length; i++) {
      if (
        Array.isArray(rawData[i]) &&
        rawData[i].some(
          (c) =>
            typeof c === 'string' &&
            (c.toLowerCase().includes('vehicle id') || c.toLowerCase().includes('vehicle name'))
        )
      ) {
        headerRowIdx = i;
        break;
      }
    }
    if (headerRowIdx === -1) continue;

    const headers = rawData[headerRowIdx].map((h) =>
      typeof h === 'string' ? h.toLowerCase().trim() : ''
    );

    for (let i = headerRowIdx + 1; i < rawData.length; i++) {
      const row = rawData[i];
      if (!row || row.length === 0) continue;

      const getVal = (keyStr) => {
        const idx = headers.findIndex((h) => h === keyStr.toLowerCase());
        return idx !== -1 ? row[idx] : '';
      };

      const vehicleId = getVal('vehicle id');
      if (!vehicleId) continue;

      const vehicleName = getVal('vehicle name') || '';
      const assigneeStr = getVal('assignee') || '';

      const tasksForVehicle = (allTasks || []).filter(
        (t) =>
          (t.vehicleName && t.vehicleName === vehicleName) ||
          (t.basePlat && t.basePlat === vehicleName) ||
          (t.assignee && t.assignee === assigneeStr)
      );

      mockApiResult.result.routing.push({
        assignedVehicleName: vehicleName,
        assignee: assigneeStr,
        firstCreatedTime: null,
        lastAssignedTime: null,
        startTime: getVal('start time'),
        finishTime: getVal('end time') || getVal('finish time'),
        totalDistance: parseToNum(getVal('total distance')),
        totalVisit: parseToNum(getVal('total visit')),
        totalTravelDuration: parseToNum(getVal('total travel duration')),
        totalSpentTime: parseToNum(getVal('total spent time (min)')),
        totalWait: parseToNum(getVal('total wait')),
        basePlat: vehicleName,
        trips: tasksForVehicle.map((t) => ({
          visitName: t.customerOrder || t.title || t._id,
          isHub: false,
        })),
      });
    }
  }

  if (mockApiResult.result.routing.length > 0) {
    allResults.push(mockApiResult);
  }

  return allResults;
}
