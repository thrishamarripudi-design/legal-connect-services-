import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { useDispatch } from 'react-redux';
import Navbar from '../../components/common/Navbar';
import { authApi } from '../../api/services';
import { setCredentials } from '../../store/authSlice';

const DEMO_ACCOUNTS = [
  { label: 'Citizen (Ananya Sharma)', email: 'ananya.sharma@citizen.in', password: 'Password@123' },
  { label: 'Verified Provider (Adv. Arjun)', email: 'arjun.mehta@legalconnect.in', password: 'Password@123' },
  { label: 'Pending Provider (Sanjay Notary)', email: 'sanjay.verma@legalconnect.in', password: 'Password@123' },
  { label: 'Platform Admin', email: 'admin@legalconnect.in', password: 'Password@123' },
];

export default function LoginPage() {
  const { register, handleSubmit, setValue, formState: { errors } } = useForm();
  const [serverError, setServerError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const onSubmit = async (values) => {
    setSubmitting(true);
    setServerError('');
    try {
      const res = await authApi.login(values);
      dispatch(setCredentials(res));
      if (res.role === 'ADMIN') navigate('/admin');
      else if (res.role === 'PROVIDER') navigate('/provider');
      else navigate('/citizen');
    } catch (err) {
      setServerError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const fillDemo = (acc) => {
    setValue('email', acc.email);
    setValue('password', acc.password);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Navbar />
      <main className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-md bg-white border border-slate-200 rounded-2xl p-8">
          <h1 className="text-2xl font-bold text-slate-900 font-display">Sign in to LegalConnect</h1>
          <p className="text-sm text-slate-600 mt-1">Access your citizen, legal provider, or administrator portal.</p>

          <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Email Address</label>
              <input
                type="email"
                {...register('email', { required: 'Email is required' })}
                className="w-full px-3.5 py-2.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-slate-500"
                placeholder="you@example.com"
              />
              {errors.email && <p className="text-xs text-rose-700 mt-1">{errors.email.message}</p>}
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Password</label>
              <input
                type="password"
                {...register('password', { required: 'Password is required' })}
                className="w-full px-3.5 py-2.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-slate-500"
                placeholder="Enter password"
              />
              {errors.password && <p className="text-xs text-rose-700 mt-1">{errors.password.message}</p>}
            </div>

            {serverError && (
              <div className="p-3 text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded-lg">{serverError}</div>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-2.5 px-4 text-sm font-semibold text-white bg-slate-900 rounded-lg hover:bg-slate-800 cursor-pointer disabled:opacity-50"
            >
              {submitting ? 'Authenticating...' : 'Sign In'}
            </button>
          </form>

          <div className="mt-6 pt-5 border-t border-slate-200">
            <p className="text-xs font-medium text-slate-600 mb-2.5">Seeded Test Accounts (Password@123)</p>
            <div className="grid grid-cols-1 gap-2">
              {DEMO_ACCOUNTS.map((acc) => (
                <button
                  key={acc.email}
                  type="button"
                  onClick={() => fillDemo(acc)}
                  className="text-left px-3 py-2 text-xs text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors cursor-pointer flex items-center justify-between"
                >
                  <span className="font-medium">{acc.label}</span>
                  <span className="font-mono text-[11px] text-slate-500">{acc.email}</span>
                </button>
              ))}
            </div>
          </div>

          <p className="mt-6 text-center text-xs text-slate-600">
            New to LegalConnect?{' '}
            <Link to="/register" className="font-semibold text-blue-800 hover:underline">Create an account</Link>
          </p>
        </div>
      </main>
    </div>
  );
}
