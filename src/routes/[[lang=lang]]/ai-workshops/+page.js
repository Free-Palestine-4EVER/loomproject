// Every marketing route is prerendered — see svelte.config.js. The booking
// form's live price is computed entirely client-side from $data/workshops.js
// (no per-request data), so this route has nothing that needs a server.
export const prerender = true
