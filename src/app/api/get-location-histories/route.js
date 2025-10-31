// File: app/api/get-location-histories/route.js

import {
    NextResponse
} from 'next/server';

export async function GET(request) {
    try {
        // 1. Ambil params
        const {
            searchParams
        } = new URL(request.url);
        const timeFrom = searchParams.get('timeFrom');
        const timeTo = searchParams.get('timeTo');
        const limit = searchParams.get('limit') || 1000;
        const startFinish = searchParams.get('startFinish') || "true";
        const fields = searchParams.get('fields') || "finish,startTime,email";
        const timeBy = searchParams.get('timeBy') || "createdTime";

        if (!timeFrom || !timeTo) {
            return NextResponse.json({
                error: 'Missing required query parameters: timeFrom, timeTo'
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

        // 3. Buat URL
        const externalUrl = new URL(`${apiUrl}/location-histories`);
        externalUrl.searchParams.append('limit', limit);
        externalUrl.searchParams.append('startFinish', startFinish);
        externalUrl.searchParams.append('fields', fields);
        externalUrl.searchParams.append('timeFrom', timeFrom);
        externalUrl.searchParams.append('timeTo', timeTo);
        externalUrl.searchParams.append('timeBy', timeBy);

        // 4. Panggil API
        const externalResponse = await fetch(externalUrl.toString(), {
            headers: {
                'Authorization': `Bearer ${apiToken}`,
                'Content-Type': 'application/json',
            },
        });

        const data = await externalResponse.json();

        if (!externalResponse.ok) {
            return NextResponse.json({
                error: 'Gagal mengambil data location-histories',
                details: data
            }, {
                status: externalResponse.status
            });
        }

        // 5. Kirim kembali data
        return NextResponse.json(data);

    } catch (error) {
        return NextResponse.json({
            error: 'Internal server error.'
        }, {
            status: 500
        });
    }
}