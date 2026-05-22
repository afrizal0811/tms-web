// File: app/api/get-result/route.js

import { NextResponse } from 'next/server';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'Parameter "id" sangat dibutuhkan untuk mengambil data spesifik' },
        { status: 400 }
      );
    }

    const apiUrl = process.env.NEXT_PUBLIC_API_URL;
    const apiToken = process.env.API_TOKEN;

    if (!apiUrl || !apiToken) {
      console.error(
        'Konfigurasi server hilang: NEXT_PUBLIC_API_URL atau API_TOKEN tidak ditemukan.'
      );
      return NextResponse.json({ error: 'Kesalahan konfigurasi server internal' }, { status: 500 });
    }

    const externalUrl = new URL(`${apiUrl}/result/${id}`);

    const externalResponse = await fetch(externalUrl.toString(), {
      headers: {
        Authorization: `Bearer ${apiToken}`,
        'Content-Type': 'application/json',
      },
    });

    const data = await externalResponse.json();

    if (!externalResponse.ok) {
      console.error(`API eksternal (/result/${id}) error:`, data);
      return NextResponse.json(
        {
          error: `Gagal mengambil data result dengan ID ${id}`,
          details: data,
        },
        {
          status: externalResponse.status,
        }
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error Single Result:', error);
    const errorMessage =
      error instanceof Error ? error.message : 'Kesalahan sistem tidak diketahui';
    return NextResponse.json(
      {
        error: 'Gagal mengambil atau memproses data spesifik dari API eksternal',
        detail: errorMessage,
      },
      { status: 500 }
    );
  }
}
