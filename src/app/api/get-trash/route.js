// File: src/app/api/get-trash/route.js
import { NextResponse } from 'next/server';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = searchParams.get('limit') || '1000';

    const apiUrl = process.env.NEXT_PUBLIC_API_URL;
    const apiToken = process.env.API_TOKEN;

    if (!apiUrl || !apiToken) {
      return NextResponse.json({ error: 'Variabel API tidak diatur di server.' }, { status: 500 });
    }

    const externalUrl = new URL(`${apiUrl}/trash`);
    externalUrl.searchParams.append('limit', limit);

    const externalResponse = await fetch(externalUrl.toString(), {
      headers: {
        Authorization: `Bearer ${apiToken}`,
        'Content-Type': 'application/json',
      },
    });

    const data = await externalResponse.json();

    if (!externalResponse.ok) {
      return NextResponse.json(
        {
          error: 'Gagal mengambil data dari API Trash',
          details: data,
        },
        { status: externalResponse.status }
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error Trash API:', error);
    return NextResponse.json({ error: 'Terjadi kesalahan internal server.' }, { status: 500 });
  }
}
