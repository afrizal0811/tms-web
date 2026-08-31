// File: app/api/get-tasks/route.js

import { NextResponse } from 'next/server';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const hubId = searchParams.get('hubId');
    const timeFrom = searchParams.get('timeFrom');
    const timeTo = searchParams.get('timeTo');
    const status = searchParams.get('status');
    const timeBy = searchParams.get('timeBy');
    const limit = searchParams.get('limit') || 1000;
    const fields = searchParams.get('fields');

    if (!timeFrom || !timeTo || !status || !timeBy) {
      return NextResponse.json({ error: 'Missing required query parameters' }, { status: 400 });
    }

    const apiUrl = process.env.NEXT_PUBLIC_API_URL;
    const apiToken = process.env.API_TOKEN;

    if (!apiUrl || !apiToken) {
      return NextResponse.json({ error: 'Variabel API tidak diatur di server.' }, { status: 500 });
    }

    const fetchTasksPage = async (pageNumber) => {
      const externalUrl = new URL(`${apiUrl}/tasks`);
      if (hubId) {
        externalUrl.searchParams.append('hubId', hubId);
      }
      externalUrl.searchParams.append('timeFrom', timeFrom);
      externalUrl.searchParams.append('timeTo', timeTo);
      externalUrl.searchParams.append('status', status);
      externalUrl.searchParams.append('timeBy', timeBy);
      externalUrl.searchParams.append('limit', limit);
      externalUrl.searchParams.append('page', pageNumber);
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

    const firstPageData = await fetchTasksPage(1);

    if (!firstPageData || !firstPageData.tasks || !Array.isArray(firstPageData.tasks.data)) {
      return NextResponse.json(firstPageData);
    }
    let allTasks = [...firstPageData.tasks.data];
    const lastPage = firstPageData.tasks.last_page || 1;

    if (lastPage > 1) {
      const promises = [];
      for (let page = 2; page <= lastPage; page++) {
        promises.push(fetchTasksPage(page));
      }
      const remainingPages = await Promise.all(promises);

      remainingPages.forEach((pageData) => {
        if (pageData.tasks && Array.isArray(pageData.tasks.data)) {
          allTasks = allTasks.concat(pageData.tasks.data);
        }
      });
    }

    firstPageData.tasks.data = allTasks;
    firstPageData.tasks.to = allTasks.length;
    firstPageData.tasks.total = allTasks.length;

    return NextResponse.json(allTasks);
  } catch (error) {
    console.error('Error Tasks:', error);
    const errorMessage =
      error instanceof Error ? error.message : 'Kesalahan sistem tidak diketahui';
    return NextResponse.json(
      {
        error: 'Gagal mengambil atau memproses data tasks dari API eksternal',
        detail: errorMessage,
      },
      { status: 500 }
    );
  }
}
