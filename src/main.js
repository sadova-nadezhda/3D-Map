import './style.css';
import * as THREE from 'three';

import { CITY_CONTENT, ROUTE_ORDER } from './config/cities.js';
import { createAppState } from './core/state.js';
import { createSceneContext } from './core/scene.js';
import { createModalController } from './ui/modal.js';
import { createLabelsController } from './ui/labels.js';
import { createRouteController } from './route/route.js';
import { createVanController } from './van/van.js';
import { loadScene } from './loaders/loadScene.js';

const container = document.getElementById('scene-container');
const labelsRoot = document.getElementById('labels-root');

const hintCard = document.getElementById('hintCard');
const hintTitle = document.getElementById('hintTitle');
const hintText = document.getElementById('hintText');

const previewCard = document.getElementById('previewCard');
const previewTitle = document.getElementById('previewTitle');
const previewText = document.getElementById('previewText');
const previewImage = document.getElementById('previewImage');
const previewMore = document.getElementById('previewMore');
const previewClose = document.getElementById('previewClose');

const modalOverlay = document.getElementById('modalOverlay');
const modalTitle = document.getElementById('modalTitle');
const modalDescription = document.getElementById('modalDescription');
const modalImage = document.getElementById('modalImage');
const closeModalButton = document.getElementById('closeModal');

const sceneContext = createSceneContext({ container });
const state = createAppState();

function isCityAvailable(cityKey) {
  return state.availableCities.has(cityKey);
}

const modal = createModalController({
  cityContent: CITY_CONTENT,

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
});

let selectCity = () => {};

const labels = createLabelsController({
  labelsRoot,
  cityLabels: state.cityLabels,
  cityPoints: state.cityPoints,
  camera: sceneContext.camera,
  onSelectCity: (cityKey) => selectCity(cityKey),
  isCityAvailable,
  isInteractionLocked: () => state.isMoving,
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
  routeOrder: ROUTE_ORDER,
});

selectCity = function selectCityHandler(cityKey, skipRoute = false) {
  if (state.isMoving) return;
  if (!CITY_CONTENT[cityKey]) return;
  if (!state.availableCities.has(cityKey)) return;

  const sameCity = state.activeCity === cityKey;
  const nextPoint = state.cityPositions.get(cityKey);

  if (!nextPoint || !state.vanRoot) return;

  if (sameCity) {
    state.activeCity = cityKey;
    labels.setActiveLabel(cityKey);
    modal.showPreview(cityKey);
    return;
  }

  state.activeCity = cityKey;
  labels.setActiveLabel(cityKey);

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
};

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

  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  camera.lookAt(CAMERA_TARGET);

  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
}

function animate() {
  requestAnimationFrame(animate);

  const delta = state.clock.getDelta();

  van.updateVanMovement(delta);
  sceneContext.camera.lookAt(sceneContext.CAMERA_TARGET);
  labels.updateLabels();
  sceneContext.renderer.render(sceneContext.scene, sceneContext.camera);
}

sceneContext.renderer.domElement.addEventListener('pointerdown', onPointerDown);
window.addEventListener('resize', onResize);

loadScene({
  sceneContext,
  state,
  labels,
  modal,
  van,
  cityContent: CITY_CONTENT,
  routeOrder: ROUTE_ORDER,
})
  .then(() => {
    animate();
  })
  .catch((error) => {
    console.error('Ошибка загрузки сцены:', error);
  });