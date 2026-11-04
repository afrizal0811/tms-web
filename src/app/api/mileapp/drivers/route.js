import prisma from '@/lib/prisma';
import { resolveUserName } from '../help';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const hubId = searchParams.get('hubId');

  try {
    const where = hubId && hubId !== 'all' ? { hub_id: hubId } : {};
    const drivers = await prisma.driverList.findMany({
      where,
      orderBy: { name: 'asc' },
    });
    return NextResponse.json(drivers, { status: 200 });
  } catch (error) {
    console.error('Error Get Driver List:', error);
    const errorMessage =
      error instanceof Error ? error.message : 'Kesalahan sistem tidak diketahui';
    return NextResponse.json(
      { error: 'Gagal mengambil data driver dari database', detail: errorMessage },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL;
  const apiToken = process.env.API_TOKEN;

  try {
    const body = await request.json().catch(() => ({}));
    let hubIds = body.hubIds || [];
    const updateBy = body?.updateBy || null;
    const authorName = await resolveUserName(updateBy);

    if (hubIds.length === 0) {
      const hubs = await prisma.hub.findMany();
      hubIds = hubs.map((h) => h.id);
    }

    const roles = await prisma.role.findMany();
    const driverRoleIds = roles
      .filter((r) => r.name.toLowerCase().includes('driver'))
      .map((r) => r.id);

    let totalSynced = 0;

    for (const hubId of hubIds) {
      const rawDrivers = [];
      for (const roleId of driverRoleIds) {
        const userRes = await fetch(
          `${apiUrl}/users?hubId=${hubId}&roleId=${roleId}&status=active`,
          {
            headers: { Authorization: `Bearer ${apiToken}` },
            cache: 'no-store',
          }
        );
        if (userRes.ok) {
          const userData = await userRes.json();
          if (userData.data) rawDrivers.push(...userData.data);
        }
      }

      const uniqueEmailDrivers = new Map();
      rawDrivers.forEach((d) => {
        const email = (d.email || '').toLowerCase().trim();
        if (email) {
          uniqueEmailDrivers.set(email, d);
        }
      });

      for (const [email, d] of uniqueEmailDrivers.entries()) {
        const existing = await prisma.driverList.findFirst({
          where: { hub_id: hubId, email },
        });

        if (existing) {
          await prisma.driverList.update({
            where: { id: existing.id },
            data: {
              name: d.name || existing.name,
              updated_by: authorName,
              updated_time: new Date(),
            },
          });
        } else {
          await prisma.driverList.create({
            data: {
              hub_id: hubId,
              email,
              name: d.name || '-',
              vms_id: null,
              created_by: authorName,
              updated_by: authorName,
            },
          });
        }
        totalSynced++;
      }
    }

    return NextResponse.json(
      { message: `Sync Driver Berhasil (${totalSynced} driver)` },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error Sync Driver:', error);
    const errorMessage =
      error instanceof Error ? error.message : 'Kesalahan sistem tidak diketahui';
    return NextResponse.json(
      { error: 'Gagal melakukan proses sinkronisasi driver', detail: errorMessage },
      { status: 500 }
    );
  }
}

export async function PATCH(request) {
  try {
    const body = await request.json();
    const { updates, updateBy } = body;

    if (!updates || !Array.isArray(updates)) {
      return NextResponse.json({ error: 'Payload tidak valid' }, { status: 400 });
    }

    const authorName = await resolveUserName(updateBy);

    for (const u of updates) {
      if (u.id) {
        await prisma.driverList.update({
          where: { id: u.id },
          data: {
            vms_id: u.vms_id !== undefined ? (u.vms_id ? String(u.vms_id) : null) : undefined,
            name: u.name || undefined,
            updated_by: authorName,
            updated_time: new Date(),
          },
        });
      }
    }

    return NextResponse.json({ message: 'Update Driver Berhasil' }, { status: 200 });
  } catch (error) {
    console.error('Error Patch Driver:', error);
    return NextResponse.json({ error: 'Gagal update driver' }, { status: 500 });
  }
}

export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) {
      return NextResponse.json({ error: 'Parameter id diperlukan' }, { status: 400 });
    }

    await prisma.driverList.delete({ where: { id } });
    return NextResponse.json({ message: 'Driver berhasil dihapus' }, { status: 200 });
  } catch (error) {
    console.error('Error Delete Driver:', error);
    return NextResponse.json({ error: 'Gagal menghapus driver' }, { status: 500 });
  }
}
