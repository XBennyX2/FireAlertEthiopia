import { createContext, useState, useContext, useEffect } from 'react';
import translations from '../translation';

const LanguageContext = createContext();

export function LanguageProvider({ children }) {
  const [language, setLanguage] = useState(
    localStorage.getItem('language') || 'en'
  );

  function switchLanguage(lang) {
    setLanguage(lang);
    localStorage.setItem('language', lang);
    
    // Set Google Translate cookies
    document.cookie = `googtrans=/en/${lang}; path=/;`;
    document.cookie = `googtrans=/en/${lang}; path=/; domain=${window.location.hostname};`;
    
    // Try to trigger the Google Translate widget instantly
    const select = document.querySelector('.goog-te-combo');
    if (select) {
      select.value = lang;
      select.dispatchEvent(new Event('change'));
    } else {
      // If widget hasn't loaded yet, reload the page to initialize with the cookie
      window.location.reload();
    }
  }

  useEffect(() => {
    // Keep cookies synchronized
    const currentLang = language;
    document.cookie = `googtrans=/en/${currentLang}; path=/;`;
    document.cookie = `googtrans=/en/${currentLang}; path=/; domain=${window.location.hostname};`;

    let attempts = 0;
    const triggerTranslation = () => {
      const select = document.querySelector('.goog-te-combo');
      if (select) {
        if (select.value !== currentLang) {
          select.value = currentLang;
          select.dispatchEvent(new Event('change'));
        }
      } else if (attempts < 20) {
        attempts++;
        setTimeout(triggerTranslation, 300);
      }
    };

    triggerTranslation();
  }, [language]);

  // Always use English keys as the source. Google Translate will dynamically localize the DOM.
  const t = translations['en'];

  return (
    <LanguageContext.Provider value={{ language, switchLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  return useContext(LanguageContext);
}