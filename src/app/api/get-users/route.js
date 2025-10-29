// File: app/api/get-users/route.js

import {
    NextResponse
} from 'next/server';

export async function GET(request) {
    try {
        // 1. Ambil query params
        const {
            searchParams
        } = new URL(request.url);
        const hubId = searchParams.get('hubId');
        const roleId = searchParams.get('roleId'); // Ini akan jadi null jika tidak dikirim
        const status = searchParams.get('status');

        // roleId sekarang opsional, jadi kita hapus dari pengecekan
        if (!hubId || !status) {
            return NextResponse.json({
                error: 'Missing required query parameters: hubId, status'
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
        const externalUrl = new URL(`${apiUrl}/users`);
        externalUrl.searchParams.append('hubId', hubId);
        externalUrl.searchParams.append('status', status);

        // !! PENTING: Hanya tambahkan roleId JIKA ada
        if (roleId) {
            externalUrl.searchParams.append('roleId', roleId);
        }

        // 4. Panggil API eksternal
        const externalResponse = await fetch(externalUrl.toString(), {
            headers: {
                'Authorization': `Bearer ${apiToken}`,
                'Content-Type': 'application/json',
            },
        });

        const data = await externalResponse.json();

        if (!externalResponse.ok) {
            console.error('API eksternal (/users) error:', data);
            return NextResponse.json({
                error: 'Gagal mengambil data users dari API eksternal',
                details: data
            }, {
                status: externalResponse.status
            });
        }

        // 5. Kirim kembali data
        return NextResponse.json(data);

    } catch (error) {
        console.error('Internal server error di get-users:', error);
        return NextResponse.json({
            error: 'Internal server error.'
        }, {
            status: 500
        });
    }
}