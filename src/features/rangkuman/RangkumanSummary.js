'use client';

import { getLocationHistories, getResultsSummary, getTasks } from '@/lib/apiService';
import { getOrFetchDriverData } from '@/lib/driverDataHelper';
import {
  generateRangkumanDataPreview,
  generateRangkumanWorkbook,
} from '@/lib/reportGenerators/rangkumanReport';
import { toastError, toastSuccess } from '@/lib/toastHelper';
import { formatDate } from '@/lib/utils';
import { useCallback, useEffect, useState } from 'react';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import * as XLSX from 'xlsx-js-style';

// --- IMPORT TABS ---
import AverageKmTab from './tabs/AverageKmTab';
import PlaceholderTab from './tabs/PlaceholderTab';
import TimeDriverTab from './tabs/TimeDriverTab';
import TruckDetailTab from './tabs/TruckDetailTab';
import TruckUsageTab from './tabs/TruckUsageTab';

export default function RangkumanSummary() {
  const [selectedLocation, setSelectedLocation] = useState('');
  const [selectedLocationName, setSelectedLocationName] = useState('');

  // State Data
  const [driverData, setDriverData] = useState([]);
  const [rawData, setRawData] = useState({
    tasks: [],
    results: [],
    locations: [],
  });

  const [selectedMonth, setSelectedMonth] = useState(new Date());
  const [isLoading, setIsLoading] = useState(false);
  const [reportPreview, setReportPreview] = useState(null);
  const [activeTab, setActiveTab] = useState('Task Summary');

  // --- LOADING UX STATES ---
  const [elapsedTime, setElapsedTime] = useState(0);
  const [pendingEndpoints, setPendingEndpoints] = useState([]);

  // 1. Load Lokasi
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const storedLocation = localStorage.getItem('userLocation');
      const storedLocationName = localStorage.getItem('userLocationName');
      if (storedLocation) setSelectedLocation(storedLocation);
      if (storedLocationName) setSelectedLocationName(storedLocationName);
    }
  }, []);

  // 2. Timer Logic
  useEffect(() => {
    let interval = null;
    if (isLoading) {
      interval = setInterval(() => {
        setElapsedTime((prev) => prev + 1);
      }, 1000);
    } else {
      setElapsedTime(0);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isLoading]);

  const formatTimer = (seconds) => {
    const m = Math.floor(seconds / 60)
      .toString()
      .padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  // 3. Helper Wrapper
  const fetchWithTracker = async (promise, label) => {
    setPendingEndpoints((prev) => [...prev, label]);
    try {
      const result = await promise;
      return result;
    } finally {
      setPendingEndpoints((prev) => prev.filter((item) => item !== label));
    }
  };

  // 4. Fetch Data
  const fetchData = useCallback(async () => {
    if (!selectedLocation || !selectedMonth) return;

    setIsLoading(true);
    setPendingEndpoints([]);

    try {
      const year = selectedMonth.getFullYear();
      const month = selectedMonth.getMonth();
      const startDate = new Date(year, month, 1);
      const endDate = new Date(year, month + 1, 0);

      const startStr = formatDate(startDate);
      const endStr = formatDate(endDate);
      const timeFrom = `${startStr} 00:00:00`;
      const timeTo = `${endStr} 23:59:59`;

      // --- LOGIKA KHUSUS LOCATION HISTORY (H-1 Jam 23:00:00) ---
      const locStartDate = new Date(startDate);
      locStartDate.setDate(locStartDate.getDate() - 1); // Mundur 1 hari
      const locStartStr = formatDate(locStartDate);
      const locTimeFrom = `${locStartStr} 23:00:00`; // Set start jam 23:00

      // Logika H-1 untuk Routing (Existing)
      const routingStartDate = new Date(startDate);
      routingStartDate.setDate(routingStartDate.getDate() - 1);
      const routingEndDate = new Date(endDate);
      routingEndDate.setDate(routingEndDate.getDate() - 1);

      const routingStartStr = formatDate(routingStartDate);
      const routingEndStr = formatDate(routingEndDate);
      const routingTimeFrom = `${routingStartStr} 00:00:00`;
      const routingTimeTo = `${routingEndStr} 23:59:59`;

      const [tasksRes, resultsRes, locRes, driversRes] = await Promise.all([
        fetchWithTracker(
          getTasks({
            hubId: selectedLocation,
            status: 'DONE',
            timeFrom: timeFrom, // Tetap normal (00:00:00)
            timeTo: timeTo,
            timeBy: 'doneTime',
            limit: 10000,
          }),
          'Task'
        ),
        fetchWithTracker(
          getResultsSummary({
            hubId: selectedLocation,
            dateFrom: routingTimeFrom,
            dateTo: routingTimeTo,
            limit: 10000,
          }),
          'Routing'
        ),
        fetchWithTracker(
          getLocationHistories({
            timeFrom: locTimeFrom, // <--- MENGGUNAKAN WAKTU H-1 JAM 23:00
            timeTo: timeTo, // End time tetap akhir bulan 23:59
            limit: 10000,
            startFinish: 'true',
            fields: 'finish,startTime,email,trackedTime,totalDistance',
            timeBy: 'createdTime',
          }),
          'History'
        ),
        getOrFetchDriverData(selectedLocation),
      ]);

      const drivers = driversRes || [];
      setDriverData(drivers);

      const filteredResults = (resultsRes || []).filter(
        (item) => item.dispatchStatus && item.dispatchStatus.toLowerCase() === 'done'
      );

      const newRawData = {
        tasks: tasksRes || [],
        results: filteredResults,
        locations: locRes || [],
      };
      setRawData(newRawData);

      const preview = generateRangkumanDataPreview(
        drivers,
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
      setDriverData([]);
      setReportPreview(null);
    } finally {
      setIsLoading(false);
    }
  }, [selectedLocation, selectedMonth]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // --- EXCEL DOWNLOAD ---
  const handleDownloadExcel = () => {
    if (!selectedMonth) return;
    if (driverData.length === 0) {
      toastError('Data Driver belum siap/kosong.');
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

  // --- RENDER CONTENT ---
  const renderContent = () => {
    if (isLoading) {
      const showLongLoadingMsg = elapsedTime > 120;
      const pendingText = pendingEndpoints.join(', ');

      return (
        <div className="h-full flex flex-col items-center justify-center text-gray-500 py-12 space-y-4">
          <div className="w-12 h-12 border-4 border-sky-200 border-t-sky-600 rounded-full animate-spin"></div>

          <div className="text-center space-y-1">
            <p className="text-lg font-medium text-slate-700">Sedang memuat data...</p>
            <p className="text-2xl font-mono font-bold text-sky-600">{formatTimer(elapsedTime)}</p>
          </div>

          {showLongLoadingMsg && pendingEndpoints.length > 0 && (
            <div className="bg-orange-50 border border-orange-200 text-orange-700 px-4 py-3 rounded-md max-w-md text-center text-sm animate-pulse">
              <p className="font-semibold">Memproses banyak data di {pendingText}.</p>
              <p>Mohon tunggu.</p>
            </div>
          )}
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

    const renderTabContent = (Component, props) => (
      <div className="w-full h-[calc(100vh-240px)] flex flex-col">
        <Component {...props} />
      </div>
    );

    switch (activeTab) {
      case 'Truck Usage':
        return renderTabContent(TruckUsageTab, { data: reportPreview.truckUsageData });
      case 'Average KM':
        return renderTabContent(AverageKmTab, {
          data: reportPreview.averageKmData,
          monthTotals: reportPreview.monthTotals,
        });
      case 'Truck Detail':
        return renderTabContent(TruckDetailTab, { data: reportPreview.truckDetailData });
      case 'Time Driver':
        return renderTabContent(TimeDriverTab, { data: reportPreview.timeDriverData });
      default:
        return <PlaceholderTab tabName={activeTab} />;
    }
  };

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-center bg-white p-6 rounded-xl shadow-sm border border-gray-100 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Rangkuman Laporan</h1>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 items-end w-full md:w-auto">
          <div className="w-full sm:w-auto relative z-50">
            <label className="block text-xs text-gray-400 mb-1 ml-1">Pilih Bulan</label>
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
