export const taskTopic = [
  {
    id: 'task-management',
    category: 'planner',
    title: 'Tugas (Task)',
    blocks: [
      {
        type: 'text',
        content: `<p><span class='font-bold'>Menu Tugas</span> (<span class='italic'>Task</span>) adalah pusat kendali untuk mengelola tugas, mulai dari penambahan tugas secara manual sampai dengan export laporan task. Selain itu, pada halaman ini bisa memantau tugas yang sedang berjalan (<span class="italic">real-time</span>).</p>`,
      },
      {
        type: 'image',
        src: '/images/tutorial/planner/task-menu.png',
        alt: 'Menu Task',
      },
      {
        type: 'text',
        content: `<p>Berikut ini penjelasannya:</p>
          <ol class="list-decimal pl-5 space-y-2 mt-2">
            <li>
                <p class="font-bold">Menu <span class='italic'>Task</span></p>
                <p>Menu untuk mengelola tugas seperti menambah, menyunting, dan menghapus.</p>
            </li>
            <li>
                <p class="font-bold">Submodul <span class='italic'>Tracking</span></p>
                <p>Menu untuk memonitor task dan lokasi tiap sopir (<span class='italic'>driver</span>) secara <span class='italic'>real-time</span>.</p>
            </li>
            <li>
                <p class="font-bold">Submodul <span class='italic'>Schedule</span></p>
                <p>Menu untuk mengelola jadwal pengiriman.</p>
            </li>
            <li>
                <p class="font-bold">Submodul <span class='italic'>Gallery</span> </p>
                <p>Menu untuk melihat <span class='italic'>Proof of Delivery</span> (POD) berupa foto yang sudah dilakukan oleh sopir.</p>
            </li>
            <li>
                <p class="font-bold">Daftar Hub</p>
                <p>Daftar hub yang aktif</p>
            </li>           
            <li>
                <p class="font-bold">Filter</p>
                <p>Filter tugas berdasarkan status, nama <span class='italic'>assignee</span>, nama alur (<span class='italic'>flow</span>), tanggal mulai dan selesai tugas, serta filter manual.</p>
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
        title: 'Buat Tugas',
        blocks: [
          {
            type: 'text',
            content: `<p>Pada bagian ini akan dijelaskan cara untuk membuat tugas baru. Penambahan tugas baru di <span class='font-bold'>MileApp</span> dapat dilakukan dengan dua cara, yaitu <span class='italic'>import</span> file Excel dari <span class='font-bold'>Acumatica</span> dan <span class='italic'>input</span> manual. Berikut ini penjelasan untuk masing-masing cara penambahan tugas baru</p>`,
          },
          {
            type: 'text',
            content: `<p class='font-bold text-2xl underline mb-2'><span class='italic'>Import</span> dari Acumatica</p>
            <p>Penambahan tugas baru dapat dilakukan dengan menggunakan <span class='italic'>import</span> file Excel dari <span class='font-bold'>Acumatica</span>.</p>
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
                  <p>Buka menu <span class='italic underline'>Order Template TMS Report</span> di <span class='font-bold'>Acumatica</span>.</p>
                  <div style="margin-top: 10px; margin-bottom: 10px; width: 50%;" class="mx-auto">
                      <img src="/images/tutorial/planner/acumatica-1.png" alt="Order Template TMS Report" style="width: 100%; border-radius: 4px;" />
                  </div>
                </li>
                <li>
                  <p>Sesuaikan filter yang diperlukan, yaitu lokasi cabang, tanggal mulai, tanggal selesai, gudang, dan tipe penyimpanan. Lalu tekan tombol <span class='italic'>Run Report</span>.</p>
                  <div style="margin-top: 10px; margin-bottom: 10px; width: 80%;" class="mx-auto">
                      <img src="/images/tutorial/planner/acumatica-2.png" alt="Pengaturan Laporan" style="width: 100%; border-radius: 4px;" />
                  </div>
                </li>
                <li>
                  <p>Tekan tombol <span class='italic'>Export</span>, lalu pilih Excel. Tunggu hingga proses unduh selesai.</p>
                  <div style="margin-top: 10px; margin-bottom: 10px; width: 100%;" class="mx-auto">
                      <img src="/images/tutorial/planner/acumatica-3.png" alt="Unduh Laporan" style="width: 100%; border-radius: 4px;" />
                  </div>
                </li>
                <li>
                  <p style="margin-bottom: 15px;">Berdasarkan hasil file excel tersebut, periksa tiap kolom yang tersedia untuk memastikan tidak ada data yang kosong. Data yang kosong dapat <span class='font-bold'>diisikan sementara</span> oleh <span class='italic'>planner</span> dan harus dilaporkan supaya master data customer dapat diperbarui.</p>
                  <div style="width: 100%;" class="mx-auto">
                      <img 
                          src="/images/tutorial/planner/acumatica-4.png" 
                          alt="Periksa Data" 
                          style="width: 100%; border-radius: 4px; border: 1px solid #e2e8f0;" 
                      />
                  </div>
              </li>
              </ul>
              <p class="my-2">Setelah selesai di-<span class='italic'>export</span>, maka data itu harus dimasukkan ke dalam <span class='font-bold'>MileApp</span>.</p>
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
                  <p>Di <span class='font-bold'>MileApp</span>, tekan menu <span class='italic underline'>Custom Upload Delivery</span>.</p>
                  <div style="margin-top: 10px; margin-bottom: 10px; width: 60%;" class="mx-auto">
                      <img src="/images/tutorial/planner/cud-1.png" alt="Custom Upload Delivery" style="width: 100%; border-radius: 4px;" />
                  </div>
                </li>
                <li>
                  <p>Di menu ini, pilih hub sesuai lokasi cabang, pilih alur <span class = 'italic'>Delivery</span>, lalu unggah file Excel yang sudah di-<span class='italic'>export</span>.</p>
                  <div style="margin-top: 10px; margin-bottom: 10px; width: 100%;" class="mx-auto">
                      <img src="/images/tutorial/planner/cud-2.png" alt="Pengaturan" style="width: 100%; border-radius: 4px;" />
                  </div>
                </li>
                <li>
                  <p>Tekan tombol <span class='italic'>Upload</span> dan tunggu sampai prosesnya selesai. Setelah itu, muncul tabel dari hasil pemrosesan. Jika masih ada kesalahan pada data yang diunggah, maka <span class='font-bold'>lakukan perbaikan</span> pada file Excel yang digunakan, lalu <span class='font-bold'>unggah ulang</span> file Excel yang sudah diperbaiki.</p>
                  <div style="margin-top: 10px; margin-bottom: 10px; width: 90%;" class="mx-auto">
                      <img src="/images/tutorial/planner/cud-3.png" alt="Unggah Data" style="width: 100%; border-radius: 4px;" />
                  </div>
                </li>
                <li>
                  <p>Tekan tombol <span class='italic'>Submit</span> dan tunggu sampai prosesnya selesai. Setelah itu, akan muncul notifikasi bahwa data telah berhasil ataupun gagal diunggah.</p>
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
            <p>Selain menggunakan <span class='italic'>import</span> file Excel dari <span class='font-bold'>Acumatica</span>, penambahan tugas baru dapat dilakukan dengan cara <span class='italic'>input</span> manual. Proses ini hanya dilakukan <span class='font-bold'>jika dibutuhkan saja</span>,   sehingga <span class='italic'>planner</span> tetap menggunakan <span class='italic'>import</span> file Excel.</p>
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
                  <p>Tekan tombol <span class='italic'>New</span>.</p>
                  <div style="margin-top: 10px; margin-bottom: 10px; width: 100%;" class="mx-auto">
                      <img src="/images/tutorial/planner/add-task-1.png" alt="Tombol New" style="width: 100%; border-radius: 4px;" />
                  </div>
                </li>
                <li>
                  <p>Isikan semua data pada kolom yang tersedia. Kolom dengan bertanda bintang (<span class='font-bold text-red-500'>*</span>) <span class='font-bold'>wajib diisikan</span>. Lalu, tekan tombol <span class='italic'>Submit</span>. </p>
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
            <p>Setiap baris tugas yang sudah tersimpan dapat dikelola oleh <span class='italic'>planner</span> dengan menggunakan beberapa tombol aksi (<span class='italic'>action</span>).</p>
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
                <p class="section-title font-bold underline mb-2">Lihat Tugas (<span class='italic'>View Task</span>)</p>     
                <p>Melalui tombol <span class='italic'>View</span>, pengguna dapat melihat informasi lengkap terkait tugas yang dipilih. Berikut caranya:</p>     
                <ol class="list-[lower-alpha] pl-5 space-y-2 mt-2">
                  <li>
                    <p>Tekan tombol <span class='italic'>View Task</span> (nomor 1).</p>
                    <div style="margin-top: 10px; margin-bottom: 10px; width: 100%;" class="mx-auto">
                        <img src="/images/tutorial/planner/action.png" alt="Lokasi Tombol View" style="width: 100%; border-radius: 4px;" />
                    </div>
                  </li>
                  <li>
                    <p>Saat muncul jendela <span class='italic'>View Task</span>, terdapat informasi lengkap yang terkait dengan tugas tersebut.</p>
                    <div style="margin-top: 10px; margin-bottom: 10px; width: 90%;" class="mx-auto">
                        <img src="/images/tutorial/planner/action-view.png" alt="Jendela View" style="width: 100%; border-radius: 4px;" />
                    </div>
                  </li>  
                </ol>
              </li>
              <li>
                <p class="section-title font-bold underline mb-2">Sunting Tugas (<span class='italic'>Edit Task</span>)</p>     
                <p>Melalui tombol <span class='italic'>Edit</span>, <span class='italic'>planner</span> dapat mengubah informasi pada tugas yang dipilih. Tombol <span class='italic'>Edit Task</span> hanya muncul pada tugas dengan status <span class='font-bold italic'>Unassigned</span> atau <span class='font-bold italic'>Ongoing</span>. Berikut caranya:</p>      
                <ol class="list-[lower-alpha] pl-5 space-y-2 mt-2">
                  <li>
                    <p>Tekan tombol <span class='italic'>Edit</span> (nomor 2).</p>
                    <div style="margin-top: 10px; margin-bottom: 10px; width: 100%;" class="mx-auto">
                        <img src="/images/tutorial/planner/action.png" alt="Lokasi Tombol Edit" style="width: 100%; border-radius: 4px;" />
                    </div>
                  </li>
                  <li>
                    <p>Saat muncul jendela <span class='italic'>Edit Task</span>, lakuakan perubahan sesuai kebutuhan. Kolom dengan bertanda bintang (<span class='font-bold text-red-500'>*</span>) <span class='font-bold'>wajib diisikan</span>. Tekan tombol <span class='italic'>Submit</span> untuk menyimpan perubahan dan tekan tombol <span class='italic'>Cancel</span> untuk membatalkan. </p>
                    <div style="margin-top: 10px; margin-bottom: 10px; width: 60%;" class="mx-auto">
                        <img src="/images/tutorial/planner/action-edit.png" alt="Jendela Edit" style="width: 100%; border-radius: 4px;" />
                    </div>
                  </li>
                </ol>
              </li>
              <li>
                <p class="section-title font-bold underline mb-2">Hapus Tugas (<span class='italic'>Delete Task</span>)</p>     
                <p>Melalui tombol <span class='italic'>Delete</span>, pengguna dapat menghapus tugas yang dipilih. Tombol <span class='italic'>Delete Task</span> hanya muncul pada tugas dengan status <span class='font-bold italic'>Unassigned</span> atau <span class='font-bold italic'>Ongoing</span>. Berikut caranya:</p>      
                <ol class="list-[lower-alpha] pl-5 space-y-2 mt-2">
                  <li>
                    <p>Tekan tombol <span class='italic'>Delete Task</span> (nomor 3).</p>
                    <div style="margin-top: 10px; margin-bottom: 10px; width: 100%;" class="mx-auto">
                        <img src="/images/tutorial/planner/action.png" alt="Lokasi Tombol Delete" style="width: 100%; border-radius: 4px;" />
                    </div>
                  </li>
                  <li>
                    <p>Muncul jendela konfirmasi. Tekan tombol <span class='italic'>Delete</span> untuk menghapus data dan tekan tombol <span class='italic'>Cancel</span> untuk membatalkan. Tugas yang sudah terhapus <span class='font-bold'>tidak dapat dikembalikan</span>.</p>
                    <div style="margin-top: 10px; margin-bottom: 10px; width: 60%;" class="mx-auto">
                        <img src="/images/tutorial/planner/action-delete.png" alt="Konfirmasi Delete" style="width: 100%; border-radius: 4px;" />
                    </div>
                  </li>
                </ol>
              </li>
              <li>
                <p class="section-title font-bold underline mb-2">Lakukan Tugas (<span class='italic'>Do Task</span>)</p>     
                <p>Melalui tombol <span class='italic'>Do Task</span>, pengguna dapat memulai dan menjalankan tugas yang dipilih. Tombol <span class='italic'>Do Task</span> hanya muncul jika <span class='italic'>planner</span> <span class='font-bold'>menambahkan nama akunnya</span> pada tugas tersebut. Aksi ini digunakan saat ingin menyelesaikan tugas yang sudah diberikan kepada sopir tanpa harus menggunakan akun dari sopir tersebut. Berikut caranya:</p>      
                <ol class="list-[lower-alpha] pl-5 space-y-2 mt-2">
                  <li>
                    <p>Tekan tombol <span class='italic'>Do Task</span> (nomor 4).</p>
                    <div style="margin-top: 10px; margin-bottom: 10px; width: 100%;" class="mx-auto">
                        <img src="/images/tutorial/planner/action.png" alt="Lokasi Tombol Do" style="width: 100%; border-radius: 4px;" />
                    </div>
                  </li>
                  <li>
                    <p>Setelah ditekan, maka akan muncul jendela <span class='italic'>Do Task</span>. Kerjakan tugas tersebut dengan mengisikan kolom yang tersedia sesuai dengan alur yang digunakan hingga selesai.</p>
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
            <p>Aksi untuk tugas yang tersedia dapat dilakukan secara massal (<span class='italic'>bulk</span>). Aksi ini hanya bisa dilakukan pada task dengan status<span class='font-bold italic'>Unassigned</span> atau <span class='font-bold italic'>Ongoing</span>.</p>
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
                <p class="section-title font-bold underline mb-2">Sunting Waktu (<span class='italic'>Edit Time</span>)</p>     
                <p>Melalui tombol <span class='italic'>Edit Time</span>, <span class='italic'>planner</span> dapat mengubah waktu aktif dan selesainya dari tugas yang dipilih secara bersamaan. Berikut caranya:</p>     
                <ol class="list-[lower-alpha] pl-5 space-y-2 mt-2">
                  <li>
                    <p>Pilih tugas yang ingin diubah waktunya, lalu tekan tombol <span class='italic'>Action</span>. Tekan tombol <span class='italic'>Edit Time</span> (nomor 3).</p>
                    <div style="margin-top: 10px; margin-bottom: 10px; width: 100%;" class="mx-auto">
                        <img src="/images/tutorial/planner/action-bulk.png" alt="Lokasi Tombol Edit Time" style="width: 100%; border-radius: 4px;" />
                    </div>
                  </li>
                  <li>
                    <p>Saat muncul jendela <span class='italic'>Edit Time</span>, lakukan perubahan jam mulai dan selesai sebagai rentang waktu aktifnya tugas tersebut. Tekan tombol <span class='italic'>Submit</span> untuk menyimpan perubahan dan tekan tombol <span class='italic'>Cancel</span> untuk membatalkan.</p>
                    <div style="margin-top: 10px; margin-bottom: 10px; width: 70%;" class="mx-auto">
                        <img src="/images/tutorial/planner/bulk-time.png" alt="Jendela Edit Time" style="width: 100%; border-radius: 4px;" />
                    </div>
                  </li>
                </ol>
              </li>
              <li>
                <p class="section-title font-bold underline mb-2">Tugaskan (<span class='italic'>Assign</span>)</p>     
                <p>Melalui tombol <span class='italic'>Assign</span>, <span class='italic'>planner</span> dapat mengubah akun yang menangani tugas yang dipilih secara bersamaan. Berikut caranya:</p>     
                <ol class="list-[lower-alpha] pl-5 space-y-2 mt-2">
                  <li>
                    <p>Pilih tugas yang ingin diberikan, lalu tekan tombol <span class='italic'>Action</span>. Tekan tombol <span class='italic'>Assign</span> (nomor 4).</p>
                    <div style="margin-top: 10px; margin-bottom: 10px; width: 100%;" class="mx-auto">
                        <img src="/images/tutorial/planner/action-bulk.png" alt="Lokasi Tombol Assign" style="width: 100%; border-radius: 4px;" />
                    </div>
                  </li>
                  <li>
                    <p>Saat muncul jendela <span class='italic'>Assign Task</span>, pilih nama akun yang akan menangani tugas tersebut, umumnya adalah akun sopir. Tekan tombol <span class='italic'>Submit</span> untuk menyimpan perubahan dan tekan tombol <span class='italic'>Cancel</span> untuk membatalkan.</p>
                    <div style="margin-top: 10px; margin-bottom: 10px; width: 70%;" class="mx-auto">
                        <img src="/images/tutorial/planner/bulk-assign.png" alt="Jendela Assign" style="width: 100%; border-radius: 4px;" />
                    </div>
                  </li>
                </ol>
              </li>
              <li>
                <p class="section-title font-bold underline mb-2">Lepaskan Tugas (<span class='italic'>Unassign</span>)</p>     
                <p>Melalui tombol <span class='italic'>Unassign</span>, <span class='italic'>planner</span> dapat melepaskan tugas yang sudah diterima oleh sopir secara bersamaan. Berikut caranya:</p>     
                <ol class="list-[lower-alpha] pl-5 space-y-2 mt-2">
                  <li>
                    <p>Pilih tugas yang ingin dilepas tugasnya, lalu tekan tombol <span class='italic'>Action</span>. Tekan tombol <span class='italic'>Unassign</span> (nomor 5).</p>
                    <div style="margin-top: 10px; margin-bottom: 10px; width: 100%;" class="mx-auto">
                        <img src="/images/tutorial/planner/action-bulk.png" alt="Lokasi Tombol Unassign" style="width: 100%; border-radius: 4px;" />
                    </div>
                  </li>
                  <li>
                    <p>Muncul jendela konfirmasi. Tekan tombol <span class='italic'>Unassign</span> untuk melepas tugas dan tekan tombol <span class='italic'>Cancel</span> untuk membatalkan.</p>
                    <div style="margin-top: 10px; margin-bottom: 10px; width: 70%;" class="mx-auto">
                        <img src="/images/tutorial/planner/bulk-unassign.png" alt="Konfirmasi Unassign" style="width: 100%; border-radius: 4px;" />
                    </div>  
                  </li>
                </ol>
              </li>
              <li>
                <p class="section-title font-bold underline mb-2">Hapus (<span class='italic'>Delete</span>)</p>     
                <p>Melalui tombol <span class='italic'>Delete</span>, <span class='italic'>planner</span> dapat menghapus tugas yang dipilih secara bersamaan. Berikut caranya:</p>     
                <ol class="list-[lower-alpha] pl-5 space-y-2 mt-2">
                  <li>
                    <p>Pilih tugas yang ingin dihapus, lalu tekan tombol <span class='italic'>Action</span>. Tekan tombol <span class='italic'>Delete</span> (nomor 6).</p>
                    <div style="margin-top: 10px; margin-bottom: 10px; width: 100%;" class="mx-auto">
                        <img src="/images/tutorial/planner/action-bulk.png" alt="Lokasi Tombol Delete" style="width: 100%; border-radius: 4px;" />
                    </div>
                  </li>
                  <li>
                    <p>Muncul jendela konfirmasi. Tekan tombol <span class='italic'>Delete</span> untuk melepas tugas dan tekan tombol <span class='italic'>Cancel</span> untuk membatalkan. Tugas yang sudah terhapus <span class='font-bold'>tidak dapat dikembalikan</span>.</p> 
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
            content: `<p>Pada bagian ini akan dijelaskan cara untuk melakukan <span class='italic'>export</span> tugas. Terdapat 2 cara untuk melakukan <span class='italic'>export</span> tugas, yaitu <span class='italic'>export</span> di menu Tugas dan <span class='italic'>export</span> di menu <span class='italic'>Import/Export</span>. Berikut ini penjelasan untuk masing-masing cara <span class='italic'>export</span> tugas.</p>`,
          },
          {
            type: 'text',
            content: `
            <p class='font-bold text-2xl underline mb-2'>Menu Tugas</p>
            <p>Semua tugas yang telah ditambahkan di dalam <span class='font-bold'>MileApp</span> dapat di-<span class='italic'>export</span> dalam format Excel.</p>
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
                  <p>Pada menu Tugas, berikan filter sesuai kebutuhan untuk menampilkan tugas yang ingin di-<span class='italic'>export</span>. Tekan tombol <span class='italic'>Export</span>, lalu tekan tombol <span class='italic'>Export Task</span>. Tunggu hingga proses selesai.</p>
                  <div style="margin-top: 10px; margin-bottom: 10px; width: 100%;" class="mx-auto">
                      <img src="/images/tutorial/planner/export-task-1.png" alt="Export di Menu Tugas" style="width: 100%; border-radius: 4px;" />
                  </div>
                </li>
                <li>
                  <p>Saat proses selesai, tekan tombol menu <span class='italic'>Import/Export</span>. Pilih submenu <span class='italic'>Data Export</span>. Tekan ikon unduh. Tunggu hingga proses selesai.</p>
                  <div style="margin-top: 10px; margin-bottom: 10px; width: 100%;" class="mx-auto">
                      <img src="/images/tutorial/planner/export-task-2.png" alt="Unduh File" style="width: 100%; border-radius: 4px;" />
                  </div>
                </li>
              </ul>
              `,
          },
          {
            type: 'text',
            content: `<p class='font-bold text-2xl underline mb-2'>Menu <span class='italic'>Import/Export</span></p>
            <p>Selain melalui menu Tugas, tugas-tugas tersebut dapat di-<span class='italic'>export</span> melalui menu <span class='italic'>Import/Export</span>.</p>
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
                  <p>Pada menu <span class='italic'>Import/Export</span>, pilih submenu <span class='italic'>Data Export</span>, lalu tekan tombol <span class='italic'>New</span>.</p>
                  <div style="margin-top: 10px; margin-bottom: 10px; width: 100%;" class="mx-auto">
                      <img src="/images/tutorial/planner/export-task-3.png" alt="Export di Menu Import/Export" style="width: 100%; border-radius: 4px;" />
                  </div>
                </li>
                <li>
                  <p>Pada jendela <span class='italic'>Data Export</span>, di bagian tipe pilih <span class='font-bold'>Task/Tugas</span> , pilih rentang tanggal tugas, dan pilih lokasi cabang. Di bagian detail, untuk tipe <span class='italic'>export</span> pilih <span class='font-bold'>All Data</span>, pilih alur dan status yang diinginkan, serta aktifkan semua detail data. Tekan tombol <span class='italic'>Submit</span> untuk menyimpan perubahan dan tekan tombol <span class='italic'>Cancel</span> untuk membatalkan. Tunggu hingga proses selesai.</p>
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
            content: `<p>Pada bagian ini akan dijelaskan mengenai pelacakan (<span class='italic'>tracking</span>) tugas, yaitu untuk memonitor tugas, mempermudah pemantauan lokasi sopir terkini, tugas yang sedang berjalan atau sudah selesai, informasi jarak yang ditempuh, hingga perkiraan waktu tiba (ETA) dan waktu berangkat (ETD). Menu <span class='font-bold'>Pelacakan</span> dapat dilihat pada menu <span class='font-bold'>Tugas</span>. Selain itu, Berikut ini penjelasan untuk masing-masing aksi.</p>
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
              <p>Pada menu pelacakan akan muncul data pengguna, total jumlah tugas yang sedang berjalan dan sudah selesai, waktu dan jarak pengiriman. <span class='italic'>Planner</span> dapat melakukan filter berdasarkan tanggal pengiriman atau nama sopir yang menerima tugas. Selain itu, ditampilkan pula lokasi tiap sopir secara <span class='italic'>real-time</span>.</p>
              <div style="margin-top: 10px; margin-bottom: 10px; width: 100%;" class="mx-auto">
                  <img src="/images/tutorial/planner/tracking-1.png" alt="Tampilan Umum" style="width: 100%; border-radius: 4px;" />
              </div>
              `,
          },
          {
            type: 'text',
            content: `
              <p>Saat dipilih salah satu sopir, akan muncul detail tugas dan lokasi sopir tersebut. Untuk tugas yang sedang berjalan ditandai ikon berwarna <span class='text-orange-400'>oranye</span> dan tugas yang sudah selesai ditandai ikon berwarna <span class='text-green-400'>hijau</span>. Saat ikon-ikon tersebut ditekan, maka akan memunculkan detail dari tugas tersebut.</p>
              <div style="margin-top: 10px; margin-bottom: 10px; width: 100%;" class="mx-auto">
                  <img src="/images/tutorial/planner/tracking-2.png" alt="Tampilan Detail" style="width: 100%; border-radius: 4px;" />
              </div>
              `,
          },
          {
            type: 'text',
            content: `
              <p>Pada bagian kanan layar terdapat daftar tugas yang harus dikerjakan oleh sopir tersebut. Ditampilkan pula urutan prediksi dan urutan aktualisasi untuk tiap tugasnya.</p>
              <div style="margin-top: 10px; margin-bottom: 10px; width: 100%;" class="mx-auto">
                  <img src="/images/tutorial/planner/tracking-3.png" alt="Daftar Tugas" style="width: 100%; border-radius: 4px;" />
              </div>
              `,
          },
        ],
      },
    ],
  },
];
