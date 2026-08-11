# Porting conventions — React → Svelte 5

Read this before writing a single component. Every ported file must follow it,
because the whole site has to read as one codebase afterwards.

## Where things are

| React (`~/Desktop/LOOM PROJECT`) | Svelte (`~/Desktop/LOOM SVELTE`) |
|---|---|
| `src/components/Foo.jsx` | `src/lib/components/Foo.svelte` |
| `src/components/foo.css` | `src/lib/components/foo.css` (already copied) |
| `src/data/*.js` | `src/lib/data/*.js` — alias `$data` (already copied, unchanged) |
| `src/lib/motion.jsx` | `src/lib/motion.svelte.js` + `SplitWords.svelte` / `CountUp.svelte` |
| `src/lib/wizard.jsx` | `src/lib/wizard.svelte.js` — `import { wizard }` |
| `src/lib/auth.jsx` | `src/lib/auth.svelte.js` — `import { auth }` |
| `src/three/*` | `src/lib/three/*` — alias `$three`, **ported untouched** |

Aliases: `$lib`, `$data`, `$components`, `$three`.

## The rules

### 1. Nothing starts invisible. This is the whole point of the rebuild.

The React components opened at `opacity: 0` and animated to 1. Under SSR that
would ship perfect HTML and then paint it blank until hydration — slower-feeling
than the SPA we are replacing.

- Use `use:reveal` from `$lib/motion.svelte.js` instead of a `<Reveal>` wrapper.
  It renders the element finished and only pushes it to a start pose on the
  client, and only if the element is still below the fold.
- Use `<SplitWords>` / `<CountUp>` from `$lib/components/` — already ported with
  the same contract.
- Never write `initial={{ opacity: 0 }}` logic by hand. If you need an entrance
  that the primitives do not cover, write it so the *server* markup is the
  finished state.

### 2. Do not use `motion` / `motion/react`.

Svelte's built-in `transition:`/`in:`/`out:` (from `svelte/transition`) and
plain CSS cover everything these components did. Dropping the library is part
of the payload win. `EASE` (a cubic-bezier string) is exported from
`$lib/motion.svelte.js`; `cubicOut` from `svelte/easing` is its Svelte
equivalent for transitions.

Mapping:
- `<AnimatePresence>{cond && <motion.div exit=…>}` → `{#if cond}<div transition:fly=…>`
- `whileInView` → `use:reveal`
- `useScroll`/`useSpring` → a scroll-driven CSS animation, or one rAF that
  writes a transform. Never a spring simulation on the main thread.
- `useReducedMotion()` → `reducedMotion.current` (live, from `$lib/motion.svelte.js`)

### 3. Runes, not hooks.

- `useState` → `$state`
- `useMemo` / derived values → `$derived`
- `useEffect` → `$effect` (returns a cleanup, same as React)
- `useRef` for a DOM node → `let el = $state(null)` + `bind:this={el}`
- Props → `let { a, b = 1, ...rest } = $props()`
- `className` prop → `let { class: className = '' } = $props()`

**`$effect` must be called during component initialisation** — at the top level
of `<script>`. An `$effect()` called inside an `onMount` callback is an orphan
and never runs. This has already bitten this port once.

### 4. SSR safety — the server has no `window`.

- Anything touching `window`, `document`, `localStorage`, `matchMedia`,
  `IntersectionObserver` goes inside `onMount` or `$effect` (both client-only),
  or behind `if (browser)` from `$app/environment`.
- Module-scope code runs on the server too. No `Math.random()` and no
  `Date.now()` in render paths — the deterministic integer-hash pattern the
  footer petals use is the house idiom, keep it.
- `new Date().getFullYear()` in markup is fine (it is not a hydration mismatch
  in practice) but prefer computing it once.

### 5. CSS is global and stays exactly as it is.

Import the colocated stylesheet at the top of `<script>`:

```svelte
<script>
  import './pricing.css'
</script>
```

Vite hoists it and it lands in the global sheet — which is what we want. The
16k lines of CSS are already carefully namespaced and must NOT be rewritten
into Svelte's scoped `<style>`. Only write a `<style>` block for genuinely new
rules you are introducing, and say why in a comment.

### 6. Events and links.

- `onClick` → `onclick`, `onMouseEnter` → `onmouseenter` (Svelte 5 uses plain
  DOM attribute names, no `on:` directive).
- For in-page hash links call `navigate(href)` from `$lib/scroll.svelte.js`.
- For real routes (`/type`, `/ai-workshops`, `/dashboard`) write a plain
  `<a href>` and let SvelteKit's router handle it. Do NOT reimplement the
  React build's click interceptor — Kit already does all of it correctly.

### 7. Keep the comments.

These files are heavily commented and the comments are the project's memory —
they record decisions that cost someone a debugging session. **Carry them
across.** Update a reference to `Foo.jsx` to say `Foo.svelte`, and if the port
makes a comment untrue, rewrite it to describe what the Svelte version does
rather than deleting it.

If the React code had a bug-fix comment ("this is why X is not Y"), the Svelte
version must still honour X.

### 8. Content is frozen.

Do not reword copy, rename a case study, invent a statistic, change a price, or
add a section. Everything renders from `$data/*` and those files are unchanged.
If a number appears hardcoded in a component, keep it hardcoded and identical.

### 9. Images.

Keep `<picture>` / `srcset` / `media` exactly as written, including the
`style="display: contents"` on the wrapper. Every `<img>` keeps its `width`,
`height`, `loading` and `decoding` attributes — they are there to stop layout
shift, and dropping one is a real regression. A separate pass handles image
optimisation; do not start it.

`fetchpriority` is lowercase in Svelte (as it is in HTML) — that React comment
about `fetchPriority` no longer applies and can go.

## Verifying your work

```bash
export PATH="$HOME/.local/node/bin:$PATH"
cd ~/Desktop/LOOM\ SVELTE
npx vite build          # must be clean, including the prerender crawl
```

The build renders every prerendered route on the server. If your component
touches `window` at module scope or during render, the build fails there — that
is the check working, not a flake. Fix it in the component, never by disabling
prerender.
