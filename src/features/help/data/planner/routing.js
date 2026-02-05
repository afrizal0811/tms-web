export const routingTopic = [
  // INTRO
  {
    id: 'routing',
    category: 'planner',
    title: 'Rute (Routing)',
    blocks: [
      {
        type: 'text',
        content: `<p><span class='font-bold'>Modul Rute</span> (<span class='italic'>Routing</span>) adalah modul yang yang memungkinkan untuk melakukan perencanaan rute paling efisien untuk pengguna lapangan, baik dari segi jalur yang dilewati maupun jumlah kendaraan yang digunakan.</p>`,
      },
      {
        type: 'text',
        content: `<p>Di modul ini terdapat beberapa submodul untuk membantu memperoleh hasil perencanaan yang efisien dan optimal, yaitu submodul <span class='font-bold'>Kunjungan</span> (<span class='italic'>Visit</span>), <span class='font-bold'>Konfigurasi</span> (<span class='italic'>Configuration</span>), dan <span class='font-bold'>Hasil</span> (<span class='italic'>Result</span>)</p>
        <div style="margin-top: 10px; margin-bottom: 10px; width: 100%;" class="mx-auto">
            <img src="/images/tutorial/planner/route-visit-1.png" alt="Submodul Visit" style="width: 100%; border-radius: 4px;" />
        </div>
        <div style="margin-top: 10px; margin-bottom: 10px; width: 100%;" class="mx-auto">
            <img src="/images/tutorial/planner/route-conf-1.png" alt="Submodul Configuration" style="width: 100%; border-radius: 4px;" />
        </div>
        <div style="margin-top: 10px; margin-bottom: 10px; width: 100%;" class="mx-auto">
            <img src="/images/tutorial/planner/route-result-1.png" alt="Submodul Result" style="width: 100%; border-radius: 4px;" />
        </div>
        `,
      },
    ],
    subTopics: [
      {
        id: 'routing-visit',
        title: 'Kunjungan',
        blocks: [
          {
            type: 'text',
            content: `<p>Pada subtopik ini akan dijelaskan mengenai submodul <span class='font-bold'>Kunjungan</span> (<span class='italic'>Visit</span>) yang digunakan sebagai pengaturan untuk tugas yang aktif pada tanggal terpilih. Perhatikan video berikut ini: </p>`,
          },
          {
            type: 'text',
            content: `
                <div style="margin-top: 10px; margin-bottom: 10px;">
                  <iframe 
                    width="100%" 
                    height="450" 
                    src="https://www.youtube.com/embed/A9v8--HmaTE" 
                    title="YouTube video player" 
                    frameborder="0" 
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                    allowfullscreen>
                  </iframe>
                </div>
                <p>Berikut ini penjelasannya:</p>
                <ul class="list-decimal pl-5 space-y-2 mt-2">
                <li>
                  <p>Di dalam submodul ini, ditampilkan daftar tugas yang aktif pada tanggal terpilih. <span class='italic'>Planner</span> dapat melakukan filter di kolom pencarian berdasarkan nama pelanggan, id pelanggan, atau nomor faktur. Tugas-tugas tersebut dapat dinonaktifkan supaya tidak terbawa proses <span class='italic'>routing</span>. Tugas yang sudah melalui proses <span class='italic'>routing</span>, akan bertanda <span class='underline'>truk biru</span> dengan keterangan pelat nomor kendaraan yang membawa. <span class='italic'>Planner</span> dapat melihat persebaran tugas untuk memeriksa bahwa tugas tersebut berada di lokasi yang sewajarnya. Tekan tombol Optimalisasi (<span class='italic'>Optimize</span>) untuk melakukan proses <span class='italic'>routing</span>.</p>
                  <div style="margin-top: 10px; margin-bottom: 10px; width: 100%;" class="mx-auto">
                      <img src="/images/tutorial/planner/route-visit-2.png" alt="Submodul Kunjungan" style="width: 100%; border-radius: 4px;" />
                  </div>
                </li>
                <li>
                  <p>Selain filter di kolom pencarian, filter dapat dilakukan berdasarkan status tugas (<span class='italic'>Unassigned</span> atau <span class='italic'>Ongoing</span>), tanggal mulai, alur, dan <span class='italic'>tag</span> yang digunakan dalam tugas.</p>
                  <div style="margin-top: 10px; margin-bottom: 10px; width: 45%;" class="mx-auto">
                      <img src="/images/tutorial/planner/route-visit-3.png" alt="Filter Kunjungan" style="width: 100%; border-radius: 4px;" />
                  </div>
                </li>
                <li>
                  <p>Saat menekan salah satu tugas, akan muncul detail dari tugas tersebut, yaitu nama tugas, alamat pelanggan, titik koordinat pelanggan, jam operasional pelanggan, lama kunjungan, <span class='italic'>tag</span>, pengelompokan kunjungan, prioritas, tonase, dan volume barang. Data-data tersebut dapat diubah oleh <span class='italic'>planner</span>, namun hanya bersifat <span class='font-bold'>sementara</span>.</p>
                  <div style="margin-top: 10px; margin-bottom: 10px; width: 45%;" class="mx-auto">
                      <img src="/images/tutorial/planner/route-visit-4.png" alt="Detail Tugas" style="width: 100%; border-radius: 4px;" />
                  </div>
                </li>
              </ul>
              `,
          },
        ],
      },
      {
        id: 'routing-configuration',
        title: 'Konfigurasi',
        blocks: [
          {
            type: 'text',
            content: `<p>Pada subtopik ini akan dijelaskan mengenai submodul <span class='font-bold'>Konfigurasi</span> (<span class='italic'>Configuration</span>) yang digunakan untuk pemilihan kendaraan dan parameter untuk menghitung rute terbaik. Perhatikan video berikut ini: </p>`,
          },
          {
            type: 'text',
            content: `
                <div style="margin-top: 10px; margin-bottom: 10px;">
                  <iframe 
                    width="100%" 
                    height="450" 
                    src="https://www.youtube.com/embed/GFM50wOW2VY" 
                    title="YouTube video player" 
                    frameborder="0" 
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                    allowfullscreen>
                  </iframe>
                </div>
                <p>Di dalam submodul ini akan dibagi menjadi beberapa bagian, yaitu pengaturan kendaraan, kecepatan, restriksi, dan <span class='italic'>cross docking</span>, parameter <span class='italic'>routing</span>, serta <span class='italic'>geotagging</span>. Konfigurasi tersebut dapat <span class='underline'>diubah-ubah</span> sesuai kebutuhan untuk membandingkan antar hasilnya, sehingga proses optimalisasi ini dapat dilakukan <span class='underline'>sebanyak mungkin</span> sampai menemukan hasil yang paling optimal untuk digunakan. </p>
                <div style="margin-top: 10px; margin-bottom: 10px; width: 100%;" class="mx-auto">
                    <img src="/images/tutorial/planner/route-conf-2.png" alt="Submodul Konfigurasi" style="width: 100%; border-radius: 4px;" />
                </div>
              `,
          },
          {
            type: 'text',
            content: `
                <p class='font-bold text-2xl underline mb-2'>Pengaturan Kendaraan</p>             
                <p>Di dalam bagian ini ditampilkan daftar kendaraan yang tersedia. Kolom pencarian berdasarkan pelat nomor kendaraan atau <span class='italic'>tag</span> yang dimiliki tiap kendaraan. <span class='italic'>Planner</span> hanya dapat mengubah status (aktif/non-aktif) pada kendaraan yang akan digunakan dalam proses pengiriman. <span class='font-bold'> Untuk menghapus atau mengubah detail kendaraan, harap hubungi admin</span>. Kendaraan yang sudah melalui proses <span class='italic'>routing</span>, akan bertanda <span class='underline'>box biru</span> dengan keterangan jumlah tugas yang dikerjakan.</p>
                <div style="margin-top: 10px; margin-bottom: 10px; width: 45%;" class="mx-auto">
                    <img src="/images/tutorial/planner/route-conf-3.png" alt="Pengaturan Kendaraan" style="width: 100%; border-radius: 4px;" />
                </div>
              `,
          },
          {
            type: 'text',
            content: `
                <p class='font-bold text-2xl underline mb-2'>Pengaturan Kecepatan, Restriksi, dan <span class='italic'>Cross Docking</span></p>             
                <p>Di dalam bagian ini ditampilkan pengaturan kecepatan, restriksi/batasan, serta <span class='italic'>cross docking</span> yang digunakan dalam proses <span class='italic'>routing</span>. Pengaturan yang digunakan saat ini (seperti di gambar) adalah pengaturan <span class='italic'>default</span>, namun dapat diubah sesuai kebutuhan. <span class='font-bold'> Untuk mengubah pengaturan ini, harap konfirmasi dengan admin</span>. </p>
                <div style="margin-top: 10px; margin-bottom: 10px; width: 50%;" class="mx-auto">
                    <img src="/images/tutorial/planner/route-conf-4.png" alt="Pengaturan Kecepatan, Restriksi, dan Cross Docking" style="width: 100%; border-radius: 4px;" />
                </div>
              `,
          },
          {
            type: 'text',
            content: `
            <p class='font-bold text-2xl underline mb-2'>Pengaturan Parameter</p>             
            <p>Di dalam bagian ini ditampilkan pengaturan paramater yang dapat diatur untuk memperoleh rute terbaik. Sesuaikan konfigurasi ini sesuai kebutuhan.</p>
            <div style="margin-top: 10px; margin-bottom: 10px; width: 80%;" class="mx-auto">
                <img src="/images/tutorial/planner/route-conf-5.png" alt="Pengaturan Kecepatan, Restriksi, dan Cross Docking" style="width: 100%; border-radius: 4px;" />
            </div>
            <p>Berikut penjelasan untuk masing-masing parameter:</p>
            <ol class="list-decimal pl-5 space-y-2 mt-2">
              <li>
                <p class="font-bold">Gunakan Semua Kendaraan</p>
                <p>Gunakan Semua Kendaraan (<span class='italic'>Use All Vehicle</span>) yaitu saat diaktifkan, <span class='italic'>routing</span> akan menggunakan semua kendaraan yang tersedia daripada meminimalisir penggunaan jumlah kendaraan.</p>
              </li>                
              <li>
                <p class="font-bold">Multi Perjalanan</p>
                <p>Multi Perjalanan (<span class='italic'>Multi Trip</span>) yaitu saat diaktifkan,  kendaraan akan diperbolehkan untuk kembali ke hub utama untuk mengatur ulang kapasitas kendaraan. Hal ini memungkinkan setiap kendaraan melakukan lebih dari satu perjalanan dalam sehari.</p>
              </li>                
              <li>
                <p class="font-bold">Kembali ke Hub</p>
                <p>Kembali ke Hub (<span class='italic'>Return to Hub</span>) yaitu saat diaktifkan, maka akan ditambahkan hub di akhir perjalanan, sehingga kendaraan harus kembali ke hub sebelum waktu kerja berakhir.</p>
              </li>                
              <li>
                <p class="font-bold">Penggabungan Otomatis</p>
                <p>Penggabungan Otomatis (<span class='italic'>Auto Merge</span>) yaitu saat diaktifkan,  setiap kali ada lebih dari satu tugas dengan koordinat latitude dan longitude yang sama akan dianggap sebagai satu tugas supaya tugas tersebut bisa dibawa oleh kendaraan yang sama.</p>
              </li>                
              <li>
                <p class="font-bold">Pemisahan Otomatis</p>
                <p>Pemisahan Otomatis (<span class='italic'>Auto Split</span>) yaitu saat diaktifkan, setiap kali ada tugas dengan kapasitas melebihi kapasitas maksimum kendaraan terpilih, sistem akan membagi tugas tersebut menjadi dua atau lebih supaya dapat dimuat ke satu atau lebih kendaraan. Pemisahannya dapat dilakukan melalui dua cara, yaitu:</p>
                <ol class="list-[lower-alpha] pl-5 space-y-2 mt-2">
                  <li>
                    <p class="font-bold">Pemisahan dengan Kapasitas yang Sama</p>
                    <p>Pemisahan dengan Kapasitas yang Sama (<span class='italic'>Split Capacity Equally</span>) yaitu distribusi kelebihan muatan dari tugas akan dibagi ke kendaraan secara merata untuk tiap kendaraannya.</p>
                  </li>
                  <li>
                    <p class="font-bold">Memaksimalkan Kapasitas Kendaraan</p>
                    <p>Memaksimalkan Kapasitas Kendaraan (<span class='italic'>Maximize Vehicle Capacity</span>) yaitu distribusi kelebihan muatan dari tugas akan dibagi ke satu kendaraan hingga mencapai kapasitas maksimalnya, lalu sisanya akan dimuat ke kendaraan lain, dan begitu seterusnya.</p>
                  </li>
                </ol> 
              </li>                
              <li>
                <p class="font-bold">Pengelompokkan</p>
                <p>Pemisahan Otomatis (<span class='italic'>Clustering</span>) yaitu saat diaktifkan, hasil optimalisasi akan meminimalisir terjadinya tumpang tindih area antar kendaraan. Pengelompokkan dapat menjadi dua cara, yaitu:</p>
                <ol class="list-[lower-alpha] pl-5 space-y-2 mt-2">
                  <li>
                    <p class="font-bold">Minimalkan Tumpah Tindih</p>
                    <p>Minimalkan Tumpah Tindih (<span class='italic'>Minimum overlap</span>) yaitu hasil optimalisasi akan meminimalisir tumpang tindih antara rute kendaraan berbeda.</p>
                  </li>
                  <li>
                    <p class="font-bold">Memaksimalkan Kapasitas Kendaraan</p>
                    <p>Memaksimalkan Kapasitas Kendaraan(<span class='italic'>No overlap</span>) yaitu hasil optimalisasi akan mencegah terjadinya tumpah tindih antar rute kendaraan berbeda, tetapi akan menggunakan lebih banyak kendaraan.</p>
                  </li>
                </ol> 
              </li>
              <li>
                <p class="font-bold">Hindari Jalan Tol</p>
                <p>Hindari Jalan Tol (<span class='italic'>Avoid Toll Roads</span>) yaitu saat diaktifkan, maka rute pengiriman akan menghindari penggunaan jalan bebas hambatan (tol).</p>
              </li>                
              <li>
                <p class="font-bold">Ganjil Genap</p>
                <p>Ganjil Genap (<span class='italic'>Odd Even</span>) yaitu saat diaktifkan, maka akan menerapkan aturan ganjil genap pada rute pengiriman. Pilih tanggal pengiriman saat menerapkan parameter ini.</p>
              </li>                
            </ol>`,
          },
          {
            type: 'text',
            content: `
                <p class='font-bold text-2xl underline mb-2'><span class='italic'>Geotagging</span></p>             
                <p>Di dalam bagian ini ditampilkan pengaturan <span class='italic'>geotagging</span> yang memungkinkan untuk menetapkan <span class='italic'>tag</span> berdasarkan area geografis. <span class='italic'>Planner</span> dapat menambahkan dan mengubah lokasi dari <span class='italic'>tag</span> tersebut. <span class='font-bold'>Untuk menghapus <span class='italic'>tag</span> yang sudah ada, harap hubungi admin.</span></p>
                <div style="margin-top: 10px; margin-bottom: 10px; width: 60%;" class="mx-auto">
                    <img src="/images/tutorial/planner/route-conf-6.png" alt="Pengaturan Geotagging" style="width: 100%; border-radius: 4px;" />
                </div>
              `,
          },
          {
            type: 'text',
            content: `          
                <p>Saat ingin membuat <span class='italic'>tag</span> baru, masukkan nama <span class='italic'>tag</span> dan tekan tombol yang tersedia, lalu muncul jendela penambahan <span class='italic'>geotagging</span> Tentukan area yang dibutuhkan, lalu tekan tombol <span class='italic'>Submit</span> untuk menyimpan, tekan tombol <span class='italic'>Reset</span> untuk mengulangi, dan tekan tombol <span class='italic'>Cancel</span> untuk membatalkan.</p>
                <div style="margin-top: 10px; margin-bottom: 10px; width: 100%;" class="mx-auto">
                    <img src="/images/tutorial/planner/route-conf-7.png" alt="Tambah Area Geotagging" style="width: 100%; border-radius: 4px;" />
                </div>
              `,
          },
          {
            type: 'text',
            content: `          
                <p>Setelah <span class='italic'>tag</span> berhasil terbuat, tambahkan <span class='italic'>geotagging</span> tersebut di kendaraan yang diinginkan. <span class='font-bold'>Harap hubungi admin.</span></p>
                <div style="margin-top: 10px; margin-bottom: 10px; width: 100%;" class="mx-auto">
                    <img src="/images/tutorial/planner/route-conf-8.png" alt="Tambah Geotagging di Kendaraan" style="width: 100%; border-radius: 4px;" />
                </div>
              `,
          },
        ],
      },
    ],
  },
];
