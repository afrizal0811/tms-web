// File: src/app/api/vehicle-types/route.js
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const types = await prisma.vehicleType.findMany({ orderBy: { id: 'asc' } });
    return NextResponse.json(types, { status: 200 });
  } catch (error) {
    console.error('Error Get Vehicle Types:', error);
    const errorMessage =
      error instanceof Error ? error.message : 'Kesalahan sistem tidak diketahui';
    return NextResponse.json(
      { error: 'Gagal mengambil data tipe kendaraan dari database', detail: errorMessage },
      { status: 500 }
    );
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
    console.error('Error Create Vehicle Type:', error);
    const errorMessage =
      error instanceof Error ? error.message : 'Kesalahan sistem tidak diketahui';
    return NextResponse.json(
      { error: 'Gagal menambahkan tipe kendaraan baru ke database', detail: errorMessage },
      { status: 500 }
    );
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
    console.error('Error Update Vehicle Type:', error);
    const errorMessage =
      error instanceof Error ? error.message : 'Kesalahan sistem tidak diketahui';
    return NextResponse.json(
      { error: 'Gagal memperbarui data tipe kendaraan di database', detail: errorMessage },
      { status: 500 }
    );
  }
}

export async function DELETE(request) {
  try {
    const id = request.nextUrl.searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'ID tidak ditemukan' }, { status: 400 });

    await prisma.vehicleType.delete({ where: { id: Number(id) } });
    return NextResponse.json({ message: 'Tipe berhasil dihapus' }, { status: 200 });
  } catch (error) {
    console.error('Error Delete Vehicle Type:', error);
    const errorMessage =
      error instanceof Error ? error.message : 'Kesalahan sistem tidak diketahui';
    return NextResponse.json(
      { error: 'Gagal menghapus data tipe kendaraan dari database', detail: errorMessage },
      { status: 500 }
    );
  }
}
