import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { getStorageType, isEmpty, getBasePlate } from '@/lib/utils';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const hubId = searchParams.get('hubId');

    const where = hubId ? { hubs: { some: { id: hubId } } } : {};
    const [rawDrivers, mappingsDB] = await Promise.all([
      prisma.driver.findMany({ where }),
      prisma.vehicleMapping.findMany(),
    ]);

    const mappingsObj = mappingsDB.reduce((acc, curr) => {
      acc[curr.plat] = curr.mappedType;
      return acc;
    }, {});

    const parsedDrivers = rawDrivers.map((d) => {
      let mappedTypeStr = d.type;
      if (d.plat && mappingsObj[d.plat]) {
        mappedTypeStr = d.storage ? `${d.storage}-${mappingsObj[d.plat]}` : mappingsObj[d.plat];
      }
      return { ...d, type: mappedTypeStr, basePlat: getBasePlate(d.plat) };
    });

    const groupedByEmail = {};
    parsedDrivers.forEach((d) => {
      const email = (d.email || '').toLowerCase().trim();
      if (email && email !== '-') {
        if (!groupedByEmail[email]) groupedByEmail[email] = [];
        groupedByEmail[email].push(d);
      }
    });

    const activeTypesSet = new Set();
    const masterData = { Dry: { Total: 0 }, Frozen: { Total: 0 } };

    parsedDrivers.forEach((d) => {
      const isSewa = (d.plat || '').toUpperCase().includes('SEWA');
      if (isSewa) return;

      let isConditional = false;
      const email = (d.email || '').toLowerCase().trim();
      if (email && email !== '-' && groupedByEmail[email]) {
        const group = groupedByEmail[email];
        if (group.length > 1) {
          const spaceCount = (d.plat || '').trim().split(' ').length - 1;
          const minSpaces = Math.min(
            ...group.map((v) => (v.plat || '').trim().split(' ').length - 1)
          );
          if (spaceCount > minSpaces && spaceCount > 2) {
            isConditional = true;
          }
        }
      }

      if (isConditional) return;

      const plat = d.plat || '';
      const platUpper = plat.toUpperCase();

      if (!plat || isEmpty(plat.trim()) || platUpper.includes('DEMO')) {
        return;
      }

      let resolvedType = d.type || 'Lainnya';
      if (resolvedType && resolvedType.includes('-')) {
        const parts = resolvedType.split('-');
        resolvedType = parts.length > 1 ? parts[1].toUpperCase() : resolvedType.toUpperCase();
        if (parts.length > 2 && parts[2].toUpperCase() === 'LONG') {
          if (['CDE', 'CDD', 'FUSO'].includes(resolvedType)) {
            resolvedType = `${resolvedType}-LONG`;
          }
        }
      } else {
        resolvedType = resolvedType.toUpperCase();
      }

      activeTypesSet.add(resolvedType);
      const storageCategory = getStorageType(d.storage || d.type || '');

      if (masterData[storageCategory][resolvedType] === undefined) {
        masterData.Dry[resolvedType] = 0;
        masterData.Frozen[resolvedType] = 0;
      }

      masterData[storageCategory][resolvedType]++;
      masterData[storageCategory].Total++;
    });

    const vehicleTypes = Array.from(activeTypesSet).sort();

    return NextResponse.json({ masterData, vehicleTypes });
  } catch (error) {
    console.error('Error calculate Master Truck Storage:', error);
    const errorMessage =
      error instanceof Error ? error.message : 'Kesalahan sistem tidak diketahui';
    return NextResponse.json(
      { error: 'Gagal memproses perhitungan master truck', detail: errorMessage },
      { status: 500 }
    );
  }
}
