export const taskTopic = [
  {
    id: 'task-management',
    category: 'planner',
    title: 'Tugas (Task)',
    blocks: [
      {
        type: 'text',
        content: `<p><strong>Menu Tugas</strong> (<em>Task</em>) adalah pusat kendali untuk mengelola tugas, mulai dari penambahan tugas secara manual sampai dengan export laporan task. Selain itu, pada halaman ini bisa memantau tugas yang sedang berjalan (<span class="italic">real-time</span>).</p>`,
      },
      {
        type: 'image',
        src: '/images/tutorial/planner/task-menu.png',
        alt: 'Menu Tugas',
      },
      {
        type: 'text',
        content: `<p>Berikut ini penjelasannya:</p>
          <ol class="list-decimal pl-5 space-y-2 mt-2">
            <li>
                <p class="font-bold">Menu <em>Task</em></p>
                <p>Menu untuk mengelola tugas seperti menambah, menyunting, dan menghapus.</p>
            </li>
            <li>
                <p class="font-bold">Submodul <em>Tracking</em></p>
                <p>Menu untuk memonitor task dan lokasi tiap <em>driver</em> (<em>driver</em>) secara <em>real-time</em>.</p>
            </li>
            <li>
                <p class="font-bold">Submodul <em>Schedule</em></p>
                <p>Menu untuk mengelola jadwal pengiriman.</p>
            </li>
            <li>
                <p class="font-bold">Submodul <em>Gallery</em> </p>
                <p>Menu untuk melihat <em>Proof of Delivery</em> (POD) berupa foto yang sudah dilakukan oleh <em>driver</em>.</p>
            </li>
            <li>
                <p class="font-bold">Daftar Hub</p>
                <p>Daftar hub yang aktif</p>
            </li>           
            <li>
                <p class="font-bold">Filter</p>
                <p>Filter tugas berdasarkan status, nama <em>assignee</em>, nama alur (<em>flow</em>), tanggal mulai dan selesai tugas, serta filter manual.</p>
            </li>
            <li>
                <p class="font-bold"><em>New Task</em></p>
                <p>Tombol untuk membuat tugas baru secara manual.</p>
            </li>
            <li>
                <p class="font-bold"><em>Export Task</em></p>
                <p>Tombol untuk <em>export</em> laporan task dalam bentuk excel.</p>
            </li>
            <li>
                <p class="font-bold"><em>Action Task</em></p>
                <p>Tombol untuk mengelola tugas secara bersamaan.</p>
            </li>
            <li>
                <p class="font-bold">Kolom <em>Flow</em></p>
                <p>Kolom berisikan alur yang digunakan untuk tugas.</p>
            </li>
            <li>
                <p class="font-bold">Kolom <em>Title</em></p>
                <p>Kolom berisikan nama <em>customer</em>, id <em>customer</em>, dan id lokasi.</p>
            </li>
            <li>
                <p class="font-bold">Kolom <em>Content</em></p>
                <p>Kolom berisikan nomor faktur.</p>
            </li>
            <li>
                <p class="font-bold">Kolom Label</p>
                <p>Kolom berisikan status pengiriman.</p>
            </li>
            <li>
                <p class="font-bold">Kolom <em>Start Time</em></p>
                <p>Kolom berisikan tanggal tugas bisa dikerjakan.</p>
            </li>
            <li>
                <p class="font-bold">Kolom Status</p>
                <p>Kolom berisikan status tugas.</p>
            </li>
            <li>
                <p class="font-bold">Kolom <em>Assignee</em></p>
                <p>Kolom berisikan data <em>driver</em> yang akan menjalankan tugas.</p>
            </li>
            <li>
                <p class="font-bold">Kolom <em>Action</em></p>
                <p>Kolom berisikan tombol untuk mengelola tugas.</p>
            </li>            
          </ol>`,
      },
    ],
    subTopics: [
      {
        id: 'task-create',
        title: 'Buat Tugas',
        blocks: [
          {
            type: 'text',
            content: `<p>Pada bagian ini akan dijelaskan cara untuk membuat tugas baru. Penambahan tugas baru di <strong>MileApp</strong> dapat dilakukan dengan dua cara, yaitu <em>import</em> file Excel dari <strong>Acumatica</strong> dan <em>input</em> manual. Berikut ini penjelasan untuk masing-masing cara penambahan tugas baru</p>`,
          },
          {
            type: 'text',
            content: `<p class='font-bold text-2xl underline mb-2'><em>Import</em> dari Acumatica</p>
            <p>Penambahan tugas baru dapat dilakukan dengan menggunakan <em>import</em> file Excel dari <strong>Acumatica</strong>.</p>
            <p class='underline mb-2'>Perhatikan video berikut ini:</p>
                <div style="margin-top: 10px; margin-bottom: 10px;">
                  <iframe 
                    width="100%" 
                    height="450" 
                    src="https://www.youtube.com/embed/g7rEVfviOQ8" 
                    title="YouTube video player" 
                    frameborder="0" 
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                    allowfullscreen>
                  </iframe>
                </div>
                <p>Berikut ini penjelasannya:</p>
                <ul class="list-decimal pl-5 space-y-2 mt-2">
                <li>
                  <p>Buka menu <span class='italic underline'>Order Template TMS Report</span> di <strong>Acumatica</strong>.</p>
                  <div style="margin-top: 10px; margin-bottom: 10px; width: 50%;" class="mx-auto">
                      <img src="/images/tutorial/planner/acumatica-1.png" alt="Order Template TMS Report" style="width: 100%; border-radius: 4px;" />
                  </div>
                </li>
                <li>
                  <p>Sesuaikan filter yang diperlukan, yaitu lokasi cabang, tanggal mulai, tanggal selesai, gudang, dan tipe penyimpanan. Lalu tekan tombol <em>Run Report</em>.</p>
                  <div style="margin-top: 10px; margin-bottom: 10px; width: 80%;" class="mx-auto">
                      <img src="/images/tutorial/planner/acumatica-2.png" alt="Pengaturan Laporan" style="width: 100%; border-radius: 4px;" />
                  </div>
                </li>
                <li>
                  <p>Tekan tombol <em>Export</em>, lalu pilih Excel. Tunggu hingga proses unduh selesai.</p>
                  <div style="margin-top: 10px; margin-bottom: 10px; width: 100%;" class="mx-auto">
                      <img src="/images/tutorial/planner/acumatica-3.png" alt="Unduh Laporan" style="width: 100%; border-radius: 4px;" />
                  </div>
                </li>
                <li>
                  <p style="margin-bottom: 15px;">Berdasarkan hasil file excel tersebut, periksa tiap kolom yang tersedia untuk memastikan tidak ada data yang kosong. Data yang kosong dapat <strong>diisikan sementara</strong> oleh <em>planner</em> dan <strong>harus dilaporkan</strong> supaya master data  dapat diperbarui.</p>
                  <div style="width: 100%;" class="mx-auto">
                      <img 
                          src="/images/tutorial/planner/acumatica-4.png" 
                          alt="Periksa Data" 
                          style="width: 100%; border-radius: 4px; border: 1px solid #e2e8f0;" 
                      />
                  </div>
              </li>
              </ul>
              <p class="my-2">Setelah selesai di-<em>export</em>, maka data itu harus diunggah ke dalam <strong>MileApp</strong>.</p>
              <p class='underline mb-2'>Perhatikan video berikut ini:</p>
              <div style="margin-bottom: 15px;">
                <iframe 
                  width="100%" 
                  height="450" 
                  src="https://www.youtube.com/embed/hZM4vlAiVEw" 
                  title="Tutorial Cek Data Kosong" 
                  frameborder="0" 
                  allowfullscreen
                  style="border-radius: 8px;">
                </iframe>
              </div>
              <p>Berikut ini penjelasannya:</p>     
              <ul class="list-decimal pl-5 space-y-2 mt-2">
                <li>            
                  <p>Di <strong>MileApp</strong>, tekan menu <span class='italic underline'>Custom Upload Delivery</span>.</p>
                  <div style="margin-top: 10px; margin-bottom: 10px; width: 60%;" class="mx-auto">
                      <img src="/images/tutorial/planner/cud-1.png" alt="Custom Upload Delivery" style="width: 100%; border-radius: 4px;" />
                  </div>
                </li>
                <li>
                  <p>Di menu ini, pilih hub sesuai lokasi cabang, pilih alur <span class = 'italic'>Delivery</span>, lalu unggah file Excel yang sudah di-<em>export</em>.</p>
                  <div style="margin-top: 10px; margin-bottom: 10px; width: 100%;" class="mx-auto">
                      <img src="/images/tutorial/planner/cud-2.png" alt="Pengaturan" style="width: 100%; border-radius: 4px;" />
                  </div>
                </li>
                <li>
                  <p>Tekan tombol <em>Upload</em> dan tunggu sampai prosesnya selesai. Setelah itu, muncul tabel dari hasil pemrosesan. Jika masih ada kesalahan pada data yang diunggah, maka <strong>lakukan perbaikan</strong> pada file Excel yang digunakan, lalu <strong>unggah ulang</strong> file Excel yang sudah diperbaiki.</p>
                  <div style="margin-top: 10px; margin-bottom: 10px; width: 90%;" class="mx-auto">
                      <img src="/images/tutorial/planner/cud-3.png" alt="Unggah Data" style="width: 100%; border-radius: 4px;" />
                  </div>
                </li>
                <li>
                  <p>Tekan tombol <em>Submit</em> dan tunggu sampai prosesnya selesai. Setelah itu, akan muncul notifikasi bahwa data telah berhasil ataupun gagal diunggah.</p>
                  <div style="margin-top: 10px; margin-bottom: 10px; width: 90%;" class="mx-auto">
                      <img src="/images/tutorial/planner/cud-4.png" alt="Submit Data" style="width: 100%; border-radius: 4px;" />
                  </div>
                </li>
              </ul>
              `,
          },
          {
            type: 'text',
            content: `<p class='font-bold text-2xl underline mb-2'>Input Manual</p>
            <p>Selain menggunakan <em>import</em> file Excel dari <strong>Acumatica</strong>, penambahan tugas baru dapat dilakukan dengan cara <em>input</em> manual. Proses ini hanya dilakukan <strong>jika dibutuhkan</strong>, sehingga <em>planner</em> tetap mengutamakan penggunaan <em>import</em> file Excel.</p>
            <p class='underline mb-2'>Perhatikan video berikut ini:</p>
                <div style="margin-top: 10px; margin-bottom: 10px;">
                  <iframe 
                    width="100%" 
                    height="450" 
                    src="https://www.youtube.com/embed/YDcbmhUpZlg" 
                    title="YouTube video player" 
                    frameborder="0" 
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                    allowfullscreen>
                  </iframe>
                </div>
                <p>Berikut ini penjelasannya:</p>
                <ul class="list-decimal pl-5 space-y-2 mt-2">
                <li>
                  <p>Tekan tombol <em>New</em>.</p>
                  <div style="margin-top: 10px; margin-bottom: 10px; width: 100%;" class="mx-auto">
                      <img src="/images/tutorial/planner/add-task-1.png" alt="Tombol New" style="width: 100%; border-radius: 4px;" />
                  </div>
                </li>
                <li>
                  <p>Isikan semua data pada kolom yang tersedia. Kolom dengan bertanda bintang (<span class='font-bold text-red-500'>*</span>) <strong>wajib diisikan</strong>. Lalu, tekan tombol <em>Submit</em>. </p>
                  <div style="margin-top: 10px; margin-bottom: 10px; width: 60%;" class="mx-auto">
                      <img src="/images/tutorial/planner/add-task-2.png" alt="Jendela Tambah Tugas" style="width: 100%; border-radius: 4px;" />
                  </div>
                </li>
              </ul>
              `,
          },
        ],
      },
      {
        id: 'task-action',
        title: 'Kelola Tugas', // Level 2
        blocks: [
          {
            type: 'text',
            content:
              '<p>Pada bagian ini akan dijelaskan cara untuk mengelola tugas, mulai dari melihat (<span class="italic">view</span>), mengubah (<span class="italic">edit</span>), menghapus (<span class="italic">delete</span>), serta melakukan (<span class="italic">do</span>) tugas. Tombol aksi ini bisa dilakukan per tugas dan secara massal. Berikut ini penjelasan untuk masing-masing pengelolaan.</p>',
          },
          {
            type: 'text',
            content: `<p class='font-bold text-2xl underline mb-2'>Kelola Per Tugas</p>
            <p>Setiap baris tugas yang sudah tersimpan dapat dikelola oleh <em>planner</em> dengan menggunakan beberapa tombol aksi (<em>action</em>).</p>
            <p class='underline mb-2'>Perhatikan video berikut ini:</p>
              <div style="margin-top: 10px; margin-bottom: 10px;">
                <iframe 
                  width="100%" 
                  height="450" 
                  src="https://www.youtube.com/embed/sbLs5Do8J3Q" 
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
            <ul class="list-decimal pl-5 space-y-2 mt-2 section-list">
              <li>
                <p class="section-title font-bold underline mb-2">Lihat Tugas (<em>View Task</em>)</p>     
                <p>Melalui tombol <em>View</em>, pengguna dapat melihat informasi lengkap terkait tugas yang dipilih. Berikut caranya:</p>     
                <ol class="list-[lower-alpha] pl-5 space-y-2 mt-2">
                  <li>
                    <p>Tekan tombol <em>View Task</em> (nomor 1).</p>
                    <div style="margin-top: 10px; margin-bottom: 10px; width: 100%;" class="mx-auto">
                        <img src="/images/tutorial/planner/action.png" alt="Lokasi Tombol View" style="width: 100%; border-radius: 4px;" />
                    </div>
                  </li>
                  <li>
                    <p>Saat muncul jendela <em>View Task</em>, terdapat informasi lengkap yang terkait dengan tugas tersebut.</p>
                    <div style="margin-top: 10px; margin-bottom: 10px; width: 90%;" class="mx-auto">
                        <img src="/images/tutorial/planner/action-view.png" alt="Jendela View" style="width: 100%; border-radius: 4px;" />
                    </div>
                  </li>  
                </ol>
              </li>
              <li>
                <p class="section-title font-bold underline mb-2">Sunting Tugas (<em>Edit Task</em>)</p>     
                <p>Melalui tombol <em>Edit</em>, <em>planner</em> dapat mengubah informasi pada tugas yang dipilih. Tombol <em>Edit Task</em> hanya muncul pada tugas dengan status <span class='font-bold italic'>Unassigned</span> atau <span class='font-bold italic'>Ongoing</span>. Berikut caranya:</p>      
                <ol class="list-[lower-alpha] pl-5 space-y-2 mt-2">
                  <li>
                    <p>Tekan tombol <em>Edit</em> (nomor 2).</p>
                    <div style="margin-top: 10px; margin-bottom: 10px; width: 100%;" class="mx-auto">
                        <img src="/images/tutorial/planner/action.png" alt="Lokasi Tombol Edit" style="width: 100%; border-radius: 4px;" />
                    </div>
                  </li>
                  <li>
                    <p>Saat muncul jendela <em>Edit Task</em>, lakuakan perubahan sesuai kebutuhan. Kolom dengan bertanda bintang (<span class='font-bold text-red-500'>*</span>) <strong>wajib diisikan</strong>. Tekan tombol <em>Submit</em> untuk menyimpan perubahan dan tekan tombol <em>Cancel</em> untuk membatalkan. </p>
                    <div style="margin-top: 10px; margin-bottom: 10px; width: 60%;" class="mx-auto">
                        <img src="/images/tutorial/planner/action-edit.png" alt="Jendela Edit" style="width: 100%; border-radius: 4px;" />
                    </div>
                  </li>
                </ol>
              </li>
              <li>
                <p class="section-title font-bold underline mb-2">Hapus Tugas (<em>Delete Task</em>)</p>     
                <p>Melalui tombol <em>Delete</em>, pengguna dapat menghapus tugas yang dipilih. Tombol <em>Delete Task</em> hanya muncul pada tugas dengan status <span class='font-bold italic'>Unassigned</span> atau <span class='font-bold italic'>Ongoing</span>. Berikut caranya:</p>      
                <ol class="list-[lower-alpha] pl-5 space-y-2 mt-2">
                  <li>
                    <p>Tekan tombol <em>Delete Task</em> (nomor 3).</p>
                    <div style="margin-top: 10px; margin-bottom: 10px; width: 100%;" class="mx-auto">
                        <img src="/images/tutorial/planner/action.png" alt="Lokasi Tombol Delete" style="width: 100%; border-radius: 4px;" />
                    </div>
                  </li>
                  <li>
                    <p>Muncul jendela konfirmasi. Tekan tombol <em>Delete</em> untuk menghapus data dan tekan tombol <em>Cancel</em> untuk membatalkan. Tugas yang sudah terhapus <strong>tidak dapat dikembalikan</strong>.</p>
                    <div style="margin-top: 10px; margin-bottom: 10px; width: 60%;" class="mx-auto">
                        <img src="/images/tutorial/planner/action-delete.png" alt="Konfirmasi Delete" style="width: 100%; border-radius: 4px;" />
                    </div>
                  </li>
                </ol>
              </li>
              <li>
                <p class="section-title font-bold underline mb-2">Lakukan Tugas (<em>Do Task</em>)</p>     
                <p>Melalui tombol <em>Do Task</em>, pengguna dapat memulai dan menjalankan tugas yang dipilih. Tombol <em>Do Task</em> hanya muncul jika <em>planner</em> <strong>menambahkan nama akunnya</strong> pada tugas tersebut. Aksi ini digunakan saat ingin menyelesaikan tugas yang sudah diberikan kepada <em>driver</em> tanpa harus menggunakan akun dari <em>driver</em> tersebut. Berikut caranya:</p>      
                <ol class="list-[lower-alpha] pl-5 space-y-2 mt-2">
                  <li>
                    <p>Tekan tombol <em>Do Task</em> (nomor 4).</p>
                    <div style="margin-top: 10px; margin-bottom: 10px; width: 100%;" class="mx-auto">
                        <img src="/images/tutorial/planner/action.png" alt="Lokasi Tombol Do" style="width: 100%; border-radius: 4px;" />
                    </div>
                  </li>
                  <li>
                    <p>Setelah ditekan, maka akan muncul jendela <em>Do Task</em>. Kerjakan tugas tersebut dengan mengisikan kolom yang tersedia sesuai dengan alur yang digunakan hingga selesai.</p>
                    <div style="margin-top: 10px; margin-bottom: 10px; width: 60%;" class="mx-auto">
                        <img src="/images/tutorial/planner/action-do.png" alt="Jendela Do Task" style="width: 100%; border-radius: 4px;" />
                    </div>
                  </li>
                </ol>
              </li>
            </ul>`,
          },
          {
            type: 'text',
            content: `<p class='font-bold text-2xl underline mb-2'>Kelola Massal</p>
            <p>Aksi untuk tugas yang tersedia dapat dilakukan secara massal (<em>bulk</em>). Aksi ini hanya bisa dilakukan pada task dengan status<span class='font-bold italic'>Unassigned</span> atau <span class='font-bold italic'>Ongoing</span>.</p>
            <p class='underline mb-2'>Perhatikan video berikut ini:</p>
              <div style="margin-top: 10px; margin-bottom: 10px;">
                <iframe 
                  width="100%" 
                  height="450" 
                  src="https://www.youtube.com/embed/H9-5XqYDpXY" 
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
            <ul class="list-decimal pl-5 space-y-2 mt-2 section-list">
              <li>
                <p class="section-title font-bold underline mb-2">Sunting Waktu (<em>Edit Time</em>)</p>     
                <p>Melalui tombol <em>Edit Time</em>, <em>planner</em> dapat mengubah waktu aktif dan selesainya dari tugas yang dipilih secara bersamaan. Berikut caranya:</p>     
                <ol class="list-[lower-alpha] pl-5 space-y-2 mt-2">
                  <li>
                    <p>Pilih tugas yang ingin diubah waktunya, lalu tekan tombol <em>Action</em>. Tekan tombol <em>Edit Time</em> (nomor 3).</p>
                    <div style="margin-top: 10px; margin-bottom: 10px; width: 100%;" class="mx-auto">
                        <img src="/images/tutorial/planner/action-bulk.png" alt="Lokasi Tombol Edit Time" style="width: 100%; border-radius: 4px;" />
                    </div>
                  </li>
                  <li>
                    <p>Saat muncul jendela <em>Edit Time</em>, lakukan perubahan jam mulai dan selesai sebagai rentang waktu aktifnya tugas tersebut. Tekan tombol <em>Submit</em> untuk menyimpan perubahan dan tekan tombol <em>Cancel</em> untuk membatalkan.</p>
                    <div style="margin-top: 10px; margin-bottom: 10px; width: 70%;" class="mx-auto">
                        <img src="/images/tutorial/planner/bulk-time.png" alt="Jendela Edit Time" style="width: 100%; border-radius: 4px;" />
                    </div>
                  </li>
                </ol>
              </li>
              <li>
                <p class="section-title font-bold underline mb-2">Tugaskan (<em>Assign</em>)</p>     
                <p>Melalui tombol <em>Assign</em>, <em>planner</em> dapat mengubah akun yang menangani tugas yang dipilih secara bersamaan. Berikut caranya:</p>     
                <ol class="list-[lower-alpha] pl-5 space-y-2 mt-2">
                  <li>
                    <p>Pilih tugas yang ingin diberikan, lalu tekan tombol <em>Action</em>. Tekan tombol <em>Assign</em> (nomor 4).</p>
                    <div style="margin-top: 10px; margin-bottom: 10px; width: 100%;" class="mx-auto">
                        <img src="/images/tutorial/planner/action-bulk.png" alt="Lokasi Tombol Assign" style="width: 100%; border-radius: 4px;" />
                    </div>
                  </li>
                  <li>
                    <p>Saat muncul jendela <em>Assign Task</em>, pilih nama akun yang akan menangani tugas tersebut, umumnya adalah akun <em>driver</em>. Tekan tombol <em>Submit</em> untuk menyimpan perubahan dan tekan tombol <em>Cancel</em> untuk membatalkan.</p>
                    <div style="margin-top: 10px; margin-bottom: 10px; width: 70%;" class="mx-auto">
                        <img src="/images/tutorial/planner/bulk-assign.png" alt="Jendela Assign" style="width: 100%; border-radius: 4px;" />
                    </div>
                  </li>
                </ol>
              </li>
              <li>
                <p class="section-title font-bold underline mb-2">Batalkan Tugas (<em>Unassign</em>)</p>     
                <p>Melalui tombol <em>Unassign</em>, <em>planner</em> dapat membatalkan tugas yang sudah diterima oleh <em>driver</em> secara bersamaan. Berikut caranya:</p>     
                <ol class="list-[lower-alpha] pl-5 space-y-2 mt-2">
                  <li>
                    <p>Pilih tugas yang ingin dibatalkan tugasnya, lalu tekan tombol <em>Action</em>. Tekan tombol <em>Unassign</em> (nomor 5).</p>
                    <div style="margin-top: 10px; margin-bottom: 10px; width: 100%;" class="mx-auto">
                        <img src="/images/tutorial/planner/action-bulk.png" alt="Lokasi Tombol Unassign" style="width: 100%; border-radius: 4px;" />
                    </div>
                  </li>
                  <li>
                    <p>Muncul jendela konfirmasi. Tekan tombol <em>Unassign</em> untuk membatalkan tugas dan tekan tombol <em>Cancel</em> untuk membatalkan.</p>
                    <div style="margin-top: 10px; margin-bottom: 10px; width: 70%;" class="mx-auto">
                        <img src="/images/tutorial/planner/bulk-unassign.png" alt="Konfirmasi Unassign" style="width: 100%; border-radius: 4px;" />
                    </div>  
                  </li>
                </ol>
              </li>
              <li>
                <p class="section-title font-bold underline mb-2">Hapus (<em>Delete</em>)</p>     
                <p>Melalui tombol <em>Delete</em>, <em>planner</em> dapat menghapus tugas yang dipilih secara bersamaan. Berikut caranya:</p>     
                <ol class="list-[lower-alpha] pl-5 space-y-2 mt-2">
                  <li>
                    <p>Pilih tugas yang ingin dihapus, lalu tekan tombol <em>Action</em>. Tekan tombol <em>Delete</em> (nomor 6).</p>
                    <div style="margin-top: 10px; margin-bottom: 10px; width: 100%;" class="mx-auto">
                        <img src="/images/tutorial/planner/action-bulk.png" alt="Lokasi Tombol Delete" style="width: 100%; border-radius: 4px;" />
                    </div>
                  </li>
                  <li>
                    <p>Muncul jendela konfirmasi. Tekan tombol <em>Delete</em> untuk membatalkan tugas dan tekan tombol <em>Cancel</em> untuk membatalkan. Tugas yang sudah terhapus <strong>tidak dapat dikembalikan</strong>.</p> 
                    <div style="margin-top: 10px; margin-bottom: 10px; width: 70%;" class="mx-auto">
                        <img src="/images/tutorial/planner/bulk-delete.png" alt="Konfirmasi Delete" style="width: 100%; border-radius: 4px;" />
                    </div>  
                  </li>
                </ol>
              </li>
            </ul>`,
          },
        ],
      },
      {
        id: 'task-export',
        title: 'Export Tugas',
        blocks: [
          {
            type: 'text',
            content: `<p>Pada bagian ini akan dijelaskan cara untuk melakukan <em>export</em> tugas. Terdapat 2 cara untuk melakukan <em>export</em> tugas, yaitu <em>export</em> di menu Tugas dan <em>export</em> di menu <em>Import/Export</em>. Berikut ini penjelasan untuk masing-masing cara <em>export</em> tugas.</p>`,
          },
          {
            type: 'text',
            content: `
            <p class='font-bold text-2xl underline mb-2'>Menu Tugas</p>
            <p>Semua tugas yang telah ditambahkan di dalam <strong>MileApp</strong> dapat di-<em>export</em> dalam format Excel.</p>
            <p class='underline mb-2'>Perhatikan video berikut ini:</p>
                <div style="margin-top: 10px; margin-bottom: 10px;">
                  <iframe 
                    width="100%" 
                    height="450" 
                    src="https://www.youtube.com/embed/0G41UxEgcX0" 
                    title="YouTube video player" 
                    frameborder="0" 
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                    allowfullscreen>
                  </iframe>
                </div>
                <p>Berikut ini penjelasannya:</p>
                <ul class="list-decimal pl-5 space-y-2 mt-2">
                <li>
                  <p>Pada menu Tugas, berikan filter sesuai kebutuhan untuk menampilkan tugas yang ingin di-<em>export</em>. Tekan tombol <em>Export</em>, lalu tekan tombol <em>Export Task</em>. Tunggu hingga proses selesai.</p>
                  <div style="margin-top: 10px; margin-bottom: 10px; width: 100%;" class="mx-auto">
                      <img src="/images/tutorial/planner/export-task-1.png" alt="Export di Menu Tugas" style="width: 100%; border-radius: 4px;" />
                  </div>
                </li>
                <li>
                  <p>Saat proses selesai, tekan tombol menu <em>Import/Export</em>. Pilih submenu <em>Data Export</em>. Tekan ikon unduh. Tunggu hingga proses selesai.</p>
                  <div style="margin-top: 10px; margin-bottom: 10px; width: 100%;" class="mx-auto">
                      <img src="/images/tutorial/planner/export-task-2.png" alt="Unduh File" style="width: 100%; border-radius: 4px;" />
                  </div>
                </li>
              </ul>
              `,
          },
          {
            type: 'text',
            content: `<p class='font-bold text-2xl underline mb-2'>Menu <em>Import/Export</em></p>
            <p>Selain melalui menu Tugas, tugas-tugas tersebut dapat di-<em>export</em> melalui menu <em>Import/Export</em>.</p>
            <p class='underline mb-2'>Perhatikan video berikut ini:</p>
                <div style="margin-top: 10px; margin-bottom: 10px;">
                  <iframe 
                    width="100%" 
                    height="450" 
                    src="https://www.youtube.com/embed/Osp5zpVAHKc" 
                    title="YouTube video player" 
                    frameborder="0" 
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                    allowfullscreen>
                  </iframe>
                </div>
                <p>Berikut ini penjelasannya:</p>
                <ul class="list-decimal pl-5 space-y-2 mt-2">
                <li>
                  <p>Pada menu <em>Import/Export</em>, pilih submenu <em>Data Export</em>, lalu tekan tombol <em>New</em>.</p>
                  <div style="margin-top: 10px; margin-bottom: 10px; width: 100%;" class="mx-auto">
                      <img src="/images/tutorial/planner/export-task-3.png" alt="Export di Menu Import/Export" style="width: 100%; border-radius: 4px;" />
                  </div>
                </li>
                <li>
                  <p>Pada jendela <em>Data Export</em>, di bagian tipe pilih <strong>Task/Tugas</strong> , pilih rentang tanggal tugas, dan pilih lokasi cabang. Di bagian detail, untuk tipe <em>export</em> pilih <strong>All Data</strong>, pilih alur dan status yang diinginkan, serta aktifkan semua detail data. Tekan tombol <em>Submit</em> untuk menyimpan perubahan dan tekan tombol <em>Cancel</em> untuk membatalkan. Tunggu hingga proses selesai.</p>
                  <div style="margin-top: 10px; margin-bottom: 10px; width: 60%;" class="mx-auto">
                      <img src="/images/tutorial/planner/export-task-4.png" alt="Jendela Data Export" style="width: 100%; border-radius: 4px;" />
                  </div>
                </li>
                <li>
                  <p>Tekan ikon unduh. Tunggu hingga proses selesai.</p>
                  <div style="margin-top: 10px; margin-bottom: 10px; width: 100%;" class="mx-auto">
                      <img src="/images/tutorial/planner/export-task-5.png" alt="Unduh File" style="width: 100%; border-radius: 4px;" />
                  </div>
                </li>
              </ul>
              `,
          },
        ],
      },
      {
        id: 'task-tracking',
        title: 'Lacak Tugas',
        blocks: [
          {
            type: 'text',
            content: `<p>Pada bagian ini akan dijelaskan mengenai pelacakan (<em>tracking</em>) tugas, yaitu untuk memonitor tugas, mempermudah pemantauan lokasi <em>driver</em> terkini, tugas yang sedang berjalan atau sudah selesai, informasi jarak yang ditempuh, hingga perkiraan waktu tiba (ETA) dan waktu berangkat (ETD). Menu <strong>Pelacakan</strong> dapat dilihat pada menu <strong>Tugas</strong>. Selain itu, Berikut ini penjelasan untuk masing-masing aksi.</p>
            <p class='underline mb-2'>Perhatikan video berikut ini:</p>
            `,
          },
          {
            type: 'text',
            content: `
              <div style="margin-top: 10px; margin-bottom: 10px;">
                <iframe 
                  width="100%" 
                  height="450" 
                  src="https://www.youtube.com/embed/jGJg7hYGimM" 
                  title="YouTube video player" 
                  frameborder="0" 
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                  allowfullscreen>
                </iframe>
              </div>
              <p>Pada menu pelacakan akan muncul data pengguna, total jumlah tugas yang sedang berjalan dan sudah selesai, waktu dan jarak pengiriman. <em>Planner</em> dapat melakukan filter berdasarkan tanggal pengiriman atau nama <em>driver</em> yang menerima tugas. Selain itu, ditampilkan pula lokasi tiap <em>driver</em> secara <em>real-time</em>.</p>
              <div style="margin-top: 10px; margin-bottom: 10px; width: 85%;" class="mx-auto">
                  <img src="/images/tutorial/planner/tracking-1.png" alt="Tampilan Umum" style="width: 100%; border-radius: 4px;" />
              </div>
              `,
          },
          {
            type: 'text',
            content: `
              <p>Saat dipilih salah satu <em>driver</em>, akan muncul detail tugas dan lokasi <em>driver</em> tersebut. Untuk tugas yang sedang berjalan ditandai ikon berwarna <span class='text-orange-400'>oranye</span> dan tugas yang sudah selesai ditandai ikon berwarna <span class='text-green-400'>hijau</span>. Saat ikon-ikon tersebut ditekan, maka akan memunculkan detail dari tugas tersebut.</p>
              <div style="margin-top: 10px; margin-bottom: 10px; width: 85%;" class="mx-auto">
                  <img src="/images/tutorial/planner/tracking-2.png" alt="Tampilan Detail" style="width: 100%; border-radius: 4px;" />
              </div>
              `,
          },
          {
            type: 'text',
            content: `
              <p>Pada bagian kanan layar terdapat daftar tugas yang harus dikerjakan oleh <em>driver</em> tersebut. Ditampilkan pula urutan prediksi dan urutan aktualisasi untuk tiap tugasnya.</p>
              <div style="margin-top: 10px; margin-bottom: 10px; width: 85%;" class="mx-auto">
                  <img src="/images/tutorial/planner/tracking-3.png" alt="Daftar Tugas" style="width: 100%; border-radius: 4px;" />
              </div>
              `,
          },
        ],
      },
    ],
  },
];
