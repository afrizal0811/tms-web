import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const status = await prisma.driver.groupBy({
      by: ['hubId'],
      _max: { updatedAt: true },
    });
    return NextResponse.json(status, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
