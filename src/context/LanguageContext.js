import React, { createContext, useState, useContext, useEffect } from 'react';
import { useTranslation as useI18nTranslation } from 'react-i18next';
import i18n from '../i18n';

export const LanguageContext = createContext();

export const LanguageProvider = ({ children }) => {
  const { t: i18nT } = useI18nTranslation();
  const [lang, setLang] = useState(i18n.language || 'en');

  useEffect(() => {
    // Sync with i18n language
    setLang(i18n.language);
    
    // Set RTL/LTR direction on HTML tag
    const dir = i18n.language === 'ur' ? 'rtl' : 'ltr';
    document.documentElement.dir = dir;
    document.documentElement.lang = i18n.language;
    
    // Force body font for Urdu if needed
    if (i18n.language === 'ur') {
      document.body.classList.add('urdu-font');
    } else {
      document.body.classList.remove('urdu-font');
    }
  }, [i18n.language]);

  const toggleLang = () => {
    const newLang = i18n.language === 'en' ? 'ur' : 'en';
    i18n.changeLanguage(newLang);
    setLang(newLang);
  };

  const t = (key) => {
    // Support nested keys if needed, though i18next does this by default
    return i18nT(key);
  };

  return (
    <LanguageContext.Provider value={{ lang, toggleLang, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useTranslation = () => useContext(LanguageContext);
