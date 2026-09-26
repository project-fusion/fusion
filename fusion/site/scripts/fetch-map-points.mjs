/**
 * Fetches the places the Maps page draws as points, once, and writes them as data.
 *
 * **Every café, bar and restaurant OpenStreetMap has in Austin**, a few
 * thousand, which is the case the points layer is for: too many to be
 * elements, and drawn by the renderer from one GeoJSON file. Asked of the
 * Overpass API, which is volunteer-run and asks for light use, so it is run by
 * hand and committed rather than called at build or on a page:
 *
 * ```
 * bun scripts/fetch-map-points.mjs
 * ```
 *
 * A place drawn as an area in OpenStreetMap stands on its middle. Names only,
 * and coordinates to five places, about a meter, which is what a point on a
 * city map can show. The data is OpenStreetMap's, © its contributors, under
 * the ODbL, the same credit the tiles under it carry.
 */
import { writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { formatted } from '@fusion.dev/scripts/formatted'

const HERE = dirname(fileURLToPath(import.meta.url))
const COUNT = join(HERE, '..', 'content', 'maps', 'points.ts')
const OUT = join(
  dirname(fileURLToPath(import.meta.url)),
  '..',
  'public',
  'maps',
  'austin-food-and-drink.geojson',
)

/** Greater Austin, south, west, north, east. */
const BOUNDS = [30.08, -98.02, 30.56, -97.5]

const KINDS = 'restaurant|cafe|bar|pub|fast_food|ice_cream|food_court|biergarten'

const query = `[out:json][timeout:90];nwr["amenity"~"^(${KINDS})$"]["name"](${BOUNDS.join(',')});out center tags;`

const response = await fetch('https://overpass-api.de/api/interpreter', {
  body: new URLSearchParams({ data: query }),
  headers: { 'User-Agent': 'fusion.dev site build (https://fusion.dev)' },
  method: 'POST',
})
if (!response.ok) {
  throw new Error(`overpass: ${response.status}`)
}
const { elements } = await response.json()
const round = (value) => Number(value.toFixed(5))
const features = elements
  .map((element) => ({
    geometry: {
      coordinates: [
        round(element.lon ?? element.center.lon),
        round(element.lat ?? element.center.lat),
      ],
      type: 'Point',
    },
    properties: { name: element.tags.name },
    type: 'Feature',
  }))
  /* In a stable order, so a fetch that found the same places writes the same file. */
  .sort((a, b) => a.properties.name.localeCompare(b.properties.name, 'en'))
await writeFile(OUT, `${JSON.stringify({ features, type: 'FeatureCollection' })}\n`)
await writeFile(
  COUNT,
  formatted(
    `/**
 * How many places the Maps page's points layer draws, written by
 * \`scripts/fetch-map-points.mjs\` with the file it counts, so the page's words
 * and its data cannot disagree.
 */
export const AUSTIN_PLACES = ${features.length}
`,
    'points.ts',
  ),
)
console.log(`map points: ${features.length} places`)
