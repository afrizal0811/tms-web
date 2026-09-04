import fs from 'fs';
import { NextResponse } from 'next/server';
import path from 'path';

const EXPIRY_MS = 10 * 60 * 1000;
const FILE_PATH = path.join(process.cwd(), 'tracking-data.json');

export async function POST(request) {
  try {
    const data = await request.json();
    let existing = {};

    if (fs.existsSync(FILE_PATH)) {
      try {
        const raw = fs.readFileSync(FILE_PATH, 'utf-8');
        existing = JSON.parse(raw);
      } catch (e) {
        existing = {};
      }
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

    fs.writeFileSync(FILE_PATH, JSON.stringify(existing, null, 2));

    return NextResponse.json({ message: 'Data diterima' }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function GET() {
  try {
    let data = {};
    if (fs.existsSync(FILE_PATH)) {
      const raw = fs.readFileSync(FILE_PATH, 'utf-8');
      data = JSON.parse(raw);
    }
    return NextResponse.json(data, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
