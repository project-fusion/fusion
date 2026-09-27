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
 * here and upstream. Any origin can read the tiles, because the example
 * preview runs in a sandboxed frame whose requests arrive as `Origin: null`.
 */
const SOURCE = 'https://mesonet.agron.iastate.edu/cache/tile.py/1.0.0/nexrad-n0q-900913'

const FRESH = 300

const HEADERS = {
  'access-control-allow-origin': '*',
  'cache-control': `public, max-age=${FRESH}, s-maxage=${FRESH}, stale-while-revalidate=${FRESH}`,
}

const whole = (value: string): number | undefined =>
  /^\d{1,7}$/.test(value) ? Number(value) : undefined

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
    zoom > 18 ||
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
  })
  if (!upstream.ok) {
    return new Response(null, { headers: HEADERS, status: upstream.status === 404 ? 404 : 502 })
  }

  const { data, info } = await sharp(Buffer.from(await upstream.arrayBuffer()))
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true })
  const size = info.width * 2
  const png = await sharp(Buffer.from(cleanRadar(new Uint8Array(data), info.width)), {
    raw: { channels: 4, height: size, width: size },
  })
    .png()
    .toBuffer()
  return new Response(new Uint8Array(png), { headers: { ...HEADERS, 'content-type': 'image/png' } })
}
