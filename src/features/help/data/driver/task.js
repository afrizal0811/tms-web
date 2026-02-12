export const taskTopic = [
  {
    id: 'driver-task',
    category: 'driver',
    title: 'Tugas (Task)',
    blocks: [
      {
        type: 'text',
        content: `
        <p><strong>Menu Tugas</strong> (<em>Task</em>) adalah menu utama untuk mengerjakan semua tugas yang telah diberikan oleh admin.</p>
        <div style="margin-top: 10px; margin-bottom: 10px; width: 40%;" class="mx-auto">
            <img src="/images/tutorial/driver/task-menu-1.png" alt="Menu Tugas" style="width: 100%; border-radius: 4px;" />
        </div>
        <p>Berikut ini penjelasannya:</p>
        `,
      },
      {
        type: 'text',
        content: `
            <p class=" font-bold text-2xl underline mb-2">Tombol Aksi</p>  
            <p>Di dalam menu Tugas, terdapat beberapa tombol yang dapat digunakan untuk mempermudah pengiriman, yaitu tombol pencarian, peta, dan optimalisasi rute. Berikut penjelasannya:</p> 
            <ul class="list-disc pl-5 space-y-2 mt-2">
              <li>
                <p>Tombol pencarian, untuk melakukan filter berdasarkan nama pelanggan atau id pelanggan.</p>
              </li>
              <li>
                <p>Tombol peta, untuk menampilkan semua titik lokasi pengantaran yang telah ditentukan oleh admin. Hal ini dapat digunakan untuk melihat rute yang dilalui <em>driver</em>.</p>
              </li>
              <li>
                <p>Tombol optimalisasi rute, untuk melakukan perhitungan dan penyesuaian kembali urutan tugas yang harus dikerjakan dari titik terdekat dari <em>driver</em> saat <em>driver</em> menekan tombol tersebut.</p>
              </li>
            </ul>
        `,
      },
      {
        type: 'text',
        content: `
            <p class=" font-bold text-2xl underline mb-2">Submenu Kategori</p>  
            <p>Setiap tugas yang tersedia akan dikelompokkan berdasarkan status dari tugas tersebut, yaitu tugas yang sedang berjalan (<em>Ongoing</em>) dan tugas selesai (<em>Done</em>). Berikut penjelasannya:</p> 
            <ul class="list-decimal pl-5 space-y-2 mt-2">
              <li>
                <p class="font-bold">Kategori Berjalan (<em>Ongoing</em>)</p>
                <p>Tugas yang sedang berjalan (<em>ongoing</em>) dan harus dikerjakan oleh <em>driver</em> tersebut akan tersimpan di submenu ini. Di dalam submenu ini, terdapat keterangan menganai jenis alur, waktu pengiriman dimulai, nama pelanggan dan id pelanggan, nomor faktur, serta perkiraan waktu tiba (ETA) di lokasi dan waktu keluar (ETD) dari lokasi tersebut. <u>Memungkinkan untuk beberapa tugas tidak memiliki ETA dan ETD</u>.</p>
              </li>
              <li>
                <p class="font-bold">Kategori Selesai (<em>Done</em>)</p>
                <p>Tugas yang sudah selesai dikerjakan (<em>done</em>) oleh <em>driver</em> akan tersimpan di submenu ini. Tugas yang tersimpan dengan benar akan bertanda centang berwarna <strong>hijau</strong>. Jika terdapat tugas dengan tanda centang berwarna <strong>abu-abu</strong> atau <strong>merah</strong>, maka proses penyimpanan data sedang mengalami masalah karena <strong>koneksi internet</strong>. Untuk mengatasinya, <em>driver</em> dapat mengganti koneksi internet lalu lakukan sinkronisasi data.</p>
                <div style="margin-top: 10px; margin-bottom: 10px; width: 50%;" class="mx-auto">
                    <img src="/images/tutorial/driver/task-menu-2.png" alt="Kategori Selesai Gagal" style="width: 100%; border-radius: 4px;" />
                </div>
              </li>
            </ul>
        `,
      },
    ],
    subTopics: [
      {
        id: 'task-do',
        title: 'Lakukan Tugas',
        blocks: [
          {
            type: 'text',
            content: `
            <p>Pada bagian ini akan dijelaskan cara untuk mengerjakan tugas yang sudah diterima. Pengerjaan tugas <strong>harus</strong> dilakukan secara berurutan dari <strong>atas ke bawah.</strong></p>
            <p class='underline mb-2'>Perhatikan video berikut ini:</p>
            <div style="margin-top: 10px; margin-bottom: 10px;">
              <iframe 
                width="100%" 
                height="450" 
                src="https://www.youtube.com/embed/tAuvtUgzKss" 
                title="YouTube video player" 
                frameborder="0" 
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                allowfullscreen>
              </iframe>
            </div>
            <p>Berikut ini penjelasannya:</p>
            `,
          },
          {
            type: 'text',
            content: `
            <p class=" font-bold text-2xl underline mb-2">Halaman Informasi Utama</p>  
            <p>Halaman 1 adalah halaman <strong>Informasi Utama</strong>. Dalam halaman ini terdapat beberapa informasi umum terkait pengiriman. </p>
            <div style="margin-top: 10px; margin-bottom: 10px; width: 40%;" class="mx-auto">
                <img src="/images/tutorial/driver/general-info-1.png" alt="Halaman Informasi Utama" style="width: 100%; border-radius: 4px;" />
            </div>
            <p>Berikut ini penjelasan untuk masing-masing informasi serta alur pengerjaannya: </p>
            <ul class="list-decimal pl-5 space-y-2 mt-2">
                <li>
                    <p><span class='italic font-bold'>Order ID</span> berisikan nomor faktur. Di dalamnya bisa tercantum beberapa nomor faktur untuk satu tugas pengiriman.</p>
                </li>
                <li>
                    <p><span class='italic font-bold'>Customer Name</span> berisikan nama pelanggan.</p>
                </li>
                <li>
                    <p><span class='italic font-bold'>Volume</span> berisikan besar total volume barang.</p>
                </li>
                <li>
                    <p><span class='italic font-bold'>Weight</span> berisikan besar total tonase barang.</p>
                </li>
                <li>
                    <p><span class='italic font-bold'>Address</span> berisikan alamat pengiriman. Alamat dapat dilihat melalui aplikasi maps dengan menekan ikon maps.</p>
                </li>
                <li>
                    <p><strong>Longlat</strong> berisikan titik koordinat dari alamat pengiriman. Titik koordinat dapat dilihat melalui aplikasi maps dengan menekan ikon maps.</p>
                </li>
                <li>
                    <p><span class='italic font-bold'>Open Time</span> berisikan waktu minimal pelanggan untuk dapat menerima barang.</p>
                </li>
                <li>
                    <p><span class='italic font-bold'>Close Time</span> berisikan waktu maksimal pelanggan untuk dapat menerima barang.</p>
                </li>
                <li>
                    <p>Tombol <strong>Klik Jika Sudah Sampai</strong> dapat di tekan saat <em>driver</em> sudah sampai di lokasi pelanggan. Terdapat 2 ketentuan yang harus dipahami, yaitu: </p>
                    <ol class="list-disc pl-5 space-y-2 mt-2">
                        <li>
                            <p>Saat terdapat pelanggan yang maka <u>mengharuskan</u> untuk mengambil nomor antrian, maka <em>driver</em> cukup tekan tombol <strong>Klik Jika Sudah Sampai</strong> tanpa perlu melanjutkan proses tekan tombol <strong>Lanjut</strong> (<em>Next</em>). Tombol <strong>Lanjut</strong> ditekan saat nomor antrian selesai dan akan melakukan bongkar muatan barang.</p>
                        </li>
                        <li>
                            <p>Saat terdapat pelanggan yang maka <u>tidak mengharuskan</u> untuk antri dan dapat langsung bongkar muatan barang, maka maka <em>driver</em> tekan tombol <strong>Klik Jika Sudah Sampai</strong> dan tombol <strong>Lanjut</strong></p>
                        </li>
                    </ol>
                </li>
            </ul>
            <p>Tujuan dari menyelesaikan halaman 1 adalah untuk mendapatkan data <span class='italic underline'>visit time</span> (durasi waktu bongkar muatan barang di lokasi pelanggan) secara akurat.</p>
            `,
          },
          {
            type: 'text',
            content: `
            <p class=" font-bold text-2xl underline mb-2">Halaman Konfirmasi <em>Delivery</em></p>  
            <p>Halaman 2 adalah halaman <strong>Konfirmasi <em>Delivery</em></strong>. Dalam halaman ini terdapat beberapa alur pengerjaan tugas. </p>
            <div style="margin-top: 10px; margin-bottom: 10px; width: 40%;" class="mx-auto">
                <img src="/images/tutorial/driver/confirm-delivery.png" alt="Halaman Konfirmasi Delivery" style="width: 100%; border-radius: 4px;" />
            </div>
            <p>Berikut ini penjelasan untuk alur pengerjaannya: </p>
            <ul class="list-decimal pl-5 space-y-2 mt-2">
                <li>
                    <p class='font-bold'>Status <em>Delivery</em></p> 
                    <p>Pilih opsi status pengiriman dengan ketentuan:</p>
                    <ol class="list-disc pl-5 space-y-2 mt-2">
                        <li>
                            <p>Jika pengiriman <u>berhasil</u>, maka tekan tombol <strong>Sukses</strong>.</p>
                        </li>
                        <li>
                            <p>Jika terdapat <u>sebagian produk yang ditolak</u>, maka tekan tombol <strong>Terima Sebagian</strong>.</p>
                        </li>
                        <li>
                            <p>Jika pengiriman <u>tertunda</u> karena berbagai alasan namun barang tersebut akan <u>dikirim kembali</u> esok hari, maka tekan tombol <strong>Pending</strong></p>
                        </li>
                        <li>
                            <p>Jika pengiriman <u>gagal</u> karena berbagai alasan dan barang <u><strong>tidak</strong> dikirim kembali</u>, maka tekan tombol <strong>Batal</strong></p>
                        </li>
                        <li>
                            <p>Jika pengiriman <u>berhasil</u> namun <u>faktur masih pending</u> di pelanggan, maka tekan tombol <strong>Pending GR</strong>.</p>
                        </li>
                    </ol>
                </li>
                <li>
                    <p class='font-bold'>Daftar Produk Tolakan</p> 
                    <p>Saat <em>driver</em> memilih <strong>Terima Sebagian</strong> pada status pengiriman, maka akan muncul daftar barang terkait pengiriman tersebut. <em>Driver</em> perlu mengubah jumlah barang yang diterima. </p>
                </li>
                <li>
                    <p class='font-bold'>Alasan</p> 
                    <p>Isikan alasan secara <u>jelas, detail, dan lengkap</u> berdasarkan status pengiriman yang dipilih.</p>
                </li>
                <li>
                    <p class='italic font-bold'>Photo Delivery</p> 
                    <p>Foto barang beserta penerima saat di lokasi sebagai bukti bahwa barang sudah diterima.</p>
                </li>
                <li>
                    <p class='font-bold'>Nama PIC</p> 
                    <p>Isikan nama penerima barang.</p>
                </li>
                <li>
                    <p class='font-bold'>Tanda Tangan PIC</p> 
                    <p>Berikan tanda tangan dari penerima barang.</p>
                </li>
            </ul>
            `,
          },
          {
            type: 'text',
            content: `
            <p class=" font-bold text-2xl underline mb-2">Halaman Konfirmasi Lokasi</p>  
            <p>Halaman 3 adalah halaman <strong>Konfirmasi Lokasi</strong>. Dalam halaman ini terdapat beberapa kolom yang harus diisikan oleh <em>driver</em>.</p>
            <div style="margin-top: 10px; margin-bottom: 10px; width: 40%;" class="mx-auto">
                <img src="/images/tutorial/driver/confirm-location-1.png" alt="Halaman Konfirmasi Lokasi" style="width: 100%; border-radius: 4px;" />
            </div>
            <p>Berikut ini penjelasannya: </p>
            <ul class="list-decimal pl-5 space-y-2 mt-2">
                <li>
                    <p class='font-bold'>GPS Sesuai</p> 
                    <p>Pilih opsi <strong>Ya</strong> jika titik koordinat yang diberikan sesuai dengan lokasi sebenarnya dan pilih <strong>Tidak</strong> jika titik koordinat tidak sesuai dengan lokasi sebenarnya. </p>
                </li>
                <li>
                    <p class='font-bold'>Klik Lokasi <em>Client</em></p> 
                    <p>Jika memilih opsi <strong>Tidak</strong>, maka akan muncul kolom untuk memperbarui titik koordinat baru. Tekan ikon bulat dan tunggu beberapa saat. Secara otomatis akan terisi titik koordinat sesuai lokasi <em>driver</em> saat ini. Sehingga, <strong> sangat disarankan tidak mengisikan lokasi baru jika tidak berada di lokasi pelanggan</strong>.</p>
                </li>
            </ul>
            `,
          },
        ],
        subSubTopics: [
          {
            id: 'status-success',
            title: 'Tugas Berhasil',
            blocks: [
              {
                type: 'text',
                content: `
                <p>Video dibawah ini adalah contoh pengisian tugas dengan status pengiriman <strong>berhasil</strong>.</p>
                <div style="margin-top: 10px; margin-bottom: 10px;">
                  <iframe 
                    width="100%" 
                    height="450" 
                    src="https://www.youtube.com/embed/ONsP8-71dSI" 
                    title="YouTube video player" 
                    frameborder="0" 
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                    allowfullscreen>
                  </iframe>
                </div>
                <p>Berikut ini penjelasannya:</p>
                <ul class="list-decimal pl-5 space-y-2 mt-2">
                  <li>
                    <p>Di dalam halaman awal, terdapat informasi umum mengenai tugas. Jika <em>driver</em> sudah sampai di lokasi pelanggan, maka tekan tombol <strong>Klik Jika Sudah Sampai</strong>. Lalu tekan tombol <strong>Lanjut</strong>.</p>
                    <div style="margin-top: 10px; margin-bottom: 10px; width: 40%;" class="mx-auto">
                        <img src="/images/tutorial/driver/general-info-2.png" alt="Halaman Informasi Utama - Sukses" style="width: 100%; border-radius: 4px;" />
                    </div>
                  </li>
                  <li>
                    <p>Pada opsi <strong>Status Delivery</strong>, pilih opsi <strong>Sukses</strong>.</p>
                    <div style="margin-top: 10px; margin-bottom: 10px; width: 40%;" class="mx-auto">
                        <img src="/images/tutorial/driver/status-delivery.png" alt="Status Delivery - Sukses" style="width: 100%; border-radius: 4px;" />
                    </div>
                  </li>
                  <li>
                    <p>Pada <strong>Photo Delivery</strong>, foto barang yang diterima oleh pelanggan (beserta PIC penerima) di lokasi pelanggan yang dikirim</p>
                    <div style="margin-top: 10px; margin-bottom: 10px; width: 40%;" class="mx-auto">
                        <img src="/images/tutorial/driver/photo-delivery.png" alt="Photo Delivery - Sukses" style="width: 100%; border-radius: 4px;" />
                    </div>
                  </li>
                  <li>
                    <p>Pada <strong>Nama Penerima PIC</strong>, isikan dengan nama PIC penerima barang.</p>
                    <div style="margin-top: 10px; margin-bottom: 10px; width: 40%;" class="mx-auto">
                        <img src="/images/tutorial/driver/pic-name.png" alt="Nama PIC - Sukses" style="width: 100%; border-radius: 4px;" />
                    </div>
                  </li>
                  
                  <li>
                    <p>Pada <strong>Tanda Tangan Penerima</strong>, isikan tanda tangan PIC yang menerima. Lalu tekan tombol <strong>Lanjut</strong></p>
                    <div style="margin-top: 10px; margin-bottom: 10px; width: 40%;" class="mx-auto">
                        <img src="/images/tutorial/driver/sign.png" alt="Tanda Tangan - Sukses" style="width: 100%; border-radius: 4px;" />
                    </div>
                  </li>
                  <li>
                    <p>Pada opsi <strong>GPS Sesuai</strong>, sebagai contoh akan dipilih <strong>Ya</strong>. Lalu tekan tombol <strong>Selesaikan Tugas</strong> (<em>Finish Task</em>).</p>
                    <div style="margin-top: 10px; margin-bottom: 10px; width: 40%;" class="mx-auto">
                        <img src="/images/tutorial/driver/confirm-location-4.png" alt="GPS Sesuai - Sukses" style="width: 100%; border-radius: 4px;" />
                    </div>
                  </li>
                </ul>
                `,
              },
            ],
          },
          {
            id: 'status-partial',
            title: 'Tugas Terima Sebagian',
            blocks: [
              {
                type: 'text',
                content: `
                <p>Video dibawah ini adalah contoh pengisian tugas dengan status pengiriman <strong>terima sebagian</strong>.</p>
                <div style="margin-top: 10px; margin-bottom: 10px;">
                  <iframe 
                    width="100%" 
                    height="450" 
                    src="https://www.youtube.com/embed/UsiJSZ7wE90" 
                    title="YouTube video player" 
                    frameborder="0" 
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                    allowfullscreen>
                  </iframe>
                </div>
                <p>Berikut ini penjelasannya:</p>
                <ul class="list-decimal pl-5 space-y-2 mt-2">
                  <li>
                    <p>Di dalam halaman awal, terdapat informasi umum mengenai tugas. Jika <em>driver</em> sudah sampai di lokasi pelanggan, maka tekan tombol <strong>Klik Jika Sudah Sampai</strong>. Lalu tekan tombol <strong>Lanjut</strong>.</p>
                    <div style="margin-top: 10px; margin-bottom: 10px; width: 40%;" class="mx-auto">
                        <img src="/images/tutorial/driver/general-info-2.png" alt="Halaman Informasi Utama - Terima Sebagian" style="width: 100%; border-radius: 4px;" />
                    </div>
                  </li>
                  <li>
                    <p>Pada opsi <strong>Status Delivery</strong>, pilih opsi <strong>Terima Sebagian</strong>.</p>
                    <div style="margin-top: 10px; margin-bottom: 10px; width: 40%;" class="mx-auto">
                        <img src="/images/tutorial/driver/status-delivery.png" alt="Status Delivery - Terima Sebagian" style="width: 100%; border-radius: 4px;" />
                    </div>
                  </li>
                  <li>
                    <p>Terdapat beberapa tahap pengubahan daftar barang:</p>
                    <ol class="list-[lower-alpha] pl-5 space-y-2 mt-2">
                      <li>
                        <p>Pada <strong>List Product Tolakan</strong>, tekan tombol <strong>Tambah Ubah</strong> (<em>Edit</em>).</p>
                        <div style="margin-top: 10px; margin-bottom: 10px; width: 40%;" class="mx-auto">
                            <img src="/images/tutorial/driver/list-product-1.png" alt="List Product - Terima Sebagian" style="width: 100%; border-radius: 4px;" />
                        </div>
                      </li>
                      <li>
                        <p>Untuk mempermudah pencarian barang, dapat masukkan kode atau nama barang di kolom pencarian. Kurangi kuantitas pada barang yang ditolak dengan menekan tombol minus (-), lalu tekan tombol <strong>Simpan</strong> (<em>Save</em>).</p>
                        <div style="margin-top: 10px; margin-bottom: 10px; width: 40%;" class="mx-auto">
                            <img src="/images/tutorial/driver/list-product-2.png" alt="List Product - Terima Sebagian" style="width: 100%; border-radius: 4px;" />
                        </div>
                      </li>
                    </ol> 
                  </li>
                  <li>
                    <p>Pada <strong>Alasan</strong>, isikan alasan secara <u>jelas, detail, dan lengkap</u>. Terutama lengkapi alasan saat barang yang kirim dalam bentuk satuan terbesar (karton) tetapi barang yang ditolak dalam bentuk satuan terkecil (botol, kaleng, atau <em>pieces</em>).</p>
                    <div style="margin-top: 10px; margin-bottom: 10px; width: 40%;" class="mx-auto">
                        <img src="/images/tutorial/driver/reason.png" alt="Alasan - Terima Sebagian" style="width: 100%; border-radius: 4px;" />
                    </div>
                  </li>
                  <li>
                    <p>Pada <strong>Photo Delivery</strong>, foto barang yang diterima oleh pelanggan (beserta PIC penerima) di lokasi pelanggan yang dikirim</p>
                    <div style="margin-top: 10px; margin-bottom: 10px; width: 40%;" class="mx-auto">
                        <img src="/images/tutorial/driver/photo-delivery.png" alt="Photo Delivery - Terima Sebagian" style="width: 100%; border-radius: 4px;" />
                    </div>
                  </li>
                  <li>
                    <p>Pada <strong>Nama Penerima PIC</strong>, isikan dengan nama PIC penerima barang.</p>
                    <div style="margin-top: 10px; margin-bottom: 10px; width: 40%;" class="mx-auto">
                        <img src="/images/tutorial/driver/pic-name.png" alt="Nama PIC - Terima Sebagian" style="width: 100%; border-radius: 4px;" />
                    </div>
                  </li>
                  <li>
                    <p>Pada <strong>Tanda Tangan Penerima</strong>, isikan tanda tangan PIC yang menerima. Lalu tekan tombol <strong>Lanjut</strong></p>
                    <div style="margin-top: 10px; margin-bottom: 10px; width: 40%;" class="mx-auto">
                        <img src="/images/tutorial/driver/sign.png" alt="Tanda Tangan - Terima Sebagian" style="width: 100%; border-radius: 4px;" />
                    </div>
                  </li>
                  <li>
                    <p>Pada opsi <strong>GPS Sesuai</strong>, sebagai contoh akan dipilih <strong>Tidak</strong>. Lalu tekan tombol <strong>Selesaikan Tugas</strong>.</p>
                    <div style="margin-top: 10px; margin-bottom: 10px; width: 40%;" class="mx-auto">
                        <img src="/images/tutorial/driver/confirm-location-2.png" alt="GPS Sesuai - Terima Sebagian" style="width: 100%; border-radius: 4px;" />
                    </div>
                  </li>
                  <li>
                    <p>Pada opsi <strong>Klik Lokasi Client</strong>, tekan ikon bulat untuk mengisi titik koordinat secara otomatis berdasarkan lokasi <em>driver</em> saat itu. Lalu tekan tombol <strong>Selesaikan Tugas</strong>.</p>
                    <div style="margin-top: 10px; margin-bottom: 10px; width: 40%;" class="mx-auto">
                        <img src="/images/tutorial/driver/confirm-location-3.png" alt="Lokasi Client - Terima Sebagian" style="width: 100%; border-radius: 4px;" />
                    </div>
                  </li>
                </ul>
                `,
              },
            ],
          },
          {
            id: 'status-pending',
            title: 'Tugas Pending',
            blocks: [
              {
                type: 'text',
                content: `
                <p>Video dibawah ini adalah contoh pengisian tugas dengan status pengiriman <strong>pending</strong>.</p>
                <div style="margin-top: 10px; margin-bottom: 10px;">
                  <iframe 
                    width="100%" 
                    height="450" 
                    src="https://www.youtube.com/embed/5jH8HaHR0fQ" 
                    title="YouTube video player" 
                    frameborder="0" 
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                    allowfullscreen>
                  </iframe>
                </div>
                <p>Berikut ini penjelasannya:</p>
                <ul class="list-decimal pl-5 space-y-2 mt-2">
                  <li>
                    <p>Di dalam halaman awal, terdapat informasi umum mengenai tugas. Jika <em>driver</em> sudah sampai di lokasi pelanggan, maka tekan tombol <strong>Klik Jika Sudah Sampai</strong>. Lalu tekan tombol <strong>Lanjut</strong>.</p>
                    <div style="margin-top: 10px; margin-bottom: 10px; width: 40%;" class="mx-auto">
                        <img src="/images/tutorial/driver/general-info-2.png" alt="Halaman Informasi Utama - Pending" style="width: 100%; border-radius: 4px;" />
                    </div>
                  </li>
                  <li>
                    <p>Pada opsi <strong>Status Delivery</strong>, pilih opsi <strong>Pending</strong>.</p>
                    <div style="margin-top: 10px; margin-bottom: 10px; width: 40%;" class="mx-auto">
                        <img src="/images/tutorial/driver/status-delivery.png" alt="Status Delivery - Pending" style="width: 100%; border-radius: 4px;" />
                    </div>
                  </li>
                  <li>
                    <p>Pada <strong>Alasan</strong>, isikan alasan secara <u>jelas, detail, dan lengkap</u>.</p>
                    <div style="margin-top: 10px; margin-bottom: 10px; width: 40%;" class="mx-auto">
                        <img src="/images/tutorial/driver/reason.png" alt="Alasan - Pending" style="width: 100%; border-radius: 4px;" />
                    </div>
                  </li>
                  <li>
                    <p>Pada <strong>Photo Delivery</strong>, foto barang yang diterima oleh pelanggan (beserta PIC penerima) di lokasi pelanggan yang dikirim</p>
                    <div style="margin-top: 10px; margin-bottom: 10px; width: 40%;" class="mx-auto">
                        <img src="/images/tutorial/driver/photo-delivery.png" alt="Photo Delivery - Pending" style="width: 100%; border-radius: 4px;" />
                    </div>
                  </li>
                  <li>
                    <p>Pada <strong>Nama Penerima PIC</strong>, isikan dengan nama PIC penerima barang.</p>
                    <div style="margin-top: 10px; margin-bottom: 10px; width: 40%;" class="mx-auto">
                        <img src="/images/tutorial/driver/pic-name.png" alt="Nama PIC - Pending" style="width: 100%; border-radius: 4px;" />
                    </div>
                  </li>
                  <li>
                    <p>Pada <strong>Tanda Tangan Penerima</strong>, isikan tanda tangan PIC yang menerima. Lalu tekan tombol <strong>Lanjut</strong></p>
                    <div style="margin-top: 10px; margin-bottom: 10px; width: 40%;" class="mx-auto">
                        <img src="/images/tutorial/driver/sign.png" alt="Tanda Tangan - Pending" style="width: 100%; border-radius: 4px;" />
                    </div>
                  </li>
                  <li>
                    <p>Pada opsi <strong>GPS Sesuai</strong>, sebagai contoh akan dipilih <strong>Ya</strong>. Lalu tekan tombol <strong>Selesaikan Tugas</strong>.</p>
                    <div style="margin-top: 10px; margin-bottom: 10px; width: 40%;" class="mx-auto">
                        <img src="/images/tutorial/driver/confirm-location-4.png" alt="GPS Sesuai - Sukses" style="width: 100%; border-radius: 4px;" />
                    </div>
                  </li>
                </ul>
                `,
              },
            ],
          },
          {
            id: 'status-cancel',
            title: 'Tugas Batal',
            blocks: [
              {
                type: 'text',
                content: `
                <p>Video dibawah ini adalah contoh pengisian tugas dengan status pengiriman <strong>batal</strong>.</p>
                <div style="margin-top: 10px; margin-bottom: 10px;">
                  <iframe 
                    width="100%" 
                    height="450" 
                    src="https://www.youtube.com/embed/D856Tni_aBk" 
                    title="YouTube video player" 
                    frameborder="0" 
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                    allowfullscreen>
                  </iframe>
                </div>
                <p>Berikut ini penjelasannya:</p>
                <ul class="list-decimal pl-5 space-y-2 mt-2">
                  <li>
                    <p>Di dalam halaman awal, terdapat informasi umum mengenai tugas. Jika <em>driver</em> sudah sampai di lokasi pelanggan, maka tekan tombol <strong>Klik Jika Sudah Sampai</strong>. Lalu tekan tombol <strong>Lanjut</strong>.</p>
                    <div style="margin-top: 10px; margin-bottom: 10px; width: 40%;" class="mx-auto">
                        <img src="/images/tutorial/driver/general-info-2.png" alt="Halaman Informasi Utama - Batal" style="width: 100%; border-radius: 4px;" />
                    </div>
                  </li>
                  <li>
                    <p>Pada opsi <strong>Status Delivery</strong>, pilih opsi <strong>Batal</strong>.</p>
                    <div style="margin-top: 10px; margin-bottom: 10px; width: 40%;" class="mx-auto">
                        <img src="/images/tutorial/driver/status-delivery.png" alt="Status Delivery - Batal" style="width: 100%; border-radius: 4px;" />
                    </div>
                  </li>
                  <li>
                    <p>Pada <strong>Alasan</strong>, isikan alasan secara <u>jelas, detail, dan lengkap</u>.</p>
                    <div style="margin-top: 10px; margin-bottom: 10px; width: 40%;" class="mx-auto">
                        <img src="/images/tutorial/driver/reason.png" alt="Alasan - Batal" style="width: 100%; border-radius: 4px;" />
                    </div>
                  </li>
                  <li>
                    <p>Pada <strong>Photo Delivery</strong>, foto barang yang diterima oleh pelanggan (beserta PIC penerima) di lokasi pelanggan yang dikirim</p>
                    <div style="margin-top: 10px; margin-bottom: 10px; width: 40%;" class="mx-auto">
                        <img src="/images/tutorial/driver/photo-delivery.png" alt="Photo Delivery - Batal" style="width: 100%; border-radius: 4px;" />
                    </div>
                  </li>
                  <li>
                    <p>Pada <strong>Nama Penerima PIC</strong>, isikan dengan nama PIC penerima barang.</p>
                    <div style="margin-top: 10px; margin-bottom: 10px; width: 40%;" class="mx-auto">
                        <img src="/images/tutorial/driver/pic-name.png" alt="Nama PIC - Batal" style="width: 100%; border-radius: 4px;" />
                    </div>
                  </li>
                  <li>
                    <p>Pada <strong>Tanda Tangan Penerima</strong>, isikan tanda tangan PIC yang menerima. Lalu tekan tombol <strong>Lanjut</strong></p>
                    <div style="margin-top: 10px; margin-bottom: 10px; width: 40%;" class="mx-auto">
                        <img src="/images/tutorial/driver/sign.png" alt="Tanda Tangan - Batal" style="width: 100%; border-radius: 4px;" />
                    </div>
                  </li>
                  <li>
                    <p>Pada opsi <strong>GPS Sesuai</strong>, sebagai contoh akan dipilih <strong>Tidak</strong>. Lalu tekan tombol <strong>Selesaikan Tugas</strong>.</p>
                    <div style="margin-top: 10px; margin-bottom: 10px; width: 40%;" class="mx-auto">
                        <img src="/images/tutorial/driver/confirm-location-2.png" alt="GPS Sesuai - Batal" style="width: 100%; border-radius: 4px;" />
                    </div>
                  </li>
                  <li>
                    <p>Pada opsi <strong>Klik Lokasi Client</strong>, tekan ikon bulat untuk mengisi titik koordinat secara otomatis berdasarkan lokasi <em>driver</em> saat itu. Lalu tekan tombol <strong>Selesaikan Tugas</strong>.</p>
                    <div style="margin-top: 10px; margin-bottom: 10px; width: 40%;" class="mx-auto">
                        <img src="/images/tutorial/driver/confirm-location-3.png" alt="Lokasi Client - Batal" style="width: 100%; border-radius: 4px;" />
                    </div>
                  </li>
                </ul>
                `,
              },
            ],
          },
          {
            id: 'status-pending-gr',
            title: 'Tugas Pending GR',
            blocks: [
              {
                type: 'text',
                content: `
                <p class='underline text-red-500 text-lg'><strong>Kondisi ini dapat diabaikan apabila tidak ada kasus Pending GR (<em>Goods Receipt</em>).</strong></p>
                <p class='mt-3'>Video dibawah ini adalah contoh pengisian tugas dengan status pengiriman <strong>pending GR</strong>.</p>
                <div style="margin-top: 10px; margin-bottom: 10px;">
                  <iframe 
                    width="100%" 
                    height="450" 
                    src="https://www.youtube.com/embed/zZWUifeLeTk" 
                    title="YouTube video player" 
                    frameborder="0" 
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                    allowfullscreen>
                  </iframe>
                </div>
                <p>Berikut ini penjelasannya:</p>
                <ul class="list-decimal pl-5 space-y-2 mt-2">
                  <li>
                    <p>Di dalam halaman awal, terdapat informasi umum mengenai tugas. Jika <em>driver</em> sudah sampai di lokasi pelanggan, maka tekan tombol <strong>Klik Jika Sudah Sampai</strong>. Lalu tekan tombol <strong>Lanjut</strong>.</p>
                    <div style="margin-top: 10px; margin-bottom: 10px; width: 40%;" class="mx-auto">
                        <img src="/images/tutorial/driver/general-info-2.png" alt="Halaman Informasi Utama - Pending GR" style="width: 100%; border-radius: 4px;" />
                    </div>
                  </li>
                  <li>
                    <p>Pada opsi <strong>Status Delivery</strong>, pilih opsi <strong>Pending GR</strong>.</p>
                    <div style="margin-top: 10px; margin-bottom: 10px; width: 40%;" class="mx-auto">
                        <img src="/images/tutorial/driver/status-delivery.png" alt="Status Delivery - Pending GR" style="width: 100%; border-radius: 4px;" />
                    </div>
                  </li>
                  <li>
                    <p>Pada <strong>Alasan</strong>, isikan alasan secara <u>jelas, detail, dan lengkap</u>.</p>
                    <div style="margin-top: 10px; margin-bottom: 10px; width: 40%;" class="mx-auto">
                        <img src="/images/tutorial/driver/reason.png" alt="Alasan - Pending GR" style="width: 100%; border-radius: 4px;" />
                    </div>
                  </li>
                  <li>
                    <p>Pada <strong>Photo Delivery</strong>, foto barang yang diterima oleh pelanggan (beserta PIC penerima) di lokasi pelanggan yang dikirim</p>
                    <div style="margin-top: 10px; margin-bottom: 10px; width: 40%;" class="mx-auto">
                        <img src="/images/tutorial/driver/photo-delivery.png" alt="Photo Delivery - Pending GR" style="width: 100%; border-radius: 4px;" />
                    </div>
                  </li>
                  <li>
                    <p>Pada <strong>Nama Penerima PIC</strong>, isikan dengan nama PIC penerima barang.</p>
                    <div style="margin-top: 10px; margin-bottom: 10px; width: 40%;" class="mx-auto">
                        <img src="/images/tutorial/driver/pic-name.png" alt="Nama PIC - Pending GR" style="width: 100%; border-radius: 4px;" />
                    </div>
                  </li>
                  <li>
                    <p>Pada <strong>Tanda Tangan Penerima</strong>, isikan tanda tangan PIC yang menerima. Lalu tekan tombol <strong>Lanjut</strong></p>
                    <div style="margin-top: 10px; margin-bottom: 10px; width: 40%;" class="mx-auto">
                        <img src="/images/tutorial/driver/sign.png" alt="Tanda Tangan - Pending GR" style="width: 100%; border-radius: 4px;" />
                    </div>
                  </li>
                  <li>
                    <p>Pada opsi <strong>GPS Sesuai</strong>, sebagai contoh akan dipilih <strong>Ya</strong>. Lalu tekan tombol <strong>Selesaikan Tugas</strong>.</p>
                    <div style="margin-top: 10px; margin-bottom: 10px; width: 40%;" class="mx-auto">
                        <img src="/images/tutorial/driver/confirm-location-4.png" alt="GPS Sesuai - Sukses" style="width: 100%; border-radius: 4px;" />
                    </div>
                  </li>
                </ul>
                `,
              },
              {
                type: 'text',
                content: `
                <p>Pada saat <em>driver</em> menerima tugas dengan alur <em>Pending GR</em>, maka terdapat beberapa perbedaan dalam pengisian kolomnya.</p>
                <p>Video dibawah ini adalah contoh pengisian tugas dengan alur pending GR yang <strong>sukses</strong> dan <strong>pending</strong>.</p>
                <div style="margin-top: 10px; margin-bottom: 10px;">
                  <iframe 
                    width="100%" 
                    height="450" 
                    src="https://www.youtube.com/embed/N-ZUemoeIGE" 
                    title="YouTube video player" 
                    frameborder="0" 
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                    allowfullscreen>
                  </iframe>
                </div>
                <p class=" font-bold text-2xl underline mb-2">Status Sukses</p>
                <p>Berikut ini alur pengerjaan tugas dengan alur Pending GR yang <strong>sukses</strong>. Pada halaman tugas Pending GR ini, hanya terdapat 1 halaman. Terdapat informasi umum terkait tugas tersebut. Lalu pilih status GR <strong>Sukses</strong> dan tekan tombol <strong>Selesaikan Tugas</strong>.</p>  
                <div style="margin-top: 10px; margin-bottom: 10px; width: 40%;" class="mx-auto">
                    <img src="/images/tutorial/driver/pending-gr-1.png" alt="Pending GR - Sukses" style="width: 100%; border-radius: 4px;" />
                </div>
                
                <p class=" font-bold text-2xl underline mb-2">Status Pending</p>  
                <p>Berikut ini alur pengerjaan tugas dengan alur Pending GR yang <strong>pending</strong>. Pada halaman tugas Pending GR ini, hanya terdapat 1 halaman. Terdapat informasi umum terkait tugas tersebut. Lalu pilih status GR <strong>Pending</strong> dan isikan alasannya secara <u>jelas, detail, dan lengkap</u>. Lalu tekan tombol <strong>Selesaikan Tugas</strong>.</p>  
                <div style="margin-top: 10px; margin-bottom: 10px; width: 40%;" class="mx-auto">
                    <img src="/images/tutorial/driver/pending-gr-2.png" alt="Pending GR - Pending" style="width: 100%; border-radius: 4px;" />
                </div>
                `,
              },
            ],
          },
        ],
      },
    ],
  },
];
