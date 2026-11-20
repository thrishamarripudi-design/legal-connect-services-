import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { useDispatch } from 'react-redux';
import Navbar from '../../components/common/Navbar';
import { authApi } from '../../api/services';
import { setCredentials } from '../../store/authSlice';

export default function RegisterPage() {
  const [searchParams] = useSearchParams();
  const initialRole = searchParams.get('role') === 'PROVIDER' ? 'PROVIDER' : 'CITIZEN';
  const [role, setRole] = useState(initialRole);
  const [serverError, setServerError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm();
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const onSubmit = async (values) => {
    setSubmitting(true);
    setServerError('');
    try {
      const payload = { ...values, role };
      const res = await authApi.register(payload);
      dispatch(setCredentials(res));
      navigate(role === 'PROVIDER' ? '/provider' : '/citizen');
    } catch (err) {
      setServerError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Navbar />
      <main className="flex-1 flex items-center justify-center px-6 py-10">
        <div className="w-full max-w-xl bg-white border border-slate-200 rounded-2xl p-8">
          <h1 className="text-2xl font-bold text-slate-900 font-display">Create a LegalConnect Account</h1>
          <p className="text-sm text-slate-600 mt-1">Select your account type to begin.</p>

          <div className="mt-5 grid grid-cols-2 gap-1 p-1 bg-slate-100 rounded-lg">
            <button
              type="button"
              onClick={() => setRole('CITIZEN')}
              className={`py-2 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                role === 'CITIZEN' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600'
              }`}
            >
              Citizen / Client
            </button>
            <button
              type="button"
              onClick={() => setRole('PROVIDER')}
              className={`py-2 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                role === 'PROVIDER' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600'
              }`}
            >
              Legal Service Provider
            </button>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-4">
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Full Name</label>
                <input
                  type="text"
                  {...register('fullName', { required: 'Full name is required' })}
                  className="w-full px-3.5 py-2 text-sm border border-slate-200 rounded-lg"
                />
                {errors.fullName && <p className="text-xs text-rose-700 mt-1">{errors.fullName.message}</p>}
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Email Address</label>
                <input
                  type="email"
                  {...register('email', { required: 'Email is required' })}
                  className="w-full px-3.5 py-2 text-sm border border-slate-200 rounded-lg"
                />
                {errors.email && <p className="text-xs text-rose-700 mt-1">{errors.email.message}</p>}
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Password (min 6 chars)</label>
                <input
                  type="password"
                  {...register('password', { required: 'Password is required', minLength: { value: 6, message: 'Minimum 6 characters' } })}
                  className="w-full px-3.5 py-2 text-sm border border-slate-200 rounded-lg"
                />
                {errors.password && <p className="text-xs text-rose-700 mt-1">{errors.password.message}</p>}
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Phone Number</label>
                <input
                  type="text"
                  {...register('phone', { required: role === 'PROVIDER' ? 'Phone is required' : false })}
                  placeholder="+91-9800000000"
                  className="w-full px-3.5 py-2 text-sm border border-slate-200 rounded-lg"
                />
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">City</label>
                <input type="text" {...register('city')} placeholder="Bengaluru" className="w-full px-3.5 py-2 text-sm border border-slate-200 rounded-lg" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">State</label>
                <input type="text" {...register('state')} placeholder="Karnataka" className="w-full px-3.5 py-2 text-sm border border-slate-200 rounded-lg" />
              </div>
            </div>

            {role === 'PROVIDER' && (
              <div className="pt-3 border-t border-slate-200 space-y-4">
                <p className="text-xs font-semibold text-blue-800">Professional Onboarding Details (25 Bonus Points on Signup)</p>
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">Practitioner Role</label>
                    <select {...register('providerType')} className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white">
                      <option value="ADVOCATE">Advocate</option>
                      <option value="MEDIATOR">Mediator</option>
                      <option value="ARBITRATOR">Arbitrator</option>
                      <option value="NOTARY">Notary Public</option>
                      <option value="LEGAL_CONSULTANT">Legal Consultant</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">Bar / License Reg. No.</label>
                    <input type="text" {...register('barRegistrationNo')} placeholder="KAR/1234/2020" className="w-full px-3.5 py-2 text-sm border border-slate-200 rounded-lg font-mono" />
                  </div>
                </div>
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">Experience (Years)</label>
                    <input type="number" defaultValue={3} {...register('experienceYears')} className="w-full px-3.5 py-2 text-sm border border-slate-200 rounded-lg font-mono tabular-nums" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">Base Fee (INR)</label>
                    <input type="number" defaultValue={800} {...register('consultationFee')} className="w-full px-3.5 py-2 text-sm border border-slate-200 rounded-lg font-mono tabular-nums" />
                  </div>
                </div>
              </div>
            )}

            {serverError && (
              <div className="p-3 text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded-lg">{serverError}</div>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-2.5 px-4 text-sm font-semibold text-white bg-slate-900 rounded-lg hover:bg-slate-800 cursor-pointer disabled:opacity-50"
            >
              {submitting ? 'Creating Account...' : role === 'PROVIDER' ? 'Start Provider Onboarding' : 'Create Citizen Account'}
            </button>
          </form>

          <p className="mt-5 text-center text-xs text-slate-600">
            Already registered?{' '}
            <Link to="/login" className="font-semibold text-blue-800 hover:underline">Sign in</Link>
          </p>
        </div>
      </main>
    </div>
  );
}
