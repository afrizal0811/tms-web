import { NextResponse } from 'next/server';

export async function PATCH(request, { params }) {
  const resolvedParams = await params;
  const id = resolvedParams.id;

  try {
    const apiUrl = process.env.NEXT_PUBLIC_MCEASY_API_URL;
    const apiToken = process.env.NEXT_PUBLIC_MCEASY_API_TOKEN;
    const bodyText = await request.text();

    const res = await fetch(`${apiUrl}/vehicles/${id}`, {
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
