import { useEffect, useState } from 'react';
import { BarChart3, CheckSquare, FileCheck2, ShieldAlert, Users } from 'lucide-react';
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import DashboardLayout from '../../components/common/DashboardLayout';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import EmptyState from '../../components/common/EmptyState';
import { adminApi } from '../../api/services';
import { formatDateShort, formatINR, statusColorClass } from '../../utils/formatters';

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState('analytics');
  const [loading, setLoading] = useState(true);
  const [analytics, setAnalytics] = useState(null);
  const [pendingProviders, setPendingProviders] = useState([]);
  const [users, setUsers] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [remarksMap, setRemarksMap] = useState({});
  const [userActionTarget, setUserActionTarget] = useState(null);
  const [feedback, setFeedback] = useState({ type: '', text: '' });

  const navItems = [
    { id: 'analytics', label: 'Platform Analytics', icon: BarChart3 },
    { id: 'verifications', label: 'Verification Queue', icon: CheckSquare },
    { id: 'users', label: 'User Governance', icon: Users },
    { id: 'audit', label: 'Admin Audit Logs', icon: ShieldAlert },
  ];

  const loadAll = async () => {
    setLoading(true);
    try {
      const [an, pending, usrs, logs] = await Promise.all([
        adminApi.getAnalytics(),
        adminApi.getPendingProviders(),
        adminApi.getUsers(),
        adminApi.getAuditLogs(),
      ]);
      setAnalytics(an);
      setPendingProviders(pending || []);
      setUsers(usrs || []);
      setAuditLogs(logs || []);
    } catch (err) {
      setFeedback({ type: 'error', text: err.message });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
  }, []);

  const handleVerifyDecision = async (providerId, status) => {
    try {
      await adminApi.verifyProvider(providerId, {
        verificationStatus: status,
        remarks: remarksMap[providerId] || `Decision: ${status}`,
      });
      setFeedback({ type: 'success', text: `Provider #${providerId} marked ${status} and logged to audit trail.` });
      loadAll();
    } catch (err) {
      setFeedback({ type: 'error', text: err.message });
    }
  };

  const handleConfirmUserStatus = async () => {
    if (!userActionTarget) return;
    const nextStatus = userActionTarget.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE';
    try {
      await adminApi.updateUserStatus(userActionTarget.id, {
        status: nextStatus,
        reason: `Admin governance toggle to ${nextStatus}`,
      });
      setUserActionTarget(null);
      setFeedback({ type: 'success', text: `User status updated to ${nextStatus}.` });
      loadAll();
    } catch (err) {
      setFeedback({ type: 'error', text: err.message });
    }
  };

  return (
    <DashboardLayout
      title="Platform Administration Console"
      subtitle="Verify legal credentials, monitor marketplace transactions, and inspect immutable audit trails"
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
        <div className="h-44 bg-white border border-slate-200 rounded-xl animate-pulse" />
      ) : (
        <>
          {activeTab === 'analytics' && analytics && (
            <div className="space-y-6">
              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white border border-slate-200 rounded-xl p-5">
                  <p className="text-xs text-slate-500">Registered Users</p>
                  <p className="mt-2 text-2xl font-bold text-slate-900 font-mono tabular-nums">{analytics.totalUsers}</p>
                  <p className="mt-1 text-xs text-slate-500">{analytics.totalCitizens} citizens · {analytics.totalProviders} providers</p>
                </div>
                <div className="bg-white border border-slate-200 rounded-xl p-5">
                  <p className="text-xs text-slate-500">Pending Verifications</p>
                  <p className="mt-2 text-2xl font-bold text-amber-700 font-mono tabular-nums">{analytics.pendingVerifications}</p>
                  <p className="mt-1 text-xs text-slate-500">{analytics.approvedProviders} approved practitioners</p>
                </div>
                <div className="bg-white border border-slate-200 rounded-xl p-5">
                  <p className="text-xs text-slate-500">Consultations Tracked</p>
                  <p className="mt-2 text-2xl font-bold text-slate-900 font-mono tabular-nums">{analytics.totalAppointments}</p>
                  <p className="mt-1 text-xs text-slate-500">{analytics.completedAppointments} completed</p>
                </div>
                <div className="bg-white border border-slate-200 rounded-xl p-5">
                  <p className="text-xs text-slate-500">Gross Volume / Platform Fee</p>
                  <p className="mt-2 text-2xl font-bold text-slate-900 font-mono tabular-nums">{formatINR(analytics.grossTransactionVolume)}</p>
                  <p className="mt-1 text-xs text-emerald-700 font-mono tabular-nums">Revenue: {formatINR(analytics.totalPlatformRevenue)}</p>
                </div>
              </div>

              <div className="grid lg:grid-cols-12 gap-6">
                <div className="lg:col-span-7 bg-white border border-slate-200 rounded-xl p-6">
                  <h2 className="text-base font-semibold text-slate-900 font-display mb-4">Monthly Gross Consultation Volume (INR)</h2>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={analytics.monthlyMetrics}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                        <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                        <YAxis tick={{ fontSize: 12 }} />
                        <Tooltip />
                        <Area type="monotone" dataKey="revenue" stroke="#1e40af" fill="#dbeafe" strokeWidth={2} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="lg:col-span-5 bg-white border border-slate-200 rounded-xl p-6">
                  <h2 className="text-base font-semibold text-slate-900 font-display mb-4">Provider Verification Pipeline</h2>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={analytics.verificationBreakdown}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                        <XAxis dataKey="status" tick={{ fontSize: 11 }} />
                        <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                        <Tooltip />
                        <Bar dataKey="count" fill="#0f172a" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'verifications' && (
            <div className="space-y-4">
              {pendingProviders.length === 0 ? (
                <EmptyState title="Verification queue is clear" description="All submitted provider credentials have been reviewed." />
              ) : (
                pendingProviders.map((item) => (
                  <div key={item.profile.id} className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <h3 className="text-lg font-bold text-slate-900 font-display">{item.profile.fullName}</h3>
                        <p className="text-xs text-slate-600 mt-0.5">
                          {item.profile.providerType} · {item.profile.city}, {item.profile.state} · Bar/License: <span className="font-mono">{item.barRegistrationNo || 'N/A'}</span>
                        </p>
                      </div>
                      <span className={`text-xs font-semibold ${statusColorClass(item.profile.verificationStatus)}`}>
                        {item.profile.verificationStatus}
                      </span>
                    </div>

                    <div className="border-t border-slate-100 pt-3">
                      <p className="text-xs font-semibold text-slate-700 mb-2 flex items-center gap-1.5">
                        <FileCheck2 className="w-4 h-4" /> Submitted Credentials
                      </p>
                      <div className="grid sm:grid-cols-2 gap-3 text-xs">
                        {item.credentials?.map((c) => (
                          <div key={c.id} className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
                            <p className="font-semibold text-slate-900">{c.documentType}</p>
                            <p className="text-slate-600 font-mono mt-0.5">{c.credentialNumber}</p>
                            <p className="text-slate-500 mt-0.5">{c.issuingAuthority} · {c.originalFilename}</p>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="pt-2 flex flex-col sm:flex-row gap-3">
                      <input
                        type="text"
                        placeholder="Reviewer remarks (logged to audit trail)..."
                        value={remarksMap[item.profile.id] || ''}
                        onChange={(e) => setRemarksMap({ ...remarksMap, [item.profile.id]: e.target.value })}
                        className="flex-1 px-3 py-2 text-xs border border-slate-200 rounded-lg"
                      />
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleVerifyDecision(item.profile.id, 'APPROVED')}
                          className="px-3.5 py-2 text-xs font-semibold text-white bg-emerald-700 rounded-lg hover:bg-emerald-800 cursor-pointer"
                        >
                          Approve (+100 pts)
                        </button>
                        <button
                          type="button"
                          onClick={() => handleVerifyDecision(item.profile.id, 'CORRECTIONS_REQUIRED')}
                          className="px-3.5 py-2 text-xs font-semibold text-amber-800 bg-amber-50 border border-amber-300 rounded-lg cursor-pointer"
                        >
                          Request Corrections
                        </button>
                        <button
                          type="button"
                          onClick={() => handleVerifyDecision(item.profile.id, 'REJECTED')}
                          className="px-3.5 py-2 text-xs font-semibold text-rose-700 bg-rose-50 border border-rose-200 rounded-lg cursor-pointer"
                        >
                          Reject
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {activeTab === 'users' && (
            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 border-b border-slate-200 text-xs text-slate-600">
                  <tr>
                    <th className="py-3 px-4 font-semibold">User</th>
                    <th className="py-3 px-4 font-semibold">Role</th>
                    <th className="py-3 px-4 font-semibold">Verification / Tier</th>
                    <th className="py-3 px-4 font-semibold">Account Status</th>
                    <th className="py-3 px-4 font-semibold text-right">Governance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {users.map((u) => (
                    <tr key={u.id}>
                      <td className="py-3.5 px-4">
                        <p className="font-medium text-slate-900">{u.full_name}</p>
                        <p className="text-xs text-slate-500 font-mono">{u.email}</p>
                      </td>
                      <td className="py-3.5 px-4 text-xs font-semibold text-slate-700">{u.role}</td>
                      <td className="py-3.5 px-4 text-xs text-slate-600 font-mono">
                        {u.role === 'PROVIDER' ? `${u.verification_status} · ${u.incentive_tier} (${u.incentive_points} pts)` : '—'}
                      </td>
                      <td className={`py-3.5 px-4 text-xs font-semibold ${statusColorClass(u.status)}`}>{u.status}</td>
                      <td className="py-3.5 px-4 text-right">
                        {u.role !== 'ADMIN' && (
                          <button
                            type="button"
                            onClick={() => setUserActionTarget(u)}
                            className={`px-3 py-1.5 text-xs font-medium rounded-lg border cursor-pointer ${
                              u.status === 'ACTIVE'
                                ? 'text-rose-700 border-rose-200 hover:bg-rose-50'
                                : 'text-emerald-700 border-emerald-200 hover:bg-emerald-50'
                            }`}
                          >
                            {u.status === 'ACTIVE' ? 'Suspend' : 'Activate'}
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {activeTab === 'audit' && (
            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 border-b border-slate-200 text-xs text-slate-600">
                  <tr>
                    <th className="py-3 px-4 font-semibold">Timestamp</th>
                    <th className="py-3 px-4 font-semibold">Administrator</th>
                    <th className="py-3 px-4 font-semibold">Action</th>
                    <th className="py-3 px-4 font-semibold">Target</th>
                    <th className="py-3 px-4 font-semibold">Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {auditLogs.map((log) => (
                    <tr key={log.id}>
                      <td className="py-3 px-4 font-mono text-xs text-slate-600">{formatDateShort(log.created_at)}</td>
                      <td className="py-3 px-4 font-mono text-xs text-slate-800">{log.admin_email}</td>
                      <td className="py-3 px-4 font-mono text-xs font-semibold text-slate-900">{log.action}</td>
                      <td className="py-3 px-4 font-mono text-xs text-slate-700">{log.target_entity} #{log.target_id}</td>
                      <td className="py-3 px-4 font-mono text-xs text-slate-500">{log.details_json}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      <ConfirmDialog
        open={Boolean(userActionTarget)}
        title={userActionTarget?.status === 'ACTIVE' ? 'Suspend Account' : 'Activate Account'}
        message={`Update account status for ${userActionTarget?.email}? This action is recorded in the admin audit log.`}
        confirmLabel={userActionTarget?.status === 'ACTIVE' ? 'Suspend User' : 'Activate User'}
        danger={userActionTarget?.status === 'ACTIVE'}
        onConfirm={handleConfirmUserStatus}
        onCancel={() => setUserActionTarget(null)}
      />
    </DashboardLayout>
  );
}
