export const routeTransactionTopic = [
  // INTRO
  {
    id: 'route-transaction',
    category: 'planner',
    title: 'Route Transaction',
    blocks: [
      {
        type: 'text',
        content: `<p>Setelah <em>planner</em> berhasil melakukan <em>dispatch</em>, langkah selanjutnya yaitu membuat <strong class='italic'>Route Transaction</strong> (RK) di <strong>Acumatica</strong> berdasarkan hasil optimalisasi tersebut.</p>
        <p class='underline mb-2'>Perhatikan video berikut ini:</p>
        <div style="margin-top: 10px; margin-bottom: 10px;">
            <iframe 
            width="100%" 
            height="450" 
            src="https://www.youtube.com/embed/tbBObQWUnuM" 
            title="YouTube video player" 
            frameborder="0" 
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
            allowfullscreen>
            </iframe>
        </div>
        <p>Berikut ini penjelasannya: </p>
        <ul class="list-decimal pl-5 space-y-2 mt-2">
            <li>
                <p>Setelah melakukan dispatch, <em>export</em> hasil optimalisasinya.</p>
                <div style="margin-top: 10px; margin-bottom: 10px; width: 100%;" class="mx-auto">
                    <img src="/images/tutorial/planner/rk-1.png" alt="Routing Transaction - 1" style="width: 100%; border-radius: 4px;" />
                </div>
            </li>
            <li>
                <p>Di <strong>Acumatica</strong>, buka halaman <strong class='italic'>Route Transaction</strong> (RK).</p>
                <div style="margin-top: 10px; margin-bottom: 10px; width: 100%;" class="mx-auto">
                    <img src="/images/tutorial/planner/rk-2.png" alt="Routing Transaction - 2" style="width: 100%; border-radius: 4px;" />
                </div>
            </li>
            <li>
                <p>Tambahkan data <em>routing</em> berdasarkan hasil <em>export</em> tersebut. Cari pelat nomor kendaraan serta nomor fakturnya.</p>
                <div style="margin-top: 10px; margin-bottom: 10px; width: 100%;" class="mx-auto">
                    <img src="/images/tutorial/planner/rk-3.png" alt="Routing Transaction - 3" style="width: 100%; border-radius: 4px;" />
                </div>
            </li>
            <li>
                <p>Lakukan prosesnya sampai selesai dan ulangi untuk semua kendaraan.</p>
                <div style="margin-top: 10px; margin-bottom: 10px; width: 100%;" class="mx-auto">
                    <img src="/images/tutorial/planner/rk-4.png" alt="Routing Transaction - 4" style="width: 100%; border-radius: 4px;" />
                </div>
            </li>
        </ul>
        `,
      },
    ],
  },
];
