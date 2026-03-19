import './style.css';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { RGBELoader } from 'three/examples/jsm/loaders/RGBELoader.js';

/**
 * Контент модального окна.
 */
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

/**
 * Сцена.
 */
const scene = new THREE.Scene();
scene.background = new THREE.Color('#b86a57');

/**
 * Фиксированная камера.
 */
const camera = new THREE.PerspectiveCamera(
  40,
  window.innerWidth / window.innerHeight,
  0.1,
  1000
);
camera.position.set(3, 6, 4.5);

const CAMERA_TARGET = new THREE.Vector3(0, 0.55, 0);
camera.lookAt(CAMERA_TARGET);

/**
 * Renderer.
 */
const renderer = new THREE.WebGLRenderer({
  antialias: true,
  alpha: false,
});

renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);

if ('outputColorSpace' in renderer) {
  renderer.outputColorSpace = THREE.SRGBColorSpace;
} else {
  renderer.outputEncoding = THREE.sRGBEncoding;
}

renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.08;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

container.appendChild(renderer.domElement);

/**
 * Лоадеры.
 */
const loader = new GLTFLoader();
const HDR_PATH = '/hdri/studio.hdr';

const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();
const clock = new THREE.Clock();

/**
 * Данные сцены.
 */
const cityPoints = [];
const clickableMeshes = [];
const cityLabels = new Map();
const cityPositions = new Map();

let activeCity = null;
let vanRoot = null;
let carPivot = null;
let carInstance = null;

let activeCurve = null;
let activeRouteY = 0;
let routeProgress = 0;
let isMoving = false;

/**
 * Route meshes.
 */
let routeGroup = null;
let routeRoadMesh = null;
let routeRoadShadowMesh = null;
let routeStripeMesh = null;
let startPad = null;
let endPad = null;

/**
 * Свет.
 */
let ambientLight = null;
let keyLight = null;
let fillLight = null;
let backLight = null;

/**
 * Параметры движения.
 */
const MOVE_SPEED = 0.22;
const CAR_SCALE = 0.15;
const TURN_SPEED = 4.5;
const VAN_OFFSET = new THREE.Vector3(0, 0, 0);
const CAR_MODEL_ROTATION = {
  x: -Math.PI / 2,
  y: Math.PI / 2,
  z: Math.PI / 2,
};

let mapCenter = new THREE.Vector3();

/**
 * Параметры дороги.
 */
const ROUTE_Y_OFFSET = 0;
const ROUTE_SHADOW_OFFSET = 0.006;
const ROUTE_STRIPE_OFFSET = 0.003;
const ROUTE_WIDTH = 0.16;
const ROUTE_SHADOW_WIDTH = 0.19;
const ROUTE_STRIPE_WIDTH = 0.045;
const ROUTE_SEGMENTS = 100;
const ROUTE_PAD_RADIUS = 0.07;
const ROUTE_PAD_HEIGHT = 0.018;
const VAN_RIDE_HEIGHT = 0;

/**
 * Материалы дороги.
 */
const routeRoadMaterial = new THREE.MeshStandardMaterial({
  color: 0xc93d38,
  roughness: 0.72,
  metalness: 0.02,
  envMapIntensity: 0.8,
  side: THREE.DoubleSide,
});

const routeRoadShadowMaterial = new THREE.MeshStandardMaterial({
  color: 0x7f2725,
  roughness: 1.0,
  metalness: 0,
  transparent: true,
  opacity: 0.22,
  side: THREE.DoubleSide,
});

const routeStripeMaterial = new THREE.MeshStandardMaterial({
  color: 0xf06b61,
  roughness: 0.8,
  metalness: 0,
  transparent: true,
  opacity: 0.95,
  side: THREE.DoubleSide,
});

const startPadMaterial = new THREE.MeshStandardMaterial({
  color: 0xffc53d,
  roughness: 0.45,
  metalness: 0.02,
  envMapIntensity: 1.0,
});

const endPadMaterial = new THREE.MeshStandardMaterial({
  color: 0xff8a80,
  roughness: 0.45,
  metalness: 0.02,
  envMapIntensity: 1.0,
});

const padGeometry = new THREE.CylinderGeometry(
  ROUTE_PAD_RADIUS,
  ROUTE_PAD_RADIUS,
  ROUTE_PAD_HEIGHT,
  32
);

function createFallbackLights() {
  ambientLight = new THREE.AmbientLight(0xffe6db, 0.75);
  scene.add(ambientLight);

  keyLight = new THREE.DirectionalLight(0xffffff, 1.55);
  keyLight.position.set(-4.5, 8, 2.5);
  keyLight.castShadow = true;
  keyLight.shadow.mapSize.set(2048, 2048);
  keyLight.shadow.bias = -0.00015;
  keyLight.shadow.normalBias = 0.02;
  keyLight.shadow.camera.left = -12;
  keyLight.shadow.camera.right = 12;
  keyLight.shadow.camera.top = 12;
  keyLight.shadow.camera.bottom = -12;
  keyLight.shadow.camera.near = 0.1;
  keyLight.shadow.camera.far = 40;
  scene.add(keyLight);

  fillLight = new THREE.DirectionalLight(0xffd9cf, 0.32);
  fillLight.position.set(6, 4, -5);
  scene.add(fillLight);

  backLight = new THREE.DirectionalLight(0xffc1b2, 0.16);
  backLight.position.set(0, 6, -8);
  scene.add(backLight);
}

async function trySetupEnvironmentLighting() {
  try {
    const rgbeLoader = new RGBELoader();
    const hdrTexture = await rgbeLoader.loadAsync(HDR_PATH);

    hdrTexture.mapping = THREE.EquirectangularReflectionMapping;
    scene.environment = hdrTexture;

    if (ambientLight) ambientLight.intensity = 0.42;
    if (keyLight) keyLight.intensity = 0.95;
    if (fillLight) fillLight.intensity = 0.18;
    if (backLight) backLight.intensity = 0.08;

    renderer.toneMappingExposure = 1.08;
    console.log('HDRI успешно загружен:', HDR_PATH);
  } catch (error) {
    console.warn('HDRI не загрузился, используем обычный свет:', error);
  }
}

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
      projected.x >= -1.1 &&
      projected.x <= 1.1 &&
      projected.y >= -1.1 &&
      projected.y <= 1.1;

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
  camera.lookAt(CAMERA_TARGET);
  renderer.setSize(window.innerWidth, window.innerHeight);
}

function clearRoute() {
  if (!routeGroup) return;

  scene.remove(routeGroup);

  routeGroup.traverse((child) => {
    if (child.geometry && child.geometry !== padGeometry) {
      child.geometry.dispose();
    }
  });

  routeGroup = null;
  routeRoadMesh = null;
  routeRoadShadowMesh = null;
  routeStripeMesh = null;
  startPad = null;
  endPad = null;
}

function createElegantRouteCurve(start, end, routeY) {
  const a = start.clone();
  const b = end.clone();

  a.y = routeY;
  b.y = routeY;

  const flat = b.clone().sub(a);
  flat.y = 0;

  const distance = flat.length();

  if (distance < 0.001) {
    return new THREE.LineCurve3(a, b);
  }

  const dir = flat.clone().normalize();

  const normalA = new THREE.Vector3(-dir.z, 0, dir.x);
  const normalB = normalA.clone().multiplyScalar(-1);

  const mid = a.clone().lerp(b, 0.5);

  const bend = Math.min(distance * 0.12, 0.22);

  const candidateA = mid.clone().add(normalA.clone().multiplyScalar(bend));
  const candidateB = mid.clone().add(normalB.clone().multiplyScalar(bend));

  const distA = candidateA.distanceToSquared(mapCenter);
  const distB = candidateB.distanceToSquared(mapCenter);

  const controlPoint = distA < distB ? candidateA : candidateB;
  controlPoint.y = routeY;

  return new THREE.QuadraticBezierCurve3(a, controlPoint, b);
}

/**
 * Плоская лента вдоль кривой.
 * Это лучше, чем ExtrudeGeometry, когда нужна дорога на поверхности карты.
 */
function createRibbonGeometry(curve, width, segments, yOffset = 0) {
  const points = curve.getPoints(segments);
  const positions = [];
  const uvs = [];
  const indices = [];

  for (let i = 0; i < points.length; i++) {
    const p = points[i].clone();
    p.y += yOffset;

    let tangent;
    if (i < points.length - 1) {
      tangent = points[i + 1].clone().sub(points[i]);
    } else {
      tangent = points[i].clone().sub(points[i - 1]);
    }

    tangent.y = 0;
    tangent.normalize();

    const left = new THREE.Vector3(-tangent.z, 0, tangent.x).multiplyScalar(width * 0.5);
    const right = left.clone().multiplyScalar(-1);

    const lp = p.clone().add(left);
    const rp = p.clone().add(right);

    positions.push(lp.x, lp.y, lp.z);
    positions.push(rp.x, rp.y, rp.z);

    const v = i / (points.length - 1);
    uvs.push(0, v);
    uvs.push(1, v);
  }

  for (let i = 0; i < points.length - 1; i++) {
    const a = i * 2;
    const b = i * 2 + 1;
    const c = i * 2 + 2;
    const d = i * 2 + 3;

    indices.push(a, b, c);
    indices.push(c, b, d);
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();

  return geometry;
}

function buildRoute(curve, routeY) {
  clearRoute();

  routeGroup = new THREE.Group();

  const shadowGeometry = createRibbonGeometry(
    curve,
    ROUTE_SHADOW_WIDTH,
    ROUTE_SEGMENTS,
    -ROUTE_SHADOW_OFFSET
  );

  routeRoadShadowMesh = new THREE.Mesh(shadowGeometry, routeRoadShadowMaterial);
  routeRoadShadowMesh.receiveShadow = true;
  routeRoadShadowMesh.castShadow = false;
  routeGroup.add(routeRoadShadowMesh);

  const roadGeometry = createRibbonGeometry(
    curve,
    ROUTE_WIDTH,
    ROUTE_SEGMENTS,
    0
  );

  routeRoadMesh = new THREE.Mesh(roadGeometry, routeRoadMaterial);
  routeRoadMesh.receiveShadow = true;
  routeRoadMesh.castShadow = true;
  routeGroup.add(routeRoadMesh);

  const stripeGeometry = createRibbonGeometry(
    curve,
    ROUTE_STRIPE_WIDTH,
    ROUTE_SEGMENTS,
    ROUTE_STRIPE_OFFSET
  );

  routeStripeMesh = new THREE.Mesh(stripeGeometry, routeStripeMaterial);
  routeStripeMesh.receiveShadow = false;
  routeStripeMesh.castShadow = false;
  routeGroup.add(routeStripeMesh);

  const startPoint = curve.getPointAt(0);
  const endPoint = curve.getPointAt(1);

  startPad = new THREE.Mesh(padGeometry, startPadMaterial);
  startPad.position.set(
    startPoint.x,
    routeY + ROUTE_PAD_HEIGHT * 0.5,
    startPoint.z
  );
  startPad.castShadow = true;
  startPad.receiveShadow = true;
  routeGroup.add(startPad);

  endPad = new THREE.Mesh(padGeometry, endPadMaterial);
  endPad.position.set(
    endPoint.x,
    routeY + ROUTE_PAD_HEIGHT * 0.5,
    endPoint.z
  );
  endPad.castShadow = true;
  endPad.receiveShadow = true;
  routeGroup.add(endPad);

  scene.add(routeGroup);
}

function centerCarModel(model) {
  const box = new THREE.Box3().setFromObject(model);
  const center = new THREE.Vector3();
  box.getCenter(center);

  model.position.x -= center.x;
  model.position.z -= center.z;
  model.position.y -= box.min.y;
}

function setVanPositionFromPoint(point) {
  if (!vanRoot) return;

  const finalPoint = point.clone().add(VAN_OFFSET);

  vanRoot.position.set(
    finalPoint.x,
    activeRouteY + VAN_RIDE_HEIGHT,
    finalPoint.z
  );
}

function startRoute(start, end) {
  activeRouteY = Math.max(start.y, end.y) + ROUTE_Y_OFFSET;
  activeCurve = createElegantRouteCurve(start, end, activeRouteY);
  buildRoute(activeCurve, activeRouteY);

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
    activeRouteY = nextPoint.y + ROUTE_Y_OFFSET;
    setVanPositionFromPoint(nextPoint);
    clearRoute();
    return;
  }

  if (sameCity && !isMoving) return;

  const start = vanRoot.position.clone();
  const end = nextPoint.clone();

  startRoute(start, end);
}

async function loadScene() {
  createFallbackLights();
  await trySetupEnvironmentLighting();

  const [mapGltf, carGltf] = await Promise.all([
    loader.loadAsync('/models/map.glb'),
    loader.loadAsync('/models/car.glb'),
  ]);

  const mapScene = mapGltf.scene;
  scene.add(mapScene);
  mapScene.updateWorldMatrix(true, true);

  mapScene.traverse((child) => {
    if (!child.isMesh) return;

    const name = child.name.toLowerCase();
    const originalColor = child.material?.color
      ? child.material.color.clone()
      : new THREE.Color('#d8c3a5');

    if (child.geometry) {
      child.geometry.computeVertexNormals();
    }

    if (name.includes('plane')) {
      child.material = new THREE.MeshStandardMaterial({
        color: new THREE.Color('#5c4c48'),
        roughness: 0.95,
        metalness: 0,
        side: THREE.DoubleSide,
      });

      child.castShadow = false;
      child.receiveShadow = true;
      return;
    }

    child.material = new THREE.MeshStandardMaterial({
      color: originalColor,
      roughness: 0.9,
      metalness: 0,
      envMapIntensity: 1.15,
      dithering: true,
    });

    child.castShadow = true;
    child.receiveShadow = true;
  });

  mapScene.traverse((child) => {
    const name = child.name?.toLowerCase?.() ?? '';
    if (!name.startsWith('city_')) return;

    const key = name;
    const position = new THREE.Vector3();
    child.getWorldPosition(position);

    cityPositions.set(key, position);
    cityPoints.push({ key, position });

    const cityContent = CITY_CONTENT[key];
    if (cityContent) {
      createLabel(key, cityContent.title);
      createInvisibleMarker(key, position);
    }
  });

  const carModel =
    carGltf.scene.getObjectByName('white_mesh') ||
    carGltf.scene.children[0];

  if (!carModel) {
    console.error('Модель машины не найдена в car.glb');
    return;
  }

  carModel.traverse((obj) => {
    if (!obj.isMesh) return;

    obj.castShadow = true;
    obj.receiveShadow = true;

    if (obj.geometry) {
      obj.geometry.computeVertexNormals();
    }

    if (!obj.material || !obj.material.isMeshStandardMaterial) {
      obj.material = new THREE.MeshStandardMaterial({
        color: 0xff3b30,
        roughness: 0.38,
        metalness: 0.12,
        envMapIntensity: 1.35,
      });
    }
  });

  vanRoot = new THREE.Group();
  
  const carPivot = new THREE.Group();
  carPivot.position.set(0, 0, 0);

  carInstance = carModel.clone();
  carInstance.scale.set(CAR_SCALE, CAR_SCALE, CAR_SCALE);
  carInstance.rotation.set(
    CAR_MODEL_ROTATION.x,
    CAR_MODEL_ROTATION.y,
    CAR_MODEL_ROTATION.z
  );

  centerCarModel(carInstance);

  /**
   * Если модель смотрит не туда:
   * попробуй carPivot.rotation.y = Math.PI;
   */

  carPivot.add(carInstance);
  vanRoot.add(carPivot);
  scene.add(vanRoot);

  if (cityPoints.length) {
    const firstCityKey = cityPoints[0].key;
    const firstPosition = cityPositions.get(firstCityKey).clone();

    activeRouteY = firstPosition.y + ROUTE_Y_OFFSET;
    setVanPositionFromPoint(firstPosition);
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
    setVanPositionFromPoint(position);

    const lookAheadT = Math.min(routeProgress + 0.03, 1);
    const lookAtPoint = activeCurve.getPointAt(lookAheadT);

    const direction = lookAtPoint.clone().sub(position);
    direction.y = 0;

    if (direction.lengthSq() > 0.000001) {
      direction.normalize();

      const targetAngle = Math.atan2(direction.x, direction.z) + Math.PI;

      let angleDiff = targetAngle - vanRoot.rotation.y;
      angleDiff = Math.atan2(Math.sin(angleDiff), Math.cos(angleDiff));

      vanRoot.rotation.y += angleDiff * Math.min(1, TURN_SPEED * delta);
    }

    vanRoot.rotation.x = 0;
    vanRoot.rotation.z = 0;

    if (!isMoving) {
      const finalPoint = activeCurve.getPointAt(1);
      setVanPositionFromPoint(finalPoint);
    }
  }

  camera.lookAt(CAMERA_TARGET);
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