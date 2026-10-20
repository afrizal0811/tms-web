export const serviceTopic = [
  {
    id: 'service',
    category: 'planner',
    title: 'Servis',
    blocks: [
      {
        type: 'text',
        content: `<p>Menu <strong>Servis</strong> adalah menu untuk membuat penjadwalan, pengingat, serta perintah untuk melakukan servis berkala atau perbaikan komponen pada kendaraan. Terdapat</p>
          <div style="margin-top: 10px; margin-bottom: 10px;" class="mx-auto">
              <img src="/images/tutorial/planner/vms/service.png" alt="Service" style="width: 100%; border-radius: 4px;" />
          </div>`,
      },
    ],
    subTopics: [
      {
        id: 'service-schedule',
        title: 'Penjadwalan Servis',
        blocks: [
          {
            type: 'text',
            content: `<p>Pada menu ini, <em>planner</em> bisa menambahkan sebuah penjadwalan untuk melakukan servis untuk tiap kendaraan. Pembuataan jadwal servis ini bisa dilakukan dengan cara manual atau unggah dengan menggunakan <em>template</em> yang sudah disediakan.</p>
              <div style="margin-top: 10px; margin-bottom: 10px;" class="mx-auto">
                  <img src="/images/tutorial/planner/vms/service-1.1.png" alt="Penjadwalan Servis" style="width: 100%; border-radius: 4px;" />
              </div>
              `,
          },
          {
            type: 'text',
            content: `
            <p class='font-bold text-2xl underline mb-2'>Manual Servis</p>
            <p><em>Planner</em> membuatkan penjadwalan servis dengan menentukan tanggal servis, komponen apa yang akan dicek, serta interval waktu atau jarak servisnya secara berurutan satu per satu.</p>
            <div style="margin-top: 10px; margin-bottom: 10px;" class="mx-auto">
                <img src="/images/tutorial/planner/vms/service-1.2.1.png" alt="Penjadwalan Manual" style="width: 100%; border-radius: 4px;" />
            </div>
            <p>Berikut ini cara yang membuat penjadwalan servis secara manual:</p>
            <ol class="list-decimal pl-5 space-y-2 mt-2">
              <li>
                  <p>Tekan tombol <strong>Tambah</strong> (<em>Add</em>).</p>
              </li>
              <li>
                  <p>Pilih kendaraan yang akan diservis, lalu isikan komponen apa yang akan dicek atau diganti. Terakhir tekan tombol <strong>Simpan</strong> (<em>Save</em>).</p>
              </li>
              <li>
                  <p>Pilih metode untuk penjadwalannya, yaitu <em>Floating</em> dan <em>Fixed</em>. Penjadwalan <em>Floating</em> adalah penjadwalan berdasarkan perhitungan dari servis terakhir kendaraan tersebut. Sedangkan penjadwalan <em>Fixed</em> adalah penjadwalan yang bersifat tetap tanpa mempertimbangkan servis terakhir kendaraan tersebut.</p>
                  <p><strong>Contoh (Menggunakan parameter 5000 km)</strong></p>
                  <ol class="list-disc pl-5 space-y-2 mt-2">    
                    <li>
                      <p>Untuk penjadwalan <em>Floating</em>, saat sebuah kendaraan sudah menempuh jarak tempuh <strong>12.000 km</strong>, maka servis selanjutnya adalah saat kendaraan sudah menempuh jarak <strong>17.000 km</strong>.</p>
                    </li>
                    <li>
                      <p>Untuk penjadwalan <em>Fixed</em>, saat sebuah kendaraan sudah menempuh jarak tempuh <strong>12.000 km</strong>, maka servis selanjutnya adalah saat kendaraan sudah menempuh jarak <strong>15.000 km</strong>.</p>
                    </li>
                  </ol>
              </li>
              <li>
                <p>Pilih parameter yang digunakan, yaitu jarak dan waktu serta hourmeter. Saat ini, hanya parameter jarak dan waktu yang digunakan. Jika hanya ingin menggunakan parameter jarak, maka cukup masukkan data untuk jarak. Begitu pula untuk parameter waktu.</p>
              </li>
              <li>
                <p>Masukkan interval jarak atau waktu yang diinginkan. Untuk parameter jarak menggunakan satuan kilometer (km), sedangkan untuk parameter waktu menggunakan satuan hari, minggu, atau bulan.</p>
              </li>
              <li>
                <p>Masukkan batas pengingat servis. Batas pengingat adalah batas interval waktu atau jarak sebelum servis tersebut dijadwalkan untuk dilakukan servis. Jika parameter yang digunakan adalah jarak, maka batas pengingat menggunakan satuan kilometer (km), sedangkan untuk parameter waktu menggunakan satuan hari atau minggu.</p>
                <p>Berikut ini contoh hasil penggunaan metode <em>Float</em> dan <em>Fixed</em> dengan parameter jarak bernilai <strong>3.000 km</strong> dengan batas pengingat <strong>100 km</strong> serta parameter waktu bernilai <strong>3 bulan</strong> dengan batas pengingat <strong>2 minggu</strong>.</p>
                <div style="margin-top: 10px; margin-bottom: 10px;" class="mx-auto">
                    <img src="/images/tutorial/planner/vms/service-1.2.2.png" alt="Contoh Penjadwalan Manual Servis" style="width: 100%; border-radius: 4px;" />
                </div>
              </li>
              <li>
                <p>Tekan tombol <strong>Simpan</strong> (<em>Save</em>) untuk menyimpan data.</p>
              </li>
            </ol>
              `,
          },
          {
            type: 'text',
            content: `<p class='font-bold text-2xl underline mb-2'>Unggah Servis</p>
            <p>Untuk proses pembuatan jadwal dengan cara unggah ini digunakan saat akan melakukan penjadwalan servis untuk kendaraan dalam jumlah banyak. <em>Planner</em> bisa mengunduh <em>template</em> yang disediakan dengan menekan tombol <strong>Unduh Template</strong>. Ikuti tata cara pengisian data sesuai dengan yang deskripsi pada menu unggah.</p>
            <div style="margin-top: 10px; margin-bottom: 10px;" class="mx-auto">
              <img src="/images/tutorial/planner/vms/service-1.2.png" alt="Unggah Data Penjadwalan Servis" style="width: 100%; border-radius: 4px;" />
            </div>
              `,
          },
          {
            type: 'text',
            content: `<p class='font-bold text-2xl underline mb-2'>Detail Servis</p>
            <p>Data servis yang sudah ditambahkan dapat dilihat detailnya dengan cara menekan nomor polisi yang tertera di dalam daftar kendaraan. Dari menu detail tersebut, <em>planner</em> bisa mengubah, menghapus, atau menambahkan jenis servis yang akan diterapkan.</p>
            <div style="margin-top: 10px; margin-bottom: 10px;" class="mx-auto">
              <img src="/images/tutorial/planner/vms/service-1.3.png" alt="Detail Penjadwalan Servis" style="width: 100%; border-radius: 4px;" />
            </div>
            <p>Berikut ini penjelasannya:<p>
            <ul class="list-decimal pl-5 space-y-2 mt-2">
              <li>
                  <p class="font-bold">Tambah Penjadwalan (<em>Add Scheduler</em>)</p>
                  <p>Tekan tombol <strong>Tambah Penjadwalan</strong> untuk menambahkan jadwal servis untuk kendaraan tersebut. Penjelasannya bisa dilihat pada <strong>Manual Servis</strong>.</p>
              </li>
              <li>
                  <p class="font-bold">Aksi (<em>Action</em>)</p>
                  <p>Dari servis yang sudah ditetapkan untuk kendaraan, <em>planner</em> bisa mengubah status dengan menerapkan beberapa aksi berikut:</p>
                  <ul class="list-disc pl-5 space-y-2 mt-2">
                    <li>Ubah status kendaraan dari <strong>Aktif</strong> menjadi <strong>Sedang Servis</strong>. Untuk mengubah status ini, disarankan melalui sub-menu <strong>Perintah Servis</strong> supaya pendataannya menjadi lebih detail dan lengkap.</li>
                    <li>Ubah status servis menjadi <strong>Selesaikan Servis</strong> untuk menandai bahwa servis untuk kendaraan tersebut sudah selesai. Dengan begitu, status kendaraan akan menjadi <strong>Aktif</strong> kembali dan penjadwalan baru sudah diterapkan berdasarkan pengaturan yang sudah ditentukan.</li>
                    <li>Buat perintah servis berdasarkan data servis yang ada.</li>
                    <li>Hapus data servis yang sudah tidak akan digunakan kembali.</li>
                  </ul>
              </li>
            </ul>
              `,
          },
        ],
      },
      {
        id: 'service-group',
        title: 'Grup Penjadwalan Servis',
        blocks: [
          {
            type: 'text',
            content: `<p>Pada menu ini, <em>planner</em> bisa menambahkan jadwal servis untuk diterapkan ke beberapa kendaraan sekaligus.</p>
<p>Berikut ini cara membuat grup jadwal servis:</p>
            <ol class="list-decimal pl-5 space-y-2 mt-2">
              <li>
                  <p>Buka menu <strong>Grup Penjadwalan Servis</strong>, lalu tekan tombol <strong>Tambah</strong> (<em>Create</em>).</p>
                  <div style="margin-top: 10px; margin-bottom: 10px;" class="mx-auto">
                    <img src="/images/tutorial/planner/vms/service-2.1.png" alt="Tambah Grup Penjadwalan" style="width: 100%; border-radius: 4px;" />
                  </div>
              </li>
              <li>
                <p>Tentukan nama grup servis yang diinginkan.</p>
                  <div style="margin-top: 10px; margin-bottom: 10px; width: 50%;" class="mx-auto">
                    <img src="/images/tutorial/planner/vms/service-2.2.png" alt="Nama Grup Penjadwalan" style="width: 100%; border-radius: 4px;" />
                  </div>
              </li>
              <li>
                <p>Tekan tombol <strong>Tambah</strong> (<em>Create</em>) untuk menambahkan jenis servis yang akan diterapkan.</p>
                <div style="margin-top: 10px; margin-bottom: 10px;" class="mx-auto">
                    <img src="/images/tutorial/planner/vms/service-2.3.png" alt="Tambah Jenis Servis" style="width: 100%; border-radius: 4px;" />
                  </div>
              </li>
              <li>
                <p>Tentukan komponen, metode, serta parameter untuk servis tersebut. Penjelasan mengenai metode dan parameter dapat dilihat pada sub-menu <strong>Penjadwalan Servis</strong>.</p>
                <div style="margin-top: 10px; margin-bottom: 10px;" class="mx-auto">
                    <img src="/images/tutorial/planner/vms/service-2.4.png" alt="Input Data Servis" style="width: 100%; border-radius: 4px;" />
                </div>
              </li>
              <li>
                <p>Tekan tombol <strong>Tambah</strong> (<em>Create</em>) untuk menambahkan kendaraan yang ingin diterapkan.</p>
                <div style="margin-top: 10px; margin-bottom: 10px;" class="mx-auto">
                    <img src="/images/tutorial/planner/vms/service-2.5.png" alt="Tambah Kendaraan" style="width: 100%; border-radius: 4px;" />
                </div>
              </li>
              <li>
                <p>Pilih satu atau lebih kendaraan yang ingin diterapkan, lalu tekan tombol <strong>Terapkan</strong> (<em>Apply</em>).</p>
                <div style="margin-top: 10px; margin-bottom: 10px;" class="mx-auto">
                    <img src="/images/tutorial/planner/vms/service-2.6.png" alt="Pilih Kendaraan" style="width: 100%; border-radius: 4px;" />
                </div>
              </li>
              <li>
                <p>Jika kendaraan yang dipilih tidak mengalami konflik dengan jadwal yang sebelumnya sudah diterapkan, maka data kendaraan akan muncul. Tekan tombol <strong>Tambah</strong> (<em>Create</em>) untuk menambahkan data kendaraan lain.</p>
                <div style="margin-top: 10px; margin-bottom: 10px;" class="mx-auto">
                    <img src="/images/tutorial/planner/vms/service-2.7.png" alt="Data Kendaraan" style="width: 100%; border-radius: 4px;" />
                </div>
              </li>
              <li>
                <p>Jika kendaraan yang dipilih mengalami konflik dengan jadwal yang sebelumnya sudah diterapkan, maka akan muncul detail terkait jadwal sebelumnya dengan jadwal yang baru. Jika <em>planner</em> tidak ingin menerapkan perubahaan jadwal, maka tekan ikon <strong>tempat sampah</strong> untuk menghapusnya, tetapi jika ingin mengubahnya maka tekan tombol <strong>Lanjutkan</strong> (<em>Continue</em>).</p>
                <div style="margin-top: 10px; margin-bottom: 10px;" class="mx-auto">
                    <img src="/images/tutorial/planner/vms/service-2.8.png" alt="Konflik Data Penjadwalan" style="width: 100%; border-radius: 4px;" />
                </div>
              </li>
            </ol>
              `,
          },
        ],
      },
      {
        id: 'service-reminder',
        title: 'Pengingat Servis',
        blocks: [
          {
            type: 'text',
            content: `
            <p>Pada menu ini, terdapat daftar kendaraan yang perlu melakukan servis sesuai dengan jadwal yang sudah ditetapkan. Kendaraan yang muncul hanya kendaraan yang mendekati atau melebihi parameter servis yang sudah digunakan.</p>
            <div style="margin-top: 10px; margin-bottom: 10px;" class="mx-auto">
              <img src="/images/tutorial/planner/vms/service-3.1.png" alt="Unggah Data Penjadwalan" style="width: 100%; border-radius: 4px;" />
            </div>
            <p><em>Planner</em> dapat menekan nomor polisi untuk menampilkan detail servis kendaraan. Selain itu, <em>planner</em> juga dapat melakukan hal-hal berikut:</p>
            <ul class="list-disc pl-5 space-y-2 mt-2">
              <li>Ubah status kendaraan dari <strong>Aktif</strong> menjadi <strong>Sedang Servis</strong>.</li>
              <li>Buat perintah servis berdasarkan data servis yang ada.</li>
            </ul>
              `,
          },
        ],
      },
      {
        id: 'service-order',
        title: 'Perintah Servis',
        blocks: [
          {
            type: 'text',
            content: `<p>Pada menu ini, <em>planner</em> bisa melakukan perintah servis, baik berdasarkan perjadwalan servis yang sudah ditentukan ataupun servis mendadak. Pada menu ini terdapat daftar kendaraan yang sudah melakukan servis. </p>
              <p>Terdapat beberapa tahapan dalam proses pembuatan perintah servis, yaitu:</p>
              <ol class="list-decimal pl-5 space-y-2 mt-2">
                <li> 
                  <p>Di dalam menu <strong>Perintah Servis</strong>, tekan tombol <strong>Tambah</strong> (<em>Create</em>).</p>
                  <div style="margin-top: 10px; margin-bottom: 10px;" class="mx-auto">
                    <img src="/images/tutorial/planner/vms/service-4.1.png" alt="Tambah Perintah Servis" style="width: 100%; border-radius: 4px;" />
                  </div>
                </li>
                <li>
                  <p>Isikan nomor polisi kendaraan yang akan diservis. Lalu tentukan tempat dilakukannya servis, apakah bengkel internal ataupun eksternal, beserta nama dari tempat servis tersebut. Lalu, tentukan pula penanggungjawab servis. Tekan tombol <strong>Simpan</strong> (<em>Save</em>). Dokumen servis yang baru dibuat ini akan masuk ke dalam status <strong>Draf</strong>.</p>
                  <div style="margin-top: 10px; margin-bottom: 10px;" class="mx-auto">
                    <img src="/images/tutorial/planner/vms/service-4.2.1.png" alt="Informasi Servis" style="width: 100%; border-radius: 4px;" />
                  </div>
                </li>
                <li>
                  <p>Pada daftar Servis ataupun Jasa, tekan tombol <strong>Tambah</strong> (<em>Create</em>).</p>
                  <div style="margin-top: 10px; margin-bottom: 10px;" class="mx-auto">
                    <img src="/images/tutorial/planner/vms/service-4.2.2.png" alt="Tambah Servis dan Jasa" style="width: 100%; border-radius: 4px;" />
                  </div>
                </li>
                <li>
                  <p>Saat menekan tombol di Daftar Servis, maka akan muncul <em>pop-up</em> untuk menentukan jenis servis yang digunakan, yaitu <strong>Servis Penjadwalan</strong> atau <strong>Servis Lain</strong>.</p>
                  <div style="margin-top: 10px; margin-bottom: 10px; width: 50%;" class="mx-auto">
                    <img src="/images/tutorial/planner/vms/service-4.2.3.png" alt="Pop-up Jenis Servis" style="width: 100%; border-radius: 4px;" />
                  </div>
                </li>
                <li>
                  <p>Saat memilih <em>Servis Lain</em>, maka akan muncul <em>pop-up</em> untuk menentukan jenis servis yang dilakukan. Tekan tombol <strong>Terapkan</strong> (<em>Apply</em>).</p>
                  <div style="margin-top: 10px; margin-bottom: 10px; width: 50%;" class="mx-auto">
                    <img src="/images/tutorial/planner/vms/service-4.2.4.png" alt="Pop-up Jenis Servis" style="width: 100%; border-radius: 4px;" />
                  </div>
                </li>
                <li>
                  <p>Setelah memilih jenis servis, <em>planner</em> harus menentukan komponen servis yang digunakan. Tekan tombol <strong>Tambah</strong> (<em>Create</em>), lalu pilih komponen yang akan diservis. Tekan tombol <strong>Terapkan</strong> (<em>Apply</em>). Isikan detail komponen, seperti kuantitas, unit satuan, harga, dan diskon (jika ada). Lakukan untuk semua komponen.</p>
                  <div style="margin-top: 10px; margin-bottom: 10px;" class="mx-auto">
                    <img src="/images/tutorial/planner/vms/service-4.2.5.png" alt="Komponen Servis" style="width: 100%; border-radius: 4px;" />
                  </div>
                </li>
                <li>
                  <p>Saat menekan tombol di Daftar Jasa, isikan jenis jasa yang akan dilakukan, kuantitas, dan harga. Tekan tombol ikon centang hijau untuk menyimpan.</p>
                  <div style="margin-top: 10px; margin-bottom: 10px;" class="mx-auto">
                    <img src="/images/tutorial/planner/vms/service-4.2.6.png" alt="Jasa Servis" style="width: 100%; border-radius: 4px;" />
                  </div>
                </li>
                <li>
                  <p>Tambahkan informasi tambahkan di memo serta lampiran terkait servis. Pada bagian akhir, terdapat rincian biaya terkait servis.</p>
                  <div style="margin-top: 10px; margin-bottom: 10px;" class="mx-auto">
                    <img src="/images/tutorial/planner/vms/service-4.2.7.png" alt="Dokumen dan Biaya Servis" style="width: 100%; border-radius: 4px;" />
                  </div>
                </li>
                <li>
                  <p>Tekan tombol <strong>Ubah Status</strong> (<em>Change Status</em>), lalu pilih <strong>Konfirmasi</strong> (<em>Confirm</em>).</p>
                  <div style="margin-top: 10px; margin-bottom: 10px;" cl8ass="mx-auto">
                    <img src="/images/tutorial/planner/vms/service-4.2.8.png" alt="Konfirmasi Servis" style="width: 100%; border-radius: 4px;" />
                  </div>
                </li>
                <li>
                  <p>Tekan tombol <strong>Ubah Status</strong> (<em>Change Status</em>), lalu pilih <strong>Dalam Proses</strong> (<em>In Progress</em>). Pada status ini, kendaraan terkait dapat melakukan servis di lokasi yang sudah dipilih.</p>
                  <div style="margin-top: 10px; margin-bottom: 10px;" class="mx-auto">
                    <img src="/images/tutorial/planner/vms/service-4.2.9.png" alt="Dalam Proses Servis - 1" style="width: 100%; border-radius: 4px;" />
                  </div>
                </li>
                <li>
                  <p>Tentukan estimasi waktu selesai servis dan tekan tombol <strong>Simpan</strong> (<em>Save</em>). <em>Planner</em> dapat mencetak Surat Perintah Kerja (SPK) untuk servis. Jika proses servis sudah selesai, maka tekan tombol <strong>Ubah Status</strong> (<em>Change Status</em>), lalu tekan tombol <strong>Verifikasi Dokumen</strong> (<em>Documents Verification</em>).</p>
                  <div style="margin-top: 10px; margin-bottom: 10px;" class="mx-auto">
                    <img src="/images/tutorial/planner/vms/service-4.2.10.png" alt="Dalam Proses Servis - 2" style="width: 100%; border-radius: 4px;" />
                  </div>
                </li>
                <li>
                  <p>Lakukan verifikasi data terkait servis yang sudah dilakukan. Jika saat proses servis ditemukan kendala lain dan perlu dilakukan perbaikan, maka <em>planner</em> harus menambahkan atau mengubah data komponen servis dan jasa.</p>
                  <div style="margin-top: 10px; margin-bottom: 10px;" class="mx-auto">
                    <img src="/images/tutorial/planner/vms/service-4.2.11.png" alt="Verifikasi Dokumen" style="width: 100%; border-radius: 4px;" />
                  </div>
                </li>
                <li>
                  <p>Tekan tombol <strong>Selesaikan Servis</strong> (<em>Complete Service</em>) untuk menyimpan dan menyelesaikan servis.</p>
                  <div style="margin-top: 10px; margin-bottom: 10px;" class="mx-auto">
                    <img src="/images/tutorial/planner/vms/service-4.2.12.png" alt="Selesaikan Servis" style="width: 100%; border-radius: 4px;" />
                  </div>
                </li>
              </ol>
              `,
          },
        ],
      },
    ],
  },
];
