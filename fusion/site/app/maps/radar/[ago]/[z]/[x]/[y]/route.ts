import sharp from 'sharp'
import { cleanRadar } from '@/utils/radar/radar'

/**
 * Weather radar tiles for the Map examples, cleaned and doubled for sharp
 * screens.
 *
 * `ago` is how many minutes old the radar is, from 0 to 50 in steps of 5, which
 * are the frames the Iowa Environmental Mesonet keeps. `y` ends in `.png`, so
 * the URL reads as a tile URL: `/maps/radar/0/{z}/{x}/{y}.png`.
 *
 * **Cached for five minutes**, which is how often the composite updates, both
 * here and upstream, and never past that: a frame is named by its age, so a
 * tile served stale while the next was fetched put storms minutes apart side
 * by side in one frame. Any origin can read the tiles, because the example
 * preview runs in a sandboxed frame whose requests arrive as `Origin: null`.
 *
 * **One URL for one tile, and no deeper than the radar is sharp.** A number
 * with a leading zero is refused, so `05` and `5` are not two entries in every
 * cache, and zoom stops at `DEEPEST`, past which MapLibre enlarges the last
 * tiles. A failure is not cached, and the source is given `PATIENCE`.
 */
const SOURCE = 'https://mesonet.agron.iastate.edu/cache/tile.py/1.0.0/nexrad-n0q-900913'

const FRESH = 300

/** The deepest zoom served: the composite is about a kilometer a pixel, which zoom 8 already shows. */
const DEEPEST = 10

/** How long the source may take to answer, in milliseconds. */
const PATIENCE = 5000

/** The side of a tile the source sends, in pixels, and the only size cleaned. */
const TILE = 256

const HEADERS = {
  'access-control-allow-origin': '*',
  'cache-control': `public, max-age=${FRESH}, s-maxage=${FRESH}`,
}

/** A failure, answered at once and remembered by nobody. */
const FAILED = { 'access-control-allow-origin': '*', 'cache-control': 'no-store' }

const whole = (value: string): number | undefined =>
  /^(0|[1-9]\d{0,6})$/.test(value) ? Number(value) : undefined

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ ago: string; x: string; y: string; z: string }> },
) {
  const { ago, x, y, z } = await params
  const minutes = whole(ago)
  const zoom = whole(z)
  const column = whole(x)
  const row = whole(y.replace(/\.png$/, ''))
  if (
    minutes === undefined ||
    minutes > 50 ||
    minutes % 5 !== 0 ||
    zoom === undefined ||
    zoom > DEEPEST ||
    column === undefined ||
    row === undefined ||
    column >= 2 ** zoom ||
    row >= 2 ** zoom
  ) {
    return new Response('Not a radar tile', { status: 404 })
  }

  const frame = minutes === 0 ? '' : `-m${String(minutes).padStart(2, '0')}m`
  const upstream = await fetch(`${SOURCE}${frame}/${zoom}/${column}/${row}.png`, {
    next: { revalidate: FRESH },
    signal: AbortSignal.timeout(PATIENCE),
  }).catch(() => undefined)
  if (!upstream?.ok) {
    return new Response(null, {
      headers: FAILED,
      status: upstream?.status === 404 ? 404 : upstream ? 502 : 504,
    })
  }

  const { data, info } = await sharp(Buffer.from(await upstream.arrayBuffer()))
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true })
  if (info.width !== TILE || info.height !== TILE) {
    return new Response(null, { headers: FAILED, status: 502 })
  }
  const size = info.width * 2
  const png = await sharp(Buffer.from(cleanRadar(new Uint8Array(data), info.width)), {
    raw: { channels: 4, height: size, width: size },
  })
    .png()
    .toBuffer()
  return new Response(new Uint8Array(png), { headers: { ...HEADERS, 'content-type': 'image/png' } })
}
