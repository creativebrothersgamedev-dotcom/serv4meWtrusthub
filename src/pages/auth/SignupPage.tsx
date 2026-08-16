import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Loader2, Mail, Lock, User, Store, UserCircle } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useI18n } from '@/i18n/I18nContext';

export function SignupPage() {
  const { signUpConsumer, signUpProvider } = useAuth();
  const navigate = useNavigate();
  const { t } = useI18n();
  const [role, setRole] = useState<'consumer' | 'provider'>('consumer');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      if (role === 'consumer') {
        await signUpConsumer(email, password, displayName);
      } else {
        await signUpProvider(email, password, displayName);
      }
      navigate(role === 'consumer' ? '/consumer' : '/provider');
    } catch (err) {
      const msg = err instanceof Error ? err.message : '';
      if (msg.toLowerCase().includes('already registered') || msg.toLowerCase().includes('user already')) {
        setError(t('auth.emailRegistered'));
      } else {
        setError(t('auth.signupFailed'));
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-md flex-col justify-center px-4 py-10">
      <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <h1 className="text-2xl font-bold text-slate-900">{t('auth.createAccount')}</h1>
        <p className="mt-1 text-sm text-slate-500">{t('auth.joinSubtitle')}</p>

        <div className="mt-6 grid grid-cols-2 gap-2 rounded-xl bg-slate-100 p-1">
          <button
            type="button"
            onClick={() => setRole('consumer')}
            className={`flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition ${
              role === 'consumer' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <UserCircle className="h-4 w-4" />
            {t('auth.consumer')}
          </button>
          <button
            type="button"
            onClick={() => setRole('provider')}
            className={`flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition ${
              role === 'provider' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <Store className="h-4 w-4" />
            {t('auth.provider')}
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">
              {role === 'consumer' ? t('auth.yourName') : t('auth.companyName')}
            </label>
            <div className="relative">
              {role === 'consumer' ? (
                <User className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              ) : (
                <Store className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              )}
              <input
                type="text"
                required
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="w-full rounded-lg border border-slate-300 py-2.5 pl-10 pr-3 text-sm text-slate-900 outline-none transition focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20"
                placeholder={role === 'consumer' ? 'Jane Doe' : 'Acme Services'}
              />
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">{t('auth.email')}</label>
            <div className="relative">
              <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-lg border border-slate-300 py-2.5 pl-10 pr-3 text-sm text-slate-900 outline-none transition focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20"
                placeholder="you@example.com"
              />
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">{t('auth.password')}</label>
            <div className="relative">
              <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-lg border border-slate-300 py-2.5 pl-10 pr-3 text-sm text-slate-900 outline-none transition focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20"
                placeholder={t('auth.passwordPlaceholder')}
              />
            </div>
          </div>

          {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

          <button
            type="submit"
            disabled={busy}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-teal-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-teal-700 disabled:opacity-60"
          >
            {busy && <Loader2 className="h-4 w-4 animate-spin" />}
            {t('auth.createAccountBtn')}
          </button>
        </form>

        <p className="mt-5 text-center text-sm text-slate-500">
          {t('auth.alreadyHaveAccount')}{' '}
          <Link to="/login" className="font-medium text-teal-700 hover:text-teal-800">
            {t('auth.loginLink')}
          </Link>
        </p>
      </div>
    </div>
  );
}
