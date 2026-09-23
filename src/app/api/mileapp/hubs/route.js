import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const hubId = searchParams.get('hubId');
    const hubs = await prisma.hub.findMany({
      orderBy: { name: 'asc' },
    });
    const formattedHubs = hubs.map((hub) => ({
      _id: hub.id,
      name: hub.name.replace('Hub ', ''),
      acronym: hub.acronym,
      hasPendingGR: hub.hasPendingGR || false,
      hasPartialRouting: hub.hasPartialRouting || false,
      lat: hub.lat,
      lng: hub.lng,
      updatedAt: hub.updatedAt,
      hasVms: hub.has_vms || false,
      isActive: hub.is_active || false,
    }));
    const activeHub = formattedHubs.find((h) => String(h._id) === String(hubId));
    console.log('formattedHubs :', formattedHubs);
    console.log('activeHub :', activeHub);

    return NextResponse.json(
      {
        activeHub: activeHub,
        allHub: formattedHubs,
      },
      { status: 200 }
    );
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

    if (!externalResponse.ok) {
      throw new Error(`API Vendor Error: Status ${externalResponse.status}`);
    }

    const responseData = await externalResponse.json();

    // Pastikan kita mendapatkan array dari respons API Vendor
    const hubsArray = Array.isArray(responseData) ? responseData : responseData.data;

    if (!Array.isArray(hubsArray)) {
      throw new Error('Format data dari API Vendor tidak sesuai (bukan Array)');
    }

    const upsertPromises = hubsArray.map((hub) => {
      // Antisipasi letak data koordinat dari API Vendor
      const lat = hub.lat ?? hub.latitude ?? hub.location?.lat ?? null;
      const lng = hub.lng ?? hub.longitude ?? hub.location?.lng ?? hub.location?.lon ?? null;

      // Gunakan pengecekan eksplisit agar nilai truthy float terbaca sempurna
      const parsedLat = lat !== null && lat !== undefined ? parseFloat(lat) : null;
      const parsedLng = lng !== null && lng !== undefined ? parseFloat(lng) : null;

      return prisma.hub.upsert({
        where: { id: String(hub._id) },
        update: {
          name: hub.name,
          lat: parsedLat,
          lng: parsedLng,
        },
        create: {
          id: String(hub._id),
          name: hub.name,
          lat: parsedLat,
          lng: parsedLng,
        },
      });
    });

    await prisma.$transaction(upsertPromises);
    return NextResponse.json({ message: 'Sync Berhasil' }, { status: 200 });
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
    const { id, acronym, hasPendingGR, hasPartialRouting, hasVms, isActive } = body;

    if (!id) {
      return NextResponse.json({ error: 'ID Hub diperlukan' }, { status: 400 });
    }

    const updateData = {};
    if (acronym !== undefined) {
      updateData.acronym = acronym && String(acronym).trim() !== '' ? String(acronym).trim() : null;
    }
    if (hasPendingGR !== undefined && hasPendingGR !== null) {
      updateData.hasPendingGR = hasPendingGR === true || hasPendingGR === 'true';
    }
    if (hasPartialRouting !== undefined && hasPartialRouting !== null) {
      updateData.hasPartialRouting = hasPartialRouting === true || hasPartialRouting === 'true';
    }
    if (hasVms !== undefined && hasVms !== null) {
      updateData.has_vms = hasVms === true || hasVms === 'true';
    }
    if (isActive !== undefined && isActive !== null) {
      updateData.is_active = isActive === true || isActive === 'true';
    }

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
