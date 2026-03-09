import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// 1. GET: Ambil data (Bisa untuk Semua, bisa di-filter per Hub)
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const hubId = searchParams.get('hubId');

  try {
    let mappings = [];

    if (hubId) {
      // Cari semua kendaraan (pelat) yang ada di hub ini melalui tabel Driver
      const driversInHub = await prisma.driver.findMany({
        where: { hubs: { some: { id: hubId } } },
        select: { plat: true },
      });

      // Ambil pelat yang unik saja dan buang yang kosong
      const platsInHub = [...new Set(driversInHub.map((d) => d.plat).filter(Boolean))];

      // Ambil mapping yang pelatnya ada di dalam list hub ini
      mappings = await prisma.vehicleMapping.findMany({
        where: { plat: { in: platsInHub } },
        orderBy: { updatedAt: 'desc' }, // Urutkan dari yang terbaru
      });
    } else {
      // Jika tidak ada hubId, ambil semua
      mappings = await prisma.vehicleMapping.findMany({
        orderBy: { updatedAt: 'desc' },
      });
    }

    return NextResponse.json(mappings, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// 2. POST: Simpan data banyak sekaligus (Bulk Upsert dari Modal)
export async function POST(request) {
  try {
    const body = await request.json();

    if (!Array.isArray(body)) {
      return NextResponse.json({ error: 'Format data tidak valid' }, { status: 400 });
    }

    const transactions = body.map((item) =>
      prisma.vehicleMapping.upsert({
        where: { plat: item.plat },
        update: { mappedType: item.mappedType },
        create: { plat: item.plat, mappedType: item.mappedType },
      })
    );

    await prisma.$transaction(transactions);
    return NextResponse.json({ message: 'Mapping berhasil disimpan' }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// 3. PUT: Edit Tipe Kendaraan satu per satu
export async function PUT(request) {
  try {
    const body = await request.json();
    if (!body.plat || !body.mappedType) {
      return NextResponse.json({ error: 'Plat dan Tipe dibutuhkan' }, { status: 400 });
    }

    const updated = await prisma.vehicleMapping.update({
      where: { plat: body.plat },
      data: { mappedType: body.mappedType },
    });

    return NextResponse.json(updated, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// 4. DELETE: Hapus pemetaan jika ada kesalahan
export async function DELETE(request) {
  const { searchParams } = new URL(request.url);
  const plat = searchParams.get('plat');

  try {
    if (!plat) return NextResponse.json({ error: 'Plat dibutuhkan' }, { status: 400 });

    await prisma.vehicleMapping.delete({
      where: { plat: plat },
    });

    return NextResponse.json({ message: 'Mapping berhasil dihapus' }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
