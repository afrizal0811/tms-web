import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const reasons = await prisma.reason.findMany({
      orderBy: { pic: 'asc' },
    });
    return NextResponse.json(reasons, { status: 200 });
  } catch (error) {
    console.error('Error Get Reasons:', error);
    return NextResponse.json(
      { error: 'Gagal mengambil data reason', detail: error.message },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    if (!body.reasons || !body.pic) {
      return NextResponse.json({ error: 'Reason dan PIC dibutuhkan' }, { status: 400 });
    }

    const newReason = await prisma.reason.create({
      data: {
        reasons: body.reasons,
        pic: body.pic,
      },
    });

    return NextResponse.json(
      { message: 'Reason berhasil ditambahkan', data: newReason },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error Create Reason:', error);
    // Tangkap error unique constraint
    if (error.code === 'P2002') {
      return NextResponse.json(
        { error: 'Kombinasi Group Reason dan PIC tersebut sudah terdaftar.' },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: 'Gagal menyimpan reason', detail: error.message },
      { status: 500 }
    );
  }
}

export async function PUT(request) {
  try {
    const body = await request.json();
    if (!body.id || !body.reasons || !body.pic) {
      return NextResponse.json({ error: 'ID, Reason, dan PIC dibutuhkan' }, { status: 400 });
    }

    const updated = await prisma.reason.update({
      where: { id: parseInt(body.id) },
      data: {
        reasons: body.reasons,
        pic: body.pic,
      },
    });

    return NextResponse.json({ message: 'Reason berhasil diubah', data: updated }, { status: 200 });
  } catch (error) {
    console.error('Error Update Reason:', error);
    // Tangkap error unique constraint saat diupdate
    if (error.code === 'P2002') {
      return NextResponse.json(
        { error: 'Kombinasi Group Reason dan PIC tersebut sudah terdaftar.' },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: 'Gagal memperbarui reason', detail: error.message },
      { status: 500 }
    );
  }
}

export async function DELETE(request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  try {
    if (!id) return NextResponse.json({ error: 'ID dibutuhkan' }, { status: 400 });

    await prisma.reason.delete({
      where: { id: parseInt(id) },
    });

    return NextResponse.json({ message: 'Reason berhasil dihapus' }, { status: 200 });
  } catch (error) {
    console.error('Error Delete Reason:', error);
    return NextResponse.json(
      { error: 'Gagal menghapus reason', detail: error.message },
      { status: 500 }
    );
  }
}
