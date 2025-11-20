// File: src/features/reportData/RangkumanSummary.js
'use client';

import { getLocationHistories, getResultsSummary, getTasks } from '@/lib/apiService';
import { getOrFetchDriverData } from '@/lib/driverDataHelper';
import {
  generateRangkumanDataPreview,
  generateRangkumanWorkbook,
} from '@/lib/reportGenerators/rangkumanReport';
import { toastError, toastSuccess } from '@/lib/toastHelper';
import { formatDate } from '@/lib/utils';
import { Fragment, useCallback, useEffect, useState } from 'react';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import * as XLSX from 'xlsx-js-style';

export default function RangkumanSummary() {
  const [selectedLocation, setSelectedLocation] = useState('');
  const [selectedLocationName, setSelectedLocationName] = useState('');
  const [driverData, setDriverData] = useState([]);
  const [selectedMonth, setSelectedMonth] = useState(new Date());
  const [isLoading, setIsLoading] = useState(false);

  const [rawData, setRawData] = useState({ tasks: [], results: [], locations: [] });
  const [reportPreview, setReportPreview] = useState(null);
  const [activeTab, setActiveTab] = useState('Task Summary');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const storedLocation = localStorage.getItem('userLocation');
      const storedLocationName = localStorage.getItem('userLocationName');
      if (storedLocation) setSelectedLocation(storedLocation);
      if (storedLocationName) setSelectedLocationName(storedLocationName);
    }
  }, []);

  useEffect(() => {
    const fetchDrivers = async () => {
      if (selectedLocation) {
        try {
          const drivers = await getOrFetchDriverData(selectedLocation);
          setDriverData(drivers || []);
        } catch (error) {
          console.error('Gagal memuat driver data:', error);
        }
      }
    };
    fetchDrivers();
  }, [selectedLocation]);

  const fetchData = useCallback(async () => {
    if (!selectedLocation || !selectedMonth) return;

    setIsLoading(true);
    try {
      const year = selectedMonth.getFullYear();
      const month = selectedMonth.getMonth();
      const startDate = new Date(year, month, 1);
      const endDate = new Date(year, month + 1, 0);

      const startStr = formatDate(startDate);
      const endStr = formatDate(endDate);
      const timeFrom = `${startStr} 00:00:00`;
      const timeTo = `${endStr} 23:59:59`;

      const routingStartDate = new Date(startDate);
      routingStartDate.setDate(routingStartDate.getDate() - 1);
      const routingEndDate = new Date(endDate);
      routingEndDate.setDate(routingEndDate.getDate() - 1);

      const routingStartStr = formatDate(routingStartDate);
      const routingEndStr = formatDate(routingEndDate);
      const routingTimeFrom = `${routingStartStr} 00:00:00`;
      const routingTimeTo = `${routingEndStr} 23:59:59`;

      const [tasksRes, resultsRes, locRes] = await Promise.all([
        getTasks({
          hubId: selectedLocation,
          status: 'DONE',
          timeFrom: timeFrom,
          timeTo: timeTo,
          timeBy: 'doneTime',
          limit: 3000,
        }),
        getResultsSummary({
          hubId: selectedLocation,
          dateFrom: routingTimeFrom,
          dateTo: routingTimeTo,
          limit: 2000,
        }),
        getLocationHistories({
          timeFrom: timeFrom,
          timeTo: timeTo,
          limit: 3000,
          startFinish: 'true',
          fields: 'finish,startTime,email,trackedTime,totalDistance',
          timeBy: 'createdTime',
        }),
      ]);

      const newRawData = {
        tasks: tasksRes || [],
        results: resultsRes || [],
        locations: locRes || [],
      };
      setRawData(newRawData);

      const preview = generateRangkumanDataPreview(
        driverData,
        newRawData.tasks,
        newRawData.results,
        newRawData.locations,
        startStr,
        endStr,
        selectedLocation
      );
      setReportPreview(preview);
    } catch (err) {
      console.error(err);
      toastError('Gagal mengambil data: ' + err.message);
      setRawData({ tasks: [], results: [], locations: [] });
      setReportPreview(null);
    } finally {
      setIsLoading(false);
    }
  }, [selectedLocation, selectedMonth, driverData]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleDownloadExcel = () => {
    if (!selectedMonth) return;
    if (driverData.length === 0) {
      toastError('Data Driver belum siap. Coba refresh halaman.');
      return;
    }

    const year = selectedMonth.getFullYear();
    const month = selectedMonth.getMonth();
    const startDate = new Date(year, month, 1);
    const endDate = new Date(year, month + 1, 0);

    try {
      const { wb, excelFileName } = generateRangkumanWorkbook(
        driverData,
        rawData.tasks,
        rawData.results,
        rawData.locations,
        formatDate(startDate),
        formatDate(endDate),
        selectedLocationName,
        selectedLocation
      );
      XLSX.writeFile(wb, excelFileName);
      toastSuccess('Rangkuman berhasil di-download!');
    } catch (err) {
      console.error(err);
      toastError('Gagal membuat Excel: ' + err.message);
    }
  };

  const tabs = [
    { id: 'Task Summary', label: 'Task Summary' },
    { id: 'Pending Reasons', label: 'Pending Reasons' },
    { id: 'Time Driver', label: 'Time Driver' },
    { id: 'Truck Detail', label: 'Truck Detail' },
    { id: 'Truck Usage', label: 'Truck Usage' },
    { id: 'Average KM', label: 'Average KM of Routing' },
  ];

  const renderContent = () => {
    if (isLoading) {
      return (
        <div className="h-full flex flex-col items-center justify-center text-gray-400 py-12">
          <div className="w-10 h-10 border-4 border-sky-200 border-t-sky-600 rounded-full animate-spin mb-4"></div>
          <p>Sedang mengambil data bulan ini...</p>
        </div>
      );
    }

    if (!reportPreview) {
      return (
        <div className="h-full flex flex-col items-center justify-center text-gray-400 py-12">
          <p>Tidak ada data / Belum dimuat.</p>
        </div>
      );
    }

    // --- RENDER TRUCK USAGE ---
    if (activeTab === 'Truck Usage') {
      const { dateMap, dateKeys, vehicleTypes } = reportPreview.truckUsageData || {};

      if (!dateMap) return <div className="p-6 text-center text-gray-400">Tidak ada data.</div>;

      // Colors
      const colorHeader = '#d9d2e9';
      const colorDry = '#fae2d5';
      const colorDryTotal = '#f9cb9c';
      const colorFrozen = '#dbe9f7';
      const colorFrozenTotal = '#c9daf8';
      const colorOTV = '#d9f2d0';
      const colorSunday = '#ffc7ce';

      // Styles Header (Tetap pakai border lengkap untuk header agar rapi)
      const thClass =
        'border border-gray-400 px-2 py-2 text-center min-w-[60px] text-xs font-bold text-slate-700';

      // Styles Data Body:
      // 1. border-b border-gray-200: Garis tipis antar baris.
      // 2. border-r-0: Hapus garis vertikal default (agar bersih).
      const tdClass =
        'border-b border-gray-200 border-r-0 px-2 py-1 text-center text-xs text-slate-700';

      // Class Border Tebal Kanan (Pemisah Tanggal)
      const thickBorderClass = 'border-r-[3px] border-r-slate-400';

      const getBgStyle = (baseColor, isSunday) => ({
        backgroundColor: isSunday ? colorSunday : baseColor,
      });

      // Helper khusus untuk cell data agar border tebal tetap muncul
      const getCellClass = (isLastCol) => {
        return isLastCol
          ? `${tdClass} ${thickBorderClass}` // Pakai border tebal di kanan
          : tdClass; // Tanpa border vertikal
      };

      return (
        <div className="w-full overflow-auto max-h-[650px]">
          <table className="border-collapse border border-gray-300 text-sm whitespace-nowrap">
            {/* HEADER */}
            <thead className="sticky top-0 z-30" style={{ backgroundColor: colorHeader }}>
              <tr>
                <th
                  rowSpan="2"
                  className={`${thClass} w-[100px] sticky left-0 z-40`}
                  style={{ backgroundColor: colorHeader }}
                >
                  Vehicle Storage
                </th>
                <th
                  rowSpan="2"
                  className={`${thClass} w-[150px] sticky left-[100px] z-40`}
                  style={{ backgroundColor: colorHeader }}
                >
                  Vehicle Types
                </th>
                {dateKeys.map((d, i) => (
                  <th
                    key={i}
                    colSpan="3"
                    className={`${thClass} ${thickBorderClass}`}
                    style={getBgStyle(colorHeader, d.isSunday)}
                  >
                    {d.day}
                  </th>
                ))}
              </tr>
              <tr>
                {dateKeys.map((d, i) => (
                  <Fragment key={i}>
                    <th className={thClass} style={getBgStyle(colorHeader, d.isSunday)}>
                      TMS
                    </th>
                    <th className={thClass} style={getBgStyle(colorHeader, d.isSunday)}>
                      Non TMS
                    </th>
                    <th
                      className={`${thClass} ${thickBorderClass}`}
                      style={getBgStyle(colorHeader, d.isSunday)}
                    >
                      TVU
                    </th>
                  </Fragment>
                ))}
              </tr>
            </thead>

            <tbody>
              {/* 1. DRY SECTION */}
              {vehicleTypes.map((type, idx) => (
                <tr key={`dry-${type}`}>
                  {idx === 0 ? (
                    <td
                      rowSpan={vehicleTypes.length}
                      className={`${tdClass} font-bold align-middle sticky left-0 z-20 border-r border-gray-300`}
                      style={{ backgroundColor: colorDry }}
                    >
                      Dry
                    </td>
                  ) : null}
                  <td
                    className={`${tdClass} text-left sticky left-[100px] z-20 border-r border-gray-300`}
                    style={{ backgroundColor: colorDry }}
                  >
                    {type}
                  </td>

                  {dateKeys.map((d, i) => (
                    <Fragment key={i}>
                      <td className={getCellClass(false)} style={getBgStyle(colorDry, d.isSunday)}>
                        {dateMap[d.str].Dry[type] || ''}
                      </td>
                      <td
                        className={getCellClass(false)}
                        style={getBgStyle(colorDry, d.isSunday)}
                      ></td>
                      <td
                        className={getCellClass(true)}
                        style={getBgStyle(colorDry, d.isSunday)}
                      ></td>
                    </Fragment>
                  ))}
                </tr>
              ))}

              {/* Interbranch Dry (MERGED & LEFT ALIGNED) */}
              <tr>
                {/* colSpan 2 menggabungkan kolom Storage & Type */}
                <td
                  colSpan="2"
                  className={`${tdClass} text-left font-bold sticky left-0 z-20 border-r border-gray-300 pl-4`}
                  style={{ backgroundColor: colorDry }}
                >
                  Interbranch
                </td>
                {dateKeys.map((d, i) => (
                  <Fragment key={i}>
                    <td
                      className={getCellClass(false)}
                      style={getBgStyle(colorDry, d.isSunday)}
                    ></td>
                    <td
                      className={getCellClass(false)}
                      style={getBgStyle(colorDry, d.isSunday)}
                    ></td>
                    <td
                      className={getCellClass(true)}
                      style={getBgStyle(colorDry, d.isSunday)}
                    ></td>
                  </Fragment>
                ))}
              </tr>

              {/* Total Dry */}
              <tr className="font-bold">
                {/* Kita biarkan cell pertama kosong untuk alignment, atau merge juga jika mau */}
                <td
                  className={`${tdClass} sticky left-0 z-20 border-r border-gray-300`}
                  style={{ backgroundColor: colorDryTotal }}
                ></td>
                <td
                  className={`${tdClass} text-left sticky left-[100px] z-20 border-r border-gray-300`}
                  style={{ backgroundColor: colorDryTotal }}
                >
                  Total Used
                </td>
                {dateKeys.map((d, i) => (
                  <Fragment key={i}>
                    <td
                      className={getCellClass(false)}
                      style={getBgStyle(colorDryTotal, d.isSunday)}
                    >
                      {dateMap[d.str].DryTotal || ''}
                    </td>
                    <td
                      className={getCellClass(false)}
                      style={getBgStyle(colorDryTotal, d.isSunday)}
                    ></td>
                    <td
                      className={getCellClass(true)}
                      style={getBgStyle(colorDryTotal, d.isSunday)}
                    ></td>
                  </Fragment>
                ))}
              </tr>

              {/* 2. FROZEN SECTION */}
              {vehicleTypes.map((type, idx) => (
                <tr key={`frz-${type}`}>
                  {idx === 0 ? (
                    <td
                      rowSpan={vehicleTypes.length}
                      className={`${tdClass} font-bold align-middle sticky left-0 z-20 border-r border-gray-300`}
                      style={{ backgroundColor: colorFrozen }}
                    >
                      Frozen
                    </td>
                  ) : null}
                  <td
                    className={`${tdClass} text-left sticky left-[100px] z-20 border-r border-gray-300`}
                    style={{ backgroundColor: colorFrozen }}
                  >
                    {type}
                  </td>
                  {dateKeys.map((d, i) => (
                    <Fragment key={i}>
                      <td
                        className={getCellClass(false)}
                        style={getBgStyle(colorFrozen, d.isSunday)}
                      >
                        {dateMap[d.str].Frozen[type] || ''}
                      </td>
                      <td
                        className={getCellClass(false)}
                        style={getBgStyle(colorFrozen, d.isSunday)}
                      ></td>
                      <td
                        className={getCellClass(true)}
                        style={getBgStyle(colorFrozen, d.isSunday)}
                      ></td>
                    </Fragment>
                  ))}
                </tr>
              ))}

              {/* Interbranch Frozen (MERGED & LEFT ALIGNED) */}
              <tr>
                <td
                  colSpan="2"
                  className={`${tdClass} text-left font-bold sticky left-0 z-20 border-r border-gray-300 pl-4`}
                  style={{ backgroundColor: colorFrozen }}
                >
                  Interbranch
                </td>
                {dateKeys.map((d, i) => (
                  <Fragment key={i}>
                    <td
                      className={getCellClass(false)}
                      style={getBgStyle(colorFrozen, d.isSunday)}
                    ></td>
                    <td
                      className={getCellClass(false)}
                      style={getBgStyle(colorFrozen, d.isSunday)}
                    ></td>
                    <td
                      className={getCellClass(true)}
                      style={getBgStyle(colorFrozen, d.isSunday)}
                    ></td>
                  </Fragment>
                ))}
              </tr>

              {/* Total Frozen */}
              <tr className="font-bold">
                <td
                  className={`${tdClass} sticky left-0 z-20 border-r border-gray-300`}
                  style={{ backgroundColor: colorFrozenTotal }}
                ></td>
                <td
                  className={`${tdClass} text-left sticky left-[100px] z-20 border-r border-gray-300`}
                  style={{ backgroundColor: colorFrozenTotal }}
                >
                  Total Used
                </td>
                {dateKeys.map((d, i) => (
                  <Fragment key={i}>
                    <td
                      className={getCellClass(false)}
                      style={getBgStyle(colorFrozenTotal, d.isSunday)}
                    >
                      {dateMap[d.str].FrozenTotal || ''}
                    </td>
                    <td
                      className={getCellClass(false)}
                      style={getBgStyle(colorFrozenTotal, d.isSunday)}
                    ></td>
                    <td
                      className={getCellClass(true)}
                      style={getBgStyle(colorFrozenTotal, d.isSunday)}
                    ></td>
                  </Fragment>
                ))}
              </tr>

              {/* 3. OTV */}
              <tr className="font-bold">
                <td
                  className={`${tdClass} sticky left-0 z-20 border-r border-gray-300`}
                  style={{ backgroundColor: colorOTV }}
                ></td>
                <td
                  className={`${tdClass} text-left sticky left-[100px] z-20 border-r border-gray-300`}
                  style={{ backgroundColor: colorOTV }}
                >
                  OTV
                </td>
                {dateKeys.map((d, i) => (
                  <Fragment key={i}>
                    <td className={getCellClass(false)} style={getBgStyle(colorOTV, d.isSunday)}>
                      {dateMap[d.str].OTV || ''}
                    </td>
                    <td
                      className={getCellClass(false)}
                      style={getBgStyle(colorOTV, d.isSunday)}
                    ></td>
                    <td
                      className={getCellClass(true)}
                      style={getBgStyle(colorOTV, d.isSunday)}
                    ></td>
                  </Fragment>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      );
    }

    // Default View
    return (
      <div className="w-full border border-gray-200 rounded-lg overflow-hidden bg-white p-8 text-center">
        <p className="text-gray-500 italic">
          Tampilan web untuk <strong>{activeTab}</strong> sedang dalam pengembangan.
        </p>
        <p className="text-gray-400 text-sm mt-2">
          Silakan gunakan tombol &quot;Download Excel&quot; untuk melihat data lengkap.
        </p>
      </div>
    );
  };

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-center bg-white p-6 rounded-xl shadow-sm border border-gray-100 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Rangkuman Laporan</h1>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 items-end w-full md:w-auto">
          <div className="w-full sm:w-auto relative z-30">
            <DatePicker
              selected={selectedMonth}
              onChange={(date) => setSelectedMonth(date)}
              dateFormat="MMMM yyyy"
              showMonthYearPicker
              wrapperClassName="w-full"
              disabled={isLoading}
              className={`w-full sm:w-48 px-4 py-2.5 rounded-lg border border-gray-300 text-center font-medium shadow-sm transition-colors
                        ${
                          isLoading
                            ? 'bg-gray-100 text-gray-400 cursor-not-allowed border-gray-200'
                            : 'bg-white text-slate-700 cursor-pointer focus:ring-2 focus:ring-sky-500 focus:border-transparent hover:bg-gray-50'
                        }
                    `}
            />
          </div>

          <button
            onClick={handleDownloadExcel}
            disabled={isLoading || rawData.tasks.length === 0}
            className="w-full sm:w-auto px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg transition-all disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-sm h-[42px]"
          >
            {isLoading ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                />
              </svg>
            )}
            <span>Download Excel</span>
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 min-h-[400px] flex flex-col">
        <div className="flex overflow-x-auto border-b border-gray-200 px-2 scrollbar-hide">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`
                        px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors
                        ${
                          activeTab === tab.id
                            ? 'border-sky-600 text-sky-700'
                            : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                        }
                    `}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="flex-1 p-0 sm:p-6 overflow-hidden">{renderContent()}</div>
      </div>
    </div>
  );
}
