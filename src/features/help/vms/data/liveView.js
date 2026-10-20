export const liveViewTopic = [
  {
    id: 'live-view',
    category: 'planner',
    title: 'Live View',
    blocks: [
      {
        type: 'text',
        content: `<p>Menu <strong>Live View</strong> adalah menu untuk memantau pergerakan kendaraan secara <em>real-time</em>. </p>
          <div style="margin-top: 10px; margin-bottom: 10px; width: 100%;" class="mx-auto">
              <img src="/images/tutorial/planner/vms/live-1.png" alt="Live View" style="width: 100%; border-radius: 4px;" />
          </div>`,
      },
      {
        type: 'text',
        content: `<p>Di sebelah kanan, terdapat informasi umum mengenai kendaraan. Saat ini ada beberapa keterangan umum terkait kendaraan, yaitu nomor polisi, tipe penyimpanan, kecepatan terkini, serta nama sopir. Selain itu, kendaraan juga dibedakan berdasarkan warna statusnya. Berikut adalah keterangan mengenai status tersebut:</p>
        <ul class="list-decimal pl-5 space-y-2 mt-2">
          <li>
              <p class="font-bold">Berjalan (<em>Moving</em>)</p>
              <p>Kendaraan yang bergerak untuk melakukan pengiriman.</p>
          </li>
          <li>
              <p class="font-bold">Diam (<em>Idle</em>)</p>
              <p>Kendaraan yang diam dengan kondisi mesin masih menyala.</p>
          </li>
          <li>
            <p class="font-bold">Parkir (<em>Parking</em>)</p>
            <p>Kendaraan yang diam dengan kondisi mesin mati. Umumnya terjadi pada kendaraan <em>frozen</em> karena menggunakan supaya suhu tetap dingin.</p>
          </li>
          <li>
            <p class="font-bold"><em>Offline</em></p>
            <p>Kendaraan yang tidak terhubung dengan jaringan internet ataupun ada masalah pada perangkat yang digunakan.</p>
          </li>
        </ul>`,
      },
      {
        type: 'text',
        content: `<p>Khusus untuk kendaraan jenis <em>frozen</em>, terdapat informasi suhu kendaraan yang diperbarui <strong>tiap 5 detik</strong> seperti halnya dengan posisi kendaraan.</p>
          <div style="margin-top: 10px; margin-bottom: 10px; width: 100%;" class="mx-auto">
              <img src="/images/tutorial/planner/vms/live-2.png" alt="Sensor Suhu" style="width: 100%; border-radius: 4px;" />
          </div>`,
      },
      {
        type: 'text',
        content: `<p>Selain bisa memantau posisi kendaraan secara <em>real-time</em>, <em>planner</em> dapat melihat riwayat perjalanan kendaraan dengan memilih salah satu kendaraan yang diingin dilihat, lalu menekan tombol <strong>Riwayat Perjalanan</strong> (<em>Trip History</em>). Riwayat perjalanan kendaraan tersedia untuk <strong>3 bulan terakhir</strong>. <em>Planner</em> bisa memilih kendaraan dan rentang tanggal yang diinginkan. Terdapat riwayat perjalanan serta rangkuman performa sopir yang tercatat.</p>
          <div style="margin-top: 10px; margin-bottom: 10px; width: 100%;" class="mx-auto">
              <img src="/images/tutorial/planner/vms/live-3.1.png" alt="Riwayat  - 1" style="width: 100%; border-radius: 4px;" />
          </div>
          <div style="margin-top: 10px; margin-bottom: 10px; width: 100%;" class="mx-auto">
              <img src="/images/tutorial/planner/vms/live-3.2.png" alt="Riwayat Perjalanan - 2" style="width: 100%; border-radius: 4px;" />
          </div>
          `,
      },
    ],
  },
];
