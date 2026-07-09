import * as XLSX from 'xlsx-js-style';

export function generateSheetHelp() {
  const helpHeaders = ['Nama Kolom', 'Keterangan / Sumber Data'];
  const headerStyle = {
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

  const arrow = ' ➜ ';

  const helpRows = [
    helpHeaders,
    [
      'No of Trucks DRY/FRZ',
      `Menu Routing${arrow}Result${arrow}Pilih hasil dispatch${arrow}Summary${arrow}Vehicles${arrow}Vehicle Optimized (Dry/Frozen)`,
    ],
    ['No of Trucks', 'Akumulasi "No of Trucks" untuk Dry dan Frozen'],
    [
      'No of TT DRY/FRZ',
      `Menu Routing${arrow}Result${arrow}Summary${arrow}Pilih hasil dispatch${arrow}Vehicles${arrow}Visit Optimized (Dry/Frozen)`,
    ],
    [
      'No of RT DRY/FRZ',
      `ada 2 cara :\na) Menu Task${arrow}Export Data${arrow}Di file Excel, filter "Status Delivery" = "Pending" (Dry/Frozen)${arrow}Hitung jumlahnya\nb) TMS Processing${arrow}Report${arrow}Delivery Summary${arrow}Di file Excel pada sheet SO Pending Results, kolom "Pending" (Dry/Frozen)${arrow}Hitung jumlahnya`,
    ],
    [
      'RT by Routing/Driver/Sales/Customer/Other',
      `ada 2 cara :\na) Menu Task${arrow}Export Data${arrow}Di file Excel, filter kolom "Status Delivery" = "Pending"${arrow}Di kolom "Alasan", tentukan kategori alasan (Routing/Driver/Sales/Customer/Other)${arrow}Hitung jumlahnya\nb) TMS Processing${arrow}Report (Laporan)${arrow}Delivery Summary${arrow}Di file Excel pada sheet SO Pending Results di kolom "Reason", tentukan kategori alasan (Routing/Driver/Sales/Customer/Other)${arrow}Hitung jumlahnya`,
    ],
    [
      'Est Operating Hours DRY/FRZ',
      `Menu Routing${arrow}Result${arrow}Pilih hasil dispatch${arrow}Summary${arrow}Time${arrow}Total Spent Time (Dry/Frozen)`,
    ],
    [
      'Act Operating hours',
      `ada 2 cara :\na) Menu Task${arrow}Tracking${arrow}Pilih driver${arrow}Hitung perbedaan waktu Start dan Finish\nb) TMS Processing${arrow}Report${arrow}Time Summary${arrow}Start-Finish Summary${arrow}Akumulasi nilai di kolom "Duration" (Dry/Frozen)`,
    ],
    [
      'Est Distance DRY/FRZ',
      `ada 2 cara :\na) Menu Routing${arrow}Result${arrow}Pilih hasil dispatch${arrow}Summary${arrow}Vehicles${arrow}Total Distance (Dry/Frozen)\nb) TMS Processing${arrow}Report${arrow}Routing Summary${arrow}Di file Excel pada sheet Truck Detail, akumulasikan kolom "Total Distance" (Dry/Frozen)`,
    ],
    [
      'Act Distance DRY/FRZ',
      `ada 2 cara:\na) Menu Task${arrow}Tracking${arrow}Pilih driver${arrow}Travel Distance (Dry/Frozen)\nb) TMS Processing${arrow}Report${arrow}Time Summary${arrow}Di file Excel sheet Travel Recap pada kolom "Travel Distance" (Dry/Frozen)`,
    ],
    ['Act Distance', 'Akumulasi "Act Distance" untuk Dry dan Frozen'],
    [
      'Loading Capacity DRY/FRZ (Kg)',
      `Menu Routing${arrow}Result${arrow}Summary${arrow}Pilih hasil dispatch${arrow}Capacity${arrow}Total weight maksimal (Dry/Frozen)`,
    ],
    [
      'Loading Volume DRY/FRZ (Kg)',
      `Menu Routing${arrow}Result${arrow}Summary${arrow}Pilih hasil dispatch${arrow}Capacity${arrow}Total weight termuat (Dry/Frozen)`,
    ],
    [
      'Loading Capacity DRY/FRZ (Cbm)',
      `Menu Routing${arrow}Result${arrow}Pilih hasil dispatch${arrow}Summary${arrow}Capacity${arrow}Total volume maksimal (Dry/Frozen)`,
    ],
    [
      'Loading Volume DRY/FRZ (Cbm)',
      `Menu Routing${arrow}Result${arrow}Pilih hasil dispatch${arrow}Summary${arrow}Capacity${arrow}Total volume termuat (Dry/Frozen)`,
    ],
    [
      'No of Master Maintenance',
      `ada 2 cara:\na) Menu Task${arrow}Export Data${arrow}Di file Excel, filter kolom "GPS Sesuai" = "Tidak"${arrow}Hitung jumlahnya\nb) TMS Processing${arrow}Report${arrow}Delivery Summary${arrow}Di file Excel pada sheet Update Coordinates, hitung jumlahnya`,
    ],
    [
      'No of Route Reviewing',
      `Akumulasi nilai di kolom "Overtime" di excel Data KPI sheet Route Review. Untuk memperoleh nilainya ada beberapa tahapan:\na) Ambil estimasi operating hours per driver. Ada 2 cara:\n   i) Menu Routing${arrow}Result${arrow}Pilih hasil dispatch${arrow}Pilih driver${arrow}Total Spent Time${arrow}Konversi menjadi jam saja\n   ii) TMS Processing${arrow}Report${arrow}Routing Summary${arrow}Di file Excel sheet Truck Detail pada kolom "Ship Duration", konversi menjadi jam saja\nb) Ambil aktual Operating hours per driver${arrow}Konversi menjadi jam saja\nc) Hitung perbedaan waktu estimasi dengan aktual\nd) Akumulasikan nilai perbedaannya`,
    ],
    ['', ''],
    ['NOTE:', 'Semua keterangan ini bisa berubah seiring waktu.'],
  ];

  const wsHelp = XLSX.utils.aoa_to_sheet(helpRows);

  const rangeHelp = XLSX.utils.decode_range(wsHelp['!ref']);

  for (let R = rangeHelp.s.r; R <= rangeHelp.e.r; ++R) {
    for (let C = rangeHelp.s.c; C <= rangeHelp.e.c; ++C) {
      const cellAddress = XLSX.utils.encode_cell({ r: R, c: C });
      if (!wsHelp[cellAddress]) wsHelp[cellAddress] = { v: '' };

      if (R === 0) {
        wsHelp[cellAddress].s = headerStyle;
      } else if (R === rangeHelp.e.r) {
        if (C === 0)
          wsHelp[cellAddress].s = {
            font: { bold: true, color: { rgb: 'FF0000' } },
            alignment: { vertical: 'top' },
          };
        else wsHelp[cellAddress].s = { font: { italic: true }, alignment: { vertical: 'top' } };
      } else {
        wsHelp[cellAddress].s = {
          alignment: { vertical: 'top', wrapText: true },
          border: {
            top: { style: 'thin' },
            bottom: { style: 'thin' },
            left: { style: 'thin' },
            right: { style: 'thin' },
          },
        };
      }
    }
  }

  wsHelp['!cols'] = [{ wch: 40 }, { wch: 100 }];

  return wsHelp;
}
