import * as THREE from 'three';

export function computeObjectCenter(object) {
  const box = new THREE.Box3().setFromObject(object);
  const center = new THREE.Vector3();
  box.getCenter(center);
  return center;
}