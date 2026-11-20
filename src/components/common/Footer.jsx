import { Link } from 'react-router-dom';

export default function Footer() {
  return (
    <footer className="border-t border-slate-200 bg-white mt-20">
      <div className="max-w-[1280px] mx-auto px-6 py-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 text-sm text-slate-600">
        <div>
          <p className="font-display font-semibold text-slate-900">LegalConnect</p>
          <p className="mt-1 text-xs text-slate-500">
            Digital Legal Services Marketplace and Case Assistance Platform
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-6 text-xs">
          <Link to="/marketplace" className="hover:text-slate-900 transition-colors">Find Counsel</Link>
          <Link to="/register?role=PROVIDER" className="hover:text-slate-900 transition-colors">Provider Onboarding</Link>
          <Link to="/login" className="hover:text-slate-900 transition-colors">Portal Sign In</Link>
          <span className="text-slate-400">© {new Date().getFullYear()} LegalConnect</span>
        </div>
      </div>
    </footer>
  );
}
