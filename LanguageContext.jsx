import { createContext, useContext, useMemo, useState, useEffect } from 'react';
import { TRANSLATIONS, LANGUAGES } from './translations';

const LanguageContext = createContext(null);
const STORAGE_KEY = 'dh-lang';

function detectDefaultLanguage() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved && TRANSLATIONS[saved]) return saved;
  const browserLang = (navigator.language || 'en').slice(0, 2);
  return TRANSLATIONS[browserLang] ? browserLang : 'en';
}

export function LanguageProvider({ children }) {
  const [lang, setLangState] = useState(detectDefaultLanguage);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, lang);
    document.documentElement.setAttribute('lang', lang);
  }, [lang]);

  function setLang(code) {
    if (TRANSLATIONS[code]) setLangState(code);
  }

  // t('some.key') -> translated string, falls back to English, then the key itself.
  const t = useMemo(() => {
    const dict = TRANSLATIONS[lang] || TRANSLATIONS.en;
    return (key) => dict[key] ?? TRANSLATIONS.en[key] ?? key;
  }, [lang]);

  const value = { lang, setLang, t, languages: LANGUAGES };

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  return useContext(LanguageContext);
}
