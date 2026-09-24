import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { getStorageType, isEmpty, getBasePlate } from '@/lib/utils';
export const dynamic = 'force-dynamic';

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

      if (!masterData[storageCategory]) {
        masterData[storageCategory] = { Total: 0 };
      }

      if (masterData[storageCategory][resolvedType] === undefined) {
        Object.keys(masterData).forEach(key => {
          masterData[key][resolvedType] = 0;
        });
      }

      masterData[storageCategory][resolvedType]++;
      masterData[storageCategory].Total++;
    });

    const allTypes = await prisma.vehicleType.findMany({ orderBy: { name: 'asc' } });
    const activeTypes = Array.from(activeTypesSet).sort();

    return NextResponse.json({ masterData, activeTypes, allTypes });
  } catch (error) {
    console.error('Gagal memproses tipe kendaraan', error);
    const errorMessage =
      error instanceof Error ? error.message : 'Kesalahan sistem tidak diketahui';
    return NextResponse.json(
      { error: 'Gagal memproses tipe kendaraan', detail: errorMessage },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    const { name } = await request.json();
    if (!name) return NextResponse.json({ error: 'Nama tipe wajib diisi' }, { status: 400 });

    const newType = await prisma.vehicleType.create({
      data: { name: name.toUpperCase() },
    });
    return NextResponse.json(
      { message: 'Tipe berhasil ditambahkan', data: newType },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error Create Vehicle Type:', error);
    const errorMessage =
      error instanceof Error ? error.message : 'Kesalahan sistem tidak diketahui';
    return NextResponse.json(
      { error: 'Gagal menambahkan tipe kendaraan baru ke database', detail: errorMessage },
      { status: 500 }
    );
  }
}

export async function PUT(request) {
  try {
    const { id, name } = await request.json();
    if (!id || !name) return NextResponse.json({ error: 'Data tidak lengkap' }, { status: 400 });

    const updatedType = await prisma.vehicleType.update({
      where: { id: Number(id) },
      data: { name: name.toUpperCase() },
    });
    return NextResponse.json(
      { message: 'Tipe berhasil diubah', data: updatedType },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error Update Vehicle Type:', error);
    const errorMessage =
      error instanceof Error ? error.message : 'Kesalahan sistem tidak diketahui';
    return NextResponse.json(
      { error: 'Gagal memperbarui data tipe kendaraan di database', detail: errorMessage },
      { status: 500 }
    );
  }
}

export async function DELETE(request) {
  try {
    const id = request.nextUrl.searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'ID tidak ditemukan' }, { status: 400 });

    await prisma.vehicleType.delete({ where: { id: Number(id) } });
    return NextResponse.json({ message: 'Tipe berhasil dihapus' }, { status: 200 });
  } catch (error) {
    console.error('Error Delete Vehicle Type:', error);
    const errorMessage =
      error instanceof Error ? error.message : 'Kesalahan sistem tidak diketahui';
    return NextResponse.json(
      { error: 'Gagal menghapus data tipe kendaraan dari database', detail: errorMessage },
      { status: 500 }
    );
  }
}
