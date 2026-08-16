import { useEffect, useMemo, useState, useRef, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Loader2,
  Search,
  MapPin,
  SlidersHorizontal,
  X,
  ArrowRight,
  Star,
  ShieldCheck,
  MessageCircle,
  Users,
  Sparkles,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useI18n } from '@/i18n/I18nContext';
import { translateCategory, resolveCanonicalCategory } from '@/i18n/categories';
import { ProviderCard } from '@/components/providers/ProviderCard';
import { LanguageMultiSelect } from '@/components/common/LanguageMultiSelect';
import { CATEGORY_SHOWCASE } from '@/data/categoryShowcase';
import { Category, SearchProviderResult } from '@/types/database';
import {
  MAJOR_CITIES,
  STATE_SUGGESTIONS,
  COUNTRIES,
  CITY_TO_LOCATION,
  STATE_TO_COUNTRY,
} from '@/data/geoData';

const HERO_IMAGE =
  'https://images.pexels.com/photos/7792841/pexels-photo-7792841.jpeg?auto=compress&cs=tinysrgb&h=900&w=1600';

export function BrowsePage() {
  const { t, lang } = useI18n();
  const navigate = useNavigate();
  const [categories, setCategories] = useState<Category[]>([]);
  const [results, setResults] = useState<SearchProviderResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [categoryId, setCategoryId] = useState<string>('');
  const [serviceName, setServiceName] = useState('');
  const [languages, setLanguages] = useState<string[]>([]);
  const [minRating, setMinRating] = useState<number>(0);
  const [location, setLocation] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  // Autocomplete state
  const [queryFocused, setQueryFocused] = useState(false);
  const [locFocused, setLocFocused] = useState(false);
  const [queryHighlight, setQueryHighlight] = useState(-1);
  const [locHighlight, setLocHighlight] = useState(-1);
  const queryBlurTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const locBlurTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    supabase
      .from('categories')
      .select('*')
      .order('name')
      .then(({ data }) => data && setCategories(data));
  }, []);

  // Build search suggestions: category names (all translations) + showcase names
  const searchSuggestions = useMemo(() => {
    const catNames = categories.map((c) => c.name);
    const showcaseNames = CATEGORY_SHOWCASE.map((c) => c.name);
    const all = [...new Set([...catNames, ...showcaseNames])].sort((a, b) =>
      a.localeCompare(b)
    );
    return all;
  }, [categories]);

  // Suggestions shown in the current UI language, with canonical name for resolution
  const localizedSuggestions = useMemo(() => {
    return searchSuggestions.map((s) => ({
      canonical: s,
      label: translateCategory(s, lang),
    }));
  }, [searchSuggestions, lang]);

  // Build location suggestions: cities + states + countries
  const locationSuggestions = useMemo(() => {
    return [...MAJOR_CITIES, ...STATE_SUGGESTIONS, ...COUNTRIES];
  }, []);

  const filteredQuerySuggestions = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return localizedSuggestions.slice(0, 6);
    return localizedSuggestions
      .filter((s) => s.label.toLowerCase().includes(q) || s.canonical.toLowerCase().includes(q))
      .slice(0, 8);
  }, [query, localizedSuggestions]);

  const filteredLocationSuggestions = useMemo(() => {
    const q = location.trim().toLowerCase();
    if (!q) return locationSuggestions.slice(0, 6);
    return locationSuggestions
      .filter((s) => s.toLowerCase().includes(q))
      .slice(0, 8);
  }, [location, locationSuggestions]);

  const doSearch = useCallback(async () => {
    setLoading(true);
    setHasSearched(true);
    // Cross-language resolution: if query matches a translated category name,
    // search by category instead of text.
    let effectiveQuery = query;
    let effectiveCategoryId = categoryId;
    if (query && !categoryId) {
      const canonical = resolveCanonicalCategory(query);
      if (canonical) {
        const cat = categories.find((c) => c.name === canonical);
        if (cat) {
          effectiveCategoryId = cat.id;
          effectiveQuery = '';
        }
      }
    }
    const { data, error } = await supabase.rpc('search_providers', {
      p_query: effectiveQuery || null,
      p_category_id: effectiveCategoryId || null,
      p_service_name: serviceName || null,
      p_languages: languages.length ? languages : null,
      p_min_rating: minRating || null,
      p_location: location || null,
    });
    if (error) {
      console.error('search failed', error);
      setResults([]);
    } else {
      setResults((data as SearchProviderResult[]) ?? []);
    }
    setLoading(false);
  }, [query, categoryId, serviceName, languages, minRating, location, categories]);

  // Load all providers once on mount
  useEffect(() => {
    doSearch();
  }, [doSearch]);

  function navigateToSearch() {
    const params: Record<string, string> = {};
    if (query) {
      // Try to resolve the typed query to a canonical category across languages.
      // e.g. "culinária" (pt-BR) → "Cooking Classes" → set cat param instead of q.
      if (!categoryId) {
        const canonical = resolveCanonicalCategory(query);
        if (canonical) {
          const cat = categories.find((c) => c.name === canonical);
          if (cat) {
            params.cat = cat.id;
          } else {
            params.q = query;
          }
        } else {
          params.q = query;
        }
      } else {
        params.q = query;
      }
    }
    if (location) params.loc = location;
    if (categoryId) params.cat = categoryId;
    if (serviceName) params.svc = serviceName;
    if (minRating > 0) params.rating = String(minRating);
    if (languages.length) params.langs = languages.join(',');
    const qs = new URLSearchParams(params).toString();
    navigate(`/search${qs ? `?${qs}` : ''}`);
  }

  function selectCategory(catName: string) {
    const cat = categories.find((c) => c.name === catName);
    if (cat) {
      setCategoryId(cat.id);
      setQuery('');
      setLocation('');
      setMinRating(0);
      setLanguages([]);
      setServiceName('');
      // Search runs automatically via the useEffect on categoryId change
      const el = document.getElementById('search-results');
      el?.scrollIntoView({ behavior: 'smooth' });
    }
  }

  function clearFilters() {
    setQuery('');
    setCategoryId('');
    setServiceName('');
    setLanguages([]);
    setMinRating(0);
    setLocation('');
  }

  function selectQuerySuggestion(canonical: string, label?: string) {
    setQuery(label || canonical);
    setQueryFocused(false);
    setQueryHighlight(-1);
    const cat = categories.find((c) => c.name === canonical);
    if (cat) {
      setCategoryId(cat.id);
    } else {
      setServiceName(canonical);
    }
  }

  function selectLocationSuggestion(s: string) {
    setLocation(s);
    setLocFocused(false);
    setLocHighlight(-1);

    // If it's a city, auto-fill state and country
    const cityInfo = CITY_TO_LOCATION[s];
    if (cityInfo) {
      // We just set the location to the city name; the search_providers RPC
      // does a text ILIKE across city, state, and country columns, so
      // searching by city name will already match. But we can enhance the
      // location string to include state and country for display clarity.
      setLocation(`${cityInfo.city}, ${cityInfo.state}, ${cityInfo.country}`);
      return;
    }

    // If it's a state, auto-fill country
    const country = STATE_TO_COUNTRY[s];
    if (country) {
      setLocation(`${s}, ${country}`);
      return;
    }

    // It's a country — just use it as-is
    setLocation(s);
  }

  function handleQueryKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!queryFocused || filteredQuerySuggestions.length === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setQueryHighlight((i) => Math.min(i + 1, filteredQuerySuggestions.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setQueryHighlight((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter' && queryHighlight >= 0) {
      e.preventDefault();
      const s = filteredQuerySuggestions[queryHighlight];
      selectQuerySuggestion(s.canonical, s.label);
    } else if (e.key === 'Enter') {
      navigateToSearch();
    } else if (e.key === 'Escape') {
      setQueryFocused(false);
      setQueryHighlight(-1);
    }
  }

  function handleLocationKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!locFocused || filteredLocationSuggestions.length === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setLocHighlight((i) => Math.min(i + 1, filteredLocationSuggestions.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setLocHighlight((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter' && locHighlight >= 0) {
      e.preventDefault();
      selectLocationSuggestion(filteredLocationSuggestions[locHighlight]);
    } else if (e.key === 'Enter') {
      navigateToSearch();
    } else if (e.key === 'Escape') {
      setLocFocused(false);
      setLocHighlight(-1);
    }
  }

  const activeFilterCount =
    (categoryId ? 1 : 0) +
    (serviceName ? 1 : 0) +
    (languages.length ? 1 : 0) +
    (minRating > 0 ? 1 : 0) +
    (location ? 1 : 0);

  // Shared render for the search bar with autocomplete
  function renderSearchBar(variant: 'hero' | 'inline') {
    const isHero = variant === 'hero';
    const inputClass = isHero
      ? 'w-full rounded-xl border-0 bg-white py-3.5 pl-12 pr-4 text-sm text-slate-900 shadow-lg outline-none ring-2 ring-transparent transition focus:ring-teal-400'
      : 'w-full rounded-xl border border-slate-300 bg-white py-2.5 pl-10 pr-3 text-sm text-slate-900 outline-none transition focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20';
    const locInputClass = isHero
      ? 'w-full rounded-xl border-0 bg-white py-3.5 pl-12 pr-4 text-sm text-slate-900 shadow-lg outline-none ring-2 ring-transparent transition focus:ring-teal-400'
      : 'w-full rounded-xl border border-slate-300 bg-white py-2.5 pl-10 pr-3 text-sm text-slate-900 outline-none transition focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20';
    const iconSize = isHero ? 'h-5 w-5' : 'h-4 w-4';
    const dropdownClass = isHero
      ? 'absolute z-50 mt-1 max-h-64 w-full overflow-auto rounded-xl border border-slate-200 bg-white py-1 shadow-xl'
      : 'absolute z-50 mt-1 max-h-64 w-full overflow-auto rounded-xl border border-slate-200 bg-white py-1 shadow-lg';

    return (
      <div className="flex flex-col gap-3 sm:flex-row">
        {/* Search query with autocomplete */}
        <div className="relative flex-1">
          <Search className={`pointer-events-none absolute left-${isHero ? '4' : '3'} top-1/2 -translate-y-1/2 text-slate-400 ${iconSize}`} style={{ left: isHero ? '1rem' : '0.75rem' }} />
          <input
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setQueryHighlight(-1);
            }}
            onFocus={() => setQueryFocused(true)}
            onBlur={() => {
              queryBlurTimer.current = setTimeout(() => setQueryFocused(false), 150);
            }}
            onKeyDown={handleQueryKeyDown}
            placeholder={isHero ? t('hero.searchPlaceholder') : t('search.searchPlaceholder')}
            className={inputClass}
            style={{ paddingLeft: isHero ? '3rem' : '2.5rem' }}
          />
          {queryFocused && filteredQuerySuggestions.length > 0 && (
            <div className={dropdownClass}>
              {filteredQuerySuggestions.map((s, i) => {
                const cat = categories.find((c) => c.name === s.canonical);
                return (
                  <button
                    key={s.canonical}
                    type="button"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      selectQuerySuggestion(s.canonical, s.label);
                    }}
                    onMouseEnter={() => setQueryHighlight(i)}
                    className={`flex w-full items-center gap-2 px-4 py-2 text-left text-sm transition ${
                      i === queryHighlight ? 'bg-teal-50 text-teal-800' : 'text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <Search className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                    {s.label}
                    {cat && (
                      <span className="ml-auto text-xs font-medium text-teal-600">{t('search.category')}</span>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Location with autocomplete */}
        <div className="relative flex-1 sm:max-w-xs">
          <MapPin className={`pointer-events-none absolute top-1/2 -translate-y-1/2 text-slate-400 ${iconSize}`} style={{ left: isHero ? '1rem' : '0.75rem' }} />
          <input
            value={location}
            onChange={(e) => {
              setLocation(e.target.value);
              setLocHighlight(-1);
            }}
            onFocus={() => setLocFocused(true)}
            onBlur={() => {
              locBlurTimer.current = setTimeout(() => setLocFocused(false), 150);
            }}
            onKeyDown={handleLocationKeyDown}
            placeholder={isHero ? t('hero.locationPlaceholder') : t('search.locationPlaceholder')}
            className={locInputClass}
            style={{ paddingLeft: isHero ? '3rem' : '2.5rem' }}
          />
          {locFocused && filteredLocationSuggestions.length > 0 && (
            <div className={dropdownClass}>
              {filteredLocationSuggestions.map((s, i) => {
                const cityInfo = CITY_TO_LOCATION[s];
                const stateCountry = STATE_TO_COUNTRY[s];
                const isCountry = COUNTRIES.includes(s);
                let suffix = '';
                if (cityInfo) suffix = `${cityInfo.state}, ${cityInfo.country}`;
                else if (stateCountry) suffix = stateCountry;
                return (
                  <button
                    key={s}
                    type="button"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      selectLocationSuggestion(s);
                    }}
                    onMouseEnter={() => setLocHighlight(i)}
                    className={`flex w-full items-center gap-2 px-4 py-2 text-left text-sm transition ${
                      i === locHighlight ? 'bg-teal-50 text-teal-800' : 'text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <MapPin className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                    <span className="truncate">{s}</span>
                    {suffix && (
                      <span className="ml-auto shrink-0 text-xs text-slate-400">{suffix}</span>
                    )}
                    {isCountry && !suffix && (
                      <span className="ml-auto text-xs font-medium text-teal-600">{t('common.country')}</span>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Search button */}
        <button
          onClick={navigateToSearch}
          className={`flex items-center justify-center gap-2 rounded-xl font-semibold text-white shadow-sm transition ${
            isHero ? 'bg-teal-600 px-6 py-3.5 text-sm hover:bg-teal-700' : 'bg-teal-600 px-5 py-2.5 text-sm hover:bg-teal-700'
          }`}
        >
          <Search className={isHero ? 'h-5 w-5' : 'h-4 w-4'} />
          {t('search.searchBtn')}
        </button>
      </div>
    );
  }

  return (
    <div>
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0">
          <img src={HERO_IMAGE} alt="" className="h-full w-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-br from-slate-900/85 via-slate-900/70 to-teal-900/60" />
        </div>
        <div className="relative mx-auto max-w-7xl px-4 py-20 sm:px-6 sm:py-28 lg:px-8 lg:py-36">
          <div className="max-w-3xl">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-1.5 text-sm font-medium text-teal-100 backdrop-blur">
              <Sparkles className="h-4 w-4" />
              {t('hero.badge')}
            </div>
            <h1 className="text-4xl font-bold leading-tight tracking-tight text-white sm:text-5xl lg:text-6xl">
              {t('hero.title')}
            </h1>
            <p className="mt-4 max-w-2xl text-lg text-slate-200 sm:text-xl">
              {t('hero.subtitle')}
            </p>

            {/* Search bar with autocomplete */}
            <div className="mt-8">{renderSearchBar('hero')}</div>

            {/* Stats */}
            <div className="mt-10 flex flex-wrap gap-8">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/10 backdrop-blur">
                  <Users className="h-5 w-5 text-teal-200" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-white">{categories.length}+</p>
                  <p className="text-sm text-slate-300">{t('hero.categories')}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/10 backdrop-blur">
                  <ShieldCheck className="h-5 w-5 text-teal-200" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-white">{t('hero.verified')}</p>
                  <p className="text-sm text-slate-300">{t('hero.verifiedProviders')}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/10 backdrop-blur">
                  <Star className="h-5 w-5 text-teal-200" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-white">{t('hero.realRatings')}</p>
                  <p className="text-sm text-slate-300">{t('hero.realRatingsDesc')}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Category Showcase */}
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="mb-8 flex items-end justify-between">
          <div>
            <h2 className="text-2xl font-bold text-slate-900 sm:text-3xl">{t('categories.title')}</h2>
            <p className="mt-1 text-slate-500">{t('categories.subtitle')}</p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {CATEGORY_SHOWCASE.map((cat) => (
            <button
              key={cat.name}
              onClick={() => selectCategory(cat.name)}
              className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-white text-left shadow-sm transition hover:-translate-y-1 hover:shadow-xl"
            >
              <div className="relative h-40 overflow-hidden">
                <img
                  src={cat.image}
                  alt={cat.name}
                  loading="lazy"
                  className="h-full w-full object-cover transition duration-500 group-hover:scale-110"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-900/70 via-slate-900/10 to-transparent" />
                <div className="absolute bottom-3 left-3 right-3">
                  <h3 className="text-base font-semibold text-white">{translateCategory(cat.name, lang)}</h3>
                </div>
              </div>
              <div className="p-4">
                <p className="text-sm leading-snug text-slate-500">{cat.blurb}</p>
                <div className="mt-2 flex items-center gap-1 text-sm font-medium text-teal-700 transition group-hover:gap-2">
                  {t('categories.findProviders')}
                  <ArrowRight className="h-4 w-4" />
                </div>
              </div>
            </button>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="bg-white py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-center text-2xl font-bold text-slate-900 sm:text-3xl">{t('how.title')}</h2>
          <p className="mt-2 text-center text-slate-500">{t('how.subtitle')}</p>
          <div className="mt-10 grid gap-8 sm:grid-cols-3">
            {[
              { icon: Search, title: t('how.step1'), desc: t('how.step1Desc') },
              { icon: MessageCircle, title: t('how.step2'), desc: t('how.step2Desc') },
              { icon: Star, title: t('how.step3'), desc: t('how.step3Desc') },
            ].map((step, i) => (
              <div key={i} className="relative rounded-2xl border border-slate-200 bg-slate-50/50 p-6 text-center">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-teal-600 text-white shadow-lg shadow-teal-600/20">
                  <step.icon className="h-6 w-6" />
                </div>
                <div className="mt-4 text-xs font-bold uppercase tracking-wider text-teal-600">{t('how.stepLabel', { n: String(i + 1) })}</div>
                <h3 className="mt-1 text-lg font-semibold text-slate-900">{step.title}</h3>
                <p className="mt-2 text-sm text-slate-500">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Search Results */}
      <section id="search-results" className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">
              {hasSearched && !loading
                ? `${results.length} ${results.length === 1 ? t('search.providerFound') : t('search.providersFound')}`
                : t('search.browseProviders')}
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              {activeFilterCount > 0
                ? `${activeFilterCount} ${activeFilterCount === 1 ? t('search.filterActive') : t('search.filtersActive')}`
                : t('search.showingAll')}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {activeFilterCount > 0 && (
              <button
                onClick={clearFilters}
                className="flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
              >
                <X className="h-4 w-4" />
                {t('search.clearFilters')}
              </button>
            )}
            <button
              onClick={() => setShowFilters((s) => !s)}
              className="flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
            >
              <SlidersHorizontal className="h-4 w-4" />
              {t('search.filters')}
              {activeFilterCount > 0 && (
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-teal-600 text-xs font-semibold text-white">
                  {activeFilterCount}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Inline search bar with autocomplete */}
        <div className="mb-6">{renderSearchBar('inline')}</div>

        {showFilters && (
          <div className="mb-6 grid gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">{t('search.category')}</label>
              <select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none focus:border-teal-500"
              >
                <option value="">{t('search.allCategories')}</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {translateCategory(c.name, lang)}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">{t('search.serviceName')}</label>
              <input
                value={serviceName}
                onChange={(e) => setServiceName(e.target.value)}
                placeholder={t('search.servicePlaceholder')}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none focus:border-teal-500"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">{t('search.languages')}</label>
              <LanguageMultiSelect
                selected={languages}
                onChange={setLanguages}
                placeholder={t('search.languagesPlaceholder')}
                compact
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                {t('search.minRating')}: {minRating > 0 ? `${minRating}+` : t('search.minRatingAny')}
              </label>
              <input
                type="range"
                min={0}
                max={5}
                step={0.5}
                value={minRating}
                onChange={(e) => setMinRating(Number(e.target.value))}
                className="w-full accent-teal-600"
              />
            </div>
          </div>
        )}

        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="h-6 w-6 animate-spin text-teal-600" />
          </div>
        ) : results.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white py-20 text-center">
            <p className="text-slate-500">{t('search.noResults')}</p>
            {activeFilterCount > 0 && (
              <button
                onClick={clearFilters}
                className="mt-4 rounded-lg bg-teal-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-teal-700"
              >
                {t('search.clearAll')}
              </button>
            )}
          </div>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {results.map((p) => (
              <ProviderCard key={p.user_id} provider={p} />
            ))}
          </div>
        )}
      </section>

      {/* CTA Section */}
      <section className="bg-gradient-to-br from-teal-700 to-slate-900 py-16">
        <div className="mx-auto max-w-4xl px-4 text-center sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold text-white sm:text-3xl">{t('cta.title')}</h2>
          <p className="mt-3 text-lg text-teal-100">{t('cta.subtitle')}</p>
          <Link
            to="/signup"
            className="mt-6 inline-flex items-center gap-2 rounded-xl bg-white px-6 py-3 text-sm font-semibold text-teal-700 shadow-lg transition hover:bg-teal-50"
          >
            {t('cta.button')}
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>
    </div>
  );
}
