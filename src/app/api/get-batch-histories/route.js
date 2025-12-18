// File: app/api/get-batch-histories/route.js
import { NextResponse } from 'next/server';

export async function POST(request) {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL;
  const apiToken = process.env.API_TOKEN;

  if (!apiUrl || !apiToken) {
    return NextResponse.json({ error: 'Server config missing' }, { status: 500 });
  }

  try {
    // 1. Terima array resultId dari body request
    const body = await request.json();
    const { resultIds } = body; // Ekspektasi: ["id1", "id2", "id3", ...]

    if (!resultIds || !Array.isArray(resultIds) || resultIds.length === 0) {
      return NextResponse.json({ data: [] });
    }

    // 2. Fungsi fetcher satuan
    const fetchSingleHistory = async (id) => {
      try {
        const res = await fetch(`${apiUrl}/result/${id}/history`, {
          headers: {
            Authorization: `Bearer ${apiToken}`,
            'Content-Type': 'application/json',
          },
          // Cache: no-store agar data selalu fresh, atau sesuaikan kebutuhan
          cache: 'no-store',
        });

        if (!res.ok) return null;
        const json = await res.json();

        // Return object yang berisi ID dan datanya untuk memudahkan mapping nanti
        return {
          resultId: id,
          history: json.data || [],
        };
      } catch (error) {
        console.error(`Error fetching history for ${id}:`, error);
        return null;
      }
    };

    // 3. Jalankan request secara PARALEL di sisi server (Server-to-Server jauh lebih cepat)
    // Kita batasi concurrency jika perlu, tapi untuk 30 request, Promise.all masih aman di server environment.
    const results = await Promise.all(resultIds.map((id) => fetchSingleHistory(id)));

    // Filter yang gagal (null)
    const validResults = results.filter((item) => item !== null);

    return NextResponse.json({ data: validResults });
  } catch (error) {
    console.error('Batch history error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
