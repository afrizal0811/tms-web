// File: src/features/reportData/RangkumanSummary.js
'use client';

import { useState, useEffect, useCallback } from 'react';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { getTasks, getResultsSummary, getLocationHistories } from '@/lib/apiService';
import {
  generateRangkumanWorkbook,
  generateRangkumanDataPreview,
} from '@/lib/reportGenerators/rangkumanReport';
import { formatDate } from '@/lib/utils';
import { toastError, toastSuccess } from '@/lib/toastHelper';
import { getOrFetchDriverData } from '@/lib/driverDataHelper';
import * as XLSX from 'xlsx-js-style';

export default function RangkumanSummary() {
  const [selectedLocation, setSelectedLocation] = useState('');
  const [selectedLocationName, setSelectedLocationName] = useState('');
  const [driverData, setDriverData] = useState([]);
  const [selectedMonth, setSelectedMonth] = useState(new Date());
  const [isLoading, setIsLoading] = useState(false);

  const [rawData, setRawData] = useState({
    tasks: [],
    results: [],
    locations: [],
  });

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
        endStr
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
        selectedLocationName
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

    if (activeTab === 'Average KM') {
      const data = reportPreview.averageKmData || [];
      const monthTotals = reportPreview.monthTotals || {};

      if (data.length === 0)
        return <div className="p-6 text-center text-gray-400">Tidak ada data routing.</div>;

      return (
        <div className="w-full overflow-auto max-h-[650px]">
          {/* --- TABEL 1: MONTHLY SUMMARY (CLEAN) --- */}
          <table className="min-w-full border-collapse border border-gray-300 text-sm mb-8 shadow-sm">
            <thead className="bg-gray-50">
              <tr>
                <th
                  rowSpan="2"
                  className="border border-gray-300 px-4 py-3 text-center font-bold text-slate-700 bg-white"
                >
                  Date (Month)
                </th>
                <th
                  colSpan="2"
                  className="border border-gray-300 px-4 py-2 text-center font-bold text-slate-700 bg-white"
                >
                  KM Routing (Month)
                </th>
                <th
                  rowSpan="2"
                  className="border border-gray-300 px-4 py-3 text-center font-bold text-slate-700 bg-sky-50"
                >
                  Total KM Routing (Month)
                </th>
                <th
                  rowSpan="2"
                  className="border border-gray-300 px-4 py-3 text-center font-bold text-slate-700 bg-white"
                >
                  Average KM (Month)
                </th>
              </tr>
              <tr>
                <th className="border border-gray-300 px-4 py-2 text-center bg-white">Dry</th>
                <th className="border border-gray-300 px-4 py-2 text-center bg-white">Frozen</th>
              </tr>
            </thead>
            <tbody className="bg-white">
              <tr>
                <td className="border border-gray-300 px-4 py-3 text-center font-medium">
                  {monthTotals.range}
                </td>
                <td className="border border-gray-300 px-4 py-3 text-center">
                  {monthTotals.dryKm?.toLocaleString('en-US', { minimumFractionDigits: 3 })}
                </td>
                <td className="border border-gray-300 px-4 py-3 text-center">
                  {monthTotals.frozenKm?.toLocaleString('en-US', { minimumFractionDigits: 3 })}
                </td>
                <td className="border border-gray-300 px-4 py-3 text-center font-bold bg-sky-50">
                  {monthTotals.totalKm?.toLocaleString('en-US', { minimumFractionDigits: 3 })}
                </td>
                <td className="border border-gray-300 px-4 py-3 text-center">
                  {monthTotals.avgKm?.toLocaleString('en-US', { minimumFractionDigits: 3 })}
                </td>
              </tr>
            </tbody>
          </table>

          {/* --- TABEL 2: DAILY DETAILS --- */}
          <table className="min-w-full border-collapse border border-gray-300 text-sm">
            <thead className="sticky top-0 bg-sky-600 text-white z-10">
              <tr>
                <th rowSpan="2" className="border border-sky-700 px-4 py-2">
                  Delivery Date
                </th>
                <th colSpan="2" className="border border-sky-700 px-4 py-2 text-center">
                  Total Vehicle
                </th>
                <th
                  colSpan="2"
                  className="border border-sky-700 px-4 py-2 text-center bg-yellow-200 text-black font-bold"
                >
                  KM Routing
                </th>
                <th rowSpan="2" className="border border-sky-700 px-4 py-2">
                  Total KM Routing
                </th>
                <th rowSpan="2" className="border border-sky-700 px-4 py-2">
                  Average KM
                </th>
              </tr>
              <tr>
                <th className="border border-sky-700 px-4 py-2">Dry</th>
                <th className="border border-sky-700 px-4 py-2">Frozen</th>
                <th className="border border-sky-700 px-4 py-2 bg-yellow-200 text-black">Dry</th>
                <th className="border border-sky-700 px-4 py-2 bg-yellow-200 text-black">Frozen</th>
              </tr>
            </thead>
            <tbody className="bg-white">
              {data.map((row, idx) => (
                <tr key={idx} className={`hover:bg-gray-50 ${row.isSunday ? 'bg-red-100' : ''}`}>
                  <td className="border border-gray-300 px-4 py-2 text-center whitespace-nowrap font-medium">
                    {row.date}
                  </td>
                  {row.isSunday ? (
                    <>
                      <td
                        colSpan="6"
                        className="border border-gray-300 px-4 py-2 bg-red-50 text-center text-gray-400 text-xs"
                      >
                        Libur (Minggu)
                      </td>
                    </>
                  ) : (
                    <>
                      <td className="border border-gray-300 px-4 py-2 text-center">
                        {row.dryCount}
                      </td>
                      <td className="border border-gray-300 px-4 py-2 text-center">
                        {row.frozenCount}
                      </td>
                      <td className="border border-gray-300 px-4 py-2 text-center bg-yellow-50">
                        {row.dryKm.toLocaleString('en-US', {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </td>
                      <td className="border border-gray-300 px-4 py-2 text-center bg-yellow-50">
                        {row.frozenKm.toLocaleString('en-US', {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </td>
                      <td className="border border-gray-300 px-4 py-2 text-center font-medium">
                        {row.totalKm.toLocaleString('en-US', {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </td>
                      <td className="border border-gray-300 px-4 py-2 text-center">
                        {row.avgKm.toLocaleString('en-US', {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </td>
                    </>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    }

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
