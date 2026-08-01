// Site-wide contact modal. Any CTA anywhere can call open({ intent, niche, note })
// and the wizard appears pre-seeded with that context.
import { createContext, useCallback, useContext, useMemo, useState } from 'react'

const WizardCtx = createContext({ open: () => {}, close: () => {}, seed: null, isOpen: false })

export function WizardProvider({ children }) {
  const [seed, setSeed] = useState(null)

  const open = useCallback((ctx = {}) => setSeed({ ...ctx, _t: Date.now() }), [])
  const close = useCallback(() => setSeed(null), [])

  const value = useMemo(() => ({ open, close, seed, isOpen: !!seed }), [open, close, seed])
  return <WizardCtx.Provider value={value}>{children}</WizardCtx.Provider>
}

export const useWizard = () => useContext(WizardCtx)
