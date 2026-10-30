import { POST as syncResults } from '@/app/api/mileapp/results/route';
import { POST as syncTasks } from '@/app/api/mileapp/tasks/route';
import { POST as syncLocationHistories } from '@/app/api/mileapp/drivers/location-histories/route';
import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    message: 'Endpoint sinkronisasi operasional MileApp. Gunakan POST untuk melakukan sinkronisasi.',
  });
}

export async function POST(request) {
  try {
    const body = await request.json().catch(() => ({}));
    const { deliveryDate, hubId, force = false, created_by, updated_by, userName } = body || {};

    if (!deliveryDate) {
      return NextResponse.json(
        { error: 'Parameter "deliveryDate" (format YYYY-MM-DD) dibutuhkan.' },
        { status: 400 }
      );
    }

    const payload = {
      deliveryDate,
      hubId,
      force,
      created_by: created_by || userName,
      updated_by: updated_by || userName,
      userName: userName || updated_by || created_by,
    };

    const createReq = () =>
      new Request('http://localhost/api/mileapp/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

    const entities =
      Array.isArray(body.entities) && body.entities.length > 0
        ? body.entities
        : ['results', 'location-histories', 'tasks'];

    const summary = {
      results: null,
      locationHistories: null,
      tasks: null,
    };

    let hasError = false;
    let successCount = 0;

    if (entities.includes('results')) {
      try {
        const res = await syncResults(createReq());
        const data = await res.json();
        summary.results = {
          status: res.status,
          success: res.ok,
          ...data,
        };
        if (res.ok) successCount++;
        else hasError = true;
      } catch (err) {
        hasError = true;
        summary.results = {
          status: 500,
          success: false,
          error: err.message,
        };
      }
    }

    if (entities.includes('location-histories') || entities.includes('locationHistories')) {
      try {
        const res = await syncLocationHistories(createReq());
        const data = await res.json();
        summary.locationHistories = {
          status: res.status,
          success: res.ok,
          ...data,
        };
        if (res.ok) successCount++;
        else hasError = true;
      } catch (err) {
        hasError = true;
        summary.locationHistories = {
          status: 500,
          success: false,
          error: err.message,
        };
      }
    }

    if (entities.includes('tasks')) {
      try {
        const res = await syncTasks(createReq());
        const data = await res.json();
        summary.tasks = {
          status: res.status,
          success: res.ok,
          ...data,
        };
        if (res.ok) successCount++;
        else hasError = true;
      } catch (err) {
        hasError = true;
        summary.tasks = {
          status: 500,
          success: false,
          error: err.message,
        };
      }
    }

    const totalEntities = [summary.results, summary.locationHistories, summary.tasks].filter(
      Boolean
    ).length;
    const allFailed = totalEntities > 0 && successCount === 0;

    return NextResponse.json(
      {
        message: allFailed
          ? 'Gagal sinkronisasi data operasional.'
          : hasError
            ? 'Sinkronisasi selesai dengan beberapa catatan.'
            : 'Berhasil sinkronisasi seluruh data operasional.',
        success: !allFailed,
        partial: hasError && !allFailed,
        deliveryDate,
        hubId: hubId || null,
        ...summary,
      },
      { status: allFailed ? 500 : 200 }
    );
  } catch (error) {
    console.error('Error Master Sync:', error);
    const errorMessage =
      error instanceof Error ? error.message : 'Kesalahan sistem tidak diketahui';
    return NextResponse.json(
      {
        error: 'Gagal memproses sinkronisasi operasional',
        detail: errorMessage,
      },
      { status: 500 }
    );
  }
}

