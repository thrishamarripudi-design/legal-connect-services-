export function formatINR(amount) {
  const num = Number(amount || 0);
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(num);
}

export function formatDateShort(value) {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function providerTypeLabel(type) {
  const map = {
    ADVOCATE: 'Advocate',
    MEDIATOR: 'Mediator',
    ARBITRATOR: 'Arbitrator',
    NOTARY: 'Notary Public',
    LEGAL_CONSULTANT: 'Legal Consultant',
  };
  return map[type] || type;
}

export function statusColorClass(status) {
  switch (status) {
    case 'APPROVED':
    case 'VERIFIED':
    case 'CONFIRMED':
    case 'COMPLETED':
    case 'PAID':
    case 'RESOLVED':
    case 'ACTIVE':
      return 'text-emerald-700';
    case 'PENDING_REVIEW':
    case 'PENDING':
    case 'REQUESTED':
    case 'RESCHEDULED':
    case 'IN_PROGRESS':
    case 'ASSIGNED':
    case 'CORRECTIONS_REQUIRED':
      return 'text-amber-700';
    case 'REJECTED':
    case 'CANCELLED':
    case 'SUSPENDED':
    case 'FAILED':
      return 'text-rose-700';
    default:
      return 'text-slate-600';
  }
}

export const HERO_CHAMBERS_IMAGE = '/src/assets/images/hero_legal_chambers_1795167918720.jpg';
