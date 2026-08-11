/**
 * Site-wide contact modal. Any CTA anywhere can call open({ intent, niche, note })
 * and the wizard appears pre-seeded with that context.
 *
 * The React version of this was a createContext + Provider + useMemo +
 * useCallback + useContext, and App.jsx had to wrap the entire tree in
 * <WizardProvider> for a nav button to be able to open a modal. Runes make the
 * provider redundant: a $state field on a module-level singleton is reactive
 * for every component that imports it, with no tree wrapping and no context
 * plumbing. Same behaviour, no ceremony.
 */

/** Monotonic seed counter. The React version stamped `_t: Date.now()` so that
 *  opening the wizard twice with an identical context still produced a new
 *  object identity and re-seeded the form. A counter does that job without
 *  reading the clock, which keeps this module safe to evaluate during SSR. */
let tick = 0

class Wizard {
  seed = $state(null)

  get isOpen() { return !!this.seed }

  open(ctx = {}) { this.seed = { ...ctx, _t: ++tick } }
  close() { this.seed = null }
}

export const wizard = new Wizard()
