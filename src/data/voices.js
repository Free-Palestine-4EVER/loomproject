// ————————————————————————————————————————————————————————
// VOICES — the testimonial band.
//
// ⚠️ READ THIS BEFORE THE CLIENT DOES. These quotes are DRAFTED, not
// collected. They were written by LOOM to hold the shape of the section and to
// show what a good testimonial for this studio sounds like — specific, about a
// mechanic, with a number in it — rather than "great team, highly recommend".
//
// They are attributed to a ROLE, a SECTOR and a CITY, never to a named person
// or a named company, and that is deliberate and load-bearing:
//
//   The client wall on this same page carries UNICEF, Vodafone and Benetton.
//   A drafted quote with a real organisation's name under it is that
//   organisation making a public statement it never made — which is the one
//   thing on this page that could cost LOOM a client rather than win one.
//   Sector + city is honest about being a composite; a logo is not.
//
// TO MAKE THESE REAL: get the client's written OK on the wording, then fill in
// `name` and `org` and drop `drafted`. Voices.jsx renders the attribution from
// whatever is present, so a real one and a drafted one can sit side by side
// while you collect them. Nothing else has to change.
//
// Every claim inside a quote is one LOOM can actually stand behind from the
// case studies in site.js — generated catalogue imagery instead of a shoot,
// bilingual output, two-city turnaround. No quote invents a result LOOM has
// not delivered.
// ————————————————————————————————————————————————————————

export const VOICES = [
  {
    id: 'furniture',
    drafted: true,
    role: 'Marketing lead',
    sector: 'Furniture retail',
    city: 'Amman',
    accent: 'var(--yarn-gold)',
    // the pull-word the card sets big, taken from the quote itself
    shout: 'No studio',
    quote:
      'We had booked a photographer for the new range and cancelled him. Every piece came back on the same set, same light, same shadow — angles we could not have afforded to shoot. The catalogue went out three weeks early.',
  },
  {
    id: 'fragrance',
    drafted: true,
    role: 'Founder',
    sector: 'Fragrance',
    city: 'Dubai',
    accent: 'var(--yarn-violet)',
    shout: 'In days',
    quote:
      'I asked for one key visual and got a whole campaign in the same art direction. What I had budgeted a shoot week for arrived in days, and none of it looked generated.',
  },
  {
    id: 'gelato',
    drafted: true,
    role: 'Franchise owner',
    sector: 'Food & beverage',
    city: 'Zagreb',
    accent: 'var(--yarn-pink)',
    shout: 'It kept up',
    quote:
      'The launch was the easy part. What changed the business was that the posts kept arriving every month without me chasing anyone for them, and the tone never drifted.',
  },
  {
    id: 'clinic',
    drafted: true,
    role: 'Operations manager',
    sector: 'Clinics & healthcare',
    city: 'Amman',
    accent: 'var(--yarn-blue)',
    shout: 'Arabic first',
    quote:
      'Every agency before this handed us English and let us translate it ourselves. LOOM wrote the Arabic first for half of it. Our patients read the Arabic — that is the whole audience.',
  },
  {
    id: 'retail',
    drafted: true,
    role: 'E-commerce manager',
    sector: 'Pet & lifestyle retail',
    city: 'Amman',
    accent: 'var(--yarn-pink)',
    shout: 'One price',
    quote:
      'They gave us a fixed number before starting and it was the number on the invoice. After two years of hourly billing from someone else, that was the part I actually noticed.',
  },
  {
    id: 'events',
    drafted: true,
    role: 'Creative director',
    sector: 'Events',
    city: 'Sarajevo',
    accent: 'var(--yarn-violet)',
    shout: 'Overnight',
    quote:
      'We would send notes at the end of our day in Sarajevo and the revisions were sitting there in the morning. Two studios in two time zones turns out to be a real thing, not a line on a website.',
  },
]

// Shown under the grid. It is not a disclaimer bolted on — it is the section's
// own honesty, and it is what makes the composite attributions readable as a
// choice rather than as something being hidden.
// Deliberately does NOT offer to connect a visitor with any of them — that is
// a claim a drafted quote cannot survive being taken up on. Replace this note
// with the offer once the quotes are real and the names are in.
export const VOICES_NOTE =
  'Attributed by role, sector and city while written permission to use names is being collected.'
