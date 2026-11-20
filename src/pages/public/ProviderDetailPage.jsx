import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { Calendar, CheckCircle2, ShieldCheck } from 'lucide-react';
import Navbar from '../../components/common/Navbar';
import Footer from '../../components/common/Footer';
import ProviderAvatar from '../../components/common/ProviderAvatar';
import { marketplaceApi, workflowApi } from '../../api/services';
import { formatDateShort, formatINR, providerTypeLabel } from '../../utils/formatters';

export default function ProviderDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useSelector((state) => state.auth);

  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedService, setSelectedService] = useState(null);
  const [selectedDate, setSelectedDate] = useState(() => {
    const dt = new Date();
    dt.setDate(dt.getDate() + 1);
    return dt.toISOString().slice(0, 10);
  });
  const [slots, setSlots] = useState([]);
  const [selectedSlot, setSelectedSlot] = useState('');
  const [notes, setNotes] = useState('');
  const [bookingState, setBookingState] = useState({ submitting: false, error: '', successAppt: null, paymentOrder: null, paidReceipt: null });

  useEffect(() => {
    setLoading(true);
    marketplaceApi.getProviderDetail(id)
      .then((res) => {
        setDetail(res);
        if (res.services?.length > 0) setSelectedService(res.services[0]);
      })
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    if (!id || !selectedDate) return;
    setSelectedSlot('');
    marketplaceApi.getAvailableSlots(id, selectedDate)
      .then(setSlots)
      .catch(() => setSlots([]));
  }, [id, selectedDate]);

  const handleBookConsultation = async (e) => {
    e.preventDefault();
    if (!user) {
      navigate('/login');
      return;
    }
    if (user.role !== 'CITIZEN') {
      setBookingState((s) => ({ ...s, error: 'Please sign in with a Citizen account to book consultations.' }));
      return;
    }
    if (!selectedService || !selectedSlot) {
      setBookingState((s) => ({ ...s, error: 'Select a service and an available time slot.' }));
      return;
    }

    setBookingState({ submitting: true, error: '', successAppt: null, paymentOrder: null, paidReceipt: null });
    try {
      const appt = await workflowApi.bookAppointment({
        providerId: Number(id),
        serviceId: selectedService.id,
        scheduledDate: selectedDate,
        startTime: selectedSlot,
        mode: selectedService.serviceMode,
        notes,
      });
      const order = await workflowApi.createPaymentOrder({ appointmentId: appt.id });
      setBookingState({ submitting: false, error: '', successAppt: appt, paymentOrder: order, paidReceipt: null });
      marketplaceApi.getAvailableSlots(id, selectedDate).then(setSlots).catch(() => {});
    } catch (err) {
      setBookingState({ submitting: false, error: err.message, successAppt: null, paymentOrder: null, paidReceipt: null });
    }
  };

  const handleCompleteTestPayment = async () => {
    if (!bookingState.paymentOrder) return;
    setBookingState((s) => ({ ...s, submitting: true, error: '' }));
    try {
      const payment = await workflowApi.verifyPayment({
        gatewayOrderId: bookingState.paymentOrder.gateway_order_id,
        gatewayPaymentId: `pay_test_${Date.now()}`,
        signature: `mock_sig_${Date.now()}`,
      });
      setBookingState((s) => ({ ...s, submitting: false, paidReceipt: payment }));
    } catch (err) {
      setBookingState((s) => ({ ...s, submitting: false, error: err.message }));
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col">
        <Navbar />
        <div className="max-w-[1280px] w-full mx-auto px-6 py-10">
          <div className="h-64 bg-white border border-slate-200 rounded-xl animate-pulse" />
        </div>
      </div>
    );
  }

  if (!detail) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col">
        <Navbar />
        <div className="max-w-[1280px] w-full mx-auto px-6 py-12">
          <p className="text-slate-600">Provider profile not found.</p>
          <Link to="/marketplace" className="text-sm text-blue-800 underline mt-2 inline-block">Return to Marketplace</Link>
        </div>
      </div>
    );
  }

  const p = detail.profile;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Navbar />

      <main className="flex-1 max-w-[1280px] w-full mx-auto px-6 py-8">
        <div className="mb-4 text-xs text-slate-500">
          <Link to="/marketplace" className="hover:text-slate-900">Marketplace</Link> / <span className="text-slate-900">{p.fullName}</span>
        </div>

        <div className="grid lg:grid-cols-12 gap-8 items-start">
          {/* Left Column: Credentials, Services, Reviews */}
          <div className="lg:col-span-7 space-y-6">
            <section className="bg-white border border-slate-200 rounded-xl p-6">
              <div className="flex flex-col sm:flex-row sm:items-start gap-5">
                <ProviderAvatar src={p.avatarUrl} name={p.fullName} size="lg" />
                <div className="flex-1">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <h1 className="text-2xl font-bold text-slate-900 font-display">{p.fullName}</h1>
                    <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700">
                      <ShieldCheck className="w-4 h-4" />
                      {p.verificationStatus} · {p.incentiveTier} Tier
                    </span>
                  </div>
                  <p className="text-sm text-slate-600 mt-1">
                    {providerTypeLabel(p.providerType)} · {p.city}, {p.state} · {p.experienceYears} years experience
                  </p>
                  <p className="text-xs text-slate-500 mt-2 font-mono tabular-nums">
                    Bar / Reg No: {detail.barRegistrationNo || 'Verified'} · Languages: {p.languagesSpoken} · {Number(p.avgRating || 0).toFixed(1)} rating ({p.totalReviews} reviews)
                  </p>
                  <p className="mt-4 text-sm text-slate-700 leading-relaxed">{p.bio}</p>
                </div>
              </div>
            </section>

            {/* Services */}
            <section className="bg-white border border-slate-200 rounded-xl p-6">
              <h2 className="text-base font-semibold text-slate-900 font-display">Consultation & Legal Services</h2>
              <div className="mt-4 divide-y divide-slate-100">
                {detail.services?.map((srv) => (
                  <div key={srv.id} className="py-4 first:pt-0 last:pb-0 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <p className="text-sm font-semibold text-slate-900">{srv.title}</p>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {srv.specializationName} · {srv.serviceMode} · {srv.durationMinutes} mins
                        {srv.isProBonoEligible ? ' · Legal-Aid Eligible' : ''}
                      </p>
                      <p className="text-xs text-slate-600 mt-1.5 leading-relaxed">{srv.description}</p>
                    </div>
                    <div className="flex sm:flex-col items-center sm:items-end justify-between gap-2 shrink-0">
                      <span className="text-base font-bold text-slate-900 font-mono tabular-nums">{formatINR(srv.fee)}</span>
                      <button
                        type="button"
                        onClick={() => setSelectedService(srv)}
                        className={`px-3 py-1.5 text-xs font-medium rounded-lg border cursor-pointer ${
                          selectedService?.id === srv.id
                            ? 'bg-slate-900 text-white border-slate-900'
                            : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        {selectedService?.id === srv.id ? 'Selected' : 'Select'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* Verified Credentials & Reviews */}
            <section className="bg-white border border-slate-200 rounded-xl p-6">
              <h2 className="text-base font-semibold text-slate-900 font-display">Audited Credentials</h2>
              <div className="mt-3 divide-y divide-slate-100 text-sm">
                {detail.credentials?.map((c) => (
                  <div key={c.id} className="py-3 flex items-center justify-between gap-4">
                    <div>
                      <p className="font-medium text-slate-900">{c.documentType.replace(/_/g, ' ')}</p>
                      <p className="text-xs text-slate-500">{c.issuingAuthority} · <span className="font-mono">{c.credentialNumber}</span></p>
                    </div>
                    <span className="text-xs font-semibold text-emerald-700">{c.verificationStatus}</span>
                  </div>
                ))}
              </div>
            </section>

            <section className="bg-white border border-slate-200 rounded-xl p-6">
              <h2 className="text-base font-semibold text-slate-900 font-display">Verified Client Reviews</h2>
              {detail.reviews?.length === 0 ? (
                <p className="text-sm text-slate-500 mt-3">No reviews recorded yet.</p>
              ) : (
                <div className="mt-4 divide-y divide-slate-100">
                  {detail.reviews?.map((r) => (
                    <div key={r.id} className="py-4 first:pt-0 last:pb-0">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-slate-900">{r.citizen_name}</span>
                        <span className="font-mono tabular-nums text-slate-600">{r.rating} / 5 · {formatDateShort(r.created_at)}</span>
                      </div>
                      <p className="text-sm text-slate-600 mt-1.5 leading-relaxed">{r.comment}</p>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>

          {/* Right Column: Booking & Razorpay Test Payment */}
          <aside className="lg:col-span-5 bg-white border border-slate-200 rounded-xl p-6 sticky top-24">
            <h2 className="text-lg font-bold text-slate-900 font-display flex items-center gap-2">
              <Calendar className="w-5 h-5 text-slate-700" />
              Schedule Consultation
            </h2>

            {bookingState.paidReceipt ? (
              <div className="mt-5 p-5 bg-emerald-50 border border-emerald-200 rounded-xl space-y-3">
                <div className="flex items-center gap-2 text-emerald-800 font-semibold text-sm">
                  <CheckCircle2 className="w-5 h-5" />
                  Booking & Payment Confirmed
                </div>
                <p className="text-xs text-slate-700">
                  Appointment <span className="font-mono font-semibold">{bookingState.successAppt.appointment_code}</span> scheduled for {selectedDate} at {selectedSlot}.
                </p>
                <p className="text-xs text-slate-700 font-mono">
                  Receipt: {bookingState.paidReceipt.receipt_number} · Amount: {formatINR(bookingState.paidReceipt.amount)}
                </p>
                <Link
                  to="/citizen"
                  className="inline-block mt-2 px-4 py-2 text-xs font-semibold text-white bg-slate-900 rounded-lg hover:bg-slate-800"
                >
                  Open Citizen Portal
                </Link>
              </div>
            ) : bookingState.paymentOrder ? (
              <div className="mt-5 space-y-4">
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-sm space-y-1.5">
                  <p className="font-semibold text-slate-900">Appointment Reserved: {bookingState.successAppt.appointment_code}</p>
                  <p className="text-xs text-slate-600">Complete test-mode Razorpay checkout to finalize receipt.</p>
                  <p className="text-base font-bold text-slate-900 font-mono tabular-nums pt-2">
                    Total Payable: {formatINR(bookingState.paymentOrder.amount)}
                  </p>
                  <p className="text-[11px] text-slate-500 font-mono">Order ID: {bookingState.paymentOrder.gateway_order_id}</p>
                </div>
                {bookingState.error && <p className="text-xs text-rose-700">{bookingState.error}</p>}
                <button
                  type="button"
                  disabled={bookingState.submitting}
                  onClick={handleCompleteTestPayment}
                  className="w-full py-2.5 px-4 text-sm font-semibold text-white bg-blue-800 rounded-lg hover:bg-blue-900 cursor-pointer disabled:opacity-50"
                >
                  {bookingState.submitting ? 'Verifying Signature...' : 'Complete Razorpay Test Payment'}
                </button>
              </div>
            ) : (
              <form onSubmit={handleBookConsultation} className="mt-5 space-y-4">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Selected Service</label>
                  <select
                    value={selectedService?.id || ''}
                    onChange={(e) => {
                      const found = detail.services.find((s) => s.id === Number(e.target.value));
                      setSelectedService(found || null);
                    }}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white"
                  >
                    {detail.services?.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.title} — {formatINR(s.fee)} ({s.durationMinutes}m)
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Consultation Date</label>
                  <input
                    type="date"
                    value={selectedDate}
                    min={new Date().toISOString().slice(0, 10)}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-2">Available Time Slots</label>
                  {slots.length === 0 ? (
                    <p className="text-xs text-slate-500 p-3 bg-slate-50 border border-slate-200 rounded-lg">
                      No schedule published for this weekday. Try Monday–Friday.
                    </p>
                  ) : (
                    <div className="grid grid-cols-3 gap-2">
                      {slots.map((slot) => (
                        <button
                          key={slot.startTime}
                          type="button"
                          disabled={!slot.available}
                          onClick={() => setSelectedSlot(slot.startTime)}
                          className={`py-2 px-2 text-xs font-mono tabular-nums rounded-lg border transition-colors ${
                            !slot.available
                              ? 'bg-slate-100 text-slate-400 border-slate-200 line-through cursor-not-allowed'
                              : selectedSlot === slot.startTime
                                ? 'bg-slate-900 text-white border-slate-900 cursor-pointer'
                                : 'bg-white text-slate-700 border-slate-200 hover:border-slate-400 cursor-pointer'
                          }`}
                        >
                          {slot.startTime}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Brief Case Summary</label>
                  <textarea
                    rows={3}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Share context or key dates for the consultation..."
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg"
                  />
                </div>

                {bookingState.error && (
                  <p className="text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded-lg p-2.5">{bookingState.error}</p>
                )}

                <button
                  type="submit"
                  disabled={bookingState.submitting}
                  className="w-full py-2.5 px-4 text-sm font-semibold text-white bg-slate-900 rounded-lg hover:bg-slate-800 cursor-pointer disabled:opacity-50"
                >
                  {bookingState.submitting ? 'Reserving Slot...' : user ? 'Reserve Slot & Proceed to Payment' : 'Sign In to Book Consultation'}
                </button>
              </form>
            )}
          </aside>
        </div>
      </main>

      <Footer />
    </div>
  );
}
