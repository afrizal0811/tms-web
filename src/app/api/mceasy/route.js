import { NextResponse } from 'next/server';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const endpoint = searchParams.get('endpoint');
  const location = searchParams.get('location');

  if (!endpoint) {
    return NextResponse.json({ error: 'Parameter endpoint dibutuhkan' }, { status: 400 });
  }

  try {
    const apiUrl = process.env.NEXT_PUBLIC_MCEASY_API_URL;
    const apiToken = process.env.MCEASY_API_TOKEN;

    const res = await fetch(`${apiUrl}${endpoint}`, {
      headers: {
        Authorization: `Bearer ${apiToken}`,
        'Content-Type': 'application/json',
      },
    });

    const data = await res.json();
    let result = data.data || data;

    if (location && Array.isArray(result) && endpoint.includes('vehicles')) {
      result = result.filter((item) => item.vehicleGroups?.includes(location));
    }

    return NextResponse.json(result, { status: res.ok ? 200 : res.status });
  } catch (error) {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function PATCH(request) {
  const { searchParams } = new URL(request.url);
  const endpoint = searchParams.get('endpoint');

  if (!endpoint) {
    return NextResponse.json({ error: 'Parameter endpoint dibutuhkan' }, { status: 400 });
  }

  try {
    const apiUrl = process.env.NEXT_PUBLIC_MCEASY_API_URL;
    const apiToken = process.env.MCEASY_API_TOKEN;
    const bodyText = await request.text();

    const res = await fetch(`${apiUrl}${endpoint}`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${apiToken}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: bodyText,
    });

    const data = await res.json();
    return NextResponse.json(data, { status: res.ok ? 200 : res.status });
  } catch (error) {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
