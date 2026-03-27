export function createCityTabsController({
  root,
  routeOrder,
  cityContent,
  onSelectCity,
  isCityAvailable,
}) {
  const tabMap = new Map();
  let currentCityContent = cityContent;
  let activeCity = null;

  function render() {
    root.textContent = '';

    routeOrder.forEach((cityKey) => {
      const city = currentCityContent[cityKey];
      if (!city) return;

      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'city-tab';
      button.textContent = city.title;

      button.addEventListener('click', () => {
        if (!isCityAvailable(cityKey)) return;
        onSelectCity(cityKey);
      });

      root.appendChild(button);
      tabMap.set(cityKey, button);
    });
  }

  function setActiveCity(cityKey) {
    activeCity = cityKey;
    tabMap.forEach((button, key) => {
      button.classList.toggle('active', key === cityKey);
    });
  }

  function updateAvailability() {
    tabMap.forEach((button, key) => {
      const available = isCityAvailable(key);
      button.classList.toggle('disabled', !available);
      button.disabled = !available;
    });
  }

  render();

  return {
    setActiveCity,
    updateAvailability,
    updateCityContent(newCityContent) {
      currentCityContent = newCityContent;
      render();
      if (activeCity) {
        setActiveCity(activeCity);
      }
      updateAvailability();
    },
  };
}
