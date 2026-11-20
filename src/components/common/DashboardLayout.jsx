import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { Bell, LogOut, Menu, X } from 'lucide-react';
import { logout } from '../../store/authSlice';
import { workflowApi } from '../../api/services';
import { formatDateShort } from '../../utils/formatters';

export default function DashboardLayout({ title, subtitle, navItems, activeTab, onTabChange, children }) {
  const { user } = useSelector((state) => state.auth);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [notifOpen, setNotifOpen] = useState(false);
  const [mobileMenu, setMobileMenu] = useState(false);
  const [notifications, setNotifications] = useState({ items: [], unreadCount: 0 });

  const loadNotifications = async () => {
    try {
      const data = await workflowApi.getNotifications();
      setNotifications(data);
    } catch {
      // ignore silent poll failure
    }
  };

  useEffect(() => {
    loadNotifications();
  }, []);

  const handleMarkRead = async (id) => {
    try {
      await workflowApi.markNotificationRead(id);
      loadNotifications();
    } catch {
      // ignore
    }
  };

  const handleLogout = () => {
    dispatch(logout());
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex w-64 shrink-0 bg-white border-r border-slate-200 flex-col justify-between">
        <div>
          <div className="h-16 px-6 flex items-center border-b border-slate-200">
            <Link to="/" className="text-lg font-bold tracking-tight text-slate-900 font-display whitespace-nowrap">
              LegalConnect
            </Link>
          </div>
          <div className="px-4 py-5">
            <p className="px-3 text-xs font-medium text-slate-500 mb-3">
              {user?.role === 'ADMIN' ? 'Administration' : user?.role === 'PROVIDER' ? 'Practice Console' : 'Citizen Portal'}
            </p>
            <nav className="space-y-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                const active = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => onTabChange(item.id)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-lg transition-colors cursor-pointer whitespace-nowrap ${
                      active
                        ? 'bg-slate-900 text-white'
                        : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                    }`}
                  >
                    <Icon className="w-4 h-4 shrink-0" />
                    <span className="truncate">{item.label}</span>
                  </button>
                );
              })}
            </nav>
          </div>
        </div>

        <div className="p-4 border-t border-slate-200">
          <div className="px-3 py-2 mb-2">
            <p className="text-sm font-medium text-slate-900 truncate">{user?.fullName}</p>
            <p className="text-xs text-slate-500 truncate">{user?.email}</p>
          </div>
          <div className="flex items-center gap-2">
            <Link
              to="/marketplace"
              className="flex-1 text-center px-3 py-2 text-xs font-medium text-slate-700 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors whitespace-nowrap"
            >
              Marketplace
            </Link>
            <button
              type="button"
              onClick={handleLogout}
              className="flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium text-rose-700 border border-slate-200 rounded-lg hover:bg-rose-50 transition-colors cursor-pointer whitespace-nowrap"
            >
              <LogOut className="w-3.5 h-3.5" />
              Sign Out
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-16 bg-white border-b border-slate-200 px-6 flex items-center justify-between gap-6">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setMobileMenu(!mobileMenu)}
              className="lg:hidden p-2 text-slate-600 hover:text-slate-900 rounded-lg border border-slate-200"
              aria-label="Toggle navigation"
            >
              {mobileMenu ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
            </button>
            <div className="min-w-0">
              <h1 className="text-base font-semibold text-slate-900 truncate font-display">{title}</h1>
              {subtitle && <p className="text-xs text-slate-500 truncate">{subtitle}</p>}
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0 relative">
            <button
              type="button"
              onClick={() => { setNotifOpen(!notifOpen); loadNotifications(); }}
              className="relative flex items-center gap-2 px-3 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 cursor-pointer whitespace-nowrap"
            >
              <Bell className="w-4 h-4 text-slate-600" />
              <span>Alerts</span>
              <span className="font-mono tabular-nums text-slate-900 font-semibold">
                {notifications.unreadCount || 0}
              </span>
            </button>

            {notifOpen && (
              <div className="absolute right-0 top-12 w-80 bg-white border border-slate-200 rounded-xl shadow-lg z-40 overflow-hidden">
                <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-900">Notifications</span>
                  <button
                    type="button"
                    onClick={() => setNotifOpen(false)}
                    className="text-xs text-slate-500 hover:text-slate-900 cursor-pointer"
                  >
                    Close
                  </button>
                </div>
                <div className="max-h-80 overflow-y-auto divide-y divide-slate-100">
                  {notifications.items?.length === 0 ? (
                    <p className="p-4 text-xs text-slate-500">No notifications yet.</p>
                  ) : (
                    notifications.items?.map((n) => (
                      <div key={n.id} className={`p-3.5 text-xs ${n.is_read ? 'bg-white' : 'bg-blue-50/40'}`}>
                        <div className="flex items-start justify-between gap-2">
                          <p className="font-semibold text-slate-900">{n.title}</p>
                          {!n.is_read && (
                            <button
                              type="button"
                              onClick={() => handleMarkRead(n.id)}
                              className="text-[11px] font-medium text-blue-800 hover:underline shrink-0 cursor-pointer"
                            >
                              Mark read
                            </button>
                          )}
                        </div>
                        <p className="text-slate-600 mt-1 leading-relaxed">{n.message}</p>
                        <p className="text-slate-400 mt-1 font-mono">{formatDateShort(n.created_at)}</p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        </header>

        {mobileMenu && (
          <div className="lg:hidden bg-white border-b border-slate-200 px-4 py-3 space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => { onTabChange(item.id); setMobileMenu(false); }}
                  className={`w-full flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg ${
                    activeTab === item.id ? 'bg-slate-900 text-white' : 'text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{item.label}</span>
                </button>
              );
            })}
            <button
              type="button"
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-3 py-2 text-sm font-medium text-rose-700 rounded-lg hover:bg-rose-50"
            >
              <LogOut className="w-4 h-4" />
              <span>Sign Out</span>
            </button>
          </div>
        )}

        <main className="flex-1 p-6 max-w-[1280px] w-full mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
