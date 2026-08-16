import { Link } from 'react-router-dom';
import { MapPin, Languages, Store } from 'lucide-react';
import { StarRating } from '@/components/common/StarRating';
import { useI18n } from '@/i18n/I18nContext';
import { SearchProviderResult } from '@/types/database';

export function ProviderCard({ provider }: { provider: SearchProviderResult }) {
  const { t, lang } = useI18n();
  const displayName = provider.alias || provider.company_name;
  const location = [provider.city, provider.state, provider.country].filter(Boolean).join(', ');

  return (
    <Link
      to={`/providers/${provider.user_id}`}
      className="group flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg"
    >
      <div className="flex items-center gap-4 border-b border-slate-100 p-5">
        <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-teal-50 text-teal-700">
          {provider.logo_url ? (
            <img src={provider.logo_url} alt={displayName} className="h-full w-full object-cover" />
          ) : (
            <Store className="h-6 w-6" />
          )}
        </div>
        <div className="min-w-0">
          <h3 className="truncate text-base font-semibold text-slate-900 group-hover:text-teal-700">
            {displayName || t('provider.unnamed')}
          </h3>
          <div className="mt-1 flex items-center gap-1.5">
            <StarRating value={provider.avg_rating} size={14} />
            <span className="text-xs text-slate-500">
              {provider.rating_count > 0 ? `${provider.avg_rating.toFixed(1)} (${provider.rating_count})` : t('provider.noRatings')}
            </span>
          </div>
        </div>
      </div>
      <div className="flex-1 space-y-2 p-5 text-sm text-slate-600">
        {location && (
          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4 shrink-0 text-slate-400" />
            <span className="truncate">{location}</span>
          </div>
        )}
        {provider.languages.length > 0 && (
          <div className="flex items-center gap-2">
            <Languages className="h-4 w-4 shrink-0 text-slate-400" />
            <span className="truncate">{provider.languages.join(', ')}</span>
          </div>
        )}
      </div>
    </Link>
  );
}
