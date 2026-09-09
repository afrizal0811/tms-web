import { NextResponse } from 'next/server';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const location = searchParams.get('location');
  searchParams.delete('location');

  try {
    const apiUrl = process.env.NEXT_PUBLIC_MCEASY_API_URL;
    const apiToken = process.env.MCEASY_API_TOKEN;

    const res = await fetch(`${apiUrl}/vehicles/statuses?${searchParams.toString()}`, {
      headers: {
        Authorization: `Bearer ${apiToken}`,
        'Content-Type': 'application/json',
      },
    });

    const data = await res.json();
    let result = data.data || data;

    if (location && Array.isArray(result)) {
      result = result.filter((item) => item.vehicleGroups?.includes(location));
    }

    return NextResponse.json(result, { status: res.ok ? 200 : res.status });
  } catch (error) {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
