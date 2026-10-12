// Frame f03: the view through the roaster's sight glass. A steel bezel set into a
// dark front plate, beans tumbling inside the rotating drum, colour following the
// roast model, a warm glow behind the glass and a burst of chaff at first crack.
import * as THREE from "three";

import { FIRST_CRACK_AT, roastColor } from "../../../story";

import type { FilmState, Kit } from "./kit";
import { composeBean, makeBeanParams, makeInstanced, steelMaterial, varyColors } from "./kit";
import { HOPPER_RIM_RADIUS, HOPPER_RIM_TUBE } from "./pour";
import { SpriteBatch } from "./sprites";
import { flakeTexture, glassTexture, ringGlowTexture } from "./textures";
import { bell, clamp, easeOutCubic, fract, hash, mix, range, shash, smooth, TAU } from "./util";

export const DRUM_ORIGIN = new THREE.Vector3(60, 0, 0);
/** Centre of the tumbling mass, relative to the drum origin (the push-through target). */
export const DRUM_MASS = new THREE.Vector3(0.5, -1.18, -1.15);

const WINDOW_R = 1.38;
const DRUM_R = 2.1;

export interface DrumSet {
  group: THREE.Group;
  update(s: FilmState): void;
  dispose(): void;
}

const _p = new THREE.Vector3();
const _qi = new THREE.Quaternion();
const _col = new THREE.Color();

export function createDrumSet(kit: Kit, warm: THREE.PointLight): DrumSet {
  const group = new THREE.Group();
  group.name = "drum";
  group.position.copy(DRUM_ORIGIN);
  group.updateMatrixWorld(true);
  const m = kit.isMobile;

  /* Front plate with the sight-glass opening. */
  const plateShape = new THREE.Shape();
  plateShape.moveTo(-10, -8);
  plateShape.lineTo(10, -8);
  plateShape.lineTo(10, 8);
  plateShape.lineTo(-10, 8);
  plateShape.lineTo(-10, -8);
  const hole = new THREE.Path();
  hole.absarc(0, 0, WINDOW_R + 0.02, 0, TAU, true);
  plateShape.holes.push(hole);
  const plateGeo = new THREE.ShapeGeometry(plateShape, 64);
  const plateBase = new THREE.Color().setRGB(2, 0.4, 0.095, THREE.SRGBColorSpace);
  const plateMat = new THREE.MeshStandardMaterial({
    color: plateBase.clone(),
    metalness: 0.6,
    roughness: 0.8,
    roughnessMap: kit.brushed,
    envMap: kit.envMap,
    envMapIntensity: 0.1,
  });
  const plate = new THREE.Mesh(plateGeo, plateMat);
  group.add(plate);

  const steel = steelMaterial(kit, 0.74, 0.22, 0.75);
  const bezelGeo = new THREE.TorusGeometry(HOPPER_RIM_RADIUS, HOPPER_RIM_TUBE, 24, m ? 72 : 128);
  const bezel = new THREE.Mesh(bezelGeo, steel);
  bezel.position.z = 0.07;
  const lipGeo = new THREE.TorusGeometry(WINDOW_R - 0.01, 0.045, 12, m ? 64 : 112);
  const lip = new THREE.Mesh(lipGeo, steel);
  lip.position.z = -0.04;
  const wellGeo = new THREE.CylinderGeometry(WINDOW_R, WINDOW_R, 0.42, m ? 48 : 96, 1, true);
  wellGeo.rotateX(Math.PI / 2);
  const well = new THREE.Mesh(wellGeo, steel);
  well.position.z = -0.21;
  const flangeGeo = new THREE.RingGeometry(1.56, 1.98, m ? 64 : 128, 1);
  const flangeMat = steelMaterial(kit, 0.3, 0.4, 0.3);
  const flange = new THREE.Mesh(flangeGeo, flangeMat);
  flange.position.z = 0.012;
  const boltGeo = new THREE.CylinderGeometry(0.075, 0.075, 0.07, 6);
  boltGeo.rotateX(Math.PI / 2);
  const bolts = new THREE.InstancedMesh(boltGeo, flangeMat, 8);
  {
    const mm = new THREE.Matrix4();
    for (let i = 0; i < 8; i += 1) {
      const a = (i / 8) * TAU + Math.PI / 8;
      mm.makeRotationZ(a);
      mm.setPosition(Math.cos(a) * 1.77, Math.sin(a) * 1.77, 0.05);
      bolts.setMatrixAt(i, mm);
    }
  }
  group.add(bezel, lip, well, flange, bolts);

  /* Drum interior (rotating shell with vanes). */
  const shellGeo = new THREE.CylinderGeometry(DRUM_R, DRUM_R, 3.9, m ? 36 : 56, 1, true);
  shellGeo.rotateX(Math.PI / 2);
  const shellMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color().setRGB(0.2, 0.19, 0.18, THREE.SRGBColorSpace),
    metalness: 0.75,
    roughness: 0.5,
    roughnessMap: kit.brushed,
    envMap: kit.envMap,
    envMapIntensity: 0.25,
    side: THREE.BackSide,
  });
  const shell = new THREE.Mesh(shellGeo, shellMat);
  shell.position.z = -2.35;
  const vaneGeo = new THREE.BoxGeometry(0.05, 0.36, 3.7);
  const rotor = new THREE.Group();
  rotor.position.z = -2.35;
  for (let i = 0; i < 3; i += 1) {
    const v = new THREE.Mesh(vaneGeo, shellMat);
    const a = (i / 3) * TAU;
    v.position.set(Math.cos(a) * (DRUM_R - 0.16), Math.sin(a) * (DRUM_R - 0.16), 0);
    v.rotation.z = a;
    rotor.add(v);
  }
  const backGeo = new THREE.CircleGeometry(DRUM_R, 48);
  const back = new THREE.Mesh(backGeo, shellMat);
  back.position.z = -4.28;
  group.add(shell, rotor, back);

  /* Beans. */
  const n = m ? 150 : 250;
  const roastMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color().setRGB(0.56, 0.63, 0.42, THREE.SRGBColorSpace),
    roughness: 0.75,
    metalness: 0,
    bumpMap: kit.beanNoise,
    bumpScale: 1.3,
    envMap: kit.envMap,
    envMapIntensity: 0.3,
  });
  const beans = makeInstanced(kit.beanGeo, roastMat, n);
  varyColors(beans, n, 11, 0.14, 0.9);
  const params = makeBeanParams(n, 12, 0.24, 0.3);
  group.add(beans);

  /* Glows, glass, chaff. */
  const glowTex = kit.glow;
  const ringTex = ringGlowTexture(512, 0.6, 0.11);
  const glassTex = glassTexture();
  const flakeTex = flakeTexture();
  const inner = new SpriteBatch(2, glowTex, { additive: 0.92, renderOrder: 6 });
  const halo = new SpriteBatch(1, ringTex, { additive: 0.95, renderOrder: 30 });
  const glass = new SpriteBatch(1, glassTex, { renderOrder: 20 });
  const nChaff = m ? 46 : 110;
  const chaff = new SpriteBatch(nChaff, flakeTex, { renderOrder: 50 });
  group.add(inner.mesh, halo.mesh, glass.mesh, chaff.mesh);

  const identity = new THREE.Quaternion();

  function update(s: FilmState) {
    const b = s.b;
    const visible = b >= 3 && b < 4.5;
    group.visible = visible;
    if (!visible) {
      warm.intensity = 0;
      return;
    }
    const p = clamp(b - 3);
    const t = s.time;
    const arrive = smooth(range(b, 3, 3.32));
    const crack = bell(p, FIRST_CRACK_AT + 0.012, 0.04);
    const heat = smooth(p);

    // Plate and flange come up out of the dark after the match cut.
    plateMat.color.copy(plateBase).multiplyScalar(arrive);
    plateMat.envMapIntensity = 0.4 * arrive;
    flangeMat.envMapIntensity = 0.3 * arrive;

    // Roast colour and surface.
    const ramp = roastColor(p);
    _col.setRGB(ramp[0], ramp[1], ramp[2], THREE.SRGBColorSpace);
    roastMat.color.copy(_col);
    roastMat.roughness = mix(0.76, 0.5, smooth(range(p, 0.3, 1)));
    roastMat.envMapIntensity = mix(0.22, 0.4, smooth(range(p, 0.5, 1)));
    const swell = 1 + 0.13 * smooth(range(p, 0.5, 0.86));

    // Tumble: scroll turns the drum, an ambient spin keeps it alive when idle.
    const drumTurns = (b - 3) * 2.4 + t * 0.085;
    rotor.rotation.z = drumTurns * TAU;
    shell.rotation.z = drumTurns * TAU;
    for (let i = 0; i < n; i += 1) {
      const depthN = hash(i, 61);
      const rn = Math.pow(hash(i, 62), 0.75);
      const r = DRUM_R - 0.12 - (1 - rn) * 0.78;
      const rate = 0.82 + hash(i, 63) * 0.36;
      const u = fract(hash(i, 64) + drumTurns * rate);
      const aStart = mix(-1.82, -2.32, rn);
      const aEnd = mix(-0.62, 0.22, rn);
      const z = -0.5 - Math.pow(depthN, 1.35) * 2.9;
      let x: number;
      let y: number;
      let ang: number;
      const carried = 0.64;
      if (u < carried) {
        const a = mix(aStart, aEnd, u / carried);
        x = Math.cos(a) * r;
        y = Math.sin(a) * r;
        ang = drumTurns * TAU * 0.5 * params.spin[i];
      } else {
        const v = (u - carried) / (1 - carried);
        const x0 = Math.cos(aEnd) * r;
        const y0 = Math.sin(aEnd) * r;
        const r1 = r - 0.15 * hash(i, 65);
        const x1 = Math.cos(aStart - 0.1) * r1;
        const y1 = Math.sin(aStart - 0.1) * r1;
        x = mix(x0, x1, v);
        y = mix(y0, y1, v * v) + 0.4 * v * (1 - v);
        ang = drumTurns * TAU * 0.5 * params.spin[i] + v * 7 * params.spin[i];
      }
      // Charge: at the start of the roast the beans drop in from the hopper above.
      if (p < 0.14) {
        const d0 = hash(i, 66) * 0.09 - 0.03;
        const e = range(p, d0, d0 + 0.065);
        if (e < 1) {
          const sx = shash(i, 67) * 0.9;
          const sy = 2.4 + hash(i, 68) * 0.9;
          x = mix(sx, x, e);
          y = mix(sy, y, e * e);
          ang += (1 - e) * 4 * params.spin[i];
        }
      }
      // Tumble jitter (ambient).
      x += Math.sin(t * 6.1 + i * 1.7) * 0.006;
      y += Math.cos(t * 5.3 + i * 2.3) * 0.006;
      _p.set(x, y, z);
      composeBean(beans, i, params, i, _p, ang, swell);
    }
    beans.instanceMatrix.needsUpdate = true;

    // Warmth behind the glass; flares at first crack.
    const glow = (0.3 + 0.75 * heat + 0.9 * crack) * arrive;
    const gr = mix(0.62, 1.0, heat);
    const gg = mix(0.38, 0.52, heat);
    const gb = mix(0.2, 0.24, heat);
    _p.set(-0.2, 0.55, -3.6);
    inner.set(0, _p, identity, 0, 6.6, 6.6, gr, gg, gb, 0.52 * glow);
    _p.set(0.4, -0.9, -2.2);
    inner.set(1, _p, identity, 0, 4.4, 3.2, gr, gg * 0.9, gb, 0.28 * glow);
    inner.commit();
    _p.set(0, 0, 0.3);
    halo.set(0, _p, identity, 0, 4.6, 4.6, gr, gg, gb, (0.035 + 0.07 * heat + 0.16 * crack) * arrive);
    halo.commit();
    _p.set(0, 0, -0.07);
    glass.set(0, _p, identity, 0.2 + s.pointer.x * 0.04, WINDOW_R * 2, WINDOW_R * 2, 1, 1, 1, 0.92 * arrive);
    glass.commit();
    warm.position.set(DRUM_ORIGIN.x + 0.1, DRUM_ORIGIN.y + 0.7, DRUM_ORIGIN.z - 1.6);
    warm.intensity = (3 + 15 * heat + 22 * crack) * arrive;
    warm.color.setRGB(1, mix(0.5, 0.6, heat), mix(0.26, 0.3, heat));

    // Chaff: papery flakes burst out of the window toward the lens at first crack.
    const cu = range(p, 0.52, 0.7);
    const cam = s.camera;
    const camDist = cam.position.distanceTo(_p.set(DRUM_ORIGIN.x, DRUM_ORIGIN.y, DRUM_ORIGIN.z));
    for (let i = 0; i < nChaff; i += 1) {
      const d = hash(i, 71) * 0.48;
      const v = (cu - d) / 0.52;
      if (cu <= 0 || cu >= 1 || v <= 0 || v >= 1) {
        chaff.hide(i);
        continue;
      }
      const e = easeOutCubic(v);
      const a = shash(i, 72) * 1.5 + 0.25;
      const z0 = -camDist * 0.92;
      const z1 = -(1.4 + hash(i, 73) * 3.2);
      const z = mix(z0, z1, e);
      // Start at the window centre on screen, then fan out to the right and past the lens.
      // The camera looks straight at the window centre (lens shift places it on screen).
      const startX = shash(i, 74) * 0.55;
      const startY = shash(i, 75) * 0.55;
      const spread = -z * (0.18 + hash(i, 76) * 0.62);
      const x = mix(startX, Math.cos(a) * spread + spread * 0.35, e);
      const y = mix(startY, Math.sin(a) * spread * 0.7 - e * e * 0.6, e);
      _p.set(x, y, z).applyMatrix4(cam.matrixWorld);
      group.worldToLocal(_p);
      const size = 0.035 + hash(i, 77) * 0.055;
      const streak = 1 + (1 - v) * 2.2;
      const dir = Math.atan2(Math.sin(a) * 0.7, Math.cos(a) + 0.35) + Math.sin(t * 3 + i) * 0.2;
      _qi.copy(cam.quaternion);
      chaff.set(i, _p, _qi, dir, size * streak, size, 0.94, 0.88, 0.76, Math.sin(v * Math.PI) * (0.45 + hash(i, 78) * 0.4));
    }
    chaff.commit();
  }

  function dispose() {
    for (const g of [plateGeo, bezelGeo, lipGeo, wellGeo, flangeGeo, boltGeo, shellGeo, vaneGeo, backGeo]) g.dispose();
    plateMat.dispose();
    steel.dispose();
    flangeMat.dispose();
    shellMat.dispose();
    roastMat.dispose();
    beans.dispose();
    bolts.dispose();
    inner.dispose();
    halo.dispose();
    glass.dispose();
    chaff.dispose();
    ringTex.dispose();
    glassTex.dispose();
    flakeTex.dispose();
  }

  return { group, update, dispose };
}
