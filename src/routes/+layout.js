// Every marketing route is prerendered — see svelte.config.js for why that is
// faster than a serverless render for content that never varies per request.
// /dashboard opts back out in its own +page.js.
export const prerender = true
