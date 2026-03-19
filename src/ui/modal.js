export function createModalController({
  modalOverlay,
  modalTitle,
  modalDescription,
  closeModalButton,
  cityContent,
}) {
  function show(cityKey) {
    const city = cityContent[cityKey];
    if (!city) return;

    modalTitle.textContent = city.title;
    modalDescription.textContent = city.description;
    modalOverlay.classList.add('active');
  }

  function hide() {
    modalOverlay.classList.remove('active');
  }

  closeModalButton.addEventListener('click', hide);

  modalOverlay.addEventListener('click', (event) => {
    if (event.target === modalOverlay) hide();
  });

  return {
    show,
    hide,
  };
}