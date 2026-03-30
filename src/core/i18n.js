import { UI_TRANSLATIONS, CITY_CONTENT } from '../i18n/translations.js';

const STORAGE_KEY = 'app-language';
const DEFAULT_LANGUAGE = 'ru';
const AVAILABLE_LANGUAGES = ['ru', 'kz'];
const LANGUAGE_CONTENT_MAP = {
  kz: 'kk',
};

class I18nManager {
  constructor() {
    this.currentLanguage = this.loadLanguage();
    this.listeners = [];

    if (typeof document !== 'undefined') {
      document.documentElement.lang = this.resolveContentLanguage(this.currentLanguage);
      document.documentElement.dataset.language = this.currentLanguage;
    }
  }

  normalizeLanguage(lang) {
    if (lang === 'kk') {
      return 'kz';
    }

    return AVAILABLE_LANGUAGES.includes(lang) ? lang : null;
  }

  resolveContentLanguage(lang) {
    return LANGUAGE_CONTENT_MAP[lang] || lang;
  }

  loadLanguage() {
    const saved = localStorage.getItem(STORAGE_KEY);
    return this.normalizeLanguage(saved) || DEFAULT_LANGUAGE;
  }

  setLanguage(lang) {
    const normalizedLanguage = this.normalizeLanguage(lang);

    if (!normalizedLanguage) {
      console.warn(`Language "${lang}" not available`);
      return;
    }

    this.currentLanguage = normalizedLanguage;
    localStorage.setItem(STORAGE_KEY, normalizedLanguage);
    document.documentElement.lang = this.resolveContentLanguage(normalizedLanguage);
    document.documentElement.dataset.language = normalizedLanguage;
    this.notifyListeners();
  }

  getLanguage() {
    return this.currentLanguage;
  }

  getUiText(key) {
    const contentLanguage = this.resolveContentLanguage(this.currentLanguage);
    return UI_TRANSLATIONS[contentLanguage]?.[key] || UI_TRANSLATIONS[DEFAULT_LANGUAGE][key] || `[${key}]`;
  }

  getCityContent(cityKey) {
    const contentLanguage = this.resolveContentLanguage(this.currentLanguage);
    return CITY_CONTENT[contentLanguage]?.[cityKey] || CITY_CONTENT[DEFAULT_LANGUAGE][cityKey];
  }

  subscribe(callback) {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter(l => l !== callback);
    };
  }

  notifyListeners() {
    this.listeners.forEach(callback => callback(this.currentLanguage));
  }

  getAvailableLanguages() {
    return AVAILABLE_LANGUAGES;
  }
}

export const i18n = new I18nManager();
