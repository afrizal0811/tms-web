// File: app/api/get-results-summary/route.js

import { NextResponse } from 'next/server';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const dateFrom = searchParams.get('dateFrom');
    const dateTo = searchParams.get('dateTo');
    const limit = searchParams.get('limit') || 500;
    const hubId = searchParams.get('hubId');
    const fields = searchParams.get('fields');

    if (!dateFrom || !dateTo || !hubId) {
      return NextResponse.json(
        { error: 'Parameter yang dibutuhkan tidak lengkap (dateFrom, dateTo, atau hubId)' },
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

    const externalUrl = new URL(`${apiUrl}/results`);

    externalUrl.searchParams.append('dateFrom', dateFrom);
    externalUrl.searchParams.append('dateTo', dateTo);
    externalUrl.searchParams.append('limit', limit);
    externalUrl.searchParams.append('hubId', hubId);
    if (fields) {
      externalUrl.searchParams.append('fields', fields);
    }
    const externalResponse = await fetch(externalUrl.toString(), {
      headers: {
        Authorization: `Bearer ${apiToken}`,
        'Content-Type': 'application/json',
      },
    });

    const data = await externalResponse.json();

    if (!externalResponse.ok) {
      console.error('API eksternal (/results) error:', data);
      return NextResponse.json(
        {
          error: 'Gagal mengambil data results dari API eksternal',
          details: data,
        },
        {
          status: externalResponse.status,
        }
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error Results:', error);
    const errorMessage =
      error instanceof Error ? error.message : 'Kesalahan sistem tidak diketahui';
    return NextResponse.json(
      {
        error: 'Gagal mengambil atau memproses data results dari API eksternal',
        detail: errorMessage,
      },
      { status: 500 }
    );
  }
}
