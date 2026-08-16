import { useState, useRef, useEffect } from 'react';
import { Languages, ChevronDown, Check, X } from 'lucide-react';

const PRIORITY_LANGUAGES = ['English', 'Portuguese', 'French'];

const OTHER_LANGUAGES = [
  'Afrikaans',
  'Albanian',
  'Amharic',
  'Arabic',
  'Armenian',
  'Bengali',
  'Bosnian',
  'Bulgarian',
  'Burmese',
  'Cantonese',
  'Cape Verdean Creole',
  'Catalan',
  'Croatian',
  'Czech',
  'Danish',
  'Dutch',
  'Estonian',
  'Finnish',
  'Georgian',
  'German',
  'Greek',
  'Gujarati',
  'Haitian Creole',
  'Hausa',
  'Hebrew',
  'Hindi',
  'Hungarian',
  'Igbo',
  'Indonesian',
  'Italian',
  'Japanese',
  'Kannada',
  'Khmer',
  'Korean',
  'Lao',
  'Latvian',
  'Lithuanian',
  'Malay',
  'Malayalam',
  'Mandarin',
  'Marathi',
  'Nepali',
  'Norwegian',
  'Pashto',
  'Persian',
  'Polish',
  'Punjabi',
  'Romanian',
  'Russian',
  'Serbian',
  'Sign Language',
  'Sinhala',
  'Slovak',
  'Slovenian',
  'Somali',
  'Spanish',
  'Swahili',
  'Swedish',
  'Tagalog',
  'Tamil',
  'Telugu',
  'Thai',
  'Tigrinya',
  'Turkish',
  'Ukrainian',
  'Urdu',
  'Vietnamese',
  'Wolof',
  'Yoruba',
  'Zulu',
];

export const WORLD_LANGUAGES: string[] = [...PRIORITY_LANGUAGES, ...OTHER_LANGUAGES];

interface LanguageMultiSelectProps {
  selected: string[];
  onChange: (languages: string[]) => void;
  placeholder?: string;
  label?: string;
  compact?: boolean;
}

export function LanguageMultiSelect({
  selected,
  onChange,
  placeholder = 'Select languages',
  label,
  compact = false,
}: LanguageMultiSelectProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const available = WORLD_LANGUAGES.filter((l) => !selected.includes(l));

  function toggle(lang: string) {
    if (selected.includes(lang)) {
      onChange(selected.filter((l) => l !== lang));
    } else {
      onChange([...selected, lang]);
    }
  }

  return (
    <div ref={ref} className="relative">
      {label && (
        <label className="mb-1.5 block text-sm font-medium text-slate-700">{label}</label>
      )}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={`flex w-full items-center gap-2 rounded-lg border border-slate-300 bg-white ${
          compact ? 'px-3 py-2' : 'py-2.5 pl-10 pr-3'
        } text-sm text-slate-900 outline-none transition focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20`}
      >
        {!compact && (
          <Languages className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        )}
        <span className={`flex-1 text-left ${selected.length === 0 ? 'text-slate-400' : ''}`}>
          {selected.length === 0 ? placeholder : `${selected.length} selected`}
        </span>
        <ChevronDown className={`h-4 w-4 shrink-0 text-slate-400 transition ${open ? 'rotate-180' : ''}`} />
      </button>

      {selected.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {selected.map((l) => (
            <span
              key={l}
              className="inline-flex items-center gap-1 rounded-full bg-teal-50 px-2.5 py-1 text-xs font-medium text-teal-700"
            >
              {l}
              <button
                type="button"
                onClick={() => onChange(selected.filter((x) => x !== l))}
                className="text-teal-500 transition hover:text-teal-800"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
      )}

      {open && (
        <div className="absolute z-50 mt-1 max-h-64 w-full overflow-auto rounded-xl border border-slate-200 bg-white py-1 shadow-lg">
          {available.length === 0 ? (
            <p className="px-3 py-2 text-sm text-slate-400">All languages selected</p>
          ) : (
            available.map((l) => (
              <button
                key={l}
                type="button"
                onClick={() => toggle(l)}
                className="flex w-full items-center justify-between px-3 py-2 text-sm text-slate-700 transition hover:bg-slate-50"
              >
                {l}
                <Check className="h-4 w-4 opacity-0" />
              </button>
            ))
          )}
          {available.length > 0 && selected.length > 0 && (
            <div className="border-t border-slate-100 pt-1">
              <button
                type="button"
                onClick={() => {
                  onChange([]);
                }}
                className="flex w-full items-center gap-2 px-3 py-2 text-sm font-medium text-slate-500 transition hover:bg-slate-50"
              >
                <X className="h-4 w-4" />
                Clear all
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
