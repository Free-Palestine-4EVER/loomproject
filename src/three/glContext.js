// Actually giving a WebGL context back.
//
// MEASURED BUG. `renderer.dispose()` does NOT release the GL context — it frees
// three's own caches (render lists, programs, render targets) and then returns,
// leaving the live `WebGLRenderingContext` attached to the canvas. The browser
// only reclaims it whenever the canvas and the context object are both
// garbage-collected, which is "eventually" and, in React, often never: the
// canvas element is kept alive by the ref/DOM for the life of the component
// tree, so a layer that mounts, unmounts and mounts again holds TWO contexts.
//
// That is exactly what the site was measured doing. Three WebGL layers (the hero
// planet, the loom shaft, the companion butterfly) × React's StrictMode
// double-invoking every effect = SIX live contexts, all of them holding their own
// framebuffers, depth buffers, textures and compiled programs. The same doubling
// happens in production the moment any of those effects re-runs — and each one
// does, on its `[reduced]` dependency, so a reader toggling Battery Saver (which
// forces `prefers-reduced-motion`, see CLAUDE.md) leaks a context per toggle.
//
// iOS Safari is the platform where that is fatal rather than untidy: it caps
// both the number of live contexts and total GPU memory per tab, and past the
// cap it silently drops the OLDEST context — or kills the tab outright, which is
// the crash this exists to fix.
//
// `forceContextLoss()` is three's wrapper around WEBGL_lose_context.loseContext(),
// which is the only thing in the platform that hands a context back immediately
// and deterministically. Order matters: dispose() first so three's own GPU
// objects are deleted through a still-live context, then lose it.
export function releaseRenderer(renderer) {
  if (!renderer) return
  try { renderer.dispose() } catch (e) { /* already gone */ }
  try { renderer.forceContextLoss() } catch (e) { /* extension unavailable */ }
}
