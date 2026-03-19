import * as THREE from 'three';
import { RGBELoader } from 'three/examples/jsm/loaders/RGBELoader.js';
import { computeObjectCenter } from '../utils/math.js';

export async function loadScene({
  sceneContext,
  state,
  labels,
  modal,
  van,
  cityContent,
}) {
  const { scene, renderer, loader, HDR_PATH } = sceneContext;

  createFallbackLights({ scene, state });
  await trySetupEnvironmentLighting({ scene, renderer, state, HDR_PATH });

  const [mapGltf, carGltf] = await Promise.all([
    loader.loadAsync('/models/map.glb'),
    loader.loadAsync('/models/car.glb'),
  ]);

  const mapScene = mapGltf.scene;
  scene.add(mapScene);
  mapScene.updateWorldMatrix(true, true);

  state.mapCenter.copy(computeObjectCenter(mapScene));

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

    state.cityPositions.set(key, position);
    state.cityPoints.push({ key, position });

    const city = cityContent[key];
    if (city) {
      labels.createLabel(key, city.title);
      createInvisibleMarker({
        scene,
        state,
        cityKey: key,
        position,
      });
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

  van.setupVan(carModel);

  if (state.cityPoints.length) {
    const firstCityKey = state.cityPoints[0].key;
    const firstPosition = state.cityPositions.get(firstCityKey).clone();

    state.activeRouteY = firstPosition.y + state.ROUTE_Y_OFFSET;
    van.setVanPositionFromPoint(firstPosition);
    labels.setActiveLabel(firstCityKey);
    modal.hide();
    state.activeCity = firstCityKey;
  }
}

function createFallbackLights({ scene, state }) {
  state.ambientLight = new THREE.AmbientLight(0xffe6db, 0.75);
  scene.add(state.ambientLight);

  state.keyLight = new THREE.DirectionalLight(0xffffff, 1.55);
  state.keyLight.position.set(-4.5, 8, 2.5);
  state.keyLight.castShadow = true;
  state.keyLight.shadow.mapSize.set(2048, 2048);
  state.keyLight.shadow.bias = -0.00015;
  state.keyLight.shadow.normalBias = 0.02;
  state.keyLight.shadow.camera.left = -12;
  state.keyLight.shadow.camera.right = 12;
  state.keyLight.shadow.camera.top = 12;
  state.keyLight.shadow.camera.bottom = -12;
  state.keyLight.shadow.camera.near = 0.1;
  state.keyLight.shadow.camera.far = 40;
  scene.add(state.keyLight);

  state.fillLight = new THREE.DirectionalLight(0xffd9cf, 0.32);
  state.fillLight.position.set(6, 4, -5);
  scene.add(state.fillLight);

  state.backLight = new THREE.DirectionalLight(0xffc1b2, 0.16);
  state.backLight.position.set(0, 6, -8);
  scene.add(state.backLight);
}

async function trySetupEnvironmentLighting({ scene, renderer, state, HDR_PATH }) {
  try {
    const rgbeLoader = new RGBELoader();
    const hdrTexture = await rgbeLoader.loadAsync(HDR_PATH);

    hdrTexture.mapping = THREE.EquirectangularReflectionMapping;
    scene.environment = hdrTexture;

    if (state.ambientLight) state.ambientLight.intensity = 0.42;
    if (state.keyLight) state.keyLight.intensity = 0.95;
    if (state.fillLight) state.fillLight.intensity = 0.18;
    if (state.backLight) state.backLight.intensity = 0.08;

    renderer.toneMappingExposure = 1.08;
    console.log('HDRI успешно загружен:', HDR_PATH);
  } catch (error) {
    console.warn('HDRI не загрузился, используем обычный свет:', error);
  }
}

function createInvisibleMarker({ scene, state, cityKey, position }) {
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
  state.clickableMeshes.push(marker);
}