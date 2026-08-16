import { useEffect, useMemo, useState, useCallback } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import {
  Loader2,
  Search,
  MapPin,
  SlidersHorizontal,
  X,
  ArrowLeft,
  SearchX,
  Sparkles,
  Users,
  Star,
  ShieldCheck,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useI18n } from '@/i18n/I18nContext';
import { translateCategory, resolveCanonicalCategory } from '@/i18n/categories';
import { ProviderCard } from '@/components/providers/ProviderCard';
import { LanguageMultiSelect } from '@/components/common/LanguageMultiSelect';
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

export function SearchResultsPage() {
  const { t, lang } = useI18n();
  const [searchParams, setSearchParams] = useSearchParams();
  const [categories, setCategories] = useState<Category[]>([]);
  const [results, setResults] = useState<SearchProviderResult[]>([]);
  const [loading, setLoading] = useState(true);

  const query = searchParams.get('q') ?? '';
  const location = searchParams.get('loc') ?? '';
  const categoryId = searchParams.get('cat') ?? '';
  const serviceName = searchParams.get('svc') ?? '';
  const minRating = Number(searchParams.get('rating') ?? '0');
  const langParam = searchParams.get('langs') ?? '';
  const languages = useMemo(
    () => (langParam ? langParam.split(',').filter(Boolean) : []),
    [langParam]
  );

  const [editQuery, setEditQuery] = useState(query);
  const [editLocation, setEditLocation] = useState(location);
  const [showFilters, setShowFilters] = useState(false);
  const [editServiceName, setEditServiceName] = useState(serviceName);
  const [editCategoryId, setEditCategoryId] = useState(categoryId);
  const [editMinRating, setEditMinRating] = useState(minRating);
  const [editLanguages, setEditLanguages] = useState<string[]>(languages);

  const [queryFocused, setQueryFocused] = useState(false);
  const [locFocused, setLocFocused] = useState(false);
  const [queryHighlight, setQueryHighlight] = useState(-1);
  const [locHighlight, setLocHighlight] = useState(-1);

  useEffect(() => {
    setEditQuery(query);
    setEditLocation(location);
    setEditServiceName(serviceName);
    setEditCategoryId(categoryId);
    setEditMinRating(minRating);
    setEditLanguages(languages);
  }, [query, location, serviceName, categoryId, minRating, languages]);

  useEffect(() => {
    supabase
      .from('categories')
      .select('*')
      .order('name')
      .then(({ data }) => data && setCategories(data));
  }, []);

  const searchSuggestions = useMemo(() => {
    const catNames = categories.map((c) => c.name);
    return [...new Set(catNames)].sort((a, b) => a.localeCompare(b));
  }, [categories]);

  const localizedSuggestions = useMemo(() => {
    return searchSuggestions.map((s) => ({
      canonical: s,
      label: translateCategory(s, lang),
    }));
  }, [searchSuggestions, lang]);

  const locationSuggestions = useMemo(
    () => [...MAJOR_CITIES, ...STATE_SUGGESTIONS, ...COUNTRIES],
    []
  );

  const filteredQuerySuggestions = useMemo(() => {
    const q = editQuery.trim().toLowerCase();
    if (!q) return localizedSuggestions.slice(0, 6);
    return localizedSuggestions
      .filter((s) => s.label.toLowerCase().includes(q) || s.canonical.toLowerCase().includes(q))
      .slice(0, 8);
  }, [editQuery, localizedSuggestions]);

  const filteredLocationSuggestions = useMemo(() => {
    const q = editLocation.trim().toLowerCase();
    if (!q) return locationSuggestions.slice(0, 6);
    return locationSuggestions.filter((s) => s.toLowerCase().includes(q)).slice(0, 8);
  }, [editLocation, locationSuggestions]);

  const doSearch = useCallback(async () => {
    setLoading(true);
    // If no category is selected but the text query matches a translated
    // category name in any language, resolve it to the canonical category
    // so the search filters by category instead of doing a text search.
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

  useEffect(() => {
    doSearch();
  }, [doSearch]);

  function executeSearch() {
    const params: Record<string, string> = {};
    if (editQuery) {
      // Resolve typed query across languages: e.g. "culinária" → Cooking Classes category
      if (!editCategoryId) {
        const canonical = resolveCanonicalCategory(editQuery);
        if (canonical) {
          const cat = categories.find((c) => c.name === canonical);
          if (cat) {
            params.cat = cat.id;
          } else {
            params.q = editQuery;
          }
        } else {
          params.q = editQuery;
        }
      } else {
        params.q = editQuery;
      }
    }
    if (editLocation) params.loc = editLocation;
    if (editCategoryId) params.cat = editCategoryId;
    if (editServiceName) params.svc = editServiceName;
    if (editMinRating > 0) params.rating = String(editMinRating);
    if (editLanguages.length) params.langs = editLanguages.join(',');
    setSearchParams(params);
  }

  function selectQuerySuggestion(canonical: string, label?: string) {
    setEditQuery(label || canonical);
    setQueryFocused(false);
    setQueryHighlight(-1);
    const cat = categories.find((c) => c.name === canonical);
    if (cat) setEditCategoryId(cat.id);
    else setEditServiceName(canonical);
  }

  function selectLocationSuggestion(s: string) {
    setLocFocused(false);
    setLocHighlight(-1);
    const cityInfo = CITY_TO_LOCATION[s];
    if (cityInfo) {
      setEditLocation(`${cityInfo.city}, ${cityInfo.state}, ${cityInfo.country}`);
      return;
    }
    const country = STATE_TO_COUNTRY[s];
    if (country) {
      setEditLocation(`${s}, ${country}`);
      return;
    }
    setEditLocation(s);
  }

  function handleQueryKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' && queryHighlight < 0) {
      executeSearch();
      return;
    }
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
    } else if (e.key === 'Escape') {
      setQueryFocused(false);
      setQueryHighlight(-1);
    }
  }

  function handleLocationKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' && locHighlight < 0) {
      executeSearch();
      return;
    }
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

  function clearFilters() {
    setEditQuery('');
    setEditLocation('');
    setEditCategoryId('');
    setEditServiceName('');
    setEditMinRating(0);
    setEditLanguages([]);
    setSearchParams({});
  }

  const activeCategory = categories.find((c) => c.id === categoryId);

  return (
    <div>
      {/* Hero header */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0">
          <img src={HERO_IMAGE} alt="" className="h-full w-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-br from-slate-900/85 via-slate-900/70 to-teal-900/60" />
        </div>
        <div className="relative mx-auto max-w-7xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8 lg:py-20">
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-teal-100 transition hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" />
            {t('search.backHome')}
          </Link>
          <div className="mt-4 max-w-3xl">
            <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-1.5 text-sm font-medium text-teal-100 backdrop-blur">
              <Sparkles className="h-4 w-4" />
              {t('search.resultsTitle')}
            </div>
            <h1 className="text-3xl font-bold leading-tight tracking-tight text-white sm:text-4xl lg:text-5xl">
              {activeCategory
                ? translateCategory(activeCategory.name, lang)
                : query || t('search.resultsTitle')}
            </h1>
            <p className="mt-3 max-w-2xl text-base text-slate-200 sm:text-lg">
              {t('search.resultsSubtitle')}
            </p>
          </div>

          {/* Search bar */}
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
              <input
                value={editQuery}
                onChange={(e) => {
                  setEditQuery(e.target.value);
                  setQueryHighlight(-1);
                }}
                onFocus={() => setQueryFocused(true)}
                onBlur={() => setTimeout(() => setQueryFocused(false), 150)}
                onKeyDown={handleQueryKeyDown}
                placeholder={t('search.searchPlaceholder')}
                className="w-full rounded-xl border-0 bg-white py-3.5 pl-12 pr-4 text-sm text-slate-900 shadow-lg outline-none ring-2 ring-transparent transition focus:ring-teal-400"
                style={{ paddingLeft: '3rem' }}
              />
              {queryFocused && filteredQuerySuggestions.length > 0 && (
                <div className="absolute z-50 mt-1 max-h-64 w-full overflow-auto rounded-xl border border-slate-200 bg-white py-1 shadow-xl">
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
                        {cat && <span className="ml-auto text-xs font-medium text-teal-600">{t('search.category')}</span>}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="relative flex-1 sm:max-w-xs">
              <MapPin className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
              <input
                value={editLocation}
                onChange={(e) => {
                  setEditLocation(e.target.value);
                  setLocHighlight(-1);
                }}
                onFocus={() => setLocFocused(true)}
                onBlur={() => setTimeout(() => setLocFocused(false), 150)}
                onKeyDown={handleLocationKeyDown}
                placeholder={t('search.locationPlaceholder')}
                className="w-full rounded-xl border-0 bg-white py-3.5 pl-12 pr-4 text-sm text-slate-900 shadow-lg outline-none ring-2 ring-transparent transition focus:ring-teal-400"
                style={{ paddingLeft: '3rem' }}
              />
              {locFocused && filteredLocationSuggestions.length > 0 && (
                <div className="absolute z-50 mt-1 max-h-64 w-full overflow-auto rounded-xl border border-slate-200 bg-white py-1 shadow-xl">
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
                        {suffix && <span className="ml-auto shrink-0 text-xs text-slate-400">{suffix}</span>}
                        {isCountry && !suffix && (
                          <span className="ml-auto text-xs font-medium text-teal-600">{t('common.country')}</span>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            <button
              onClick={executeSearch}
              className="flex items-center justify-center gap-2 rounded-xl bg-teal-600 px-6 py-3.5 text-sm font-semibold text-white shadow-lg transition hover:bg-teal-700"
            >
              <Search className="h-5 w-5" />
              {t('search.searchBtn')}
            </button>

            <button
              onClick={() => setShowFilters((s) => !s)}
              className="flex items-center justify-center gap-2 rounded-xl bg-white/10 px-4 py-3.5 text-sm font-medium text-white backdrop-blur transition hover:bg-white/20"
            >
              <SlidersHorizontal className="h-5 w-5" />
              {t('search.filters')}
              {activeFilterCount > 0 && (
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-teal-500 text-xs font-semibold text-white">
                  {activeFilterCount}
                </span>
              )}
            </button>
          </div>

          {/* Filters panel */}
          {showFilters && (
            <div className="mt-4 grid gap-4 rounded-2xl border border-white/20 bg-white/95 p-5 shadow-xl backdrop-blur sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                  {t('search.category')}
                </label>
                <select
                  value={editCategoryId}
                  onChange={(e) => setEditCategoryId(e.target.value)}
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
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                  {t('search.serviceName')}
                </label>
                <input
                  value={editServiceName}
                  onChange={(e) => setEditServiceName(e.target.value)}
                  placeholder={t('search.servicePlaceholder')}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none focus:border-teal-500"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                  {t('search.languages')}
                </label>
                <LanguageMultiSelect
                  selected={editLanguages}
                  onChange={setEditLanguages}
                  placeholder={t('search.languagesPlaceholder')}
                  compact
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                  {t('search.minRating')}: {editMinRating > 0 ? `${editMinRating}+` : t('search.minRatingAny')}
                </label>
                <input
                  type="range"
                  min={0}
                  max={5}
                  step={0.5}
                  value={editMinRating}
                  onChange={(e) => setEditMinRating(Number(e.target.value))}
                  className="w-full accent-teal-600"
                />
              </div>
              <div className="sm:col-span-2 lg:col-span-4">
                <button
                  onClick={executeSearch}
                  className="rounded-lg bg-teal-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-teal-700"
                >
                  {t('search.searchBtn')}
                </button>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Results section */}
      <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        {/* Results count */}
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">
              {!loading
                ? `${results.length} ${results.length === 1 ? t('search.providerFound') : t('search.providersFound')}`
                : t('common.loading')}
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              {activeFilterCount > 0
                ? `${activeFilterCount} ${activeFilterCount === 1 ? t('search.filterActive') : t('search.filtersActive')}`
                : t('search.showingAll')}
            </p>
          </div>
          {activeFilterCount > 0 && (
            <button
              onClick={clearFilters}
              className="flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
            >
              <X className="h-4 w-4" />
              {t('search.clearFilters')}
            </button>
          )}
        </div>

        {/* Results grid / loading / empty */}
        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="h-6 w-6 animate-spin text-teal-600" />
          </div>
        ) : results.length === 0 ? (
          <div className="relative overflow-hidden rounded-3xl border border-slate-200 bg-gradient-to-br from-slate-50 to-teal-50/50 px-6 py-16 text-center sm:py-24">
            {/* Decorative floating icons */}
            <div className="pointer-events-none absolute inset-0 overflow-hidden">
              <Search className="absolute left-[10%] top-[15%] h-10 w-10 text-teal-200/40 animate-bounce" style={{ animationDuration: '3s' }} />
              <Star className="absolute right-[12%] top-[20%] h-8 w-8 text-amber-200/50 animate-bounce" style={{ animationDuration: '4s', animationDelay: '0.5s' }} />
              <Users className="absolute bottom-[18%] left-[18%] h-9 w-9 text-slate-200/60 animate-bounce" style={{ animationDuration: '3.5s', animationDelay: '1s' }} />
              <ShieldCheck className="absolute bottom-[22%] right-[15%] h-9 w-9 text-teal-200/40 animate-bounce" style={{ animationDuration: '4.5s', animationDelay: '1.5s' }} />
            </div>

            <div className="relative">
              <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-white shadow-lg ring-4 ring-teal-100">
                <SearchX className="h-9 w-9 text-teal-500" />
              </div>
              <h3 className="text-2xl font-bold text-slate-900">{t('search.noResultsTitle')}</h3>
              <p className="mx-auto mt-3 max-w-md text-base text-slate-500">
                {t('search.noResultsDesc')}
              </p>
              <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
                <Link
                  to="/"
                  className="inline-flex items-center gap-2 rounded-xl bg-teal-600 px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-teal-700"
                >
                  <ArrowLeft className="h-4 w-4" />
                  {t('search.browseAll')}
                </Link>
                {activeFilterCount > 0 && (
                  <button
                    onClick={clearFilters}
                    className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-6 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                  >
                    <X className="h-4 w-4" />
                    {t('search.clearAll')}
                  </button>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {results.map((p) => (
              <ProviderCard key={p.user_id} provider={p} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
