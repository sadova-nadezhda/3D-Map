import './style.css';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

const CITY_CONTENT = {
  city_almaty: {
    title: 'Алматы',
    description: 'Описание для Алматы.',
  },
  city_astana: {
    title: 'Астана',
    description: 'Описание для Астаны.',
  },
  city_karaganda: {
    title: 'Караганда',
    description: 'Описание для Караганды.',
  },
  city_aqtobe: {
    title: 'Актобе',
    description: 'Описание для Актобе.',
  },
  city_atyrau: {
    title: 'Атырау',
    description: 'Описание для Атырау.',
  },
  city_aqtay: {
    title: 'Актау',
    description: 'Описание для Актау.',
  },
  city_shym: {
    title: 'Шымкент',
    description: 'Описание для Шымкента.',
  },
  city_turk: {
    title: 'Туркестан',
    description: 'Описание для Туркестана.',
  },
};

const container = document.getElementById('scene-container');
const labelsRoot = document.getElementById('labels-root');
const modalOverlay = document.getElementById('modalOverlay');
const modalTitle = document.getElementById('modalTitle');
const modalDescription = document.getElementById('modalDescription');
const closeModalButton = document.getElementById('closeModal');

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0a0a0a);

const camera = new THREE.PerspectiveCamera(
  40,
  window.innerWidth / window.innerHeight,
  0.1,
  1000,
);

// фиксированный ракурс как на референсе
// camera.position.set(0, 7.2, 8.8);
camera.position.set(0, 4, 4);
;

const renderer = new THREE.WebGLRenderer({
  antialias: true,
  alpha: true,
});
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
container.appendChild(renderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = false;
controls.enableRotate = false;
controls.enablePan = false;
controls.enableZoom = false;
controls.target.set(0, 0.2, 0);
controls.update();

const ambientLight = new THREE.AmbientLight(0xffffff, 1.4);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 2.2);
directionalLight.position.set(5, 8, 5);
directionalLight.castShadow = true;
directionalLight.shadow.mapSize.set(2048, 2048);
scene.add(directionalLight);

const loader = new GLTFLoader();
const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();
const clock = new THREE.Clock();

const cityPoints = [];
const clickableMeshes = [];
const cityLabels = new Map();
const cityPositions = new Map();

let activeCity = null;
let vanRoot = null;
let carInstance = null;
let mapRoot = null;

let activeCurve = null;
let routeProgress = 0;
let isMoving = false;
let routeLine = null;

const ROUTE_HEIGHT = 0.03;
const CURVE_HEIGHT = 0.18;
const MOVE_SPEED = 0.22;
const CAR_Y_OFFSET = 0.1;
const CAR_SCALE = 0.15;
const TURN_SPEED = 4.5;
const VAN_OFFSET = new THREE.Vector3(0.18, 0, 0);
const CAR_MODEL_ROTATION = {
  x: -Math.PI / 2,
  y: Math.PI,
  z: Math.PI / 2,
};

let mapCenter = new THREE.Vector3();

function showModal(cityKey) {
  const city = CITY_CONTENT[cityKey];
  if (!city) return;

  modalTitle.textContent = city.title;
  modalDescription.textContent = city.description;
  modalOverlay.classList.add('active');
}

function hideModal() {
  modalOverlay.classList.remove('active');
}

function setActiveLabel(cityKey) {
  cityLabels.forEach((element, key) => {
    element.classList.toggle('active', key === cityKey);
  });
}

function createLabel(cityKey, title) {
  const button = document.createElement('button');
  button.className = 'city-label';
  button.textContent = title;
  button.addEventListener('click', () => selectCity(cityKey));
  labelsRoot.appendChild(button);
  cityLabels.set(cityKey, button);
}

function createInvisibleMarker(cityKey, position) {
  const geometry = new THREE.SphereGeometry(0.08, 16, 16);
  const material = new THREE.MeshBasicMaterial({
    transparent: true,
    opacity: 0,
    depthWrite: false,
  });

  const marker = new THREE.Mesh(geometry, material);
  marker.position.copy(position);
  marker.position.y += 0.12;
  marker.userData.cityKey = cityKey;

  scene.add(marker);
  clickableMeshes.push(marker);
}

function updateLabels() {
  cityPoints.forEach((city) => {
    const label = cityLabels.get(city.key);
    if (!label) return;

    const projected = city.position.clone();
    projected.y += 0.28;
    projected.project(camera);

    const isVisible =
      projected.z < 1 &&
      projected.x >= -1.2 &&
      projected.x <= 1.2 &&
      projected.y >= -1.2 &&
      projected.y <= 1.2;

    label.style.display = isVisible ? 'block' : 'none';
    if (!isVisible) return;

    const x = (projected.x * 0.5 + 0.5) * window.innerWidth;
    const y = (-projected.y * 0.5 + 0.5) * window.innerHeight;

    label.style.left = `${x}px`;
    label.style.top = `${y}px`;
  });
}

function onPointerDown(event) {
  const rect = renderer.domElement.getBoundingClientRect();
  pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

  raycaster.setFromCamera(pointer, camera);
  const intersects = raycaster.intersectObjects(clickableMeshes, false);

  if (intersects.length) {
    const cityKey = intersects[0].object.userData.cityKey;
    selectCity(cityKey);
  }
}

function onResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  updateLabels();
}

function clearRouteLine() {
  if (!routeLine) return;

  scene.remove(routeLine);
  routeLine.geometry.dispose();
  routeLine.material.dispose();
  routeLine = null;
}

function startRoute(start, end) {
  const startPoint = start.clone();
  const endPoint = end.clone();

  // держим маршрут чуть выше поверхности карты
  startPoint.y += ROUTE_HEIGHT;
  endPoint.y += ROUTE_HEIGHT;

  const direction = endPoint.clone().sub(startPoint);
  direction.y = 0;

  const distance = direction.length();

  let controlPoint = startPoint.clone().lerp(endPoint, 0.5);

  if (distance > 0.001) {
    direction.normalize();

    // два возможных перпендикуляра
    const normalA = new THREE.Vector3(-direction.z, 0, direction.x);
    const normalB = normalA.clone().multiplyScalar(-1);

    // уменьшаем изгиб, чтобы не уводило за края
    const curveOffset = Math.min(distance * 0.12, 0.22);

    const candidateA = controlPoint.clone().add(normalA.clone().multiplyScalar(curveOffset));
    const candidateB = controlPoint.clone().add(normalB.clone().multiplyScalar(curveOffset));

    // выбираем вариант, который ближе к центру карты
    const distA = candidateA.distanceToSquared(mapCenter);
    const distB = candidateB.distanceToSquared(mapCenter);

    controlPoint.copy(distA < distB ? candidateA : candidateB);
  }

  // без подъема вверх
  controlPoint.y = startPoint.y;

  activeCurve = new THREE.QuadraticBezierCurve3(
    startPoint,
    controlPoint,
    endPoint
  );

  const points = activeCurve.getPoints(80);
  const geometry = new THREE.BufferGeometry().setFromPoints(points);
  const material = new THREE.LineDashedMaterial({
    color: 0xff5533,
    dashSize: 0.12,
    gapSize: 0.08,
  });

  clearRouteLine();

  routeLine = new THREE.Line(geometry, material);
  routeLine.computeLineDistances();
  scene.add(routeLine);

  routeProgress = 0;
  isMoving = true;
}

function selectCity(cityKey, skipRoute = false) {
  if (!CITY_CONTENT[cityKey]) return;

  const sameCity = activeCity === cityKey;
  activeCity = cityKey;

  setActiveLabel(cityKey);
  showModal(cityKey);

  const point = cityPositions.get(cityKey);
  if (!point || !vanRoot) return;

  const nextPoint = point.clone().add(VAN_OFFSET);

  if (skipRoute) {
    vanRoot.position.copy(nextPoint);
    return;
  }

  if (sameCity && !isMoving) return;

  const start = vanRoot.position.clone();
  const end = nextPoint.clone();

  startRoute(start, end);
}

async function loadScene() {
  const [mapGltf, carGltf] = await Promise.all([
    loader.loadAsync('/models/kz_map-main.glb'),
    loader.loadAsync('/models/car_main.glb'),
  ]);

  mapRoot = new THREE.Group();
  const mapScene = mapGltf.scene;
  mapRoot.add(mapScene);
  scene.add(mapRoot);

  // ВАЖНО:
  // подгоняем карту под нужный ракурс как на втором фото
  mapRoot.rotation.x = 0;
  mapRoot.rotation.y = -0.55;
  mapRoot.rotation.z = 0;

  mapRoot.position.set(0, 0, 0);
  mapRoot.scale.set(1, 1, 1);

  mapRoot.updateWorldMatrix(true, true);

  const box = new THREE.Box3().setFromObject(mapRoot);
  const center = box.getCenter(new THREE.Vector3());

  mapCenter.copy(center);

  controls.target.copy(center);
  camera.lookAt(center);
  controls.update();

  mapRoot.traverse((obj) => {
    if (obj.isMesh) {
      obj.castShadow = true;
      obj.receiveShadow = true;
    }

    if ((obj.name || '').startsWith('city_') && CITY_CONTENT[obj.name]) {
      const worldPosition = new THREE.Vector3();
      obj.getWorldPosition(worldPosition);

      cityPoints.push({
        key: obj.name,
        position: worldPosition.clone(),
      });

      cityPositions.set(obj.name, worldPosition.clone());
      createInvisibleMarker(obj.name, worldPosition.clone());
      createLabel(obj.name, CITY_CONTENT[obj.name].title);
    }
  });

  const carModel = carGltf.scene.getObjectByName('white_mesh');

  if (!carModel) {
    console.error('Объект white_mesh не найден в car.glb');
    return;
  }

  carModel.traverse((obj) => {
    if (obj.isMesh) {
      obj.castShadow = true;
      obj.receiveShadow = true;
    }
  });

  vanRoot = new THREE.Group();

  const carPivot = new THREE.Group();
  carPivot.position.set(0.1, -0.5, 0);

  carInstance = carModel.clone();
  carInstance.scale.set(CAR_SCALE, CAR_SCALE, CAR_SCALE);
  carInstance.rotation.set(
    CAR_MODEL_ROTATION.x,
    CAR_MODEL_ROTATION.y,
    CAR_MODEL_ROTATION.z
  );

  carPivot.add(carInstance);
  vanRoot.add(carPivot);
  scene.add(vanRoot);

  if (cityPoints.length) {
    const firstCityKey = cityPoints[0].key;
    const firstPosition = cityPositions.get(firstCityKey).clone().add(VAN_OFFSET);

    vanRoot.position.copy(firstPosition);
    setActiveLabel(firstCityKey);
    showModal(firstCityKey);
    activeCity = firstCityKey;
  }

  updateLabels();
}

function animate() {
  requestAnimationFrame(animate);

  const delta = clock.getDelta();

  if (vanRoot && activeCurve && isMoving) {
    routeProgress += delta * MOVE_SPEED;

    if (routeProgress >= 1) {
      routeProgress = 1;
      isMoving = false;
    }

    const position = activeCurve.getPointAt(routeProgress);
    vanRoot.position.copy(position);

    const lookAheadT = Math.min(routeProgress + 0.03, 1);
    const lookAtPoint = activeCurve.getPointAt(lookAheadT);

    const direction = lookAtPoint.clone().sub(vanRoot.position);
    direction.y = 0;

    if (direction.lengthSq() > 0.000001) {
      direction.normalize();

      const targetAngle = Math.atan2(direction.x, direction.z) + Math.PI;

      let angleDiff = targetAngle - vanRoot.rotation.y;
      angleDiff = Math.atan2(Math.sin(angleDiff), Math.cos(angleDiff));

      vanRoot.rotation.y += angleDiff * Math.min(1, TURN_SPEED * delta);
    }

    if (!isMoving) {
      const finalPoint = activeCurve.getPointAt(1);
      vanRoot.position.copy(finalPoint);
    }
  }

  updateLabels();
  renderer.render(scene, camera);
}

closeModalButton.addEventListener('click', hideModal);

modalOverlay.addEventListener('click', (event) => {
  if (event.target === modalOverlay) hideModal();
});

renderer.domElement.addEventListener('pointerdown', onPointerDown);
window.addEventListener('resize', onResize);

loadScene()
  .then(() => {
    animate();
  })
  .catch((error) => {
    console.error('Ошибка загрузки сцены:', error);
  });