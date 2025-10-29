// File: app/api/get-results/route.js

import {
    NextResponse
} from 'next/server';

export async function GET() {
    // Ambil variabel dari .env.local (ini aman, ini adalah server)
    const apiUrl = process.env.NEXT_PUBLIC_API_URL;
    const apiToken = process.env.API_TOKEN;

    // Cek apakah variabel ada
    if (!apiUrl || !apiToken) {
        return NextResponse.json({
            error: 'Variabel API tidak diatur di server.'
        }, {
            status: 500
        });
    }

    try {
        // 1. Panggil API eksternal DARI SERVER
        // Kita tambahkan 'Authorization' header menggunakan token rahasia
        const externalResponse = await fetch(`${apiUrl}/results`, {
            headers: {
                'Authorization': `Bearer ${apiToken}`, // Sesuaikan 'Bearer' jika formatnya beda
                'Content-Type': 'application/json',
            },
        });

        // 2. Jika API eksternal gagal, teruskan errornya
        if (!externalResponse.ok) {
            const errorData = await externalResponse.json();
            return NextResponse.json({
                error: 'Gagal mengambil data dari API eksternal',
                details: errorData
            }, {
                status: externalResponse.status
            });
        }

        // 3. Jika berhasil, ambil data JSON-nya
        const data = await externalResponse.json();

        // 4. Kirim kembali data itu ke browser (client)
        return NextResponse.json(data);

    } catch (error) {
        console.error('Internal server error:', error);
        return NextResponse.json({
            error: 'Internal server error.'
        }, {
            status: 500
        });
    }
}