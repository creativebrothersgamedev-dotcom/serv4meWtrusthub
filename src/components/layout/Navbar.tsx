import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Handshake, LogOut, MessageCircle, LayoutDashboard, ShieldCheck, Menu, X } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useI18n } from '@/i18n/I18nContext';
import { LanguageSwitcher } from '@/components/common/LanguageSwitcher';

export function Navbar() {
  const { session, profile, signOut } = useAuth();
  const navigate = useNavigate();
  const { t } = useI18n();
  const [menuOpen, setMenuOpen] = useState(false);

  async function handleSignOut() {
    await signOut();
    navigate('/');
  }

  const dashboardHref =
    profile?.role === 'provider' ? '/provider' : profile?.role === 'admin' ? '/admin2318' : '/consumer';

  return (
    <header className="safe-top sticky top-0 z-40 border-b border-slate-200 bg-white/90 backdrop-blur">
      <nav className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
        <Link to="/" className="flex items-center gap-2 text-slate-900" onClick={() => setMenuOpen(false)}>
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-teal-600 text-white">
            <Handshake className="h-5 w-5" />
          </span>
          <span className="text-lg font-semibold tracking-tight">TrustHub</span>
        </Link>

        <div className="flex items-center gap-1 sm:gap-2">
          <LanguageSwitcher />

          {/* Desktop nav */}
          <Link
            to="/"
            className="hidden rounded-lg px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900 lg:block"
          >
            {t('nav.browse')}
          </Link>

          {session && profile ? (
            <>
              {profile.role !== 'admin' && (
                <Link
                  to={profile.role === 'provider' ? '/provider?tab=messages' : '/consumer?tab=messages'}
                  className="hidden items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900 lg:flex"
                >
                  <MessageCircle className="h-4 w-4" />
                  {t('nav.messages')}
                </Link>
              )}
              <Link
                to={dashboardHref}
                className="hidden items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900 lg:flex"
              >
                {profile.role === 'admin' ? <ShieldCheck className="h-4 w-4" /> : <LayoutDashboard className="h-4 w-4" />}
                <span>{profile.role === 'admin' ? t('nav.adminPanel') : t('nav.dashboard')}</span>
              </Link>
              <button
                onClick={handleSignOut}
                className="hidden items-center gap-1.5 rounded-lg bg-slate-900 px-3 py-2 text-sm font-medium text-white transition hover:bg-slate-700 lg:flex"
              >
                <LogOut className="h-4 w-4" />
                <span>{t('nav.signout')}</span>
              </button>
            </>
          ) : (
            <>
              <Link
                to="/login"
                className="hidden rounded-lg px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900 lg:block"
              >
                {t('nav.login')}
              </Link>
              <Link
                to="/signup"
                className="hidden rounded-lg bg-teal-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-teal-700 lg:block"
              >
                {t('nav.signup')}
              </Link>
            </>
          )}

          {/* Mobile hamburger */}
          <button
            onClick={() => setMenuOpen((o) => !o)}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-600 transition hover:bg-slate-100 lg:hidden"
            aria-label="Menu"
          >
            {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </nav>

      {/* Mobile dropdown */}
      {menuOpen && (
        <div className="border-t border-slate-200 bg-white px-4 py-3 lg:hidden">
          <div className="flex flex-col gap-1">
            <Link
              to="/"
              onClick={() => setMenuOpen(false)}
              className="rounded-lg px-3 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900"
            >
              {t('nav.browse')}
            </Link>
            {session && profile ? (
              <>
                {profile.role !== 'admin' && (
                  <Link
                    to={profile.role === 'provider' ? '/provider?tab=messages' : '/consumer?tab=messages'}
                    onClick={() => setMenuOpen(false)}
                    className="flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                  >
                    <MessageCircle className="h-4 w-4" />
                    {t('nav.messages')}
                  </Link>
                )}
                <Link
                  to={dashboardHref}
                  onClick={() => setMenuOpen(false)}
                  className="flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                >
                  {profile.role === 'admin' ? <ShieldCheck className="h-4 w-4" /> : <LayoutDashboard className="h-4 w-4" />}
                  {profile.role === 'admin' ? t('nav.adminPanel') : t('nav.dashboard')}
                </Link>
                <button
                  onClick={() => {
                    setMenuOpen(false);
                    handleSignOut();
                  }}
                  className="flex items-center gap-2 rounded-lg bg-slate-900 px-3 py-2.5 text-sm font-medium text-white transition hover:bg-slate-700"
                >
                  <LogOut className="h-4 w-4" />
                  {t('nav.signout')}
                </button>
              </>
            ) : (
              <>
                <Link
                  to="/login"
                  onClick={() => setMenuOpen(false)}
                  className="rounded-lg px-3 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                >
                  {t('nav.login')}
                </Link>
                <Link
                  to="/signup"
                  onClick={() => setMenuOpen(false)}
                  className="rounded-lg bg-teal-600 px-3 py-2.5 text-center text-sm font-semibold text-white shadow-sm transition hover:bg-teal-700"
                >
                  {t('nav.signup')}
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
