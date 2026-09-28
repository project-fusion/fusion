import { type MapView, mapSnapshot } from '@fusion.dev/helix-map/snapshot'
import { unstable_cache } from 'next/cache'

/**
 * The deployment a snapshot was drawn by, which keys the cache: the data
 * cache outlives a deploy, and a snapshot drawn by the last one would be
 * served, drawn the old way, until the day ran out.
 */
const DRAWN_BY = process.env.VERCEL_DEPLOYMENT_ID ?? process.env.VERCEL_GIT_COMMIT_SHA ?? 'local'

const cached = unstable_cache(
  async (view: MapView): Promise<string> => mapSnapshot(view),
  ['map-snapshot', DRAWN_BY],
  { revalidate: 86_400 },
)

/**
 * A map snapshot for a page's first paint, drawn once a day per view.
 *
 * **Cached whole**, the SVG and not only its tiles: a view is the same
 * picture for every reader, since its colors are the page's tokens and not
 * written into it, so the page that holds it can render per request, as the
 * Maps page does for a theme sent from the builder, and still draw it once.
 * **Drawn every time in development**, where the code that draws it changes
 * between one request and the next.
 */
export const snapshotOf = (view: MapView): Promise<string> =>
  process.env.NODE_ENV === 'development' ? mapSnapshot(view) : cached(view)
