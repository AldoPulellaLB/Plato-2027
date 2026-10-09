// Mounts the fixed WebGL layer behind the story. Three.js and the scene modules
// load lazily on the client only (code-split), so SSR never touches WebGL.
import { useEffect, useRef } from "react";

import "./story-canvas.css";

function webglAvailable() {
  try {
    const c = document.createElement("canvas");
    const gl = c.getContext("webgl2") || c.getContext("webgl");
    if (!gl) return false;
    // Release the probe context right away; browsers cap live contexts per page.
    gl.getExtension("WEBGL_lose_context")?.loseContext();
    return true;
  } catch {
    return false;
  }
}

export function StoryCanvas() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = ref.current;
    if (!container || !webglAvailable()) return;
    let destroyed = false;
    let destroy: (() => void) | null = null;

    void Promise.all([import("./engine"), import("./modules/bean"), import("./modules/brand")])
      .then(([{ createEngine }, bean, brand]) => {
        if (destroyed) return;
        const engine = createEngine(container, [bean.createBeanModule(), brand.createBrandModule()]);
        destroy = () => engine.destroy();
      })
      .catch((error) => console.error("Story canvas failed to start", error));

    return () => {
      destroyed = true;
      destroy?.();
    };
  }, []);

  return <div aria-hidden="true" className="story-canvas" ref={ref} />;
}
