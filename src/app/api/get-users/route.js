import { NextResponse } from 'next/server';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const hubId = searchParams.get('hubId');
    const q = searchParams.get('q');
    const roleId = searchParams.get('roleId');

    const apiUrl = process.env.NEXT_PUBLIC_API_URL;
    const apiToken = process.env.API_TOKEN;

    if (!apiUrl || !apiToken) {
      return NextResponse.json(
        {
          error: 'Variabel API tidak diatur di server.',
        },
        {
          status: 500,
        }
      );
    }

    const externalUrl = new URL(`${apiUrl}/users`);

    if (q) externalUrl.searchParams.append('q', q);
    if (hubId) externalUrl.searchParams.append('hubId', hubId);
    if (roleId) externalUrl.searchParams.append('roleId', roleId);
    externalUrl.searchParams.append('status', 'active');

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
          error: 'Gagal mengambil data users dari API eksternal',
          details: data,
        },
        {
          status: externalResponse.status,
        }
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error Users:', error);
    const errorMessage =
      error instanceof Error ? error.message : 'Kesalahan sistem tidak diketahui';
    return NextResponse.json(
      { error: 'Gagal memproses permintaan data users', detail: errorMessage },
      { status: 500 }
    );
  }
}
