import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  Loader2,
  MapPin,
  Phone,
  Globe,
  Languages,
  Store,
  MessageCircle,
  Star,
  ArrowLeft,
  CheckCircle2,
  Clock,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { useI18n } from '@/i18n/I18nContext';
import { translateCategory } from '@/i18n/categories';
import { StarRating } from '@/components/common/StarRating';
import { ProviderProfile, Service, Category, Rating, Conversation } from '@/types/database';

interface ApprovedRating extends Rating {
  consumer_name?: string;
}

export function ProviderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { session, profile } = useAuth();
  const navigate = useNavigate();
  const { t, lang } = useI18n();
  const [provider, setProvider] = useState<ProviderProfile | null>(null);
  const [services, setServices] = useState<Service[]>([]);
  const [categories, setCategories] = useState<Record<string, Category>>({});
  const [ratings, setRatings] = useState<ApprovedRating[]>([]);
  const [avgRating, setAvgRating] = useState(0);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);

  useEffect(() => {
    if (!id) return;
    setLoading(true);

    (async () => {
      const { data: prov } = await supabase
        .from('provider_profiles')
        .select('*')
        .eq('user_id', id)
        .maybeSingle();
      if (!prov) {
        setProvider(null);
        setLoading(false);
        return;
      }
      setProvider(prov as ProviderProfile);

      const { data: svcs } = await supabase
        .from('services')
        .select('*')
        .eq('provider_id', id)
        .order('created_at', { ascending: false });
      setServices((svcs as Service[]) ?? []);

      const { data: cats } = await supabase.from('categories').select('*');
      const catMap: Record<string, Category> = {};
      (cats as Category[] | null)?.forEach((c) => (catMap[c.id] = c));
      setCategories(catMap);

      const { data: rts } = await supabase
        .from('ratings')
        .select('*, consumer_id')
        .eq('provider_id', id)
        .eq('status', 'approved')
        .order('created_at', { ascending: false });

      const approved = (rts as Rating[] | null) ?? [];
      const consumerIds = [...new Set(approved.map((r) => r.consumer_id))];
      let nameMap: Record<string, string> = {};
      if (consumerIds.length) {
        const { data: consumers } = await supabase
          .from('consumer_profiles')
          .select('user_id, name')
          .in('user_id', consumerIds);
        (consumers as { user_id: string; name: string }[] | null)?.forEach((c) => {
          nameMap[c.user_id] = c.name;
        });
      }
      const withNames = approved.map((r) => ({ ...r, consumer_name: nameMap[r.consumer_id] || t('provider.anonymous') }));
      setRatings(withNames);
      if (approved.length) {
        setAvgRating(approved.reduce((s, r) => s + r.stars, 0) / approved.length);
      }
      setLoading(false);
    })();
  }, [id]);

  async function startConversation(serviceId?: string) {
    if (!session) {
      navigate('/login');
      return;
    }
    if (!profile || !id) return;
    if (profile.role === 'admin') {
      navigate('/admin2318');
      return;
    }
    setStarting(true);
    try {
      const { data: existing } = await supabase
        .from('conversations')
        .select('*')
        .eq('consumer_id', profile.id)
        .eq('provider_id', id)
        .maybeSingle();

      let convo = existing as Conversation | null;
      if (!convo) {
        const { data: created, error } = await supabase
          .from('conversations')
          .insert({ consumer_id: profile.id, provider_id: id, service_id: serviceId ?? null })
          .select('*')
          .single();
        if (error) throw error;
        convo = created as Conversation;
      }
      const dest = profile.role === 'provider' ? '/provider' : '/consumer';
      navigate(`${dest}?tab=messages&conv=${convo.id}`);
    } catch (err) {
      console.error('start conversation failed', err);
    } finally {
      setStarting(false);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-teal-600" />
      </div>
    );
  }

  if (!provider) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-20 text-center">
        <p className="text-slate-500">{t('provider.notFound')}</p>
        <Link to="/" className="mt-4 inline-block font-medium text-teal-700 hover:text-teal-800">
          {t('provider.backToBrowse')}
        </Link>
      </div>
    );
  }

  const displayName = provider.alias || provider.company_name;
  const location = [provider.city, provider.state, provider.country].filter(Boolean).join(', ');

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      <Link to="/" className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-800">
        <ArrowLeft className="h-4 w-4" />
        {t('provider.backToBrowse')}
      </Link>

      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
          <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-teal-50 text-teal-700">
            {provider.logo_url ? (
              <img src={provider.logo_url} alt={displayName} className="h-full w-full object-cover" />
            ) : (
              <Store className="h-8 w-8" />
            )}
          </div>
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-slate-900">{displayName || t('provider.unnamed')}</h1>
            {provider.company_name && provider.alias && (
              <p className="text-sm text-slate-500">{provider.company_name}</p>
            )}
            <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-slate-600">
              {avgRating > 0 && (
                <span className="flex items-center gap-1">
                  <StarRating value={avgRating} size={14} />
                  <span className="font-medium text-slate-700">{avgRating.toFixed(1)}</span>
                  <span className="text-slate-400">({ratings.length})</span>
                </span>
              )}
              {location && (
                <span className="flex items-center gap-1">
                  <MapPin className="h-4 w-4 text-slate-400" />
                  {location}
                </span>
              )}
              {provider.phone && (
                <span className="flex items-center gap-1">
                  <Phone className="h-4 w-4 text-slate-400" />
                  {provider.phone}
                </span>
              )}
              {provider.website && (
                <a
                  href={provider.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-teal-700 hover:text-teal-800"
                >
                  <Globe className="h-4 w-4" />
                  {t('provider.website')}
                </a>
              )}
            </div>
            {provider.languages.length > 0 && (
              <div className="mt-3 flex flex-wrap items-center gap-1.5">
                <Languages className="h-4 w-4 text-slate-400" />
                {provider.languages.map((l) => (
                  <span key={l} className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">
                    {l}
                  </span>
                ))}
              </div>
            )}
            {provider.social_links.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-3">
                {provider.social_links.map((s, i) => (
                  <a
                    key={i}
                    href={s.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs font-medium text-teal-700 hover:text-teal-800"
                  >
                    {s.platform}
                  </a>
                ))}
              </div>
            )}
          </div>
          <button
            onClick={() => startConversation()}
            disabled={starting}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-teal-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-teal-700 disabled:opacity-60 sm:w-auto"
          >
            {starting ? <Loader2 className="h-4 w-4 animate-spin" /> : <MessageCircle className="h-4 w-4" />}
            {t('provider.messageProvider')}
          </button>
        </div>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <h2 className="mb-3 text-lg font-semibold text-slate-900">{t('provider.services')}</h2>
          {services.length === 0 ? (
            <p className="rounded-xl border border-dashed border-slate-300 bg-white px-5 py-8 text-sm text-slate-500">
              {t('provider.noServices')}
            </p>
          ) : (
            <div className="space-y-3">
              {services.map((s) => (
                <div key={s.id} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h3 className="font-semibold text-slate-900">{s.name}</h3>
                      <p className="mt-0.5 text-xs font-medium text-teal-700">
                        {translateCategory(categories[s.category_id]?.name ?? '', lang) || t('provider.uncategorized')}
                      </p>
                      {s.description && <p className="mt-2 text-sm text-slate-600">{s.description}</p>}
                    </div>
                    <div className="text-right">
                      {s.price != null && <p className="font-semibold text-slate-900">${s.price.toFixed(2)}</p>}
                      <button
                        onClick={() => startConversation(s.id)}
                        className="mt-2 text-xs font-medium text-teal-700 hover:text-teal-800"
                      >
                        {t('provider.inquire')}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div>
          <h2 className="mb-3 text-lg font-semibold text-slate-900">{t('provider.reviews')}</h2>
          {ratings.length === 0 ? (
            <p className="rounded-xl border border-dashed border-slate-300 bg-white px-5 py-8 text-sm text-slate-500">
              {t('provider.noReviews')}
            </p>
          ) : (
            <div className="space-y-3">
              {ratings.map((r) => (
                <div key={r.id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-slate-700">{r.consumer_name}</span>
                    <StarRating value={r.stars} size={12} />
                  </div>
                  {r.review_text && <p className="mt-2 text-sm text-slate-600">{r.review_text}</p>}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
