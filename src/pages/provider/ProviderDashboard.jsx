import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Award, Briefcase, Calendar, CreditCard, FolderOpen, LayoutDashboard, ShieldCheck } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import DashboardLayout from '../../components/common/DashboardLayout';
import EmptyState from '../../components/common/EmptyState';
import { marketplaceApi, providerApi, workflowApi } from '../../api/services';
import { formatDateShort, formatINR, statusColorClass } from '../../utils/formatters';

export default function ProviderDashboard() {
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(true);
  const [detail, setDetail] = useState(null);
  const [appointments, setAppointments] = useState([]);
  const [requests, setRequests] = useState([]);
  const [payments, setPayments] = useState([]);
  const [specializations, setSpecializations] = useState([]);
  const [feedback, setFeedback] = useState({ type: '', text: '' });

  const { register: regProfile, handleSubmit: handleProfileSubmit, reset: resetProfile } = useForm();
  const { register: regService, handleSubmit: handleServiceSubmit, reset: resetService } = useForm();
  const [availRows, setAvailRows] = useState([
    { dayOfWeek: 'MONDAY', startTime: '10:00', endTime: '17:00', slotDurationMinutes: 30, isAvailable: true },
    { dayOfWeek: 'WEDNESDAY', startTime: '10:00', endTime: '17:00', slotDurationMinutes: 30, isAvailable: true },
    { dayOfWeek: 'FRIDAY', startTime: '10:00', endTime: '16:00', slotDurationMinutes: 30, isAvailable: true },
  ]);

  const navItems = [
    { id: 'overview', label: 'Incentives & Metrics', icon: LayoutDashboard },
    { id: 'onboarding', label: 'Onboarding & KYC', icon: ShieldCheck },
    { id: 'services', label: 'Services & Schedule', icon: Briefcase },
    { id: 'appointments', label: 'Consultations', icon: Calendar },
    { id: 'requests', label: 'Case Requests', icon: FolderOpen },
    { id: 'earnings', label: 'Earnings Ledger', icon: CreditCard },
  ];

  const loadAll = async () => {
    setLoading(true);
    try {
      const [me, appts, reqs, pays, specs] = await Promise.all([
        providerApi.getMe(),
        workflowApi.getMyAppointments({ page: 0, size: 30 }),
        workflowApi.getCaseRequests(),
        workflowApi.getPaymentHistory(),
        marketplaceApi.getSpecializations(),
      ]);
      setDetail(me);
      setAppointments(appts.content || []);
      setRequests(reqs.content || []);
      setPayments(pays || []);
      setSpecializations(specs || []);

      if (me?.profile) {
        resetProfile({
          fullName: me.profile.fullName,
          phone: me.phone,
          providerType: me.profile.providerType,
          barRegistrationNo: me.barRegistrationNo || '',
          experienceYears: me.profile.experienceYears,
          city: me.profile.city,
          state: me.profile.state,
          languagesSpoken: me.profile.languagesSpoken,
          bio: me.profile.bio || '',
          consultationFee: me.profile.consultationFee,
          isAcceptingClients: me.profile.isAcceptingClients,
        });
      }
      if (me?.availability?.length > 0) {
        setAvailRows(me.availability.map((a) => ({
          dayOfWeek: a.dayOfWeek,
          startTime: String(a.startTime).slice(0, 5),
          endTime: String(a.endTime).slice(0, 5),
          slotDurationMinutes: a.slotDurationMinutes,
          isAvailable: a.isAvailable,
        })));
      }
    } catch (err) {
      setFeedback({ type: 'error', text: err.message });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
  }, []);

  const onSaveProfile = async (values) => {
    try {
      await providerApi.updateProfile(values);
      setFeedback({ type: 'success', text: 'Provider profile saved.' });
      loadAll();
    } catch (err) {
      setFeedback({ type: 'error', text: err.message });
    }
  };

  const onUploadCredential = async (e) => {
    e.preventDefault();
    const form = e.target;
    const file = form.file?.files?.[0];
    if (!file) return;
    const fd = new FormData();
    fd.append('documentType', form.documentType.value);
    fd.append('credentialNumber', form.credentialNumber.value);
    fd.append('issuingAuthority', form.issuingAuthority.value);
    fd.append('file', file);
    try {
      await providerApi.uploadCredential(fd);
      form.reset();
      setFeedback({ type: 'success', text: 'Credential uploaded (+15 onboarding points awarded).' });
      loadAll();
    } catch (err) {
      setFeedback({ type: 'error', text: err.message });
    }
  };

  const handleSubmitVerification = async () => {
    try {
      await providerApi.submitVerification();
      setFeedback({ type: 'success', text: 'Application submitted for Administrator verification review.' });
      loadAll();
    } catch (err) {
      setFeedback({ type: 'error', text: err.message });
    }
  };

  const onCreateService = async (values) => {
    try {
      await providerApi.createService(values);
      resetService();
      setFeedback({ type: 'success', text: 'Service listing published (+10 onboarding points).' });
      loadAll();
    } catch (err) {
      setFeedback({ type: 'error', text: err.message });
    }
  };

  const handleSaveAvailability = async () => {
    try {
      await providerApi.saveAvailability(availRows);
      setFeedback({ type: 'success', text: 'Weekly availability schedule updated.' });
      loadAll();
    } catch (err) {
      setFeedback({ type: 'error', text: err.message });
    }
  };

  const handleAppointmentAction = async (id, status) => {
    try {
      await workflowApi.updateAppointmentStatus(id, { status });
      setFeedback({ type: 'success', text: `Appointment marked ${status}.` });
      loadAll();
    } catch (err) {
      setFeedback({ type: 'error', text: err.message });
    }
  };

  const handleCaseUpdate = async (id, status) => {
    try {
      await workflowApi.updateCaseStatus(id, { status, providerNotes: `Updated by counsel to ${status}` });
      setFeedback({ type: 'success', text: `Case ticket updated to ${status}.` });
      loadAll();
    } catch (err) {
      setFeedback({ type: 'error', text: err.message });
    }
  };

  const p = detail?.profile;
  const totalPayout = payments.filter((x) => x.status === 'PAID').reduce((acc, x) => acc + Number(x.provider_payout || 0), 0);
  const earningsChartData = payments.map((pay) => ({
    ref: pay.appointment_code || pay.transaction_ref.slice(-6),
    payout: Number(pay.provider_payout || 0),
    fee: Number(pay.platform_fee || 0),
  }));

  return (
    <DashboardLayout
      title="Legal Provider Console"
      subtitle={p ? `${p.fullName} · Verification: ${p.verificationStatus} · ${p.incentiveTier} Tier` : 'Practice & Incentives Workspace'}
      navItems={navItems}
      activeTab={activeTab}
      onTabChange={(t) => { setActiveTab(t); setFeedback({ type: '', text: '' }); }}
    >
      {feedback.text && (
        <div className={`mb-5 p-3.5 rounded-xl border text-xs font-medium ${
          feedback.type === 'error' ? 'bg-rose-50 border-rose-200 text-rose-800' : 'bg-emerald-50 border-emerald-200 text-emerald-800'
        }`}>
          {feedback.text}
        </div>
      )}

      {loading ? (
        <div className="h-40 bg-white border border-slate-200 rounded-xl animate-pulse" />
      ) : (
        <>
          {activeTab === 'overview' && p && (
            <div className="space-y-6">
              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white border border-slate-200 rounded-xl p-5">
                  <p className="text-xs text-slate-500">Incentive Tier & Points</p>
                  <p className="mt-2 text-2xl font-bold text-slate-900 font-mono tabular-nums">
                    {p.incentiveTier} · {p.incentivePoints}
                  </p>
                </div>
                <div className="bg-white border border-slate-200 rounded-xl p-5">
                  <p className="text-xs text-slate-500">Active Platform Commission</p>
                  <p className="mt-2 text-2xl font-bold text-blue-800 font-mono tabular-nums">{p.commissionRatePct}%</p>
                </div>
                <div className="bg-white border border-slate-200 rounded-xl p-5">
                  <p className="text-xs text-slate-500">Verification Status</p>
                  <p className={`mt-2 text-lg font-bold ${statusColorClass(p.verificationStatus)}`}>{p.verificationStatus}</p>
                </div>
                <div className="bg-white border border-slate-200 rounded-xl p-5">
                  <p className="text-xs text-slate-500">Net Consultation Payouts</p>
                  <p className="mt-2 text-2xl font-bold text-slate-900 font-mono tabular-nums">{formatINR(totalPayout)}</p>
                </div>
              </div>

              <div className="grid lg:grid-cols-12 gap-6">
                <div className="lg:col-span-5 bg-white border border-slate-200 rounded-xl p-6 space-y-3">
                  <h2 className="text-base font-semibold text-slate-900 font-display flex items-center gap-2">
                    <Award className="w-4 h-4 text-blue-800" />
                    Merit Incentive Progression
                  </h2>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Earn points for verified credentials (+15), service setup (+10), admin approval (+100), completed consultations (+20), pro-bono legal aid (+50), and 4+ star reviews (+25).
                  </p>
                  <div className="pt-2">
                    <div className="flex justify-between text-xs font-mono tabular-nums mb-1.5">
                      <span>{p.incentivePoints} pts earned</span>
                      <span>750 pts Platinum</span>
                    </div>
                    <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-blue-800 rounded-full"
                        style={{ width: `${Math.min(100, (p.incentivePoints / 750) * 100)}%` }}
                      />
                    </div>
                  </div>
                </div>

                <div className="lg:col-span-7 bg-white border border-slate-200 rounded-xl p-6">
                  <h2 className="text-base font-semibold text-slate-900 font-display mb-4">Payout Breakdown by Consultation</h2>
                  {earningsChartData.length === 0 ? (
                    <p className="text-sm text-slate-500 py-10 text-center">No settled payments yet.</p>
                  ) : (
                    <div className="h-56">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={earningsChartData}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                          <XAxis dataKey="ref" tick={{ fontSize: 11 }} />
                          <YAxis tick={{ fontSize: 11 }} />
                          <Tooltip />
                          <Bar dataKey="payout" name="Net Payout (INR)" fill="#0f172a" radius={[4, 4, 0, 0]} />
                          <Bar dataKey="fee" name="Platform Fee (INR)" fill="#94a3b8" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'onboarding' && (
            <div className="grid lg:grid-cols-12 gap-6 items-start">
              <div className="lg:col-span-6 bg-white border border-slate-200 rounded-xl p-6">
                <h2 className="text-base font-semibold text-slate-900 font-display">Step 1: Practice Profile</h2>
                <form onSubmit={handleProfileSubmit(onSaveProfile)} className="mt-4 space-y-3.5">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1">Full Name</label>
                      <input type="text" {...regProfile('fullName', { required: true })} className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1">Phone</label>
                      <input type="text" {...regProfile('phone', { required: true })} className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1">Bar / License Reg No.</label>
                      <input type="text" {...regProfile('barRegistrationNo')} className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg font-mono" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1">Base Fee (INR)</label>
                      <input type="number" {...regProfile('consultationFee')} className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg font-mono" />
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1">Exp (Yrs)</label>
                      <input type="number" {...regProfile('experienceYears')} className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg font-mono" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1">City</label>
                      <input type="text" {...regProfile('city')} className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1">State</label>
                      <input type="text" {...regProfile('state')} className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">Bio & Practice Summary</label>
                    <textarea rows={3} {...regProfile('bio')} className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg" />
                  </div>
                  <button type="submit" className="px-4 py-2 text-xs font-semibold text-white bg-slate-900 rounded-lg hover:bg-slate-800 cursor-pointer">
                    Save Practice Profile
                  </button>
                </form>
              </div>

              <div className="lg:col-span-6 space-y-5">
                <div className="bg-white border border-slate-200 rounded-xl p-6">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <h2 className="text-base font-semibold text-slate-900 font-display">Step 2: Upload Credentials & Submit</h2>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Status: <strong className={statusColorClass(p?.verificationStatus)}>{p?.verificationStatus}</strong>
                        {detail?.verificationRemarks ? ` — ${detail.verificationRemarks}` : ''}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={handleSubmitVerification}
                      className="px-3.5 py-2 text-xs font-semibold text-white bg-blue-800 rounded-lg hover:bg-blue-900 cursor-pointer whitespace-nowrap"
                    >
                      Submit for Review
                    </button>
                  </div>

                  <form onSubmit={onUploadCredential} className="mt-4 space-y-3 pt-4 border-t border-slate-100">
                    <div className="grid grid-cols-2 gap-3">
                      <select name="documentType" className="px-3 py-2 text-xs border border-slate-200 rounded-lg bg-white">
                        <option value="BAR_CERTIFICATE">Bar Council Certificate</option>
                        <option value="PRACTICE_LICENSE">Practice / Notary License</option>
                        <option value="DEGREE">LL.B / LL.M Degree</option>
                        <option value="GOVT_ID">Government Identity Card</option>
                      </select>
                      <input type="text" name="credentialNumber" required placeholder="Credential / Roll No." className="px-3 py-2 text-xs border border-slate-200 rounded-lg font-mono" />
                    </div>
                    <input type="text" name="issuingAuthority" required placeholder="Issuing Authority (e.g. Bar Council of Karnataka)" className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg" />
                    <input type="file" name="file" required className="w-full text-xs text-slate-600" />
                    <button type="submit" className="px-4 py-2 text-xs font-semibold text-slate-900 border border-slate-300 rounded-lg hover:bg-slate-50 cursor-pointer">
                      Upload Credential (+15 pts)
                    </button>
                  </form>

                  <div className="mt-4 divide-y divide-slate-100 text-xs">
                    {detail?.credentials?.map((c) => (
                      <div key={c.id} className="py-2.5 flex items-center justify-between">
                        <div>
                          <p className="font-semibold text-slate-900">{c.documentType} · {c.credentialNumber}</p>
                          <p className="text-slate-500">{c.issuingAuthority} · {c.originalFilename}</p>
                        </div>
                        <span className={`font-semibold ${statusColorClass(c.verificationStatus)}`}>{c.verificationStatus}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'services' && (
            <div className="grid lg:grid-cols-12 gap-6 items-start">
              <div className="lg:col-span-6 bg-white border border-slate-200 rounded-xl p-6">
                <h2 className="text-base font-semibold text-slate-900 font-display">Add Service Listing</h2>
                <form onSubmit={handleServiceSubmit(onCreateService)} className="mt-4 space-y-3">
                  <select {...regService('specializationId', { required: true })} className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white">
                    {specializations.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                  <input type="text" {...regService('title', { required: true })} placeholder="Service Title" className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg" />
                  <textarea rows={2} {...regService('description', { required: true })} placeholder="Scope of consultation..." className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg" />
                  <div className="grid grid-cols-3 gap-3">
                    <select {...regService('serviceMode')} className="px-3 py-2 text-xs border border-slate-200 rounded-lg bg-white">
                      <option value="VIDEO">Video</option>
                      <option value="PHONE">Phone</option>
                      <option value="IN_PERSON">In Person</option>
                      <option value="DOCUMENT_REVIEW">Document Review</option>
                    </select>
                    <input type="number" defaultValue={1000} {...regService('fee', { required: true })} placeholder="Fee INR" className="px-3 py-2 text-xs border border-slate-200 rounded-lg font-mono" />
                    <input type="number" defaultValue={30} {...regService('durationMinutes')} placeholder="Minutes" className="px-3 py-2 text-xs border border-slate-200 rounded-lg font-mono" />
                  </div>
                  <label className="flex items-center gap-2 text-xs text-slate-700">
                    <input type="checkbox" {...regService('isProBonoEligible')} />
                    Pro-bono / Legal-aid eligible (+50 pts on completion)
                  </label>
                  <button type="submit" className="px-4 py-2 text-xs font-semibold text-white bg-slate-900 rounded-lg cursor-pointer">
                    Publish Service
                  </button>
                </form>

                <div className="mt-6 divide-y divide-slate-100">
                  {detail?.services?.map((s) => (
                    <div key={s.id} className="py-3 flex items-center justify-between text-xs">
                      <div>
                        <p className="font-semibold text-slate-900">{s.title}</p>
                        <p className="text-slate-500">{s.specializationName} · {formatINR(s.fee)} · {s.durationMinutes}m</p>
                      </div>
                      <button
                        type="button"
                        onClick={async () => { await providerApi.deleteService(s.id); loadAll(); }}
                        className="text-rose-700 hover:underline cursor-pointer"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="lg:col-span-6 bg-white border border-slate-200 rounded-xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-base font-semibold text-slate-900 font-display">Weekly Availability Slots</h2>
                  <button type="button" onClick={handleSaveAvailability} className="px-3.5 py-2 text-xs font-semibold text-white bg-slate-900 rounded-lg cursor-pointer">
                    Save Schedule
                  </button>
                </div>
                <div className="space-y-3">
                  {availRows.map((row, idx) => (
                    <div key={row.dayOfWeek} className="grid grid-cols-4 gap-2 items-center text-xs">
                      <span className="font-semibold text-slate-800">{row.dayOfWeek}</span>
                      <input
                        type="time"
                        value={row.startTime}
                        onChange={(e) => {
                          const copy = [...availRows];
                          copy[idx].startTime = e.target.value;
                          setAvailRows(copy);
                        }}
                        className="px-2 py-1.5 border border-slate-200 rounded font-mono"
                      />
                      <input
                        type="time"
                        value={row.endTime}
                        onChange={(e) => {
                          const copy = [...availRows];
                          copy[idx].endTime = e.target.value;
                          setAvailRows(copy);
                        }}
                        className="px-2 py-1.5 border border-slate-200 rounded font-mono"
                      />
                      <select
                        value={row.slotDurationMinutes}
                        onChange={(e) => {
                          const copy = [...availRows];
                          copy[idx].slotDurationMinutes = Number(e.target.value);
                          setAvailRows(copy);
                        }}
                        className="px-2 py-1.5 border border-slate-200 rounded bg-white font-mono"
                      >
                        <option value={30}>30m</option>
                        <option value={45}>45m</option>
                        <option value={60}>60m</option>
                      </select>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'appointments' && (
            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
              {appointments.length === 0 ? (
                <EmptyState title="No consultation bookings yet" description="Once verified, citizens can discover your profile and book slots." />
              ) : (
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 border-b border-slate-200 text-xs text-slate-600">
                    <tr>
                      <th className="py-3 px-4 font-semibold">Code</th>
                      <th className="py-3 px-4 font-semibold">Citizen</th>
                      <th className="py-3 px-4 font-semibold">Schedule</th>
                      <th className="py-3 px-4 font-semibold">Fee</th>
                      <th className="py-3 px-4 font-semibold">Status</th>
                      <th className="py-3 px-4 font-semibold text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {appointments.map((a) => (
                      <tr key={a.id}>
                        <td className="py-3.5 px-4 font-mono text-xs">{a.appointmentCode}</td>
                        <td className="py-3.5 px-4">
                          <p className="font-medium text-slate-900">{a.citizenName}</p>
                          <p className="text-xs text-slate-500">{a.serviceTitle}</p>
                        </td>
                        <td className="py-3.5 px-4 font-mono text-xs tabular-nums">{a.scheduledDate} · {a.startTime}</td>
                        <td className="py-3.5 px-4 font-mono text-xs tabular-nums">{formatINR(a.feeSnapshot)}</td>
                        <td className={`py-3.5 px-4 text-xs font-semibold ${statusColorClass(a.status)}`}>{a.status}</td>
                        <td className="py-3.5 px-4 text-right space-x-2">
                          {a.status === 'REQUESTED' && (
                            <>
                              <button type="button" onClick={() => handleAppointmentAction(a.id, 'CONFIRMED')} className="px-2.5 py-1 text-xs font-semibold text-white bg-emerald-700 rounded cursor-pointer">Accept</button>
                              <button type="button" onClick={() => handleAppointmentAction(a.id, 'REJECTED')} className="px-2.5 py-1 text-xs font-semibold text-rose-700 border border-rose-200 rounded cursor-pointer">Reject</button>
                            </>
                          )}
                          {(a.status === 'CONFIRMED' || a.status === 'RESCHEDULED') && (
                            <button type="button" onClick={() => handleAppointmentAction(a.id, 'COMPLETED')} className="px-2.5 py-1 text-xs font-semibold text-white bg-slate-900 rounded cursor-pointer">
                              Mark Completed (+20 pts)
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}

          {activeTab === 'requests' && (
            <div className="space-y-4">
              {requests.map((r) => (
                <div key={r.id} className="bg-white border border-slate-200 rounded-xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <p className="text-xs font-mono text-slate-500">{r.requestCode} · {r.citizenName} · {r.specializationName} · {r.urgency}</p>
                    <h3 className="text-base font-semibold text-slate-900 mt-1 font-display">{r.title}</h3>
                    <p className="text-sm text-slate-600 mt-1">{r.description}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className={`text-xs font-semibold mr-2 ${statusColorClass(r.status)}`}>{r.status}</span>
                    {r.status === 'OPEN' && (
                      <button type="button" onClick={() => handleCaseUpdate(r.id, 'IN_PROGRESS')} className="px-3 py-1.5 text-xs font-semibold text-white bg-slate-900 rounded-lg cursor-pointer">
                        Accept Case
                      </button>
                    )}
                    {(r.status === 'ASSIGNED' || r.status === 'IN_PROGRESS') && (
                      <button type="button" onClick={() => handleCaseUpdate(r.id, 'RESOLVED')} className="px-3 py-1.5 text-xs font-semibold text-white bg-emerald-700 rounded-lg cursor-pointer">
                        Mark Resolved
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'earnings' && (
            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 border-b border-slate-200 text-xs text-slate-600">
                  <tr>
                    <th className="py-3 px-4 font-semibold">Receipt</th>
                    <th className="py-3 px-4 font-semibold">Client</th>
                    <th className="py-3 px-4 font-semibold">Gross Fee</th>
                    <th className="py-3 px-4 font-semibold">Platform Commission</th>
                    <th className="py-3 px-4 font-semibold">Net Payout</th>
                    <th className="py-3 px-4 font-semibold">Paid Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {payments.map((pay) => (
                    <tr key={pay.id}>
                      <td className="py-3.5 px-4 font-mono text-xs">{pay.receipt_number || pay.transaction_ref}</td>
                      <td className="py-3.5 px-4">{pay.citizen_name}</td>
                      <td className="py-3.5 px-4 font-mono tabular-nums">{formatINR(pay.amount)}</td>
                      <td className="py-3.5 px-4 font-mono tabular-nums text-slate-600">{formatINR(pay.platform_fee)}</td>
                      <td className="py-3.5 px-4 font-mono tabular-nums font-semibold text-emerald-700">{formatINR(pay.provider_payout)}</td>
                      <td className="py-3.5 px-4 font-mono text-xs text-slate-600">{formatDateShort(pay.paid_at || pay.created_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </DashboardLayout>
  );
}
