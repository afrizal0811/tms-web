export const startTripTopic = [
  {
    id: 'driver-start-trip',
    category: 'driver',
    title: 'Mulai Perjalanan',
    blocks: [
      {
        type: 'text',
        content: `<p>Hal pertama yang harus dilakukan oleh <em>driver</em> setelah berhasil masuk ke aplikasi adalah mencatat waktu awal pekerjaan yang digunakan sebagai acuan awal untuk menghitung lama waktu pekerjaannya. Selain itu, <em>driver</em> perlu melakukan sinkronisasi data agar seluruh informasi perjalanan dan tugas dapat diperbarui dan tersimpan dengan benar.</p>
        <p class='underline mb-2'>Perhatikan video berikut ini:</p>
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
        `,
      },
      {
        type: 'text',
        content: `
          <p>Berikut ini penjelasannya:</p>
          <ul class="list-decimal pl-5 space-y-2 mt-2">
          <li>
            <p>Saat berhasil masuk ke aplikasi, muncul jendela <strong>Mulai Perjalanan</strong> (<em>Start Trip</em>) untuk mencatat waktu awal pekerjaan. <em>Driver</em> harus dalam <strong>radius 500 meter</strong> dari gudang untuk dapat memulai perjalanan. Tekan tombol Mulai (<em>Start</em>) dan untuk memulai perjalanan.</p>
            <div style="margin-top: 10px; margin-bottom: 10px; width: 40%;" class="mx-auto">
                <img src="/images/tutorial/driver/start-trip-1.png" alt="Memulai Perjalanan - 1" style="width: 100%; border-radius: 4px;" />
            </div>
          </li>
          <li>
            <p>Saat proses berhasil, akan muncul konfirmasi bahwa perjalanan telah dimulai. Tekan tombol Selesai (<em>Done</em>) untuk masuk ke dalam menu Tugas (<em>Task</em>).</p>
            <div style="margin-top: 10px; margin-bottom: 10px; width: 40%;" class="mx-auto">
                <img src="/images/tutorial/driver/start-trip-2.png" alt="Memulai Perjalanan - 2" style="width: 100%; border-radius: 4px;" />
            </div>
          </li>
          <li>
            <p><strong>Lakukan</strong> sinkronisasi data (<em>synchronize data</em>) untuk menyamakan/menyelaraskan konfigurasi dan tugas yang diberikan oleh admin. Sinkronisasi data dapat dilakukan di menu Tugas dan menu Pengaturan.</p>
            <p>Untuk menu Tugas, <em>driver</em> menggeser layar ke arah bawah (<em>swipe down</em>), sedangkan untuk menu Pengaturan, tekan tombol Sinkronisasi Data.</p></p>
            <div style="margin-top: 10px; margin-bottom: 10px; width: 40%;" class="mx-auto">
                <img src="/images/tutorial/driver/sync-data-1.png" alt="Sinkronisasi Data di menu Tugas" style="width: 100%; border-radius: 4px;" />
            </div>
            <div style="margin-top: 10px; margin-bottom: 10px; width: 40%;" class="mx-auto">
                <img src="/images/tutorial/driver/sync-data-2.png" alt="Sinkronisasi Data di menu Pengaturan" style="width: 100%; border-radius: 4px;" />
            </div>
          </li>
        </ul>`,
      },
    ],
  },
];
