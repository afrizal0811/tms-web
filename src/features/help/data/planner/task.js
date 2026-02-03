export const taskTopic = [
  {
    id: 'task-management',
    category: 'planner',
    title: 'Manajemen Tugas (Task)',
    blocks: [
      {
        type: 'text',
        content: `<p><span class='font-bold'>Modul Tugas</span> (<span class='italic'>Task</span>) adalah pusat kendali untuk mengelola tugas, mulai dari penambahan tugas secara manual sampai dengan export laporan task. Selain itu, pada halaman ini bisa memantau tugas yang sedang berjalan (<span class="italic">real-time</span>).</p>`,
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
                <p class="font-bold">Modul <span class='italic'>Task</span></p>
                <p>Modul untuk mengelola tugas seperti menambah, menyunting, dan menghapus.</p>
            </li>
            <li>
                <p class="font-bold">Submodul <span class='italic'>Tracking</span></p>
                <p>Modul untuk memonitor task dan lokasi tiap sopir (<span class='italic'>driver</span>) secara <span class='italic'>real-time</span>.</p>
            </li>
            <li>
                <p class="font-bold">Submodul <span class='italic'>Schedule</span></p>
                <p>Modul untuk mengelola jadwal pengiriman.</p>
            </li>
            <li>
                <p class="font-bold">Submodul <span class='italic'>Gallery</span> </p>
                <p>Modul untuk melihat <span class='italic'>Proof of Delivery</span> (POD) berupa foto yang sudah dilakukan oleh sopir.</p>
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
        title: 'Membuat Tugas Baru',
        blocks: [
          {
            type: 'text',
            content: `<p>Pada subtopik ini akan dijelaskan cara untuk membuat tugas baru. Penambahan tugas baru di <span class='font-bold'>MileApp</span> dapat dilakukan dengan dua cara, yaitu <span class='italic'>import</span> file Excel dari <span class='font-bold'>Acumatica</span> dan <span class='italic'>input</span> manual. Berikut ini penjelasan untuk masing-masing cara penambahan tugas baru</p>`,
          },
          {
            type: 'text',
            content: `<p><span class='font-bold text-3xl underline'>Import dari Acumatica</span></p>
            <p>Penambahan tugas baru dapat dilakukan dengan menggunakan <span class='italic'>import</span> file Excel dari <span class='font-bold'>Acumatica</span>. Perhatikan video berikut ini:</p>
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
                      <img src="/images/tutorial/planner/acumatica-1.png" alt="acm-1" style="width: 100%; border-radius: 4px;" />
                  </div>
                </li>
                <li>
                  <p>Sesuaikan filter yang diperlukan, yaitu lokasi cabang, tanggal mulai, tanggal selesai, gudang, dan tipe penyimpanan. Lalu tekan tombol <span class='italic'>Run Report</span>.</p>
                  <div style="margin-top: 10px; margin-bottom: 10px; width: 80%;" class="mx-auto">
                      <img src="/images/tutorial/planner/acumatica-2.png" alt="acm-2" style="width: 100%; border-radius: 4px;" />
                  </div>
                </li>
                <li>
                  <p>Tekan tombol <span class='italic'>Export</span>, lalu pilih Excel. Tunggu hingga proses unduh selesai.</p>
                  <div style="margin-top: 10px; margin-bottom: 10px; width: 100%;" class="mx-auto">
                      <img src="/images/tutorial/planner/acumatica-3.png" alt="acm-3" style="width: 100%; border-radius: 4px;" />
                  </div>
                </li>
                <li>
                  <p style="margin-bottom: 15px;">Berdasarkan hasil file excel tersebut, periksa tiap kolom yang tersedia untuk memastikan tidak ada data yang kosong. Data yang kosong dapat <span class='font-bold'>diisikan sementara</span> oleh <span class='italic'>planner</span> dan harus dilaporkan supaya master data customer dapat diperbarui.</p>
                  <div style="width: 100%;" class="mx-auto">
                      <img 
                          src="/images/tutorial/planner/acumatica-4.png" 
                          alt="acm-4" 
                          style="width: 100%; border-radius: 4px; border: 1px solid #e2e8f0;" 
                      />
                  </div>
              </li>
              </ul>
              <p class="my-2">Setelah selesai di-<span class='italic'>export</span>, maka data itu harus dimasukkan ke dalam <span class='font-bold'>MileApp</span>. Perhatikan video berikut ini:</p>
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
                  <p>Di <span class='font-bold'>MileApp</span>, tekan modul <span class='italic underline'>Custom Upload Delivery</span>.</p>
                  <div style="margin-top: 10px; margin-bottom: 10px; width: 60%;" class="mx-auto">
                      <img src="/images/tutorial/planner/cud-1.png" alt="cud-1" style="width: 100%; border-radius: 4px;" />
                  </div>
                </li>
                <li>
                  <p>Di modul ini, pilih hub sesuai lokasi cabang, pilih alur <span class = 'italic'>Delivery</span>, lalu unggah file Excel yang sudah di-<span class='italic'>export</span>.</p>
                  <div style="margin-top: 10px; margin-bottom: 10px; width: 100%;" class="mx-auto">
                      <img src="/images/tutorial/planner/cud-2.png" alt="cud-2" style="width: 100%; border-radius: 4px;" />
                  </div>
                </li>
                <li>
                  <p>Tekan tombol <span class='italic'>Upload</span> dan tunggu sampai prosesnya selesai. Setelah itu, muncul tabel dari hasil pemrosesan. Jika masih ada kesalahan pada data yang diunggah, maka <span class='font-bold'>lakukan perbaikan</span> pada file Excel yang digunakan, lalu <span class='font-bold'>unggah ulang</span> file Excel yang sudah diperbaiki.</p>
                  <div style="margin-top: 10px; margin-bottom: 10px; width: 90%;" class="mx-auto">
                      <img src="/images/tutorial/planner/cud-3.png" alt="cud-3" style="width: 100%; border-radius: 4px;" />
                  </div>
                </li>
                <li>
                  <p>Tekan tombol <span class='italic'>Submit</span> dan tunggu sampai prosesnya selesai. Setelah itu, akan muncul notifikasi bahwa data telah berhasil ataupun gagal diunggah.</p>
                  <div style="margin-top: 10px; margin-bottom: 10px; width: 90%;" class="mx-auto">
                      <img src="/images/tutorial/planner/cud-4.png" alt="cud-4" style="width: 100%; border-radius: 4px;" />
                  </div>
                </li>
              </ul>
              `,
          },
          {
            type: 'text',
            content: `<p></p><span class='font-bold text-3xl underline'>Input Manual</span></p>
            <p>Selain menggunakan <span class='italic'>import</span> file Excel dari <span class='font-bold'>Acumatica</span>, penambahan tugas baru dapat dilakukan dengan cara <span class='italic'>input</span> manual. Proses ini hanya dilakukan <span class='font-bold'>jika dibutuhkan saja</span>,   sehingga <span class='italic'>planner</span> tetap menggunakan <span class='italic'>import</span> file Excel. Perhatikan video berikut ini:</p>
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
                <p class='underline'>Berikut ini penjelasannya:</p>
                <ul class="list-decimal pl-5 space-y-2 mt-2">
                <li>
                  <p>Tekan tombol <span class='italic'>New</span>.</p>
                  <div style="margin-top: 10px; margin-bottom: 10px; width: 100%;" class="mx-auto">
                      <img src="/images/tutorial/planner/add-task-1.png" alt="add-task-1" style="width: 100%; border-radius: 4px;" />
                  </div>
                </li>
                <li>
                  <p>Isikan semua data pada kolom yang tersedia. Kolom dengan bertanda bintang (<span class='font-bold text-red-500'>*</span>) <span class='font-bold'>wajib diisikan</span>. Lalu, tekan tombol <span class='italic'>Submit</span>. </p>
                  <div style="margin-top: 10px; margin-bottom: 10px; width: 80%;" class="mx-auto">
                      <img src="/images/tutorial/planner/add-task-2-v2.png" alt="add-task-2" style="width: 100%; border-radius: 4px;" />
                  </div>
                </li>
              </ul>
              `,
          },
        ],
      },
      {
        id: 'task-action',
        title: 'Aksi Tugas', // Level 2
        blocks: [
          {
            type: 'text',
            content:
              '<p>Pada subtopik ini akan dijelaskan cara untuk mengelola tugas, mulai dari melihat (<span class="italic">view</span>), mengubah (<span class="italic">edit</span>), menghapus (<span class="italic">delete</span>), serta melakukan (<span class="italic">do</span>) tugas. Tombol aksi ini bisa dilakukan per tugas dan secara massal. Berikut ini penjelasan untuk masing-masing aksi.</p>',
          },
          {
            type: 'text',
            content: `<p><span class='font-bold text-3xl underline'>Aksi Per Tugas</span></p>
            <p>Setiap baris tugas yang sudah tersimpan dapat dikelola oleh <span class='italic'>planner</span> dengan menggunakan beberapa tombol aksi (<span class='italic'>action</span>). Perhatikan video berikut ini:</p>
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
              <p>Berikut ini penjelasannya:</p>
            `,
          },
          {
            type: 'text',
            content: `<p class='font-bold text-xl underline mt-2'>View Task (Lihat Tugas)</p>
              <ul class="list-decimal pl-5 space-y-2 mt-2">
              <li>
                <p>Tekan tombol <span class='italic'>View Task</span> (nomor 1).</p>
                <div style="margin-top: 10px; margin-bottom: 10px; width: 100%;" class="mx-auto">
                    <img src="/images/tutorial/planner/action.png" alt="act-1" style="width: 100%; border-radius: 4px;" />
                </div>
              </li>
              <li>
                <p>Muncul jendela <span class='italic'>View Task</span>. Terdapat informasi yang terkait dengan tugas tersebut.</p>
                <div style="margin-top: 10px; margin-bottom: 10px; width: 90%;" class="mx-auto">
                    <img src="/images/tutorial/planner/action-view.png" alt="act-2" style="width: 100%; border-radius: 4px;" />
                </div>
              </li>
            </ul>`,
          },
          {
            type: 'text',
            content: `              
            <p class='font-bold text-xl underline mt-2'>Edit Task (Sunting Tugas)</p>
              <ul class="list-decimal pl-5 space-y-2 mt-2">
              <li>
                <p>Tekan tombol <span class='italic'>Edit</span> (nomor 2).</p>
                <div style="margin-top: 10px; margin-bottom: 10px; width: 100%;" class="mx-auto">
                    <img src="/images/tutorial/planner/action.png" alt="act-1" style="width: 100%; border-radius: 4px;" />
                </div>
              </li>
              <li>
                <p>Muncul jendela <span class='italic'>Edit Task</span>. Lakukan perubahan sesuai kebutuhan. Kolom dengan bertanda bintang (<span class='font-bold text-red-500'>*</span>) <span class='font-bold'>wajib diisikan</span>. Tekan tombol <span class='italic'>Submit</span> untuk menyimpan perubahan dan tekan tombol <span class='italic'>Cancel</span> untuk membatalkan. </p>
                <div style="margin-top: 10px; margin-bottom: 10px; width: 70%;" class="mx-auto">
                    <img src="/images/tutorial/planner/action-edit-v2.png" alt="act-3" style="width: 100%; border-radius: 4px;" />
                </div>
              </li>
              <li>
                <p>Tombol <span class='italic'>Edit Task</span> hanya muncul pada tugas dengan status <span class='font-bold italic'>Unassigned</span> atau <span class='font-bold italic'>Ongoing</span></p>
              </li>
            </ul>`,
          },
          {
            type: 'text',
            content: `              
            <p class='font-bold text-xl underline mt-2'>Delete Task (Hapus Tugas)</p>
              <ul class="list-decimal pl-5 space-y-2 mt-2">
              <li>
                <p>Tekan tombol <span class='italic'>Delete Task</span> (nomor 3).</p>
                <div style="margin-top: 10px; margin-bottom: 10px; width: 100%;" class="mx-auto">
                    <img src="/images/tutorial/planner/action.png" alt="act-1" style="width: 100%; border-radius: 4px;" />
                </div>
              </li>
              <li>
                <p>Muncul jendela konfirmasi. Tekan tombol <span class='italic'>Delete</span> untuk menghapus data dan tekan tombol <span class='italic'>Cancel</span> untuk membatalkan. Tugas yang sudah terhapus <span class='font-bold'>tidak dapat dikembalikan</span>.</p>
                <div style="margin-top: 10px; margin-bottom: 10px; width: 60%;" class="mx-auto">
                    <img src="/images/tutorial/planner/action-delete.png" alt="act-4" style="width: 100%; border-radius: 4px;" />
                </div>
              </li>
              <li>
                <p>Tombol <span class='italic'>Delete Task</span> hanya muncul pada tugas dengan status <span class='font-bold italic'>Unassigned</span> atau <span class='font-bold italic'>Ongoing</span>.</p>
              </li>
            </ul>`,
          },
          {
            type: 'text',
            content: `              
            <p class='font-bold text-xl underline mt-2'>Do Task (Lakukan Tugas)</p>
              <ul class="list-decimal pl-5 space-y-2 mt-2">
              <li>
                <p>Tekan tombol <span class='italic'>Do Task</span> (nomor 4).</p>
                <div style="margin-top: 10px; margin-bottom: 10px; width: 100%;" class="mx-auto">
                    <img src="/images/tutorial/planner/action.png" alt="act-1" style="width: 100%; border-radius: 4px;" />
                </div>
              </li>
              <li>
                <p>Tombol <span class='italic'>Do Task</span> hanya muncul jika <span class='italic'>planner</span> <span class='font-bold'>menambahkan nama akunnya</span> pada tugas tersebut. Aksi ini digunakan saat ingin menyelesaikan tugas yang sudah diberikan kepada sopir tanpa harus menggunakan akun dari sopir tersebut.</p>
              </li>
              <li>
                <p>Setelah ditekan, maka akan muncul jendela <span class='italic'>Do Task</span>. Kerjakan tugas tersebut dengan mengisikan kolom yang tersedia sesuai dengan alur yang digunakan hingga selesai.</p>
                <div style="margin-top: 10px; margin-bottom: 10px; width: 70%;" class="mx-auto">
                    <img src="/images/tutorial/planner/action-do.png" alt="act-5" style="width: 100%; border-radius: 4px;" />
                </div>
              </li>
            </ul>`,
          },
          {
            type: 'text',
            content: `<p><span class='font-bold text-3xl underline'>Aksi Massal</span></p>
            <p>Aksi untuk tugas yang tersedia dapat dilakukan secara massal (<span class='italic'>bulk</span>). Aksi ini hanya bisa dilakukan pada task dengan status<span class='font-bold italic'>Unassigned</span> atau <span class='font-bold italic'>Ongoing</span>. Perhatikan video berikut ini:</p>
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
              <p>Berikut ini penjelasannya:</p>
            `,
          },
          {
            type: 'text',
            content: `<p class='font-bold text-xl underline mt-2'>Edit Time (Sunting Waktu)</p>
              <ul class="list-decimal pl-5 space-y-2 mt-2">
              <li>
                <p>Pilih tugas yang ingin diubah waktunya, lalu tekan tombol Aksi (<span class='italic'>Action</span>). Tekan tombol <span. class='italic'>Edit Time</span.</p>
                <div style="margin-top: 10px; margin-bottom: 10px; width: 100%;" class="mx-auto">
                    <img src="/images/tutorial/planner/action-bulk.png" alt="act-6" style="width: 100%; border-radius: 4px;" />
                </div>
              </li>
              <li>
                <p>Muncul jendela <span class='italic'>Edit Time</span>. Lakukan perubahan jam mulai dan selesai sebagai rentang waktu aktifnya tugas tersebut. Tekan tombol <span class='italic'>Submit</span> untuk menyimpan perubahan dan tekan tombol <span class='italic'>Cancel</span> untuk membatalkan.</p>
                <div style="margin-top: 10px; margin-bottom: 10px; width: 70%;" class="mx-auto">
                    <img src="/images/tutorial/planner/bulk-time.png" alt="act-7" style="width: 100%; border-radius: 4px;" />
                </div>
              </li>
            </ul>`,
          },
          {
            type: 'text',
            content: `<p class='font-bold text-xl underline mt-2'>Assign (Tugaskan)</p>
              <ul class="list-decimal pl-5 space-y-2 mt-2">
              <li>
                <p>Pilih tugas yang ingin diberikan, lalu tekan tombol Aksi (<span class='italic'>Action</span>). Tekan tombol <span. class='italic'>Assign</span.</p>
                <div style="margin-top: 10px; margin-bottom: 10px; width: 100%;" class="mx-auto">
                    <img src="/images/tutorial/planner/action-bulk.png" alt="act-8" style="width: 100%; border-radius: 4px;" />
                </div>
              </li>
              <li>
                <p>Muncul jendela <span class='italic'>Assign Task</span>. Pilih nama akun yang akan menangani tugas tersebut, umumnya adalah akun sopir. Tekan tombol <span class='italic'>Submit</span> untuk menyimpan perubahan dan tekan tombol <span class='italic'>Cancel</span> untuk membatalkan.</p>
                <div style="margin-top: 10px; margin-bottom: 10px; width: 70%;" class="mx-auto">
                    <img src="/images/tutorial/planner/bulk-assign.png" alt="act-9" style="width: 100%; border-radius: 4px;" />
                </div>
              </li>
            </ul>`,
          },
          {
            type: 'text',
            content: `<p class='font-bold text-xl underline mt-2'>Unassign (Melepas Tugas)</p>
              <ul class="list-decimal pl-5 space-y-2 mt-2">
              <li>
                <p>Pilih tugas yang ingin dilepas tugasnya, lalu tekan tombol Aksi (<span class='italic'>Action</span>). Tekan tombol <span. class='italic'>Unassign</span.</p>
                <div style="margin-top: 10px; margin-bottom: 10px; width: 100%;" class="mx-auto">
                    <img src="/images/tutorial/planner/action-bulk.png" alt="act-10" style="width: 100%; border-radius: 4px;" />
                </div>
              </li>
              <li>
                <p>Muncul jendela konfirmasi. Tekan tombol <span class='italic'>Unassign</span> untuk melepas tugas dan tekan tombol <span class='italic'>Cancel</span> untuk membatalkan.</p>
                <div style="margin-top: 10px; margin-bottom: 10px; width: 70%;" class="mx-auto">
                    <img src="/images/tutorial/planner/bulk-unassign.png" alt="act-11" style="width: 100%; border-radius: 4px;" />
                </div>  
              </li>
            </ul>`,
          },
          {
            type: 'text',
            content: `<p class='font-bold text-xl underline mt-2'>Delete (Hapus)</p>
              <ul class="list-decimal pl-5 space-y-2 mt-2">
              <li>
                <p>Pilih tugas yang ingin dihapus, lalu tekan tombol Aksi (<span class='italic'>Action</span>). Tekan tombol <span. class='italic'>Delete</span.</p>
                <div style="margin-top: 10px; margin-bottom: 10px; width: 100%;" class="mx-auto">
                    <img src="/images/tutorial/planner/action-bulk.png" alt="act-12" style="width: 100%; border-radius: 4px;" />
                </div>
              </li>
              <li>
                <p>Muncul jendela konfirmasi. Tekan tombol <span class='italic'>Delete</span> untuk melepas tugas dan tekan tombol <span class='italic'>Cancel</span> untuk membatalkan. Tugas yang sudah terhapus <span class='font-bold'>tidak dapat dikembalikan</span>.</p> 
                <div style="margin-top: 10px; margin-bottom: 10px; width: 70%;" class="mx-auto">
                    <img src="/images/tutorial/planner/bulk-delete.png" alt="act-13" style="width: 100%; border-radius: 4px;" />
                </div>  
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
            content: `<p>Pada subtopik ini akan dijelaskan cara untuk melakukan <span class='italic'>export</span> tugas. Terdapat 2 cara untuk melakukan <span class='italic'>export</span> tugas, yaitu <span class='italic'>export</span> di modul Tugas dan <span class='italic'>export</span> di modul <span class='italic'>Import/Export</span>. Berikut ini penjelasan untuk masing-masing cara <span class='italic'>export</span> tugas.</p>`,
          },
          {
            type: 'text',
            content: `<p><span class='font-bold text-3xl underline'>Modul Tugas</span></p>
            <p>Semua tugas yang ada, dapat di-<span class='italic'>export</span> di modul Tugas. Perhatikan video berikut ini:</p>
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
                  <p>Pada modul Tugas, berikan filter untuk menampilkan tugas yang ingin di-<span class='italic'>export</span>. Tekan tombol <span class='italic'>Export</span>, lalu tekan tombol <span class='italic'>Export Task</span>. Tunggu hingga proses selesai.</p>
                  <div style="margin-top: 10px; margin-bottom: 10px; width: 100%;" class="mx-auto">
                      <img src="/images/tutorial/planner/export-task-1.png" alt="expt-1" style="width: 100%; border-radius: 4px;" />
                  </div>
                </li>
                <li>
                  <p>Saat proses selesai, tekan tombol modul <span class='italic'>Import/Export</span>. Pilih submodul <span class='italic'>Data Export</span>. Tekan ikon unduh. Tunggu hingga proses selesai.</p>
                  <div style="margin-top: 10px; margin-bottom: 10px; width: 100%;" class="mx-auto">
                      <img src="/images/tutorial/planner/export-task-2.png" alt="expt-2" style="width: 100%; border-radius: 4px;" />
                  </div>
                </li>
              </ul>
              `,
          },
          {
            type: 'text',
            content: `<p><span class='font-bold text-3xl underline'>Modul Import/Export</span></p>
            <p>Selain melalui modul Tugas, tugas dapat di-<span class='italic'>export</span> melalui modul <span class='italic'>Import/Export</span>. Perhatikan video berikut ini:</p>
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
                  <p>Pada modul <span class='italic'>Import/Export</span>, pilih submodul <span class='italic'>Data Export</span>, lalu tekan tombol <span class='italic'>New</span>.</p>
                  <div style="margin-top: 10px; margin-bottom: 10px; width: 100%;" class="mx-auto">
                      <img src="/images/tutorial/planner/export-task-3.png" alt="expt-3" style="width: 100%; border-radius: 4px;" />
                  </div>
                </li>
                <li>
                  <p>Muncul jendela <span class='italic'>Data Export</span>. Pada tipe pilih <span class='font-bold'>Task/Tugas</span> , pilih rentang tanggal tugas, dan pilih lokasi cabang. Pada detail, untuk tipe <span class='italic'>export</span> pilih <span class='font-bold'>All Data</span>, pilih alur dan status yang diinginkan, serta aktifkan semua detail data. Tekan tombol <span class='italic'>Submit</span> untuk menyimpan perubahan dan tekan tombol <span class='italic'>Cancel</span> untuk membatalkan. Tunggu hingga proses selesai.</p>
                  <div style="margin-top: 10px; margin-bottom: 10px; width: 60%;" class="mx-auto">
                      <img src="/images/tutorial/planner/export-task-4.png" alt="expt-4" style="width: 100%; border-radius: 4px;" />
                  </div>
                </li>
                <li>
                  <p>Tekan ikon unduh. Tunggu hingga proses selesai.</p>
                  <div style="margin-top: 10px; margin-bottom: 10px; width: 100%;" class="mx-auto">
                      <img src="/images/tutorial/planner/export-task-5.png" alt="expt-5" style="width: 100%; border-radius: 4px;" />
                  </div>
                </li>
              </ul>
              `,
          },
        ],
      },
    ],
  },
];
