// File: app/api/get-tasks/route.js

import { NextResponse } from 'next/server';

export async function GET(request) {
  try {
    // 1. Ambil semua params dari request client
    const { searchParams } = new URL(request.url);
    const hubId = searchParams.get('hubId');
    const timeFrom = searchParams.get('timeFrom');
    const timeTo = searchParams.get('timeTo');
    const status = searchParams.get('status');
    const timeBy = searchParams.get('timeBy');
    // Default limit internal per halaman (API membatasi max 1000)
    const limit = searchParams.get('limit') || 1000;
    const fields = searchParams.get('fields');

    // Cek parameter wajib
    if (!hubId || !timeFrom || !timeTo || !status || !timeBy) {
      return NextResponse.json({ error: 'Missing required query parameters' }, { status: 400 });
    }

    // 2. Ambil variabel rahasia
    const apiUrl = process.env.NEXT_PUBLIC_API_URL;
    const apiToken = process.env.API_TOKEN;

    if (!apiUrl || !apiToken) {
      return NextResponse.json({ error: 'Variabel API tidak diatur di server.' }, { status: 500 });
    }

    // --- FUNGSI HELPER UNTUK FETCH PER HALAMAN ---
    const fetchTasksPage = async (pageNumber) => {
      const externalUrl = new URL(`${apiUrl}/tasks`);
      externalUrl.searchParams.append('hubId', hubId);
      externalUrl.searchParams.append('timeFrom', timeFrom);
      externalUrl.searchParams.append('timeTo', timeTo);
      externalUrl.searchParams.append('status', status);
      externalUrl.searchParams.append('timeBy', timeBy);
      externalUrl.searchParams.append('limit', limit);
      externalUrl.searchParams.append('page', pageNumber); // Tambahkan parameter page
      if (fields) {
        externalUrl.searchParams.append('fields', fields);
      }

      const res = await fetch(externalUrl.toString(), {
        headers: {
          Authorization: `Bearer ${apiToken}`,
          'Content-Type': 'application/json',
        },
      });

      if (!res.ok) {
        throw new Error(`Error fetching page ${pageNumber}: ${res.statusText}`);
      }
      return res.json();
    };

    // 3. Ambil Halaman Pertama (Page 1)
    const firstPageData = await fetchTasksPage(1);

    // Validasi struktur response (sesuai screenshot user)
    if (!firstPageData || !firstPageData.tasks || !Array.isArray(firstPageData.tasks.data)) {
      // Jika error atau kosong, kembalikan apa adanya
      return NextResponse.json(firstPageData);
    }

    // Siapkan wadah untuk semua data
    let allTasks = [...firstPageData.tasks.data];
    const lastPage = firstPageData.tasks.last_page || 1;

    // 4. Jika ada lebih dari 1 halaman, ambil sisanya secara Paralel
    if (lastPage > 1) {
      const promises = [];
      // Loop dari page 2 sampai last_page
      for (let page = 2; page <= lastPage; page++) {
        promises.push(fetchTasksPage(page));
      }

      // Tunggu semua halaman selesai diambil
      const remainingPages = await Promise.all(promises);

      // Gabungkan datanya
      remainingPages.forEach((pageData) => {
        if (pageData.tasks && Array.isArray(pageData.tasks.data)) {
          allTasks = allTasks.concat(pageData.tasks.data);
        }
      });
    }

    // 5. Modifikasi response object agar berisi SEMUA data
    // Kita timpa data di firstPageData dengan array gabungan
    firstPageData.tasks.data = allTasks;

    // Update metadata agar tidak membingungkan (opsional, tapi baik untuk debug)
    firstPageData.tasks.to = allTasks.length;
    firstPageData.tasks.total = allTasks.length;

    // Logika penting: Kembalikan array langsung agar mempermudah Frontend
    // Karena di frontend kamu pakai Array.isArray(tasksRes), kita kirim array-nya saja.
    // JIKA code frontend kamu sebelumnya mengharapkan object utuh, ganti baris bawah jadi: return NextResponse.json(firstPageData);
    // Namun berdasarkan code RangkumanSummary.js yang kamu kasih, dia mengharapkan array dari apiService.
    return NextResponse.json(allTasks);
  } catch (error) {
    console.error('Error in get-tasks route:', error);
    return NextResponse.json(
      { error: 'Internal server error.', details: error.message },
      { status: 500 }
    );
  }
}
