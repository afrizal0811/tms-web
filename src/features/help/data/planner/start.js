export const startTopic = [
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
            <p>Bahasa yang digunakan dalam aplikasi ini dapat diubah sesuai dengan kebutuhan. Perhatikan video berikut ini:</p>
            <div style="margin-top: 10px; margin-bottom: 10px;">
              <iframe 
                width="100%" 
                height="450" 
                src="https://www.youtube.com/embed/kV_hDSno59A" 
                title="YouTube video player" 
                frameborder="0" 
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                allowfullscreen>
              </iframe>
            </div>
            <p class='underline'>Berikut ini penjelasannya:</p>
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
        </ul>
        `,
      },
    ],
  },
];
