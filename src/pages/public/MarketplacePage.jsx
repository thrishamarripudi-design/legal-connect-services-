import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Search, SlidersHorizontal } from 'lucide-react';
import Navbar from '../../components/common/Navbar';
import Footer from '../../components/common/Footer';
import ProviderAvatar from '../../components/common/ProviderAvatar';
import EmptyState from '../../components/common/EmptyState';
import { marketplaceApi } from '../../api/services';
import { formatINR, providerTypeLabel } from '../../utils/formatters';

export default function MarketplacePage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [specializations, setSpecializations] = useState([]);
  const [data, setData] = useState({ content: [], totalElements: 0, totalPages: 0, page: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [filters, setFilters] = useState({
    q: searchParams.get('q') || '',
    specializationId: searchParams.get('specializationId') || '',
    providerType: searchParams.get('providerType') || '',
    city: searchParams.get('city') || '',
    maxFee: searchParams.get('maxFee') || '',
    minExperience: searchParams.get('minExperience') || '',
    minRating: searchParams.get('minRating') || '',
    dayOfWeek: searchParams.get('dayOfWeek') || '',
    sort: searchParams.get('sort') || 'merit',
    page: Number(searchParams.get('page') || 0),
  });

  useEffect(() => {
    marketplaceApi.getSpecializations().then(setSpecializations).catch(() => {});
  }, []);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');
    const params = { size: 6, page: filters.page, sort: filters.sort };
    if (filters.q) params.q = filters.q;
    if (filters.specializationId) params.specializationId = filters.specializationId;
    if (filters.providerType) params.providerType = filters.providerType;
    if (filters.city) params.city = filters.city;
    if (filters.maxFee) params.maxFee = filters.maxFee;
    if (filters.minExperience) params.minExperience = filters.minExperience;
    if (filters.minRating) params.minRating = filters.minRating;
    if (filters.dayOfWeek) params.dayOfWeek = filters.dayOfWeek;

    marketplaceApi
      .searchProviders(params)
      .then((res) => {
        if (active) setData(res);
      })
      .catch((err) => {
        if (active) setError(err.message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => { active = false; };
  }, [filters]);

  const updateFilter = (key, value) => {
    const next = { ...filters, [key]: value, page: key === 'page' ? value : 0 };
    setFilters(next);
    const cleaned = {};
    Object.entries(next).forEach(([k, v]) => {
      if (v !== '' && v !== null && v !== undefined && !(k === 'page' && v === 0)) {
        cleaned[k] = String(v);
      }
    });
    setSearchParams(cleaned, { replace: true });
  };

  const resetFilters = () => {
    const initial = {
      q: '', specializationId: '', providerType: '', city: '',
      maxFee: '', minExperience: '', minRating: '', dayOfWeek: '', sort: 'merit', page: 0,
    };
    setFilters(initial);
    setSearchParams({}, { replace: true });
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Navbar />

      <main className="flex-1 max-w-[1280px] w-full mx-auto px-6 py-8">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-6 border-b border-slate-200">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 font-display">Legal Services Marketplace</h1>
            <p className="text-sm text-slate-600 mt-1">
              Search verified advocates, mediators, arbitrators, and notaries by specialization, fee, and live slot availability.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <label className="text-xs font-medium text-slate-600" htmlFor="sort-select">Sort by</label>
            <select
              id="sort-select"
              value={filters.sort}
              onChange={(e) => updateFilter('sort', e.target.value)}
              className="text-sm bg-white border border-slate-200 rounded-lg px-3 py-2 text-slate-800"
            >
              <option value="merit">Merit & Rating</option>
              <option value="fee_asc">Fee: Low to High</option>
              <option value="fee_desc">Fee: High to Low</option>
              <option value="experience">Experience</option>
              <option value="rating">Highest Rated</option>
            </select>
          </div>
        </div>

        <div className="mt-6 grid lg:grid-cols-12 gap-6 items-start">
          {/* Filter Sidebar */}
          <aside className="lg:col-span-3 bg-white border border-slate-200 rounded-xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                <SlidersHorizontal className="w-4 h-4" />
                <span>Filters</span>
              </div>
              <button
                type="button"
                onClick={resetFilters}
                className="text-xs font-medium text-blue-800 hover:underline cursor-pointer"
              >
                Reset
              </button>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Keyword</label>
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={filters.q}
                  onChange={(e) => updateFilter('q', e.target.value)}
                  placeholder="Name, RERA, cyber..."
                  className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-slate-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Specialization</label>
              <select
                value={filters.specializationId}
                onChange={(e) => updateFilter('specializationId', e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white"
              >
                <option value="">All Specializations</option>
                {specializations.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Provider Role</label>
              <select
                value={filters.providerType}
                onChange={(e) => updateFilter('providerType', e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white"
              >
                <option value="">All Types</option>
                <option value="ADVOCATE">Advocate</option>
                <option value="MEDIATOR">Mediator</option>
                <option value="ARBITRATOR">Arbitrator</option>
                <option value="NOTARY">Notary Public</option>
                <option value="LEGAL_CONSULTANT">Legal Consultant</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">City</label>
              <input
                type="text"
                value={filters.city}
                onChange={(e) => updateFilter('city', e.target.value)}
                placeholder="e.g. Bengaluru, Delhi"
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Max Fee (INR)</label>
                <input
                  type="number"
                  value={filters.maxFee}
                  onChange={(e) => updateFilter('maxFee', e.target.value)}
                  placeholder="2500"
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg font-mono tabular-nums"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Min Exp (Yrs)</label>
                <input
                  type="number"
                  value={filters.minExperience}
                  onChange={(e) => updateFilter('minExperience', e.target.value)}
                  placeholder="5"
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg font-mono tabular-nums"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Available Day</label>
              <select
                value={filters.dayOfWeek}
                onChange={(e) => updateFilter('dayOfWeek', e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white"
              >
                <option value="">Any Day</option>
                {['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'].map((d) => (
                  <option key={d} value={d}>{d.charAt(0) + d.slice(1).toLowerCase()}</option>
                ))}
              </select>
            </div>
          </aside>

          {/* Results */}
          <div className="lg:col-span-9 space-y-4">
            <div className="flex items-center justify-between text-xs text-slate-500">
              <span>Showing <strong className="text-slate-900 font-mono tabular-nums">{data.totalElements}</strong> verified legal service providers</span>
            </div>

            {error && (
              <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-sm text-rose-800">{error}</div>
            )}

            {loading ? (
              <div className="grid md:grid-cols-2 gap-4">
                {[1, 2, 3, 4].map((n) => (
                  <div key={n} className="bg-white border border-slate-200 rounded-xl p-6 animate-pulse h-48" />
                ))}
              </div>
            ) : data.content.length === 0 ? (
              <EmptyState
                title="No matching legal providers found"
                description="Try clearing one or more filters such as city, maximum fee, or availability day."
                actionLabel="Reset All Filters"
                onAction={resetFilters}
              />
            ) : (
              <>
                <div className="grid md:grid-cols-2 gap-4">
                  {data.content.map((p) => (
                    <div key={p.id} className="bg-white border border-slate-200 rounded-xl p-6 flex flex-col justify-between">
                      <div>
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex items-start gap-4 min-w-0">
                            <ProviderAvatar src={p.avatarUrl} name={p.fullName} size="md" />
                            <div className="min-w-0">
                              <h2 className="text-base font-semibold text-slate-900 truncate font-display">{p.fullName}</h2>
                              <p className="text-xs text-slate-500 mt-0.5">
                                {providerTypeLabel(p.providerType)} · {p.city}, {p.state}
                              </p>
                              <p className="text-xs text-slate-600 mt-1 font-mono tabular-nums">
                                {Number(p.avgRating || 0).toFixed(1)} ({p.totalReviews} reviews) · {p.experienceYears} yrs exp
                              </p>
                            </div>
                          </div>
                          <div className="text-right shrink-0">
                            <p className="text-base font-bold text-slate-900 font-mono tabular-nums">
                              {formatINR(p.consultationFee)}
                            </p>
                            <p className="text-[11px] text-slate-500">per session</p>
                          </div>
                        </div>

                        <p className="mt-4 text-sm text-slate-600 line-clamp-2 leading-relaxed">{p.bio}</p>

                        <p className="mt-3 text-xs text-slate-500">
                          {p.specializationNames?.join(' · ') || 'General Legal Counsel'}
                        </p>
                      </div>

                      <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between gap-4">
                        <span className="text-xs font-medium text-emerald-700">
                          Verified · {p.incentiveTier} Tier
                        </span>
                        <Link
                          to={`/providers/${p.id}`}
                          className="px-4 py-2 text-xs font-semibold text-white bg-slate-900 rounded-lg hover:bg-slate-800 transition-colors whitespace-nowrap"
                        >
                          View & Book
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>

                {data.totalPages > 1 && (
                  <div className="pt-4 flex items-center justify-between">
                    <button
                      type="button"
                      disabled={filters.page === 0}
                      onClick={() => updateFilter('page', filters.page - 1)}
                      className="px-4 py-2 text-xs font-medium bg-white border border-slate-200 rounded-lg disabled:opacity-40 cursor-pointer"
                    >
                      Previous
                    </button>
                    <span className="text-xs text-slate-600 font-mono tabular-nums">
                      Page {filters.page + 1} of {data.totalPages}
                    </span>
                    <button
                      type="button"
                      disabled={data.last}
                      onClick={() => updateFilter('page', filters.page + 1)}
                      className="px-4 py-2 text-xs font-medium bg-white border border-slate-200 rounded-lg disabled:opacity-40 cursor-pointer"
                    >
                      Next
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
