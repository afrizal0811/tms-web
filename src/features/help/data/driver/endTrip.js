export const endTripTopic = [
  {
    id: 'driver-end-trip',
    category: 'driver',
    title: 'Akhiri Perjalanan',
    blocks: [
      {
        type: 'text',
        content: `<p>Setelah <em>driver</em> berhasil mengerjakan semua tugas yang diterima, <em>driver</em> perlu menyelesaikan perjalanan pada hari itu. Hal ini bertujuan untuk mencatat waktu akhir pekerjaan yang digunakan sebagai acuan akhir untuk menghitung lama waktu pekerjaannya.</p>
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
            <p>Saat semua tugas sudah dikerjakan, harus mengakhiri perjalanan yang sudah dilakukan. Untuk melakukan akhiri perjalanan, tekan tombol Pengaturan.</p>
            <div style="margin-top: 10px; margin-bottom: 10px; width: 40%;" class="mx-auto">
                <img src="/images/tutorial/driver/end-trip-1.png" alt="Akhiri Perjalanan - 1" style="width: 100%; border-radius: 4px;" />
            </div>
          </li>
          <li>
            <p>Di dalam menu pengaturan, terdapat waktu pelacakan dari awal perjalanan dimulai. Tekan tombol Akhiri Perjalanan (<em>End Trip</em>).</p>
            <div style="margin-top: 10px; margin-bottom: 10px; width: 40%;" class="mx-auto">
                <img src="/images/tutorial/driver/end-trip-2.png" alt="Akhiri Perjalanan - 2" style="width: 100%; border-radius: 4px;" />
            </div>
          </li>
          <li>
            <p><em>Driver</em> harus dalam <strong>radius 500 meter</strong> dari gudang untuk dapat mengakhiri perjalanan. Tekan tombol Akhiri (<em>End</em>).</p>
            <div style="margin-top: 10px; margin-bottom: 10px; width: 40%;" class="mx-auto">
                <img src="/images/tutorial/driver/end-trip-3.png" alt="Akhiri Perjalanan - 3" style="width: 100%; border-radius: 4px;" />
            </div>
          </li>
          <li>
            <p>Saat proses berhasil, akan muncul konfirmasi bahwa perjalanan telah diakhiri. Tekan tombol Selesai (<em>Done</em>).</p>
            <div style="margin-top: 10px; margin-bottom: 10px; width: 40%;" class="mx-auto">
                <img src="/images/tutorial/driver/end-trip-4.png" alt="Akhiri Perjalanan - 4" style="width: 100%; border-radius: 4px;" />
            </div>
          </li>
        </ul>`,
      },
    ],
  },
];