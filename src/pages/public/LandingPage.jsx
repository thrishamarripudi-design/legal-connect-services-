import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import Navbar from '../../components/common/Navbar';
import Footer from '../../components/common/Footer';
import ProviderAvatar from '../../components/common/ProviderAvatar';
import { marketplaceApi } from '../../api/services';
import { HERO_CHAMBERS_IMAGE, formatINR, providerTypeLabel } from '../../utils/formatters';

export default function LandingPage() {
  const [specializations, setSpecializations] = useState([]);
  const [featuredProviders, setFeaturedProviders] = useState([]);

  useEffect(() => {
    marketplaceApi.getSpecializations().then(setSpecializations).catch(() => {});
    marketplaceApi.searchProviders({ page: 0, size: 4, sort: 'merit' })
      .then((res) => setFeaturedProviders(res.content || []))
      .catch(() => {});
  }, []);

  const incentiveTiers = [
    { tier: 'Bronze', points: '0 – 249 pts', commission: '15%', benefits: 'Standard marketplace listing & verified profile badge' },
    { tier: 'Silver', points: '250 – 499 pts', commission: '11%', benefits: 'Priority placement in city & specialization searches' },
    { tier: 'Gold', points: '500 – 749 pts', commission: '8%', benefits: 'Featured counsel showcase & reduced platform fee' },
    { tier: 'Platinum', points: '750+ pts', commission: '5%', benefits: 'Lowest commission tier, top merit ranking & pro-bono honors' },
  ];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col">
      <Navbar />

      <main className="flex-1">
        {/* Hero Split */}
        <section className="max-w-[1280px] mx-auto px-6 pt-12 pb-10">
          <div className="grid lg:grid-cols-12 gap-8 items-stretch">
            <div className="lg:col-span-6 bg-white border border-slate-200 rounded-2xl p-8 lg:p-10 flex flex-col justify-between">
              <div>
                <h1 className="text-3xl sm:text-4xl lg:text-[2.75rem] leading-[1.12] font-bold tracking-tight text-slate-900 font-display text-balance">
                  Trusted legal counsel and case assistance, verified from the ground up.
                </h1>
                <p className="mt-5 text-base text-slate-600 leading-relaxed max-w-xl">
                  Connect directly with Bar-verified advocates, arbitrators, mediators, and notaries. Compare transparent fees, reserve conflict-free consultation slots, and track case documents in one workspace.
                </p>
              </div>

              <div className="mt-8 pt-6 border-t border-slate-100 flex flex-wrap items-center gap-4">
                <Link
                  to="/marketplace"
                  className="inline-flex items-center gap-2 px-5 py-3 text-sm font-semibold text-white bg-slate-900 rounded-lg hover:bg-slate-800 transition-colors whitespace-nowrap"
                >
                  Browse Verified Counsel
                  <ArrowRight className="w-4 h-4" />
                </Link>
                <Link
                  to="/register?role=PROVIDER"
                  className="inline-flex items-center px-4 py-3 text-sm font-medium text-slate-700 hover:text-slate-900 transition-colors whitespace-nowrap"
                >
                  Onboard as Legal Provider
                </Link>
              </div>
            </div>

            <div className="lg:col-span-6 rounded-2xl overflow-hidden border border-slate-200 bg-slate-200 min-h-[320px]">
              <img
                src={HERO_CHAMBERS_IMAGE}
                alt="Modern legal consultation chamber and law library"
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover"
              />
            </div>
          </div>

          {/* 4-column Strip */}
          <div className="mt-6 grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white border border-slate-200 rounded-xl p-5">
              <p className="text-xs text-slate-500">Credential Verification</p>
              <p className="mt-1.5 text-xl font-bold text-slate-900 font-mono tabular-nums">100% Audited</p>
              <p className="mt-1 text-xs text-slate-500">Bar Council & license review</p>
            </div>
            <div className="bg-white border border-slate-200 rounded-xl p-5">
              <p className="text-xs text-slate-500">Merit Commission Range</p>
              <p className="mt-1.5 text-xl font-bold text-slate-900 font-mono tabular-nums">5% – 15%</p>
              <p className="mt-1 text-xs text-slate-500">Lower fees for top service</p>
            </div>
            <div className="bg-white border border-slate-200 rounded-xl p-5">
              <p className="text-xs text-slate-500">Slot Conflict Prevention</p>
              <p className="mt-1.5 text-xl font-bold text-slate-900 font-mono tabular-nums">Transactional</p>
              <p className="mt-1 text-xs text-slate-500">Zero double-booked sessions</p>
            </div>
            <div className="bg-white border border-slate-200 rounded-xl p-5">
              <p className="text-xs text-slate-500">Practice Specializations</p>
              <p className="mt-1.5 text-xl font-bold text-slate-900 font-mono tabular-nums">{specializations.length || 8} Domains</p>
              <p className="mt-1 text-xs text-slate-500">Civil, RERA, ADR & Cyber law</p>
            </div>
          </div>
        </section>

        {/* Featured Verified Providers */}
        <section className="max-w-[1280px] mx-auto px-6 py-12">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6">
            <div>
              <h2 className="text-2xl font-bold text-slate-900 font-display">Top-Ranked Verified Counsel</h2>
              <p className="text-sm text-slate-600 mt-1">
                Ranked by onboarding merit points, verified client ratings, and active consultation availability.
              </p>
            </div>
            <Link to="/marketplace" className="text-sm font-medium text-blue-800 hover:underline whitespace-nowrap">
              View all practitioners
            </Link>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-5">
            {featuredProviders.map((p) => (
              <Link
                key={p.id}
                to={`/providers/${p.id}`}
                className="bg-white border border-slate-200 rounded-xl p-5 hover:border-slate-400 transition-colors flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start gap-3.5">
                    <ProviderAvatar src={p.avatarUrl} name={p.fullName} size="md" />
                    <div className="min-w-0">
                      <h3 className="text-sm font-semibold text-slate-900 truncate font-display">{p.fullName}</h3>
                      <p className="text-xs text-slate-500 mt-0.5 truncate">
                        {providerTypeLabel(p.providerType)} · {p.city}
                      </p>
                      <p className="text-xs text-slate-600 mt-1 font-mono tabular-nums">
                        {Number(p.avgRating || 0).toFixed(1)} rating · {p.experienceYears} yrs
                      </p>
                    </div>
                  </div>
                  <p className="mt-4 text-xs text-slate-600 line-clamp-2 leading-relaxed">{p.bio}</p>
                </div>

                <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                  <span className="font-medium text-slate-700">{p.incentiveTier} Tier</span>
                  <span className="font-mono tabular-nums font-semibold text-slate-900">
                    {formatINR(p.consultationFee)}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </section>

        {/* Editorial Workflow + Practice Areas */}
        <section id="practice-areas" className="bg-white border-y border-slate-200 py-14">
          <div className="max-w-[1280px] mx-auto px-6 grid lg:grid-cols-12 gap-10">
            <div className="lg:col-span-5">
              <h2 className="text-2xl font-bold text-slate-900 font-display text-balance">
                Structured legal assistance from intake to resolution
              </h2>
              <p className="mt-3 text-sm text-slate-600 leading-relaxed">
                Every workflow in LegalConnect separates citizen privacy, verified credential auditing, and escrow-style receipt accounting.
              </p>
              <div className="mt-6 space-y-4 text-sm">
                <div className="pb-3 border-b border-slate-100">
                  <p className="font-semibold text-slate-900">01. Credential-Audited Discovery</p>
                  <p className="text-slate-600 text-xs mt-1">Only administrator-verified advocates, mediators, arbitrators, and notaries appear in public search.</p>
                </div>
                <div className="pb-3 border-b border-slate-100">
                  <p className="font-semibold text-slate-900">02. Conflict-Free Slot Reservation</p>
                  <p className="text-slate-600 text-xs mt-1">Database row-level locks prevent concurrent double-booking across video, phone, and in-person slots.</p>
                </div>
                <div className="pb-3 border-b border-slate-100">
                  <p className="font-semibold text-slate-900">03. Access-Controlled Case Files</p>
                  <p className="text-slate-600 text-xs mt-1">Documents attached to appointments or case tickets are downloadable only by the owning citizen, assigned provider, or admin.</p>
                </div>
                <div>
                  <p className="font-semibold text-slate-900">04. Post-Consultation Accountability</p>
                  <p className="text-slate-600 text-xs mt-1">Ratings and reviews are unlocked strictly after consultation completion, feeding the merit tier engine.</p>
                </div>
              </div>
            </div>

            <div className="lg:col-span-7">
              <h3 className="text-sm font-semibold text-slate-900 mb-4">Available Legal Specializations</h3>
              <div className="grid sm:grid-cols-2 gap-3.5">
                {specializations.map((spec) => (
                  <Link
                    key={spec.id}
                    to={`/marketplace?specializationId=${spec.id}`}
                    className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-white hover:border-slate-400 transition-colors"
                  >
                    <p className="text-sm font-semibold text-slate-900">{spec.name}</p>
                    <p className="text-xs text-slate-600 mt-1 leading-relaxed">{spec.description}</p>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Incentives-Based Onboarding Section */}
        <section id="incentives" className="max-w-[1280px] mx-auto px-6 py-14">
          <div className="max-w-2xl mb-8">
            <h2 className="text-2xl font-bold text-slate-900 font-display text-balance">
              Incentives-based onboarding for legal service providers
            </h2>
            <p className="mt-2 text-sm text-slate-600 leading-relaxed">
              Providers earn merit points for credential verification, timely consultation completion, high client ratings, and pro-bono legal aid—unlocking lower platform commissions and higher marketplace visibility.
            </p>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 border-b border-slate-200 text-xs text-slate-600">
                  <tr>
                    <th className="py-3 px-5 font-semibold">Merit Tier</th>
                    <th className="py-3 px-5 font-semibold">Points Threshold</th>
                    <th className="py-3 px-5 font-semibold">Platform Fee</th>
                    <th className="py-3 px-5 font-semibold">Marketplace Incentives</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {incentiveTiers.map((row) => (
                    <tr key={row.tier} className="hover:bg-slate-50/70">
                      <td className="py-3.5 px-5 font-semibold text-slate-900">{row.tier}</td>
                      <td className="py-3.5 px-5 font-mono tabular-nums text-slate-700">{row.points}</td>
                      <td className="py-3.5 px-5 font-mono tabular-nums font-semibold text-blue-800">{row.commission}</td>
                      <td className="py-3.5 px-5 text-slate-600">{row.benefits}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
