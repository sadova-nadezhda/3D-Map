import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

export function createSceneContext({ container }) {
  const scene = new THREE.Scene();

  const bgCanvas = document.createElement('canvas');
  bgCanvas.width = 1024;
  bgCanvas.height = 1024;

  const bgCtx = bgCanvas.getContext('2d');
  const gradient = bgCtx.createRadialGradient(260, 320, 40, 640, 560, 760);

  gradient.addColorStop(0, '#f1bbb0');
  gradient.addColorStop(0.3, '#d38d79');
  gradient.addColorStop(0.72, '#9f5f49');
  gradient.addColorStop(1, '#5c342d');

  bgCtx.fillStyle = gradient;
  bgCtx.fillRect(0, 0, bgCanvas.width, bgCanvas.height);

  const vignette = bgCtx.createLinearGradient(0, 0, bgCanvas.width, bgCanvas.height);
  vignette.addColorStop(0, 'rgba(255,255,255,0.02)');
  vignette.addColorStop(1, 'rgba(28,12,9,0.28)');
  bgCtx.fillStyle = vignette;
  bgCtx.fillRect(0, 0, bgCanvas.width, bgCanvas.height);

  const bgTexture = new THREE.CanvasTexture(bgCanvas);
  bgTexture.colorSpace = THREE.SRGBColorSpace;

  scene.background = bgTexture;

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
    alpha: false,
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
