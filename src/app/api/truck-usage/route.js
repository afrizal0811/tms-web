import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const hubId = searchParams.get('hubId');
  const startDate = searchParams.get('startDate');
  const endDate = searchParams.get('endDate');

  try {
    const data = await prisma.truckUsage.findMany({
      where: {
        hubId,
        date: { gte: startDate, lte: endDate },
      },
    });
    return NextResponse.json(data);
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { hubId, date, storageType, vehicleType, count, description } = body;

    const upserted = await prisma.truckUsage.upsert({
      where: {
        hubId_date_storageType_vehicleType: { hubId, date, storageType, vehicleType },
      },
      update: { count: parseInt(count), description },
      create: { hubId, date, storageType, vehicleType, count: parseInt(count), description },
    });
    return NextResponse.json({ message: 'Success', data: upserted });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function DELETE(request) {
  try {
    const body = await request.json();
    const { hubId, date, storageType, vehicleType } = body;

    await prisma.truckUsage.delete({
      where: {
        hubId_date_storageType_vehicleType: {
          hubId,
          date,
          storageType,
          vehicleType,
        },
      },
    });

    return NextResponse.json({ message: 'Success' });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
