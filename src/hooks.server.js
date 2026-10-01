const META_PREVIEW_CRAWLERS = /facebookexternalhit|facebot|meta-externalfetcher|meta-externalagent/i

export async function handle({ event, resolve }) {
  const path = event.url.pathname.replace(/\/$/, '')
  const userAgent = event.request.headers.get('user-agent') ?? ''

  if (path === '/za-neru' && META_PREVIEW_CRAWLERS.test(userAgent)) {
    // Return no page markup or favicon for Meta's link-preview fetch. A normal
    // visitor still receives the full Za Neru page below.
    return new Response(null, {
      status: 404,
      headers: { 'cache-control': 'private, no-store, max-age=0' },
    })
  }

  return resolve(event)
}
