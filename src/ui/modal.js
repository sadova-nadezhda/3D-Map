export function createModalController({
  cityContent,

  hintCard,
  hintTitle,
  hintText,

  previewCard,
  previewTitle,
  previewText,
  previewImage,
  previewMore,
  previewClose,

  modalOverlay,
  modalTitle,
  modalDescription,
  modalImage,
  closeModalButton,
}) {
  let activeCityKey = null;

  function getCity(cityKey) {
    return cityContent[cityKey] || null;
  }

  function showHint(cityKey) {
    const city = getCity(cityKey);
    if (!city) return;

    activeCityKey = cityKey;

    hintTitle.textContent = city.hintTitle || 'Откройте карточку';
    hintText.textContent =
      city.hintText || 'Нажмите на активный город, чтобы посмотреть информацию.';

    hintCard.hidden = false;

    requestAnimationFrame(() => {
      hintCard.classList.add('active');
    });
  }

  function hideHint() {
    hintCard.classList.remove('active');

    window.setTimeout(() => {
      hintCard.hidden = true;
    }, 220);
  }

  function showPreview(cityKey) {
    const city = getCity(cityKey);
    if (!city) return;

    activeCityKey = cityKey;

    previewTitle.textContent = city.title || '';
    previewText.textContent = city.previewText || city.shortText || '';
    previewImage.src = city.image || '';
    previewImage.alt = city.title || '';
    previewMore.textContent = city.buttonText || 'Подробнее';

    hideHint();
    hideModal();

    previewCard.hidden = false;

    requestAnimationFrame(() => {
      previewCard.classList.add('active');
    });
  }

  function hidePreview() {
    previewCard.classList.remove('active');

    window.setTimeout(() => {
      previewCard.hidden = true;
    }, 220);
  }

  function showModal(cityKey) {
    const city = getCity(cityKey);
    if (!city) return;

    activeCityKey = cityKey;

    modalTitle.textContent = city.title || '';
    modalDescription.textContent = city.description || '';
    modalImage.src = city.image || '';
    modalImage.alt = city.title || '';

    modalOverlay.hidden = false;

    requestAnimationFrame(() => {
      modalOverlay.classList.add('active');
    });
  }

  function hideModal() {
    modalOverlay.classList.remove('active');

    window.setTimeout(() => {
      modalOverlay.hidden = true;
    }, 260);
  }

  function hideAll() {
    hideHint();
    hidePreview();
    hideModal();
  }

  previewMore.addEventListener('click', () => {
    if (!activeCityKey) return;
    showModal(activeCityKey);
  });

  previewClose.addEventListener('click', hidePreview);
  closeModalButton.addEventListener('click', hideModal);

  modalOverlay.addEventListener('click', (event) => {
    if (event.target === modalOverlay) {
      hideModal();
    }
  });

  return {
    showHint,
    hideHint,
    showPreview,
    hidePreview,
    showModal,
    hideModal,
    hideAll,
    show: showModal,
  };
}