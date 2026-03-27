export function createLabelsController({
  labelsRoot,
  cityLabels,
  cityPoints,
  camera,
  onSelectCity,
  isCityAvailable,
  isInteractionLocked,
  viewportElement,
}) {
  function createLabel(cityKey, title) {
    const button = document.createElement('button');
    button.className = 'city-label';
    button.textContent = title;

    button.addEventListener('click', () => {
      if (!isCityAvailable(cityKey)) return;
      if (isInteractionLocked()) return;
      onSelectCity(cityKey);
    });

    labelsRoot.appendChild(button);
    cityLabels.set(cityKey, button);
  }

  function setActiveLabel(cityKey) {
    cityLabels.forEach((element, key) => {
      element.classList.toggle('active', key === cityKey);
    });
  }

  function updateAvailability() {
    const locked = isInteractionLocked();

    cityLabels.forEach((element, key) => {
      const available = isCityAvailable(key);
      const disabled = !available || locked;

      element.classList.toggle('disabled', disabled);
      element.disabled = disabled;
    });
  }

  function updateLabelTexts(cityContent) {
    cityLabels.forEach((element, key) => {
      const city = cityContent[key];
      if (city) {
        element.textContent = city.title;
      }
    });
  }

  function updateLabels() {
    const rect = viewportElement.getBoundingClientRect();

    cityPoints.forEach((city) => {
      const label = cityLabels.get(city.key);
      if (!label) return;

      const projected = city.position.clone();
      projected.y += 0.28;
      projected.project(camera);

      const isVisible =
        projected.z < 1 &&
        projected.x >= -1.1 &&
        projected.x <= 1.1 &&
        projected.y >= -1.1 &&
        projected.y <= 1.1;

      label.style.display = isVisible ? 'block' : 'none';

      const x = (projected.x * 0.5 + 0.5) * rect.width;
      const y = (-projected.y * 0.5 + 0.5) * rect.height;

      label.style.left = `${x}px`;
      label.style.top = `${y}px`;
    });

    updateAvailability();
  }

  return {
    createLabel,
    setActiveLabel,
    updateLabels,
    updateAvailability,
    updateLabelTexts,
  };
}
