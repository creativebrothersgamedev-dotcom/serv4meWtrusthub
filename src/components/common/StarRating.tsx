import { Star } from 'lucide-react';

interface StarRatingProps {
  value: number;
  size?: number;
  interactive?: boolean;
  onChange?: (value: number) => void;
}

export function StarRating({ value, size = 16, interactive = false, onChange }: StarRatingProps) {
  const stars = [1, 2, 3, 4, 5];

  return (
    <div className="flex items-center gap-0.5">
      {stars.map((star) => (
        <button
          key={star}
          type="button"
          disabled={!interactive}
          onClick={() => onChange?.(star)}
          className={interactive ? 'cursor-pointer transition hover:scale-110' : 'cursor-default'}
          aria-label={`${star} star`}
        >
          <Star
            width={size}
            height={size}
            className={star <= Math.round(value) ? 'fill-amber-400 text-amber-400' : 'fill-slate-200 text-slate-200'}
          />
        </button>
      ))}
    </div>
  );
}
