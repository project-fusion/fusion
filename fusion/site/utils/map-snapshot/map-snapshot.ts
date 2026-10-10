import { type MapSnapshot, type MapView, mapSnapshot } from '@fusion.dev/helix-map/snapshot'
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

/**
 * A snapshot whose picture could not be drawn, holding the credit
 * `mapSnapshot` still read from the tiles' TileJSON.
 */
class Unpictured extends Error {
  constructor(readonly snapshot: MapSnapshot) {
    super('The map snapshot could not be drawn.')
  }
}

/* **Only a whole snapshot is kept.** `mapSnapshot` answers an empty picture
   when any tile failed or ran out of time, and kept, that was a Maps page
   with no first paint for a day after one bad minute of the tile server,
   which every deploy is the first to ask. Thrown here, so the cache stores
   nothing, and caught by `snapshotOf`, which still writes its credit. */
const cached = unstable_cache(
  async (view: MapView): Promise<MapSnapshot> => {
    const snapshot = await mapSnapshot(view, { timeout: PATIENCE })
    if (snapshot.picture === '') {
      throw new Unpictured(snapshot)
    }
    return snapshot
  },
  ['map-snapshot', DRAWN_BY],
  { revalidate: 86_400 },
)

/**
 * A map snapshot for a page's first paint, drawn once a day per view.
 *
 * **Cached whole**, the SVG with its credit: a view is the same picture for
 * every reader, since its colors are the page's tokens and not written into
 * it, so the page that holds it can render per request, as the
 * Maps page does for a theme sent from the builder, and still draw it once.
 * **Drawn every time in development**, where the code that draws it changes
 * between one request and the next. **Never throws**: a snapshot that cannot
 * be drawn holds an empty picture, and the page draws the live map alone.
 *
 * **Its credit kept when its picture was not.** The Maps page once rendered
 * with no credit at all, because one tile ran out of time on the server and
 * the credit went with the picture: a reader saw the map uncredited until
 * MapLibre read its own, and the site's visual check, whose browser reaches
 * no other host, never saw a credit. Said in the server's log, since a page
 * with no first paint is otherwise silent about why.
 */
export const snapshotOf = async (view: MapView): Promise<MapSnapshot> => {
  if (process.env.NODE_ENV === 'development') {
    return mapSnapshot(view, { timeout: PATIENCE })
  }
  try {
    return await cached(view)
  } catch (error) {
    console.warn(`map snapshot: ${error instanceof Error ? error.message : String(error)}`)
    return error instanceof Unpictured ? error.snapshot : { credit: [], markup: '', picture: '' }
  }
}
