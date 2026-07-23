import { isEmpty } from '@/lib/utils';
import { NextResponse } from 'next/server';

const createGroup = () => ({ data: [], count: 0 });

const processHistoryData = (rawHistory) => {
  const grouped = {
    move: createGroup(),
    dropped: createGroup(),
    switch: createGroup(),
    manual: createGroup(),
  };

  (rawHistory || []).forEach((item) => {
    const act = (item.action || '').toLowerCase();
    const vFrom = (item.vehicleFrom || '').toLowerCase();

    if (act === 'move' && vFrom === 'dropped') {
      grouped.manual.data.push(item);
      grouped.manual.count++;
      return;
    }

    if (act === 'move') {
      grouped.move.data.push(item);
      grouped.move.count++;
    } else if (act === 'dropped' || act === 'drop') {
      grouped.dropped.data.push(item);
      grouped.dropped.count++;
    } else if (act === 'switch') {
      grouped.switch.data.push(item);
      grouped.switch.count++;
    }
  });

  return [grouped];
};

export async function POST(request) {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL;
  const apiToken = process.env.API_TOKEN;

  if (!apiUrl || !apiToken) {
    return NextResponse.json({ error: 'Server config missing' }, { status: 500 });
  }

  try {
    const body = await request.json();
    const { resultIds } = body;

    if (!resultIds || !Array.isArray(resultIds) || isEmpty(resultIds)) {
      return NextResponse.json({ data: [] });
    }

    const fetchSingleHistory = async (id) => {
      try {
        const res = await fetch(`${apiUrl}/result/${id}/history`, {
          headers: {
            Authorization: `Bearer ${apiToken}`,
            'Content-Type': 'application/json',
          },
          cache: 'no-store',
        });

        if (!res.ok) return null;
        const json = await res.json();
        const historyData = processHistoryData(json.data || []);
        const hObj = historyData[0];

        return {
          resultId: id,
          total: hObj.move.count + hObj.dropped.count + hObj.switch.count + hObj.manual.count,
          history: historyData,
        };
      } catch (error) {
        console.error(`Error fetching history for ${id}:`, error);
        return null;
      }
    };

    const results = await Promise.all(resultIds.map(fetchSingleHistory));
    const validResults = results.filter((item) => item !== null);

    return NextResponse.json({ data: validResults });
  } catch (error) {
    console.error('Error saat eksekusi Batch History:', error);
    const errorMessage =
      error instanceof Error ? error.message : 'Terjadi kesalahan sistem yang tidak diketahui';

    return NextResponse.json(
      {
        error: 'Gagal memproses permintaan batch history',
        detail: errorMessage,
      },
      { status: 500 }
    );
  }
}
