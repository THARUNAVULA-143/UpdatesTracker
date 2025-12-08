// src/components/ExportModal.jsx

import { useState } from 'react';
import { Download, X, FileText, FileSpreadsheet, Calendar } from 'lucide-react';
import { format, subMonths } from 'date-fns';

const ExportModal = ({ isOpen, onClose }) => {
  const [exportType, setExportType] = useState('csv');
  const [dateRange, setDateRange] = useState('3months');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [downloading, setDownloading] = useState(false);

  if (!isOpen) return null;

  const handleExport = async () => {
    setDownloading(true);

    try {
      let url = `http://localhost:5000/api/reports/export/${exportType}?`;

      if (dateRange === 'custom') {
        if (!customStartDate || !customEndDate) {
          alert('Please select both start and end dates');
          setDownloading(false);
          return;
        }
        url += `startDate=${customStartDate}&endDate=${customEndDate}`;
      } else {
        const months = dateRange === '3months' ? 3 : 6;
        url += `months=${months}`;
      }

      console.log('🔍 Fetching export from:', url);

      // Fetch the file
      const response = await fetch(url);
      
      console.log('📥 Response status:', response.status);
      console.log('📥 Response headers:', response.headers);

      // Check if response is OK
      if (!response.ok) {
        // Try to parse error message
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          const errorData = await response.json();
          throw new Error(errorData.message || 'Export failed');
        } else {
          throw new Error(`Export failed with status ${response.status}`);
        }
      }

      // Get the blob
      const blob = await response.blob();
      
      console.log('✅ Blob received, size:', blob.size);

      if (blob.size === 0) {
        throw new Error('Received empty file');
      }

      // Create download link
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      
      const extension = exportType === 'csv' ? 'csv' : exportType === 'pdf' ? 'pdf' : 'xlsx';
      link.download = `standup-reports-${format(new Date(), 'yyyy-MM-dd')}.${extension}`;
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      // Clean up
      setTimeout(() => {
        window.URL.revokeObjectURL(downloadUrl);
      }, 100);

      alert('✅ Export successful!');
      onClose();
      
    } catch (error) {
      console.error('❌ Export error:', error);
      alert(`❌ Failed to export: ${error.message}`);
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl p-8 relative animate-fadeIn">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
        >
          <X className="w-6 h-6" />
        </button>

        {/* Title */}
        <div className="flex items-center gap-3 mb-6">
          <Download className="w-8 h-8 text-indigo-600" />
          <h2 className="text-2xl font-bold text-gray-800">Export Reports</h2>
        </div>

        {/* Export Type Selection */}
        <div className="mb-6">
          <label className="block text-sm font-semibold text-gray-700 mb-3">
            Select Export Format
          </label>
          <div className="grid grid-cols-3 gap-4">
            <button
              onClick={() => setExportType('csv')}
              className={`p-4 rounded-xl border-2 transition-all ${
                exportType === 'csv'
                  ? 'border-indigo-600 bg-indigo-50 text-indigo-600'
                  : 'border-gray-300 hover:border-indigo-300'
              }`}
            >
              <FileText className="w-8 h-8 mx-auto mb-2" />
              <p className="font-semibold">CSV</p>
              <p className="text-xs text-gray-500">Spreadsheet</p>
            </button>

            <button
              onClick={() => setExportType('pdf')}
              className={`p-4 rounded-xl border-2 transition-all ${
                exportType === 'pdf'
                  ? 'border-indigo-600 bg-indigo-50 text-indigo-600'
                  : 'border-gray-300 hover:border-indigo-300'
              }`}
            >
              <FileText className="w-8 h-8 mx-auto mb-2" />
              <p className="font-semibold">PDF</p>
              <p className="text-xs text-gray-500">Document</p>
            </button>

            <button
              onClick={() => setExportType('excel')}
              className={`p-4 rounded-xl border-2 transition-all ${
                exportType === 'excel'
                  ? 'border-indigo-600 bg-indigo-50 text-indigo-600'
                  : 'border-gray-300 hover:border-indigo-300'
              }`}
            >
              <FileSpreadsheet className="w-8 h-8 mx-auto mb-2" />
              <p className="font-semibold">Excel</p>
              <p className="text-xs text-gray-500">.xlsx</p>
            </button>
          </div>
        </div>

        {/* Date Range Selection */}
        <div className="mb-6">
          <label className="block text-sm font-semibold text-gray-700 mb-3">
            Select Time Period
          </label>
          <div className="space-y-3">
            <label className="flex items-center p-3 rounded-lg border-2 border-gray-300 hover:border-indigo-300 cursor-pointer transition-all">
              <input
                type="radio"
                name="dateRange"
                value="3months"
                checked={dateRange === '3months'}
                onChange={(e) => setDateRange(e.target.value)}
                className="w-4 h-4 text-indigo-600"
              />
              <span className="ml-3 text-gray-700 font-medium">Last 3 Months</span>
            </label>

            <label className="flex items-center p-3 rounded-lg border-2 border-gray-300 hover:border-indigo-300 cursor-pointer transition-all">
              <input
                type="radio"
                name="dateRange"
                value="6months"
                checked={dateRange === '6months'}
                onChange={(e) => setDateRange(e.target.value)}
                className="w-4 h-4 text-indigo-600"
              />
              <span className="ml-3 text-gray-700 font-medium">Last 6 Months</span>
            </label>

            <label className="flex items-center p-3 rounded-lg border-2 border-gray-300 hover:border-indigo-300 cursor-pointer transition-all">
              <input
                type="radio"
                name="dateRange"
                value="custom"
                checked={dateRange === 'custom'}
                onChange={(e) => setDateRange(e.target.value)}
                className="w-4 h-4 text-indigo-600"
              />
              <span className="ml-3 text-gray-700 font-medium">Custom Date Range</span>
            </label>
          </div>
        </div>

        {/* Custom Date Range Inputs */}
        {dateRange === 'custom' && (
          <div className="mb-6 bg-gray-50 p-4 rounded-xl">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Start Date
                </label>
                <input
                  type="date"
                  value={customStartDate}
                  onChange={(e) => setCustomStartDate(e.target.value)}
                  className="w-full p-3 border-2 border-gray-300 rounded-lg focus:border-indigo-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  End Date
                </label>
                <input
                  type="date"
                  value={customEndDate}
                  onChange={(e) => setCustomEndDate(e.target.value)}
                  className="w-full p-3 border-2 border-gray-300 rounded-lg focus:border-indigo-500 focus:outline-none"
                />
              </div>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex justify-end gap-4">
          <button
            onClick={onClose}
            className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg font-semibold hover:bg-gray-300 transition-all"
          >
            Cancel
          </button>
          <button
            onClick={handleExport}
            disabled={downloading}
            className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-indigo-600 to-blue-600 text-white rounded-lg font-semibold hover:from-indigo-700 hover:to-blue-700 disabled:from-gray-400 disabled:to-gray-500 transition-all"
          >
            {downloading ? (
              <>
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                <span>Exporting...</span>
              </>
            ) : (
              <>
                <Download className="w-5 h-5" />
                <span>Export</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ExportModal;