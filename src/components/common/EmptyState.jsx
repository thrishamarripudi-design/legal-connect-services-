export default function EmptyState({ title, description, actionLabel, onAction }) {
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-10 text-center">
      <h3 className="text-base font-semibold text-slate-900 font-display">{title}</h3>
      <p className="text-sm text-slate-500 mt-1.5 max-w-md mx-auto">{description}</p>
      {actionLabel && onAction && (
        <button
          type="button"
          onClick={onAction}
          className="mt-5 px-4 py-2 text-xs font-semibold text-white bg-slate-900 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}
