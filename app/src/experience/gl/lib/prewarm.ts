// Shader warm-up for a scene module. Compiles every material up front (in
// parallel where the driver supports it) and draws one tiny off-screen frame to
// build the shadow-depth programs, so the first frame a set appears on screen
// never stalls on a program link.
import * as THREE from "three";

export interface PrewarmOptions {
  /** Objects to show while warming (their visibility is restored afterwards). */
  show?: THREE.Object3D[];
  /** Tone mapping the scene really renders with, when it swaps it in `onBeforeRender`. */
  toneMapping?: THREE.ToneMapping;
}

export async function prewarmScene(
  renderer: THREE.WebGLRenderer,
  scene: THREE.Scene,
  camera: THREE.Camera,
  options: PrewarmOptions = {},
) {
  const shown = (options.show ?? []).map((object) => [object, object.visible] as const);
  for (const [object] of shown) object.visible = true;

  // Everything takes part: objects outside this camera or the light's shadow
  // camera would otherwise be culled now and compile their programs later.
  const culled: THREE.Object3D[] = [];
  scene.traverse((object) => {
    if (object.frustumCulled) {
      object.frustumCulled = false;
      culled.push(object);
    }
  });

  try {
    // `compile` keys programs on the renderer's tone mapping, but it does not run
    // the scene's onBeforeRender, so apply the scene's own mapping around it.
    const savedMapping = renderer.toneMapping;
    if (options.toneMapping !== undefined) renderer.toneMapping = options.toneMapping;
    let pending: Promise<unknown> = Promise.resolve();
    try {
      pending = renderer.compileAsync(scene, camera);
    } catch {
      renderer.compile(scene, camera);
    } finally {
      renderer.toneMapping = savedMapping;
    }
    await pending.catch(() => undefined);

    // One 16x16 off-screen frame builds the shadow-depth programs. three picks
    // tone mapping and output colour space only when drawing to the canvas (or an
    // XR target), so the target is flagged as one: the frame then uses exactly
    // the program variants the screen will use instead of linking extra ones.
    const target = new THREE.WebGLRenderTarget(16, 16);
    (target as unknown as { isXRRenderTarget: boolean }).isXRRenderTarget = true;
    target.texture.colorSpace = renderer.outputColorSpace;
    const previous = renderer.getRenderTarget();
    try {
      renderer.setRenderTarget(target);
      renderer.render(scene, camera);
    } finally {
      renderer.setRenderTarget(previous);
      target.dispose();
    }
  } finally {
    for (const object of culled) object.frustumCulled = true;
    for (const [object, visible] of shown) object.visible = visible;
  }
}
