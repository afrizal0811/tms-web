import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const roles = await prisma.role.findMany({
      orderBy: { id: 'asc' },
    });

    const formattedRoles = roles.map((role) => ({
      _id: role.id,
      name: role.name,
      paths: role.paths || [],
      updatedAt: role.updatedAt,
    }));

    return NextResponse.json(formattedRoles, { status: 200 });
  } catch (error) {
    console.error('Error Roles:', error);
    const errorMessage =
      error instanceof Error ? error.message : 'Kesalahan sistem tidak diketahui';
    return NextResponse.json(
      { error: 'Gagal mengambil data roles dari database lokal', detail: errorMessage },
      { status: 500 }
    );
  }
}

export async function POST() {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL;
  const apiToken = process.env.API_TOKEN;

  if (!apiUrl || !apiToken) {
    return NextResponse.json({ error: 'Config API hilang' }, { status: 500 });
  }

  try {
    const externalResponse = await fetch(`${apiUrl}/roles`, {
      headers: {
        Authorization: `Bearer ${apiToken}`,
        'Content-Type': 'application/json',
      },
      cache: 'no-store',
    });

    if (!externalResponse.ok) throw new Error('API Vendor Error');

    const responseData = await externalResponse.json();
    const rolesArray = Array.isArray(responseData) ? responseData : responseData.data;

    if (Array.isArray(rolesArray)) {
      const upsertPromises = rolesArray.map((role) => {
        return prisma.role.upsert({
          where: { id: String(role._id) },
          update: { name: role.name },
          create: { id: String(role._id), name: role.name },
        });
      });
      await prisma.$transaction(upsertPromises);
      return NextResponse.json({ message: 'Sync Roles Berhasil' }, { status: 200 });
    }
  } catch (error) {
    console.error('Error Sync Roles:', error);
    const errorMessage =
      error instanceof Error ? error.message : 'Kesalahan sistem tidak diketahui';
    return NextResponse.json(
      { error: 'Gagal melakukan sinkronisasi data roles dengan Vendor API', detail: errorMessage },
      { status: 500 }
    );
  }
}

export async function PATCH(request) {
  try {
    const { id, paths } = await request.json();
    if (!id) throw new Error('ID Role dibutuhkan');

    const role = await prisma.role.update({
      where: { id: String(id) },
      data: { paths: paths || [] },
    });

    return NextResponse.json(
      { message: 'Role akses berhasil diupdate', data: role },
      { status: 200 }
    );
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}