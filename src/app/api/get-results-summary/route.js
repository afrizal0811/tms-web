// File: app/api/get-results-summary/route.js

import {
    NextResponse
} from 'next/server';

export async function GET(request) {
    try {
        // ... (kode ambil params tetap sama) ...
        const {
            searchParams
        } = new URL(request.url);
        const dateFrom = searchParams.get('dateFrom');
        const dateTo = searchParams.get('dateTo');
        const limit = searchParams.get('limit') || 500;
        const hubId = searchParams.get('hubId');

        if (!dateFrom || !dateTo || !hubId) {
            // ... (error handling tetap sama) ...
        }

        // ... (kode ambil apiUrl & apiToken tetap sama) ...
        const apiUrl = process.env.NEXT_PUBLIC_API_URL;
        const apiToken = process.env.API_TOKEN;
        if (!apiUrl || !apiToken) {
            // ... (error handling tetap sama) ...
        }

        // --- UBAH DI SINI ---
        // Ganti endpoint dari '/routes' menjadi '/results'
        const externalUrl = new URL(`${apiUrl}/results`);
        // --- SELESAI PERUBAHAN ---

        externalUrl.searchParams.append('dateFrom', dateFrom);
        externalUrl.searchParams.append('dateTo', dateTo);
        externalUrl.searchParams.append('limit', limit);
        externalUrl.searchParams.append('hubId', hubId);

        const externalResponse = await fetch(externalUrl.toString(), {
            headers: {
                'Authorization': `Bearer ${apiToken}`,
                'Content-Type': 'application/json',
            },
        });

        const data = await externalResponse.json();

        if (!externalResponse.ok) {
            console.error('API eksternal (/results) error:', data); // Update log
            return NextResponse.json({
                    error: 'Gagal mengambil data results dari API eksternal',
                    details: data
                }, // Update pesan error
                {
                    status: externalResponse.status
                }
            );
        }

        return NextResponse.json(data);

    } catch (error) {
        console.error('Internal server error di get-results-summary:', error); // Update log
        return NextResponse.json({
            error: 'Internal server error.'
        }, {
            status: 500
        });
    }
}