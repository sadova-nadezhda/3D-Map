import * as THREE from 'three';

export function createAppState() {
  return {
    cityPoints: [],
    clickableMeshes: [],
    cityLabels: new Map(),
    cityPositions: new Map(),

    activeCity: null,
    pendingModalCity: null,
    availableCities: new Set(),
    completedCities: new Set(),

    vanRoot: null,
    carPivot: null,
    carInstance: null,

    activeCurve: null,
    activeRouteY: 0,
    routeProgress: 0,
    routeLength: 0,
    routeDistance: 0,
    isMoving: false,

    routeGroup: null,
    routeRoadMesh: null,
    routeRoadShadowMesh: null,
    routeStripeMesh: null,
    startPad: null,
    endPad: null,

    ambientLight: null,
    keyLight: null,
    fillLight: null,
    backLight: null,

    mapCenter: new THREE.Vector3(),

    raycaster: new THREE.Raycaster(),
    pointer: new THREE.Vector2(),
    clock: new THREE.Clock(),

    MOVE_SPEED: 0.8,
    CAR_SCALE: 0.15,
    TURN_SPEED: 4.5,
    VAN_OFFSET: new THREE.Vector3(0, 0, 0),
    CAR_MODEL_ROTATION: {
      x: -Math.PI / 2,
      y: Math.PI / 2,
      z: Math.PI / 2,
    },

    ROUTE_Y_OFFSET: 0,
    ROUTE_SHADOW_OFFSET: 0.006,
    ROUTE_STRIPE_OFFSET: 0.003,
    ROUTE_WIDTH: 0.08,
    ROUTE_SHADOW_WIDTH: 0.08,
    ROUTE_STRIPE_WIDTH: 0.045,
    ROUTE_SEGMENTS: 100,
    ROUTE_PAD_RADIUS: 0.07,
    ROUTE_PAD_HEIGHT: 0.018,
    VAN_RIDE_HEIGHT: 0,
  };
}