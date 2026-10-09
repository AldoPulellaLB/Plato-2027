// Chapter one + frame 05 scene module (owned by the WebGL bean build). Placeholder until built.
import * as THREE from "three";

import type { SceneModule } from "../engine";

export function createBeanModule(): SceneModule {
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 100);
  return {
    name: "bean",
    frames: ["f01", "f02", "f03", "f04", "f05"],
    scene,
    camera,
    init() {},
    update() {},
    dispose() {},
  };
}
