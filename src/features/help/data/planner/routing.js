export const routingTopic = [
  // INTRO
  {
    id: 'routing',
    category: 'planner',
    title: 'Rute (Routing)',
    blocks: [
      {
        type: 'text',
        content: `<p><strong>Menu Rute</strong> (<em>Routing</em>) adalah menu yang yang memungkinkan untuk melakukan perencanaan rute paling efisien untuk pengguna lapangan, baik dari segi jalur yang dilewati maupun jumlah kendaraan yang digunakan.</p>`,
      },
      {
        type: 'text',
        content: `<p>Di menu ini terdapat beberapa submenu untuk membantu memperoleh hasil perencanaan yang efisien dan optimal, yaitu submenu <strong>Kunjungan</strong> (<em>Visit</em>), <strong>Konfigurasi</strong> (<em>Configuration</em>), dan <strong>Hasil</strong> (<em>Result</em>)</p>
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
            content: `<p>Pada bagian ini akan dijelaskan mengenai submenu <strong>Kunjungan</strong> (<em>Visit</em>) yang digunakan sebagai pengaturan untuk tugas yang aktif pada tanggal terpilih.</p>
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
              <p>Di dalam submenu ini, ditampilkan daftar tugas yang aktif pada tanggal terpilih. <em>Planner</em> dapat melakukan filter di kolom pencarian berdasarkan nama pelanggan, id pelanggan, atau nomor faktur. Tugas-tugas tersebut dapat dinonaktifkan supaya tidak terbawa proses <em>routing</em>. Tugas yang sudah melalui proses <em>routing</em>, akan bertanda <u>truk biru</u> dengan keterangan pelat nomor kendaraan yang membawa. <em>Planner</em> dapat melihat persebaran tugas untuk memeriksa bahwa tugas tersebut berada di lokasi yang sewajarnya. Tekan tombol Optimalisasi (<em>Optimize</em>) untuk melakukan proses <em>routing</em>.</p>
              <div style="margin-top: 10px; margin-bottom: 10px; width: 100%;" class="mx-auto">
                  <img src="/images/tutorial/planner/route-visit-2.png" alt="Submodul Kunjungan" style="width: 100%; border-radius: 4px;" />
              </div>
            `,
          },
          {
            type: 'text',
            content: `
              <p>Selain filter di kolom pencarian, filter dapat dilakukan berdasarkan status tugas (<em>Unassigned</em> atau <em>Ongoing</em>), tanggal mulai, alur, dan <em>tag</em> yang digunakan dalam tugas.</p>
              <div style="margin-top: 10px; margin-bottom: 10px; width: 45%;" class="mx-auto">
                  <img src="/images/tutorial/planner/route-visit-3.png" alt="Filter Kunjungan" style="width: 100%; border-radius: 4px;" />
              </div>
            `,
          },
          {
            type: 'text',
            content: `
              <p>Saat menekan salah satu tugas, akan muncul detail dari tugas tersebut, yaitu nama tugas, alamat pelanggan, titik koordinat pelanggan, jam operasional pelanggan, lama kunjungan, <em>tag</em>, pengelompokan kunjungan, prioritas, tonase, dan volume barang. Data-data tersebut dapat diubah oleh <em>planner</em>, namun hanya bersifat <strong>sementara</strong>.</p>
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
            <p>Pada bagian ini akan dijelaskan mengenai submenu <strong>Konfigurasi</strong> (<em>Configuration</em>) yang digunakan untuk pemilihan kendaraan dan parameter untuk menghitung rute terbaik. </p>
            <p>Semua parameter dan kendaraan yang digunakan dapat <u>diubah-ubah</u> sesuai kebutuhan untuk membandingkan antar hasilnya, sehingga proses optimalisasi ini dapat dilakukan <u>sebanyak mungkin</u> sampai menemukan hasil yang paling optimal untuk digunakan.</p>
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
                <p>Di dalam submenu ini akan dibagi menjadi beberapa bagian, yaitu pengaturan kendaraan, kecepatan, restriksi, dan <em>cross docking</em>, parameter <em>routing</em>, serta <em>geotagging</em>. </p>
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
                    <p>Di dalam bagian ini ditampilkan daftar kendaraan yang tersedia. Kolom pencarian berdasarkan pelat nomor kendaraan atau <em>tag</em> yang dimiliki tiap kendaraan. <em>Planner</em> hanya dapat mengubah status (aktif/non-aktif) pada kendaraan yang akan digunakan dalam proses pengiriman. <strong> Untuk menghapus atau mengubah detail kendaraan, harap hubungi admin</strong>. Kendaraan yang sudah melalui proses <em>routing</em>, akan bertanda <u>box biru</u> dengan keterangan jumlah tugas yang dikerjakan.</p>
                    <div style="margin-top: 10px; margin-bottom: 10px; width: 45%;" class="mx-auto">
                        <img src="/images/tutorial/planner/route-conf-3.png" alt="Pengaturan Kendaraan" style="width: 100%; border-radius: 4px;" />
                    </div>
                </li>
                <li>
                  <p class='section-title font-bold underline mb-2'>Pengaturan Kecepatan, Restriksi, dan <em>Cross Docking</em></p>             
                  <p>Di dalam bagian ini ditampilkan pengaturan kecepatan, restriksi/batasan, serta <em>cross docking</em> yang digunakan dalam proses <em>routing</em>. Pengaturan yang digunakan saat ini (seperti di gambar) adalah pengaturan <em>default</em>, namun dapat diubah sesuai kebutuhan. <strong> Untuk mengubah pengaturan ini, harap konfirmasi dengan admin</strong>. </p>
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
                      <p>Gunakan Semua Kendaraan (<em>Use All Vehicle</em>) yaitu saat diaktifkan, <em>routing</em> akan menggunakan semua kendaraan yang tersedia daripada meminimalisir penggunaan jumlah kendaraan.</p>
                    </li>                
                    <li>
                      <p class="font-bold">Multi Perjalanan</p>
                      <p>Multi Perjalanan (<em>Multi Trip</em>) yaitu saat diaktifkan,  kendaraan akan diperbolehkan untuk kembali ke hub utama untuk mengatur ulang kapasitas kendaraan. Hal ini memungkinkan setiap kendaraan melakukan lebih dari satu perjalanan dalam sehari.</p>
                    </li>                
                    <li>
                      <p class="font-bold">Kembali ke Hub</p>
                      <p>Kembali ke Hub (<em>Return to Hub</em>) yaitu saat diaktifkan, maka akan ditambahkan hub di akhir perjalanan, sehingga kendaraan harus kembali ke hub sebelum waktu kerja berakhir.</p>
                    </li>                
                    <li>
                      <p class="font-bold">Penggabungan Otomatis</p>
                      <p>Penggabungan Otomatis (<em>Auto Merge</em>) yaitu saat diaktifkan,  setiap kali ada lebih dari satu tugas dengan koordinat latitude dan longitude yang sama akan dianggap sebagai satu tugas supaya tugas tersebut bisa dibawa oleh kendaraan yang sama.</p>
                    </li>                
                    <li>
                      <p class="font-bold">Pemisahan Otomatis</p>
                      <p>Pemisahan Otomatis (<em>Auto Split</em>) yaitu saat diaktifkan, setiap kali ada tugas dengan kapasitas melebihi kapasitas maksimum kendaraan terpilih, sistem akan membagi tugas tersebut menjadi dua atau lebih supaya dapat dimuat ke satu atau lebih kendaraan. Pemisahannya dapat dilakukan melalui dua cara, yaitu:</p>
                      <ol class="list-[lower-alpha] pl-5 space-y-2 mt-2">
                        <li>
                          <p class="font-bold">Pemisahan dengan Kapasitas yang Sama</p>
                          <p>Pemisahan dengan Kapasitas yang Sama (<em>Split Capacity Equally</em>) yaitu distribusi kelebihan muatan dari tugas akan dibagi ke kendaraan secara merata untuk tiap kendaraannya.</p>
                        </li>
                        <li>
                          <p class="font-bold">Memaksimalkan Kapasitas Kendaraan</p>
                          <p>Memaksimalkan Kapasitas Kendaraan (<em>Maximize Vehicle Capacity</em>) yaitu distribusi kelebihan muatan dari tugas akan dibagi ke satu kendaraan hingga mencapai kapasitas maksimalnya, lalu sisanya akan dimuat ke kendaraan lain, dan begitu seterusnya.</p>
                        </li>
                      </ol> 
                    </li>                
                    <li>
                      <p class="font-bold">Pengelompokkan</p>
                      <p>Pemisahan Otomatis (<em>Clustering</em>) yaitu saat diaktifkan, hasil optimalisasi akan meminimalisir terjadinya tumpang tindih area antar kendaraan. Pengelompokkan dapat menjadi dua cara, yaitu:</p>
                      <ol class="list-[lower-alpha] pl-5 space-y-2 mt-2">
                        <li>
                          <p class="font-bold">Minimalkan Tumpah Tindih</p>
                          <p>Minimalkan Tumpah Tindih (<em>Minimum overlap</em>) yaitu hasil optimalisasi akan meminimalisir tumpang tindih antara rute kendaraan berbeda.</p>
                        </li>
                        <li>
                          <p class="font-bold">Memaksimalkan Kapasitas Kendaraan</p>
                          <p>Memaksimalkan Kapasitas Kendaraan(<em>No overlap</em>) yaitu hasil optimalisasi akan mencegah terjadinya tumpah tindih antar rute kendaraan berbeda, tetapi akan menggunakan lebih banyak kendaraan.</p>
                        </li>
                      </ol> 
                    </li>
                    <li>
                      <p class="font-bold">Hindari Jalan Tol</p>
                      <p>Hindari Jalan Tol (<em>Avoid Toll Roads</em>) yaitu saat diaktifkan, maka rute pengiriman akan menghindari penggunaan jalan bebas hambatan (tol).</p>
                    </li>                
                    <li>
                      <p class="font-bold">Ganjil Genap</p>
                      <p>Ganjil Genap (<em>Odd Even</em>) yaitu saat diaktifkan, maka akan menerapkan aturan ganjil genap pada rute pengiriman. Pilih tanggal pengiriman saat menerapkan parameter ini.</p>
                    </li>                
                  </ol>
                </li>
                <li>
                  <p class='section-title font-bold text-2xl underline mb-2 italic'>Geotagging</p>             
                  <p>Di dalam bagian ini ditampilkan pengaturan <em>geotagging</em> yang memungkinkan untuk menetapkan <em>tag</em> berdasarkan area geografis. <em>Planner</em> dapat menambahkan dan mengubah lokasi dari <em>tag</em> tersebut. <strong>Untuk menghapus <em>tag</em> yang sudah ada, harap hubungi admin.</strong></p>
                  <div style="margin-top: 10px; margin-bottom: 10px; width: 60%;" class="mx-auto">
                      <img src="/images/tutorial/planner/route-conf-6.png" alt="Pengaturan Geotagging" style="width: 100%; border-radius: 4px;" />
                  </div>
                  <p>Saat ingin membuat <em>tag</em> baru, masukkan nama <em>tag</em> dan tekan tombol yang tersedia, lalu muncul jendela penambahan <em>geotagging</em>. Tentukan area yang dibutuhkan, lalu tekan tombol <em>Submit</em> untuk menyimpan, tekan tombol <em>Reset</em> untuk mengulangi, dan tekan tombol <em>Cancel</em> untuk membatalkan.</p>
                  <div style="margin-top: 10px; margin-bottom: 10px; width: 100%;" class="mx-auto">
                      <img src="/images/tutorial/planner/route-conf-7.png" alt="Tambah Area Geotagging" style="width: 100%; border-radius: 4px;" />
                  </div>
                  <p>Setelah <em>tag</em> berhasil terbuat, tambahkan <em>geotagging</em> tersebut di kendaraan yang diinginkan. <strong>Harap hubungi admin.</strong></p>
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
            content: `<p>Pada bagian ini akan dijelaskan mengenai submenu <strong>Hasil</strong> (<em>Result</em>) yang digunakan untuk menampilkan hasil optimalisasi <em>routing</em>. Setiap hasilnya dapat bervariasi berdasarkan pengaturan setiap tugas, kendaraan, dan konfigurasi yang digunakan.</p>
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
              <p>Di dalam submenu ini, ditampilkan daftar hasil optimalisasi saat <em>planner</em> menekan tombol <em>Optimize</em> di submenu <strong>Kunjungan</strong> atau <strong>Konfigurasi</strong>. Terdapat persebaran tugas, rangkuman secara keselurahan, detail tugas untuk tiap kendaraan, serta riwayat perubahaannya. Hasil optimalisasi yang terbaik harus ditugaskan (<em>dispatch</em>) supaya <em>driver</em> dapat mengerjakannya. Selain itu, hasil ini dapat di-<em>export</em> dalam bentuk Excel.</p>
              <div style="margin-top: 10px; margin-bottom: 10px; width: 100%;" class="mx-auto">
                  <img src="/images/tutorial/planner/route-result-2.png" alt="Submodul Hasil" style="width: 100%; border-radius: 4px;" />
              </div>
              `,
          },
          {
            type: 'text',
            content: `
              <p class=" font-bold text-2xl underline mb-2 italic">Gantt Chart</p>  
              <p>Selain dalam bentuk rangkuman dan detail, hasil optimalisasi dapat ditampilkan dalam bentuk <em>Gantt Chart</em>. <em>Gantt Chart</em> ini berfungsi untuk menampilkan jadwal pekerjaan dalam bentuk <em>timeline</em> supaya mudah melihat urutan, durasi, dan ketergantungan tugas.</p>
              <div style="margin-top: 10px; margin-bottom: 10px; width: 100%;" class="mx-auto">
                  <img src="/images/tutorial/planner/route-result-13.png" alt="Detail Tugas" style="width: 100%; border-radius: 4px;" />
              </div>
              `,
          },
          {
            type: 'text',
            content: `
              <p class=" font-bold text-2xl underline mb-2">Detail Tugas</p>  
              <p>Saat salah satu kendaraan ditekan, maka akan muncul detail dari tugas-tugas yang akan akan dikerjakan oleh kendaraan tersebut. Terdapat informasi kendaraan, rangkuman serta detail tugasnya. Tiap tugas memiliki tombol aksi yang bisa digunakan oleh <em>planner</em>, yaitu tombol ubah (<em>edit</em>), pindah (<em>move</em>), dan riwayat (<em>history</em>).</p>
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
                <p class="section-title font-bold underline mb-2">Sunting Tugas (<em>Edit Task</em>)</p>   
                <p>Saat terdapat detail tugas yang ingin diperbaiki di dalam hasil optimalisasi yang dipilih untuk di-<em>dispatch</em>, maka tugas tersebut dapat diubah detailnya dengan cara: </p>
                <ol class="list-[lower-alpha] pl-5 space-y-2 mt-2">
                  <li>
                  <p>Tekan tombol <em>Edit Task</em> (nomor 1) pada tugas yang ingin diubah.</p>
                  <div style="margin-top: 10px; margin-bottom: 10px; width: 70%;" class="mx-auto">
                      <img src="/images/tutorial/planner/route-result-4.png" alt="Aksi Tugas" style="width: 100%; border-radius: 4px;" />
                  </div>
                  </li>
                  <li>
                  <p>Ubah detail tugas sesuai kebutuhan. Tekan tombol <em>Submit</em> untuk menyimpan perubahan dan tekan tombol <em>Cancel</em> untuk membatalkan. <strong>Tiap perubahaan yang dilakukan hanya berlaku di hasil optimalisasi tersebut</strong>.</p>
                  <div style="margin-top: 10px; margin-bottom: 10px; width: 60%;" class="mx-auto">
                      <img src="/images/tutorial/planner/route-result-5.png" alt="Sunting Tugas (Edit Task)" style="width: 100%; border-radius: 4px;" />
                  </div>
                  </li>
                </ol> 
              </li>    
              <li>
                <p class="section-title font-bold underline mb-2">Pindah Tugas (<em>Move Task</em>)</p>   
                <p>Jika terdapat tugas yang dianggap tidak optimal jika dibawa oleh kendaraan tertentu (jarak antar tugas terlalu jauh, atau lain sebagainya), maka tugas tersebut dapat dipindahkan ke kendaraan lainnya dengan cara:</p>
                <ol class="list-[lower-alpha] pl-5 space-y-2 mt-2">
                  <li>
                  <p>Tekan tombol <em>Move Task</em> (nomor 2) pada tugas yang ingin dipindahkan.</p>
                  <div style="margin-top: 10px; margin-bottom: 10px; width: 70%;" class="mx-auto">
                      <img src="/images/tutorial/planner/route-result-4.png" alt="Aksi Tugas" style="width: 100%; border-radius: 4px;" />
                  </div>
                  </li>
                  <li>
                  <p>Pilih kendaraan penerima. Tekan tombol <em>Submit</em> untuk menyimpan perubahan dan tekan tombol <em>Cancel</em> untuk membatalkan.</p>
                  <div style="margin-top: 10px; margin-bottom: 10px; width: 60%;" class="mx-auto">
                      <img src="/images/tutorial/planner/route-result-6.png" alt="Pindah Tugas (Move Task)" style="width: 100%; border-radius: 4px;" />
                  </div>
                  </li>
                  <li>
                    <p>Perpindahan ini tetap bisa dilakukan meskipun tonase dan volume barang yang diterima oleh kendaraan penerima sudah melebihi kapasitas maksimalnya. Sehingga, <em>planner</em> harus <u>mempertimbangkan kemampuan</u> dari kendaraan tersebut serta harus bisa memperkirakan kalau tipe kendaraan penerima <u>bisa melewati rute</u> untuk menuju lokasi pelanggan.</p>
                  </li>
                </ol> 
              </li>   
              <li>
                <p class="section-title font-bold underline mb-2">Riwayat Tugas (<em>Task History</em>)</p>   
                <p>Semua perubahaan yang terjadi secara spesifik pada tugas tersebut dapat dilihat dalam riwayat tugas, dengan cara:</p>
                <ol class="list-[lower-alpha] pl-5 space-y-2 mt-2">
                  <li>
                  <p>Tekan tombol <em>History Task</em> (nomor 3) pada tugas yang ingin dilihat.</p>
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
              <p class=" font-bold text-2xl underline mb-2">Tugas Tidak Terbawa (<em>Dropped Tasks</em>)</p>  
              <p>Jika terdapat tugas yang tidak memenuhi kriteria yang sudah ditentukan sebelumnya (<em>tag</em> kendaraan tidak cocok, tonase atau volume barang melebihi batasan, atau melebihi jam operasional pelanggan), maka tugas tersebut akan termasuk ke kelompok tugas “Tidak Terbawa” (<em>Dropped</em>).</p>
              <p>Tugas yang tidak terbawa ini dapat dipindahkan manual ke kendaraan yang tersedia dengan cara yang sama seperti pindah tugas pada bagian <em>Move Task</em>.</p>
              <div style="margin-top: 10px; margin-bottom: 10px; width: 100%;" class="mx-auto">
                  <img src="/images/tutorial/planner/route-result-8.png" alt="Tugas Tidak Terbawa (Dropped Tasks)" style="width: 100%; border-radius: 4px;" />
              </div>
              
            `,
          },
          {
            type: 'text',
            content: `
              <p class=" font-bold text-2xl underline mb-2">Tukar Kendaraan (<em>Switch Vehicle</em>)</p>    
              <p>Jika semua tugas yang diterima oleh satu kendaraan perlu ditukarkan dengan kendaraan lain, maka <em>planner</em> dapat menggunakan tombol aksi <em>Switch</em>, dengan cara:</p>
              <ol class="list-[lower-alpha] pl-5 space-y-2 mt-2">
                <li>
                  <p>Tekan tombol <em>Switch</em> di sebelah kiri nama kendaraan yang ingin ditukarkan.</p>
                  <div style="margin-top: 10px; margin-bottom: 10px; width: 40%;" class="mx-auto">
                      <img src="/images/tutorial/planner/route-result-9.png" alt="Tukar Kendaraan (Switch Vehicle) - 1" style="width: 100%; border-radius: 4px;" />
                  </div>
                </li>
                <li>
                  <p>Pilih kendaraan yang ingin ditukarkan. Pastikan untuk kedua kendaraan tersebut memiliki kapasitas yang cukup untuk menampung tugas yang ditukarkan.Tekan tombol <em>Submit</em> untuk menyimpan perubahan dan tekan tombol <em>Cancel</em> untuk membatalkan.</p>
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
              <p>Tombol riwayat menampilkan semua perubahan yang pernah dilakukan <em>planner</em> pada tugas dan kendaraan dalam hasil optimalisasi yang dipilih.</p>
              <div style="margin-top: 10px; margin-bottom: 10px; width: 100%;" class="mx-auto">
                  <img src="/images/tutorial/planner/route-result-14.png" alt="History - 1" style="width: 100%; border-radius: 4px;" />
              </div>
              `,
          },
          {
            type: 'text',
            content: `
              <p>Di dalam jendela riwayat, <em>planner</em> dapat melihat semua riwayat serta dapat melakukan pembatalan (<em>reset</em>) perubahan yang telah dilakukan. <em>Reset</em> ini dapat dilakukan secara satu per satu pada versi terpilih atau secara keseluruhan. Hasil optimalisasi yang sudah di-<em>reset</em> <strong>tidak dapat dikembalikan.</strong></p>
              <div style="margin-top: 10px; margin-bottom: 10px; width: 70%;" class="mx-auto">
                  <img src="/images/tutorial/planner/route-result-15.png" alt="History - 2" style="width: 100%; border-radius: 4px;" />
              </div>
              `,
          },
          {
            type: 'text',
            content: `
              <p class=" font-bold text-2xl underline mb-2">Tugaskan (<em>Dispatch</em>)</p>    
              <p>Saat dirasa puas dengan hasil optimalisasinya, maka <em>planner</em> dapat melakukan proses <em>dispatch</em>, yaitu proses penugasan ke masing-masing <em>driver</em> berdasarkan dengan hasil optimalisasi. <strong>Pastikan memilih hasil yang tepat untuk di-<em>dispatch</em>.</p>
              <div style="margin-top: 10px; margin-bottom: 10px; width: 100%;" class="mx-auto">
                  <img src="/images/tutorial/planner/route-result-11.png" alt="Tugaskan (Dispatch)" style="width: 100%; border-radius: 4px;" />
              </div>
              <p>Setelah proses <em>dispatch</em> telah selesai, maka akan muncul keterangan dan <em>planner</em> <strong>harus</strong> mengganti judul hasil optimalisasi tersebut sesuai dengan tanggal pengiriman untuk mempermudah dalam pencarian.</p>
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
