import * as THREE from 'three';

export function createVanController({
  scene,
  state,
  route,
  modal,
  labels,
  cityTabs,
  routeOrder,
}) {
  function centerCarModel(model) {
    const box = new THREE.Box3().setFromObject(model);
    const center = new THREE.Vector3();
    box.getCenter(center);

    model.position.x -= center.x;
    model.position.z -= center.z;
    model.position.y -= box.min.y;
  }

  function setVanPositionFromPoint(point) {
    if (!state.vanRoot) return;

    const finalPoint = point.clone().add(state.VAN_OFFSET);

    state.vanRoot.position.set(
      finalPoint.x,
      state.activeRouteY + state.VAN_RIDE_HEIGHT,
      finalPoint.z
    );
  }

  function setupVan(carModel) {
    state.vanRoot = new THREE.Group();

    state.carPivot = new THREE.Group();
    state.carPivot.position.set(0, 0, 0);

    state.carInstance = carModel.clone();
    state.carInstance.scale.set(state.CAR_SCALE, state.CAR_SCALE, state.CAR_SCALE);
    state.carInstance.rotation.set(
      state.CAR_MODEL_ROTATION.x,
      state.CAR_MODEL_ROTATION.y,
      state.CAR_MODEL_ROTATION.z
    );

    centerCarModel(state.carInstance);

    state.carPivot.add(state.carInstance);
    state.vanRoot.add(state.carPivot);
    scene.add(state.vanRoot);
  }

  function startRoute(start, end) {
    state.activeRouteY = Math.max(start.y, end.y) + state.ROUTE_Y_OFFSET;
    state.activeCurve = route.createElegantRouteCurve(start, end, state.activeRouteY);
    route.buildRoute(state.activeCurve, state.activeRouteY);

    state.routeProgress = 0;
    state.routeDistance = 0;
    state.routeLength = state.activeCurve.getLength();
    state.isMoving = true;
  }

  function updateVanMovement(delta) {
    if (!state.vanRoot || !state.activeCurve || !state.isMoving) return;

    state.routeDistance += delta * state.MOVE_SPEED;

    if (state.routeLength <= 0.0001) {
      state.routeProgress = 1;
      state.isMoving = false;
    } else {
      state.routeProgress = state.routeDistance / state.routeLength;

      if (state.routeProgress >= 1) {
        state.routeProgress = 1;
        state.isMoving = false;
      }
    }

    const position = state.activeCurve.getPointAt(state.routeProgress);
    setVanPositionFromPoint(position);

    const lookAheadT = Math.min(state.routeProgress + 0.03, 1);
    const lookAtPoint = state.activeCurve.getPointAt(lookAheadT);

    const direction = lookAtPoint.clone().sub(position);
    direction.y = 0;

    if (direction.lengthSq() > 0.000001) {
      direction.normalize();

      const targetAngle = Math.atan2(direction.x, direction.z) + Math.PI;

      let angleDiff = targetAngle - state.vanRoot.rotation.y;
      angleDiff = Math.atan2(Math.sin(angleDiff), Math.cos(angleDiff));

      state.vanRoot.rotation.y += angleDiff * Math.min(1, state.TURN_SPEED * delta);
    }

    state.vanRoot.rotation.x = 0;
    state.vanRoot.rotation.z = 0;

    if (!state.isMoving) {
      const finalPoint = state.activeCurve.getPointAt(1);
      setVanPositionFromPoint(finalPoint);

      if (state.pendingModalCity) {
        const arrivedCity = state.pendingModalCity;

        state.completedCities.add(arrivedCity);

        const currentIndex = routeOrder.indexOf(arrivedCity);
        const nextCity = routeOrder[currentIndex + 1];

        if (nextCity) {
          state.availableCities.add(nextCity);
        }

        labels.updateAvailability();
        cityTabs.updateAvailability();
        cityTabs.setActiveCity(arrivedCity);
        modal.showPreview(arrivedCity);
        state.pendingModalCity = null;
      }
    }
  }

  return {
    centerCarModel,
    setVanPositionFromPoint,
    setupVan,
    startRoute,
    updateVanMovement,
  };
}
