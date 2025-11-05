// File: app/api/get-hubs/route.js

import {
    NextResponse
} from 'next/server';
import toast from 'react-hot-toast';

export async function GET() {
    // Ambil variabel rahasia dari server
    const apiUrl = process.env.NEXT_PUBLIC_API_URL;
    const apiToken = process.env.API_TOKEN;

    // Pastikan variabel ada
    if (!apiUrl || !apiToken) {
        return NextResponse.json({
            error: 'Variabel API tidak diatur di server.'
        }, {
            status: 500
        });
    }

    try {
        // Panggil API eksternal DARI SERVER, dengan token
        const externalResponse = await fetch(`${apiUrl}/hubs`, { // <-- Endpoint diubah ke /hubs
            headers: {
                'Authorization': `Bearer ${apiToken}`, // <-- Menggunakan token
                'Content-Type': 'application/json',
            },
        });

        // Jika API eksternal gagal, teruskan errornya
        if (!externalResponse.ok) {
            const errorData = await externalResponse.json();
            console.error('API eksternal (/hubs) error:', errorData);
            return NextResponse.json({
                error: 'Gagal mengambil data hubs dari API eksternal',
                details: errorData
            }, {
                status: externalResponse.status
            });
        }

        // Jika berhasil, ambil data JSON-nya
        const data = await externalResponse.json();

        // Kirim kembali data itu ke browser (client)
        return NextResponse.json(data);

    } catch (error) {
        console.error('Internal server error di get-hubs:', error);
        return NextResponse.json({
            error: 'Internal server error.'
        }, {
            status: 500
        });
    }
}