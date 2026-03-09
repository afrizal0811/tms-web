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
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
