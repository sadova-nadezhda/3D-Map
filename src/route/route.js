import * as THREE from 'three';

export function createRouteController({ scene, state }) {
  const routeRoadMaterial = new THREE.MeshStandardMaterial({
    color: 0x606060,
    roughness: 1,
    metalness: 0.2,
    envMapIntensity: 1,
    transparent: true,
    opacity: 1,
    side: THREE.DoubleSide,
  });

  const routeRoadShadowMaterial = new THREE.MeshStandardMaterial({
    color: 0x4f545a,
    roughness: 1,
    metalness: 0,
    transparent: true,
    opacity: 0.32,
    side: THREE.DoubleSide,
  });

  const routeStripeMaterial = new THREE.MeshStandardMaterial({
    color: 0xe6e6e6,
    roughness: 0.9,
    metalness: 0,
    envMapIntensity: 0.6,
    side: THREE.DoubleSide,
  });

  const startPadMaterial = new THREE.MeshStandardMaterial({
    color: 0x6f757c,
    roughness: 0.96,
    metalness: 0,
    envMapIntensity: 0.12,
  });

  const endPadMaterial = new THREE.MeshStandardMaterial({
    color: 0x6f757c,
    roughness: 0.96,
    metalness: 0,
    envMapIntensity: 0.12,
  });

  const padGeometry = new THREE.CylinderGeometry(
    state.ROUTE_PAD_RADIUS * 0.72,
    state.ROUTE_PAD_RADIUS * 0.72,
    state.ROUTE_PAD_HEIGHT * 0.7,
    24
  );

  function clearRoute() {
    if (!state.routeGroup) return;

    scene.remove(state.routeGroup);

    state.routeGroup.traverse((child) => {
      if (child.geometry && child.geometry !== padGeometry) {
        child.geometry.dispose();
      }
    });

    state.routeGroup = null;
    state.routeRoadMesh = null;
    state.routeRoadShadowMesh = null;
    state.routeStripeMesh = null;
    state.startPad = null;
    state.endPad = null;
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
    const bend = Math.min(distance * 0.1, 0.18);

    const candidateA = mid.clone().add(normalA.clone().multiplyScalar(bend));
    const candidateB = mid.clone().add(normalB.clone().multiplyScalar(bend));

    const distA = candidateA.distanceToSquared(state.mapCenter);
    const distB = candidateB.distanceToSquared(state.mapCenter);

    const controlPoint = distA < distB ? candidateA : candidateB;
    controlPoint.y = routeY;

    return new THREE.QuadraticBezierCurve3(a, controlPoint, b);
  }

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

    state.routeGroup = new THREE.Group();

    const routeSegments = 220;

    const shadowGeometry = createRibbonGeometry(
      curve,
      0.11,
      routeSegments,
      -0.004
    );

    state.routeRoadShadowMesh = new THREE.Mesh(
      shadowGeometry,
      routeRoadShadowMaterial
    );
    state.routeRoadShadowMesh.receiveShadow = true;
    state.routeRoadShadowMesh.castShadow = false;
    state.routeGroup.add(state.routeRoadShadowMesh);

    const roadGeometry = createRibbonGeometry(
      curve,
      0.082,
      routeSegments,
      0
    );

    state.routeRoadMesh = new THREE.Mesh(roadGeometry, routeRoadMaterial);
    state.routeRoadMesh.receiveShadow = true;
    state.routeRoadMesh.castShadow = false;
    state.routeGroup.add(state.routeRoadMesh);

    const stripeGeometry = createRibbonGeometry(
      curve,
      0.024,
      routeSegments,
      0.002
    );

    state.routeStripeMesh = new THREE.Mesh(stripeGeometry, routeStripeMaterial);
    state.routeStripeMesh.receiveShadow = false;
    state.routeStripeMesh.castShadow = false;
    state.routeGroup.add(state.routeStripeMesh);

    const startPoint = curve.getPointAt(0);
    const endPoint = curve.getPointAt(1);

    state.startPad = new THREE.Mesh(padGeometry, startPadMaterial);
    state.startPad.position.set(
      startPoint.x,
      routeY + state.ROUTE_PAD_HEIGHT * 0.22,
      startPoint.z
    );
    state.startPad.castShadow = false;
    state.startPad.receiveShadow = true;
    state.routeGroup.add(state.startPad);

    state.endPad = new THREE.Mesh(padGeometry, endPadMaterial);
    state.endPad.position.set(
      endPoint.x,
      routeY + state.ROUTE_PAD_HEIGHT * 0.22,
      endPoint.z
    );
    state.endPad.castShadow = false;
    state.endPad.receiveShadow = true;
    state.routeGroup.add(state.endPad);

    scene.add(state.routeGroup);
  }

  return {
    clearRoute,
    createElegantRouteCurve,
    createRibbonGeometry,
    buildRoute,
  };
}