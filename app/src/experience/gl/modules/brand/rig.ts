// Camera rig maths: place a pitched camera so that a point on the floor lands
// exactly on a given spot of the viewport. Lets the WebGL objects line up with
// DOM labels at any viewport size (positions are solved from NDC on resize).

export interface Rig {
  /** tan(vertical fov / 2). */
  t: number;
  aspect: number;
  /** Downward pitch (radians). */
  pitch: number;
  /** Camera distance along z (camera at x = 0, looking down -z). */
  distance: number;
  /** Camera height above the floor (y = 0). */
  height: number;
  /** Ray length from the camera to the anchor row on the floor. */
  lambda: number;
}

/**
 * Solve the camera height so that floor points at z = 0 project to NDC y = ndcY.
 * @param fovDeg vertical field of view in degrees
 */
export function solveRig(fovDeg: number, pitch: number, distance: number, ndcY: number, aspect: number): Rig {
  const t = Math.tan(((fovDeg / 2) * Math.PI) / 180);
  const c = Math.cos(pitch);
  const s = Math.sin(pitch);
  const den = c + ndcY * t * s;
  const lambda = distance / den;
  const height = lambda * (s - ndcY * t * c);
  return { t, aspect, pitch, distance, height, lambda };
}

/** World x on the anchor row (z = 0) that projects to NDC x. */
export function rowX(rig: Rig, ndcX: number) {
  return rig.lambda * ndcX * rig.t * rig.aspect;
}

/** World z where the floor is seen at NDC y (null above the horizon). */
export function floorZAt(rig: Rig, ndcY: number) {
  const c = Math.cos(rig.pitch);
  const s = Math.sin(rig.pitch);
  const dy = ndcY * rig.t * c - s;
  if (dy >= -1e-4) return null;
  const dz = -ndcY * rig.t * s - c;
  const lambda = rig.height / -dy;
  return rig.distance + lambda * dz;
}

/** Visible width of the frustum at a given distance in front of the camera. */
export function widthAt(rig: Rig, distance: number) {
  return 2 * distance * rig.t * rig.aspect;
}
