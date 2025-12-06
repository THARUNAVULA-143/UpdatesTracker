// src/App.jsx

import { useState, useRef, useEffect } from 'react';
import { Mic, MicOff } from 'lucide-react';
import { apiClient as reportAPI } from './api/client.js';
import { format } from 'date-fns';

function App() {
  // State management
  const [step, setStep] = useState(1); // 1 = Recording, 2 = Results
  const [isRecording, setIsRecording] = useState(false);
  const [spokenText, setSpokenText] = useState('');
  const [loading, setLoading] = useState(false);
  const [formattedData, setFormattedData] = useState(null);
  const [userName] = useState('Tharun');
  
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
        let interimTranscript = '';
        let finalTranscript = '';
        
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalTranscript += transcript + ' ';
          } else {
            interimTranscript += transcript;
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

  // Handle Next button
  const handleNext = async () => {
    if (!spokenText.trim()) {
      alert('Please speak something or type text before proceeding');
      return;
    }

    setLoading(true);

    try {
      // Create report with AI formatting
      const response = await reportAPI.createReport({
        rawInputs: {
          accomplishments: spokenText,
          inProgress: '',
          blockers: '',
          notes: ''
        },
        llmModel: 'meta-llama/Llama-3.2-3B-Instruct',
        title: `Daily Report - ${format(new Date(), 'MMM dd, yyyy')}`,
      });

      // Parse the formatted report into structured data
      const formatted = parseFormattedReport(response.data.formattedReport);
      setFormattedData({
        ...formatted,
        date: new Date(),
        rawText: spokenText
      });
      
      setStep(2);
    } catch (error) {
      console.error('Error creating report:', error);
      alert('❌ Failed to process report: ' + (error.message || 'Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  // Parse AI formatted report into structured data
  const parseFormattedReport = (text) => {
    // Simple parsing - you can make this more sophisticated
    return {
      inProgress: extractSection(text, 'in progress', 'completed', 'support'),
      completed: extractSection(text, 'completed', 'accomplishments', 'support'),
      support: extractSection(text, 'support', 'blockers', 'notes')
    };
  };

  const extractSection = (text, ...keywords) => {
    const lowerText = text.toLowerCase();
    for (const keyword of keywords) {
      const index = lowerText.indexOf(keyword);
      if (index !== -1) {
        const nextKeywordIndex = keywords.slice(1).reduce((acc, kw) => {
          const idx = lowerText.indexOf(kw, index + 1);
          return idx !== -1 && (acc === -1 || idx < acc) ? idx : acc;
        }, -1);
        
        const endIndex = nextKeywordIndex !== -1 ? nextKeywordIndex : text.length;
        return text.substring(index, endIndex).trim();
      }
    }
    return '';
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
      setFormattedData(null);
    }
  };

  // Render Step 1: Recording
  if (step === 1) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-100 via-gray-200 to-gray-300 flex items-center justify-center p-6">
        <div className="w-full max-w-5xl">
          {/* Welcome Header */}
          <div className="bg-gradient-to-r from-gray-400 to-gray-500 text-white px-8 py-4 rounded-t-2xl shadow-lg">
            <h1 className="text-2xl font-bold">Hello {userName}, Welcome back!..</h1>
          </div>

          {/* Main Card */}
          <div className="bg-white rounded-b-2xl shadow-2xl p-8">
            {/* Recording Status & Text Area */}
            <div className="flex items-start gap-4 mb-8">
              {/* Text Input Area */}
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

              {/* Microphone Button */}
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

            {/* Action Buttons */}
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

  // Render Step 2: Results Table
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-100 via-gray-200 to-gray-300 flex items-center justify-center p-6">
      <div className="w-full max-w-6xl">
        {/* Welcome Header */}
        <div className="bg-gradient-to-r from-gray-400 to-gray-500 text-white px-8 py-4 rounded-t-2xl shadow-lg">
          <h1 className="text-2xl font-bold">Hello {userName}, Welcome back!..</h1>
        </div>

        {/* Main Card */}
        <div className="bg-white rounded-b-2xl shadow-2xl p-8">
          {/* Info Box */}
          <div className="bg-gray-100 rounded-xl p-4 mb-6 border-2 border-gray-300">
            <p className="text-gray-700 text-center">
              Your spoken input has been processed and formatted below
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-center gap-4 mb-8">
            <button
              onClick={() => {
                setStep(1);
                setSpokenText('');
                setFormattedData(null);
              }}
              className="px-12 py-3 bg-blue-600 text-white rounded-full font-semibold hover:bg-blue-700 transition-all transform hover:scale-105 shadow-lg"
            >
              New Report
            </button>
            <button
              onClick={handleCancel}
              className="px-12 py-3 bg-white text-gray-700 rounded-full font-semibold hover:bg-gray-100 border-2 border-gray-300 transition-all transform hover:scale-105 shadow-lg"
            >
              Cancel
            </button>
          </div>

          {/* Results Table */}
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
                {/* Empty Rows */}
                <tr className="bg-white hover:bg-gray-50 transition-colors">
                  <td className="border-2 border-gray-400 px-6 py-6"></td>
                  <td className="border-2 border-gray-400 px-6 py-6"></td>
                  <td className="border-2 border-gray-400 px-6 py-6"></td>
                  <td className="border-2 border-gray-400 px-6 py-6"></td>
                  <td className="border-2 border-gray-400 px-6 py-6"></td>
                </tr>
                <tr className="bg-white hover:bg-gray-50 transition-colors">
                  <td className="border-2 border-gray-400 px-6 py-6"></td>
                  <td className="border-2 border-gray-400 px-6 py-6"></td>
                  <td className="border-2 border-gray-400 px-6 py-6"></td>
                  <td className="border-2 border-gray-400 px-6 py-6"></td>
                  <td className="border-2 border-gray-400 px-6 py-6"></td>
                </tr>
                {/* Active Row with Data */}
                <tr className="bg-white hover:bg-blue-50 transition-colors border-4 border-blue-500 animate-pulse">
                  <td className="border-2 border-blue-500 px-6 py-6 font-semibold text-gray-800">1</td>
                  <td className="border-2 border-blue-500 px-6 py-6 font-semibold text-gray-800">
                    {formattedData && format(formattedData.date, 'MMM dd, yyyy')}
                  </td>
                  <td className="border-2 border-blue-500 px-6 py-6 text-gray-700">
                    {formattedData?.inProgress || formattedData?.rawText.substring(0, 50) + '...'}
                  </td>
                  <td className="border-2 border-blue-500 px-6 py-6 text-gray-700">
                    {formattedData?.completed || 'Processing...'}
                  </td>
                  <td className="border-2 border-blue-500 px-6 py-6 text-gray-700">
                    {formattedData?.support || 'N/A'}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Legend */}
          <div className="mt-6 text-center text-sm text-gray-600">
            <p>✨ AI-powered formatting applied to your spoken input</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;