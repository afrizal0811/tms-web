// File: src/app/api/get-drivers/status/route.js
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const hubsWithDriverStatus = await prisma.hub.findMany({
      include: {
        drivers: {
          orderBy: { updatedAt: 'desc' },
          take: 1,
          select: { updatedAt: true },
        },
      },
    });

    const status = hubsWithDriverStatus.map((hub) => {
      return {
        hubId: hub.id,
        _max: {
          updatedAt: hub.drivers.length > 0 ? hub.drivers[0].updatedAt : null,
        },
      };
    });

    return NextResponse.json(status, { status: 200 });
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
