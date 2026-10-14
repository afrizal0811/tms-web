// File: app/api/pending-details/route.js
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const startDate = searchParams.get('startDate');
  const endDate = searchParams.get('endDate');

  try {
    const data = await prisma.pendingDetail.findMany({
      where: {
        date: { gte: startDate, lte: endDate },
      },
    });
    return NextResponse.json(data, { status: 200 });
  } catch (error) {
    console.error('Error Get Pending Details:', error);
    return NextResponse.json(
      { error: 'Gagal mengambil data detail pending', detail: error.message },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const {
      taskId,
      date,
      internalExternal,
      detailReason,
      groupReason,
      pic,
      userName,
      created_by,
      updated_by,
    } = body;

    const currentUser = updated_by || created_by || userName || null;

    const existing = await prisma.pendingDetail.findUnique({
      where: { taskId },
    });

    const updateData = {
      internalExternal,
      detailReason,
      groupReason,
      pic,
      updated_by: currentUser,
    };

    if (existing && !existing.created_by && currentUser) {
      updateData.created_by = currentUser;
    }

    const upserted = await prisma.pendingDetail.upsert({
      where: { taskId },
      update: updateData,
      create: {
        taskId,
        date,
        internalExternal,
        detailReason,
        groupReason,
        pic,
        created_by: currentUser,
        updated_by: currentUser,
      },
    });
    return NextResponse.json({ message: 'Success', data: upserted }, { status: 200 });
  } catch (error) {
    console.error('Error Upsert Pending Details:', error);
    return NextResponse.json(
      { error: 'Gagal menyimpan data detail pending', detail: error.message },
      { status: 500 }
    );
  }
}

// TAMBAHKAN METODE DELETE INI
export async function DELETE(request) {
  const { searchParams } = new URL(request.url);
  const taskId = searchParams.get('taskId');

  try {
    if (!taskId) return NextResponse.json({ error: 'taskId dibutuhkan' }, { status: 400 });

    await prisma.pendingDetail.delete({
      where: { taskId: taskId },
    });

    return NextResponse.json({ message: 'Detail pending berhasil dihapus' }, { status: 200 });
  } catch (error) {
    console.error('Error Delete Pending Details:', error);
    return NextResponse.json(
      { error: 'Gagal menghapus data detail pending', detail: error.message },
      { status: 500 }
    );
  }
}
