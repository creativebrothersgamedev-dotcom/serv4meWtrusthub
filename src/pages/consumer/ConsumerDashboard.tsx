import { useEffect, useState } from 'react';
import { Loader2, User, Save, MessageCircle, Star } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { useI18n } from '@/i18n/I18nContext';
import { MessagingPanel } from '@/components/messaging/MessagingPanel';
import { StarRating } from '@/components/common/StarRating';
import { LanguageMultiSelect } from '@/components/common/LanguageMultiSelect';
import { AutocompleteInput } from '@/components/common/AutocompleteInput';
import { COUNTRIES, STATE_SUGGESTIONS, MAJOR_CITIES } from '@/data/geoData';
import { ConsumerProfile, Conversation, ProviderProfile, Rating } from '@/types/database';

interface RateTarget {
  conversation: Conversation;
  provider: ProviderProfile;
  existing?: Rating;
}

export function ConsumerDashboard() {
  const { profile, refreshProfile } = useAuth();
  const { t: tr } = useI18n();
  const [searchParams, setSearchParams] = useSearchParams();
  const tab = searchParams.get('tab') ?? 'profile';
  const activeConv = searchParams.get('conv') ?? undefined;

  const [consumerProfile, setConsumerProfile] = useState<ConsumerProfile | null>(null);
  const [name, setName] = useState('');
  const [city, setCity] = useState('');
  const [stateVal, setStateVal] = useState('');
  const [country, setCountry] = useState('');
  const [languages, setLanguages] = useState<string[]>([]);
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileSaved, setProfileSaved] = useState(false);
  const [geoValidationError, setGeoValidationError] = useState<string | null>(null);

  const [rateTargets, setRateTargets] = useState<RateTarget[]>([]);
  const [ratingStars, setRatingStars] = useState<Record<string, number>>({});
  const [ratingText, setRatingText] = useState<Record<string, string>>({});
  const [ratingBusy, setRatingBusy] = useState<string | null>(null);

  useEffect(() => {
    if (!profile) return;
    (async () => {
      const { data } = await supabase
        .from('consumer_profiles')
        .select('*')
        .eq('user_id', profile.id)
        .maybeSingle();
      const cp = data as ConsumerProfile | null;
      if (cp) {
        setConsumerProfile(cp);
        setName(cp.name);
        setCity(cp.city);
        setStateVal(cp.state);
        setCountry(cp.country);
        setLanguages(cp.preferred_languages ?? []);
      }
    })();
  }, [profile]);

  useEffect(() => {
    if (!profile || tab !== 'ratings') return;
    (async () => {
      const { data: convos } = await supabase
        .from('conversations')
        .select('*')
        .eq('consumer_id', profile.id)
        .order('created_at', { ascending: false });
      const convoList = (convos as Conversation[] | null) ?? [];
      if (!convoList.length) {
        setRateTargets([]);
        return;
      }
      const providerIds = [...new Set(convoList.map((c) => c.provider_id))];
      const { data: provs } = await supabase
        .from('provider_profiles')
        .select('*')
        .in('user_id', providerIds);
      const provMap: Record<string, ProviderProfile> = {};
      (provs as ProviderProfile[] | null)?.forEach((p) => (provMap[p.user_id] = p));

      const convoIds = convoList.map((c) => c.id);
      const { data: existingRatings } = await supabase
        .from('ratings')
        .select('*')
        .in('conversation_id', convoIds);
      const ratingMap: Record<string, Rating> = {};
      (existingRatings as Rating[] | null)?.forEach((r) => (ratingMap[r.conversation_id] = r));

      const targets: RateTarget[] = convoList
        .map((c) => ({ conversation: c, provider: provMap[c.provider_id], existing: ratingMap[c.id] }))
        .filter((t) => t.provider);
      setRateTargets(targets);
    })();
  }, [profile, tab]);

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
    setSavingProfile(true);
    setProfileSaved(false);
    const { error } = await supabase
      .from('consumer_profiles')
      .update({ name, city, state: stateVal, country, preferred_languages: languages })
      .eq('user_id', profile.id);
    setSavingProfile(false);
    if (!error) {
      setProfileSaved(true);
      refreshProfile();
    }
  }

  async function submitRating(conversationId: string) {
    if (!profile) return;
    const stars = ratingStars[conversationId];
    if (!stars) return;
    setRatingBusy(conversationId);
    const target = rateTargets.find((t) => t.conversation.id === conversationId);
    if (!target) return;
    const { error } = await supabase.from('ratings').insert({
      conversation_id: conversationId,
      consumer_id: profile.id,
      provider_id: target.provider.user_id,
      stars,
      review_text: ratingText[conversationId] ?? '',
    });
    if (!error) {
      setRateTargets((prev) =>
        prev.map((t) =>
          t.conversation.id === conversationId
            ? { ...t, existing: { ...(t.existing ?? ({} as Rating)), status: 'pending', stars, review_text: ratingText[conversationId] ?? '' } as Rating }
            : t
        )
      );
    }
    setRatingBusy(null);
  }

  if (!profile) return null;

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      <h1 className="text-2xl font-bold text-slate-900">{tr('consumer.dashboard')}</h1>

      <div className="mt-5 flex gap-1 overflow-x-auto border-b border-slate-200">
        {[
          { id: 'profile', label: tr('consumer.profile'), icon: User },
          { id: 'messages', label: tr('consumer.messages'), icon: MessageCircle },
          { id: 'ratings', label: tr('consumer.ratings'), icon: Star },
        ].map((tabItem) => (
          <button
            key={tabItem.id}
            onClick={() => setSearchParams({ tab: tabItem.id })}
            className={`flex items-center gap-1.5 border-b-2 px-4 py-2.5 text-sm font-medium transition ${
              tab === tabItem.id ? 'border-teal-600 text-teal-700' : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <tabItem.icon className="h-4 w-4" />
            {tabItem.label}
          </button>
        ))}
      </div>

      <div className="mt-6">
        {tab === 'profile' && (
          <form onSubmit={saveProfile} className="max-w-xl space-y-5 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">{tr('consumer.yourName')}</label>
              <div className="relative">
                <User className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 py-2.5 pl-10 pr-3 text-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20"
                />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <AutocompleteInput
                value={city}
                onChange={setCity}
                suggestions={MAJOR_CITIES}
                label={tr('consumer.city')}
                icon
              />
              <AutocompleteInput
                value={stateVal}
                onChange={setStateVal}
                suggestions={STATE_SUGGESTIONS}
                label={tr('consumer.state')}
              />
              <AutocompleteInput
                value={country}
                onChange={setCountry}
                suggestions={COUNTRIES}
                label={tr('consumer.country')}
              />
            </div>
            <div>
              <LanguageMultiSelect
                selected={languages}
                onChange={setLanguages}
                label={tr('consumer.preferredLanguages')}
                placeholder={tr('consumer.langPlaceholder')}
              />
            </div>
            <div className="flex items-center gap-3">
              {geoValidationError && (
                <span className="text-sm text-amber-600">
                  {tr('common.selectValid', { field: geoValidationError })}
                </span>
              )}
              <button
                type="submit"
                disabled={savingProfile}
                className="flex items-center gap-2 rounded-lg bg-teal-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-teal-700 disabled:opacity-60"
              >
                {savingProfile ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                {tr('consumer.saveProfile')}
              </button>
              {profileSaved && <span className="text-sm text-teal-700">{tr('consumer.saved')}</span>}
            </div>
          </form>
        )}

        {tab === 'messages' && (
          <MessagingPanel
            activeConversationId={activeConv}
            onClearActive={() => setSearchParams({ tab: 'messages' })}
          />
        )}

        {tab === 'ratings' && (
          <div className="space-y-4">
            {rateTargets.length === 0 ? (
              <p className="rounded-xl border border-dashed border-slate-300 bg-white px-5 py-10 text-center text-sm text-slate-500">
                {tr('consumer.startConversation')}
              </p>
            ) : (
              rateTargets.map((rt) => (
                <div key={rt.conversation.id} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-slate-900">{rt.provider.alias || rt.provider.company_name}</p>
                      <p className="text-xs text-slate-500">
                        {tr('consumer.conversationStarted')} {new Date(rt.conversation.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    {rt.existing && (
                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                          rt.existing.status === 'approved'
                            ? 'bg-green-50 text-green-700'
                            : rt.existing.status === 'disputed'
                            ? 'bg-amber-50 text-amber-700'
                            : rt.existing.status === 'rejected'
                            ? 'bg-red-50 text-red-700'
                            : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {rt.existing.status}
                      </span>
                    )}
                  </div>
                  {rt.existing ? (
                    <div className="mt-3">
                      <StarRating value={rt.existing.stars} size={18} />
                      {rt.existing.review_text && <p className="mt-2 text-sm text-slate-600">{rt.existing.review_text}</p>}
                    </div>
                  ) : (
                    <div className="mt-3 space-y-3">
                      <div>
                        <p className="mb-1 text-sm font-medium text-slate-700">{tr('consumer.yourRating')}</p>
                        <StarRating
                          value={ratingStars[rt.conversation.id] ?? 0}
                          size={24}
                          interactive
                          onChange={(v) => setRatingStars((prev) => ({ ...prev, [rt.conversation.id]: v }))}
                        />
                      </div>
                      <textarea
                        value={ratingText[rt.conversation.id] ?? ''}
                        onChange={(e) => setRatingText((prev) => ({ ...prev, [rt.conversation.id]: e.target.value }))}
                        placeholder={tr('consumer.reviewPlaceholder')}
                        rows={3}
                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-teal-500"
                      />
                      <button
                        onClick={() => submitRating(rt.conversation.id)}
                        disabled={!ratingStars[rt.conversation.id] || ratingBusy === rt.conversation.id}
                        className="rounded-lg bg-teal-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-teal-700 disabled:opacity-50"
                      >
                        {ratingBusy === rt.conversation.id ? tr('consumer.submitting') : tr('consumer.submitRating')}
                      </button>
                    </div>
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
