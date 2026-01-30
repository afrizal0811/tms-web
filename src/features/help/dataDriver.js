export const driverTopics = [
  {
    id: 'driver-intro',
    category: 'driver',
    title: 'Manfaat TMS (Driver)',
    blocks: [
      {
        type: 'text',
        content: `<p>Transportation Management System (TMS) adalah solusi untuk memudahkan pengelolaan transportasi di perusahaan. Berikut ini adalah beberapa manfaat untuk Driver saat menggunakan TMS:</p>
        <ul class="list-disc pl-5 space-y-2 mt-2">
          <li>
            <p class="font-bold">Navigasi Otomatis</p>
            <p>Terintegrasi dengan Google Maps/Waze untuk panduan rute tercepat dan terhindar dari kemacetan.</p>
          </li>
          <li>
            <p class="font-bold">Update Tugas Real-time</p>
            <p>Menerima dan memperbarui status pengiriman langsung dari aplikasi, tanpa perlu komunikasi manual.</p>
          </li>
          <li>
            <p class="font-bold">Upload Bukti Pengiriman (POD)</p>
            <p>Dapat langsung mengunggah bukti pengiriman dari HP, mengurangi penggunaan kertas dan mempercepat validasi pengiriman.</p>
          </li>
        </ul>`,
      },
    ],
  },
  {
    id: 'driver-app',
    category: 'driver',
    title: 'Aplikasi Driver',
    blocks: [{ type: 'text', content: '<p>Panduan penggunaan aplikasi mobile untuk driver.</p>' }],
    subTopics: [
      {
        id: 'driver-login',
        title: 'Login & Absensi',
        blocks: [{ type: 'text', content: '<p>Cara melakukan login dan absensi harian.</p>' }],
      },
      {
        id: 'driver-pod',
        title: 'Upload Bukti Kirim (POD)',
        blocks: [
          {
            type: 'text',
            content: '<p>Pastikan foto bukti kirim terlihat jelas dan tidak buram.</p>',
          },
          { type: 'image', src: '/images/good-pod-example.jpg', alt: 'Contoh POD Bagus' },
        ],
      },
    ],
  },
];
