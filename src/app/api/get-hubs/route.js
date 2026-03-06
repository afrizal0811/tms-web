// File: src/app/api/get-hubs/route.js
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// ==========================================
// FUNGSI GET: HANYA MEMBACA DATABASE LOKAL
// ==========================================
export async function GET() {
  try {
    const hubs = await prisma.hub.findMany({
      orderBy: { name: 'asc' },
    });

    // KUNCI PERBAIKAN: Filter Hub Demo dan hilangkan kata "Hub "
    const formattedHubs = hubs
      .filter((hub) => hub.name !== 'Hub Demo')
      .map((hub) => ({
        _id: hub.id,
        name: hub.name.replace('Hub ', ''),
        updatedAt: hub.updatedAt,
      }));

    return NextResponse.json(formattedHubs, { status: 200 });
  } catch (error) {
    console.error('Gagal mengambil data Hub dari DB Lokal:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

// ==========================================
// FUNGSI POST: SINKRONISASI DENGAN VENDOR API
// ==========================================
export async function POST() {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL;
  const apiToken = process.env.API_TOKEN;

  if (!apiUrl || !apiToken) {
    return NextResponse.json({ error: 'Config API hilang' }, { status: 500 });
  }

  try {
    const externalResponse = await fetch(`${apiUrl}/hubs`, {
      headers: {
        Authorization: `Bearer ${apiToken}`,
        'Content-Type': 'application/json',
      },
      cache: 'no-store',
    });

    if (!externalResponse.ok) throw new Error('API Vendor Error');

    const responseData = await externalResponse.json();
    const hubsArray = Array.isArray(responseData) ? responseData : responseData.data;

    if (Array.isArray(hubsArray)) {
      const upsertPromises = hubsArray.map((hub) => {
        return prisma.hub.upsert({
          where: { id: String(hub._id) },
          update: { name: hub.name },
          create: { id: String(hub._id), name: hub.name },
        });
      });
      await prisma.$transaction(upsertPromises);
      return NextResponse.json({ message: 'Sync Berhasil' }, { status: 200 });
    } else {
      return NextResponse.json({ error: 'Data vendor bukan array' }, { status: 400 });
    }
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
