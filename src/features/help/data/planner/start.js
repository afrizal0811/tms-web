export const startTopic = [
  // INTRO
  {
    id: 'planner-intro',
    category: 'planner',
    title: 'Pembukaan',
    blocks: [
      {
        type: 'text',
        content: `<p><em>Transportation Management System </em> (TMS) adalah solusi untuk memudahkan pengelolaan transportasi di perusahaan. Berikut ini adalah beberapa manfaat untuk <em>Planner</em> saat menggunakan TMS:</p>
        <ul <ul class="list-decimal pl-5 space-y-2 mt-2">
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
              <p>Semua data (<em>driver</em>, kendaraan, rute, pelanggan) terpusat di satu <em>dashboard</em> sehingga komunikasi dan pengelolaan lebih efisien.</p>
          </li>
        </ul>`,
      },
      {
        type: 'text',
        content: `<p>TMS di Pangan Lestari menggunakan <strong>MileApp</strong>. Berikut ini cara untuk masuk dan pengaturan awal di aplikasi TMS:</p>
        <ul class="list-decimal pl-5 space-y-2 mt-2">
          <li>
            <p class="font-bold underline mb-2">Masuk (<em>Login</em>)</p>     
            <p>Untuk mengakses aplikasi, <em>planner</em> harus masuk ke dalam aplikasi terlebih dahulu. Berikut caranya:</p>     
            <ol class="list-[lower-alpha] pl-5 space-y-2 mt-2">
              <li>
                <p>Buka tautan berikut: <a href="https://web.mile.app/login" target="_blank"  class='underline text-blue-400'>https://web.mile.app/login</a>
                </p>
              </li>
              <li>
                <p>Masukkan surel dan kata sandi yang sudah diberikan oleh admin. Jika belum ada, <strong>silahkan hubungi admin</strong>.</p>
                <div style="margin-top: 10px; margin-bottom: 10px; width: 50%;" class="mx-auto">
                    <img src="/images/tutorial/planner/login.png" alt="Tampilan Login" style="width: 100%; border-radius: 4px;" />
                </div>
              </li>
            </ol>
          </li>
          <li>
            <p class="font-bold underline mb-2">Pengaturan (<em>Setting</em>)</p>         
            <p>Bahasa yang digunakan dalam aplikasi ini dapat diubah sesuai dengan kebutuhan. </p>
            <p class='underline mb-2'>Perhatikan video berikut ini:</p>
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
            <p'>Berikut ini penjelasannya:</p>
            <ol class="list-[lower-alpha] pl-5 space-y-2 mt-2">
              <li>
                <p>Tekan ikon profil di pojok kanan atas. Lalu, pilih <em>Profile</em>.</p>
                <div style="margin-top: 10px; margin-bottom: 10px; width: 50%;" class="mx-auto">
                    <img src="/images/tutorial/planner/setting-1.png" alt="Pengaturan Profil" style="width: 100%; border-radius: 4px;" />
                </div>
              </li>
              <li>
                <p>Pada bagian Bahasa (<em>Language</em>), pilih bahasa yang diinginkan. Lalu tekan tombol Simpan (<em>Save</em>)</p>
                <div style="margin-top: 10px; margin-bottom: 10px; width: 60%;" class="mx-auto">
                    <img src="/images/tutorial/planner/setting-2.png" alt="Pilih Bahasa" style="width: 100%; border-radius: 4px;" />
                </div>
              </li>
            </ol>
          </li>
        </ul>
        `,
      },
    ],
  },
];
