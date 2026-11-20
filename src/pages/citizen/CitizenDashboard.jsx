import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { Calendar, CreditCard, FileText, FolderOpen, LayoutDashboard, Star, User } from 'lucide-react';
import DashboardLayout from '../../components/common/DashboardLayout';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import EmptyState from '../../components/common/EmptyState';
import { citizenApi, marketplaceApi, workflowApi } from '../../api/services';
import { formatDateShort, formatINR, statusColorClass } from '../../utils/formatters';

export default function CitizenDashboard() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState(searchParams.get('tab') || 'overview');
  const [loading, setLoading] = useState(true);
  const [appointments, setAppointments] = useState([]);
  const [requests, setRequests] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [payments, setPayments] = useState([]);
  const [specializations, setSpecializations] = useState([]);
  const [feedback, setFeedback] = useState({ type: '', text: '' });

  const [cancelTarget, setCancelTarget] = useState(null);
  const [reviewTarget, setReviewTarget] = useState(null);
  const [reviewForm, setReviewForm] = useState({ rating: 5, comment: '' });
  const [rescheduleTarget, setRescheduleTarget] = useState(null);
  const [rescheduleForm, setRescheduleForm] = useState({ date: '', time: '11:00' });

  const { register: regCase, handleSubmit: handleCaseSubmit, reset: resetCase } = useForm();
  const { register: regProfile, handleSubmit: handleProfileSubmit, reset: resetProfile } = useForm();

  const navItems = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    { id: 'appointments', label: 'Appointments', icon: Calendar },
    { id: 'requests', label: 'Case Assistance', icon: FolderOpen },
    { id: 'documents', label: 'Case Documents', icon: FileText },
    { id: 'payments', label: 'Payments & Receipts', icon: CreditCard },
    { id: 'profile', label: 'My Profile', icon: User },
  ];

  const loadAll = async () => {
    setLoading(true);
    try {
      const [appts, reqs, docs, pays, specs, prof] = await Promise.all([
        workflowApi.getMyAppointments({ page: 0, size: 30 }),
        workflowApi.getCaseRequests(),
        workflowApi.getDocuments(),
        workflowApi.getPaymentHistory(),
        marketplaceApi.getSpecializations(),
        citizenApi.getProfile(),
      ]);
      setAppointments(appts.content || []);
      setRequests(reqs.content || []);
      setDocuments(docs || []);
      setPayments(pays || []);
      setSpecializations(specs || []);
      if (prof) {
        resetProfile({
          fullName: prof.full_name || '',
          phone: prof.phone || '',
          city: prof.city || '',
          state: prof.state || '',
          preferredLanguage: prof.preferred_language || 'English',
          addressLine: prof.address_line || '',
        });
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

  const switchTab = (tab) => {
    setActiveTab(tab);
    setSearchParams({ tab }, { replace: true });
    setFeedback({ type: '', text: '' });
  };

  const handleCancelAppointment = async () => {
    if (!cancelTarget) return;
    try {
      await workflowApi.updateAppointmentStatus(cancelTarget.id, { status: 'CANCELLED', reason: 'Cancelled by citizen' });
      setCancelTarget(null);
      setFeedback({ type: 'success', text: 'Appointment cancelled.' });
      loadAll();
    } catch (err) {
      setFeedback({ type: 'error', text: err.message });
    }
  };

  const handlePayNow = async (appt) => {
    try {
      const order = await workflowApi.createPaymentOrder({ appointmentId: appt.id });
      await workflowApi.verifyPayment({
        gatewayOrderId: order.gateway_order_id,
        gatewayPaymentId: `pay_test_${Date.now()}`,
        signature: `mock_sig_${Date.now()}`,
      });
      setFeedback({ type: 'success', text: `Payment settled for ${appt.appointmentCode}.` });
      loadAll();
    } catch (err) {
      setFeedback({ type: 'error', text: err.message });
    }
  };

  const handleSubmitReschedule = async (e) => {
    e.preventDefault();
    try {
      await workflowApi.updateAppointmentStatus(rescheduleTarget.id, {
        status: 'RESCHEDULED',
        newScheduledDate: rescheduleForm.date,
        newStartTime: rescheduleForm.time,
      });
      setRescheduleTarget(null);
      setFeedback({ type: 'success', text: 'Appointment rescheduled.' });
      loadAll();
    } catch (err) {
      setFeedback({ type: 'error', text: err.message });
    }
  };

  const handleSubmitReview = async (e) => {
    e.preventDefault();
    try {
      await workflowApi.createReview({
        appointmentId: reviewTarget.id,
        rating: Number(reviewForm.rating),
        comment: reviewForm.comment,
      });
      setReviewTarget(null);
      setReviewForm({ rating: 5, comment: '' });
      setFeedback({ type: 'success', text: 'Thank you! Review published to provider profile.' });
      loadAll();
    } catch (err) {
      setFeedback({ type: 'error', text: err.message });
    }
  };

  const onCreateCase = async (values) => {
    try {
      await workflowApi.createCaseRequest(values);
      resetCase();
      setFeedback({ type: 'success', text: 'Legal assistance request created.' });
      loadAll();
    } catch (err) {
      setFeedback({ type: 'error', text: err.message });
    }
  };

  const handleDocUpload = async (e) => {
    e.preventDefault();
    const form = e.target;
    const file = form.file?.files?.[0];
    if (!file) return;
    const fd = new FormData();
    fd.append('file', file);
    fd.append('documentTitle', form.documentTitle.value || file.name);
    if (form.appointmentId.value) fd.append('appointmentId', form.appointmentId.value);
    if (form.serviceRequestId.value) fd.append('serviceRequestId', form.serviceRequestId.value);
    try {
      await workflowApi.uploadDocument(fd);
      form.reset();
      setFeedback({ type: 'success', text: 'Case document uploaded securely.' });
      loadAll();
    } catch (err) {
      setFeedback({ type: 'error', text: err.message });
    }
  };

  const handleDownload = async (doc) => {
    try {
      const res = await workflowApi.downloadDocumentBlob(doc.id);
      const url = URL.createObjectURL(res.data);
      const a = document.createElement('a');
      a.href = url;
      a.download = doc.original_filename;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setFeedback({ type: 'error', text: err.message });
    }
  };

  const onSaveProfile = async (values) => {
    try {
      await citizenApi.updateProfile(values);
      setFeedback({ type: 'success', text: 'Citizen profile updated.' });
    } catch (err) {
      setFeedback({ type: 'error', text: err.message });
    }
  };

  const totalPaid = payments.filter((p) => p.status === 'PAID').reduce((acc, p) => acc + Number(p.amount), 0);

  return (
    <DashboardLayout
      title="Citizen Legal Portal"
      subtitle="Manage consultations, legal assistance requests, documents, and payment receipts"
      navItems={navItems}
      activeTab={activeTab}
      onTabChange={switchTab}
    >
      {feedback.text && (
        <div
          className={`mb-5 p-3.5 rounded-xl border text-xs font-medium ${
            feedback.type === 'error'
              ? 'bg-rose-50 border-rose-200 text-rose-800'
              : 'bg-emerald-50 border-emerald-200 text-emerald-800'
          }`}
        >
          {feedback.text}
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => <div key={i} className="h-28 bg-white border border-slate-200 rounded-xl animate-pulse" />)}
        </div>
      ) : (
        <>
          {activeTab === 'overview' && (
            <div className="space-y-6">
              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white border border-slate-200 rounded-xl p-5">
                  <p className="text-xs text-slate-500">Total Consultations</p>
                  <p className="mt-2 text-2xl font-bold text-slate-900 font-mono tabular-nums">{appointments.length}</p>
                </div>
                <div className="bg-white border border-slate-200 rounded-xl p-5">
                  <p className="text-xs text-slate-500">Case Assistance Tickets</p>
                  <p className="mt-2 text-2xl font-bold text-slate-900 font-mono tabular-nums">{requests.length}</p>
                </div>
                <div className="bg-white border border-slate-200 rounded-xl p-5">
                  <p className="text-xs text-slate-500">Case Documents</p>
                  <p className="mt-2 text-2xl font-bold text-slate-900 font-mono tabular-nums">{documents.length}</p>
                </div>
                <div className="bg-white border border-slate-200 rounded-xl p-5">
                  <p className="text-xs text-slate-500">Total Fees Paid</p>
                  <p className="mt-2 text-2xl font-bold text-slate-900 font-mono tabular-nums">{formatINR(totalPaid)}</p>
                </div>
              </div>

              <div className="bg-white border border-slate-200 rounded-xl p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-base font-semibold text-slate-900 font-display">Need a consultation or case review?</h2>
                  <p className="text-sm text-slate-600 mt-1">Search Bar-verified advocates, mediators, arbitrators, and notaries across India.</p>
                </div>
                <Link
                  to="/marketplace"
                  className="px-4 py-2.5 text-xs font-semibold text-white bg-slate-900 rounded-lg hover:bg-slate-800 whitespace-nowrap"
                >
                  Search Legal Marketplace
                </Link>
              </div>
            </div>
          )}

          {activeTab === 'appointments' && (
            <div className="space-y-4">
              {appointments.length === 0 ? (
                <EmptyState
                  title="No appointments booked yet"
                  description="Browse verified legal service providers to reserve your first consultation."
                  actionLabel="Browse Marketplace"
                  onAction={() => { window.location.href = '/marketplace'; }}
                />
              ) : (
                <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                      <thead className="bg-slate-50 border-b border-slate-200 text-xs text-slate-600">
                        <tr>
                          <th className="py-3 px-4 font-semibold">Code</th>
                          <th className="py-3 px-4 font-semibold">Provider & Service</th>
                          <th className="py-3 px-4 font-semibold">Schedule</th>
                          <th className="py-3 px-4 font-semibold">Fee</th>
                          <th className="py-3 px-4 font-semibold">Status</th>
                          <th className="py-3 px-4 font-semibold text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {appointments.map((a) => (
                          <tr key={a.id} className="hover:bg-slate-50/60">
                            <td className="py-3.5 px-4 font-mono text-xs text-slate-700">{a.appointmentCode}</td>
                            <td className="py-3.5 px-4">
                              <p className="font-medium text-slate-900">{a.providerName}</p>
                              <p className="text-xs text-slate-500">{a.serviceTitle} · {a.mode}</p>
                            </td>
                            <td className="py-3.5 px-4 font-mono text-xs tabular-nums text-slate-700">
                              {a.scheduledDate} · {a.startTime}–{a.endTime}
                            </td>
                            <td className="py-3.5 px-4 font-mono text-xs tabular-nums font-semibold text-slate-900">
                              {formatINR(a.feeSnapshot)} · <span className={statusColorClass(a.paymentStatus)}>{a.paymentStatus}</span>
                            </td>
                            <td className={`py-3.5 px-4 text-xs font-semibold ${statusColorClass(a.status)}`}>{a.status}</td>
                            <td className="py-3.5 px-4 text-right space-x-2 whitespace-nowrap">
                              {a.paymentStatus !== 'PAID' && a.status !== 'CANCELLED' && a.status !== 'REJECTED' && (
                                <button
                                  type="button"
                                  onClick={() => handlePayNow(a)}
                                  className="px-2.5 py-1 text-xs font-medium text-white bg-blue-800 rounded hover:bg-blue-900 cursor-pointer"
                                >
                                  Pay Now
                                </button>
                              )}
                              {(a.status === 'REQUESTED' || a.status === 'CONFIRMED') && (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => { setRescheduleTarget(a); setRescheduleForm({ date: a.scheduledDate, time: a.startTime }); }}
                                    className="px-2.5 py-1 text-xs font-medium text-slate-700 border border-slate-200 rounded hover:bg-slate-50 cursor-pointer"
                                  >
                                    Reschedule
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setCancelTarget(a)}
                                    className="px-2.5 py-1 text-xs font-medium text-rose-700 border border-rose-200 rounded hover:bg-rose-50 cursor-pointer"
                                  >
                                    Cancel
                                  </button>
                                </>
                              )}
                              {a.status === 'COMPLETED' && !a.hasReview && (
                                <button
                                  type="button"
                                  onClick={() => setReviewTarget(a)}
                                  className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-slate-900 border border-slate-300 rounded hover:bg-slate-100 cursor-pointer"
                                >
                                  <Star className="w-3 h-3" /> Leave Review
                                </button>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'requests' && (
            <div className="grid lg:grid-cols-12 gap-6 items-start">
              <div className="lg:col-span-5 bg-white border border-slate-200 rounded-xl p-6">
                <h2 className="text-base font-semibold text-slate-900 font-display">Submit Case Assistance Request</h2>
                <form onSubmit={handleCaseSubmit(onCreateCase)} className="mt-4 space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">Specialization</label>
                    <select {...regCase('specializationId', { required: true })} className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white">
                      {specializations.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">Matter Title</label>
                    <input type="text" {...regCase('title', { required: true })} placeholder="e.g. RERA Builder Delay Notice" className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1">Urgency</label>
                      <select {...regCase('urgency')} className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white">
                        <option value="LOW">Low</option>
                        <option value="MEDIUM">Medium</option>
                        <option value="HIGH">High</option>
                        <option value="URGENT">Urgent</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1">Max Budget (INR)</label>
                      <input type="number" {...regCase('budgetMax')} placeholder="5000" className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg font-mono" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">Requirement Summary</label>
                    <textarea rows={4} {...regCase('description', { required: true })} placeholder="Describe facts, timeline, and relief sought..." className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg" />
                  </div>
                  <label className="flex items-center gap-2 text-xs text-slate-700">
                    <input type="checkbox" {...regCase('isProBonoRequested')} className="rounded" />
                    Request Pro-Bono / Legal-Aid Consideration
                  </label>
                  <button type="submit" className="w-full py-2.5 text-xs font-semibold text-white bg-slate-900 rounded-lg hover:bg-slate-800 cursor-pointer">
                    Create Case Request
                  </button>
                </form>
              </div>

              <div className="lg:col-span-7 space-y-3">
                {requests.length === 0 ? (
                  <EmptyState title="No case requests yet" description="Use the form on the left to submit a structured legal assistance ticket." />
                ) : (
                  requests.map((r) => (
                    <div key={r.id} className="bg-white border border-slate-200 rounded-xl p-5">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className="text-xs font-mono text-slate-500">{r.requestCode} · {r.specializationName} · {r.urgency}</p>
                          <h3 className="text-base font-semibold text-slate-900 mt-1 font-display">{r.title}</h3>
                        </div>
                        <span className={`text-xs font-semibold ${statusColorClass(r.status)}`}>{r.status}</span>
                      </div>
                      <p className="text-sm text-slate-600 mt-2 leading-relaxed">{r.description}</p>
                      <div className="mt-3 pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
                        <span>Assigned Counsel: <strong className="text-slate-800">{r.assignedProviderName || 'Awaiting Counsel Match'}</strong></span>
                        {r.providerNotes && <span className="text-slate-700">Notes: {r.providerNotes}</span>}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {activeTab === 'documents' && (
            <div className="grid lg:grid-cols-12 gap-6 items-start">
              <div className="lg:col-span-5 bg-white border border-slate-200 rounded-xl p-6">
                <h2 className="text-base font-semibold text-slate-900 font-display">Upload Case Document</h2>
                <form onSubmit={handleDocUpload} className="mt-4 space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">Document Title</label>
                    <input type="text" name="documentTitle" required placeholder="e.g. Registered Sale Agreement" className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">Link to Appointment (Optional)</label>
                    <select name="appointmentId" className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white">
                      <option value="">None</option>
                      {appointments.map((a) => <option key={a.id} value={a.id}>{a.appointmentCode} — {a.providerName}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">Link to Case Request (Optional)</label>
                    <select name="serviceRequestId" className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white">
                      <option value="">None</option>
                      {requests.map((r) => <option key={r.id} value={r.id}>{r.requestCode} — {r.title}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">Select File (PDF / Image / Doc, max 10MB)</label>
                    <input type="file" name="file" required className="w-full text-xs text-slate-600" />
                  </div>
                  <button type="submit" className="w-full py-2.5 text-xs font-semibold text-white bg-slate-900 rounded-lg hover:bg-slate-800 cursor-pointer">
                    Upload Secure Document
                  </button>
                </form>
              </div>

              <div className="lg:col-span-7 bg-white border border-slate-200 rounded-xl overflow-hidden">
                {documents.length === 0 ? (
                  <EmptyState title="No case documents uploaded" description="Documents attached to your appointments or case tickets appear here with strict access control." />
                ) : (
                  <table className="w-full text-left text-sm">
                    <thead className="bg-slate-50 border-b border-slate-200 text-xs text-slate-600">
                      <tr>
                        <th className="py-3 px-4 font-semibold">Document</th>
                        <th className="py-3 px-4 font-semibold">Size</th>
                        <th className="py-3 px-4 font-semibold">Uploaded</th>
                        <th className="py-3 px-4 font-semibold text-right">Download</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {documents.map((d) => (
                        <tr key={d.id}>
                          <td className="py-3 px-4">
                            <p className="font-medium text-slate-900">{d.document_title}</p>
                            <p className="text-xs text-slate-500 font-mono">{d.original_filename}</p>
                          </td>
                          <td className="py-3 px-4 font-mono text-xs tabular-nums text-slate-600">
                            {Math.max(1, Math.round(d.file_size_bytes / 1024))} KB
                          </td>
                          <td className="py-3 px-4 font-mono text-xs text-slate-600">{formatDateShort(d.created_at)}</td>
                          <td className="py-3 px-4 text-right">
                            <button
                              type="button"
                              onClick={() => handleDownload(d)}
                              className="text-xs font-semibold text-blue-800 hover:underline cursor-pointer"
                            >
                              Download
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          )}

          {activeTab === 'payments' && (
            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 border-b border-slate-200 text-xs text-slate-600">
                  <tr>
                    <th className="py-3 px-4 font-semibold">Receipt / Txn Ref</th>
                    <th className="py-3 px-4 font-semibold">Provider</th>
                    <th className="py-3 px-4 font-semibold">Amount</th>
                    <th className="py-3 px-4 font-semibold">Method</th>
                    <th className="py-3 px-4 font-semibold">Status</th>
                    <th className="py-3 px-4 font-semibold">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {payments.map((p) => (
                    <tr key={p.id}>
                      <td className="py-3.5 px-4 font-mono text-xs">
                        <p className="font-semibold text-slate-900">{p.receipt_number || 'Pending'}</p>
                        <p className="text-slate-500">{p.transaction_ref}</p>
                      </td>
                      <td className="py-3.5 px-4 text-slate-800">{p.provider_name}</td>
                      <td className="py-3.5 px-4 font-mono tabular-nums font-semibold text-slate-900">{formatINR(p.amount)}</td>
                      <td className="py-3.5 px-4 text-xs text-slate-600">{p.payment_method}</td>
                      <td className={`py-3.5 px-4 text-xs font-semibold ${statusColorClass(p.status)}`}>{p.status}</td>
                      <td className="py-3.5 px-4 font-mono text-xs text-slate-600">{formatDateShort(p.paid_at || p.created_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {activeTab === 'profile' && (
            <div className="max-w-xl bg-white border border-slate-200 rounded-xl p-6">
              <h2 className="text-base font-semibold text-slate-900 font-display">Citizen Profile Settings</h2>
              <form onSubmit={handleProfileSubmit(onSaveProfile)} className="mt-4 space-y-4">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Full Name</label>
                  <input type="text" {...regProfile('fullName', { required: true })} className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">Phone</label>
                    <input type="text" {...regProfile('phone')} className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">Preferred Language</label>
                    <input type="text" {...regProfile('preferredLanguage')} className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
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
                  <label className="block text-xs font-medium text-slate-700 mb-1">Address</label>
                  <input type="text" {...regProfile('addressLine')} className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg" />
                </div>
                <button type="submit" className="px-5 py-2.5 text-xs font-semibold text-white bg-slate-900 rounded-lg hover:bg-slate-800 cursor-pointer">
                  Save Profile
                </button>
              </form>
            </div>
          )}
        </>
      )}

      <ConfirmDialog
        open={Boolean(cancelTarget)}
        title="Cancel Consultation"
        message={`Cancel appointment ${cancelTarget?.appointmentCode} with ${cancelTarget?.providerName}?`}
        confirmLabel="Cancel Appointment"
        danger
        onConfirm={handleCancelAppointment}
        onCancel={() => setCancelTarget(null)}
      />

      {reviewTarget && (
        <div className="fixed inset-0 z-50 bg-slate-950/50 flex items-center justify-center p-4">
          <form onSubmit={handleSubmitReview} className="bg-white border border-slate-200 rounded-xl max-w-md w-full p-6 space-y-4">
            <h3 className="text-base font-semibold text-slate-900 font-display">Review {reviewTarget.providerName}</h3>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Rating (1–5)</label>
              <select
                value={reviewForm.rating}
                onChange={(e) => setReviewForm({ ...reviewForm, rating: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg"
              >
                {[5, 4, 3, 2, 1].map((n) => <option key={n} value={n}>{n} Stars</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Consultation Feedback</label>
              <textarea
                rows={3}
                required
                value={reviewForm.comment}
                onChange={(e) => setReviewForm({ ...reviewForm, comment: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg"
              />
            </div>
            <div className="flex justify-end gap-3">
              <button type="button" onClick={() => setReviewTarget(null)} className="px-4 py-2 text-xs font-medium border border-slate-200 rounded-lg cursor-pointer">Cancel</button>
              <button type="submit" className="px-4 py-2 text-xs font-semibold text-white bg-slate-900 rounded-lg cursor-pointer">Submit Review</button>
            </div>
          </form>
        </div>
      )}

      {rescheduleTarget && (
        <div className="fixed inset-0 z-50 bg-slate-950/50 flex items-center justify-center p-4">
          <form onSubmit={handleSubmitReschedule} className="bg-white border border-slate-200 rounded-xl max-w-md w-full p-6 space-y-4">
            <h3 className="text-base font-semibold text-slate-900 font-display">Reschedule {rescheduleTarget.appointmentCode}</h3>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">New Date</label>
              <input type="date" required value={rescheduleForm.date} onChange={(e) => setRescheduleForm({ ...rescheduleForm, date: e.target.value })} className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg font-mono" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">New Start Time (HH:MM)</label>
              <input type="time" required value={rescheduleForm.time} onChange={(e) => setRescheduleForm({ ...rescheduleForm, time: e.target.value })} className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg font-mono" />
            </div>
            <div className="flex justify-end gap-3">
              <button type="button" onClick={() => setRescheduleTarget(null)} className="px-4 py-2 text-xs font-medium border border-slate-200 rounded-lg cursor-pointer">Cancel</button>
              <button type="submit" className="px-4 py-2 text-xs font-semibold text-white bg-slate-900 rounded-lg cursor-pointer">Confirm Reschedule</button>
            </div>
          </form>
        </div>
      )}
    </DashboardLayout>
  );
}
