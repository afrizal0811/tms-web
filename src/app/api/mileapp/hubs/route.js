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
      hasPendingGR: hub.has_pending_gr || false,
      hasPartialRouting: hub.has_partial_routing || false,
      lat: hub.lat,
      lng: hub.lng,
      updatedAt: hub.updated_at,
      updateBy: hub.update_by,
      hasVms: hub.has_vms || false,
      isActive: hub.is_active || false,
    }));
    const activeHub = formattedHubs.find((h) => String(h._id) === String(hubId));

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

export async function POST(request) {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL;
  const apiToken = process.env.API_TOKEN;

  if (!apiUrl || !apiToken) {
    return NextResponse.json({ error: 'Config API hilang' }, { status: 500 });
  }

  try {
    const body = await request.json().catch(() => ({}));
    const updateBy = body?.updateBy || null;

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

    const hubsArray = Array.isArray(responseData) ? responseData : responseData.data;

    if (!Array.isArray(hubsArray)) {
      throw new Error('Format data dari API Vendor tidak sesuai (bukan Array)');
    }

    const upsertPromises = hubsArray.map((hub) => {
      const lat = hub.lat ?? hub.latitude ?? hub.location?.lat ?? null;
      const lng = hub.lng ?? hub.longitude ?? hub.location?.lng ?? hub.location?.lon ?? null;

      const parsedLat = lat !== null && lat !== undefined ? parseFloat(lat) : null;
      const parsedLng = lng !== null && lng !== undefined ? parseFloat(lng) : null;

      return prisma.hub.upsert({
        where: { id: String(hub._id) },
        update: {
          name: hub.name,
          lat: parsedLat,
          lng: parsedLng,
          ...(updateBy ? { update_by: updateBy } : {}),
        },
        create: {
          id: String(hub._id),
          name: hub.name,
          lat: parsedLat,
          lng: parsedLng,
          ...(updateBy ? { update_by: updateBy } : {}),
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
      updateData.has_pending_gr = hasPendingGR === true || hasPendingGR === 'true';
    }
    if (hasPartialRouting !== undefined && hasPartialRouting !== null) {
      updateData.has_partial_routing = hasPartialRouting === true || hasPartialRouting === 'true';
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

    const formattedUpdatedHub = {
      _id: updatedHub.id,
      name: updatedHub.name.replace('Hub ', ''),
      acronym: updatedHub.acronym,
      hasPendingGR: updatedHub.has_pending_gr || false,
      hasPartialRouting: updatedHub.has_partial_routing || false,
      lat: updatedHub.lat,
      lng: updatedHub.lng,
      updatedAt: updatedHub.updated_at,
      updateBy: updatedHub.update_by,
      hasVms: updatedHub.has_vms || false,
      isActive: updatedHub.is_active || false,
    };

    return NextResponse.json(
      { message: 'Pengaturan cabang berhasil diperbarui', data: formattedUpdatedHub },
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
