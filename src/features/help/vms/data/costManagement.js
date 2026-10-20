export const costManagementTopic = [
  {
    id: 'cost-management',
    category: 'planner',
    title: 'Manajemen Biaya',
    blocks: [
      {
        type: 'text',
        content: `<p>Menu <strong>Manajemen Biaya</strong> adalah menu untuk mencatat pengeluaran biaya operasional kendaraan, mulai dari jenis pengeluaran, jumlah pengeluaran, hingga foto bukti pembayaran. </p>
        <p>Berikut cara pembuatannya:</p>
        <ul class="list-decimal pl-5 space-y-2 mt-2">
          <li>
            <p>Buka menu <strong>Cost Management</strong>, lalu tekan tombol <strong>Tambah</strong> (<em>Create</em>) dan pilih <strong>Biaya Kendaraan</strong> (<em>Vehicle Cost</em>).</p>
            <div style="margin-top: 10px; margin-bottom: 10px;" class="mx-auto">
                <img src="/images/tutorial/planner/vms/cost-1.png" alt="Tambah Data Biaya" style="width: 100%; border-radius: 4px;" />
            </div>
          </li>
          <li>
            <p>Masukan tanggal transaksi, nomor polisi kendaraan, dan sumber dana (Isikan "Kasir" sebagai nilai <em>default</em>). Lalu tekan tombol <strong>Simpan</strong> (<em>Save</em>).</p>
            <div style="margin-top: 10px; margin-bottom: 10px;" class="mx-auto">
                <img src="/images/tutorial/planner/vms/cost-2.png" alt="Informasi Biaya" style="width: 100%; border-radius: 4px;" />
            </div>
          </li>
          <li>
            <p>Pada tabel rincian biaya, tekan tombol <strong>Tambah</strong> (<em>Add</em>), lalu isikan kategori, nominal, dan lampiran bukti pembayaran jika ada. Jika semua biaya untuk tanggal dan kendaraan terpilih sudah dimasukan, maka tekan tombol <strong>Ubah Status</strong> (<em>Change Status</em>) untuk menyimpan data.</p>
            <div style="margin-top: 10px; margin-bottom: 10px; width: 100%;" class="mx-auto">
                <img src="/images/tutorial/planner/vms/cost-3.png" alt="Detail Biaya" style="width: 100%; border-radius: 4px;" />
            </div>
          </li>
          <li>
            <p>Data yang sudah tersimpan <strong>tidak dapat diubah ataupun dihapus</strong>.</p>
          </li>
        </ul>`,
      },
    ],
  },
];
