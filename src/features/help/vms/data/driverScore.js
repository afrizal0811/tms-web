import Button from '@/components/button/Button';
export const driverScore = [
  {
    id: 'driver-score',
    category: 'planner',
    title: 'Penilaian Sopir',
    blocks: [
      {
        type: 'text',
        content: `<p>Menu <strong>Penilaian Sopir</strong> adalah menu yang berisikan rangkuman data penilaian terhadap sopir berdasarkan performa dan perilaku selama bertugas untuk tiap bulannya. </p>
        <div style="margin-top: 10px; margin-bottom: 10px;" class="mx-auto">
            <img src="/images/tutorial/planner/vms/score-1.png" alt="Penilaian Sopir" style="width: 100%; border-radius: 4px;" />
        </div>
        <p>Ada lima peringatan/pelanggaran yang akan menentukan nilai sopir dalam tiap bulannya, yaitu:</p>
          <ul class="list-decimal pl-5 space-y-2 mt-2">
            <li>
              <p class="font-bold">Akselerasi Mendadak</p>
              <p>Peringatan muncul jika kecepatan kendaraan naik lebih dari 9,18 km/jam dalam 1 detik.</p>
            </li>
            <li>
              <p class="font-bold">Perlambatan Mendadak</p>
              <p>Peringatan muncul jika kecepatan kendaraan turun lebih dari 9,72 km/jam dalam 1 detik.</p>
            </li>
            <li>
              <p class="font-bold">Tikungan Tajam</p>
              <p>Peringatan muncul jika kendaraan melakukan tikungan tajam dengan perubahan arah lebih dari 20 derajat dalam 1 detik.</p>
            </li>
            <li>
              <p class="font-bold">Kecepatan Melebihi Batas Aman</p>
              <p>Peringatan muncul jika kendaraan melewati batas kecepatan 75 km/jam.</p>
            </li>
            <li>
              <p class="font-bold">Melebihi Batas Waktu Diam</p>
              <p>Peringatan muncul jika kendaraan diam lebih dari 15 menit.</p>
            </li>
          </ul>`,
      },
      {
        type: 'text',
        content: `
        <div style="margin-top: 10px; margin-bottom: 10px;" class="mx-auto">
            <img src="/images/tutorial/planner/vms/score-2.png" alt="Penilaian Sopir" style="width: 100%; border-radius: 4px;" />
        </div>
        <p>Berikut ini ketentuan untuk penilaian sopir:</p>
        <ul class="list-decimal pl-5 space-y-2 mt-2">
          <li>
            <p class="font-bold">Jarak Minimum</p>
            <p>Jarak minimum yang diterapkan adalah <strong>300 km</strong>, sehingga kendaraan akan dinilai jika sudah melebihi jarak minimum tersebut.</p>
          </li>
          <li>
            <p class="font-bold">Batas Peringatan</p>
            <p>Batas peringatan yang digunakan saat ini adalah <strong>5%</strong> dari total jarak tempuh kendaraan.</p>
          </li>
          <li>
            <p class="font-bold">Persentase Penilaian</p>
            <p>Persentase bobot tiap peringatan/pelanggaran berbeda-beda, yaitu:</p>
            <ul class="list-disc pl-5 space-y-2 mt-2">
              <li>
                <p>Akselerasi Mendadak: <strong>23%</strong></p>
              </li>
              <li>
                <p>Perlambatan Mendadak: <strong>28%</strong></p>
              </li>
              <li>
                <p>Tikungan Tajam: <strong>22%</strong></p>
              </li>
              <li>
                <p>Kecepatan Melebihi Batas Aman: <strong>17%</strong></p>
              </li>
              <li>
                <p>Melebihi Batas Waktu Diam: <strong>10%</strong></p>
              </li>
            </ul>
          </li>
          <li>
            <p class="font-bold">Indeks Skor</p>
            <p>Akumulasi bobot skor tiap peringatan/pelanggaran akan menentukan indeks skor yang akan didapatkan tiap sopir. Semakin tinggi indeks skor, maka semakin baik sopir tersebut. Berikut ini rentang skornya:</p>
            <ul class="list-disc pl-5 space-y-2 mt-2">
              <li>
                <p>91-100: <strong>A</strong></p>
              </li>
              <li>
                <p>71-90: <strong>B</strong></p>
              </li>
              <li>
                <p>51-70: <strong>C</strong></p>
              </li>
              <li>
                <p>31-50: <strong>D</strong></p>
              </li>
              <li>
                <p>0-30: <strong>E</strong></p>
              </li>
            </ul>
          </li>
        </ul>`,
      },
    ],
    subTopics: [
      {
        id: 'score-detail',
        title: 'Detail Penilaian Sopir',
        blocks: [
          {
            type: 'text',
            content: `
            <p>Gunakan menu ini untuk mengetahui detail perhitungan penilaian sopir yang sudah dilakukan dengan menggunakan unggah data <em>Excel</em> ataupun input data manual.</p>`,
          },
          {
            type: 'button',
            component: (
              <div className="flex gap-3 mt-3">
                <Button
                  text="Auto Calculate"
                  onClick={() => {
                    alert('Tombol Auto berhasil diklik!');
                  }}
                />
                <Button
                  text="Manual Calculate"
                  onClick={() => {
                    alert('Tombol Manual berhasil diklik!');
                  }}
                />
              </div>
            ),
          },
        ],
      },
    ],
  },
];
