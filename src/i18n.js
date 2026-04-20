import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// Import translations directly for now to ensure they are available immediately
// or use i18next-http-backend if you prefer loading from public/locales
import enTranslation from './locales/en.json';
import urTranslation from './locales/ur.json';

// Since I created files in public/locales, I should ideally use Backend
// But for simplicity and to match existing structure, I'll use them as resources
// Wait, I created them in public/locales. Let's see if I should just use them as objects here.

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: require('../public/locales/en/translation.json') },
      ur: { translation: require('../public/locales/ur/translation.json') }
    },
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false,
    },
    detection: {
      order: ['localStorage', 'cookie', 'htmlTag', 'path', 'subdomain'],
      caches: ['localStorage'],
    },
  });

export default i18n;
