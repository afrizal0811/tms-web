import prisma from '@/lib/prisma';
import { getBasePlate } from '@/lib/utils';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const hubId = searchParams.get('hubId');

  try {
    let mappings = [];
    if (hubId) {
      const driversInHub = await prisma.driver.findMany({
        where: { hubs: { some: { id: hubId } } },
        select: { plat: true },
      });
      
      const basePlatsInHub = [...new Set(driversInHub.map((d) => getBasePlate(d.plat)).filter(Boolean))];
      mappings = await prisma.vehicleMapping.findMany({
        where: { plat: { in: basePlatsInHub } },
        orderBy: [{ plat: 'asc' }, { mappedType: 'asc' }],
      });
    } else {
      mappings = await prisma.vehicleMapping.findMany({
        orderBy: [{ plat: 'asc' }, { mappedType: 'asc' }],
      });
    }

    // Deduplicate / normalize mappings ke base plate saja
    const seen = new Set();
    const dedupedMappings = [];
    for (const m of mappings) {
      const base = getBasePlate(m.plat);
      if (!seen.has(base)) {
        seen.add(base);
        dedupedMappings.push({ ...m, plat: base });
      }
    }

    return NextResponse.json(dedupedMappings, { status: 200 });
  } catch (error) {
    console.error('Error Get Vehicle Mapping:', error);
    const errorMessage =
      error instanceof Error ? error.message : 'Kesalahan sistem tidak diketahui';
    return NextResponse.json(
      { error: 'Gagal mengambil data pemetaan kendaraan', detail: errorMessage },
      { status: 500 }
    );
  }
}

// 2. POST: Simpan data banyak sekaligus (Bulk Upsert dari Modal)
export async function POST(request) {
  try {
    const body = await request.json();

    if (!Array.isArray(body)) {
      return NextResponse.json({ error: 'Format data tidak valid' }, { status: 400 });
    }

    const baseMap = new Map();
    body.forEach((item) => {
      const basePlat = getBasePlate(item.plat);
      if (basePlat && item.mappedType) {
        baseMap.set(basePlat, item.mappedType);
      }
    });

    const transactions = Array.from(baseMap.entries()).map(([plat, mappedType]) =>
      prisma.vehicleMapping.upsert({
        where: { plat },
        update: { mappedType },
        create: { plat, mappedType },
      })
    );

    if (transactions.length > 0) {
      await prisma.$transaction(transactions);
    }
    return NextResponse.json({ message: 'Mapping berhasil disimpan' }, { status: 200 });
  } catch (error) {
    console.error('Error Upsert Vehicle Mapping:', error);
    const errorMessage =
      error instanceof Error ? error.message : 'Kesalahan sistem tidak diketahui';
    return NextResponse.json(
      { error: 'Gagal menyimpan pemetaan kendaraan secara massal', detail: errorMessage },
      { status: 500 }
    );
  }
}

// 3. PUT: Edit Tipe Kendaraan satu per satu
export async function PUT(request) {
  try {
    const body = await request.json();
    if (!body.plat || !body.mappedType) {
      return NextResponse.json({ error: 'Plat dan Tipe dibutuhkan' }, { status: 400 });
    }

    const basePlat = getBasePlate(body.plat);
    const updated = await prisma.vehicleMapping.upsert({
      where: { plat: basePlat },
      update: { mappedType: body.mappedType },
      create: { plat: basePlat, mappedType: body.mappedType },
    });

    return NextResponse.json(updated, { status: 200 });
  } catch (error) {
    console.error('Error Update Vehicle Mapping:', error);
    const errorMessage =
      error instanceof Error ? error.message : 'Kesalahan sistem tidak diketahui';
    return NextResponse.json(
      { error: 'Gagal memperbarui data pemetaan kendaraan', detail: errorMessage },
      { status: 500 }
    );
  }
}

// 4. DELETE: Hapus pemetaan jika ada kesalahan
export async function DELETE(request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  try {
    if (!id) return NextResponse.json({ error: 'id dibutuhkan' }, { status: 400 });

    await prisma.vehicleMapping.delete({
      where: { id: Number(id) },
    });

    return NextResponse.json({ message: 'Mapping berhasil dihapus' }, { status: 200 });
  } catch (error) {
    console.error('Error Delete Vehicle Mapping:', error);
    const errorMessage =
      error instanceof Error ? error.message : 'Kesalahan sistem tidak diketahui';
    return NextResponse.json(
      { error: 'Gagal menghapus data pemetaan kendaraan', detail: errorMessage },
      { status: 500 }
    );
  }
}
