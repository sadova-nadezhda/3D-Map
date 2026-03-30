import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

export function createSceneContext({ container }) {
  const scene = new THREE.Scene();
  // scene.background = new THREE.Color('#FFDDBB');

  const containerWidth = container.clientWidth || window.innerWidth;
  const containerHeight = container.clientHeight || window.innerHeight;

  const camera = new THREE.PerspectiveCamera(
    40,
    containerWidth / containerHeight,
    0.1,
    1000
  );
  camera.position.set(3, 6, 4.5);

  const CAMERA_TARGET = new THREE.Vector3(0, 0.55, 0);
  camera.lookAt(CAMERA_TARGET);

  const renderer = new THREE.WebGLRenderer({
    antialias: true,
    alpha: true,
  });

  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(containerWidth, containerHeight);

  if ('outputColorSpace' in renderer) {
    renderer.outputColorSpace = THREE.SRGBColorSpace;
  } else {
    renderer.outputEncoding = THREE.sRGBEncoding;
  }

  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.12;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  container.appendChild(renderer.domElement);

  const loader = new GLTFLoader();
  const HDR_PATH = '/hdri/studio.hdr';

  return {
    scene,
    camera,
    renderer,
    loader,
    HDR_PATH,
    CAMERA_TARGET,
  };
}
