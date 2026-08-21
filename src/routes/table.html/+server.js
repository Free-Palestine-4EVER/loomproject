// Proxies the Diaaz 3D viewer itself. The outer /diaaz sidebar page embeds
// this via <iframe src="/table.html?bare=1"> — an absolute ROOT path (not
// nested under /diaaz), so it needs its own route at the site root, same as
// the query string (?bare=1) needs to survive the trip unmodified. See
// src/lib/server/diaazProxy.js for why this has to rewrite the response
// body rather than just proxy the bytes.
export const prerender = false

import { proxyDiaaz } from '$lib/server/diaazProxy'

export async function GET({ url }) {
	return proxyDiaaz('/table.html' + url.search)
}
