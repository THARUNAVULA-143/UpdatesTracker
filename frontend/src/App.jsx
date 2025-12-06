// src/App.jsx

import { useState, useRef, useEffect } from 'react';
import { 
  Mic, 
  StopCircle, 
  FileText, 
  Download, 
  Trash2, 
  Calendar,
  Plus,
  Edit,
  Eye,
  RefreshCw 
} from 'lucide-react';
import { apiClient } from './api/client';
import { format } from 'date-fns';

function App() {
 
  const [page, setPage] = useState('list'); // 'list', 'create', 'edit', 'detail'
  const [reports, setReports] = useState([]);
  const [selectedReport, setSelectedReport] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // Speech recognition state
  const [inputs, setInputs] = useState({
    accomplishments: '',
    inProgress: '',
    blockers: '',
    notes: '',
  });
  const [currentSection, setCurrentSection] = useState('accomplishments');
  const [isListening, setIsListening] = useState(false);
  const [models, setModels] = useState([]);
  const [selectedModel, setSelectedModel] = useState('meta-llama/Llama-3.2-3B-Instruct');
  
  const recognitionRef = useRef(null);

  
  useEffect(() => {
    // Check if browser supports speech recognition
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      
      // Configuration
      recognitionRef.current.continuous = true;  // Keep listening
      recognitionRef.current.interimResults = true; // Show results as you speak
      recognitionRef.current.lang = 'en-US';
      
      // Handle speech results
      recognitionRef.current.onresult = (event) => {
        let finalTranscript = '';
        
        // Process all results
        for (let i = event.resultIndex; i < event.results.length; i++) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript + ' ';
          }
        }
        
        // Add to current section
        if (finalTranscript) {
          setInputs((prev) => ({
            ...prev,
            [currentSection]: prev[currentSection] + finalTranscript,
          }));
        }
      };
      
      // Handle errors
      recognitionRef.current.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        setIsListening(false);
        if (event.error === 'not-allowed') {
          alert('🎤 Microphone access denied. Please allow microphone access in browser settings.');
        }
      };
      
      // Handle end
      recognitionRef.current.onend = () => {
        setIsListening(false);
      };
    } else {
      console.warn('Speech recognition not supported in this browser');
    }
  }, [currentSection]);


  useEffect(() => {
    loadReports();
    loadModels();
  }, []);


  const loadReports = async () => {
    try {
      setLoading(true);
      const response = await apiClient.getAllReports();
      setReports(Array.isArray(response) ? response : []);
      setError('');
    } catch (err) {
      console.error('Error loading reports:', err);
      setError('Failed to load reports');
    } finally {
      setLoading(false);
    }
  };

  const loadModels = async () => {
    try {
      const response = await apiClient.getAvailableModels();
      setModels(Array.isArray(response) ? response : []);
    } catch (err) {
      console.error('Error loading models:', err);
    }
  };


  const toggleListening = () => {
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
    } else {
      try {
        recognitionRef.current?.start();
        setIsListening(true);
      } catch (error) {
        console.error('Error starting recognition:', error);
        alert('Could not start microphone. Please check permissions.');
      }
    }
  };


  const handleGenerate = async () => {
    // Validation
    if (!inputs.accomplishments && !inputs.inProgress && !inputs.blockers && !inputs.notes) {
      alert('Please add at least one update!');
      return;
    }

    setLoading(true);

    try {
      const response = await apiClient.createReport({
        rawInputs: inputs,
        llmModel: selectedModel,
        title: `Daily Report - ${format(new Date(), 'MMM dd, yyyy')}`,
      });

      alert('✅ Report created successfully!');
      
      // Clear inputs
      setInputs({
        accomplishments: '',
        inProgress: '',
        blockers: '',
        notes: '',
      });
      
      // Reload reports and show list
      await loadReports();
      setPage('list');
      
    } catch (error) {
      console.error('Error creating report:', error);
      alert('❌ Failed to create report: ' + (error.response?.data?.message || error.message));
    } finally {
      setLoading(false);
    }
  };

  const handleClear = () => {
    setInputs({
      accomplishments: '',
      inProgress: '',
      blockers: '',
      notes: '',
    });
  };

  const handleViewReport = (report) => {
    setSelectedReport(report);
    setPage('detail');
  };

  const handleDeleteReport = async (id) => {
    if (!confirm('Are you sure you want to delete this report?')) return;

    try {
      await apiClient.deleteReport(id);
      alert('✅ Report deleted successfully');
      await loadReports();
      if (page === 'detail') setPage('list');
    } catch (error) {
      console.error('Error deleting report:', error);
      alert('❌ Failed to delete report');
    }
  };


  
  const sections = [
    { key: 'accomplishments', label: '✅ Accomplishments', color: 'bg-green-500' },
    { key: 'inProgress', label: '🚧 In Progress', color: 'bg-blue-500' },
    { key: 'blockers', label: '🚫 Blockers', color: 'bg-red-500' },
    { key: 'notes', label: '📝 Notes', color: 'bg-gray-500' },
  ];


  
  if (page === 'create') {
    return (
      <div className="min-h-screen bg-linear-to-br from-purple-50 via-blue-50 to-indigo-100">
        {/* Header */}
        <header className="bg-white shadow-md">
          <div className="max-w-7xl mx-auto px-4 py-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <FileText className="w-10 h-10 text-indigo-600" />
                <div>
                  <h1 className="text-3xl font-bold text-gray-900">UpdatesTracker</h1>
                  <p className="text-gray-600">Speak your updates, AI formats them professionally</p>
                </div>
              </div>
              <button
                onClick={() => setPage('list')}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
              >
                ← Back to List
              </button>
            </div>
          </div>
        </header>

        <div className="max-w-4xl mx-auto px-4 py-8">
          <div className="space-y-6">
            {/* AI Model Selection */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-bold mb-4">Select AI Model</h2>
              <select
                value={selectedModel}
                onChange={(e) => setSelectedModel(e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
              >
                {models.map((model) => (
                  <option key={model.id} value={model.id}>
                    {model.name} - {model.description}
                  </option>
                ))}
              </select>
            </div>

            {/* Section Selector */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-bold mb-4">Currently Recording To:</h2>
              <div className="flex flex-wrap gap-2">
                {sections.map((section) => (
                  <button
                    key={section.key}
                    onClick={() => setCurrentSection(section.key)}
                    className={`px-4 py-2 rounded-lg font-medium transition-all ${
                      currentSection === section.key
                        ? 'bg-indigo-600 text-white scale-105 shadow-lg'
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                  >
                    {section.label}
                  </button>
                ))}
              </div>

              {/* Microphone Button */}
              <div className="flex justify-center my-6">
                <button
                  onClick={toggleListening}
                  className={`flex items-center gap-3 px-8 py-4 rounded-full text-white font-bold text-lg shadow-lg transition-all transform hover:scale-105 ${
                    isListening
                      ? 'bg-red-500 hover:bg-red-600 animate-pulse'
                      : 'bg-indigo-600 hover:bg-indigo-700'
                  }`}
                >
                  {isListening ? (
                    <>
                      <StopCircle className="w-6 h-6" />
                      Stop Recording
                    </>
                  ) : (
                    <>
                      <Mic className="w-6 h-6" />
                      Start Recording
                    </>
                  )}
                </button>
              </div>

              {isListening && (
                <p className="text-center text-lg font-semibold text-indigo-600 animate-pulse">
                  🎤 Listening to: {sections.find((s) => s.key === currentSection)?.label}
                </p>
              )}
            </div>

            {/* Text Inputs */}
            <div className="bg-white rounded-lg shadow-md p-6 space-y-4">
              <h2 className="text-xl font-bold mb-4">Your Updates</h2>
              {sections.map((section) => (
                <div key={section.key}>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    {section.label}
                  </label>
                  <textarea
                    value={inputs[section.key]}
                    onChange={(e) =>
                      setInputs({ ...inputs, [section.key]: e.target.value })
                    }
                    className="w-full h-24 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                    placeholder={`Speak or type your ${section.key}...`}
                  />
                </div>
              ))}
            </div>

            {/* Action Buttons */}
            <div className="flex gap-4">
              <button
                onClick={handleGenerate}
                disabled={loading}
                className="flex-1 bg-indigo-600 text-white py-3 px-6 rounded-lg font-semibold hover:bg-indigo-700 disabled:bg-gray-400 transition-colors"
              >
                {loading ? '🤖 Generating...' : '✨ Generate Report'}
              </button>
              <button
                onClick={handleClear}
                className="flex items-center gap-2 bg-gray-200 text-gray-700 py-3 px-6 rounded-lg font-semibold hover:bg-gray-300"
              >
                <Trash2 className="w-5 h-5" />
                Clear
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }


  
  if (page === 'detail' && selectedReport) {
    return (
      <div className="min-h-screen bg-linear-to-br from-purple-50 via-blue-50 to-indigo-100">
        <header className="bg-white shadow-md">
          <div className="max-w-7xl mx-auto px-4 py-6">
            <div className="flex items-center justify-between">
              <h1 className="text-3xl font-bold text-gray-900">Report Details</h1>
              <button
                onClick={() => setPage('list')}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
              >
                ← Back
              </button>
            </div>
          </div>
        </header>

        <div className="max-w-4xl mx-auto px-4 py-8">
          <div className="bg-white rounded-lg shadow-lg p-8">
            <div className="flex justify-between items-start mb-6">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">{selectedReport.title}</h2>
                <p className="text-gray-600">
                  {format(new Date(selectedReport.createdAt), 'PPP')}
                </p>
              </div>
              <button
                onClick={() => handleDeleteReport(selectedReport._id)}
                className="flex items-center gap-2 bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600"
              >
                <Trash2 className="w-4 h-4" />
                Delete
              </button>
            </div>

            {/* AI Formatted Report */}
            <div className="mb-8">
              <h3 className="text-xl font-bold mb-4 text-indigo-600">AI-Formatted Report</h3>
              <div className="bg-linear-to-r from-indigo-50 to-purple-50 p-6 rounded-lg border-l-4 border-indigo-600">
                <pre className="whitespace-pre-wrap font-sans text-gray-800">
                  {selectedReport.formattedReport}
                </pre>
              </div>
            </div>

            {/* Raw Inputs */}
            <div className="space-y-4">
              <h3 className="text-xl font-bold text-gray-900">Original Inputs</h3>
              
              {selectedReport.rawInputs.accomplishments && (
                <div>
                  <h4 className="font-semibold text-green-600 mb-2">✅ Accomplishments</h4>
                  <p className="text-gray-700 bg-green-50 p-4 rounded-lg">
                    {selectedReport.rawInputs.accomplishments}
                  </p>
                </div>
              )}

              {selectedReport.rawInputs.inProgress && (
                <div>
                  <h4 className="font-semibold text-blue-600 mb-2">🚧 In Progress</h4>
                  <p className="text-gray-700 bg-blue-50 p-4 rounded-lg">
                    {selectedReport.rawInputs.inProgress}
                  </p>
                </div>
              )}

              {selectedReport.rawInputs.blockers && (
                <div>
                  <h4 className="font-semibold text-red-600 mb-2">🚫 Blockers</h4>
                  <p className="text-gray-700 bg-red-50 p-4 rounded-lg">
                    {selectedReport.rawInputs.blockers}
                  </p>
                </div>
              )}

              {selectedReport.rawInputs.notes && (
                <div>
                  <h4 className="font-semibold text-gray-600 mb-2">📝 Notes</h4>
                  <p className="text-gray-700 bg-gray-50 p-4 rounded-lg">
                    {selectedReport.rawInputs.notes}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  
  return (
    <div className="min-h-screen bg-linear-to-br from-purple-50 via-blue-50 to-indigo-100">
      {/* Header */}
      <header className="bg-white shadow-md">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <FileText className="w-10 h-10 text-indigo-600" />
              <div>
                <h1 className="text-3xl font-bold text-gray-900">UpdatesTracker</h1>
                <p className="text-gray-600">Your daily status reports</p>
              </div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={loadReports}
                className="flex items-center gap-2 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
              >
                <RefreshCw className="w-4 h-4" />
                Refresh
              </button>
              <button
                onClick={() => setPage('create')}
                className="flex items-center gap-2 px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
              >
                <Plus className="w-5 h-5" />
                New Report
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6">
            {error}
          </div>
        )}

        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
            <p className="mt-4 text-gray-600">Loading reports...</p>
          </div>
        ) : reports.length === 0 ? (
          <div className="text-center py-12">
            <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-700 mb-2">No Reports Yet</h3>
            <p className="text-gray-600 mb-6">Create your first daily status report</p>
            <button
              onClick={() => setPage('create')}
              className="px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
            >
              Create First Report
            </button>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {reports.map((report) => (
              <div
                key={report._id}
                className="bg-white rounded-lg shadow-md p-6 hover:shadow-xl transition-shadow"
              >
                <h3 className="text-lg font-bold text-gray-900 mb-2">{report.title}</h3>
                <p className="text-sm text-gray-600 mb-4">
                  {format(new Date(report.createdAt), 'PPP')}
                </p>
                
                <div className="space-y-2 mb-4 text-sm">
                  {report.rawInputs.accomplishments && (
                    <p className="text-gray-700 line-clamp-2">
                      ✅ {report.rawInputs.accomplishments}
                    </p>
                  )}
                  {report.rawInputs.inProgress && (
                    <p className="text-gray-700 line-clamp-2">
                      🚧 {report.rawInputs.inProgress}
                    </p>
                  )}
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => handleViewReport(report)}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                  >
                    <Eye className="w-4 h-4" />
                    View
                  </button>
                  <button
                    onClick={() => handleDeleteReport(report._id)}
                    className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default App;