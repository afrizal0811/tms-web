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
            src="https://www.youtube.com/embed/dmf8TbYQtvo" 
            title="YouTube video player" 
            frameborder="0" 
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
            allowfullscreen>
            </iframe>
        </div>
        <p>Berikut ini penjelasannya: </p>
        <ul class="list-decimal pl-5 space-y-2 mt-2">
            <li>
                <p>Setelah melakukan <em>dispatch</em>, <em>planner</em> ke menu <strong>TMS Summary</strong> yang ada di <em>sidebar</em> sebelah kiri.</p>
                <div style="margin-top: 10px; margin-bottom: 10px; width: 100%;" class="mx-auto">
                    <img src="/images/tutorial/planner/tms/rk-1.png" alt="Routing Transaction - 1" style="width: 100%; border-radius: 4px;" />
                </div>
            </li>
            <li>
                <p>Di dalam <strong>TMS Summary</strong>, buka menu <strong>Delivery</strong> (<em>Pengiriman</em>) untuk melihat hasil <em>dispatch</em>.</p>
                <div style="margin-top: 10px; margin-bottom: 10px; width: 100%;" class="mx-auto">
                    <img src="/images/tutorial/planner/tms/rk-2.png" alt="Routing Transaction - 2" style="width: 100%; border-radius: 4px;" />
                </div>
            </li>
            <li>
                <p>Lakukan penyaringan data berdasarkan tanggal pengiriman. Kemudian, tekan tombol Unduh (<em>Download</em>) dan pilih <strong>Route Transaction</strong>. Dari hasil unduh tersebut, lakukan ekstrasi file zip.</p>
                <div style="margin-top: 10px; margin-bottom: 10px; width: 100%;" class="mx-auto">
                    <img src="/images/tutorial/planner/tms/rk-3.png" alt="Routing Transaction - 3" style="width: 100%; border-radius: 4px;" />
                </div>
            </li>
            <li>
                <p>Di <strong>Acumatica</strong>, lalu pilih halaman <strong class='italic'>Route Transaction</strong> (RK). Isikan data kendaraan yang akan digunakan, lalu tekan tombol <em>Upload Excel</em>.</p>
                <div style="margin-top: 10px; margin-bottom: 10px; width: 100%;" class="mx-auto">
                    <img src="/images/tutorial/planner/tms/rk-4.png" alt="Routing Transaction - 4" style="width: 100%; border-radius: 4px;" />
                </div>
            </li>
            <li>
                <p>Saat muncul <em>pop-up</em>, tekan tombol <em>Choose File</em> untuk memilih file ekstrasi sesuai dengan kendaraan yang akan digunakan. Lalu tekan tombol <em>upload</em>. Pada 2 <em>pop-up</em> selanjutnya, tekan tombol <em>OK</em>, lalu tunggu proses selesai. <strong>Jika terjadi kegagalan, harap hubungi admin.</strong>.</p>
                <div style="margin-top: 10px; margin-bottom: 10px; width: 100%;" class="mx-auto">
                    <img src="/images/tutorial/planner/tms/rk-5.png" alt="Routing Transaction - 5" style="width: 100%; border-radius: 4px;" />
                </div>
            </li>
            <li>
                <p>Saat proses berhasil, semua nomor faktur akan terpilih secara otomatis. Lakukan prosesnya sampai selesai dan ulangi untuk semua kendaraan</p>
                <div style="margin-top: 10px; margin-bottom: 10px; width: 100%;" class="mx-auto">
                    <img src="/images/tutorial/planner/tms/rk-6.png" alt="Routing Transaction - 6" style="width: 100%; border-radius: 4px;" />
                </div>
            </li>
        </ul>
        `,
      },
    ],
  },
];
