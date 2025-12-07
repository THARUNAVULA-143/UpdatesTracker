// src/App.jsx

import { useState, useRef, useEffect } from 'react';
import { Mic, MicOff, Save, Edit2 } from 'lucide-react';
import { apiClient as reportAPI } from './api/client.js';
import { format } from 'date-fns';

function App() {
  // State management
  const [step, setStep] = useState(1); // 1 = Recording, 2 = Preview, 3 = Saved
  const [isRecording, setIsRecording] = useState(false);
  const [spokenText, setSpokenText] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [previewData, setPreviewData] = useState(null); // AI formatted preview
  const [savedReports, setSavedReports] = useState([]); // All saved reports
  const [userName] = useState('Tharun');
  const [serialNumber, setSerialNumber] = useState(1);
  
  const recognitionRef = useRef(null);
  const [isSupported, setIsSupported] = useState(true);

  // Setup speech recognition
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
      alert('Speech recognition not supported in this browser. Please use Chrome or Edge.');
    }
  }, []);

  // Toggle recording
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

  // Extract section from formatted report
  const extractSection = (text, sectionName) => {
    const regex = new RegExp(`## ${sectionName}\\s*([\\s\\S]*?)(?=##|$)`, "i");
    const match = text.match(regex);
    return match ? match[1].trim() : "";
  };

  // Parse formatted report into sections
  const parseFormattedReport = (text) => ({
    inProgress: extractSection(text, "In Progress"),
    completed: extractSection(text, "Completed"),
    support: extractSection(text, "Support"),
  });

  // Handle Next button - Get AI preview (DON'T save yet)
  const handleNext = async () => {
    if (!spokenText.trim()) {
      alert('Please speak something or type text before proceeding');
      return;
    }

    setLoading(true);

    try {
      // Call backend to format with AI
      const response = await reportAPI.formatReport({
        rawInputs: {
          accomplishments: spokenText,
          inProgress: '',
          blockers: '',
          notes: ''
        },
        title: `Daily Report - ${format(new Date(), 'MMM dd, yyyy')}`,
      });
      
      console.log("✅ AI Formatting response:", response);

      if (!response.formattedReport) {
        throw new Error("No formattedReport returned from backend");
      }

      // Parse the formatted report
      const formatted = parseFormattedReport(response.formattedReport);

      // Set preview data (not saved yet!)
      setPreviewData({
        serialNumber: serialNumber,
        date: new Date(),
        inProgress: formatted.inProgress || "- Current work items",
        completed: formatted.completed || "- Summary of completed tasks",
        support: formatted.support || "- Help received or time saved",
        rawText: spokenText,
        fullFormattedReport: response.formattedReport
      });
      
      setStep(2); // Go to preview step
    } catch (error) {
      console.error('❌ Error formatting report:', error);
      alert('❌ Failed to process report: ' + (error.message || 'Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  // Handle Save button - Actually save to database
  const handleSave = async () => {
    if (!previewData) {
      alert('No data to save');
      return;
    }

    setSaving(true);

    try {
      // Here you would call your actual save endpoint
      // For now, just add to local state
      const newReport = {
        id: Date.now(),
        ...previewData,
        savedAt: new Date()
      };

      setSavedReports(prev => [...prev, newReport]);
      setSerialNumber(prev => prev + 1);
      
      alert('✅ Report saved successfully!');
      
      // Reset form
      setStep(1);
      setSpokenText('');
      setPreviewData(null);
      
    } catch (error) {
      console.error('❌ Error saving report:', error);
      alert('❌ Failed to save report');
    } finally {
      setSaving(false);
    }
  };

  // Handle Edit - Go back and edit
  const handleEdit = () => {
    setStep(1);
    // Keep spokenText so user can edit it
  };

  // Handle Cancel
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

  // Render Step 1: Recording
  if (step === 1) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-100 via-gray-200 to-gray-300 flex items-center justify-center p-6">
        <div className="w-full max-w-5xl">
          <div className="bg-gradient-to-r from-gray-400 to-gray-500 text-white px-8 py-4 rounded-t-2xl shadow-lg">
            <h1 className="text-2xl font-bold">Hello {userName}, Welcome back!..</h1>
          </div>

          <div className="bg-white rounded-b-2xl shadow-2xl p-8">
            <div className="flex items-start gap-4 mb-8">
              <div className="flex-1">
                {isRecording && (
                  <div className="flex items-center gap-2 mb-2 text-red-600 animate-pulse">
                    <div className="w-3 h-3 bg-red-600 rounded-full animate-ping"></div>
                    <span className="font-semibold">Recording...</span>
                  </div>
                )}
                <textarea
                  value={spokenText}
                  onChange={(e) => setSpokenText(e.target.value)}
                  placeholder="Click the microphone to speak or type here manually..."
                  className="w-full h-48 p-4 border-2 border-gray-300 rounded-xl focus:border-blue-500 focus:outline-none resize-none text-gray-700 text-lg"
                  disabled={isRecording}
                />
              </div>

              <div className="flex flex-col items-center">
                <span className="text-sm font-semibold text-gray-700 mb-2">speak</span>
                <button
                  onClick={toggleRecording}
                  className={`w-16 h-16 rounded-full flex items-center justify-center shadow-lg transition-all transform hover:scale-110 ${
                    isRecording
                      ? 'bg-red-500 hover:bg-red-600 animate-pulse'
                      : 'bg-white hover:bg-gray-50 border-4 border-purple-500'
                  }`}
                >
                  {isRecording ? (
                    <MicOff className="w-8 h-8 text-white" />
                  ) : (
                    <Mic className="w-8 h-8 text-purple-500" />
                  )}
                </button>
              </div>
            </div>

            <div className="flex justify-center gap-4">
              <button
                onClick={handleNext}
                disabled={loading || !spokenText.trim()}
                className="px-12 py-3 bg-blue-600 text-white rounded-full font-semibold hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-all transform hover:scale-105 shadow-lg"
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Processing...
                  </span>
                ) : (
                  'Next'
                )}
              </button>
              <button
                onClick={handleCancel}
                className="px-12 py-3 bg-white text-gray-700 rounded-full font-semibold hover:bg-gray-100 border-2 border-gray-300 transition-all transform hover:scale-105 shadow-lg"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Render Step 2: Preview with Save Button
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-100 via-gray-200 to-gray-300 flex items-center justify-center p-6">
      <div className="w-full max-w-6xl">
        <div className="bg-gradient-to-r from-gray-400 to-gray-500 text-white px-8 py-4 rounded-t-2xl shadow-lg">
          <h1 className="text-2xl font-bold">Hello {userName}, Welcome back!..</h1>
        </div>

        <div className="bg-white rounded-b-2xl shadow-2xl p-8">
          {/* Info Box */}
          <div className="bg-blue-50 rounded-xl p-4 mb-6 border-2 border-blue-300">
            <p className="text-gray-800 text-center font-semibold">
              📋 Preview: Your spoken input has been processed and formatted below
            </p>
            <p className="text-gray-600 text-center text-sm mt-1">
              Review the data and click "Save" to store it in the database
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-center gap-4 mb-8">
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 px-12 py-3 bg-green-600 text-white rounded-full font-semibold hover:bg-green-700 disabled:bg-gray-400 transition-all transform hover:scale-105 shadow-lg"
            >
              {saving ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-5 h-5" />
                  Save to Database
                </>
              )}
            </button>
            <button
              onClick={handleEdit}
              className="flex items-center gap-2 px-12 py-3 bg-yellow-500 text-white rounded-full font-semibold hover:bg-yellow-600 transition-all transform hover:scale-105 shadow-lg"
            >
              <Edit2 className="w-5 h-5" />
              Edit
            </button>
            <button
              onClick={handleCancel}
              className="px-12 py-3 bg-white text-gray-700 rounded-full font-semibold hover:bg-gray-100 border-2 border-gray-300 transition-all transform hover:scale-105 shadow-lg"
            >
              Cancel
            </button>
          </div>

          {/* Preview Table */}
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-gray-400">
                  <th className="border-2 border-gray-600 px-6 py-4 text-left font-bold text-gray-800">S.No</th>
                  <th className="border-2 border-gray-600 px-6 py-4 text-left font-bold text-gray-800">Date</th>
                  <th className="border-2 border-gray-600 px-6 py-4 text-left font-bold text-gray-800">In Progress</th>
                  <th className="border-2 border-gray-600 px-6 py-4 text-left font-bold text-gray-800">Completed</th>
                  <th className="border-2 border-gray-600 px-6 py-4 text-left font-bold text-gray-800">Support</th>
                </tr>
              </thead>
              <tbody>
                <tr className="bg-blue-50 hover:bg-blue-100 transition-colors border-4 border-blue-500">
                  <td className="border-2 border-blue-500 px-6 py-6 font-semibold text-gray-800">
                    {previewData?.serialNumber}
                  </td>
                  <td className="border-2 border-blue-500 px-6 py-6 font-semibold text-gray-800">
                    {previewData && format(previewData.date, 'MMM dd, yyyy')}
                  </td>
                  <td className="border-2 border-blue-500 px-6 py-6 text-gray-700 whitespace-pre-wrap">
                    {previewData?.inProgress}
                  </td>
                  <td className="border-2 border-blue-500 px-6 py-6 text-gray-700 whitespace-pre-wrap">
                    {previewData?.completed}
                  </td>
                  <td className="border-2 border-blue-500 px-6 py-6 text-gray-700 whitespace-pre-wrap">
                    {previewData?.support}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Legend */}
          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600">
              ✨ AI-powered formatting applied to your spoken input
            </p>
            <p className="text-xs text-gray-500 mt-2">
              Generated on {previewData && format(previewData.date, 'PPP p')}
            </p>
          </div>

          {/* Show saved reports count */}
          {savedReports.length > 0 && (
            <div className="mt-6 text-center">
              <p className="text-sm font-semibold text-green-600">
                ✅ {savedReports.length} report{savedReports.length > 1 ? 's' : ''} saved today
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default App;