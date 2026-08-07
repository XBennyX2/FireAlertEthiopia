import { createContext, useState, useContext, useEffect } from 'react';
import translations from '../translation';

const LanguageContext = createContext();

function applyGoogleTranslate(lang) {
  if (typeof document === 'undefined') return;

  if (lang === 'am') {
    document.cookie = 'googtrans=/en/am; path=/;';
    document.cookie = `googtrans=/en/am; path=/; domain=${window.location.hostname};`;
    document.documentElement.lang = 'am';

    const select = document.querySelector('.goog-te-combo');
    if (select) {
      select.value = 'am';
      select.dispatchEvent(new Event('change'));
    }
    return;
  }

  document.cookie = 'googtrans=/en/en; path=/;';
  document.cookie = `googtrans=/en/en; path=/; domain=${window.location.hostname};`;
  document.documentElement.lang = 'en';
}

export function LanguageProvider({ children }) {
  const [language, setLanguage] = useState(() => {
    if (typeof window === 'undefined') return 'en';
    return localStorage.getItem('language') || 'en';
  });

  function switchLanguage(lang) {
    setLanguage(lang);
    localStorage.setItem('language', lang);
    applyGoogleTranslate(lang);

    if (typeof window !== 'undefined') {
      window.location.reload();
    }
  }

  useEffect(() => {
    document.documentElement.lang = language === 'am' ? 'am' : 'en';

    if (language === 'am') {
      applyGoogleTranslate(language);
    } else {
      applyGoogleTranslate('en');
    }
  }, [language]);

  const t = translations[language] || translations.en;

  return (
    <LanguageContext.Provider value={{ language, switchLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  return useContext(LanguageContext);
}