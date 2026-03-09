import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const mappings = await prisma.vehicleMapping.findMany();
    return NextResponse.json(mappings, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

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
