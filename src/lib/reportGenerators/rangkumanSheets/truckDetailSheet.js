import * as XLSX from 'xlsx-js-style';
import { formatDate, formatMinutesToHHMM } from '@/lib/utils';
import { styles } from './reportStyles';

// Status yang dianggap GAGAL / BELUM SELESAI
// Total Delivered = Total Outlet - (Jumlah status ini)
const FAILED_STATUSES = ['PENDING', 'BATAL', 'TERIMA SEBAGIAN', 'PENDING GR'];

// --- HELPERS ---
function formatMonthName(dateObj) {
  return dateObj.toLocaleDateString('en-GB', { month: 'long' });
}

// Logika Tanggal H+1 untuk Routing (Sama dengan Average KM)
// Routing 31 Okt -> Data Masuk ke Kolom 1 Nov
function getDeliveryDateFromRouting(isoString) {
  if (!isoString) return null;
  try {
    const date = new Date(isoString);
    // UTC -> WIB (+7) -> Offset Hari (+1 atau +2 jika Sabtu)
    const wibTimestamp = date.getTime() + (7 * 60 * 60 * 1000);
    const dateWIB = new Date(wibTimestamp);
    const routingDay = dateWIB.getUTCDay();
    let offsetDays = 1; 
    if (routingDay === 6) offsetDays = 2;
    const deliveryTimestamp = wibTimestamp + (offsetDays * 24 * 60 * 60 * 1000);
    return new Date(deliveryTimestamp).toISOString().split('T')[0];
  } catch (e) {
    return null;
  }
}

// Ambil Tanggal dari Task (YYYY-MM-DD)
function getDateFromTask(isoString) {
    if (!isoString) return null;
    return isoString.substring(0, 10);
}

// Helper Tentukan Storage Type (Dry/Frozen) dari Driver
function getDriverStorageType(driver) {
    const typeStr = driver.type || '';
    const nameStr = driver.name || '';

    if (typeStr.toUpperCase().includes('FROZEN')) return 'Frozen';
    if (typeStr.toUpperCase().includes('DRY')) return 'Dry';
    
    // Fallback cek nama
    if (nameStr.toUpperCase().includes("'FRZ'") || nameStr.toUpperCase().includes('FROZEN')) return 'Frozen';
    if (nameStr.toUpperCase().includes("'DRY'") || nameStr.toUpperCase().includes('DRY')) return 'Dry';

    return '-';
}

/**
 * BAGIAN 1: LOGIKA PERHITUNGAN (DATA MATRIX)
 */
export function calculateTruckDetailData(driverData, resultsData, allTasks, startDateStr, endDateStr) {
    // 1. Init Driver Map (Master) - Semua Driver
    const driverMap = new Map();
    const driverEmails = []; 

    if (driverData && Array.isArray(driverData)) {
        driverData.forEach(d => {
            const email = d.email ? d.email.toLowerCase().trim() : null;
            if (email) {
                // Hindari duplikat jika ada email sama di master
                if (!driverMap.has(email)) {
                    driverMap.set(email, {
                        name: d.name,
                        plat: d.plat || '-',
                        type: getDriverStorageType(d)
                    });
                    driverEmails.push(email);
                }
            }
        });
    }

    // 2. Init Date Range
    const dateKeys = [];
    const currentIterDate = new Date(startDateStr);
    const endDateObj = new Date(endDateStr);

    while (currentIterDate <= endDateObj) {
        const dateStr = formatDate(currentIterDate);
        const dayNum = currentIterDate.getDate();
        const monthName = currentIterDate.toLocaleDateString('en-GB', { month: 'long' });
        const yearShort = currentIterDate.toLocaleDateString('en-GB', { year: '2-digit' });
        
        dateKeys.push({
            str: dateStr,
            display: `${dayNum}-${monthName} ${yearShort}` // Format Header: 01-November 25
        });
        currentIterDate.setDate(currentIterDate.getDate() + 1);
    }

    // 3. Data Container Matrix
    // Struktur: { "YYYY-MM-DD": { "email": { metrics... } } }
    const dataMatrix = {};
    dateKeys.forEach(d => {
        dataMatrix[d.str] = {};
    });

    // 4. Proses Routing Data (Results) -> Weight, Volume, Distance, Duration
    if (resultsData && Array.isArray(resultsData)) {
        resultsData.forEach(dispatch => {
            const isDone = dispatch.dispatchStatus && dispatch.dispatchStatus.toLowerCase() === 'done';
            // Filter dispatchStatus DONE & ada result routing
            if (isDone && dispatch.result && Array.isArray(dispatch.result.routing)) {
                
                // GUNAKAN LOGIKA H+1 (Routing Date -> Delivery Date)
                const dateKey = getDeliveryDateFromRouting(dispatch.createdTime);
                
                // Hanya proses jika tanggal masuk range laporan
                if (dateKey && dataMatrix[dateKey]) {
                    dispatch.result.routing.forEach(route => {
                        const email = route.assignee ? route.assignee.toLowerCase().trim() : null;
                        
                        // Hanya proses jika driver ada di Master (sesuai request user)
                        if (!email || !driverMap.has(email)) return;

                        if (!dataMatrix[dateKey][email]) {
                            dataMatrix[dateKey][email] = { 
                                weight: 0, maxWeight: 0, 
                                volume: 0, maxVolume: 0, 
                                dist: 0, duration: 0, 
                                outlets: 0, delivered: 0 
                            };
                        }
                        const entry = dataMatrix[dateKey][email];
                        
                        // Akumulasi (handle multi-trip)
                        entry.weight += route.totalWeight || 0;
                        entry.maxWeight += route.vehicleMaxWeight || 0;
                        entry.volume += route.totalVolume || 0;
                        entry.maxVolume += route.vehicleMaxVolume || 0;
                        entry.dist += route.totalDistance || 0;
                        entry.duration += route.totalSpentTime || 0; // Menit
                    });
                }
            }
        });
    }

    // 5. Proses Task Data (All Tasks) -> Total Outlet & Delivered
    if (allTasks && Array.isArray(allTasks)) {
        allTasks.forEach(task => {
            // Ambil Tanggal dari doneTime
            const dateKey = getDateFromTask(task.doneTime);
            
            const assigneeArr = task.assignee || [];
            const email = assigneeArr.length > 0 ? assigneeArr[0].toLowerCase().trim() : null;

            if (dateKey && email && dataMatrix[dateKey]) {
                 // Jika driver tidak ada di Master, skip
                 if (!driverMap.has(email)) return;

                 if (!dataMatrix[dateKey][email]) {
                    dataMatrix[dateKey][email] = { 
                        weight: 0, maxWeight: 0, 
                        volume: 0, maxVolume: 0, 
                        dist: 0, duration: 0, 
                        outlets: 0, delivered: 0 
                    };
                }
                const entry = dataMatrix[dateKey][email];
                
                // Hitung Outlet
                entry.outlets += 1;

                // Hitung Delivered (Status BUKAN failed)
                const status = task.label && task.label.length > 0 ? task.label[0].toUpperCase() : '';
                
                // Logika: Total Delivered = Total - Failed
                if (!FAILED_STATUSES.includes(status)) {
                    entry.delivered += 1;
                }
            }
        });
    }

    return { driverMap, driverEmails, dateKeys, dataMatrix };
}

/**
 * BAGIAN 2: GENERATOR EXCEL
 */
export function generateTruckDetailSheet(wb, driverData, resultsData, allTasks, startDateStr, endDateStr) {
    const { driverMap, driverEmails, dateKeys, dataMatrix } = calculateTruckDetailData(driverData, resultsData, allTasks, startDateStr, endDateStr);

    // --- STYLES ---
    const headerColor = { rgb: "FCE4D6" }; // Peach (Driver Header)
    const dateHeaderColor = { rgb: "DDEBF7" }; // Blue (Date Header)
    const metricHeaderColor = { rgb: "F8CBAD" }; // Darker Peach (Metric Header)
    
    const thinBorder = { style: 'thin', color: { auto: 1 } };
    const mediumBorder = { style: 'medium', color: { auto: 1 } };

    const centerStyle = {
        alignment: { horizontal: 'center', vertical: 'center' },
        border: { top: thinBorder, bottom: thinBorder, left: thinBorder, right: thinBorder }
    };
    
    // Style Header
    const headerStyle = { ...centerStyle, font: { bold: true } };
    
    // --- BUILD DATA ---
    const row1 = ["Type of Truck", "Licence No.", "Driver"];
    const row2 = ["", "", ""];

    dateKeys.forEach(d => {
        row1.push(d.display, "", "", "", "", "", ""); // 7 Kolom per tanggal
        row2.push("Weight", "Volume", "Distance (m)", "Total Outlets", "Total Delivered", "Ship Duration", "Delivered");
    });

    const excelData = [row1, row2];

    // Row Data
    driverEmails.forEach(email => {
        const driver = driverMap.get(email);
        const row = [driver.type, driver.plat, driver.name];

        dateKeys.forEach(d => {
            const metrics = dataMatrix[d.str][email];
            
            // Tampilkan data HANYA jika ada aktivitas (Routing/Task)
            if (metrics && (metrics.outlets > 0 || metrics.dist > 0 || metrics.weight > 0)) {
                const weightPct = metrics.maxWeight > 0 ? (metrics.weight / metrics.maxWeight) : 0;
                const volPct = metrics.maxVolume > 0 ? (metrics.volume / metrics.maxVolume) : 0;
                // Delivered % = Delivered / Outlets
                const delPct = metrics.outlets > 0 ? (metrics.delivered / metrics.outlets) : 0;

                row.push(
                    weightPct,      // Weight %
                    volPct,         // Vol %
                    metrics.dist,   // Distance
                    metrics.outlets,
                    metrics.delivered,
                    formatMinutesToHHMM(metrics.duration), // Duration String
                    delPct          // Delivered %
                );
            } else {
                // Kosong jika tidak ada data
                row.push(null, null, null, null, null, null, null);
            }
        });
        excelData.push(row);
    });

    const ws = XLSX.utils.aoa_to_sheet(excelData);

    // --- MERGES ---
    const merges = [];
    // Merge Kolom Driver (Vertikal Row 0-1)
    merges.push({ s: { r: 0, c: 0 }, e: { r: 1, c: 0 } });
    merges.push({ s: { r: 0, c: 1 }, e: { r: 1, c: 1 } });
    merges.push({ s: { r: 0, c: 2 }, e: { r: 1, c: 2 } });

    // Merge Header Tanggal (Horizontal 7 kolom)
    let colIdx = 3;
    dateKeys.forEach(() => {
        merges.push({ s: { r: 0, c: colIdx }, e: { r: 0, c: colIdx + 6 } }); 
        colIdx += 7;
    });
    ws['!merges'] = merges;

    // --- STYLING ---
    const range = XLSX.utils.decode_range(ws['!ref']);
    for (let R = range.s.r; R <= range.e.r; ++R) {
        for (let C = range.s.c; C <= range.e.c; ++C) {
            const cellRef = XLSX.utils.encode_cell({ r: R, c: C });
            if (!ws[cellRef]) ws[cellRef] = { t: 's', v: '' };
            const cell = ws[cellRef];

            // Header 1 (Tanggal & Judul Driver)
            if (R === 0) {
                cell.s = { ...headerStyle };
                if (C <= 2) {
                    cell.s.fill = { patternType: 'solid', fgColor: headerColor }; // Peach
                } else {
                    cell.s.fill = { patternType: 'solid', fgColor: dateHeaderColor }; // Blue
                }
                
                // Border Kanan Tebal Pemisah Tanggal (Index 9, 16, 23...)
                // Rumus: (C - 3) % 7 === 6
                if (C > 2 && (C - 3) % 7 === 6) cell.s.border.right = mediumBorder;
            } 
            // Header 2 (Metric Names)
            else if (R === 1) {
                if (C > 2) {
                    cell.s = { ...headerStyle, fill: { patternType: 'solid', fgColor: metricHeaderColor } };
                } else {
                    cell.s = { ...headerStyle, fill: { patternType: 'solid', fgColor: headerColor } };
                }
                
                if (C > 2 && (C - 3) % 7 === 6) cell.s.border.right = mediumBorder;
            }
            // Data Rows
            else {
                cell.s = { ...centerStyle };
                
                if (C > 2) {
                    const relativeIdx = (C - 3) % 7;
                    // Format Persen (Weight, Volume, Delivered %)
                    if ([0, 1, 6].includes(relativeIdx)) {
                        cell.t = 'n';
                        cell.s = { ...cell.s, numFmt: "0%" };
                    }
                    // Format Angka (Dist, Outlets, Delivered)
                    else if ([2, 3, 4].includes(relativeIdx)) {
                         cell.t = 'n';
                         cell.s = { ...cell.s, numFmt: "#,##0" };
                    }
                    
                    // Border Kanan Tebal per Tanggal
                    if (relativeIdx === 6) {
                         cell.s.border.right = mediumBorder;
                    }
                } else {
                     // Driver Info Left Align
                     cell.s.alignment = { horizontal: 'left', vertical: 'center', indent: 1 };
                }
            }
        }
    }

    // Col Widths
    const cols = [{wch: 12}, {wch: 15}, {wch: 30}]; // Fixed cols
    for (let i=0; i<dateKeys.length * 7; i++) cols.push({wch: 12});
    ws['!cols'] = cols;

    XLSX.utils.book_append_sheet(wb, ws, "Truck Detail");
}