import { Link, useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { logout } from '../../store/authSlice';

export default function Navbar() {
  const { user } = useSelector((state) => state.auth);
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const dashboardPath =
    user?.role === 'ADMIN'
      ? '/admin'
      : user?.role === 'PROVIDER'
        ? '/provider'
        : '/citizen';

  const handleLogout = () => {
    dispatch(logout());
    navigate('/');
  };

  return (
    <header className="sticky top-0 z-30 bg-white/95 backdrop-blur border-b border-slate-200">
      <div className="max-w-[1280px] mx-auto px-6 h-16 flex items-center justify-between gap-8">
        <Link
          to="/"
          className="text-lg font-bold tracking-tight text-slate-900 whitespace-nowrap shrink-0 font-display"
        >
          LegalConnect
        </Link>

        <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-600">
          <Link to="/marketplace" className="hover:text-slate-900 transition-colors whitespace-nowrap shrink-0">
            Marketplace
          </Link>
          <a href="/#practice-areas" className="hover:text-slate-900 transition-colors whitespace-nowrap shrink-0">
            Practice Areas
          </a>
          <a href="/#incentives" className="hover:text-slate-900 transition-colors whitespace-nowrap shrink-0">
            Provider Incentives
          </a>
          <Link
            to={user?.role === 'CITIZEN' ? '/citizen?tab=requests' : '/register?role=CITIZEN'}
            className="hover:text-slate-900 transition-colors whitespace-nowrap shrink-0"
          >
            Case Assistance
          </Link>
        </nav>

        <div className="flex items-center gap-3 shrink-0">
          {user ? (
            <>
              <button
                type="button"
                onClick={handleLogout}
                className="text-sm font-medium text-slate-600 hover:text-slate-900 px-3 py-2 whitespace-nowrap shrink-0 cursor-pointer"
              >
                Sign Out
              </button>
              <Link
                to={dashboardPath}
                className="px-4 py-2 text-xs font-semibold text-white bg-slate-900 rounded-lg hover:bg-slate-800 transition-colors whitespace-nowrap shrink-0"
              >
                Open Console
              </Link>
            </>
          ) : (
            <Link
              to="/login"
              className="px-4 py-2 text-xs font-semibold text-white bg-slate-900 rounded-lg hover:bg-slate-800 transition-colors whitespace-nowrap shrink-0"
            >
              Sign In
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
