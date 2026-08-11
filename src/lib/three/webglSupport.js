// A cheap, synchronous WebGL availability probe — a bare canvas.getContext(),
// no `three` import (three is the ~600KB chunk both hero and companion layers
// are already careful to keep out of the main bundle). Both PlanetField's
// caller (Sections.jsx) and Companion's caller (Flyer.jsx) already wrap
// `new THREE.WebGLRenderer(...)` in try/catch — the renderer's own constructor
// throws when context creation fails (that catch is what stops the hero and
// the butterfly from taking the page down), but on catch the ONLY thing that
// happened was `canvas.style.display = 'none'`. Nothing filled the hole: a
// visitor whose browser cannot create a WebGL context at all (GPU disabled,
// sandboxed, `--disable-gpu`, an ancient WebView, a corporate policy) got a
// dead unsized canvas and nothing else. This probe runs BEFORE either layer
// ever attempts construction, so the caller can render a deliberate static
// fallback from the first paint instead of discovering the failure only after
// three.js has already thrown.
//
// Cached at module scope: WebGL support does not change mid-session (unlike
// `prefers-reduced-motion`, which CLAUDE.md is explicit must be read live),
// and creating a throwaway canvas + context on every call would be wasteful
// for something asked more than once per page (Sections.jsx AND Flyer.jsx
// both call this).
let cached
export function hasWebGL() {
  if (cached !== undefined) return cached
  try {
    const canvas = document.createElement('canvas')
    const gl = canvas.getContext('webgl2') || canvas.getContext('webgl') || canvas.getContext('experimental-webgl')
    if (gl) {
      // Release the probe context immediately rather than letting it sit
      // alive until GC — WEBGL_lose_context is the documented way to free a
      // context's GPU resources on demand; not every implementation exposes
      // the extension, so this is best-effort.
      gl.getExtension && gl.getExtension('WEBGL_lose_context')?.loseContext()
    }
    cached = !!gl
  } catch (e) {
    cached = false
  }
  return cached
}
