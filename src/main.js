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
camera.position.set(3.5, 4.5, 6);

const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
container.appendChild(renderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.08;
controls.minDistance = 3;
controls.maxDistance = 15;
controls.maxPolarAngle = Math.PI / 2.1;
controls.target.set(0, 0.6, 0);

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

let activeCurve = null;
let routeProgress = 0;
let isMoving = false;
let routeLine = null;

const ROUTE_HEIGHT = 0.03;
const CURVE_HEIGHT = 0.18;
const MOVE_SPEED = 0.22;
const CAR_Y_OFFSET = 0.1;
const CAR_SCALE = 0.15;

// куда смотрит "перед" модели в исходном glb
// пробуй: 0, Math.PI, Math.PI / 2, -Math.PI / 2
const CAR_FORWARD_OFFSET = -Math.PI;

// плавность поворота: чем больше, тем быстрее доворачивает
const TURN_SPEED = 4.5;

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

    const isVisible = projected.z < 1;
    label.style.display = isVisible ? 'block' : 'none';

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

  startPoint.y += ROUTE_HEIGHT;
  endPoint.y += ROUTE_HEIGHT;

  const midPoint = startPoint.clone().lerp(endPoint, 0.5);
  midPoint.y += CURVE_HEIGHT;

  activeCurve = new THREE.CatmullRomCurve3([
    startPoint,
    midPoint,
    endPoint,
  ]);

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

  const nextPoint = cityPositions.get(cityKey);
  if (!nextPoint || !vanRoot) return;

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
    loader.loadAsync('/models/map.glb'),
    loader.loadAsync('/models/car.glb'),
  ]);

  const mapScene = mapGltf.scene;
  scene.add(mapScene);

  mapScene.updateWorldMatrix(true, true);

  mapScene.traverse((obj) => {
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

  carInstance = carModel.clone();
  carInstance.position.set(0, CAR_Y_OFFSET, 0);
  carInstance.scale.set(CAR_SCALE, CAR_SCALE, CAR_SCALE);
  // carInstance.rotation.set(-Math.PI / 2, CAR_FORWARD_OFFSET, 0);
  carInstance.rotation.x = -Math.PI / 2;
  carInstance.rotation.y = CAR_FORWARD_OFFSET;
  carInstance.rotation.z = 0;

  vanRoot.add(carInstance);
  scene.add(vanRoot);

  if (cityPoints.length) {
    const firstCityKey = cityPoints[0].key;
    const firstPosition = cityPositions.get(firstCityKey).clone();

    vanRoot.position.copy(firstPosition);
    setActiveLabel(firstCityKey);
    showModal(firstCityKey);
    activeCity = firstCityKey;
  }
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

      const targetAngle = Math.atan2(direction.x, direction.z);

      let angleDiff = targetAngle - vanRoot.rotation.y;
      angleDiff = Math.atan2(Math.sin(angleDiff), Math.cos(angleDiff));

      vanRoot.rotation.y += angleDiff * Math.min(1, TURN_SPEED * delta);
    }

    if (!isMoving) {
      const finalPoint = activeCurve.getPointAt(1);
      vanRoot.position.copy(finalPoint);
    }
  }

  controls.update();
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