import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const hubId = searchParams.get('hubId');
  try {
    const hubsWithDriverStatus = await prisma.hub.findMany({
      include: {
        drivers: {
          orderBy: { updated_at: 'desc' },
          take: 1,
          select: { updated_at: true, update_by: true },
        },
      },
    });

    const status = hubsWithDriverStatus.map((hub) => {
      return {
        hubId: hub.id,
        _max: {
          updatedAt: hub.drivers.length > 0 ? (hub.drivers[0].updated_at ?? hub.drivers[0].updatedAt) : null,
          updateBy: hub.drivers.length > 0 ? (hub.drivers[0].update_by ?? hub.drivers[0].updateBy) : null,
        },
      };
    });
    let selectedStatus = status.find((s) => s.hubId === hubId);
    if (!selectedStatus || !selectedStatus._max?.updatedAt) {
      const latestDriver = await prisma.driver.findFirst({
        where: hubId && hubId !== 'all' ? { hubs: { some: { id: hubId } } } : undefined,
        orderBy: { updated_at: 'desc' },
        select: { updated_at: true, update_by: true },
      });
      if (latestDriver) {
        selectedStatus = {
          hubId: hubId || 'all',
          _max: {
            updatedAt: latestDriver.updated_at ?? latestDriver.updatedAt,
            updateBy: latestDriver.update_by ?? latestDriver.updateBy,
          },
        };
      }
    }
    return NextResponse.json(selectedStatus || null, { status: 200 });
  } catch (error) {
    console.error('Error Status Driver:', error);
    const errorMessage =
      error instanceof Error ? error.message : 'Kesalahan sistem tidak diketahui';
    return NextResponse.json(
      { error: 'Gagal mengambil status update driver dari database', detail: errorMessage },
      { status: 500 }
    );
  }
}
