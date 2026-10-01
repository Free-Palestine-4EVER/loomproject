import { error } from '@sveltejs/kit'

const META_PREVIEW_CRAWLERS = /facebookexternalhit|facebot|meta-externalfetcher|meta-externalagent/i

export function load({ request, setHeaders }) {
  const userAgent = request.headers.get('user-agent') ?? ''

  if (META_PREVIEW_CRAWLERS.test(userAgent)) {
    // Do not let a cached crawler response keep an old card alive.
    setHeaders({ 'cache-control': 'private, no-store, max-age=0' })
    throw error(404, 'Not Found')
  }

  return {}
}
