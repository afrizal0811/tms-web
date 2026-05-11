import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const hubs = await prisma.hub.findMany({
      orderBy: { name: 'asc' },
    });

    const formattedHubs = hubs
      .filter((hub) => hub.name !== 'Hub Demo')
      .map((hub) => ({
        _id: hub.id,
        name: hub.name.replace('Hub ', ''),
        acronym: hub.acronym,
        hasPendingGR: hub.hasPendingGR || false,
        updatedAt: hub.updatedAt,
      }));

    return NextResponse.json(formattedHubs, { status: 200 });
  } catch (error) {
    console.error('Error Hubs:', error);
    const errorMessage =
      error instanceof Error ? error.message : 'Kesalahan sistem tidak diketahui';
    return NextResponse.json(
      { error: 'Gagal mengambil data hubs dari database lokal', detail: errorMessage },
      { status: 500 }
    );
  }
}

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
    }
  } catch (error) {
    console.error('Error Sync Hubs:', error);
    const errorMessage =
      error instanceof Error ? error.message : 'Kesalahan sistem tidak diketahui';
    return NextResponse.json(
      { error: 'Gagal melakukan sinkronisasi data hubs dengan Vendor API', detail: errorMessage },
      { status: 500 }
    );
  }
}

export async function PATCH(req) {
  try {
    const body = await req.json();
    const { id, acronym, hasPendingGR } = body;

    if (!id) {
      return NextResponse.json({ error: 'ID Hub diperlukan' }, { status: 400 });
    }

    const updateData = {};
    if (acronym !== undefined) updateData.acronym = acronym || null;
    if (hasPendingGR !== undefined) updateData.hasPendingGR = hasPendingGR;

    const updatedHub = await prisma.hub.update({
      where: { id: String(id) },
      data: updateData,
    });

    return NextResponse.json(
      { message: 'Pengaturan cabang berhasil diperbarui', data: updatedHub },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error Update Hub Settings:', error);
    const errorMessage =
      error instanceof Error ? error.message : 'Kesalahan sistem tidak diketahui';
    return NextResponse.json(
      { error: 'Gagal memperbarui pengaturan cabang', detail: errorMessage },
      { status: 500 }
    );
  }
}
