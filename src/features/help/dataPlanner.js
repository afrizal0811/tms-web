export const plannerTopics = [
  {
    id: 'planner-intro',
    category: 'planner',
    title: 'Manfaat TMS (Planner)',
    blocks: [
      {
        type: 'text',
        content: `<p>Transportation Management System (TMS) adalah solusi untuk memudahkan pengelolaan transportasi di perusahaan. Berikut ini adalah beberapa manfaat untuk Planner saat menggunakan TMS:</p>
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
    ],
  },
  {
    id: 'task-management',
    category: 'planner',
    title: 'Manajemen Tugas (Task)',
    blocks: [
      {
        type: 'text',
        content:
          '<p>Modul Task adalah pusat kendali untuk mengelola tugas, mulai dari penambahan tugas secara manual sampai dengan export laporan task. Selain itu, pada halaman ini bisa memantau tugas yang sedang berjalan (<span class="italic">real-time</span>).</p>',
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
                <p class="font-bold">Submodul Task</p>
                <p>Modul untuk mengelola tugas (task) seperti penambahan, pengeditan, dan penghapusan.</p>
            </li>
            <li>
                <p class="font-bold">Submodul Tracking</p>
                <p>Modul untuk memonitor task dan lokasi tiap sopir (driver) secara real-time.</p>
            </li>
            <li>
                <p class="font-bold">Submodul Schedule</p>
                <p>Modul untuk mengelola jadwal pengiriman.</p>
            </li>
            <li>
                <p class="font-bold">Submodul Gallery </p>
                <p>Modul untuk melihat Proof of Delivery (POD) berupa foto yang sudah dilakukan oleh driver.</p>
            </li>
            <li>
                <p class="font-bold">Daftar Hub</p>
                <p>Daftar hub yang aktif</p>
            </li>           
            <li>
                <p class="font-bold">Filter</p>
                <p>Filter task berdasarkan status, nama user, nama flow, tanggal mulai dan selesai task, serta input manual.</p>
            </li>
            <li>
                <p class="font-bold">New Task</p>
                <p>Tombol untuk membuat task baru secara manual.</p>
            </li>
            <li>
                <p class="font-bold">Export Task</p>
                <p>Tombol untuk export laporan task dalam bentuk excel.</p>
            </li>
            <li>
                <p class="font-bold">Action Task</p>
                <p>Tombol untuk mengelola task secara bersamaan.</p>
            </li>
            <li>
                <p class="font-bold">Kolom Flow</p>
                <p>Kolom berisikan alur (flow) yang digunakan untuk task.</p>
            </li>
            <li>
                <p class="font-bold">Kolom Title</p>
                <p>Kolom berisikan nama customer, id customer, dan id lokasi.</p>
            </li>
            <li>
                <p class="font-bold">Kolom Content</p>
                <p>Kolom berisikan nomor faktur.</p>
            </li>
            <li>
                <p class="font-bold">Kolom Label</p>
                <p>Kolom berisikan status pengiriman.</p>
            </li>
            <li>
                <p class="font-bold">Kolom Start Time</p>
                <p>Kolom berisikan tanggal task bisa dikerjakan.</p>
            </li>
            <li>
                <p class="font-bold">Kolom Status</p>
                <p>Kolom berisikan status task.</p>
            </li>
            <li>
                <p class="font-bold">Kolom Assignee</p>
                <p>Kolom berisikan data driver yang akan menjalankan task.</p>
            </li>
            <li>
                <p class="font-bold">Kolom Action</p>
                <p>Kolom berisikan tombol untuk mengelola task.</p>
            </li>            
          </ol>`,
      },
    ],
    subTopics: [
      {
        id: 'task-create',
        title: '1. Membuat Task Baru',
        blocks: [
          {
            type: 'text',
            content:
              '<p>Untuk membuat task baru, klik tombol <strong>+ Add Task</strong> di pojok kanan atas.</p>',
          },
          {
            type: 'image',
            src: '/images/tutorial/planner/add-task-btn.png',
            alt: 'Tombol Add Task',
          },
          { type: 'text', content: '<p>Isi form sesuai dengan data pelanggan dan muatan.</p>' },
        ],
      },
      {
        id: 'task-edit',
        title: '2. Mengedit & Menghapus',
        blocks: [
          {
            type: 'text',
            content:
              '<p>Jika terjadi kesalahan input, Anda dapat mengedit task selama statusnya belum "On Delivery".</p>',
          },
          { type: 'video', src: 'https://www.youtube.com/embed/another-video-id' },
        ],
      },
    ],
  },
];
