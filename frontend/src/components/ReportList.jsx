import { formatDistanceToNow, format } from 'date-fns'
import { Eye, Edit2, Trash2, RefreshCw } from 'lucide-react'

export default function ReportList({ reports, loading, onView, onEdit, onDelete, onRefresh }) {
  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="inline-block">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
        </div>
        <p className="mt-4 text-gray-600">Loading reports...</p>
      </div>
    )
  }

  if (reports.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow p-8 text-center">
        <p className="text-gray-500 text-lg">No reports yet. Create your first report to get started!</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button
          onClick={onRefresh}
          className="flex items-center gap-2 px-3 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
        >
          <RefreshCw size={18} /> Refresh
        </button>
      </div>

      <div className="grid gap-4">
        {reports.map((report) => (
          <div key={report._id} className="bg-white rounded-lg shadow hover:shadow-lg transition-shadow">
            <div className="p-6">
              <div className="flex justify-between items-start mb-3">
                <div className="flex-1">
                  <h2 className="text-xl font-semibold text-gray-900">{report.title || 'Untitled Report'}</h2>
                  <p className="text-sm text-gray-500 mt-1">
                    📅 {format(new Date(report.date), 'MMM dd, yyyy')} • 
                    {' '}
                    <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-1 rounded inline-block">
                      {report.status || 'pending'}
                    </span>
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4 text-sm">
                <div>
                  <span className="text-gray-500">✅ Accomplishments</span>
                  <p className="font-medium text-gray-700 line-clamp-2">{report.rawInputs?.accomplishments || '—'}</p>
                </div>
                <div>
                  <span className="text-gray-500">🚀 In Progress</span>
                  <p className="font-medium text-gray-700 line-clamp-2">{report.rawInputs?.inProgress || '—'}</p>
                </div>
                <div>
                  <span className="text-gray-500">🚫 Blockers</span>
                  <p className="font-medium text-gray-700 line-clamp-2">{report.rawInputs?.blockers || '—'}</p>
                </div>
                <div>
                  <span className="text-gray-500">📝 Notes</span>
                  <p className="font-medium text-gray-700 line-clamp-2">{report.rawInputs?.notes || '—'}</p>
                </div>
              </div>

              <div className="flex gap-2 justify-end">
                <button
                  onClick={() => onView(report)}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors"
                >
                  <Eye size={18} /> View
                </button>
                <button
                  onClick={() => onEdit(report)}
                  className="flex items-center gap-2 px-4 py-2 bg-yellow-50 text-yellow-700 rounded-lg hover:bg-yellow-100 transition-colors"
                >
                  <Edit2 size={18} /> Edit
                </button>
                <button
                  onClick={() => onDelete(report._id)}
                  className="flex items-center gap-2 px-4 py-2 bg-red-50 text-red-700 rounded-lg hover:bg-red-100 transition-colors"
                >
                  <Trash2 size={18} /> Delete
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
