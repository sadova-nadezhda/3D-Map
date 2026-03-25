import './style.css';
import * as THREE from 'three';

import { CITY_CONTENT, ROUTE_ORDER } from './config/cities.js';
import { createAppState } from './core/state.js';
import { createSceneContext } from './core/scene.js';
import { createModalController } from './ui/modal.js';
import { createLabelsController } from './ui/labels.js';
import { createCityTabsController } from './ui/cityTabs.js';
import { createRouteController } from './route/route.js';
import { createVanController } from './van/van.js';
import { loadScene } from './loaders/loadScene.js';

document.body.classList.remove('booting');

const container = document.getElementById('scene-container');
const experienceShell = document.querySelector('.experience-shell');
const mapPanel = document.querySelector('.map-panel');
const watchTrailerButton = document.getElementById('watchTrailerButton');
const featureMapLink = document.querySelector('.feature-panel__map-link');
const labelsRoot = document.getElementById('labels-root');
const cityTabsRoot = document.getElementById('cityTabs');
const startJourneyButton = document.getElementById('startJourneyButton');
const previewCard = document.getElementById('previewCard');
const previewImage = document.getElementById('previewImage');
const previewTag = document.getElementById('previewTag');
const previewTitle = document.getElementById('previewTitle');
const previewDescription = document.getElementById('previewDescription');
const previewButton = document.getElementById('previewButton');
const closePreviewButton = document.getElementById('closePreview');
const detailOverlay = document.getElementById('detailOverlay');
const modalTitle = document.getElementById('modalTitle');
const modalDescription = document.getElementById('modalDescription');
const modalCityTag = document.getElementById('modalCityTag');
const modalRating = document.getElementById('modalRating');
const modalHours = document.getElementById('modalHours');
const modalDishTitle = document.getElementById('modalDishTitle');
const modalDishDescription = document.getElementById('modalDishDescription');
const modalPlaceDescription = document.getElementById('modalPlaceDescription');
const modalMapLink = document.getElementById('modalMapLink');
const modalImage = document.getElementById('modalImage');
const modalImageLabel = document.getElementById('modalImageLabel');
const closeModalButton = document.getElementById('closeModal');
const closeHintButton = document.getElementById('closeHint');
const mapHint = document.getElementById('mapHint');
const preloader = document.getElementById('preloader');
const preloaderValue = document.getElementById('preloaderValue');

const sceneContext = createSceneContext({ container });
const state = createAppState();
const mobileIsoOffset = new THREE.Vector3(-2.9, 4.6, 2.7);
const desktopOverviewTarget = new THREE.Vector3(0, 0.55, 0);
const desktopOverviewOffset = new THREE.Vector3(3, 5.45, 4.5);
const desktopPanTarget = desktopOverviewTarget.clone();
const mobileOverviewTarget = new THREE.Vector3(0.15, 0.55, 0);
const mobileOverviewOffset = new THREE.Vector3(0.75, 6.75, 5.8);
const cameraDesiredPosition = new THREE.Vector3();
const cameraDesiredTarget = new THREE.Vector3();
const mapPointerStart = new THREE.Vector2();
const mapPointerPrevious = new THREE.Vector2();
const mapPointerDelta = new THREE.Vector2();
const mapPanForward = new THREE.Vector3();
const mapPanRight = new THREE.Vector3();
const mapPanOffset = new THREE.Vector3();
const MAP_ZOOM_MIN = 0.55;
const MAP_ZOOM_MAX = 1.25;
const almatyScreenPosition = new THREE.Vector3();
let mapZoomScale = 1;
let isMapPointerDown = false;
let isMapDragging = false;
let activeMapPointerId = null;
let suppressMapClickUntil = 0;
let shouldStartAnimation = false;
let hasAnimationStarted = false;
let isSceneLoaded = false;
let isPreloaderDismissed = false;
let isPreloaderLaunching = false;
let preloaderProgress = 0;
let preloaderTarget = 0;
let preloaderLastTime = 0;

function setActiveView(view) {
  if (!experienceShell) {
    return;
  }

  experienceShell.dataset.view = view;
}

function startSceneAnimation() {
  if (hasAnimationStarted || !shouldStartAnimation) {
    return;
  }

  hasAnimationStarted = true;
  requestAnimationFrame(animate);
}

function finishPreloader() {
  if (isPreloaderDismissed) {
    return;
  }

  isPreloaderDismissed = true;
  document.body.classList.add('app-ready');
  preloader.classList.add('is-hidden');
  startSceneAnimation();

  window.setTimeout(() => {
    preloader.setAttribute('hidden', 'true');
  }, 900);
}

function launchPreloaderVan() {
  if (isPreloaderLaunching) {
    return;
  }

  isPreloaderLaunching = true;
  preloader.classList.add('is-launching');

  window.setTimeout(() => {
    finishPreloader();
  }, 1350);
}

function updatePreloaderVisuals() {
  preloaderValue.textContent = `${Math.round(preloaderProgress)}%`;
  preloader.style.setProperty('--preloader-progress', String(preloaderProgress / 100));

  if (isSceneLoaded && preloaderProgress >= 100) {
    launchPreloaderVan();
  }
}

function tickPreloader(time) {
  if (isPreloaderDismissed) {
    return;
  }

  if (!preloaderLastTime) {
    preloaderLastTime = time;
  }

  const delta = time - preloaderLastTime;
  preloaderLastTime = time;

  if (!isSceneLoaded) {
    const pace = preloaderProgress < 68 ? 0.032 : 0.013;
    preloaderTarget = Math.min(92, preloaderTarget + delta * pace);
  } else {
    preloaderTarget = 100;
  }

  preloaderProgress += (preloaderTarget - preloaderProgress) * (isSceneLoaded ? 0.12 : 0.055);

  if (isSceneLoaded && 100 - preloaderProgress < 0.18) {
    preloaderProgress = 100;
  }

  updatePreloaderVisuals();
  requestAnimationFrame(tickPreloader);
}

const modal = createModalController({
  cityContent: CITY_CONTENT,
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
  onPreviewShown: (cityKey) => {
    const currentIndex = ROUTE_ORDER.indexOf(cityKey);
    const nextCity = ROUTE_ORDER[currentIndex + 1];

    if (!nextCity) {
      return;
    }

    state.availableCities.add(nextCity);
    labels.updateAvailability();
    cityTabs.updateAvailability();
  },
});

let selectCity = () => {};

function isCityAvailable(cityKey) {
  return state.availableCities.has(cityKey);
}

const labels = createLabelsController({
  labelsRoot,
  cityLabels: state.cityLabels,
  cityPoints: state.cityPoints,
  camera: sceneContext.camera,
  onSelectCity: (cityKey) => selectCity(cityKey),
  isCityAvailable,
  isInteractionLocked: () => state.isMoving,
  viewportElement: container,
});

const cityTabs = createCityTabsController({
  root: cityTabsRoot,
  routeOrder: ROUTE_ORDER,
  cityContent: CITY_CONTENT,
  onSelectCity: (cityKey) => selectCity(cityKey),
  isCityAvailable,
});

const route = createRouteController({
  scene: sceneContext.scene,
  state,
});

const van = createVanController({
  scene: sceneContext.scene,
  state,
  route,
  modal,
  labels,
  cityTabs,
  routeOrder: ROUTE_ORDER,
});

function updateCameraLayout() {
  const isMobile = window.innerWidth <= 768;

  if (isMobile) {
    sceneContext.camera.fov = 34;
    sceneContext.CAMERA_TARGET.copy(mobileOverviewTarget);
    sceneContext.camera.position.copy(mobileOverviewTarget).addScaledVector(mobileOverviewOffset, mapZoomScale);
  } else {
    clampDesktopPanTarget();
    sceneContext.camera.fov = 40;
    sceneContext.CAMERA_TARGET.copy(desktopPanTarget);
    sceneContext.camera.position.copy(desktopPanTarget).addScaledVector(desktopOverviewOffset, mapZoomScale);
  }
}

function updateMobileFollowCamera(delta) {
  const isMobile = window.innerWidth <= 768;

  if (!isMobile || !state.vanRoot) {
    return;
  }

  cameraDesiredTarget.copy(state.vanRoot.position);
  cameraDesiredTarget.y = state.vanRoot.position.y + 0.28;

  cameraDesiredPosition.copy(state.vanRoot.position).addScaledVector(mobileIsoOffset, mapZoomScale);

  const followLerp = 1 - Math.exp(-delta * 4.5);
  sceneContext.camera.position.lerp(cameraDesiredPosition, followLerp);
  sceneContext.CAMERA_TARGET.lerp(cameraDesiredTarget, followLerp);
}

function setMapZoom(nextZoomScale) {
  const clampedZoom = THREE.MathUtils.clamp(nextZoomScale, MAP_ZOOM_MIN, MAP_ZOOM_MAX);

  if (Math.abs(clampedZoom - mapZoomScale) < 0.001) {
    return;
  }

  mapZoomScale = clampedZoom;

  if (window.innerWidth <= 768 && state.vanRoot) {
    cameraDesiredTarget.copy(state.vanRoot.position);
    cameraDesiredTarget.y = state.vanRoot.position.y + 0.28;
    cameraDesiredPosition.copy(state.vanRoot.position).addScaledVector(mobileIsoOffset, mapZoomScale);

    sceneContext.CAMERA_TARGET.copy(cameraDesiredTarget);
    sceneContext.camera.position.copy(cameraDesiredPosition);
  } else {
    clampDesktopPanTarget();
    updateCameraLayout();
  }

  sceneContext.camera.lookAt(sceneContext.CAMERA_TARGET);
  labels.updateLabels();
  updateMapHintPosition();
}

function clampDesktopPanTarget() {
  desktopPanTarget.y = desktopOverviewTarget.y;

  if (state.mapBounds.isEmpty()) {
    return;
  }

  const boundsWidth = state.mapBounds.max.x - state.mapBounds.min.x;
  const boundsDepth = state.mapBounds.max.z - state.mapBounds.min.z;
  const panLimitX = Math.min(boundsWidth * 0.34, (boundsWidth * 0.18) / mapZoomScale);
  const panLimitZ = Math.min(boundsDepth * 0.34, (boundsDepth * 0.18) / mapZoomScale);

  desktopPanTarget.x = THREE.MathUtils.clamp(
    desktopPanTarget.x,
    state.mapCenter.x - panLimitX,
    state.mapCenter.x + panLimitX
  );
  desktopPanTarget.z = THREE.MathUtils.clamp(
    desktopPanTarget.z,
    state.mapCenter.z - panLimitZ,
    state.mapCenter.z + panLimitZ
  );
}

function canPanMap() {
  return window.innerWidth > 768 && !detailOverlay.classList.contains('active');
}

function panMapByPointerDelta(deltaX, deltaY) {
  if (state.mapBounds.isEmpty()) {
    return;
  }

  const boundsWidth = state.mapBounds.max.x - state.mapBounds.min.x;
  const boundsDepth = state.mapBounds.max.z - state.mapBounds.min.z;
  const panelWidth = container.clientWidth || window.innerWidth;
  const worldUnitsPerPixel = (Math.max(boundsWidth, boundsDepth) / panelWidth) * 1.2 * mapZoomScale;

  mapPanForward.copy(sceneContext.CAMERA_TARGET).sub(sceneContext.camera.position).setY(0);

  if (mapPanForward.lengthSq() < 0.000001) {
    return;
  }

  mapPanForward.normalize();
  mapPanRight.crossVectors(mapPanForward, sceneContext.camera.up).setY(0).normalize();

  mapPanOffset.copy(mapPanRight).multiplyScalar(-deltaX * worldUnitsPerPixel);
  mapPanOffset.addScaledVector(mapPanForward, deltaY * worldUnitsPerPixel);

  desktopPanTarget.add(mapPanOffset);
  clampDesktopPanTarget();
  updateCameraLayout();
  sceneContext.camera.lookAt(sceneContext.CAMERA_TARGET);
  labels.updateLabels();
  updateMapHintPosition();
}

function onMapWheel(event) {
  if (window.innerWidth <= 768) {
    return;
  }

  event.preventDefault();
  setMapZoom(mapZoomScale + event.deltaY * 0.0012);
}

function onMapPointerDown(event) {
  if (!canPanMap() || event.button !== 0) {
    return;
  }

  activeMapPointerId = event.pointerId;
  isMapPointerDown = true;
  isMapDragging = false;
  mapPointerStart.set(event.clientX, event.clientY);
  mapPointerPrevious.copy(mapPointerStart);
  sceneContext.renderer.domElement.setPointerCapture(event.pointerId);
}

function onMapPointerMove(event) {
  if (!isMapPointerDown || event.pointerId !== activeMapPointerId) {
    return;
  }

  mapPointerDelta.set(event.clientX - mapPointerStart.x, event.clientY - mapPointerStart.y);

  if (!isMapDragging && mapPointerDelta.lengthSq() > 16) {
    isMapDragging = true;
    suppressMapClickUntil = performance.now() + 250;
    mapPanel.classList.add('map-panel--dragging');
  }

  if (!isMapDragging) {
    return;
  }

  const deltaX = event.clientX - mapPointerPrevious.x;
  const deltaY = event.clientY - mapPointerPrevious.y;

  mapPointerPrevious.set(event.clientX, event.clientY);
  panMapByPointerDelta(deltaX, deltaY);
  event.preventDefault();
}

function stopMapPointerInteraction(event) {
  if (!isMapPointerDown || event.pointerId !== activeMapPointerId) {
    return;
  }

  if (sceneContext.renderer.domElement.hasPointerCapture(event.pointerId)) {
    sceneContext.renderer.domElement.releasePointerCapture(event.pointerId);
  }

  isMapPointerDown = false;
  isMapDragging = false;
  activeMapPointerId = null;
  mapPanel.classList.remove('map-panel--dragging');
}

function hideMapHint() {
  mapHint.classList.add('hidden');
  mapPanel.classList.remove('map-panel--hint');
}

function updateMapHintPosition() {
  if (mapHint.classList.contains('hidden')) {
    return;
  }

  const almatyPoint = state.cityPositions.get('city_almaty');
  if (!almatyPoint) {
    return;
  }

  const containerRect = container.getBoundingClientRect();
  const hintWidth = Math.min(338, containerRect.width - 32);
  const hintHeight = mapHint.offsetHeight || 140;
  const margin = 16;

  almatyScreenPosition.copy(almatyPoint).project(sceneContext.camera);

  const anchorX = ((almatyScreenPosition.x + 1) / 2) * containerRect.width;
  const anchorY = ((1 - almatyScreenPosition.y) / 2) * containerRect.height;

  const left = Math.min(
    Math.max(anchorX, margin + hintWidth / 2),
    containerRect.width - margin - hintWidth / 2
  );
  const top = Math.min(
    Math.max(anchorY - hintHeight - 28, margin),
    containerRect.height - hintHeight - margin
  );

  mapHint.style.left = `${left}px`;
  mapHint.style.top = `${top}px`;
}

selectCity = function selectCityHandler(cityKey, skipRoute = false) {
  if (state.isMoving) return;
  if (!CITY_CONTENT[cityKey]) return;
  if (!state.availableCities.has(cityKey)) return;

  hideMapHint();

  const sameCity = state.activeCity === cityKey;
  const nextPoint = state.cityPositions.get(cityKey);

  if (!nextPoint || !state.vanRoot) return;

  const previousCityKey = state.activeCity;
  state.activeCity = cityKey;
  labels.setActiveLabel(cityKey);
  cityTabs.setActiveCity(cityKey);

  if (sameCity && !state.isMoving) {
    modal.showPreview(cityKey);
    return;
  }

  if (skipRoute) {
    state.activeRouteY = nextPoint.y + state.ROUTE_Y_OFFSET;
    van.setVanPositionFromPoint(nextPoint);
    route.clearRoute();
    modal.hideAll();
    return;
  }

  modal.hideAll();
  state.pendingModalCity = cityKey;

  const start = state.vanRoot.position.clone();
  const end = nextPoint.clone();

  van.startRoute(start, end, {
    fromCityKey: previousCityKey,
    toCityKey: cityKey,
  });
}

function openJourneyStart() {
  const currentCity = state.activeCity || ROUTE_ORDER[0];

  if (!currentCity) return;

  hideMapHint();
  selectCity(currentCity);
}

startJourneyButton?.addEventListener('click', openJourneyStart);
watchTrailerButton?.addEventListener('click', (event) => {
  event.preventDefault();
  setActiveView('feature');
});
featureMapLink?.addEventListener('click', (event) => {
  event.preventDefault();
  setActiveView('map');
});

function onMapClick(event) {
  if (performance.now() < suppressMapClickUntil) {
    return;
  }

  if (state.isMoving) return;

  const rect = sceneContext.renderer.domElement.getBoundingClientRect();

  state.pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  state.pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

  state.raycaster.setFromCamera(state.pointer, sceneContext.camera);
  const intersects = state.raycaster.intersectObjects(state.clickableMeshes, false);

  if (!intersects.length) return;

  const cityKey = intersects[0].object.userData.cityKey;
  if (!state.availableCities.has(cityKey)) return;

  selectCity(cityKey);
}

function onResize() {
  const { camera, renderer, CAMERA_TARGET } = sceneContext;
  const width = container.clientWidth || window.innerWidth;
  const height = container.clientHeight || window.innerHeight;

  updateCameraLayout();

  camera.aspect = width / height;
  camera.updateProjectionMatrix();
  camera.lookAt(CAMERA_TARGET);

  renderer.setSize(width, height);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  labels.updateLabels();
  updateMapHintPosition();
}

function animate(time) {
  requestAnimationFrame(animate);

  const delta = state.clock.getDelta();

  van.updateVanMovement(delta);
  updateMobileFollowCamera(delta);
  sceneContext.camera.lookAt(sceneContext.CAMERA_TARGET);
  labels.updateLabels();
  updateMapHintPosition();
  sceneContext.renderer.render(sceneContext.scene, sceneContext.camera);
}

closeHintButton.addEventListener('click', hideMapHint);

sceneContext.renderer.domElement.addEventListener('wheel', onMapWheel, { passive: false });
sceneContext.renderer.domElement.addEventListener('pointerdown', onMapPointerDown);
sceneContext.renderer.domElement.addEventListener('pointermove', onMapPointerMove);
sceneContext.renderer.domElement.addEventListener('pointerup', stopMapPointerInteraction);
sceneContext.renderer.domElement.addEventListener('pointercancel', stopMapPointerInteraction);
sceneContext.renderer.domElement.addEventListener('click', onMapClick);
window.addEventListener('resize', onResize);

setActiveView('map');
updateCameraLayout();
onResize();
mapPanel.classList.add('map-panel--hint');
requestAnimationFrame(tickPreloader);

loadScene({
  sceneContext,
  state,
  labels,
  cityTabs,
  modal,
  van,
  cityContent: CITY_CONTENT,
  routeOrder: ROUTE_ORDER,
})
  .then(() => {
    isSceneLoaded = true;
    shouldStartAnimation = true;
  })
  .catch((error) => {
    isSceneLoaded = true;
    shouldStartAnimation = true;
    console.error('Ошибка загрузки сцены:', error);
  });
