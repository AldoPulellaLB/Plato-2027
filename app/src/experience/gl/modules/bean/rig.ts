// Camera rig and lighting rig for the chapter-one film.
// A shot is an orbit around a target (yaw/pitch/dist) plus a lens shift that
// places the subject on screen without changing perspective, so subjects can sit
// left/right of the DOM copy and still hand over cleanly between frames.
import * as THREE from "three";

import { mix } from "./util";

export interface Shot {
  tx: number;
  ty: number;
  tz: number;
  dist: number;
  yaw: number;
  pitch: number;
  roll: number;
  fov: number;
  /** Lens shift: subject position in NDC (-1..1). */
  sx: number;
  sy: number;
}

export function shot(partial: Partial<Shot> = {}): Shot {
  return { tx: 0, ty: 0, tz: 0, dist: 10, yaw: 0, pitch: 0, roll: 0, fov: 35, sx: 0, sy: 0, ...partial };
}

export function copyShot(out: Shot, a: Shot) {
  out.tx = a.tx;
  out.ty = a.ty;
  out.tz = a.tz;
  out.dist = a.dist;
  out.yaw = a.yaw;
  out.pitch = a.pitch;
  out.roll = a.roll;
  out.fov = a.fov;
  out.sx = a.sx;
  out.sy = a.sy;
  return out;
}

/** Interpolate shots. Distance interpolates in log space so dolly moves feel even. */
export function lerpShot(out: Shot, a: Shot, b: Shot, t: number) {
  out.tx = mix(a.tx, b.tx, t);
  out.ty = mix(a.ty, b.ty, t);
  out.tz = mix(a.tz, b.tz, t);
  out.dist = Math.exp(mix(Math.log(a.dist), Math.log(b.dist), t));
  out.yaw = mix(a.yaw, b.yaw, t);
  out.pitch = mix(a.pitch, b.pitch, t);
  out.roll = mix(a.roll, b.roll, t);
  out.fov = mix(a.fov, b.fov, t);
  out.sx = mix(a.sx, b.sx, t);
  out.sy = mix(a.sy, b.sy, t);
  return out;
}

const _e = new THREE.Euler(0, 0, 0, "YXZ");
const _v = new THREE.Vector3();

/** Distance at which a subject of `radius` fills `frac` of the smaller half-extent of the view. */
export function fitDistance(radius: number, frac: number, aspect: number, fov = 35) {
  const t = Math.tan(THREE.MathUtils.degToRad(fov) / 2);
  return radius / (frac * t * Math.min(1, aspect));
}

/** Visible half extents (world units) at `dist` for the camera. */
export function halfExtents(dist: number, aspect: number, fov = 35) {
  const h = dist * Math.tan(THREE.MathUtils.degToRad(fov) / 2);
  return { hw: h * aspect, hh: h };
}

/** Orientation for a shot (yaw, then pitch, then roll). */
export function shotQuaternion(s: Shot, out: THREE.Quaternion, yawOffset = 0, pitchOffset = 0) {
  _e.set(s.pitch + pitchOffset, s.yaw + yawOffset, s.roll, "YXZ");
  return out.setFromEuler(_e);
}

/** Apply a shot to the camera, with a small pointer orbit for parallax. */
export function applyShot(camera: THREE.PerspectiveCamera, s: Shot, px: number, py: number) {
  shotQuaternion(s, camera.quaternion, -px * 0.038, py * 0.026);
  _v.set(0, 0, s.dist).applyQuaternion(camera.quaternion);
  camera.position.set(s.tx + _v.x, s.ty + _v.y, s.tz + _v.z);
  camera.fov = s.fov;
  camera.updateProjectionMatrix();
  // Lens shift: NDC = P0 * x / -z - P8, so P8 = -sx places the target at sx.
  const e = camera.projectionMatrix.elements;
  e[8] = -s.sx;
  e[9] = -s.sy;
  camera.projectionMatrixInverse.copy(camera.projectionMatrix).invert();
  camera.updateMatrixWorld(true);
}

/* ------------------------------------------------------------------ */

export interface LightRig {
  ambient: THREE.HemisphereLight;
  key: THREE.DirectionalLight;
  rim: THREE.DirectionalLight;
  warm: THREE.PointLight;
  /**
   * Aim key + rim relative to the camera so the look holds across cuts.
   * `frontal` 0..1 lifts the key toward the lens axis for overhead shots.
   */
  aim(camera: THREE.PerspectiveCamera, target: THREE.Vector3, shadowExtent: number, frontal: number): void;
  dispose(): void;
}

const _kd = new THREE.Vector3();
const _rd = new THREE.Vector3();

export function createLightRig(scene: THREE.Scene, isMobile: boolean): LightRig {
  const ambient = new THREE.HemisphereLight(0xcfc6b8, 0x0e0d0b, 0.22);
  const key = new THREE.DirectionalLight(0xfff1e0, 2.6);
  key.castShadow = true;
  key.shadow.mapSize.set(isMobile ? 1024 : 2048, isMobile ? 1024 : 2048);
  key.shadow.bias = -0.0004;
  key.shadow.normalBias = 0.02;
  key.shadow.radius = 4;
  key.shadow.camera.near = 0.5;
  key.shadow.camera.far = 80;
  const rim = new THREE.DirectionalLight(0xa9c4ff, 1.6);
  const warm = new THREE.PointLight(0xff9a52, 0, 9, 2);
  scene.add(ambient, key, key.target, rim, rim.target, warm);

  return {
    ambient,
    key,
    rim,
    warm,
    aim(camera, target, shadowExtent, frontal) {
      // Key: upper left of frame, slightly in front of the subject.
      _kd.set(mix(-0.62, -0.5, frontal), mix(0.7, 0.44, frontal), mix(0.42, 0.8, frontal)).normalize().applyQuaternion(camera.quaternion);
      key.position.copy(target).addScaledVector(_kd, 30);
      key.target.position.copy(target);
      key.target.updateMatrixWorld();
      // Rim: from behind the subject, upper right, cool.
      _rd.set(mix(0.55, 0.72, frontal), mix(0.45, 0.6, frontal), mix(-0.85, 0.25, frontal)).normalize().applyQuaternion(camera.quaternion);
      rim.position.copy(target).addScaledVector(_rd, 30);
      rim.target.position.copy(target);
      rim.target.updateMatrixWorld();
      const sc = key.shadow.camera;
      if (sc.right !== shadowExtent) {
        sc.left = -shadowExtent;
        sc.right = shadowExtent;
        sc.top = shadowExtent;
        sc.bottom = -shadowExtent;
        sc.updateProjectionMatrix();
      }
    },
    dispose() {
      key.shadow.map?.dispose();
      key.dispose();
      rim.dispose();
      warm.dispose();
      ambient.dispose();
    },
  };
}
