// src/App.jsx

import { useState, useRef, useEffect } from 'react';
import { Mic, MicOff, Save, Edit2, Trash2, ArrowRight, X, Check, Download } from 'lucide-react';
import { apiClient as reportAPI } from './api/client.js';
import { format } from 'date-fns';
import ExportModal from './components/ExportModal';

function App() {
  // ============================================
  // STATE MANAGEMENT
  // ============================================
  const [step, setStep] = useState(1);
  const [isRecording, setIsRecording] = useState(false);
  const [spokenText, setSpokenText] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [previewData, setPreviewData] = useState(null);
  const [savedReports, setSavedReports] = useState([]);
  const [userName] = useState('Tharun');
  const [editingReport, setEditingReport] = useState(null);
  const [editForm, setEditForm] = useState({
    completed: '',
    inProgress: '',
    support: ''
  });
  const [showExportModal, setShowExportModal] = useState(false);
  
  const recognitionRef = useRef(null);
  const [isSupported, setIsSupported] = useState(true);

  // ============================================
  // LOAD SAVED REPORTS ON MOUNT
  // ============================================
  useEffect(() => {
    loadSavedReports();
  }, []);

  const loadSavedReports = async () => {
    try {
      const response = await reportAPI.getAllReports();
      if (response.success && response.data) {
        const sorted = response.data.sort((a, b) => 
          new Date(b.createdAt) - new Date(a.createdAt)
        );
        setSavedReports(sorted);
      }
    } catch (error) {
      console.error('Error loading reports:', error);
    }
  };

  // ============================================
  // SETUP SPEECH RECOGNITION
  // ============================================
  useEffect(() => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = true;
      recognitionRef.current.lang = 'en-US';
      
      recognitionRef.current.onresult = (event) => {
        let finalTranscript = '';
        
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalTranscript += transcript + ' ';
          }
        }
        
        if (finalTranscript) {
          setSpokenText(prev => prev + finalTranscript);
        }
      };
      
      recognitionRef.current.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        setIsRecording(false);
        if (event.error === 'not-allowed') {
          alert('🎤 Microphone access denied. Please allow microphone access.');
        }
      };
      
      recognitionRef.current.onend = () => {
        setIsRecording(false);
      };
    } else {
      setIsSupported(false);
    }
  }, []);

  // ============================================
  // TOGGLE RECORDING
  // ============================================
  const toggleRecording = () => {
    if (!isSupported) {
      alert('Speech recognition not supported in this browser');
      return;
    }

    if (isRecording) {
      recognitionRef.current?.stop();
      setIsRecording(false);
    } else {
      try {
        recognitionRef.current?.start();
        setIsRecording(true);
      } catch (error) {
        console.error('Error starting recognition:', error);
        alert('Could not start microphone. Please check permissions.');
      }
    }
  };

  // ============================================
  // HANDLE NEXT (FORMAT WITH AI)
  // ============================================
  const handleNext = async () => {
    if (!spokenText.trim()) {
      alert('Please speak something or type text before proceeding');
      return;
    }

    setLoading(true);

    try {
      const response = await reportAPI.formatReport({
        rawInputs: {
          accomplishments: spokenText,
        },
      });

      console.log('📥 Format response:', response);

      if (!response.parsedSections) {
        throw new Error("No parsedSections returned from backend");
      }

      // Store both parsed sections AND the formatted report
      setPreviewData({
        date: new Date(),
        completed: response.parsedSections.completed || "None",
        inProgress: response.parsedSections.inProgress || "None",
        support: response.parsedSections.support || "None",
        rawText: spokenText,
        fullFormattedReport: response.formattedReport || '' // ✅ Store the full formatted report
      });
      
      setStep(2);
    } catch (error) {
      console.error('❌ Error formatting report:', error);
      alert('❌ Failed to process report: ' + (error.message || 'Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  // ============================================
  // HANDLE SAVE (SAVE TO DATABASE)
  // ============================================
  const handleSave = async () => {
    if (!previewData) {
      alert('No data to save');
      return;
    }

    setSaving(true);

    try {
      await reportAPI.createReport({
        rawInputs: {
          accomplishments: previewData.rawText,
        },
        title: `Daily Report - ${format(new Date(), 'MMM dd, yyyy')}`,
        formattedReport: previewData.fullFormattedReport || `## Completed
${previewData.completed}

## In Progress
${previewData.inProgress}

## Support
${previewData.support}`, // ✅ Build formattedReport if not present
        parsedSections: {
          completed: previewData.completed,
          inProgress: previewData.inProgress,
          support: previewData.support,
        }
      });

      await loadSavedReports();
      alert('✅ Report saved successfully!');
      
      setStep(1);
      setSpokenText('');
      setPreviewData(null);
      
    } catch (error) {
      console.error('❌ Error saving report:', error);
      alert('❌ Failed to save report: ' + (error.message || 'Unknown error'));
    } finally {
      setSaving(false);
    }
  };

  // ============================================
  // HANDLE EDIT & CANCEL
  // ============================================
  const handleEdit = () => {
    setStep(1);
  };

  const handleCancel = () => {
    if (step === 1) {
      setSpokenText('');
      setIsRecording(false);
      recognitionRef.current?.stop();
    } else {
      setStep(1);
      setSpokenText('');
      setPreviewData(null);
    }
  };

  // ============================================
  // EDIT REPORT FUNCTIONS
  // ============================================
  const startEditReport = (report) => {
    setEditingReport(report._id);
    setEditForm({
      completed: report.completed || '',
      inProgress: report.inProgress || '',
      support: report.support || ''
    });
  };

  const cancelEdit = () => {
    setEditingReport(null);
    setEditForm({ completed: '', inProgress: '', support: '' });
  };

  const saveEditedReport = async (reportId) => {
    try {
      await reportAPI.updateReport(reportId, {
        completed: editForm.completed,
        inProgress: editForm.inProgress,
        support: editForm.support
      });

      await loadSavedReports();
      setEditingReport(null);
      alert('✅ Report updated successfully');
    } catch (error) {
      console.error('Error updating report:', error);
      alert('❌ Failed to update report');
    }
  };

  // ============================================
  // DELETE REPORT
  // ============================================
  const handleDelete = async (reportId) => {
    if (!confirm('Are you sure you want to delete this report?')) {
      return;
    }

    try {
      await reportAPI.deleteReport(reportId);
      await loadSavedReports();
      alert('✅ Report deleted successfully');
    } catch (error) {
      console.error('Error deleting report:', error);
      alert('❌ Failed to delete report');
    }
  };

  // ============================================
  // COMPUTED VALUES
  // ============================================
  const hasInput = spokenText.trim().length > 0;

  // ============================================
  // RENDER STEP 1: RECORDING
  // ============================================
  if (step === 1) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-600 to-blue-600 text-white px-8 py-6 shadow-lg">
          <div className="max-w-7xl mx-auto">
            <h1 className="text-3xl font-bold">Hello {userName}, Welcome back! 👋</h1>
            <p className="text-blue-100 mt-1">Share your daily standup updates</p>
          </div>
        </div>

        {/* Main Content - Centered */}
        <div className="flex-1 flex items-center justify-center px-6 py-8">
          <div className="w-full max-w-3xl">
            {/* Input Card */}
            <div className="bg-white rounded-2xl shadow-xl p-8 mb-8">
              <div className="flex items-start gap-6">
                {/* Text Input */}
                <div className="flex-1">
                  {isRecording && (
                    <div className="flex items-center gap-2 mb-3 text-red-600 animate-pulse">
                      <div className="w-3 h-3 bg-red-600 rounded-full animate-ping"></div>
                      <span className="font-semibold">🎤 Recording...</span>
                    </div>
                  )}
                  <textarea
                    value={spokenText}
                    onChange={(e) => setSpokenText(e.target.value)}
                    placeholder="Click the microphone to speak or type here manually..."
                    className="w-full h-40 p-4 border-2 border-gray-300 rounded-xl focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 focus:outline-none resize-none text-gray-800 transition-all"
                    disabled={isRecording}
                  />
                  <div className="mt-2 text-sm text-gray-500">
                    {spokenText.length} characters
                  </div>
                </div>

                {/* Microphone Button */}
                <div className="flex flex-col items-center gap-2 pt-2">
                  <span className="text-xs font-bold text-gray-600 uppercase tracking-wide">Speak</span>
                  <button
                    onClick={toggleRecording}
                    className={`w-16 h-16 rounded-full flex items-center justify-center shadow-lg transition-all transform hover:scale-110 ${
                      isRecording
                        ? 'bg-gradient-to-br from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 animate-pulse'
                        : 'bg-white hover:bg-gray-50 border-4 border-indigo-500 hover:border-indigo-600'
                    }`}
                  >
                    {isRecording ? (
                      <MicOff className="w-8 h-8 text-white" />
                    ) : (
                      <Mic className="w-8 h-8 text-indigo-500" />
                    )}
                  </button>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-center gap-6 mt-8">
                <button
                  onClick={handleNext}
                  disabled={loading || !hasInput}
                  className={`flex items-center gap-2 px-10 py-3 rounded-xl font-semibold transition-all transform hover:scale-105 shadow-lg ${
                    loading
                      ? 'bg-gray-400 text-white cursor-wait'
                      : hasInput
                      ? 'bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white'
                      : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  }`}
                >
                  {loading ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      <span>Processing...</span>
                    </>
                  ) : (
                    <>
                      <span>Next</span>
                      <ArrowRight className="w-5 h-5" />
                    </>
                  )}
                </button>

                <button
                  onClick={handleCancel}
                  className="flex items-center gap-2 px-10 py-3 bg-white text-gray-700 rounded-xl font-semibold hover:bg-gray-100 border-2 border-gray-300 hover:border-gray-400 transition-all transform hover:scale-105 shadow-lg"
                >
                  <span>Cancel</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* History Section - Always Visible at Bottom */}
        <div className="bg-white border-t-4 border-indigo-600 shadow-2xl">
          <div className="max-w-7xl mx-auto px-6 py-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                <span className="text-indigo-600">📊</span>
                Report History ({savedReports.length} Reports)
              </h2>
              
              {/* Export Button */}
              {savedReports.length > 0 && (
                <button
                  onClick={() => setShowExportModal(true)}
                  className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-lg font-semibold hover:from-green-700 hover:to-emerald-700 transition-all shadow-lg"
                >
                  <Download className="w-5 h-5" />
                  <span>Export Data</span>
                </button>
              )}
            </div>

            {savedReports.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <p>No reports yet. Create your first report above! 👆</p>
              </div>
            ) : (
              <div className="overflow-x-auto rounded-xl border-2 border-gray-200">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-gradient-to-r from-indigo-600 to-blue-600 text-white">
                      <th className="border-2 border-indigo-700 px-4 py-3 text-center font-bold text-sm w-20">S.No</th>
                      <th className="border-2 border-indigo-700 px-4 py-3 text-left font-bold text-sm w-32">Date</th>
                      <th className="border-2 border-indigo-700 px-4 py-3 text-left font-bold text-sm">Completed</th>
                      <th className="border-2 border-indigo-700 px-4 py-3 text-left font-bold text-sm">In Progress</th>
                      <th className="border-2 border-indigo-700 px-4 py-3 text-left font-bold text-sm">Support</th>
                      <th className="border-2 border-indigo-700 px-4 py-3 text-center font-bold text-sm w-28">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {savedReports.map((report, index) => {
                      const isEditing = editingReport === report._id;
                      const serialNumber = savedReports.length - index;

                      return (
                        <tr
                          key={report._id}
                          className={`${
                            index % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                          } hover:bg-indigo-50 transition-colors`}
                        >
                          <td className="border-2 border-gray-200 px-4 py-3 text-center font-bold text-gray-800">
                            {serialNumber}
                          </td>
                          <td className="border-2 border-gray-200 px-4 py-3">
                            <div className="text-sm font-semibold text-gray-800">
                              {format(new Date(report.createdAt), 'MMM dd, yyyy')}
                            </div>
                            <div className="text-xs text-gray-500">
                              {format(new Date(report.createdAt), 'h:mm a')}
                            </div>
                          </td>
                          <td className="border-2 border-gray-200 px-4 py-3">
                            {isEditing ? (
                              <textarea
                                value={editForm.completed}
                                onChange={(e) => setEditForm({ ...editForm, completed: e.target.value })}
                                className="w-full h-20 p-2 border border-gray-300 rounded text-sm focus:border-indigo-500 focus:outline-none resize-none"
                              />
                            ) : (
                              <div className="text-sm text-gray-700 whitespace-pre-wrap">
                                {report.completed || 'None'}
                              </div>
                            )}
                          </td>
                          <td className="border-2 border-gray-200 px-4 py-3">
                            {isEditing ? (
                              <textarea
                                value={editForm.inProgress}
                                onChange={(e) => setEditForm({ ...editForm, inProgress: e.target.value })}
                                className="w-full h-20 p-2 border border-gray-300 rounded text-sm focus:border-indigo-500 focus:outline-none resize-none"
                              />
                            ) : (
                              <div className="text-sm text-gray-700 whitespace-pre-wrap">
                                {report.inProgress || 'None'}
                              </div>
                            )}
                          </td>
                          <td className="border-2 border-gray-200 px-4 py-3">
                            {isEditing ? (
                              <textarea
                                value={editForm.support}
                                onChange={(e) => setEditForm({ ...editForm, support: e.target.value })}
                                className="w-full h-20 p-2 border border-gray-300 rounded text-sm focus:border-indigo-500 focus:outline-none resize-none"
                              />
                            ) : (
                              <div className="text-sm text-gray-700 whitespace-pre-wrap">
                                {report.support || 'None'}
                              </div>
                            )}
                          </td>
                          <td className="border-2 border-gray-200 px-4 py-3">
                            {isEditing ? (
                              <div className="flex items-center justify-center gap-3">
                                <button
                                  onClick={() => saveEditedReport(report._id)}
                                  className="text-green-600 hover:text-green-700 hover:scale-125 transition-all"
                                  title="Save changes"
                                >
                                  <Check className="w-5 h-5" />
                                </button>
                                <button
                                  onClick={cancelEdit}
                                  className="text-gray-600 hover:text-gray-700 hover:scale-125 transition-all"
                                  title="Cancel"
                                >
                                  <X className="w-5 h-5" />
                                </button>
                              </div>
                            ) : (
                              <div className="flex items-center justify-center gap-3">
                                <button
                                  onClick={() => startEditReport(report)}
                                  className="text-blue-600 hover:text-blue-700 hover:scale-125 transition-all"
                                  title="Edit report"
                                >
                                  <Edit2 className="w-5 h-5" />
                                </button>
                                <button
                                  onClick={() => handleDelete(report._id)}
                                  className="text-red-600 hover:text-red-700 hover:scale-125 transition-all"
                                  title="Delete report"
                                >
                                  <Trash2 className="w-5 h-5" />
                                </button>
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Export Modal */}
        <ExportModal isOpen={showExportModal} onClose={() => setShowExportModal(false)} />
      </div>
    );
  }

  // ============================================
  // RENDER STEP 2: PREVIEW
  // ============================================
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex flex-col">
      <div className="bg-gradient-to-r from-indigo-600 to-blue-600 text-white px-8 py-6 shadow-lg">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-3xl font-bold">Hello {userName}, Welcome back! 👋</h1>
          <p className="text-blue-100 mt-1">Review your formatted report</p>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center px-6 py-8">
        <div className="w-full max-w-6xl">
          <div className="bg-white rounded-2xl shadow-xl p-8">
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-5 mb-6 border-2 border-blue-200">
              <p className="text-gray-800 text-center font-bold text-lg">
                📋 Preview: Your spoken input has been processed and formatted below
              </p>
              <p className="text-gray-600 text-center text-sm mt-2">
                Review the data and click "Save" to store it in the database
              </p>
            </div>

            <div className="flex justify-center gap-6 mb-8">
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-3 px-12 py-3.5 rounded-lg font-semibold transition-all transform hover:scale-105 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 disabled:from-gray-400 disabled:to-gray-500 text-white border-2 border-green-700 shadow-lg"
              >
                {saving ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <Save className="w-5 h-5" />
                    <span>Save</span>
                  </>
                )}
              </button>

              <button
                onClick={handleEdit}
                className="flex items-center gap-3 px-12 py-3.5 rounded-lg font-semibold transition-all transform hover:scale-105 bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-white border-2 border-orange-600 shadow-lg"
              >
                <Edit2 className="w-5 h-5" />
                <span>Edit</span>
              </button>

              <button
                onClick={handleCancel}
                className="px-12 py-3.5 bg-white text-gray-700 rounded-lg font-semibold hover:bg-gray-50 border-2 border-gray-300 hover:border-gray-400 transition-all transform hover:scale-105 shadow-md"
              >
                Cancel
              </button>
            </div>

            <div className="overflow-x-auto rounded-xl border-2 border-gray-200">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-gradient-to-r from-indigo-600 to-blue-600 text-white">
                    <th className="border-2 border-indigo-700 px-6 py-4 text-left font-bold">Date</th>
                    <th className="border-2 border-indigo-700 px-6 py-4 text-left font-bold">Completed</th>
                    <th className="border-2 border-indigo-700 px-6 py-4 text-left font-bold">In Progress</th>
                    <th className="border-2 border-indigo-700 px-6 py-4 text-left font-bold">Support</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="bg-gradient-to-r from-blue-50 to-indigo-50">
                    <td className="border-2 border-blue-300 px-6 py-5 font-bold text-gray-800">
                      {previewData && format(previewData.date, 'MMM dd, yyyy')}
                    </td>
                    <td className="border-2 border-blue-300 px-6 py-5 text-gray-700 whitespace-pre-wrap">
                      {previewData?.completed}
                    </td>
                    <td className="border-2 border-blue-300 px-6 py-5 text-gray-700 whitespace-pre-wrap">
                      {previewData?.inProgress}
                    </td>
                    <td className="border-2 border-blue-300 px-6 py-5 text-gray-700 whitespace-pre-wrap">
                      {previewData?.support}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="mt-6 text-center text-sm text-gray-600">
              <p>✨ AI-powered formatting applied to your spoken input</p>
              <p className="text-xs text-gray-500 mt-1">
                Generated on {previewData && format(previewData.date, 'PPPP - p')}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;