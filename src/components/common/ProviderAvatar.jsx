export default function ProviderAvatar({ src, name, size = 'md' }) {
  const dims =
    size === 'lg' ? 'w-20 h-20 text-xl' :
    size === 'sm' ? 'w-10 h-10 text-xs' :
    'w-14 h-14 text-base';

  const initials = (name || 'LC')
    .replace(/Adv\.\s*/i, '')
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() || '')
    .join('');

  if (!src) {
    return (
      <div className={`${dims} rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center font-display font-semibold text-slate-700 shrink-0`}>
        {initials}
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={name || 'Legal Provider'}
      referrerPolicy="no-referrer"
      className={`${dims} rounded-xl object-cover border border-slate-200 shrink-0 bg-slate-100`}
    />
  );
}
