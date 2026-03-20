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
  modalCityTag,
  modalRating,
  modalHours,
  modalDishTitle,
  modalDishDescription,
  modalPlaceDescription,
  modalMapLink,
  modalImage,
  modalImageLabel,
}) {
  let activeCityKey = null;

  function syncPanelOverlay() {
    const hasPreview = previewCard.classList.contains('active');
    const hasDetail = detailOverlay.classList.contains('active');
    const isMobile = window.innerWidth <= 768;

    mapPanel.classList.toggle('map-panel--overlay', hasDetail || (hasPreview && !isMobile));
  }

  function fillContent(cityKey) {
    const city = cityContent[cityKey];
    if (!city) return null;

    previewTag.textContent = city.tag;
    previewTitle.textContent = city.venueTitle;
    previewDescription.textContent = city.previewDescription || city.description;

    modalTitle.textContent = city.venueTitle;
    modalDescription.textContent = city.description;
    modalCityTag.textContent = city.tag;
    modalRating.textContent = `★ ${city.rating}`;
    modalHours.textContent = `◷ ${city.hours}`;
    modalDishTitle.textContent = city.dishTitle;
    modalDishDescription.textContent = city.dishDescription;
    modalPlaceDescription.textContent = city.placeDescription;
    modalMapLink.href = city.mapLink;
    modalImageLabel.textContent = city.imageLabel;

    previewImage.style.setProperty('--city-accent', city.accent);
    modalImage.style.setProperty('--city-accent', city.accent);

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
  };
}
