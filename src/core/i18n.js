import { UI_TRANSLATIONS, CITY_CONTENT } from '../i18n/translations.js';

const STORAGE_KEY = 'app-language';
const DEFAULT_LANGUAGE = 'ru';
const AVAILABLE_LANGUAGES = ['ru', 'en', 'kk'];

class I18nManager {
  constructor() {
    this.currentLanguage = this.loadLanguage();
    this.listeners = [];
  }

  loadLanguage() {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved && AVAILABLE_LANGUAGES.includes(saved) ? saved : DEFAULT_LANGUAGE;
  }

  setLanguage(lang) {
    if (!AVAILABLE_LANGUAGES.includes(lang)) {
      console.warn(`Language "${lang}" not available`);
      return;
    }
    
    this.currentLanguage = lang;
    localStorage.setItem(STORAGE_KEY, lang);
    document.documentElement.lang = lang;
    this.notifyListeners();
  }

  getLanguage() {
    return this.currentLanguage;
  }

  getUiText(key) {
    return UI_TRANSLATIONS[this.currentLanguage]?.[key] || UI_TRANSLATIONS[DEFAULT_LANGUAGE][key] || `[${key}]`;
  }

  getCityContent(cityKey) {
    return CITY_CONTENT[this.currentLanguage]?.[cityKey] || CITY_CONTENT[DEFAULT_LANGUAGE][cityKey];
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
