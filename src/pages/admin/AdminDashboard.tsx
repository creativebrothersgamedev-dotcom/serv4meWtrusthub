import { useEffect, useState } from 'react';
import { Loader2, Users, Store, Tag, Star, ShieldCheck, CheckCircle2, XCircle, Trash2, Plus, AlertTriangle } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { StarRating } from '@/components/common/StarRating';
import { Profile, ProviderProfile, ConsumerProfile, Category, Service, Rating } from '@/types/database';
import { useI18n } from '@/i18n/I18nContext';
import { translateCategory } from '@/i18n/categories';

interface AdminRating extends Rating {
  consumer_name?: string;
  provider_name?: string;
}

export function AdminDashboard() {
  const { profile } = useAuth();
  const { lang, t: tr } = useI18n();
  const [searchParams, setSearchParams] = useSearchParams();
  const tab = searchParams.get('tab') ?? 'users';

  const [users, setUsers] = useState<Profile[]>([]);
  const [providers, setProviders] = useState<ProviderProfile[]>([]);
  const [consumers, setConsumers] = useState<ConsumerProfile[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [disputedRatings, setDisputedRatings] = useState<AdminRating[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

  const [newCategory, setNewCategory] = useState('');
  const [addingCat, setAddingCat] = useState(false);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const [{ data: u }, { data: p }, { data: c }, { data: cats }, { data: svcs }] = await Promise.all([
        supabase.from('profiles').select('*').order('created_at', { ascending: false }),
        supabase.from('provider_profiles').select('*').order('created_at', { ascending: false }),
        supabase.from('consumer_profiles').select('*').order('created_at', { ascending: false }),
        supabase.from('categories').select('*').order('name'),
        supabase.from('services').select('*').order('created_at', { ascending: false }),
      ]);
      setUsers((u as Profile[] | null) ?? []);
      setProviders((p as ProviderProfile[] | null) ?? []);
      setConsumers((c as ConsumerProfile[] | null) ?? []);
      setCategories((cats as Category[] | null) ?? []);
      setServices((svcs as Service[] | null) ?? []);
      setLoading(false);
    })();
  }, []);

  useEffect(() => {
    if (tab !== 'disputes') return;
    (async () => {
      const { data: rts } = await supabase
        .from('ratings')
        .select('*')
        .eq('status', 'disputed')
        .order('created_at', { ascending: false });
      const disputed = (rts as Rating[] | null) ?? [];
      const consumerIds = [...new Set(disputed.map((r) => r.consumer_id))];
      const providerIds = [...new Set(disputed.map((r) => r.provider_id))];
      let cMap: Record<string, string> = {};
      let pMap: Record<string, string> = {};
      if (consumerIds.length) {
        const { data } = await supabase.from('consumer_profiles').select('user_id, name').in('user_id', consumerIds);
        (data as { user_id: string; name: string }[] | null)?.forEach((c) => (cMap[c.user_id] = c.name));
      }
      if (providerIds.length) {
        const { data } = await supabase.from('provider_profiles').select('user_id, company_name, alias').in('user_id', providerIds);
        (data as { user_id: string; company_name: string; alias: string }[] | null)?.forEach((p) => (pMap[p.user_id] = p.alias || p.company_name));
      }
      setDisputedRatings(disputed.map((r) => ({ ...r, consumer_name: cMap[r.consumer_id] || tr('common.anonymous'), provider_name: pMap[r.provider_id] || tr('msg.provider') })));
    })();
  }, [tab]);

  async function toggleSuspend(user: Profile) {
    setBusy(user.id);
    const { error } = await supabase.from('profiles').update({ suspended: !user.suspended }).eq('id', user.id);
    if (!error) setUsers(users.map((u) => (u.id === user.id ? { ...u, suspended: !u.suspended } : u)));
    setBusy(null);
  }

  async function deleteUserAccount(user: Profile) {
    if (!confirm(tr('admin.deleteConfirm', { role: user.role, email: user.email }))) return;
    setBusy(user.id);
    try {
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-delete-user`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({ userId: user.id }),
      });
      if (!res.ok) throw new Error('delete failed');
      setUsers(users.filter((u) => u.id !== user.id));
    } catch (err) {
      console.error('delete user failed', err);
      alert(tr('admin.deleteFailed'));
    }
    setBusy(null);
  }

  async function addCategory(e: React.FormEvent) {
    e.preventDefault();
    if (!newCategory.trim()) return;
    setAddingCat(true);
    const { data, error } = await supabase.from('categories').insert({ name: newCategory.trim() }).select('*').single();
    if (!error && data) setCategories([...categories, data as Category].sort((a, b) => a.name.localeCompare(b.name)));
    setNewCategory('');
    setAddingCat(false);
  }

  async function deleteCategory(id: string) {
    const { error } = await supabase.from('categories').delete().eq('id', id);
    if (!error) setCategories(categories.filter((c) => c.id !== id));
  }

  async function deleteService(id: string) {
    const { error } = await supabase.from('services').delete().eq('id', id);
    if (!error) setServices(services.filter((s) => s.id !== id));
  }

  async function resolveDispute(ratingId: string, decision: 'approve' | 'reject') {
    setBusy(ratingId);
    const { error } = await supabase.rpc('admin_resolve_rating', {
      p_rating_id: ratingId,
      p_decision: decision,
      p_note: '',
    });
    if (!error) setDisputedRatings(disputedRatings.filter((r) => r.id !== ratingId));
    setBusy(null);
  }

  if (!profile) return null;

  const providerMap: Record<string, ProviderProfile> = {};
  providers.forEach((p) => (providerMap[p.user_id] = p));
  const consumerMap: Record<string, ConsumerProfile> = {};
  consumers.forEach((c) => (consumerMap[c.user_id] = c));
  const catMap: Record<string, Category> = {};
  categories.forEach((c) => (catMap[c.id] = c));

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="flex items-center gap-2">
        <ShieldCheck className="h-6 w-6 text-teal-600" />
        <h1 className="text-2xl font-bold text-slate-900">{tr('admin.title')}</h1>
      </div>

      <div className="mt-5 flex gap-1 overflow-x-auto border-b border-slate-200">
        {[
          { id: 'users', label: tr('admin.users'), icon: Users },
          { id: 'providers', label: tr('admin.providers'), icon: Store },
          { id: 'categories', label: tr('admin.categories'), icon: Tag },
          { id: 'services', label: tr('admin.services'), icon: Plus },
          { id: 'disputes', label: tr('admin.disputes'), icon: AlertTriangle },
        ].map((t) => (
          <button
            key={t.id}
            onClick={() => setSearchParams({ tab: t.id })}
            className={`flex shrink-0 items-center gap-1.5 border-b-2 px-4 py-2.5 text-sm font-medium transition ${
              tab === t.id ? 'border-teal-600 text-teal-700' : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <t.icon className="h-4 w-4" />
            {t.label}
          </button>
        ))}
      </div>

      <div className="mt-6">
        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="h-6 w-6 animate-spin text-teal-600" />
          </div>
        ) : (
          <>
            {tab === 'users' && (
              <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
                <table className="w-full min-w-[480px] text-sm">
                  <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                    <tr>
                      <th className="px-4 py-3 font-semibold">{tr('admin.email')}</th>
                      <th className="px-4 py-3 font-semibold">{tr('admin.role')}</th>
                      <th className="px-4 py-3 font-semibold">{tr('admin.status')}</th>
                      <th className="px-4 py-3 font-semibold text-right">{tr('admin.actions')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {users.map((u) => (
                      <tr key={u.id} className="hover:bg-slate-50">
                        <td className="px-4 py-3 text-slate-900">{u.email}</td>
                        <td className="px-4 py-3">
                          <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">{u.role}</span>
                        </td>
                        <td className="px-4 py-3">
                          {u.suspended ? (
                            <span className="rounded-full bg-red-50 px-2.5 py-1 text-xs font-medium text-red-700">{tr('admin.suspended')}</span>
                          ) : (
                            <span className="rounded-full bg-green-50 px-2.5 py-1 text-xs font-medium text-green-700">{tr('admin.active')}</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex justify-end gap-2">
                            <button
                              onClick={() => toggleSuspend(u)}
                              disabled={busy === u.id || u.role === 'admin'}
                              className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100 disabled:opacity-40"
                            >
                              {u.suspended ? tr('admin.unsuspend') : tr('admin.suspend')}
                            </button>
                            <button
                              onClick={() => deleteUserAccount(u)}
                              disabled={busy === u.id || u.role === 'admin'}
                              className="flex items-center gap-1 rounded-lg bg-red-50 px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-100 disabled:opacity-40"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                              {tr('admin.delete')}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {tab === 'providers' && (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {providers.map((p) => (
                  <div key={p.user_id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                    <div className="flex items-center gap-3">
                      <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-xl bg-teal-50 text-teal-700">
                        {p.logo_url ? <img src={p.logo_url} alt="" className="h-full w-full object-cover" /> : <Store className="h-5 w-5" />}
                      </div>
                      <div className="min-w-0">
                        <h3 className="truncate font-medium text-slate-900">{p.alias || p.company_name}</h3>
                        <p className="truncate text-xs text-slate-500">{[p.city, p.country].filter(Boolean).join(', ')}</p>
                      </div>
                    </div>
                    {p.languages.length > 0 && <p className="mt-3 text-xs text-slate-500">{tr('common.languages')}: {p.languages.join(', ')}</p>}
                    <div className="mt-3 flex gap-2">
                      <button
                        onClick={() => {
                          const u = users.find((x) => x.id === p.user_id);
                          if (u) toggleSuspend(u);
                        }}
                        className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100"
                      >
                        {users.find((x) => x.id === p.user_id)?.suspended ? tr('admin.unsuspend') : tr('admin.suspend')}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {tab === 'categories' && (
              <div className="max-w-xl space-y-5">
                <form onSubmit={addCategory} className="flex gap-2 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                  <input
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value)}
                    placeholder={tr('admin.categoryPlaceholder')}
                    className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-teal-500"
                  />
                  <button type="submit" disabled={addingCat} className="flex items-center gap-1.5 rounded-lg bg-teal-600 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-700 disabled:opacity-60">
                    {addingCat ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                    {tr('admin.add')}
                  </button>
                </form>
                <div className="space-y-2">
                  {categories.map((c) => (
                    <div key={c.id} className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
                      <span className="font-medium text-slate-900">{translateCategory(c.name, lang)}</span>
                      <button onClick={() => deleteCategory(c.id)} className="text-slate-400 hover:text-red-600">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {tab === 'services' && (
              <div className="space-y-3">
                {services.length === 0 ? (
                  <p className="rounded-xl border border-dashed border-slate-300 bg-white px-5 py-8 text-center text-sm text-slate-500">{tr('admin.noServices')}</p>
                ) : (
                  services.map((s) => (
                    <div key={s.id} className="flex items-start justify-between rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                      <div>
                        <h4 className="font-medium text-slate-900">{s.name}</h4>
                        <p className="text-xs font-medium text-teal-700">{translateCategory(catMap[s.category_id]?.name ?? '', lang) || tr('common.uncategorized')}</p>
                        <p className="mt-1 text-xs text-slate-500">{tr('admin.by')} {providerMap[s.provider_id]?.alias || providerMap[s.provider_id]?.company_name || tr('common.unknown')}</p>
                        {s.description && <p className="mt-1.5 text-sm text-slate-600">{s.description}</p>}
                      </div>
                      <button onClick={() => deleteService(s.id)} className="text-slate-400 hover:text-red-600">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ))
                )}
              </div>
            )}

            {tab === 'disputes' && (
              <div className="space-y-4">
                {disputedRatings.length === 0 ? (
                  <p className="rounded-xl border border-dashed border-slate-300 bg-white px-5 py-10 text-center text-sm text-slate-500">{tr('admin.noDisputes')}</p>
                ) : (
                  disputedRatings.map((r) => (
                    <div key={r.id} className="rounded-xl border border-amber-200 bg-amber-50/40 p-5 shadow-sm">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-slate-900">{r.consumer_name} {tr('admin.rated')} {r.provider_name}</p>
                          <p className="text-xs text-slate-500">{new Date(r.created_at).toLocaleDateString()}</p>
                        </div>
                        <StarRating value={r.stars} size={16} />
                      </div>
                      {r.review_text && <p className="mt-3 text-sm text-slate-700">{r.review_text}</p>}
                      <div className="mt-4 flex gap-2">
                        <button
                          onClick={() => resolveDispute(r.id, 'approve')}
                          disabled={busy === r.id}
                          className="flex items-center gap-1.5 rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-60"
                        >
                          <CheckCircle2 className="h-4 w-4" />
                          {tr('admin.approve')}
                        </button>
                        <button
                          onClick={() => resolveDispute(r.id, 'reject')}
                          disabled={busy === r.id}
                          className="flex items-center gap-1.5 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60"
                        >
                          <XCircle className="h-4 w-4" />
                          {tr('admin.reject')}
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
