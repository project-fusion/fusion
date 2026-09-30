import { type MapView, mapSnapshot } from '@fusion.dev/helix-map/snapshot'
import { unstable_cache } from 'next/cache'

/**
 * The deployment a snapshot was drawn by, which keys the cache: the data
 * cache outlives a deploy, and a snapshot drawn by the last one would be
 * served, drawn the old way, until the day ran out.
 */
const DRAWN_BY = process.env.VERCEL_DEPLOYMENT_ID ?? process.env.VERCEL_GIT_COMMIT_SHA ?? 'local'

/**
 * How long each request for a tile may take on the server, in milliseconds.
 * The page waits for its snapshots, so a slow tile server is a slow page.
 */
const PATIENCE = 2000

/* **Only a whole snapshot is kept.** `mapSnapshot` answers an empty string
   when any tile failed or ran out of time, and kept, that was a Maps page
   with no first paint for a day after one bad minute of the tile server,
   which every deploy is the first to ask. Thrown here, so the cache stores
   nothing, and caught by `snapshotOf`. */
const cached = unstable_cache(
  async (view: MapView): Promise<string> => {
    const svg = await mapSnapshot(view, { timeout: PATIENCE })
    if (svg === '') {
      throw new Error('The map snapshot could not be drawn.')
    }
    return svg
  },
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
 * between one request and the next. **Never throws**: a snapshot that cannot
 * be drawn is an empty string, and the page draws the live map alone.
 */
export const snapshotOf = async (view: MapView): Promise<string> => {
  if (process.env.NODE_ENV === 'development') {
    return mapSnapshot(view, { timeout: PATIENCE })
  }
  try {
    return await cached(view)
  } catch {
    return ''
  }
}
