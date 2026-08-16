import { useEffect, useState } from 'react';
import { Loader2, Store, Phone, Globe, Save, Plus, Trash2, MessageCircle, Star, Upload, Link2, X } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { MessagingPanel } from '@/components/messaging/MessagingPanel';
import { StarRating } from '@/components/common/StarRating';
import { LanguageMultiSelect } from '@/components/common/LanguageMultiSelect';
import { AutocompleteInput } from '@/components/common/AutocompleteInput';
import { COUNTRIES, STATE_SUGGESTIONS, MAJOR_CITIES } from '@/data/geoData';
import { ProviderProfile, Service, Category, Rating, ConsumerProfile } from '@/types/database';
import { useI18n } from '@/i18n/I18nContext';
import { translateCategory } from '@/i18n/categories';

interface PendingRating extends Rating {
  consumer_name?: string;
}

export function ProviderDashboard() {
  const { profile, refreshProfile } = useAuth();
  const { lang, t: tr } = useI18n();
  const [searchParams, setSearchParams] = useSearchParams();
  const tab = searchParams.get('tab') ?? 'profile';
  const activeConv = searchParams.get('conv') ?? undefined;

  const [provider, setProvider] = useState<ProviderProfile | null>(null);
  const [companyName, setCompanyName] = useState('');
  const [alias, setAlias] = useState('');
  const [website, setWebsite] = useState('');
  const [socialLinks, setSocialLinks] = useState<{ platform: string; url: string }[]>([]);
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [stateVal, setStateVal] = useState('');
  const [country, setCountry] = useState('');
  const [phone, setPhone] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [languages, setLanguages] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [geoValidationError, setGeoValidationError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const [categories, setCategories] = useState<Category[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [newServiceName, setNewServiceName] = useState('');
  const [newServiceDesc, setNewServiceDesc] = useState('');
  const [newServiceCat, setNewServiceCat] = useState('');
  const [newServicePrice, setNewServicePrice] = useState('');
  const [addingService, setAddingService] = useState(false);

  const [pendingRatings, setPendingRatings] = useState<PendingRating[]>([]);
  const [ratingBusy, setRatingBusy] = useState<string | null>(null);

  useEffect(() => {
    if (!profile) return;
    (async () => {
      const { data: prov } = await supabase
        .from('provider_profiles')
        .select('*')
        .eq('user_id', profile.id)
        .maybeSingle();
      const p = prov as ProviderProfile | null;
      if (p) {
        setProvider(p);
        setCompanyName(p.company_name);
        setAlias(p.alias);
        setWebsite(p.website);
        setSocialLinks(p.social_links ?? []);
        setAddress(p.address);
        setCity(p.city);
        setStateVal(p.state);
        setCountry(p.country);
        setPhone(p.phone);
        setLogoUrl(p.logo_url);
        setLanguages(p.languages ?? []);
      }
      const { data: cats } = await supabase.from('categories').select('*').order('name');
      setCategories((cats as Category[] | null) ?? []);
    })();
  }, [profile]);

  useEffect(() => {
    if (!profile) return;
    supabase
      .from('services')
      .select('*')
      .eq('provider_id', profile.id)
      .order('created_at', { ascending: false })
      .then(({ data }) => setServices((data as Service[] | null) ?? []));
  }, [profile]);

  useEffect(() => {
    if (!profile || tab !== 'ratings') return;
    (async () => {
      const { data: rts } = await supabase
        .from('ratings')
        .select('*')
        .eq('provider_id', profile.id)
        .in('status', ['pending', 'disputed'])
        .order('created_at', { ascending: false });
      const pending = (rts as Rating[] | null) ?? [];
      const consumerIds = [...new Set(pending.map((r) => r.consumer_id))];
      let nameMap: Record<string, string> = {};
      if (consumerIds.length) {
        const { data: conss } = await supabase
          .from('consumer_profiles')
          .select('user_id, name')
          .in('user_id', consumerIds);
        (conss as { user_id: string; name: string }[] | null)?.forEach((c) => (nameMap[c.user_id] = c.name));
      }
      setPendingRatings(pending.map((r) => ({ ...r, consumer_name: nameMap[r.consumer_id] || tr('common.anonymous') })));
    })();
  }, [profile, tab]);

  async function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !profile) return;
    setUploading(true);
    const ext = file.name.split('.').pop();
    const path = `${profile.id}/logo.${ext}`;
    const { error: upErr } = await supabase.storage.from('provider-logos').upload(path, file, { upsert: true });
    if (!upErr) {
      const { data } = supabase.storage.from('provider-logos').getPublicUrl(path);
      setLogoUrl(data.publicUrl);
    }
    setUploading(false);
  }

  async function saveProfile(e: React.FormEvent) {
    e.preventDefault();
    if (!profile) return;
    const geoError =
      (city && !MAJOR_CITIES.includes(city) ? 'city' : '') ||
      (stateVal && !STATE_SUGGESTIONS.includes(stateVal) ? 'state' : '') ||
      (country && !COUNTRIES.includes(country) ? 'country' : '');
    if (geoError) {
      setGeoValidationError(geoError);
      return;
    }
    setGeoValidationError(null);
    setSaving(true);
    setSaved(false);
    const { error } = await supabase
      .from('provider_profiles')
      .update({
        company_name: companyName,
        alias,
        website,
        social_links: socialLinks,
        address,
        city,
        state: stateVal,
        country,
        phone,
        logo_url: logoUrl,
        languages,
      })
      .eq('user_id', profile.id);
    setSaving(false);
    if (!error) {
      setSaved(true);
      refreshProfile();
    }
  }

  async function addService(e: React.FormEvent) {
    e.preventDefault();
    if (!profile || !newServiceName || !newServiceCat) return;
    setAddingService(true);
    const { data, error } = await supabase
      .from('services')
      .insert({
        provider_id: profile.id,
        category_id: newServiceCat,
        name: newServiceName,
        description: newServiceDesc,
        price: newServicePrice ? parseFloat(newServicePrice) : null,
      })
      .select('*')
      .single();
    if (!error && data) {
      setServices([data as Service, ...services]);
      setNewServiceName('');
      setNewServiceDesc('');
      setNewServicePrice('');
      setNewServiceCat('');
    }
    setAddingService(false);
  }

  async function deleteService(id: string) {
    const { error } = await supabase.from('services').delete().eq('id', id);
    if (!error) setServices(services.filter((s) => s.id !== id));
  }

  async function reviewRating(ratingId: string, decision: 'approve' | 'deny') {
    setRatingBusy(ratingId);
    const { error } = await supabase.rpc('provider_review_rating', {
      p_rating_id: ratingId,
      p_decision: decision,
    });
    if (!error) {
      setPendingRatings((prev) => prev.filter((r) => r.id !== ratingId));
    }
    setRatingBusy(null);
  }

  if (!profile) return null;

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      <h1 className="text-2xl font-bold text-slate-900">{tr('providerDashboard.title')}</h1>

      <div className="mt-5 flex gap-1 overflow-x-auto border-b border-slate-200">
        {[
          { id: 'profile', label: tr('providerDashboard.profile'), icon: Store },
          { id: 'services', label: tr('providerDashboard.services'), icon: Plus },
          { id: 'messages', label: tr('providerDashboard.messages'), icon: MessageCircle },
          { id: 'ratings', label: tr('providerDashboard.ratings'), icon: Star },
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
        {tab === 'profile' && (
          <form onSubmit={saveProfile} className="space-y-5 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center gap-5">
              <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-teal-50 text-teal-700">
                {logoUrl ? <img src={logoUrl} alt="logo" className="h-full w-full object-cover" /> : <Store className="h-8 w-8" />}
              </div>
              <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
                {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                {tr('providerDashboard.uploadLogo')}
                <input type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
              </label>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">{tr('auth.companyName')}</label>
                <div className="relative">
                  <Store className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input value={companyName} onChange={(e) => setCompanyName(e.target.value)} className="w-full rounded-lg border border-slate-300 py-2.5 pl-10 pr-3 text-sm outline-none focus:border-teal-500" />
                </div>
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">{tr('providerDashboard.alias')}</label>
                <input value={alias} onChange={(e) => setAlias(e.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-teal-500" />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">{tr('providerDashboard.website')}</label>
                <div className="relative">
                  <Globe className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input value={website} onChange={(e) => setWebsite(e.target.value)} placeholder="https://..." className="w-full rounded-lg border border-slate-300 py-2.5 pl-10 pr-3 text-sm outline-none focus:border-teal-500" />
                </div>
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">{tr('providerDashboard.phone')}</label>
                <div className="relative">
                  <Phone className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input value={phone} onChange={(e) => setPhone(e.target.value)} className="w-full rounded-lg border border-slate-300 py-2.5 pl-10 pr-3 text-sm outline-none focus:border-teal-500" />
                </div>
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">{tr('providerDashboard.socialLinks')}</label>
              <div className="space-y-2">
                {socialLinks.map((s, i) => (
                  <div key={i} className="flex flex-col gap-2 sm:flex-row sm:items-center">
                    <input
                      value={s.platform}
                      onChange={(e) => setSocialLinks(socialLinks.map((x, j) => (j === i ? { ...x, platform: e.target.value } : x)))}
                      placeholder={tr('providerDashboard.platform')}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-teal-500 sm:w-32"
                    />
                    <input
                      value={s.url}
                      onChange={(e) => setSocialLinks(socialLinks.map((x, j) => (j === i ? { ...x, url: e.target.value } : x)))}
                      placeholder="https://..."
                      className="w-full flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-teal-500"
                    />
                    <button type="button" onClick={() => setSocialLinks(socialLinks.filter((_, j) => j !== i))} className="self-end text-slate-400 hover:text-red-600 sm:self-auto">
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => setSocialLinks([...socialLinks, { platform: '', url: '' }])}
                  className="flex items-center gap-1.5 text-sm font-medium text-teal-700 hover:text-teal-800"
                >
                  <Link2 className="h-4 w-4" />
                  {tr('providerDashboard.addLink')}
                </button>
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">{tr('providerDashboard.address')}</label>
              <input value={address} onChange={(e) => setAddress(e.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-teal-500" />
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <AutocompleteInput
                value={city}
                onChange={setCity}
                suggestions={MAJOR_CITIES}
                label={tr('common.city')}
                icon
              />
              <AutocompleteInput
                value={stateVal}
                onChange={setStateVal}
                suggestions={STATE_SUGGESTIONS}
                label={tr('common.state')}
              />
              <AutocompleteInput
                value={country}
                onChange={setCountry}
                suggestions={COUNTRIES}
                label={tr('common.country')}
              />
            </div>

            <div>
              <LanguageMultiSelect
                selected={languages}
                onChange={setLanguages}
                label={tr('providerDashboard.languagesOffered')}
                placeholder={tr('consumer.langPlaceholder')}
              />
            </div>

            <div className="flex items-center gap-3">
              {geoValidationError && (
                <span className="text-sm text-amber-600">
                  {tr('common.selectValid', { field: geoValidationError })}
                </span>
              )}
              <button type="submit" disabled={saving} className="flex items-center gap-2 rounded-lg bg-teal-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-teal-700 disabled:opacity-60">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                {tr('providerDashboard.saveProfile')}
              </button>
              {saved && <span className="text-sm text-teal-700">{tr('providerDashboard.saved')}</span>}
            </div>
          </form>
        )}

        {tab === 'services' && (
          <div className="space-y-5">
            <form onSubmit={addService} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h3 className="font-semibold text-slate-900">{tr('providerDashboard.addService')}</h3>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">{tr('providerDashboard.serviceName')}</label>
                  <input value={newServiceName} onChange={(e) => setNewServiceName(e.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-teal-500" />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">{tr('search.category')}</label>
                  <select value={newServiceCat} onChange={(e) => setNewServiceCat(e.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-teal-500">
                    <option value="">{tr('providerDashboard.selectCategory')}</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>{translateCategory(c.name, lang)}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="mt-4">
                <label className="mb-1.5 block text-sm font-medium text-slate-700">{tr('providerDashboard.description')}</label>
                <textarea value={newServiceDesc} onChange={(e) => setNewServiceDesc(e.target.value)} rows={2} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-teal-500" />
              </div>
              <div className="mt-4 max-w-xs">
                <label className="mb-1.5 block text-sm font-medium text-slate-700">{tr('providerDashboard.price')}</label>
                <input type="number" step="0.01" value={newServicePrice} onChange={(e) => setNewServicePrice(e.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-teal-500" />
              </div>
              <button type="submit" disabled={addingService} className="mt-4 flex items-center gap-2 rounded-lg bg-teal-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-teal-700 disabled:opacity-60">
                {addingService ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                {tr('providerDashboard.addServiceBtn')}
              </button>
            </form>

            <div className="space-y-3">
              {services.length === 0 ? (
                <p className="rounded-xl border border-dashed border-slate-300 bg-white px-5 py-8 text-center text-sm text-slate-500">
                  {tr('providerDashboard.noServices')}
                </p>
              ) : (
                services.map((s) => (
                  <div key={s.id} className="flex items-start justify-between rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                    <div>
                      <h4 className="font-medium text-slate-900">{s.name}</h4>
                      <p className="text-xs font-medium text-teal-700">{translateCategory(categories.find((c) => c.id === s.category_id)?.name ?? '', lang) || tr('common.uncategorized')}</p>
                      {s.description && <p className="mt-1.5 text-sm text-slate-600">{s.description}</p>}
                      {s.price != null && <p className="mt-1 text-sm font-semibold text-slate-900">${s.price.toFixed(2)}</p>}
                    </div>
                    <button onClick={() => deleteService(s.id)} className="text-slate-400 transition hover:text-red-600">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {tab === 'messages' && (
          <MessagingPanel activeConversationId={activeConv} onClearActive={() => setSearchParams({ tab: 'messages' })} />
        )}

        {tab === 'ratings' && (
          <div className="space-y-4">
            {pendingRatings.length === 0 ? (
              <p className="rounded-xl border border-dashed border-slate-300 bg-white px-5 py-10 text-center text-sm text-slate-500">
                {tr('providerDashboard.noRatings')}
              </p>
            ) : (
              pendingRatings.map((r) => (
                <div key={r.id} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-slate-900">{r.consumer_name}</p>
                      <p className="text-xs text-slate-500">{new Date(r.created_at).toLocaleDateString()}</p>
                    </div>
                    <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${r.status === 'disputed' ? 'bg-amber-50 text-amber-700' : 'bg-slate-100 text-slate-600'}`}>
                      {r.status}
                    </span>
                  </div>
                  <div className="mt-3">
                    <StarRating value={r.stars} size={18} />
                    {r.review_text && <p className="mt-2 text-sm text-slate-600">{r.review_text}</p>}
                  </div>
                  {r.status === 'pending' && (
                    <div className="mt-4 flex gap-2">
                      <button
                        onClick={() => reviewRating(r.id, 'approve')}
                        disabled={ratingBusy === r.id}
                        className="rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-green-700 disabled:opacity-60"
                      >
                        {tr('providerDashboard.approve')}
                      </button>
                      <button
                        onClick={() => reviewRating(r.id, 'deny')}
                        disabled={ratingBusy === r.id}
                        className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-amber-700 disabled:opacity-60"
                      >
                        {tr('providerDashboard.deny')}
                      </button>
                    </div>
                  )}
                  {r.status === 'disputed' && (
                    <p className="mt-3 text-sm text-amber-700">{tr('providerDashboard.disputed')}</p>
                  )}
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
