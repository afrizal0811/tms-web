import { NextResponse } from 'next/server';

export async function GET(request) {
  const { searchParams } = new URL(request.url);

  try {
    const apiUrl = process.env.NEXT_PUBLIC_MCEASY_API_URL;
    const apiToken = process.env.MCEASY_API_TOKEN;

    const res = await fetch(`${apiUrl}/users?${searchParams.toString()}`, {
      headers: {
        Authorization: `Bearer ${apiToken}`,
        'Content-Type': 'application/json',
      },
    });

    const data = await res.json();
    return NextResponse.json(data.data || data, { status: res.ok ? 200 : res.status });
  } catch (error) {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
