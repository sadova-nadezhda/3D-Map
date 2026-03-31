import { i18n } from '../core/i18n.js';

const INTRO_COPY = {
  ru: {
    title: 'Уличная еда Казахстана: от Актау до Усть-Каменогорска',
    description:
      'К выходу сериала «STREETХАНА» мы собрали карту стритфуда — с блюдами, которые любят в разных городах страны, и точками, где их можно попробовать',
    button: 'Исследовать',
    close: 'Закрыть приветственное окно',
    labels: {
      greens: 'зелень',
      meat: 'мясо',
      sauce: 'соус',
      pepper: 'перец',
      baursak: 'баурсак',
    },
  },
  kz: {
    title: 'Қазақстанның дәмі қандай?',
    description:
      '«STREETХАНА» сериалының шығуына орай біз Қазақстанның түрлі қалаларындағы сүйікті стритфуд тағамдарын және оларды табуға болатын нүктелерді картаға жинадық.',
    button: 'Іздеу!',
    close: 'Таныстыру терезесін жабу',
    labels: {
      greens: 'көк',
      meat: 'ет',
      sauce: 'тұздық',
      pepper: 'бұрыш',
      baursak: 'бауырсақ',
    },
  },
};

function getCopy() {
  return INTRO_COPY[i18n.getLanguage()] || INTRO_COPY.ru;
}

export function createIntroModalController({
  overlay,
  mapPanel,
  actionButton,
  titleElement,
  descriptionElement,
  heroImage,
  onAction = null,
}) {
  function updateCopy() {
    const copy = getCopy();
    const language = i18n.getLanguage();

    titleElement.textContent = copy.title;
    descriptionElement.textContent = copy.description;
    actionButton.textContent = copy.button;

    if (heroImage) {
      heroImage.src = language === 'kz' ? '/media/shaursak-kz.png' : '/media/shaursak-ru.png';
    }
  }

  function show() {
    updateCopy();
    overlay.classList.add('active');
    overlay.setAttribute('aria-hidden', 'false');
    document.body.classList.add('modal-open');
    mapPanel.classList.add('map-panel--overlay');
  }

  function hide() {
    overlay.classList.remove('active');
    overlay.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('modal-open');
    mapPanel.classList.remove('map-panel--overlay');
  }

  actionButton.addEventListener('click', () => {
    if (typeof onAction === 'function') {
      onAction();
      return;
    }

    hide();
  });
  overlay.addEventListener('click', (event) => {
    if (event.target === overlay) {
      hide();
    }
  });

  return {
    show,
    hide,
    updateCopy,
    isActive() {
      return overlay.classList.contains('active');
    },
  };
}
