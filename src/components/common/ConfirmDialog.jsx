export default function ConfirmDialog({ open, title, message, confirmLabel = 'Confirm', danger = false, onConfirm, onCancel, loading = false }) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/50 flex items-center justify-center p-4">
      <div className="bg-white border border-slate-200 rounded-xl max-w-md w-full p-6 shadow-xl">
        <h3 className="text-base font-semibold text-slate-900 font-display">{title}</h3>
        <p className="text-sm text-slate-600 mt-2 leading-relaxed">{message}</p>
        <div className="mt-6 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="px-4 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className={`px-4 py-2 text-xs font-semibold text-white rounded-lg cursor-pointer disabled:opacity-50 ${
              danger ? 'bg-rose-700 hover:bg-rose-800' : 'bg-slate-900 hover:bg-slate-800'
            }`}
          >
            {loading ? 'Processing...' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
