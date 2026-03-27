import { i18n } from '../core/i18n.js';

export function createLanguageSwitcher(parentElement) {
  const container = document.createElement('div');
  container.className = 'language-switcher';
  container.setAttribute('role', 'group');
  container.setAttribute('aria-label', i18n.getUiText('language'));

  const label = document.createElement('span');
  label.className = 'language-switcher__label';

  container.appendChild(label);

  const languages = i18n.getAvailableLanguages();
  const buttons = {};

  languages.forEach((lang) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'language-switcher__button';
    button.textContent = lang.toUpperCase();
    button.dataset.language = lang;

    button.addEventListener('click', () => {
      i18n.setLanguage(lang);
    });

    buttons[lang] = button;
    container.appendChild(button);
  });

  const updateActiveButton = () => {
    const current = i18n.getLanguage();
    languages.forEach(lang => {
      buttons[lang].classList.toggle('active', lang === current);
      buttons[lang].setAttribute('aria-current', lang === current ? 'true' : 'false');
    });
  };

  i18n.subscribe(updateActiveButton);

  updateActiveButton();

  parentElement.appendChild(container);

  return {
    element: container,
    update: updateActiveButton,
  };
}
