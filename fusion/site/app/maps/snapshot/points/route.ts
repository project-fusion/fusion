import { POINTS_VIEW } from '@/content/maps/points'
import { snapshotOf } from '@/utils/map-snapshot/map-snapshot'

/**
 * The points map's snapshot on the Maps page, at a URL of its own: what
 * `mapSnapshot` draws, as JSON. `picture` is a picture of the streets in a
 * wrapper, and `credit` is the tiles' credit, which the page writes in the
 * frame's credit strip. The two are sent apart because the page puts the
 * picture in an element of its own.
 *
 * **Asked for when a reader nears the map, and not in the page.** The map is
 * far down the page, and its snapshot is about 100 KB of markup, which a prop
 * sent it twice: once as markup, and once more in the data React hydrates
 * from, to every reader whether they reached the map or not.
 *
 * **Cached for a day where it was drawn whole**, the day `snapshotOf` keeps
 * it for. A snapshot that could not be drawn is answered at once as a 504
 * and remembered by nobody, so the next reader asks again. It still carries
 * the credit, which a tile that ran out of time does not cost.
 */
export async function GET() {
  const { credit, picture } = await snapshotOf(POINTS_VIEW)
  if (picture === '') {
    return Response.json(
      { credit, picture },
      { headers: { 'cache-control': 'no-store' }, status: 504 },
    )
  }
  return Response.json(
    { credit, picture },
    { headers: { 'cache-control': 'public, max-age=3600, s-maxage=86400' } },
  )
}
