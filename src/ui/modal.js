const CITY_MAP_EMBEDS = {
  city_almaty:
    '<iframe src="https://yandex.ru/map-widget/v1/?um=constructor%3A24efcd186f45037f85fe5fc9476a71615db02ecb0c5b9e7b6bb9bea3520c774e&amp;source=constructor" width="420" height="300" frameborder="0"></iframe>',
  city_astana:
    '<iframe src="https://yandex.ru/map-widget/v1/?um=constructor%3A60c0ea94e9d3fe10ee432877398e6cfa34d28b399802567c7f36037850bd7625&amp;source=constructor" width="420" height="300" frameborder="0"></iframe>',
  city_shym:
    '<iframe src="https://yandex.ru/map-widget/v1/?um=constructor%3Ad824f526d9386ce1766f821d3f553d644a0435298dfe28582e25f62e44e3e492&amp;source=constructor" width="420" height="300" frameborder="0"></iframe>',
  city_kostanay:
    '<iframe src="https://yandex.ru/map-widget/v1/?um=constructor%3A1bc7df7dd78b7c06af23d69d12f814ed0754be8de0d8064547079cbbd2acc828&amp;source=constructor" width="420" height="300" frameborder="0"></iframe>',
  city_aqtay:
    '<iframe src="https://yandex.ru/map-widget/v1/?um=constructor%3A3cd8f61abe6e0128462e7e372e5bafc08357e5e232ce3bfbe6f64cc5fcad18d0&amp;source=constructor" width="420" height="300" frameborder="0"></iframe>',
  city_uske:
    '<iframe src="https://yandex.ru/map-widget/v1/?um=constructor%3Ab790d75fd4b1a649940737af8bcfc8f8032669e79b88ebdda84bb846b1b4c08e&amp;source=constructor" width="420" height="300" frameborder="0"></iframe>',
  city_karaganda:
    '<iframe src="https://yandex.ru/map-widget/v1/?um=constructor%3A3160682c8db82602a7891d3406680a2189ff32c029591dc4f8b643752ba07cb4&amp;source=constructor" width="420" height="300" frameborder="0"></iframe>',
  city_aqtobe:
    '<iframe src="https://yandex.ru/map-widget/v1/?um=constructor%3Abfc592bd7ca1ab0e48eedb318bc6cb4ee12ee055c2f47bd2752a6b99b9e4f939&amp;source=constructor" width="420" height="300" frameborder="0"></iframe>',
};

const CITY_IMAGES = {
  city_almaty: '/media/Лагман 2.png',
  city_astana: '/media/Бургер 2.png',
  city_shym: '/media/Шашлык 2.png',
  city_kostanay: '/media/Беляши 2.png',
  city_aqtay: '/media/Фишбармак 2.png',
  city_uske: '/media/Искандер-Кебаб 2.png',
  city_karaganda: '/media/Рамен 2.png',
  city_aqtobe: '/media/Донер 2.png',
};

export function createModalController({
  cityContent,
  mapPanel,
  previewCard,
  previewImage,
  previewTag,
  previewTitle,
  previewDescription,
  previewButton,
  closePreviewButton,
  detailOverlay,
  modalTitle,
  modalDescription,
  closeModalButton,
  modalMapLink,
  modalMapContainer,
  modalImage,
  onPreviewShown = () => {},
}) {
  let activeCityKey = null;

  function renderModalDescription(city) {
    if (!modalDescription) return;

    const descriptionParts = [city.description, city.dishDescription, city.placeDescription].filter(Boolean);

    modalDescription.innerHTML = '';

    descriptionParts.forEach((text) => {
      const paragraph = document.createElement('p');
      paragraph.textContent = text;
      modalDescription.appendChild(paragraph);
    });
  }

  function syncPanelOverlay() {
    const hasPreview = previewCard.classList.contains('active');
    const hasDetail = detailOverlay.classList.contains('active');
    const isMobile = window.innerWidth <= 768;

    mapPanel.classList.toggle('map-panel--overlay', hasDetail || (hasPreview && !isMobile));
  }

  function fillContent(cityKey) {
    const city = cityContent[cityKey];
    if (!city) return null;
    const mapEmbed = city.mapEmbed || CITY_MAP_EMBEDS[cityKey];
    const imageSrc = city.image || CITY_IMAGES[cityKey];

    previewTag.textContent = city.tag;
    previewTitle.textContent = city.venueTitle;
    previewDescription.textContent = city.previewDescription || city.description;
    previewImage.style.backgroundImage = imageSrc ? `url("${imageSrc}")` : 'none';

    modalTitle.textContent = city.venueTitle;
    renderModalDescription(city);
    
    // Handle map display: either embed iframe or show link with marker
    if (mapEmbed) {
      modalMapContainer.innerHTML = mapEmbed;
      modalMapLink.style.display = 'none';
    } else {
      modalMapContainer.innerHTML = '<div class="detail-modal__map-marker"></div>';
      modalMapLink.href = city.mapLink;
      modalMapLink.style.display = '';
    }

    previewImage.style.setProperty('--city-accent', city.accent);
    modalImage.style.setProperty('--city-accent', city.accent);
    
    if (imageSrc) {
      const img = document.createElement('img');
      img.src = imageSrc;
      img.alt = city.imageLabel || city.venueTitle || city.title;
      modalImage.innerHTML = '';
      modalImage.appendChild(img);
    } else {
      modalImage.innerHTML = '';
    }

    activeCityKey = cityKey;
    return city;
  }

  function showPreview(cityKey) {
    const city = fillContent(cityKey);
    if (!city) return;

    previewCard.classList.add('active');
    previewCard.setAttribute('aria-hidden', 'false');
    detailOverlay.classList.remove('active');
    detailOverlay.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('modal-open');
    syncPanelOverlay();
    onPreviewShown(cityKey);
  }

  function showDetail(cityKey = activeCityKey) {
    const city = fillContent(cityKey);
    if (!city) return;

    previewCard.classList.remove('active');
    previewCard.setAttribute('aria-hidden', 'true');
    detailOverlay.classList.add('active');
    detailOverlay.setAttribute('aria-hidden', 'false');
    document.body.classList.add('modal-open');
    syncPanelOverlay();
  }

  function hidePreview() {
    previewCard.classList.remove('active');
    previewCard.setAttribute('aria-hidden', 'true');
    syncPanelOverlay();
  }

  function hideDetail() {
    detailOverlay.classList.remove('active');
    detailOverlay.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('modal-open');
    syncPanelOverlay();
  }

  function hideAll() {
    hidePreview();
    hideDetail();
    activeCityKey = null;
  }

  previewButton.addEventListener('click', () => showDetail());
  previewCard.addEventListener('click', (event) => {
    if (event.target === previewButton || event.target === closePreviewButton) return;
    if (window.innerWidth <= 768) return;
    showDetail();
  });
  closePreviewButton.addEventListener('click', hidePreview);

  closeModalButton.addEventListener('click', hideDetail);
  detailOverlay.addEventListener('click', (event) => {
    if (event.target === detailOverlay) hideDetail();
  });

  return {
    showPreview,
    showDetail,
    hidePreview,
    hideDetail,
    hideAll,
    updateCityContent(newCityContent) {
      cityContent = newCityContent;
      if (activeCityKey && cityContent[activeCityKey]) {
        fillContent(activeCityKey);
      }
    },
  };
}
