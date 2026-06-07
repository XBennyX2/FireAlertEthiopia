import { createContext, useState, useContext } from 'react';
import translations from '../translation';

const LanguageContext = createContext();

export function LanguageProvider({ children }) {
  const [language, setLanguage] = useState(
    localStorage.getItem('language') || 'en'
  );

  function switchLanguage(lang) {
    setLanguage(lang);
    localStorage.setItem('language', lang);
  }

  const t = translations[language];

  return (
    <LanguageContext.Provider value={{ language, switchLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  return useContext(LanguageContext);
}