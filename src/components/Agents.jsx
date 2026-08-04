// LOOM — the rental detail block folded into a Crew card.
//
// This used to draw a whole second card: its own mascot cut-out, its own
// aura, its own tilt. The user decided against two rosters — "the crew IS
// the rentable roster" — so Crew.jsx now owns the mascot, the tilt and the
// card shell, and this file renders only what's left: the honest product
// facts (what it does, what it needs from you, where it runs, its cadence)
// plus the "Rent {name}" CTA, dropped onto the bottom of the matching crew
// member's own card. data/agents.js stays the single source of truth for
// those facts — see its header comment for the crew↔agent mapping and why
// it isn't a clean 1:1.
//
// `rentName` is the CREW member's name ("Spooly"), not the product's own
// name ("Shelf") — the crew is who the client is renting, wearing this
// product's job description.
import { useWizard } from '../lib/wizard.jsx'
import { WoolButton } from './Wool.jsx'
import './agents.css'

export function RentDetail({ agent, rentName }) {
  const { open } = useWizard()
  if (!agent) return null

  return (
    <>
      <div className="agt-detail">
        <p className="agt-col-h">What it does</p>
        <ul className="agt-list">
          {agent.does.map((d) => <li key={d}>{d}</li>)}
        </ul>

        <p className="agt-col-h">Needs from you</p>
        <p className="agt-needs">{agent.needs.join(' · ')}</p>

        <div className="agt-run">
          <span className="agt-run-item"><i className="agt-run-dot" aria-hidden="true" />{agent.runsOn}</span>
          <span className="agt-run-item">{agent.cadence}</span>
        </div>
      </div>

      <div className="agt-actions">
        <WoolButton
          label={`Rent ${rentName}`}
          size="small"
          onClick={() => open({ note: `Rent — ${rentName}` })}
        />
      </div>
    </>
  )
}
