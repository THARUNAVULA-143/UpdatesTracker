import { format } from 'date-fns'
import { ArrowLeft, Edit2, Trash2 } from 'lucide-react'

export default function ReportDetail({ report, onEdit, onDelete, onBack }) {
  return (
    <div className="space-y-6">
      <button
        onClick={onBack}
        className="flex items-center gap-2 px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors"
      >
        <ArrowLeft size={20} /> Back to List
      </button>

      <div className="bg-white rounded-lg shadow p-8">
        {/* Header */}
        <div className="flex justify-between items-start mb-6 pb-6 border-b">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{report.title || 'Untitled Report'}</h1>
            <p className="text-gray-600 mt-2">
              📅 {format(new Date(report.date), 'EEEE, MMMM dd, yyyy')}
            </p>
            {report.tags && report.tags.length > 0 && (
              <div className="flex gap-2 mt-3 flex-wrap">
                {report.tags.map(tag => (
                  <span key={tag} className="bg-indigo-100 text-indigo-700 px-3 py-1 rounded-full text-sm">
                    #{tag}
                  </span>
                ))}
              </div>
            )}
          </div>
          <div className="flex gap-2">
            <button
              onClick={onEdit}
              className="flex items-center gap-2 px-4 py-2 bg-yellow-50 text-yellow-700 rounded-lg hover:bg-yellow-100 transition-colors"
            >
              <Edit2 size={20} /> Edit
            </button>
            <button
              onClick={onDelete}
              className="flex items-center gap-2 px-4 py-2 bg-red-50 text-red-700 rounded-lg hover:bg-red-100 transition-colors"
            >
              <Trash2 size={20} /> Delete
            </button>
          </div>
        </div>

        {/* Raw Inputs */}
        <div className="grid md:grid-cols-2 gap-8 mb-8">
          {/* Accomplishments */}
          <div className="bg-linear-to-br from-green-50 to-emerald-50 rounded-lg p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-3">✅ Accomplishments</h2>
            <p className="text-gray-700 whitespace-pre-wrap">{report.rawInputs?.accomplishments || '—'}</p>
          </div>

          {/* In Progress */}
          <div className="bg-linear-to-br from-blue-50 to-cyan-50 rounded-lg p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-3">🚀 In Progress</h2>
            <p className="text-gray-700 whitespace-pre-wrap">{report.rawInputs?.inProgress || '—'}</p>
          </div>

          {/* Blockers */}
          <div className="bg-linear-to-br from-red-50 to-pink-50 rounded-lg p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-3">🚫 Blockers</h2>
            <p className="text-gray-700 whitespace-pre-wrap">{report.rawInputs?.blockers || '—'}</p>
          </div>

          {/* Notes */}
          <div className="bg-linear-to-br from-purple-50 to-pink-50 rounded-lg p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-3">📝 Notes</h2>
            <p className="text-gray-700 whitespace-pre-wrap">{report.rawInputs?.notes || '—'}</p>
          </div>
        </div>

        {/* Formatted Report */}
        {report.formattedReport && (
          <div className="border-t pt-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              ✨ AI-Formatted Report
            </h2>
            <div className="bg-indigo-50 rounded-lg p-6 border border-indigo-200">
              <p className="text-gray-800 whitespace-pre-wrap">{report.formattedReport}</p>
            </div>
          </div>
        )}

        {/* Metadata */}
        <div className="mt-8 pt-6 border-t space-y-2 text-sm text-gray-600">
          <p>
            <span className="font-medium">Status:</span> {report.status || 'pending'}
          </p>
          <p>
            <span className="font-medium">AI Model:</span> {report.llmModel || 'Not specified'}
          </p>
          <p>
            <span className="font-medium">Created:</span> {format(new Date(report.createdAt), 'PPpp')}
          </p>
          {report.updatedAt && (
            <p>
              <span className="font-medium">Last Updated:</span> {format(new Date(report.updatedAt), 'PPpp')}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
