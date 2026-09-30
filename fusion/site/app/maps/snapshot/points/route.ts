import { POINTS_VIEW } from '@/content/maps/points'
import { snapshotOf } from '@/utils/map-snapshot/map-snapshot'

/**
 * The points map's snapshot on the Maps page, at a URL of its own: the
 * markup `mapSnapshot` draws, a picture of the streets in a wrapper.
 *
 * **Asked for when a reader nears the map, and not in the page.** The map is
 * far down the page, and its snapshot is about 100 KB of markup, which a prop
 * sent it twice: once as markup, and once more in the data React hydrates
 * from, to every reader whether they reached the map or not.
 *
 * **Cached for a day where it was drawn whole**, the day `snapshotOf` keeps
 * it for. A snapshot that could not be drawn is answered at once and
 * remembered by nobody, so the next reader asks again.
 */
export async function GET() {
  const markup = await snapshotOf(POINTS_VIEW)
  if (markup === '') {
    return new Response(null, { headers: { 'cache-control': 'no-store' }, status: 504 })
  }
  return new Response(markup, {
    headers: {
      'cache-control': 'public, max-age=3600, s-maxage=86400',
      'content-type': 'text/html; charset=utf-8',
    },
  })
}
