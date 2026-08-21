// Reverse proxy + HTML/JS/CSS rewriter for the live Diaaz 3D configurator
// (https://diaaz-konfigurator.web.app), exposed on this site at /diaaz and
// /table.html.
//
// WHY THIS EXISTS, and why a plain vercel.json rewrite can't do the job:
//
// Diaaz's own pages reference their JS/CSS/models/images with ROOT-ABSOLUTE
// paths ("/_next/static/chunks/933.<hash>.js", "/models/walnut-spider-tables.glb",
// etc), because on Diaaz's real deployment those paths ARE the site root.
// Proxied under our domain, those same root-absolute paths resolve against
// OUR origin instead — and this repo's own /configurator route vendors its
// OWN copy of the same underlying Next.js build, hand-patched from a common
// ancestor without ever recomputing a fresh build hash. So filenames like
// 933.0130173992aebba5.js collide byte-for-byte in NAME but not in CONTENT:
// confirmed by diffing this repo's static/_next/static/chunks/933.*.js
// against what diaaz-konfigurator.web.app actually serves at that path —
// same name, different bytes, and the local copy is missing every one of
// window.__diaazSetMaterial / __diaazAugment / __diaazLeg / window.__cfg,
// which is the entire mechanism the outer sidebar uses to drive the 3D
// scene. Vercel resolves an existing static file by exact path BEFORE any
// rewrite rule ever runs, so no amount of rewrite-rule cleverness can win
// that race for a colliding filename — the static file always answers
// first. /models/legs/*.glb (leg-shape geometry, fetched from inside the
// dynamically-imported /diaaz/legs.js module) has no local collision at
// all, but was never proxied or rewritten anywhere, so it 404s outright.
//
// The fix has to rewrite the REFERENCES, not just proxy the bytes: fetch
// the real Diaaz response server-side and, for text bodies, replace every
// known root-absolute prefix so nothing is left pointing at a path this
// site's own static tree might also answer for.
//
// Every prefix that appears inside JS/CSS/HTML we proxy (/_next/, /models/,
// /images/, /videos/, /icons/) gets rewritten to the SAME origin, under a
// /diaaz/<segment>/ namespace the [...path] route unwinds back to the real
// upstream path. Two independent reasons force same-origin rather than just
// pointing straight at https://diaaz-konfigurator.web.app/...:
//
//   1. Collision, for /_next/ specifically: this repo's own /configurator
//      route vendors a same-filename-different-content copy at bare
//      /_next/..., and a static file always wins that race (see above) —
//      so /_next/ can't stay bare-rooted even proxied through us, let alone
//      pointed external.
//
//   2. CORS, for /models/, /images/, /videos/, /icons/: a <script src> or
//      <link href> pointed at another origin loads fine, but the deeper
//      code those chunks run doesn't just embed <img>/<video> tags — 933.js
//      loads /models/walnut-spider-tables.glb through GLTFLoader and
//      /images/flowers.jpg through drei's useTexture, both of which fetch
//      the resource via JS (fetch()/XHR) rather than a passive tag src.
//      Fetch-based loads enforce CORS, and Firebase Hosting sends no
//      Access-Control-Allow-Origin header at all for this deployment
//      (confirmed with curl -I) — so pointing those prefixes external
//      produced a console "Failed to fetch" and a permanently-blank 3D
//      viewport during testing. Keeping them same-origin sidesteps CORS
//      entirely, since the browser only ever talks to OUR origin; our
//      server-to-server fetch to the real Diaaz origin has no CORS
//      restriction to begin with.
//
// A <script> tag's SRC origin does not change how the code INSIDE that
// script resolves a bare "/x" string at runtime — that always resolves
// against the executing DOCUMENT's location (table.html's own URL), which
// is also why every one of these chunks has to be proxied+rewritten rather
// than just linked to, however they're loaded: a nested literal like
// 933.js's modelUrl or legs.js's `/models/legs/${value}.glb` only resolves
// correctly if the /models/ (or /_next/, /images/...) prefix it's built on
// keeps meaning the same thing everywhere it appears, which the recursive
// rewrite pass guarantees.
//
// /manifest.json is the one genuine external-leaf case: it's fetched by the
// browser's own PWA-install machinery, not by any Diaaz script, so a failed
// fetch has zero visible effect and it's simplest left pointed straight at
// the real origin.
//
// /diaaz/legs.js and the bare /diaaz document are left as same-origin
// references on purpose (not rewritten to anything): both need to keep
// living at OUR origin — legs.js because its own /models/legs/ literal
// needs the same rewrite pass applied to its own body, and the outer /diaaz
// document because the sidebar's own JS may reach into the iframe's
// contentWindow (same-origin access only works if both documents share an
// origin). /assets/*, /brand/*, /refs/* are deliberately left untouched
// here too — they already have working vercel.json rewrites, and the one
// place a Diaaz reference to them shows up (a relative "./refs/${id}.png"
// inside the compiled sidebar bundle at /assets/index-*.js) resolves
// against the OUTER document's location regardless of where that bundle
// was fetched from, so there is nothing for this rewrite pass to fix even
// if it touched that file.

const DIAAZ_ORIGIN = 'https://diaaz-konfigurator.web.app'

// Every one of these stays SAME-ORIGIN, proxied under /diaaz/<segment>/** and
// unwound back to the real upstream path by the [...path] route. Originally
// /models/, /images/, /videos/ and /icons/ were split into "safe to point
// straight at the external origin" (tag-based <img>/<video>/<link> loads)
// vs "must stay proxied" (fetch()-based loads, which enforce CORS) — but
// that split turned out to be fragile in practice: Firebase Hosting sends no
// Access-Control-Allow-Origin header at all for this deployment (confirmed
// with curl -I against diaaz-konfigurator.web.app), and 933.js turns out to
// load /images/flowers.jpg through drei's useTexture (a WebGL texture
// loader, which — like GLTFLoader — can set crossOrigin and hit the exact
// same "Failed to fetch" wall a plain <img> load wouldn't). Manifest.json is
// the one genuine external-leaf case left: it's fetched by the browser's own
// PWA-install machinery, not by any Diaaz script, and a failed manifest
// fetch has zero visible effect on the configurator.
const SAME_ORIGIN_PREFIXES = ['/_next/', '/models/', '/images/', '/videos/', '/icons/']

const TEXT_CONTENT_TYPES = ['text/html', 'text/css', 'text/javascript', 'application/javascript', 'application/json']

/**
 * Rewrite every known root-absolute reference in a text body so nothing is
 * left pointing at a path this site's own static tree might also answer
 * for, or at a fetch()/XHR target that would get CORS-blocked cross-origin.
 * Delimiter-aware ( " ' ` or a bare `(` for unquoted CSS url() ) so we only
 * touch things that are actually being used as a path, not incidental
 * substrings.
 */
export function rewriteDiaazText(text) {
	let out = text

	for (const prefix of SAME_ORIGIN_PREFIXES) {
		out = out.replace(new RegExp(`(["'\`(])${prefix}`, 'g'), `$1/diaaz${prefix}`)
	}

	// Exact-file leaf reference, not a directory prefix — safe to point
	// straight at the real origin, see SAME_ORIGIN_PREFIXES comment above.
	out = out.replace(/(["'`(])\/manifest\.json/g, `$1${DIAAZ_ORIGIN}/manifest.json`)

	return out
}

/**
 * Fetch `upstreamPathAndQuery` (must start with "/") from the live Diaaz
 * deployment and return it as a Response — rewritten if it's a text body,
 * streamed through unmodified otherwise (fonts, glb models, images/video —
 * anything binary passes straight through byte-for-byte).
 */
export async function proxyDiaaz(upstreamPathAndQuery, fetchImpl = fetch) {
	const upstreamUrl = DIAAZ_ORIGIN + upstreamPathAndQuery
	const upstreamRes = await fetchImpl(upstreamUrl, {
		headers: { 'user-agent': 'loomstudio-jo.com diaaz-proxy' },
	})

	const contentType = upstreamRes.headers.get('content-type') || ''
	const isText = TEXT_CONTENT_TYPES.some((t) => contentType.includes(t))

	const headers = new Headers()
	headers.set('content-type', contentType || 'application/octet-stream')
	// Always fresh: the whole point of a live proxy is to mirror upstream,
	// and this route serves content-hashed filenames that are NOT actually
	// immutable here (their content depends on this rewrite pass, which can
	// change), so letting Vercel's edge calcify a copy is exactly the trap
	// the /360 tour hit before (see vercel.json history).
	headers.set('cache-control', 'no-cache')

	if (!isText) {
		return new Response(upstreamRes.body, { status: upstreamRes.status, headers })
	}

	const text = await upstreamRes.text()
	return new Response(rewriteDiaazText(text), { status: upstreamRes.status, headers })
}

export { DIAAZ_ORIGIN }
