/**
 * Fetches the paths the site's demo routes follow, once, and writes them as data.
 *
 * **A route draws the path it is given**, and a path along roads is a routing
 * engine's to find, not a map's: `helix-map-route` connected the demos' stops
 * with straight lines because stops were all it was given. So the paths are
 * asked of routers built on OpenStreetMap's own data, the walk of the FOSSGIS
 * foot router openstreetmap.org itself offers and the drives of the OSRM demo
 * server, and simplified to what reads at the zoom they are shown at.
 *
 * **Fetched here and committed, never at build or on a page.** Both are
 * volunteer services asking for light use, a build that called them would
 * fail whenever they were down, and the paths do not change unless the stops
 * do. Run it by hand when they do:
 *
 * ```
 * bun scripts/fetch-map-routes.mjs
 * ```
 *
 * The data is OpenStreetMap's, © its contributors, under the ODbL, the same
 * credit the tiles under it already carry.
 */
import { writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { formatted } from '@fusion.dev/scripts/formatted'

const OUT = join(dirname(fileURLToPath(import.meta.url)), '..', 'content', 'maps', 'routes.ts')
const AGENT = { 'User-Agent': 'fusion.dev site build (https://fusion.dev)' }

/** The Maps page's walk, in the order the arrow keys walk it. */
const WALK = [
  ['UT Tower', 30.28607, -97.73935],
  ['Texas Capitol', 30.27469, -97.74051],
  ['Franklin Barbecue', 30.27014, -97.73128],
  ['Rainey Street', 30.259, -97.73869],
  ['Congress Avenue Bridge', 30.26139, -97.74529],
  ['Terry Black’s Barbecue', 30.25976, -97.75487],
  ['Barton Springs Pool', 30.26384, -97.77014],
]

/** The builder's drives: from the mill to Weft's orders, and from the hub to the generic places. */
const MILL = [53.6467, -1.7822]
const HUB = [50.1106, 8.6821]
const DRIVES = {
  'generic:The first place': [HUB, [38.7078, -9.1366]],
  'generic:The fourth place': [HUB, [55.6867, 12.5701]],
  'generic:The second place': [HUB, [48.8535, 2.3484]],
  'generic:The third place': [HUB, [48.2084, 16.3725]],
  'storefront:Bristol': [MILL, [51.443, -2.5817]],
  'storefront:Edinburgh': [MILL, [55.9533, -3.1884]],
  'storefront:London': [MILL, [51.5074, -0.1278]],
  'storefront:Manchester': [MILL, [53.4425, -2.2325]],
}

/** OSRM takes longitude first; everything here is latitude first, as a marker is. */
const coordinates = (places) => places.map(([lat, lng]) => `${lng},${lat}`).join(';')

const route = async (base, places) => {
  const response = await fetch(
    `${base}/${coordinates(places)}?overview=full&geometries=geojson&steps=false`,
    { headers: AGENT },
  )
  if (!response.ok) {
    throw new Error(`${base}: ${response.status}`)
  }
  const body = await response.json()
  if (body.code !== 'Ok') {
    throw new Error(`${base}: ${body.code}`)
  }
  return {
    path: body.routes[0].geometry.coordinates.map(([lng, lat]) => [lat, lng]),
    stops: body.waypoints.map(({ location: [lng, lat] }) => [lat, lng]),
  }
}

/** Douglas–Peucker, in degrees: what is closer to the line than `tolerance` goes. */
const simplify = (points, tolerance) => {
  if (points.length < 3) {
    return points
  }
  const [first, last] = [points[0], points[points.length - 1]]
  const off = (point) => {
    const [y, x] = point
    const [y1, x1] = first
    const [y2, x2] = last
    const length = Math.hypot(x2 - x1, y2 - y1) || 1
    return Math.abs((y2 - y1) * x - (x2 - x1) * y + x2 * y1 - y2 * x1) / length
  }
  let furthest = 0
  let at = 0
  for (let index = 1; index < points.length - 1; index++) {
    const distance = off(points[index])
    if (distance > furthest) {
      furthest = distance
      at = index
    }
  }
  if (furthest <= tolerance) {
    return [first, last]
  }
  return [
    ...simplify(points.slice(0, at + 1), tolerance).slice(0, -1),
    ...simplify(points.slice(at), tolerance),
  ]
}

const round = (points) =>
  points.map(([lat, lng]) => [Number(lat.toFixed(5)), Number(lng.toFixed(5))])

/** Where each stop falls along the path, so a walker knows which leg it is on. */
const stopsAlong = (path, stops) =>
  stops.map(([lat, lng]) =>
    path.reduce(
      (best, point, index) =>
        Math.hypot(point[0] - lat, point[1] - lng) <
        Math.hypot(path[best][0] - lat, path[best][1] - lng)
          ? index
          : best,
      0,
    ),
  )

const walked = await route(
  'https://routing.openstreetmap.de/routed-foot/route/v1/driving',
  WALK.map(([, lat, lng]) => [lat, lng]),
)
const walk = round(simplify(walked.path, 0.00004))
const drives = {}
for (const [key, places] of Object.entries(DRIVES)) {
  /* One at a time and with a pause, which is what a volunteer server asks. */
  drives[key] = round(
    simplify((await route('https://router.project-osrm.org/route/v1/driving', places)).path, 0.01),
  )
  await new Promise((done) => setTimeout(done, 1100))
}

const file = `/**
 * The paths the site's demo routes follow, fetched by \`scripts/fetch-map-routes.mjs\`
 * from routers built on OpenStreetMap data, © OpenStreetMap contributors, ODbL.
 * Committed rather than fetched at build: see that script. Latitude first, as a
 * marker's \`lat\` and \`lng\` read.
 */

/** A path, as \`lat,lng\` pairs in order. */
export type Path = readonly (readonly [number, number])[]

/**
 * The Maps page's walk through its seven places, on foot, and where along it
 * each place falls, which is how a walker knows which leg it is on.
 */
export const WALK: { path: Path; stops: readonly number[] } = ${JSON.stringify({
  path: walk,
  stops: stopsAlong(walk, walked.stops),
})}

/** The theme builder's drives, by context and destination. */
export const DRIVES: Record<string, Path> = ${JSON.stringify(drives)}
`
await writeFile(OUT, formatted(file, 'routes.ts'))
console.log(
  `map routes: a walk of ${walk.length} points, and ${Object.keys(drives).length} drives of ${Object.values(
    drives,
  )
    .map((one) => one.length)
    .join(', ')} points`,
)
