import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const EXPIRY_MS = 10 * 60 * 1000;

export async function POST(request) {
  try {
    const data = await request.json();

    const filePath = path.join(process.cwd(), 'public', 'webhook-result.json');

    let existing = {};
    try {
      const raw = fs.readFileSync(filePath, 'utf-8');
      existing = JSON.parse(raw);
    } catch (e) {
      existing = {};
    }

    const imei = data?.event?.data?.imei;
    if (imei) {
      existing[imei] = data;
    }

    const now = Date.now();
    Object.keys(existing).forEach((key) => {
      const eventTime = existing[key]?.event_time;
      if (!eventTime || now - eventTime > EXPIRY_MS) {
        delete existing[key];
      }
    });

    fs.writeFileSync(filePath, JSON.stringify(existing, null, 2));

    return NextResponse.json({ message: 'Data diterima' }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
