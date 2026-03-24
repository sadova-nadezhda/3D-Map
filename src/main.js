import './style.css';
import 'lenis/dist/lenis.css';
import * as THREE from 'three';
import Lenis from 'lenis';

import { CITY_CONTENT, ROUTE_ORDER } from './config/cities.js';
import { createAppState } from './core/state.js';
import { createSceneContext } from './core/scene.js';
import { createModalController } from './ui/modal.js';
import { createLabelsController } from './ui/labels.js';
import { createCityTabsController } from './ui/cityTabs.js';
import { createRouteController } from './route/route.js';
import { createVanController } from './van/van.js';
import { loadScene } from './loaders/loadScene.js';

requestAnimationFrame(() => {
  document.body.classList.remove('booting');
});

const container = document.getElementById('scene-container');
const mapPanel = document.querySelector('.map-panel');
const labelsRoot = document.getElementById('labels-root');
const cityTabsRoot = document.getElementById('cityTabs');
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
const cameraDesiredPosition = new THREE.Vector3();
const cameraDesiredTarget = new THREE.Vector3();
const lenis = new Lenis({
  smoothWheel: true,
  lerp: 0.08,
  touchMultiplier: 1.1,
  anchors: true,
});
const almatyScreenPosition = new THREE.Vector3();
let shouldStartAnimation = false;
let hasAnimationStarted = false;
let isSceneLoaded = false;
let isPreloaderDismissed = false;
let isPreloaderLaunching = false;
let preloaderProgress = 0;
let preloaderTarget = 0;
let preloaderLastTime = 0;
let preloaderReachedCompleteAt = 0;

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
  }, 900);
}

function updatePreloaderVisuals() {
  const roundedProgress = Math.round(preloaderProgress);
  preloaderValue.textContent = `${roundedProgress}%`;
  preloader.style.setProperty('--preloader-progress', String(preloaderProgress / 100));

  if (isSceneLoaded && roundedProgress >= 100) {
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
    if (!preloaderReachedCompleteAt) {
      preloaderReachedCompleteAt = time;
    }
  }

  updatePreloaderVisuals();

  if (
    isSceneLoaded &&
    preloaderReachedCompleteAt &&
    !isPreloaderLaunching &&
    time - preloaderReachedCompleteAt > 700
  ) {
    launchPreloaderVan();
  }

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
    sceneContext.camera.position.set(0.9, 7.3, 5.8);
    sceneContext.CAMERA_TARGET.set(0.15, 0.55, 0);
  } else {
    sceneContext.camera.fov = 40;
    sceneContext.camera.position.set(3, 6, 4.5);
    sceneContext.CAMERA_TARGET.set(0, 0.55, 0);
  }
}

function updateMobileFollowCamera(delta) {
  const isMobile = window.innerWidth <= 768;

  if (!isMobile || !state.vanRoot) {
    return;
  }

  cameraDesiredTarget.copy(state.vanRoot.position);
  cameraDesiredTarget.y = state.vanRoot.position.y + 0.28;

  cameraDesiredPosition.copy(state.vanRoot.position).add(mobileIsoOffset);

  const followLerp = 1 - Math.exp(-delta * 4.5);
  sceneContext.camera.position.lerp(cameraDesiredPosition, followLerp);
  sceneContext.CAMERA_TARGET.lerp(cameraDesiredTarget, followLerp);
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

  van.startRoute(start, end);
}

function onPointerDown(event) {
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
  lenis.raf(time);
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

sceneContext.renderer.domElement.addEventListener('pointerdown', onPointerDown);
window.addEventListener('resize', onResize);

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
