export const routingTopic = [
  // INTRO
  {
    id: 'routing',
    category: 'planner',
    title: 'Rute (Routing)',
    blocks: [
      {
        type: 'text',
        content: `<p><span class='font-bold'>Menu Rute</span> (<span class='italic'>Routing</span>) adalah menu yang yang memungkinkan untuk melakukan perencanaan rute paling efisien untuk pengguna lapangan, baik dari segi jalur yang dilewati maupun jumlah kendaraan yang digunakan.</p>`,
      },
      {
        type: 'text',
        content: `<p>Di menu ini terdapat beberapa submenu untuk membantu memperoleh hasil perencanaan yang efisien dan optimal, yaitu submenu <span class='font-bold'>Kunjungan</span> (<span class='italic'>Visit</span>), <span class='font-bold'>Konfigurasi</span> (<span class='italic'>Configuration</span>), dan <span class='font-bold'>Hasil</span> (<span class='italic'>Result</span>)</p>
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
        title: 'Submenu Kunjungan',
        blocks: [
          {
            type: 'text',
            content: `<p>Pada bagian ini akan dijelaskan mengenai submenu <span class='font-bold'>Kunjungan</span> (<span class='italic'>Visit</span>) yang digunakan sebagai pengaturan untuk tugas yang aktif pada tanggal terpilih.</p>
            <p class='underline mb-2'>Perhatikan video berikut ini:</p>`,
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
              <p>Di dalam submenu ini, ditampilkan daftar tugas yang aktif pada tanggal terpilih. <span class='italic'>Planner</span> dapat melakukan filter di kolom pencarian berdasarkan nama pelanggan, id pelanggan, atau nomor faktur. Tugas-tugas tersebut dapat dinonaktifkan supaya tidak terbawa proses <span class='italic'>routing</span>. Tugas yang sudah melalui proses <span class='italic'>routing</span>, akan bertanda <span class='underline'>truk biru</span> dengan keterangan pelat nomor kendaraan yang membawa. <span class='italic'>Planner</span> dapat melihat persebaran tugas untuk memeriksa bahwa tugas tersebut berada di lokasi yang sewajarnya. Tekan tombol Optimalisasi (<span class='italic'>Optimize</span>) untuk melakukan proses <span class='italic'>routing</span>.</p>
              <div style="margin-top: 10px; margin-bottom: 10px; width: 100%;" class="mx-auto">
                  <img src="/images/tutorial/planner/route-visit-2.png" alt="Submodul Kunjungan" style="width: 100%; border-radius: 4px;" />
              </div>
            `,
          },
          {
            type: 'text',
            content: `
              <p>Selain filter di kolom pencarian, filter dapat dilakukan berdasarkan status tugas (<span class='italic'>Unassigned</span> atau <span class='italic'>Ongoing</span>), tanggal mulai, alur, dan <span class='italic'>tag</span> yang digunakan dalam tugas.</p>
              <div style="margin-top: 10px; margin-bottom: 10px; width: 45%;" class="mx-auto">
                  <img src="/images/tutorial/planner/route-visit-3.png" alt="Filter Kunjungan" style="width: 100%; border-radius: 4px;" />
              </div>
            `,
          },
          {
            type: 'text',
            content: `
              <p>Saat menekan salah satu tugas, akan muncul detail dari tugas tersebut, yaitu nama tugas, alamat pelanggan, titik koordinat pelanggan, jam operasional pelanggan, lama kunjungan, <span class='italic'>tag</span>, pengelompokan kunjungan, prioritas, tonase, dan volume barang. Data-data tersebut dapat diubah oleh <span class='italic'>planner</span>, namun hanya bersifat <span class='font-bold'>sementara</span>.</p>
              <div style="margin-top: 10px; margin-bottom: 10px; width: 45%;" class="mx-auto">
                  <img src="/images/tutorial/planner/route-visit-4.png" alt="Detail Tugas" style="width: 100%; border-radius: 4px;" />
              </div>
            `,
          },
        ],
      },
      {
        id: 'routing-configuration',
        title: 'Submenu Konfigurasi',
        blocks: [
          {
            type: 'text',
            content: `
            <p>Pada bagian ini akan dijelaskan mengenai submenu <span class='font-bold'>Konfigurasi</span> (<span class='italic'>Configuration</span>) yang digunakan untuk pemilihan kendaraan dan parameter untuk menghitung rute terbaik. </p>
            <p>Semua parameter dan kendaraan yang digunakan dapat <span class='underline'>diubah-ubah</span> sesuai kebutuhan untuk membandingkan antar hasilnya, sehingga proses optimalisasi ini dapat dilakukan <span class='underline'>sebanyak mungkin</span> sampai menemukan hasil yang paling optimal untuk digunakan.</p>
            <p class='underline mb-2'>Perhatikan video berikut ini:</p>
            `,
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
                <p>Di dalam submenu ini akan dibagi menjadi beberapa bagian, yaitu pengaturan kendaraan, kecepatan, restriksi, dan <span class='italic'>cross docking</span>, parameter <span class='italic'>routing</span>, serta <span class='italic'>geotagging</span>. </p>
                <div style="margin-top: 10px; margin-bottom: 10px; width: 100%;" class="mx-auto">
                    <img src="/images/tutorial/planner/route-conf-2.png" alt="Submodul Konfigurasi" style="width: 100%; border-radius: 4px;" />
                </div>
              `,
          },
          {
            type: 'text',
            content: `
              <ul class="list-decimal pl-5 space-y-2 mt-2 section-list">
                <li>
                  <p class="section-title font-bold underline mb-2">Pengaturan Kendaraan</p>           
                    <p>Di dalam bagian ini ditampilkan daftar kendaraan yang tersedia. Kolom pencarian berdasarkan pelat nomor kendaraan atau <span class='italic'>tag</span> yang dimiliki tiap kendaraan. <span class='italic'>Planner</span> hanya dapat mengubah status (aktif/non-aktif) pada kendaraan yang akan digunakan dalam proses pengiriman. <span class='font-bold'> Untuk menghapus atau mengubah detail kendaraan, harap hubungi admin</span>. Kendaraan yang sudah melalui proses <span class='italic'>routing</span>, akan bertanda <span class='underline'>box biru</span> dengan keterangan jumlah tugas yang dikerjakan.</p>
                    <div style="margin-top: 10px; margin-bottom: 10px; width: 45%;" class="mx-auto">
                        <img src="/images/tutorial/planner/route-conf-3.png" alt="Pengaturan Kendaraan" style="width: 100%; border-radius: 4px;" />
                    </div>
                </li>
                <li>
                  <p class='section-title font-bold underline mb-2'>Pengaturan Kecepatan, Restriksi, dan <span class='italic'>Cross Docking</span></p>             
                  <p>Di dalam bagian ini ditampilkan pengaturan kecepatan, restriksi/batasan, serta <span class='italic'>cross docking</span> yang digunakan dalam proses <span class='italic'>routing</span>. Pengaturan yang digunakan saat ini (seperti di gambar) adalah pengaturan <span class='italic'>default</span>, namun dapat diubah sesuai kebutuhan. <span class='font-bold'> Untuk mengubah pengaturan ini, harap konfirmasi dengan admin</span>. </p>
                  <div style="margin-top: 10px; margin-bottom: 10px; width: 50%;" class="mx-auto">
                      <img src="/images/tutorial/planner/route-conf-4.png" alt="Pengaturan Kecepatan, Restriksi, dan Cross Docking" style="width: 100%; border-radius: 4px;" />
                  </div>
                </li>
                <li>
                  <p class='section-title font-bold underline mb-2'>Pengaturan Parameter</p>             
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
                  </ol>
                </li>
                <li>
                  <p class='section-title font-bold text-2xl underline mb-2 italic'>Geotagging</p>             
                  <p>Di dalam bagian ini ditampilkan pengaturan <span class='italic'>geotagging</span> yang memungkinkan untuk menetapkan <span class='italic'>tag</span> berdasarkan area geografis. <span class='italic'>Planner</span> dapat menambahkan dan mengubah lokasi dari <span class='italic'>tag</span> tersebut. <span class='font-bold'>Untuk menghapus <span class='italic'>tag</span> yang sudah ada, harap hubungi admin.</span></p>
                  <div style="margin-top: 10px; margin-bottom: 10px; width: 60%;" class="mx-auto">
                      <img src="/images/tutorial/planner/route-conf-6.png" alt="Pengaturan Geotagging" style="width: 100%; border-radius: 4px;" />
                  </div>
                  <p>Saat ingin membuat <span class='italic'>tag</span> baru, masukkan nama <span class='italic'>tag</span> dan tekan tombol yang tersedia, lalu muncul jendela penambahan <span class='italic'>geotagging</span>. Tentukan area yang dibutuhkan, lalu tekan tombol <span class='italic'>Submit</span> untuk menyimpan, tekan tombol <span class='italic'>Reset</span> untuk mengulangi, dan tekan tombol <span class='italic'>Cancel</span> untuk membatalkan.</p>
                  <div style="margin-top: 10px; margin-bottom: 10px; width: 100%;" class="mx-auto">
                      <img src="/images/tutorial/planner/route-conf-7.png" alt="Tambah Area Geotagging" style="width: 100%; border-radius: 4px;" />
                  </div>
                  <p>Setelah <span class='italic'>tag</span> berhasil terbuat, tambahkan <span class='italic'>geotagging</span> tersebut di kendaraan yang diinginkan. <span class='font-bold'>Harap hubungi admin.</span></p>
                  <div style="margin-top: 10px; margin-bottom: 10px; width: 100%;" class="mx-auto">
                      <img src="/images/tutorial/planner/route-conf-8.png" alt="Tambah Geotagging di Kendaraan" style="width: 100%; border-radius: 4px;" />
                  </div>
                </li>
              </ul>
              `,
          },
        ],
      },
      {
        id: 'routing-result',
        title: 'Submenu Hasil',
        blocks: [
          {
            type: 'text',
            content: `<p>Pada bagian ini akan dijelaskan mengenai submenu <span class='font-bold'>Hasil</span> (<span class='italic'>Result</span>) yang digunakan untuk menampilkan hasil optimalisasi <span class='italic'>routing</span>. Setiap hasilnya dapat bervariasi berdasarkan pengaturan setiap tugas, kendaraan, dan konfigurasi yang digunakan.</p>
            <p class='underline mb-2'>Perhatikan video berikut ini:</p>`,
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
              <p>Di dalam submenu ini, ditampilkan daftar hasil optimalisasi saat <span class='italic'>planner</span> menekan tombol <span class='italic'>Optimize</span> di submenu <span class='font-bold'>Kunjungan</span> atau <span class='font-bold'>Konfigurasi</span>. Terdapat persebaran tugas, rangkuman secara keselurahan, detail tugas untuk tiap kendaraan, serta riwayat perubahaannya. Hasil optimalisasi yang terbaik harus ditugaskan (<span class='italic'>dispatch</span>) supaya sopir dapat mengerjakannya. Selain itu, hasil ini dapat di-<span class='italic'>export</span> dalam bentuk Excel.</p>
              <div style="margin-top: 10px; margin-bottom: 10px; width: 100%;" class="mx-auto">
                  <img src="/images/tutorial/planner/route-result-2.png" alt="Submodul Hasil" style="width: 100%; border-radius: 4px;" />
              </div>
              `,
          },
          {
            type: 'text',
            content: `
              <p class=" font-bold text-2xl underline mb-2 italic">Gantt Chart</p>  
              <p>Selain dalam bentuk rangkuman dan detail, hasil optimalisasi dapat ditampilkan dalam bentuk <span class='italic'>Gantt Chart</span>. <span class='italic'>Gantt Chart</span> ini berfungsi untuk menampilkan jadwal pekerjaan dalam bentuk <span class='italic'>timeline</span> supaya mudah melihat urutan, durasi, dan ketergantungan tugas.</p>
              <div style="margin-top: 10px; margin-bottom: 10px; width: 100%;" class="mx-auto">
                  <img src="/images/tutorial/planner/route-result-13.png" alt="Detail Tugas" style="width: 100%; border-radius: 4px;" />
              </div>
              `,
          },
          {
            type: 'text',
            content: `
              <p class=" font-bold text-2xl underline mb-2">Detail Tugas</p>  
              <p>Saat salah satu kendaraan ditekan, maka akan muncul detail dari tugas-tugas yang akan akan dikerjakan oleh kendaraan tersebut. Terdapat informasi kendaraan, rangkuman serta detail tugasnya. Tiap tugas memiliki tombol aksi yang bisa digunakan oleh <span class='italic'>planner</span>, yaitu tombol ubah (<span class='italic'>edit</span>), pindah (<span class='italic'>move</span>), dan riwayat (<span class='italic'>history</span>).</p>
              <div style="margin-top: 10px; margin-bottom: 10px; width: 100%;" class="mx-auto">
                  <img src="/images/tutorial/planner/route-result-3.png" alt="Detail Tugas" style="width: 100%; border-radius: 4px;" />
              </div>
              `,
          },
          {
            type: 'text',
            content: `
            <ul class="list-decimal pl-5 space-y-2 mt-2 section-list">
              <li>
                <p class="section-title font-bold underline mb-2">Sunting Tugas (<span class='italic'>Edit Task</span>)</p>   
                <p>Saat terdapat detail tugas yang ingin diperbaiki di dalam hasil optimalisasi yang dipilih untuk di-<span class='italic'>dispatch</span>, maka tugas tersebut dapat diubah detailnya dengan cara: </p>
                <ol class="list-[lower-alpha] pl-5 space-y-2 mt-2">
                  <li>
                  <p>Tekan tombol <span class='italic'>Edit Task</span> (nomor 1) pada tugas yang ingin diubah.</p>
                  <div style="margin-top: 10px; margin-bottom: 10px; width: 70%;" class="mx-auto">
                      <img src="/images/tutorial/planner/route-result-4.png" alt="Aksi Tugas" style="width: 100%; border-radius: 4px;" />
                  </div>
                  </li>
                  <li>
                  <p>Ubah detail tugas sesuai kebutuhan. Tekan tombol <span class='italic'>Submit</span> untuk menyimpan perubahan dan tekan tombol <span class='italic'>Cancel</span> untuk membatalkan. <span class='font-bold'>Tiap perubahaan yang dilakukan hanya berlaku di hasil optimalisasi tersebut</span>.</p>
                  <div style="margin-top: 10px; margin-bottom: 10px; width: 60%;" class="mx-auto">
                      <img src="/images/tutorial/planner/route-result-5.png" alt="Sunting Tugas (Edit Task)" style="width: 100%; border-radius: 4px;" />
                  </div>
                  </li>
                </ol> 
              </li>    
              <li>
                <p class="section-title font-bold underline mb-2">Pindah Tugas (<span class='italic'>Move Task</span>)</p>   
                <p>Jika terdapat tugas yang dianggap tidak optimal jika dibawa oleh kendaraan tertentu (jarak antar tugas terlalu jauh, atau lain sebagainya), maka tugas tersebut dapat dipindahkan ke kendaraan lainnya dengan cara:</p>
                <ol class="list-[lower-alpha] pl-5 space-y-2 mt-2">
                  <li>
                  <p>Tekan tombol <span class='italic'>Move Task</span> (nomor 2) pada tugas yang ingin dipindahkan.</p>
                  <div style="margin-top: 10px; margin-bottom: 10px; width: 70%;" class="mx-auto">
                      <img src="/images/tutorial/planner/route-result-4.png" alt="Aksi Tugas" style="width: 100%; border-radius: 4px;" />
                  </div>
                  </li>
                  <li>
                  <p>Pilih kendaraan penerima. Tekan tombol <span class='italic'>Submit</span> untuk menyimpan perubahan dan tekan tombol <span class='italic'>Cancel</span> untuk membatalkan.</p>
                  <div style="margin-top: 10px; margin-bottom: 10px; width: 60%;" class="mx-auto">
                      <img src="/images/tutorial/planner/route-result-6.png" alt="Pindah Tugas (Move Task)" style="width: 100%; border-radius: 4px;" />
                  </div>
                  </li>
                  <li>
                    <p>Perpindahan ini tetap bisa dilakukan meskipun tonase dan volume barang yang diterima oleh kendaraan penerima sudah melebihi kapasitas maksimalnya. Sehingga, <span class='italic'>planner</span> harus <span class='underline'>mempertimbangkan kemampuan</span> dari kendaraan tersebut serta harus bisa memperkirakan kalau tipe kendaraan penerima <span class='underline'>bisa melewati rute</span> untuk menuju lokasi pelanggan.</p>
                  </li>
                </ol> 
              </li>   
              <li>
                <p class="section-title font-bold underline mb-2">Riwayat Tugas (<span class='italic'>Task History</span>)</p>   
                <p>Semua perubahaan yang terjadi secara spesifik pada tugas tersebut dapat dilihat dalam riwayat tugas, dengan cara:</p>
                <ol class="list-[lower-alpha] pl-5 space-y-2 mt-2">
                  <li>
                  <p>Tekan tombol <span class='italic'>History Task</span> (nomor 3) pada tugas yang ingin dilihat.</p>
                  <div style="margin-top: 10px; margin-bottom: 10px; width: 70%;" class="mx-auto">
                      <img src="/images/tutorial/planner/route-result-4.png" alt="Aksi Tugas" style="width: 100%; border-radius: 4px;" />
                  </div>
                  </li>
                  <li>
                  <p>Semua perubahaan yang berkaitan dengan tugas tersebut di dalam hasil optimalisasi dapat dilihat di riwayat tugas.</p>
                  <div style="margin-top: 10px; margin-bottom: 10px; width: 55%;" class="mx-auto">
                      <img src="/images/tutorial/planner/route-result-7.png" alt="Riwayat Tugas (Task History)" style="width: 100%; border-radius: 4px;" />
                  </div>
                  </li>
                </ol> 
              </li>  
            </ul>
              `,
          },
          {
            type: 'text',
            content: `
              <p class=" font-bold text-2xl underline mb-2">Tugas Tidak Terbawa (<span class='italic'>Dropped Tasks</span>)</p>  
              <p>Jika terdapat tugas yang tidak memenuhi kriteria yang sudah ditentukan sebelumnya (<span class='italic'>tag</span> kendaraan tidak cocok, tonase atau volume barang melebihi batasan, atau melebihi jam operasional pelanggan), maka tugas tersebut akan termasuk ke kelompok tugas “Tidak Terbawa” (<span class='italic'>Dropped</span>).</p>
              <p>Tugas yang tidak terbawa ini dapat dipindahkan manual ke kendaraan yang tersedia dengan cara yang sama seperti pindah tugas pada bagian <span class='italic'>Move Task</span>.</p>
              <div style="margin-top: 10px; margin-bottom: 10px; width: 100%;" class="mx-auto">
                  <img src="/images/tutorial/planner/route-result-8.png" alt="Tugas Tidak Terbawa (Dropped Tasks)" style="width: 100%; border-radius: 4px;" />
              </div>
              
            `,
          },
          {
            type: 'text',
            content: `
              <p class=" font-bold text-2xl underline mb-2">Tukar Kendaraan (<span class='italic'>Switch Vehicle</span>)</p>    
              <p>Jika semua tugas yang diterima oleh satu kendaraan perlu ditukarkan dengan kendaraan lain, maka <span class='italic'>planner</span> dapat menggunakan tombol aksi <span class='italic'>Switch</span>, dengan cara:</p>
              <ol class="list-[lower-alpha] pl-5 space-y-2 mt-2">
                <li>
                  <p>Tekan tombol <span class='italic'>Switch</span> di sebelah kiri nama kendaraan yang ingin ditukarkan.</p>
                  <div style="margin-top: 10px; margin-bottom: 10px; width: 40%;" class="mx-auto">
                      <img src="/images/tutorial/planner/route-result-9.png" alt="Tukar Kendaraan (Switch Vehicle) - 1" style="width: 100%; border-radius: 4px;" />
                  </div>
                </li>
                <li>
                  <p>Pilih kendaraan yang ingin ditukarkan. Pastikan untuk kedua kendaraan tersebut memiliki kapasitas yang cukup untuk menampung tugas yang ditukarkan.Tekan tombol <span class='italic'>Submit</span> untuk menyimpan perubahan dan tekan tombol <span class='italic'>Cancel</span> untuk membatalkan.</p>
                  <div style="margin-top: 10px; margin-bottom: 10px; width: 60%;" class="mx-auto">
                      <img src="/images/tutorial/planner/route-result-10.png" alt="Tukar Kendaraan (Switch Vehicle) - 2" style="width: 100%; border-radius: 4px;" />
                  </div>
                </li>
              </ol>
            `,
          },
          {
            type: 'text',
            content: `
              <p class=" font-bold text-2xl underline mb-2">Riwayat</p>  
              <p>Tombol riwayat menampilkan semua perubahan yang pernah dilakukan <span class='italic'>planner</span> pada tugas dan kendaraan dalam hasil optimalisasi yang dipilih.</p>
              <div style="margin-top: 10px; margin-bottom: 10px; width: 100%;" class="mx-auto">
                  <img src="/images/tutorial/planner/route-result-14.png" alt="History - 1" style="width: 100%; border-radius: 4px;" />
              </div>
              `,
          },
          {
            type: 'text',
            content: `
              <p>Di dalam jendela riwayat, <span class='italic'>planner</span> dapat melihat semua riwayat serta dapat melakukan pembatalan (<span class='italic'>reset</span>) perubahan yang telah dilakukan. <span class='italic'>Reset</span> ini dapat dilakukan secara satu per satu pada versi terpilih atau secara keseluruhan. Hasil optimalisasi yang sudah di-<span class='italic'>reset</span> <span class='font-bold'>tidak dapat dikembalikan.</span></p>
              <div style="margin-top: 10px; margin-bottom: 10px; width: 70%;" class="mx-auto">
                  <img src="/images/tutorial/planner/route-result-15.png" alt="History - 2" style="width: 100%; border-radius: 4px;" />
              </div>
              `,
          },
          {
            type: 'text',
            content: `
              <p class=" font-bold text-2xl underline mb-2">Tugaskan (<span class='italic'>Dispatch</span>)</p>    
              <p>Saat dirasa puas dengan hasil optimalisasinya, maka <span class='italic'>planner</span> dapat melakukan proses <span class='italic'>dispatch</span>, yaitu proses penugasan ke masing-masing sopir berdasarkan dengan hasil optimalisasi. <span class='font-bold'>Pastikan memilih hasil yang tepat untuk di-<span class='italic'>dispatch</span>.</p>
              <div style="margin-top: 10px; margin-bottom: 10px; width: 100%;" class="mx-auto">
                  <img src="/images/tutorial/planner/route-result-11.png" alt="Tugaskan (Dispatch)" style="width: 100%; border-radius: 4px;" />
              </div>
              <p>Setelah proses <span class='italic'>dispatch</span> telah selesai, maka akan muncul keterangan dan <span class='italic'>planner</span> <span class='font-bold'>harus</span> mengganti judul hasil optimalisasi tersebut sesuai dengan tanggal pengiriman untuk mempermudah dalam pencarian.</p>
              <div style="margin-top: 10px; margin-bottom: 10px; width: 40%;" class="mx-auto">
                  <img src="/images/tutorial/planner/route-result-12.png" alt="Keterangan dan Ubah Judul" style="width: 100%; border-radius: 4px;" />
              </div>
            `,
          },
        ],
      },
    ],
  },
];
