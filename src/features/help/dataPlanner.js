export const plannerTopics = [
  // INTRO
  {
    id: 'planner-intro',
    category: 'planner',
    title: 'Pembukaan',
    blocks: [
      {
        type: 'text',
        content: `<p><span class='italic'>Transportation Management System </span> (TMS) adalah solusi untuk memudahkan pengelolaan transportasi di perusahaan. Berikut ini adalah beberapa manfaat untuk <span class='italic'>Planner</span> saat menggunakan TMS:</p>
        <ul class="list-disc pl-5 space-y-2 mt-2">
            <li>
                <p class="font-bold">Optimasi Rute & Penjadwalan</p>
                <p>Sistem membantu merencanakan rute dan jadwal terbaik untuk menghemat waktu dan biaya bahan bakar.</p>
            </li>
            <li>
                <p class="font-bold">Monitoring Status Pengiriman</p>
                <p>Dapat melihat status pengiriman secara real-time sehingga mudah mengatur prioritas dan merespons kendala di lapangan.</p>
            </li>
            <li>
                <p class="font-bold">Kemudahan Koordinasi</p>
                <p>Semua data (driver, kendaraan, rute, pelanggan) terpusat di satu dashboard sehingga komunikasi dan pengelolaan lebih efisien.</p>
            </li>
        </ul>`,
      },
      {
        type: 'text',
        content: `<p>TMS di Pangan Lestari menggunakan <span class='font-bold'>MileApp</span> sebagai platform. Berikut ini cara untuk masuk dan pengaturan awal di aplikasi TMS:</p>
        <ul class="list-decimal pl-5 space-y-2 mt-2">
          <li>
            <p class="font-bold">Login</p>
            <ul class="list-disc pl-5 space-y-2 mt-2">
              <li>
                <p>Admin <span class='italic'>planner</span> diharuskan masuk terlebih dahulu untuk mengakses aplikasi dengan menggunakan tautan berikut: <a href="https://web.mile.app/login" target="_blank"  class='underline text-blue-400'>https://web.mile.app/login</a>
                </p>
              </li>
              <li>
                <p>Masukkan surel dan kata sandi yang sudah diberikan oleh admin. Jika belum ada, <span class='font-bold'>silahkan hubungi admin</span>.</p>
                <div style="margin-top: 10px; margin-bottom: 10px; width: 50%;" class="mx-auto">
                    <img src="/images/tutorial/planner/login.png" alt="Tampilan Login" style="width: 100%; border-radius: 4px;" />
                </div>
              </li>
            </ul>
          </li>
          <li>
            <p class="font-bold">Pengaturan</p>
            <p>Penggunaan bahasa di apliakasi ini dapat diubah dengan cara:</p>
            <ul class="list-disc pl-5 space-y-2 mt-2">
              <li>
                <p>Tekan ikon profil di pojok kanan atas. Lalu, pilih <span class='italic'>Profile</span>.</p>
                <div style="margin-top: 10px; margin-bottom: 10px; width: 50%;" class="mx-auto">
                    <img src="/images/tutorial/planner/setting-1-v2.png" alt="profile" style="width: 100%; border-radius: 4px;" />
                </div>
              </li>
              <li>
                <p>Pada bagian Bahasa (<span class='italic'>Language</span>), pilih bahasa yang diinginkan. Lalu tekan tombol Simpan (<span class='italic'>Save</span>)</p>
                <div style="margin-top: 10px; margin-bottom: 10px; width: 50%;" class="mx-auto">
                    <img src="/images/tutorial/planner/setting-2-v2.png" alt="select-lang" style="width: 100%; border-radius: 4px;" />
                </div>
              </li>
            </ul>
          </li>
        </ul>`,
      },
      {
        type: 'text',
        content: '<p class="underline">Untuk memperjelas, perhatikan video berikut ini:</p>',
      },
      { type: 'video', src: 'https://www.youtube.com/embed/kV_hDSno59A' },
    ],
  },
  // TASK
  {
    id: 'task-management',
    category: 'planner',
    title: 'Manajemen Tugas (Task)',
    blocks: [
      {
        type: 'text',
        content: `<p><span class='font-bold'>Modul Tugas</span> (<span class='italic'>Task</span>) adalah pusat kendali untuk mengelola tugas, mulai dari penambahan tugas secara manual sampai dengan export laporan task. Selain itu, pada halaman ini bisa memantau tugas yang sedang berjalan (<span class="italic">real-time</span>).</p>`,
      },
      {
        type: 'image',
        src: '/images/tutorial/planner/task-modul-v2.png',
        alt: 'Modul Task',
      },
      {
        type: 'text',
        content: `<p>Berikut penjelasan:</p>
          <ol class="list-decimal pl-5 space-y-2 mt-2">
            <li>
                <p class="font-bold">Modul <span class='italic'>Task</span></p>
                <p>Modul untuk mengelola tugas seperti menambah, menyunting, dan menghapus.</p>
            </li>
            <li>
                <p class="font-bold">Submodul <span class='italic'>Tracking</span></p>
                <p>Modul untuk memonitor task dan lokasi tiap sopir (<span class='italic'>driver</span>) secara <span class='italic'>real-time</span>.</p>
            </li>
            <li>
                <p class="font-bold">Submodul <span class='italic'>Schedule</span></p>
                <p>Modul untuk mengelola jadwal pengiriman.</p>
            </li>
            <li>
                <p class="font-bold">Submodul <span class='italic'>Gallery</span> </p>
                <p>Modul untuk melihat <span class='italic'>Proof of Delivery</span> (POD) berupa foto yang sudah dilakukan oleh sopir.</p>
            </li>
            <li>
                <p class="font-bold">Daftar Hub</p>
                <p>Daftar hub yang aktif</p>
            </li>           
            <li>
                <p class="font-bold">Filter</p>
                <p>Filter task berdasarkan status, nama <span class='italic'>assignee</span>, nama alur (<span class='italic'>flow</span>), tanggal mulai dan selesai tugas, serta filter manual.</p>
            </li>
            <li>
                <p class="font-bold"><span class='italic'>New Task</span></p>
                <p>Tombol untuk membuat tugas baru secara manual.</p>
            </li>
            <li>
                <p class="font-bold"><span class='italic'>Export Task</span></p>
                <p>Tombol untuk <span class='italic'>export</span> laporan task dalam bentuk excel.</p>
            </li>
            <li>
                <p class="font-bold"><span class='italic'>Action Task</span></p>
                <p>Tombol untuk mengelola tugas secara bersamaan.</p>
            </li>
            <li>
                <p class="font-bold">Kolom <span class='italic'>Flow</span></p>
                <p>Kolom berisikan alur yang digunakan untuk tugas.</p>
            </li>
            <li>
                <p class="font-bold">Kolom <span class='italic'>Title</span></p>
                <p>Kolom berisikan nama <span class='italic'>customer</span>, id <span class='italic'>customer</span>, dan id lokasi.</p>
            </li>
            <li>
                <p class="font-bold">Kolom <span class='italic'>Content</span></p>
                <p>Kolom berisikan nomor faktur.</p>
            </li>
            <li>
                <p class="font-bold">Kolom Label</p>
                <p>Kolom berisikan status pengiriman.</p>
            </li>
            <li>
                <p class="font-bold">Kolom <span class='italic'>Start Time</span></p>
                <p>Kolom berisikan tanggal tugas bisa dikerjakan.</p>
            </li>
            <li>
                <p class="font-bold">Kolom Status</p>
                <p>Kolom berisikan status tugas.</p>
            </li>
            <li>
                <p class="font-bold">Kolom <span class='italic'>Assignee</span></p>
                <p>Kolom berisikan data sopir yang akan menjalankan tugas.</p>
            </li>
            <li>
                <p class="font-bold">Kolom <span class='italic'>Action</span></p>
                <p>Kolom berisikan tombol untuk mengelola tugas.</p>
            </li>            
          </ol>`,
      },
    ],
    subTopics: [
      {
        id: 'task-create',
        title: 'Membuat Task Baru',
        blocks: [
          {
            type: 'text',
            content: `<p>Penambahan tugas baru di <span class='font-bold'>MileApp</span> dapat dilakukan dengan dua cara, yaitu <span class='italic'>import</span> file Excel dari <span class='font-bold'>Acumatica</span> dan <span class='italic'>import</span> manual. Berikut ini penjelasan untuk masing-masing cara penambahan tugas baru</p>`,
          },
        ],
        subSubTopics: [
          {
            id: 'task-create-acumatica',
            title: 'Import Acumatica', // Level 3
            blocks: [
              {
                type: 'text',
                content: `<p>Penambahan tugas baru dapat dilakukan dengan menggunakan <span class='italic'>import</span> file Excel dari <span class='font-bold'>Acumatica</span>. Berikut penjelasan dan cara melakukannya:</p>
                <ul class="list-decimal pl-5 space-y-2 mt-2">
                <li>
                  <p>Buka menu <span class='italic underline'>Order Template TMS Report</span> di <span class='font-bold'>Acumatica</span>.</p>
                  <div style="margin-top: 10px; margin-bottom: 10px; width: 50%;" class="mx-auto">
                      <img src="/images/tutorial/planner/acumatica-1.png" alt="acm-1" style="width: 100%; border-radius: 4px;" />
                  </div>
                </li>
                <li>
                  <p>Sesuaikan filter yang diperlukan, yaitu lokasi cabang, tanggal mulai, tanggal selesai, gudang, dan tipe penyimpanan. Lalu tekan tombol <span class='italic'>Run Report</span>.</p>
                  <div style="margin-top: 10px; margin-bottom: 10px; width: 80%;" class="mx-auto">
                      <img src="/images/tutorial/planner/acumatica-2.png" alt="acm-2" style="width: 100%; border-radius: 4px;" />
                  </div>
                </li>
                <li>
                  <p>Tekan tombol <span class='italic'>Export</span>, lalu pilih Excel. Tunggu hingga proses unduh selesai.</p>
                  <div style="margin-top: 10px; margin-bottom: 10px; width: 100%;" class="mx-auto">
                      <img src="/images/tutorial/planner/acumatica-3.png" alt="acm-3" style="width: 100%; border-radius: 4px;" />
                  </div>
                </li>
                <li>
                  <p>Periksa tiap kolom yang tersedia untuk memastikan tidak ada data yang kosong. Data yang kosong dapat <span class='font-bold'>diisikan sementara</span> oleh <span class='italic'>planner</span> dan harus dilaporkan supaya master data customer dapat diperbarui.</p>
                  <div style="margin-top: 10px; margin-bottom: 10px; width: 100%;" class="mx-auto">
                      <img src="/images/tutorial/planner/acumatica-4.png" alt="acm-4" style="width: 100%; border-radius: 4px;" />
                  </div>
                </li>
                <li>
                  <p>Di <span class='font-bold'>MileApp</span>, tekan modul <span class='italic underline'>Custom Upload Delivery</span>.</p>
                  <div style="margin-top: 10px; margin-bottom: 10px; width: 60%;" class="mx-auto">
                      <img src="/images/tutorial/planner/cud-1.png" alt="cud-1" style="width: 100%; border-radius: 4px;" />
                  </div>
                </li>
                <li>
                  <p>Di modul ini, pilih hub sesuai lokasi cabang, pilih alur <span class = 'italic'>Delivery</span>, lalu unggah file Excel yang sudah di-<span class='italic'>export</span>.</p>
                  <div style="margin-top: 10px; margin-bottom: 10px; width: 100%;" class="mx-auto">
                      <img src="/images/tutorial/planner/cud-2.png" alt="cud-2" style="width: 100%; border-radius: 4px;" />
                  </div>
                </li>
                <li>
                  <p>Tekan tombol <span class='italic'>Upload</span> dan tunggu sampai prosesnya selesai. Setelah itu, muncul tabel dari hasil pemrosesan. Jika masih ada kesalahan pada data yang diunggah, maka <span class='font-bold'>lakukan perbaikan</span> pada file Excel yang digunakan, lalu <span class='font-bold'>unggah ulang</span> file Excel yang sudah diperbaiki.</p>
                  <div style="margin-top: 10px; margin-bottom: 10px; width: 90%;" class="mx-auto">
                      <img src="/images/tutorial/planner/cud-3.png" alt="cud-3" style="width: 100%; border-radius: 4px;" />
                  </div>
                </li>
                <li>
                  <p>Tekan tombol <span class='italic'>Submit</span> dan tunggu sampai prosesnya selesai. Setelah itu, akan muncul notifikasi bahwa data telah berhasil atau gagal diunggah.</p>
                  <div style="margin-top: 10px; margin-bottom: 10px; width: 90%;" class="mx-auto">
                      <img src="/images/tutorial/planner/cud-4.png" alt="cud-4" style="width: 100%; border-radius: 4px;" />
                  </div>
                </li>
              </ul>`,
              },
              {
                type: 'text',
                content:
                  '<p class="underline">Untuk memperjelas, perhatikan video berikut ini:</p>',
              },
              { type: 'video', src: 'https://www.youtube.com/embed/g7rEVfviOQ8' },
            ],
          },
          {
            id: 'task-create-manual',
            title: 'Input Manual', // Level 3
            blocks: [
              {
                type: 'text',
                content: `<p>Penambahan tugas baru dapat dilakukan dengan menggunakan <span class='italic'>import</span> file Excel dari <span class='font-bold'>Acumatica</span>. Berikut penjelasan dan cara melakukannya:</p>
                <ul class="list-decimal pl-5 space-y-2 mt-2">
                <li>
                  <p>Buka menu <span class='italic underline'>Order Template TMS Report</span> di <span class='font-bold'>Acumatica</span>.</p>
                  <div style="margin-top: 10px; margin-bottom: 10px; width: 50%;" class="mx-auto">
                      <img src="/images/tutorial/planner/acumatica-1.png" alt="acm-1" style="width: 100%; border-radius: 4px;" />
                  </div>
                </li>
                <li>
                  <p>Sesuaikan filter yang diperlukan, yaitu lokasi cabang, tanggal mulai, tanggal selesai, gudang, dan tipe penyimpanan. Lalu tekan tombol <span class='italic'>Run Report</span>.</p>
                  <div style="margin-top: 10px; margin-bottom: 10px; width: 80%;" class="mx-auto">
                      <img src="/images/tutorial/planner/acumatica-2.png" alt="acm-2" style="width: 100%; border-radius: 4px;" />
                  </div>
                </li>
                <li>
                  <p>Tekan tombol <span class='italic'>Export</span>, lalu pilih Excel. Tunggu hingga proses unduh selesai.</p>
                  <div style="margin-top: 10px; margin-bottom: 10px; width: 100%;" class="mx-auto">
                      <img src="/images/tutorial/planner/acumatica-3.png" alt="acm-3" style="width: 100%; border-radius: 4px;" />
                  </div>
                </li>
                <li>
                  <p>Periksa tiap kolom yang tersedia untuk memastikan tidak ada data yang kosong. Data yang kosong dapat <span class='font-bold'>diisikan sementara</span> oleh <span class='italic'>planner</span> dan harus dilaporkan supaya master data customer dapat diperbarui.</p>
                  <div style="margin-top: 10px; margin-bottom: 10px; width: 100%;" class="mx-auto">
                      <img src="/images/tutorial/planner/acumatica-4.png" alt="acm-4" style="width: 100%; border-radius: 4px;" />
                  </div>
                </li>
                <li>
                  <p>Di <span class='font-bold'>MileApp</span>, tekan modul <span class='italic underline'>Custom Upload Delivery</span>.</p>
                  <div style="margin-top: 10px; margin-bottom: 10px; width: 60%;" class="mx-auto">
                      <img src="/images/tutorial/planner/cud-1.png" alt="cud-1" style="width: 100%; border-radius: 4px;" />
                  </div>
                </li>
                <li>
                  <p>Di modul ini, pilih hub sesuai lokasi cabang, pilih alur <span class = 'italic'>Delivery</span>, lalu unggah file Excel yang sudah di-<span class='italic'>export</span>.</p>
                  <div style="margin-top: 10px; margin-bottom: 10px; width: 100%;" class="mx-auto">
                      <img src="/images/tutorial/planner/cud-2.png" alt="cud-2" style="width: 100%; border-radius: 4px;" />
                  </div>
                </li>
                <li>
                  <p>Tekan tombol <span class='italic'>Upload</span> dan tunggu sampai prosesnya selesai. Setelah itu, muncul tabel dari hasil pemrosesan. Jika masih ada kesalahan pada data yang diunggah, maka <span class='font-bold'>lakukan perbaikan</span> pada file Excel yang digunakan, lalu <span class='font-bold'>unggah ulang</span> file Excel yang sudah diperbaiki.</p>
                  <div style="margin-top: 10px; margin-bottom: 10px; width: 90%;" class="mx-auto">
                      <img src="/images/tutorial/planner/cud-3.png" alt="cud-3" style="width: 100%; border-radius: 4px;" />
                  </div>
                </li>
                <li>
                  <p>Tekan tombol <span class='italic'>Submit</span> dan tunggu sampai prosesnya selesai. Setelah itu, akan muncul notifikasi bahwa data telah berhasil atau gagal diunggah.</p>
                  <div style="margin-top: 10px; margin-bottom: 10px; width: 90%;" class="mx-auto">
                      <img src="/images/tutorial/planner/cud-4.png" alt="cud-4" style="width: 100%; border-radius: 4px;" />
                  </div>
                </li>
              </ul>`,
              },
              {
                type: 'text',
                content:
                  '<p class="underline">Untuk memperjelas, perhatikan video berikut ini:</p>',
              },
              { type: 'video', src: 'https://www.youtube.com/embed/YDcbmhUpZlg' },
            ],
          },
        ],
      },
      {
        id: 'task-edit',
        title: 'Mengedit & Menghapus',
        blocks: [
          {
            type: 'text',
            content:
              '<p>Jika terjadi kesalahan input, Anda dapat mengedit task selama statusnya belum "On Delivery".</p>',
          },
          { type: 'video', src: 'https://www.youtube.com/embed/another-video-id' },
        ],
        subSubTopics: [
          {
            id: 'task-create-manual',
            title: 'Input Manual', // Level 3
            blocks: [{ type: 'text', content: '<p>Cara input satu per satu...</p>' }],
          },
          {
            id: 'task-create-bulk',
            title: 'Upload Excel (Bulk)', // Level 3
            blocks: [{ type: 'text', content: '<p>Cara upload banyak task sekaligus...</p>' }],
          },
        ],
      },
    ],
  },
  // ROUTING
];
