import { useState, useEffect, ReactNode } from 'react';
import { ShieldCheck, Lock, Loader2, AlertCircle } from 'lucide-react';
import { useI18n } from '@/i18n/I18nContext';

const STORAGE_KEY = 'admin-gate-unlocked';

export function AdminGate({ children }: { children: ReactNode }) {
  const { t } = useI18n();
  const [unlocked, setUnlocked] = useState(() => sessionStorage.getItem(STORAGE_KEY) === 'true');
  const [password, setPassword] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (unlocked) sessionStorage.setItem(STORAGE_KEY, 'true');
  }, [unlocked]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setVerifying(true);
    try {
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-verify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({ password }),
      });
      const data = await res.json();
      if (res.ok && data.authorized) {
        setUnlocked(true);
        setPassword('');
      } else {
        setError(t('admin.gateError'));
      }
    } catch {
      setError(t('admin.gateError'));
    } finally {
      setVerifying(false);
    }
  }

  if (unlocked) return <>{children}</>;

  return (
    <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-md flex-col justify-center px-4 py-10">
      <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <div className="flex flex-col items-center text-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-teal-50 text-teal-600">
            <ShieldCheck className="h-7 w-7" />
          </span>
          <h1 className="mt-4 text-2xl font-bold text-slate-900">{t('admin.gateTitle')}</h1>
          <p className="mt-1 text-sm text-slate-500">{t('admin.gateSubtitle')}</p>
        </div>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">
              {t('admin.gatePassword')}
            </label>
            <div className="relative">
              <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="password"
                required
                autoFocus
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-lg border border-slate-300 py-2.5 pl-10 pr-3 text-sm text-slate-900 outline-none transition focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20"
                placeholder={t('admin.gatePassword')}
              />
            </div>
          </div>

          {error && (
            <div className="flex items-center gap-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
              <AlertCircle className="h-4 w-4 shrink-0" />
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={verifying || !password.trim()}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-teal-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-teal-700 disabled:opacity-60"
          >
            {verifying ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
            {verifying ? t('admin.gateVerifying') : t('admin.gateEnter')}
          </button>
        </form>
      </div>
    </div>
  );
}
