import { useState } from 'react'
import { Save, X } from 'lucide-react'
import { format } from 'date-fns'

export default function ReportForm({ initialData, onSubmit, onCancel }) {
  const [formData, setFormData] = useState({
    title: initialData?.title || '',
    date: initialData?.date ? format(new Date(initialData.date), 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd'),
    rawInputs: {
      accomplishments: initialData?.rawInputs?.accomplishments || '',
      inProgress: initialData?.rawInputs?.inProgress || '',
      blockers: initialData?.rawInputs?.blockers || '',
      notes: initialData?.rawInputs?.notes || '',
    },
    llmModel: initialData?.llmModel || 'meta-llama/Llama-3.2-3B-Instruct',
    tags: initialData?.tags?.join(', ') || '',
  })

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }))
  }

  const handleRawInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      rawInputs: {
        ...prev.rawInputs,
        [field]: value,
      },
    }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const submitData = {
        title: formData.title,
        date: new Date(formData.date).toISOString(),
        rawInputs: formData.rawInputs,
        llmModel: formData.llmModel,
        tags: formData.tags.split(',').map(t => t.trim()).filter(Boolean),
      }

      await onSubmit(submitData)
    } catch (err) {
      setError(err.message || 'Failed to save report')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-2xl font-bold text-gray-900 mb-6">
        {initialData ? '✏️ Edit Report' : '📝 Create New Report'}
      </h2>

      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-700">{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Title */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            📌 Report Title (Optional)
          </label>
          <input
            type="text"
            value={formData.title}
            onChange={(e) => handleInputChange('title', e.target.value)}
            placeholder="e.g., Daily Standup - Dec 5"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          />
        </div>

        {/* Date */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            📅 Date
          </label>
          <input
            type="date"
            value={formData.date}
            onChange={(e) => handleInputChange('date', e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          />
        </div>

        {/* Raw Inputs */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-800">📋 Daily Update Details</h3>

          {/* Accomplishments */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              ✅ What did you accomplish today?
            </label>
            <textarea
              value={formData.rawInputs.accomplishments}
              onChange={(e) => handleRawInputChange('accomplishments', e.target.value)}
              placeholder="List your achievements..."
              rows="3"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          </div>

          {/* In Progress */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              🚀 What are you working on?
            </label>
            <textarea
              value={formData.rawInputs.inProgress}
              onChange={(e) => handleRawInputChange('inProgress', e.target.value)}
              placeholder="Current work in progress..."
              rows="3"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          </div>

          {/* Blockers */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              🚫 Are there any blockers?
            </label>
            <textarea
              value={formData.rawInputs.blockers}
              onChange={(e) => handleRawInputChange('blockers', e.target.value)}
              placeholder="Any issues or blockers..."
              rows="3"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              📝 Additional Notes
            </label>
            <textarea
              value={formData.rawInputs.notes}
              onChange={(e) => handleRawInputChange('notes', e.target.value)}
              placeholder="Any other notes..."
              rows="3"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* AI Model Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            🤖 AI Model for Formatting
          </label>
          <select
            value={formData.llmModel}
            onChange={(e) => handleInputChange('llmModel', e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          >
            <option value="meta-llama/Llama-3.2-3B-Instruct">Llama 3.2 3B Instruct</option>
          </select>
        </div>

        {/* Tags */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            🏷️ Tags (comma-separated)
          </label>
          <input
            type="text"
            value={formData.tags}
            onChange={(e) => handleInputChange('tags', e.target.value)}
            placeholder="e.g., backend, bug-fix, feature"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          />
        </div>

        {/* Buttons */}
        <div className="flex gap-3 justify-end">
          <button
            type="button"
            onClick={onCancel}
            className="flex items-center gap-2 px-6 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors"
          >
            <X size={20} /> Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="flex items-center gap-2 px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50"
          >
            <Save size={20} /> {loading ? 'Saving...' : 'Save Report'}
          </button>
        </div>
      </form>
    </div>
  )
}
