// File: src/lib/unifiedRouting.js

// Fungsi 1: Penentuan Tanggal Pengiriman berdasarkan waktu Routing (H-1 & H-2)
export function getDeliveryDateFromRouting(createdTimeStr) {
  if (!createdTimeStr) return null;
  try {
    const d = new Date(createdTimeStr);
    const wibMs = d.getTime() + 7 * 60 * 60 * 1000;
    const wibDate = new Date(wibMs);
    const routingDay = wibDate.getUTCDay(); // 0=Minggu, 1=Senin.. 6=Sabtu

    let offset = 1; // H-1 (Default)
    if (routingDay === 6) offset = 2; // Khusus Sabtu (H-2) -> Kirim Senin

    const deliveryMs = wibMs + offset * 24 * 60 * 60 * 1000;
    const deliveryDate = new Date(deliveryMs);
    const y = deliveryDate.getUTCFullYear();
    const m = String(deliveryDate.getUTCMonth() + 1).padStart(2, '0');
    const da = String(deliveryDate.getUTCDate()).padStart(2, '0');
    return `${y}-${m}-${da}`;
  } catch (e) {
    return null;
  }
}

// Fungsi 2: Otak Utama Algoritma (Pencarian Supir Cepat & Deduplikasi Kendaraan)
export function getUnifiedVehicleMap(resultsData, driverData) {
  const driverMap = new Map();
  if (Array.isArray(driverData)) {
    driverData.forEach((d) => {
      if (d.email) {
        // Pemetaan Instan menggunakan O(1) Hash Map
        driverMap.set(d.email.toLowerCase().trim(), {
          name: d.name,
          storage: (d.storage || 'DRY').toUpperCase(),
          plat: d.plat,
        });
      }
    });
  }

  const dailyVehicles = {}; // Format: { 'YYYY-MM-DD': Map<PlatUnik, DetailKendaraan> }

  if (Array.isArray(resultsData)) {
    resultsData.forEach((res) => {
      if (res.dispatchStatus?.toLowerCase() !== 'done') return;
      if (!res.result?.routing) return;

      const deliveryDate = getDeliveryDateFromRouting(res.createdTime);
      if (!deliveryDate) return;

      if (!dailyVehicles[deliveryDate]) dailyVehicles[deliveryDate] = new Map();

      res.result.routing.forEach((route) => {
        const validTrips = (route.trips || []).filter((t) => !t.isHub);
        if (validTrips.length === 0) return;

        const rawEmail = (route.assignee || route.email || '').toLowerCase().trim();
        const rawPlate = route.vehicleName || route.vehicleId || route.licensePlate || '';
        const canonicalPlate =
          rawPlate.replace(/\s+/g, '').toLowerCase() || `unknown-${Math.random()}`;

        let driverInfo = driverMap.get(rawEmail);
        let storage = 'DRY';
        let driverName = route.assignee || '-';
        let finalPlate = rawPlate || '-';

        // Fallback: Jika email tak ketemu/salah, cari dari plat nomor
        if (!driverInfo && rawPlate) {
          const platMatch = driverData.find(
            (d) => d.plat && d.plat.replace(/\s+/g, '').toLowerCase() === canonicalPlate
          );
          if (platMatch) {
            driverInfo = {
              name: platMatch.name,
              storage: (platMatch.storage || 'DRY').toUpperCase(),
              plat: platMatch.plat,
            };
          }
        }

        if (driverInfo) {
          storage = driverInfo.storage;
          driverName = driverInfo.name;
          finalPlate = driverInfo.plat || rawPlate;
        }

        const type = storage.includes('FROZEN') ? 'Frozen' : 'Dry';

        let distMeter = route.totalDistance || 0;
        if (distMeter === 0) {
          distMeter = validTrips.reduce((acc, t) => acc + (t.distance || 0), 0);
        }

        const firstTag =
          route.vehicleTags && route.vehicleTags.length > 0 ? String(route.vehicleTags[0]) : '';

        // LOGIKA DEDUPLIKASI: Cukup 1x masuk, sisanya diakumulasi
        if (!dailyVehicles[deliveryDate].has(canonicalPlate)) {
          dailyVehicles[deliveryDate].set(canonicalPlate, {
            plate: finalPlate,
            driverName: driverName,
            storageType: type,
            distanceKm: distMeter / 1000,
            visits: validTrips.length,
            firstTag: firstTag,
          });
        } else {
          // Jika truk tersebut jalan untuk ke-2/3 kalinya, gabungkan beban kerjanya
          const existing = dailyVehicles[deliveryDate].get(canonicalPlate);
          existing.distanceKm += distMeter / 1000;
          existing.visits += validTrips.length;
          if (!existing.firstTag && firstTag) existing.firstTag = firstTag;
        }
      });
    });
  }

  return dailyVehicles;
}
