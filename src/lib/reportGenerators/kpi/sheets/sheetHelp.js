import * as XLSX from 'xlsx-js-style';

const HELP_DATA = [
  ['Nama Kolom', 'Keterangan / Sumber Data'],
  [
    'No of Trucks DRY/FRZ',
    'Menu Routing ➜ Result ➜ Pilih hasil dispatch ➜ Summary ➜ Vehicles ➜ Vehicle Optimized (Dry/Frozen)',
  ],
  ['No of Trucks', 'Akumulasi "No of Trucks" untuk Dry dan Frozen'],
  [
    'No of TT DRY/FRZ',
    'Menu Routing ➜ Result ➜ Summary ➜ Pilih hasil dispatch ➜ Vehicles ➜ Visit Optimized (Dry/Frozen)',
  ],
  [
    'No of RT DRY/FRZ',
    'ada 2 cara :\na) Menu Task ➜ Export Data ➜ Di file Excel, filter "Status Delivery" = "Pending" (Dry/Frozen) ➜ Hitung jumlahnya\nb) TMS Processing ➜ Report ➜ Delivery Summary ➜ Di file Excel pada sheet SO Pending Results, kolom "Pending" (Dry/Frozen) ➜ Hitung jumlahnya',
  ],
  [
    'RT by Routing/Driver/Sales/Customer/Other',
    'ada 2 cara :\na) Menu Task ➜ Export Data ➜ Di file Excel, filter kolom "Status Delivery" = "Pending" ➜ Di kolom "Alasan", tentukan kategori alasan (Routing/Driver/Sales/Customer/Other) ➜ Hitung jumlahnya\nb) TMS Processing ➜ Report (Laporan) ➜ Delivery Summary ➜ Di file Excel pada sheet SO Pending Results di kolom "Reason", tentukan kategori alasan (Routing/Driver/Sales/Customer/Other) ➜ Hitung jumlahnya',
  ],
  [
    'Est Operating Hours DRY/FRZ',
    'Menu Routing ➜ Result ➜ Pilih hasil dispatch ➜ Summary ➜ Time ➜ Total Spent Time (Dry/Frozen)',
  ],
  [
    'Act Operating hours',
    'ada 2 cara :\na) Menu Task ➜ Tracking ➜ Pilih driver ➜ Hitung perbedaan waktu Start dan Finish\nb) TMS Processing ➜ Report ➜ Time Summary ➜ Start-Finish Summary ➜ Akumulasi nilai di kolom "Duration" (Dry/Frozen)',
  ],
  [
    'Est Distance DRY/FRZ',
    'ada 2 cara :\na) Menu Routing ➜ Result ➜ Pilih hasil dispatch ➜ Summary ➜ Vehicles ➜ Total Distance (Dry/Frozen)\nb) TMS Processing ➜ Report ➜ Routing Summary ➜ Di file Excel pada sheet Truck Detail, akumulasikan kolom "Total Distance" (Dry/Frozen)',
  ],
  [
    'Act Distance DRY/FRZ',
    'ada 2 cara:\na) Menu Task ➜ Tracking ➜ Pilih driver ➜ Travel Distance (Dry/Frozen)\nb) TMS Processing ➜ Report ➜ Time Summary ➜ Di file Excel sheet Travel Recap pada kolom "Travel Distance" (Dry/Frozen)',
  ],
  ['Act Distance', 'Akumulasi "Act Distance" untuk Dry dan Frozen'],
  [
    'Loading Capacity DRY/FRZ (Kg)',
    'Menu Routing ➜ Result ➜ Summary ➜ Pilih hasil dispatch ➜ Capacity ➜ Total weight maksimal (Dry/Frozen)',
  ],
  [
    'Loading Volume DRY/FRZ (Kg)',
    'Menu Routing ➜ Result ➜ Summary ➜ Pilih hasil dispatch ➜ Capacity ➜ Total weight termuat (Dry/Frozen)',
  ],
  [
    'Loading Capacity DRY/FRZ (Cbm)',
    'Menu Routing ➜ Result ➜ Pilih hasil dispatch ➜ Summary ➜ Capacity ➜ Total volume maksimal (Dry/Frozen)',
  ],
  [
    'Loading Volume DRY/FRZ (Cbm)',
    'Menu Routing ➜ Result ➜ Pilih hasil dispatch ➜ Summary ➜ Capacity ➜ Total volume termuat (Dry/Frozen)',
  ],
  [
    'No of Master Maintenance',
    'ada 2 cara:\na) Menu Task ➜ Export Data ➜ Di file Excel, filter kolom "GPS Sesuai" = "Tidak" ➜ Hitung jumlahnya\nb) TMS Processing ➜ Report ➜ Delivery Summary ➜ Di file Excel pada sheet Update Coordinates, hitung jumlahnya',
  ],
  [
    'No of Route Reviewing',
    'Akumulasi nilai di kolom "Overtime" di excel Data KPI sheet Route Review. Untuk memperoleh nilainya ada beberapa tahapan:\na) Ambil estimasi operating hours per driver. Ada 2 cara:\n   i) Menu Routing ➜ Result ➜ Pilih hasil dispatch ➜ Pilih driver ➜ Total Spent Time ➜ Konversi menjadi jam saja\n   ii) TMS Processing ➜ Report ➜ Routing Summary ➜ Di file Excel sheet Truck Detail pada kolom "Ship Duration", konversi menjadi jam saja\nb) Ambil aktual Operating hours per driver ➜ Konversi menjadi jam saja\nc) Hitung perbedaan waktu estimasi dengan aktual\nd) Akumulasikan nilai perbedaannya',
  ],
  ['', ''],
  ['NOTE:', 'Semua keterangan ini bisa berubah seiring waktu.'],
];

export function generateSheetHelp() {
  const wsHelp = XLSX.utils.aoa_to_sheet(HELP_DATA);
  const rangeHelp = XLSX.utils.decode_range(wsHelp['!ref']);
  const styleHeader = {
    font: { bold: true },
    alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
    fill: { fgColor: { rgb: 'EFEFEF' } },
    border: {
      top: { style: 'thin' },
      bottom: { style: 'thin' },
      left: { style: 'thin' },
      right: { style: 'thin' },
    },
  };
  const styleBody = {
    alignment: { vertical: 'top', wrapText: true },
    border: {
      top: { style: 'thin' },
      bottom: { style: 'thin' },
      left: { style: 'thin' },
      right: { style: 'thin' },
    },
  };

  for (let R = rangeHelp.s.r; R <= rangeHelp.e.r; ++R) {
    for (let C = rangeHelp.s.c; C <= rangeHelp.e.c; ++C) {
      const cell = XLSX.utils.encode_cell({ r: R, c: C });
      if (!wsHelp[cell]) wsHelp[cell] = { v: '' };

      if (R === 0) wsHelp[cell].s = styleHeader;
      else if (R === rangeHelp.e.r)
        wsHelp[cell].s =
          C === 0
            ? { font: { bold: true, color: { rgb: 'FF0000' } }, alignment: { vertical: 'top' } }
            : { font: { italic: true }, alignment: { vertical: 'top' } };
      else wsHelp[cell].s = styleBody;
    }
  }

  wsHelp['!cols'] = [{ wch: 40 }, { wch: 100 }];
  return wsHelp;
}
