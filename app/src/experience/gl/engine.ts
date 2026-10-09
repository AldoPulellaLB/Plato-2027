// WebGL engine for the story. Loaded only on the client (dynamic import from
// story-canvas.tsx). One renderer, one fixed transparent canvas behind the DOM.
// Scene modules own their own THREE.Scene + camera; the engine renders the
// module whose frames are on screen, and fades the canvas with their visibility.
import * as THREE from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";

import { story } from "../story";
import type { FrameId } from "../story";

export interface GLContext {
  THREE: typeof THREE;
  renderer: THREE.WebGLRenderer;
  /** PMREM room environment for reflections (set as scene.environment where useful). */
  envMap: THREE.Texture;
  width: number;
  height: number;
  dpr: number;
  /** Narrow or touch viewport: use lighter counts/geometry. */
  isMobile: boolean;
  /** prefers-reduced-motion: render stills (no ambient loops), state from progress only. */
  reduced: boolean;
  /** Seconds since start (frozen at 0 under reduced motion). */
  time: number;
  /** Seconds since last tick (0 under reduced motion). */
  delta: number;
  /** Pointer in NDC (-1..1), smoothed. */
  pointer: { x: number; y: number };
}

export interface FrameView {
  /** 0..1 storyboard progress from story.progress. */
  progress: number;
  /** 0..1 how much of the viewport the frame section covers right now. */
  visibility: number;
  /** Section rect top relative to viewport, in viewport heights (1 = one screen below). */
  top: number;
}

export interface SceneModule {
  name: string;
  /** Frames this module renders. The engine activates it when any of them is on screen. */
  frames: FrameId[];
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  /** Build geometry/materials. Called once, lazily, the first time the module is near the viewport. */
  init(ctx: GLContext): void | Promise<void>;
  /** Called every animation frame while active. Set object states as a pure function of progress (plus ctx.time for ambient loops). */
  update(ctx: GLContext, frames: Record<FrameId, FrameView>): void;
  /** Viewport changed (camera aspect is already updated by the engine). */
  resize?(ctx: GLContext): void;
  /** Optional 0..1 canvas opacity override while active (e.g. dive-to-black). Default: visibility of its frames. */
  opacity?(frames: Record<FrameId, FrameView>): number;
  dispose(): void;
}

export interface Engine {
  destroy(): void;
}

const ALL_FRAMES: FrameId[] = ["f01", "f02", "f03", "f04", "f05", "f06", "f07", "f08", "f09", "f10", "f11", "f12", "f13", "f14"];

export function createEngine(container: HTMLElement, modules: SceneModule[]): Engine {
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const coarse = window.matchMedia("(hover: none) and (pointer: coarse)").matches;
  const isMobileNow = () => coarse || window.innerWidth < 820;

  const renderer = new THREE.WebGLRenderer({
    antialias: true,
    alpha: true,
    powerPreference: "high-performance",
    premultipliedAlpha: true,
  });
  renderer.setClearColor(0x000000, 0);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1;
  renderer.shadowMap.enabled = true;
  // three r18x removed PCFSoftShadowMap (it logged a warning and fell back to PCF).
  renderer.shadowMap.type = THREE.PCFShadowMap;
  const canvas = renderer.domElement;
  canvas.setAttribute("aria-hidden", "true");
  container.appendChild(canvas);

  const pmrem = new THREE.PMREMGenerator(renderer);
  const envMap = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  pmrem.dispose();

  const ctx: GLContext = {
    THREE,
    renderer,
    envMap,
    width: window.innerWidth,
    height: window.innerHeight,
    dpr: 1,
    isMobile: isMobileNow(),
    reduced,
    time: 0,
    delta: 0,
    pointer: { x: 0, y: 0 },
  };

  const pointerTarget = { x: 0, y: 0 };
  const onPointer = (e: PointerEvent) => {
    pointerTarget.x = (e.clientX / window.innerWidth) * 2 - 1;
    pointerTarget.y = -((e.clientY / window.innerHeight) * 2 - 1);
    story.pointer.x = pointerTarget.x;
    story.pointer.y = pointerTarget.y;
  };

  const frameEls = new Map<FrameId, HTMLElement>();
  const findFrames = () => {
    for (const id of ALL_FRAMES) {
      const el = document.getElementById(id);
      if (el) frameEls.set(id, el);
      else frameEls.delete(id);
    }
  };

  const views = Object.fromEntries(ALL_FRAMES.map((id) => [id, { progress: 0, visibility: 0, top: 9 }])) as Record<FrameId, FrameView>;

  const readFrames = () => {
    const vh = window.innerHeight;
    for (const id of ALL_FRAMES) {
      const el = frameEls.get(id);
      const view = views[id];
      view.progress = story.progress[id] ?? 0;
      if (!el) {
        view.visibility = 0;
        view.top = 9;
        continue;
      }
      const r = el.getBoundingClientRect();
      const overlap = Math.max(0, Math.min(vh, r.bottom) - Math.max(0, r.top));
      view.visibility = Math.min(1, overlap / vh);
      view.top = r.top / vh;
    }
  };

  const resize = () => {
    ctx.width = window.innerWidth;
    ctx.height = window.innerHeight;
    ctx.isMobile = isMobileNow();
    ctx.dpr = Math.min(window.devicePixelRatio || 1, ctx.isMobile ? 1.5 : 1.75);
    renderer.setPixelRatio(ctx.dpr);
    renderer.setSize(ctx.width, ctx.height, false);
    canvas.style.width = "100%";
    canvas.style.height = "100%";
    for (const m of modules) {
      m.camera.aspect = ctx.width / ctx.height;
      m.camera.updateProjectionMatrix();
      m.resize?.(ctx);
    }
  };

  const initialised = new Set<SceneModule>();
  const initialising = new Set<SceneModule>();
  const ensureInit = (m: SceneModule) => {
    if (initialised.has(m) || initialising.has(m)) return;
    initialising.add(m);
    Promise.resolve(m.init(ctx))
      .then(() => {
        initialised.add(m);
        m.camera.aspect = ctx.width / ctx.height;
        m.camera.updateProjectionMatrix();
        m.resize?.(ctx);
      })
      .catch((error) => console.error(`GL module ${m.name} failed`, error))
      .finally(() => initialising.delete(m));
  };

  let raf = 0;
  let last = performance.now();
  let running = true;
  let currentOpacity = 0;

  const tick = (now: number) => {
    raf = requestAnimationFrame(tick);
    if (!running) return;
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    ctx.delta = reduced ? 0 : dt;
    ctx.time = reduced ? 0 : ctx.time + dt;
    const k = 1 - Math.pow(0.001, dt);
    ctx.pointer.x += (pointerTarget.x - ctx.pointer.x) * k;
    ctx.pointer.y += (pointerTarget.y - ctx.pointer.y) * k;

    if (frameEls.size === 0) findFrames();
    readFrames();

    // Pick the module with the most on-screen frame coverage; pre-init modules within ~1.5 screens.
    let active: SceneModule | null = null;
    let best = 0;
    for (const m of modules) {
      let vis = 0;
      let near = false;
      for (const id of m.frames) {
        vis = Math.max(vis, views[id].visibility);
        if (views[id].top < 2.5 && views[id].top > -40) near = true;
      }
      if (near || vis > 0) ensureInit(m);
      if (vis > best && initialised.has(m)) {
        best = vis;
        active = m;
      }
    }

    const targetOpacity = active ? (active.opacity ? active.opacity(views) : best) : 0;
    currentOpacity += (targetOpacity - currentOpacity) * (reduced ? 1 : Math.min(1, dt * 10));
    container.style.opacity = currentOpacity.toFixed(3);
    container.style.visibility = currentOpacity < 0.002 ? "hidden" : "visible";

    if (!active || currentOpacity < 0.002) return;
    active.update(ctx, views);
    renderer.render(active.scene, active.camera);
  };

  const onVisibility = () => {
    running = document.visibilityState === "visible";
    last = performance.now();
  };
  const onResize = () => {
    if (coarse && window.innerWidth === ctx.width) return;
    resize();
  };

  // Frames mount with the page; re-scan after route renders and on resize.
  const scan = window.setInterval(findFrames, 1000);

  window.addEventListener("pointermove", onPointer, { passive: true });
  window.addEventListener("resize", onResize);
  document.addEventListener("visibilitychange", onVisibility);
  resize();
  findFrames();
  raf = requestAnimationFrame(tick);

  return {
    destroy() {
      cancelAnimationFrame(raf);
      window.clearInterval(scan);
      window.removeEventListener("pointermove", onPointer);
      window.removeEventListener("resize", onResize);
      document.removeEventListener("visibilitychange", onVisibility);
      for (const m of modules) {
        try {
          m.dispose();
        } catch (error) {
          console.error(error);
        }
      }
      envMap.dispose();
      renderer.dispose();
      canvas.remove();
    },
  };
}
