import { createContext, useContext, useState, ReactNode } from 'react';
import { Language, TranslationKey } from './types';
import { en } from './en';
import { ptBR } from './pt-BR';
import { fr } from './fr';

const translations: Record<Language, TranslationKey> = {
  en,
  'pt-BR': ptBR,
  fr,
};

const STORAGE_KEY = 'trusthub-lang';

interface I18nContextValue {
  lang: Language;
  setLang: (lang: Language) => void;
  t: (key: keyof TranslationKey, params?: Record<string, string>) => string;
}

const I18nContext = createContext<I18nContextValue | undefined>(undefined);

function getInitialLang(): Language {
  if (typeof window === 'undefined') return 'en';
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored === 'en' || stored === 'pt-BR' || stored === 'fr') return stored;
  const browser = navigator.language;
  if (browser.startsWith('pt')) return 'pt-BR';
  if (browser.startsWith('fr')) return 'fr';
  return 'en';
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Language>(getInitialLang);

  function setLang(newLang: Language) {
    setLangState(newLang);
    localStorage.setItem(STORAGE_KEY, newLang);
  }

  function t(key: keyof TranslationKey, params?: Record<string, string>): string {
    let str = translations[lang][key] ?? en[key] ?? key;
    if (params) {
      for (const [k, v] of Object.entries(params)) {
        str = str.replace(`{${k}}`, v);
      }
    }
    return str;
  }

  return <I18nContext.Provider value={{ lang, setLang, t }}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error('useI18n must be used within I18nProvider');
  return ctx;
}
