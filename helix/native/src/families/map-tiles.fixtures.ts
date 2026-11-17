/*
 * Vector tiles written by hand for the Map specs, in the format's own
 * fields: one water layer whose one polygon covers the whole tile, and a
 * place layer of named points; and a server's answer as far as the still
 * picture reads it.
 */

const varint = (value: number): number[] => {
  const out: number[] = []
  let left = value
  while (left >= 0x80) {
    out.push((left % 0x80) | 0x80)
    left = Math.floor(left / 0x80)
  }
  out.push(left)
  return out
}
const zigzag = (value: number): number => (value < 0 ? -value * 2 - 1 : value * 2)
const delimited = (field: number, body: number[]): number[] => [
  ...varint(field * 8 + 2),
  ...varint(body.length),
  ...body,
]
const bytesOf = (words: string): number[] => [...Buffer.from(words, 'utf8')]
const SQUARE = [9, zigzag(0), zigzag(0), 26, zigzag(4096), 0, 0, zigzag(4096), zigzag(-4096), 0, 15]

/** A tile of water from edge to edge. */
export const WATER_TILE = new Uint8Array(
  delimited(3, [
    ...delimited(1, bytesOf('water')),
    ...delimited(2, [
      ...varint(3 * 8),
      3,
      ...delimited(
        4,
        SQUARE.flatMap((one) => varint(one)),
      ),
    ]),
    ...varint(5 * 8),
    ...varint(4096),
  ]),
)

/** A place a tile names: its words, its class, and where it is in the tile's 4096 units. */
export interface TilePlace {
  readonly kind: string
  readonly name: string
  readonly x: number
  readonly y: number
}

/** A tile whose place layer holds `places`, each a point with its class and name. */
export const placeTile = (places: readonly TilePlace[]): Uint8Array => {
  const kinds = [...new Set(places.map((one) => one.kind))]
  const names = [...new Set(places.map((one) => one.name))]
  const values = [...kinds, ...names]
  const feature = ({ kind, name, x, y }: TilePlace) =>
    delimited(2, [
      ...delimited(2, [0, values.indexOf(kind), 1, values.indexOf(name)]),
      ...varint(3 * 8),
      1,
      ...delimited(
        4,
        [9, zigzag(x), zigzag(y)].flatMap((one) => varint(one)),
      ),
    ])
  return new Uint8Array(
    delimited(3, [
      ...delimited(1, bytesOf('place')),
      ...places.flatMap(feature),
      ...delimited(3, bytesOf('class')),
      ...delimited(3, bytesOf('name')),
      ...values.flatMap((one) => delimited(4, delimited(1, bytesOf(one)))),
      ...varint(5 * 8),
      ...varint(4096),
    ]),
  )
}

/** A city at the middle of the tile, and a state beside it, which the still picture does not name. */
export const PLACE_TILE = placeTile([
  { kind: 'city', name: 'Austin', x: 2048, y: 2048 },
  { kind: 'state', name: 'Texas', x: 3600, y: 2048 },
])

/** What a server answers, as far as the still picture reads it. */
export const answerOf = (body: unknown) =>
  ({
    arrayBuffer: async () => (body as Uint8Array).slice().buffer,
    json: async () => body,
    ok: true,
    status: 200,
  }) as unknown as Response

/** Tiles from a TileJSON of one source, each tile answered by `tile`. */
export const tilesAnswering =
  (tile: Uint8Array) =>
  async (url: string): Promise<Response> =>
    answerOf(
      url.endsWith('/planet')
        ? { maxzoom: 14, tiles: ['https://tiles.test/{z}/{x}/{y}.pbf'] }
        : tile,
    )
