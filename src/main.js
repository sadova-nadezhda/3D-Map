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
let targetPosition = null;
let previousPosition = new THREE.Vector3();

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

function updateMarkerStyles(cityKey) {
  clickableMeshes.forEach((mesh) => {
    const isActive = mesh.userData.cityKey === cityKey;
    mesh.material.color.set(isActive ? '#ef4444' : '#ffffff');
    mesh.material.emissive.set(isActive ? '#ef4444' : '#666666');
  });
}

function selectCity(cityKey) {
  if (!CITY_CONTENT[cityKey]) return;

  activeCity = cityKey;
  setActiveLabel(cityKey);
  updateMarkerStyles(cityKey);
  showModal(cityKey);

  const nextPoint = cityPositions.get(cityKey);
  if (nextPoint) {
    targetPosition = nextPoint.clone();
  }
}

function createLabel(cityKey, title) {
  const button = document.createElement('button');
  button.className = 'city-label';
  button.textContent = title;
  button.addEventListener('click', () => selectCity(cityKey));
  labelsRoot.appendChild(button);
  cityLabels.set(cityKey, button);
}

function createMarker(cityKey, position) {
  const geometry = new THREE.SphereGeometry(0.06, 24, 24);
  const material = new THREE.MeshStandardMaterial({
    color: '#ffffff',
    emissive: '#666666',
    emissiveIntensity: 0.8,
  });

  const marker = new THREE.Mesh(geometry, material);
  marker.castShadow = true;
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

async function loadScene() {
  const [mapGltf, carGltf] = await Promise.all([
    loader.loadAsync('/models/MAP.glb'),
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
      // createMarker(obj.name, worldPosition.clone());
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

  const CAR_Y_OFFSET = 0.1;

  vanRoot = new THREE.Group();

  const carInstance = carModel.clone();
  carInstance.position.set(0, CAR_Y_OFFSET, 0);
  carInstance.scale.set(0.15, 0.15, 0.15);

  vanRoot.add(carInstance);
  scene.add(vanRoot);


  if (cityPoints.length) {
    const firstCityKey = cityPoints[0].key;
    const firstPosition = cityPositions.get(firstCityKey).clone();

    vanRoot.position.copy(firstPosition);
    previousPosition.copy(firstPosition);
    targetPosition = firstPosition.clone();

    selectCity(firstCityKey);
  }
}

function animate() {
  requestAnimationFrame(animate);

  const delta = clock.getDelta();

  if (vanRoot && targetPosition) {
    const current = vanRoot.position;
    const distance = current.distanceTo(targetPosition);

    if (distance > 0.001) {
      const speed = 2.4;
      const alpha = 1 - Math.exp(-speed * delta);
      current.lerp(targetPosition, alpha);

      const direction = targetPosition.clone().sub(previousPosition);
      if (direction.lengthSq() > 0.00001) {
        const angle = Math.atan2(direction.x, direction.z);
        vanRoot.rotation.y = angle;
      }

      previousPosition.copy(current);
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