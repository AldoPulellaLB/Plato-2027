// Frames 10 and 12 scene module (owned by the WebGL brand build). Placeholder until built.
import * as THREE from "three";

import type { SceneModule } from "../engine";

export function createBrandModule(): SceneModule {
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 100);
  return {
    name: "brand",
    frames: ["f10", "f12"],
    scene,
    camera,
    init() {},
    update() {},
    dispose() {},
  };
}
