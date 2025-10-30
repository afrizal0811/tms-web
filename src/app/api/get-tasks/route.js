// File: app/api/get-tasks/route.js

import {
    NextResponse
} from 'next/server';

export async function GET(request) {
    try {
        // 1. Ambil semua params dari request client (DeliverySummary.js)
        const {
            searchParams
        } = new URL(request.url);
        const hubId = searchParams.get('hubId');
        const timeFrom = searchParams.get('timeFrom');
        const timeTo = searchParams.get('timeTo');
        const status = searchParams.get('status');
        const timeBy = searchParams.get('timeBy');
        const limit = searchParams.get('limit');

        // Cek parameter wajib
        if (!hubId || !timeFrom || !timeTo || !status || !timeBy) {
            return NextResponse.json({
                error: 'Missing required query parameters'
            }, {
                status: 400
            });
        }

        // 2. Ambil variabel rahasia (API URL dan Token)
        const apiUrl = process.env.NEXT_PUBLIC_API_URL;
        const apiToken = process.env.API_TOKEN;

        if (!apiUrl || !apiToken) {
            return NextResponse.json({
                error: 'Variabel API tidak diatur di server.'
            }, {
                status: 500
            });
        }

        // 3. Buat URL eksternal dengan semua parameter
        const externalUrl = new URL(`${apiUrl}/tasks`);
        externalUrl.searchParams.append('hubId', hubId);
        externalUrl.searchParams.append('timeFrom', timeFrom);
        externalUrl.searchParams.append('timeTo', timeTo);
        externalUrl.searchParams.append('status', status);
        externalUrl.searchParams.append('timeBy', timeBy);
        externalUrl.searchParams.append('limit', limit || 1000);

        // 4. Panggil API eksternal DARI SERVER
        const externalResponse = await fetch(externalUrl.toString(), {
            headers: {
                'Authorization': `Bearer ${apiToken}`,
                'Content-Type': 'application/json',
            },
        });

        const data = await externalResponse.json();

        if (!externalResponse.ok) {
            return NextResponse.json({
                error: 'Gagal mengambil data tasks dari API eksternal',
                details: data
            }, {
                status: externalResponse.status
            });
        }

        // 5. Kirim kembali data ke browser
        return NextResponse.json(data);

    } catch (error) {
        return NextResponse.json({
            error: 'Internal server error.'
        }, {
            status: 500
        });
    }
}