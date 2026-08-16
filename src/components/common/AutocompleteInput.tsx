import { useState, useRef, useEffect } from 'react';
import { MapPin } from 'lucide-react';

interface AutocompleteInputProps {
  value: string;
  onChange: (value: string) => void;
  suggestions: string[];
  placeholder?: string;
  label?: string;
  icon?: boolean;
  className?: string;
}

export function AutocompleteInput({
  value,
  onChange,
  suggestions,
  placeholder,
  label,
  icon = false,
  className = '',
}: AutocompleteInputProps) {
  const [focused, setFocused] = useState(false);
  const [highlightIndex, setHighlightIndex] = useState(-1);
  const blurTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const trimmed = value.trim().toLowerCase();
  const filtered = trimmed
    ? suggestions.filter((s) => s.toLowerCase().includes(trimmed)).slice(0, 8)
    : suggestions.slice(0, 8);

  const showDropdown = focused && filtered.length > 0;
  const isValid = value.trim() !== '' && suggestions.some((s) => s === value);

  useEffect(() => {
    return () => {
      if (blurTimer.current) clearTimeout(blurTimer.current);
    };
  }, []);

  function selectSuggestion(s: string) {
    onChange(s);
    setFocused(false);
    setHighlightIndex(-1);
  }

  function handleBlur() {
    blurTimer.current = setTimeout(() => {
      setFocused(false);
      if (value.trim() !== '' && !suggestions.includes(value)) {
        const exact = suggestions.find((s) => s.toLowerCase() === value.trim().toLowerCase());
        if (exact) {
          onChange(exact);
        } else {
          onChange('');
        }
      }
    }, 150);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!showDropdown) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightIndex((i) => Math.min(i + 1, filtered.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (highlightIndex >= 0) {
        selectSuggestion(filtered[highlightIndex]);
      } else if (filtered.length === 1) {
        selectSuggestion(filtered[0]);
      } else {
        const exact = suggestions.find((s) => s.toLowerCase() === value.trim().toLowerCase());
        if (exact) {
          selectSuggestion(exact);
        } else {
          onChange('');
          setFocused(false);
        }
      }
    } else if (e.key === 'Escape') {
      setFocused(false);
      setHighlightIndex(-1);
    }
  }

  return (
    <div className="relative">
      {label && (
        <label className="mb-1.5 block text-sm font-medium text-slate-700">{label}</label>
      )}
      <div className="relative">
        {icon && (
          <MapPin className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        )}
        <input
          value={value}
          onChange={(e) => {
            onChange(e.target.value);
            setHighlightIndex(-1);
          }}
          onFocus={() => setFocused(true)}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className={`w-full rounded-lg border py-2.5 text-sm text-slate-900 outline-none transition focus:ring-2 focus:ring-teal-500/20 ${
            value.trim() !== '' && !isValid
              ? 'border-amber-400 focus:border-amber-500'
              : 'border-slate-300 focus:border-teal-500'
          } ${icon ? 'pl-10 pr-3' : 'px-3'} ${className}`}
        />
      </div>
      {value.trim() !== '' && !isValid && focused && (
        <p className="mt-1 text-xs text-amber-600">
          Pick a match from the list to avoid spelling mismatches.
        </p>
      )}
      {showDropdown && (
        <div className="absolute z-50 mt-1 max-h-56 w-full overflow-auto rounded-xl border border-slate-200 bg-white py-1 shadow-lg">
          {filtered.map((s, i) => (
            <button
              key={s}
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                selectSuggestion(s);
              }}
              onMouseEnter={() => setHighlightIndex(i)}
              className={`flex w-full items-center px-3 py-2 text-left text-sm transition ${
                i === highlightIndex ? 'bg-teal-50 text-teal-800' : 'text-slate-700 hover:bg-slate-50'
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
