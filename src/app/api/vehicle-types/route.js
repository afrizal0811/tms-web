// File: src/app/api/vehicle-types/route.js
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const types = await prisma.vehicleType.findMany({ orderBy: { id: 'asc' } });
    return NextResponse.json(types, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: 'Gagal memuat tipe kendaraan' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const { name } = await request.json();
    if (!name) return NextResponse.json({ error: 'Nama tipe wajib diisi' }, { status: 400 });

    const newType = await prisma.vehicleType.create({
      data: { name: name.toUpperCase() },
    });
    return NextResponse.json(
      { message: 'Tipe berhasil ditambahkan', data: newType },
      { status: 201 }
    );
  } catch (error) {
    return NextResponse.json({ error: 'Gagal menambah tipe kendaraan' }, { status: 500 });
  }
}

export async function PUT(request) {
  try {
    const { id, name } = await request.json();
    if (!id || !name) return NextResponse.json({ error: 'Data tidak lengkap' }, { status: 400 });

    const updatedType = await prisma.vehicleType.update({
      where: { id: Number(id) },
      data: { name: name.toUpperCase() },
    });
    return NextResponse.json(
      { message: 'Tipe berhasil diubah', data: updatedType },
      { status: 200 }
    );
  } catch (error) {
    return NextResponse.json({ error: 'Gagal mengubah tipe kendaraan' }, { status: 500 });
  }
}

export async function DELETE(request) {
  try {
    const id = request.nextUrl.searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'ID tidak ditemukan' }, { status: 400 });

    await prisma.vehicleType.delete({ where: { id: Number(id) } });
    return NextResponse.json({ message: 'Tipe berhasil dihapus' }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: 'Gagal menghapus tipe kendaraan' }, { status: 500 });
  }
}
