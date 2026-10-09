// Chapter three WebGL: frame 10 (the cup family) and frame 12 (take Platō home).
// One scene, one camera, two sets on the same stone floor. Only one of the two
// frames can be on screen at a time (frame 11 sits between them), so the module
// switches sets and re-solves the camera for whichever frame is in view.
//
// Rendering notes: this scene renders with the Khronos PBR Neutral tone mapper
// (set just for this render and restored right after) so the brand colours on
// the cups and the bag photo stay true; the floor and shadows bypass tone
// mapping so the stone melts exactly into the paper page background.
import * as THREE from "three";

import { FRAMES } from "../../story";
import type { FrameId } from "../../story";
import type { FrameView, GLContext, SceneModule } from "../engine";
import { createHomeBag } from "./brand/bag";
import type { HomeBag } from "./brand/bag";
import { BRAND_FOV, createCupRow } from "./brand/cups";
import type { CupRow, CupRowStage } from "./brand/cups";
import { createBlobTexture, createFloorPool } from "./brand/floor";
import type { FloorPool } from "./brand/floor";
import { range, smooth } from "./brand/math";
import { readBrandPalette } from "./brand/palette";

const FONT_STACK = `"Jost", "Futura", "Avenir Next", system-ui, sans-serif`;
const EXPOSURE = 1.02;
const ANCHOR_KEYS = ["cup-s", "cup-m", "cup-l"] as const;

function specLength(id: FrameId) {
  return (FRAMES.find((f) => f.id === id)?.vh ?? 100) / 100;
}

async function fontsReady() {
  if (typeof document === "undefined" || !("fonts" in document)) return;
  const timeout = new Promise<void>((resolve) => window.setTimeout(resolve, 1500));
  await Promise.race([document.fonts.load(`500 48px "Jost"`).then(() => undefined), timeout]).catch(() => undefined);
}

export function createBrandModule(): SceneModule {
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(BRAND_FOV, 1, 0.1, 90);
  camera.rotation.order = "YXZ";

  let cups: CupRow | null = null;
  let bag: HomeBag | null = null;
  let floor: FloorPool | null = null;
  let blob: THREE.Texture | null = null;
  let lights: THREE.Light[] = [];
  let disposed = false;

  // DOM measurements, cached (refreshed on resize and about once a second) so
  // the render loop never forces layout.
  let f10Section: HTMLElement | null = null;
  let f10Stage: HTMLElement | null = null;
  let f12Section: HTMLElement | null = null;
  let anchors: number[] | null = null;
  let pinLength10 = specLength("f10") - 1;
  let sticky10 = true;
  let length12 = specLength("f12");
  let measuredAt = 0;

  const findDom = () => {
    if (!f10Section?.isConnected) {
      f10Section = document.getElementById("f10");
      f10Stage = (f10Section?.querySelector(":scope > .frame__stage") as HTMLElement | null) ?? null;
    }
    if (!f12Section?.isConnected) f12Section = document.getElementById("f12");
  };

  /** Cup centres from the DOM size labels when they publish data-gl-anchor (viewport x fractions). */
  const readAnchors = (ctx: GLContext) => {
    if (!f10Section) return null;
    const xs: number[] = [];
    for (const key of ANCHOR_KEYS) {
      const el = f10Section.querySelector(`[data-gl-anchor="${key}"]`);
      if (!el) return null;
      const r = el.getBoundingClientRect();
      if (r.width === 0) return null;
      xs.push((r.left + r.width / 2) / Math.max(1, ctx.width));
    }
    return xs[0] < xs[1] && xs[1] < xs[2] ? xs : null;
  };

  /** Re-measure the frames; returns true when the cup anchors changed. */
  const measure = (ctx: GLContext) => {
    findDom();
    const vh = Math.max(1, ctx.height);
    if (f10Section) pinLength10 = Math.max(0, f10Section.offsetHeight / vh - 1);
    sticky10 = f10Stage ? getComputedStyle(f10Stage).position === "sticky" : !ctx.reduced;
    if (f12Section) length12 = f12Section.offsetHeight / vh;
    const next = readAnchors(ctx);
    const changed =
      (next === null) !== (anchors === null) ||
      (next !== null && anchors !== null && next.some((x, i) => Math.abs(x - anchors![i]) > 0.002));
    anchors = next;
    measuredAt = performance.now();
    return changed;
  };

  /** Where the f10 stage sits on screen: it scrolls in, sticks for the pin, then scrolls out. */
  const stageOf10 = (ctx: GLContext, view: FrameView): CupRowStage => {
    const pinned = sticky10 && !ctx.reduced && pinLength10 > 0.05;
    const top = pinned ? (view.top > 0 ? view.top : Math.min(0, view.top + pinLength10)) : view.top;
    return { top, pinLength: pinLength10, pinned };
  };

  const relayout = (ctx: GLContext) => {
    measure(ctx);
    cups?.layout(ctx, anchors);
    bag?.layout(ctx);
  };

  return {
    name: "brand",
    frames: ["f10", "f12"],
    scene,
    camera,

    async init(ctx) {
      const palette = readBrandPalette();
      await fontsReady();
      if (disposed) return;

      scene.environment = ctx.envMap;
      scene.environmentIntensity = 0.45;

      // Bright soft daylight: key from the upper left, a broad sky/ground fill,
      // a cool kicker from the right and a faint rim from behind for separation.
      const hemi = new THREE.HemisphereLight(new THREE.Color(palette.paper), new THREE.Color(palette.stone), 0.55);
      const key = new THREE.DirectionalLight(new THREE.Color(palette.paper), 2.85);
      key.position.set(-3.2, 5.5, 3.6);
      const fill = new THREE.DirectionalLight(new THREE.Color(palette.paperWarm), 0.45);
      fill.position.set(4.5, 1.8, 3.2);
      const rim = new THREE.DirectionalLight(new THREE.Color(palette.paper), 0.8);
      rim.position.set(2.5, 3.2, -4.5);
      lights = [hemi, key, fill, rim];
      scene.add(...lights);

      blob = createBlobTexture(128);
      floor = createFloorPool(palette.stone);
      scene.add(floor.mesh);

      cups = createCupRow(ctx, palette, blob, FONT_STACK);
      scene.add(cups.group);

      try {
        bag = await createHomeBag(ctx, palette, blob);
        if (disposed) {
          bag.dispose();
          bag = null;
          return;
        }
        scene.add(bag.group);
      } catch (error) {
        console.error("Brand scene: House Blend bag failed to load", error);
        bag = null;
      }

      // Neutral tone mapping for this scene only (restored after the draw).
      let savedMapping: THREE.ToneMapping = THREE.ACESFilmicToneMapping;
      let savedExposure = 1;
      scene.onBeforeRender = (renderer: THREE.WebGLRenderer) => {
        savedMapping = renderer.toneMapping;
        savedExposure = renderer.toneMappingExposure;
        renderer.toneMapping = THREE.NeutralToneMapping;
        renderer.toneMappingExposure = EXPOSURE;
      };
      scene.onAfterRender = (renderer: THREE.WebGLRenderer) => {
        renderer.toneMapping = savedMapping;
        renderer.toneMappingExposure = savedExposure;
      };

      relayout(ctx);
    },

    update(ctx, frames) {
      if (!cups || !floor) return;
      const v10 = frames.f10;
      const v12 = frames.f12;
      const showCups = v10.visibility >= v12.visibility || !bag;

      // Follow the DOM (labels, section heights) if it reflows without a resize.
      if (performance.now() - measuredAt > 1200 && measure(ctx)) cups.layout(ctx, anchors);

      cups.group.visible = showCups;
      if (bag) bag.group.visible = !showCups;

      if (showCups) cups.update(ctx, v10, stageOf10(ctx, v10), camera, floor);
      else if (bag) bag.update(ctx, v12, camera, floor, 0.5 - length12 / 2);
    },

    resize(ctx) {
      relayout(ctx);
    },

    opacity(frames) {
      const a = smooth(range(frames.f10.visibility, 0, 0.16));
      const b = smooth(range(frames.f12.visibility, 0, 0.2));
      return Math.max(a, b);
    },

    dispose() {
      disposed = true;
      cups?.dispose();
      bag?.dispose();
      floor?.dispose();
      blob?.dispose();
      for (const light of lights) {
        light.dispose();
        scene.remove(light);
      }
      cups = null;
      bag = null;
      floor = null;
      blob = null;
      lights = [];
      scene.environment = null;
      scene.clear();
    },
  };
}
