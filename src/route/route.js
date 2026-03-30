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
    const routeGroups = scene.children.filter(
      (child) => child.userData?.isRouteGroup
    );

    routeGroups.forEach((group) => {
      scene.remove(group);

      group.traverse((child) => {
        if (child.geometry && child.geometry !== padGeometry) {
          child.geometry.dispose();
        }
      });
    });

    state.routeGroup = null;
    state.routeRoadMesh = null;
    state.routeRoadShadowMesh = null;
    state.routeStripeMesh = null;
    state.startPad = null;
    state.endPad = null;
  }

  function getRouteKey(fromCityKey, toCityKey) {
    if (!fromCityKey || !toCityKey) {
      return null;
    }

    return [fromCityKey, toCityKey].sort().join('->');
  }

  function createElegantRouteCurve(start, end, routeY, options = {}) {
    const a = start.clone();
    const b = end.clone();
    const { fromCityKey = null, toCityKey = null } = options;

    a.y = routeY;
    b.y = routeY;

    const flat = b.clone().sub(a);
    flat.y = 0;

    const distance = flat.length();

    if (distance < 0.001) {
      return new THREE.LineCurve3(a, b);
    }

    const dir = flat.clone().normalize();
    const normal = new THREE.Vector3(-dir.z, 0, dir.x);
    const inwardSign = normal.dot(state.mapCenter.clone().sub(a)) >= 0 ? 1 : -1;
    const bounds = state.mapBounds;
    const hasBounds = Number.isFinite(bounds.min.x) && Number.isFinite(bounds.max.x);
    const edgePadding = 0.34;

    // Ограничивает контрольные точки внутри контура карты.
    // routeY отвечает только за высоту дороги, а не за ее форму на карте.
    const clampPointToMap = (point) => {
      if (!hasBounds) {
        point.y = routeY;
        return point;
      }

      point.x = THREE.MathUtils.clamp(point.x, bounds.min.x + edgePadding, bounds.max.x - edgePadding);
      point.z = THREE.MathUtils.clamp(point.z, bounds.min.z + edgePadding, bounds.max.z - edgePadding);

      const radiusX = Math.max((bounds.max.x - bounds.min.x) * 0.4, 0.001);
      const radiusZ = Math.max((bounds.max.z - bounds.min.z) * 0.24, 0.001);
      const dx = point.x - state.mapCenter.x;
      const dz = point.z - state.mapCenter.z;
      const ellipseDistance = (dx * dx) / (radiusX * radiusX) + (dz * dz) / (radiusZ * radiusZ);

      if (ellipseDistance > 1) {
        const scale = 1 / Math.sqrt(ellipseDistance);
        point.x = state.mapCenter.x + dx * scale;
        point.z = state.mapCenter.z + dz * scale;
      }

      point.y = routeY;
      return point;
    };

    // Сначала пробуем ручной маршрут для конкретных проблемных пар городов.
    // Если ниже вернется curve, общий автогенератор уже не применяется.
    const customCurve = createCustomRouteCurve({
      fromCityKey,
      toCityKey,
      start: a,
      end: b,
      routeY,
      clampPointToMap,
    });

    if (customCurve) {
      return customCurve;
    }

    // Ниже общий алгоритм для всех остальных дорог.
    const distanceFactor = THREE.MathUtils.clamp((distance - 0.45) / 1.35, 0, 1);
    const midpoint = a.clone().lerp(b, 0.5);
    const halfWidth = hasBounds
      ? Math.max(bounds.max.x - state.mapCenter.x - edgePadding, 0.001)
      : 1;
    const halfHeightSouth = hasBounds
      ? Math.max(state.mapCenter.z - bounds.min.z - edgePadding, 0.001)
      : 1;
    const halfHeightNorth = hasBounds
      ? Math.max(bounds.max.z - state.mapCenter.z - edgePadding, 0.001)
      : 1;
    const eastExposure = hasBounds
      ? THREE.MathUtils.clamp(
        (midpoint.x - state.mapCenter.x) / halfWidth,
        0,
        1
      )
      : 0;
    const westExposure = hasBounds
      ? THREE.MathUtils.clamp(
        (state.mapCenter.x - midpoint.x) / halfWidth,
        0,
        1
      )
      : 0;
    const southExposure = hasBounds
      ? THREE.MathUtils.clamp(
        (state.mapCenter.z - midpoint.z) / halfHeightSouth,
        0,
        1
      )
      : 0;
    const northExposure = hasBounds
      ? THREE.MathUtils.clamp(
        (midpoint.z - state.mapCenter.z) / halfHeightNorth,
        0,
        1
      )
      : 0;
    const edgeExposure = Math.max(
      eastExposure * 0.8,
      westExposure,
      southExposure * 1.2,
      northExposure * 0.45
    );
    const safeFactor = Math.max(0.35, 1 - eastExposure * 0.28 - westExposure * 0.3 - southExposure * 0.42);
    const centerPullDirection = state.mapCenter.clone().sub(midpoint).setY(0);
    if (centerPullDirection.lengthSq() > 0.000001) {
      centerPullDirection.normalize();
    }
    const centerPull = Math.min(distance * 0.22, 0.34) * edgeExposure;
    const sway = THREE.MathUtils.lerp(
      Math.min(distance * 0.08, 0.09),
      Math.min(distance * 0.22, 0.4),
      distanceFactor
    ) * safeFactor;
    const drift = THREE.MathUtils.lerp(
      Math.min(distance * 0.025, 0.03),
      Math.min(distance * 0.09, 0.18),
      distanceFactor
    ) * safeFactor;
    const point1 = clampPointToMap(
      a.clone()
        .lerp(b, 0.26)
        .add(normal.clone().multiplyScalar(sway * inwardSign))
        .add(dir.clone().multiplyScalar(-drift))
        .add(centerPullDirection.clone().multiplyScalar(centerPull * 0.72))
    );
    const point2 = clampPointToMap(
      a.clone()
        .lerp(b, 0.5)
        .add(normal.clone().multiplyScalar(sway * -0.58 * inwardSign))
        .add(centerPullDirection.clone().multiplyScalar(centerPull))
    );
    const point3 = clampPointToMap(
      a.clone()
        .lerp(b, 0.76)
        .add(normal.clone().multiplyScalar(sway * 0.82 * inwardSign))
        .add(dir.clone().multiplyScalar(drift))
        .add(centerPullDirection.clone().multiplyScalar(centerPull * 0.72))
    );

    return new THREE.CatmullRomCurve3(
      [a, point1, point2, point3, b],
      false,
      'centripetal',
      0.7
    );
  }

  function createCustomRouteCurve({
    fromCityKey,
    toCityKey,
    start,
    end,
    routeY,
    clampPointToMap,
  }) {
    // Здесь перечислены пары городов, для которых маршрут задается вручную.
    if (isRoutePair(fromCityKey, toCityKey, 'city_aqtay', 'city_turk')) {
      return createAktauTurkestanCurve({
        start,
        end,
        routeY,
        clampPointToMap,
      });
    }

    if (isRoutePair(fromCityKey, toCityKey, 'city_atyrau', 'city_aqtay')) {
      return createAtyrauAktauCurve({
        start,
        end,
        routeY,
        clampPointToMap,
      });
    }

    if (isRoutePair(fromCityKey, toCityKey, 'city_atyrau', 'city_turk')) {
      return createAtyrauTurkestanCurve({
        start,
        end,
        routeY,
        clampPointToMap,
      });
    }

    return null;
  }

  function isRoutePair(fromCityKey, toCityKey, cityA, cityB) {
    const pair = [fromCityKey, toCityKey].filter(Boolean).sort().join('->');
    return pair === [cityA, cityB].sort().join('->');
  }

  function createAktauTurkestanCurve({ start, end, routeY, clampPointToMap }) {
    // Тестовый midpoint. Пока смещение 0, линия идет почти ровно.
    // Меняй первое число в new THREE.Vector3(x, 0, z):
    //  0.1 -> дуга вправо
    // -0.1 -> дуга влево
    const point1 = clampPointToMap(
      start.clone().lerp(end, 0.5).add(new THREE.Vector3(-1.2, 0, 0))
    );

    return new THREE.CatmullRomCurve3(
      [start, point1, end],
      false,
      'centripetal',
      // Меньше значение -> ближе к прямым сегментам.
      // Больше значение -> дуга плавнее и свободнее.
      0.2
    );
  }

  function createAtyrauAktauCurve({ start, end }) {
    // Тестовый midpoint. Пока смещение 0, поэтому линия остается ровной.
    const point1 = start.clone().lerp(end, 0.5).add(new THREE.Vector3(0.3, 0, 0));

    return new THREE.CatmullRomCurve3(
      [start, point1, end],
      false,
      'centripetal',
      0.2
    );
  }

  function createAtyrauTurkestanCurve({ start, end, routeY, clampPointToMap }) {
    // Здесь логика такая же, как выше:
    // lerp задает место точки на маршруте,
    // add(Vector3(x, 0, z)) задает смещение этой точки.
    const aqtobe = state.cityPositions.get('city_aqtobe');

    if (!aqtobe) {
      return null;
    }

    const point1 = clampPointToMap(
      start
        .clone()
        .lerp(aqtobe, 0.42)
        .add(new THREE.Vector3(0.12, 0, -0.04))
    );
    const point2 = clampPointToMap(
      aqtobe
        .clone()
        .lerp(end, 0.34)
        .add(new THREE.Vector3(0.22, 0, -0.04))
    );
    const point3 = clampPointToMap(
      start
        .clone()
        .lerp(end, 0.8)
        .add(new THREE.Vector3(0.18, 0, -0.08))
    );

    point1.y = routeY;
    point2.y = routeY;
    point3.y = routeY;

    return new THREE.CatmullRomCurve3(
      [start, point1, point2, point3, end],
      false,
      'centripetal',
      0.7
    );
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

  function buildRoute(curve, routeY, options = {}) {
    const { fromCityKey = null, toCityKey = null } = options;
    const routeKey = getRouteKey(fromCityKey, toCityKey);

    if (routeKey) {
      const existingRouteGroup = scene.children.find(
        (child) => child.userData?.isRouteGroup && child.userData?.routeKey === routeKey
      );

      if (existingRouteGroup) {
        state.routeGroup = existingRouteGroup;
        return;
      }
    }

    state.routeGroup = new THREE.Group();
    state.routeGroup.userData.isRouteGroup = true;
    state.routeGroup.userData.routeKey = routeKey;

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
