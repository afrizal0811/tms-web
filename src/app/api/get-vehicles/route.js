// File: app/api/get-vehicles/route.js

import {
    NextResponse
} from 'next/server';

export async function GET(request) {
    try {
        // 1. Ambil query params dari request client (page.js)
        const {
            searchParams
        } = new URL(request.url);
        const hubId = searchParams.get('hubId');
        const limit = searchParams.get('limit') || 50; // Default limit 50

        if (!hubId) {
            return NextResponse.json({
                error: 'Missing required query parameter: hubId'
            }, {
                status: 400
            });
        }

        // 2. Ambil variabel rahasia
        const apiUrl = process.env.NEXT_PUBLIC_API_URL;
        const apiToken = process.env.API_TOKEN;

        if (!apiUrl || !apiToken) {
            return NextResponse.json({
                error: 'Variabel API tidak diatur di server.'
            }, {
                status: 500
            });
        }

        // 3. Buat URL dengan params
        const externalUrl = new URL(`${apiUrl}/vehicles`);
        externalUrl.searchParams.append('hubId', hubId);
        externalUrl.searchParams.append('limit', limit);

        // 4. Panggil API eksternal DARI SERVER
        const externalResponse = await fetch(externalUrl.toString(), {
            headers: {
                'Authorization': `Bearer ${apiToken}`,
                'Content-Type': 'application/json',
            },
        });

        const data = await externalResponse.json();

        if (!externalResponse.ok) {
            console.error('API eksternal (/vehicles) error:', data);
            return NextResponse.json({
                error: 'Gagal mengambil data vehicles',
                details: data
            }, {
                status: externalResponse.status
            });
        }

        // 5. Kirim kembali data
        return NextResponse.json(data);

    } catch (error) {
        console.error('Internal server error di get-vehicles:', error);
        return NextResponse.json({
            error: 'Internal server error.'
        }, {
            status: 500
        });
    }
}