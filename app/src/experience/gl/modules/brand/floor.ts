// The stone floor and its soft baked shadows. The floor is a large plane whose
// alpha falls off radially, so the stone (#e7e5df) melts into the paper page
// background with no visible edge. Shadows are blurred blobs (contact + cast)
// drawn on top of it: deterministic, soft as a big studio softbox, and free.
import * as THREE from "three";

/* ------------------------------------------------------------------ */
/* Floor pool                                                          */

const FLOOR_VERTEX = /* glsl */ `
  varying vec3 vWorld;
  void main() {
    vec4 world = modelMatrix * vec4(position, 1.0);
    vWorld = world.xyz;
    gl_Position = projectionMatrix * viewMatrix * world;
  }
`;

const FLOOR_FRAGMENT = /* glsl */ `
  uniform vec3 uColor;
  uniform vec2 uCenter;
  // x: half width, y: reach toward the camera, z: reach away from it.
  uniform vec3 uRadius;
  uniform float uOpacity;
  varying vec3 vWorld;

  float hash(vec2 p) {
    return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
  }

  void main() {
    vec2 rel = vWorld.xz - uCenter;
    vec2 d = vec2(rel.x / uRadius.x, rel.y / (rel.y > 0.0 ? uRadius.y : uRadius.z));
    float r = length(d);
    // Long, soft shoulder: flat stone in the middle, a very gradual melt at the rim.
    float a = 1.0 - smoothstep(0.18, 1.0, r);
    a = a * a * (3.0 - 2.0 * a);
    // Dither so the 8-bit gradient never bands on a large monitor.
    a += (hash(gl_FragCoord.xy) - 0.5) / 255.0;
    gl_FragColor = vec4(uColor, clamp(a, 0.0, 1.0) * uOpacity);
    #include <colorspace_fragment>
  }
`;

export interface FloorPool {
  mesh: THREE.Mesh<THREE.PlaneGeometry, THREE.ShaderMaterial>;
  /** Centre on the floor, half width, reach toward the camera (front) and away from it (back). */
  set(center: { x: number; z: number }, radius: { x: number; front: number; back: number }, opacity?: number): void;
  dispose(): void;
}

export function createFloorPool(colour: string): FloorPool {
  const geometry = new THREE.PlaneGeometry(60, 60, 1, 1);
  geometry.rotateX(-Math.PI / 2);
  const material = new THREE.ShaderMaterial({
    vertexShader: FLOOR_VERTEX,
    fragmentShader: FLOOR_FRAGMENT,
    uniforms: {
      uColor: { value: new THREE.Color(colour) },
      uCenter: { value: new THREE.Vector2(0, 0) },
      uRadius: { value: new THREE.Vector3(3, 2, 2) },
      uOpacity: { value: 1 },
    },
    transparent: true,
    depthWrite: false,
    toneMapped: false,
  });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.renderOrder = -10;
  mesh.frustumCulled = false;
  return {
    mesh,
    set(center, radius, opacity = 1) {
      material.uniforms.uCenter.value.set(center.x, center.z);
      material.uniforms.uRadius.value.set(radius.x, radius.front, radius.back);
      material.uniforms.uOpacity.value = opacity;
    },
    dispose() {
      geometry.dispose();
      material.dispose();
    },
  };
}

/* ------------------------------------------------------------------ */
/* Blob shadow texture                                                 */

/** White disc whose alpha is a soft gaussian-like falloff (premultiplied-safe). */
export function createBlobTexture(size = 128) {
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const g = canvas.getContext("2d")!;
  const img = g.createImageData(size, size);
  const c = (size - 1) / 2;
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const dx = (x - c) / c;
      const dy = (y - c) / c;
      const r = Math.min(1, Math.sqrt(dx * dx + dy * dy));
      // Gaussian core with a smooth tail that reaches exactly 0 at the edge.
      const a = Math.exp(-r * r * 3.2) * (1 - r * r) * (1 - r);
      const i = (y * size + x) * 4;
      img.data[i] = 255;
      img.data[i + 1] = 255;
      img.data[i + 2] = 255;
      img.data[i + 3] = Math.round(Math.max(0, Math.min(1, a * 1.08)) * 255);
    }
  }
  g.putImageData(img, 0, 0);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.NoColorSpace;
  texture.needsUpdate = true;
  return texture;
}

/** A flat shadow decal lying on the floor (y = 0). Scale x/z to shape it. */
export function createShadowDecal(texture: THREE.Texture, tint: string, renderOrder = -5) {
  const geometry = new THREE.PlaneGeometry(1, 1);
  geometry.rotateX(-Math.PI / 2);
  const material = new THREE.MeshBasicMaterial({
    map: texture,
    color: new THREE.Color(tint),
    transparent: true,
    depthWrite: false,
    toneMapped: false,
    opacity: 0,
  });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.y = 0.002;
  mesh.renderOrder = renderOrder;
  return mesh;
}

/* ------------------------------------------------------------------ */
/* Instanced shadow decals (one per bean); alpha per instance via instanceColor.r */

const INSTANCED_SHADOW_VERTEX = /* glsl */ `
  varying vec2 vUv;
  varying float vAlpha;
  void main() {
    vUv = uv;
    #ifdef USE_INSTANCING_COLOR
      vAlpha = instanceColor.r;
    #else
      vAlpha = 1.0;
    #endif
    vec4 world = modelMatrix * instanceMatrix * vec4(position, 1.0);
    gl_Position = projectionMatrix * viewMatrix * world;
  }
`;

const INSTANCED_SHADOW_FRAGMENT = /* glsl */ `
  uniform sampler2D uMap;
  uniform vec3 uTint;
  uniform float uOpacity;
  varying vec2 vUv;
  varying float vAlpha;
  void main() {
    float a = texture2D(uMap, vUv).a * vAlpha * uOpacity;
    if (a < 0.002) discard;
    gl_FragColor = vec4(uTint, a);
    #include <colorspace_fragment>
  }
`;

export function createInstancedShadowMaterial(texture: THREE.Texture, tint: string) {
  return new THREE.ShaderMaterial({
    vertexShader: INSTANCED_SHADOW_VERTEX,
    fragmentShader: INSTANCED_SHADOW_FRAGMENT,
    uniforms: {
      uMap: { value: texture },
      uTint: { value: new THREE.Color(tint) },
      uOpacity: { value: 1 },
    },
    transparent: true,
    depthWrite: false,
    toneMapped: false,
  });
}
