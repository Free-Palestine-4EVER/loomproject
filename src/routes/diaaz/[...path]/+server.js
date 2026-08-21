// Proxies the Diaaz configurator's outer sidebar page (bare /diaaz), its
// dynamically-imported leg-geometry module (/diaaz/legs.js), and — under the
// collision-free /diaaz/_next/**, /diaaz/models/**, /diaaz/images/**,
// /diaaz/videos/** and /diaaz/icons/** namespaces — every reference
// table.html's rewritten body now points at instead of the bare root path,
// which either collides with this repo's own /configurator vendoring the
// same-filename-different-content Next.js build (/_next/**), or gets
// CORS-blocked cross-origin because Firebase Hosting sends no
// Access-Control-Allow-Origin header here (/models/**, /images/**, and
// friends are pulled by fetch()-based loaders, not just <img> tags). See
// src/lib/server/diaazProxy.js for the full why.
//
// Not prerendered: this is a live reverse proxy onto a deployment we don't
// control, not static content — every request has to actually hit the
// network.
export const prerender = false

import { proxyDiaaz } from '$lib/server/diaazProxy'

// Segments namespaced under /diaaz/** purely to keep them same-origin (no
// local file of ours actually lives at "/diaaz/<segment>/..." on Diaaz's own
// server either — this prefix only exists on OUR side, unwound away here).
const SAME_ORIGIN_SEGMENTS = ['_next', 'models', 'images', 'videos', 'icons']

export async function GET({ params, url }) {
	const path = params.path || ''
	const firstSegment = path.split('/', 1)[0]

	let upstreamPath
	if (path === '') {
		// Bare /diaaz — the outer sidebar document itself.
		upstreamPath = '/'
	} else if (SAME_ORIGIN_SEGMENTS.includes(firstSegment)) {
		// /diaaz/_next/**, /diaaz/models/** etc -> real upstream /_next/**,
		// /models/** etc (our own rewrite namespace unwound back to where
		// Diaaz actually serves it).
		upstreamPath = '/' + path
	} else {
		// Everything else Diaaz itself keeps under /diaaz/ (in practice just
		// legs.js) maps straight across.
		upstreamPath = '/diaaz/' + path
	}

	return proxyDiaaz(upstreamPath + url.search)
}
