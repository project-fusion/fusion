/*
 * A vector tile read from its bytes, as far as a still map draws one: each
 * layer's features, their kind, their properties and their lines, in the
 * Mapbox Vector Tile format the OpenMapTiles schema is served in. Plain
 * JavaScript, so a phone reads a tile with no package of its own.
 */

/** A point on a tile, from 0 to the layer's extent. */
export interface TilePoint {
  readonly x: number
  readonly y: number
}

/** One feature of a tile's layer. */
export interface TileFeature {
  /** Its lines: one for each move the geometry starts, a ring closed on its start. */
  readonly lines: readonly (readonly TilePoint[])[]
  readonly properties: Readonly<Record<string, boolean | number | string>>
  /** 1 a point, 2 a line, 3 a polygon, as the format numbers them. */
  readonly type: number
}

/** One layer of a tile. */
export interface TileLayer {
  /** How many units a tile is across, 4096 where the layer does not say. */
  readonly extent: number
  readonly features: readonly TileFeature[]
}

/** A tile's layers by name. */
export type VectorTileLayers = Readonly<Record<string, TileLayer>>

/** A reader over protocol buffer bytes. */
class Reader {
  at = 0

  constructor(
    readonly bytes: Uint8Array,
    readonly end = bytes.length,
  ) {}

  /** A varint, exact up to 2^53. */
  varint(): number {
    let value = 0
    let scale = 1
    for (;;) {
      if (this.at >= this.end) {
        throw new Error('A vector tile ended inside a number.')
      }
      const byte = this.bytes[this.at++] as number
      value += (byte & 0x7f) * scale
      if (byte < 0x80) {
        return value
      }
      scale *= 128
    }
  }

  /** A zigzag varint, as a signed number. */
  signed(): number {
    const value = this.varint()
    return value % 2 === 1 ? -(value + 1) / 2 : value / 2
  }

  /** A length-delimited field's bounds, the reader moved past it. */
  span(): [number, number] {
    const length = this.varint()
    const from = this.at
    this.at += length
    if (this.at > this.end) {
      throw new Error('A vector tile ended inside a field.')
    }
    return [from, this.at]
  }

  /** Words, from a length-delimited field. */
  words(): string {
    const [from, to] = this.span()
    return decodeUtf8(this.bytes, from, to)
  }

  /** Steps over a field of a wire type. */
  skip(wire: number): void {
    if (wire === 0) {
      this.varint()
    } else if (wire === 1) {
      this.at += 8
    } else if (wire === 2) {
      this.span()
    } else if (wire === 5) {
      this.at += 4
    } else {
      throw new Error(`A vector tile has a field of wire type ${wire}, which it cannot hold.`)
    }
  }

  /** A packed list of varints, from a length-delimited field. */
  packed(): number[] {
    const [from, to] = this.span()
    const inner = new Reader(this.bytes, to)
    inner.at = from
    const out: number[] = []
    while (inner.at < to) {
      out.push(inner.varint())
    }
    return out
  }
}

/** UTF-8 bytes as a string, by hand: Hermes has no `TextDecoder` everywhere it runs. */
const decodeUtf8 = (bytes: Uint8Array, from: number, to: number): string => {
  let out = ''
  let at = from
  while (at < to) {
    const byte = bytes[at++] as number
    let code = byte
    if (byte >= 0xf0) {
      code =
        ((byte & 0x07) << 18) |
        (((bytes[at++] as number) & 0x3f) << 12) |
        (((bytes[at++] as number) & 0x3f) << 6) |
        ((bytes[at++] as number) & 0x3f)
    } else if (byte >= 0xe0) {
      code =
        ((byte & 0x0f) << 12) |
        (((bytes[at++] as number) & 0x3f) << 6) |
        ((bytes[at++] as number) & 0x3f)
    } else if (byte >= 0xc0) {
      code = ((byte & 0x1f) << 6) | ((bytes[at++] as number) & 0x3f)
    }
    out += String.fromCodePoint(code)
  }
  return out
}

/** A value message's contents, read between its bounds. */
const valueIn = (bytes: Uint8Array, from: number, to: number): boolean | number | string => {
  const reader = new Reader(bytes, to)
  reader.at = from
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  let value: boolean | number | string = ''
  while (reader.at < to) {
    const tag = reader.varint()
    const field = Math.floor(tag / 8)
    const wire = tag % 8
    if (field === 1 && wire === 2) {
      value = reader.words()
    } else if (field === 2 && wire === 5) {
      value = view.getFloat32(reader.at, true)
      reader.at += 4
    } else if (field === 3 && wire === 1) {
      value = view.getFloat64(reader.at, true)
      reader.at += 8
    } else if ((field === 4 || field === 5) && wire === 0) {
      value = reader.varint()
    } else if (field === 6 && wire === 0) {
      value = reader.signed()
    } else if (field === 7 && wire === 0) {
      value = reader.varint() !== 0
    } else {
      reader.skip(wire)
    }
  }
  return value
}

/** A feature's geometry commands as lines, a ring closed on its start. */
const linesOf = (commands: readonly number[]): TilePoint[][] => {
  const lines: TilePoint[][] = []
  let line: TilePoint[] = []
  let x = 0
  let y = 0
  let at = 0
  const signed = (value: number) => (value % 2 === 1 ? -(value + 1) / 2 : value / 2)
  while (at < commands.length) {
    const command = commands[at++] as number
    const id = command & 7
    const count = command >> 3
    if (id === 7) {
      const first = line[0]
      if (first) {
        line.push(first)
      }
      continue
    }
    for (let step = 0; step < count && at + 1 < commands.length; step++) {
      x += signed(commands[at++] as number)
      y += signed(commands[at++] as number)
      if (id === 1) {
        if (line.length > 0) {
          lines.push(line)
        }
        line = []
      }
      line.push({ x, y })
    }
  }
  if (line.length > 0) {
    lines.push(line)
  }
  return lines
}

/** One feature, its tags read against its layer's keys and values. */
const featureIn = (
  bytes: Uint8Array,
  from: number,
  to: number,
  keys: readonly string[],
  values: readonly (boolean | number | string)[],
): TileFeature => {
  const reader = new Reader(bytes, to)
  reader.at = from
  let tags: number[] = []
  let type = 0
  let commands: number[] = []
  while (reader.at < to) {
    const tag = reader.varint()
    const field = Math.floor(tag / 8)
    const wire = tag % 8
    if (field === 2 && wire === 2) {
      tags = reader.packed()
    } else if (field === 3 && wire === 0) {
      type = reader.varint()
    } else if (field === 4 && wire === 2) {
      commands = reader.packed()
    } else {
      reader.skip(wire)
    }
  }
  const properties: Record<string, boolean | number | string> = {}
  for (let at = 0; at + 1 < tags.length; at += 2) {
    const key = keys[tags[at] as number]
    const value = values[tags[at + 1] as number]
    if (key !== undefined && value !== undefined) {
      properties[key] = value
    }
  }
  return { lines: linesOf(commands), properties, type }
}

/** One layer, its features read only where `wanted` names it. */
const layerIn = (
  bytes: Uint8Array,
  from: number,
  to: number,
  wanted: ReadonlySet<string> | undefined,
): [string, TileLayer] | undefined => {
  const reader = new Reader(bytes, to)
  reader.at = from
  let name = ''
  let extent = 4096
  const keys: string[] = []
  const values: (boolean | number | string)[] = []
  const features: [number, number][] = []
  while (reader.at < to) {
    const tag = reader.varint()
    const field = Math.floor(tag / 8)
    const wire = tag % 8
    if (field === 1 && wire === 2) {
      name = reader.words()
      if (wanted && !wanted.has(name)) {
        return undefined
      }
    } else if (field === 2 && wire === 2) {
      features.push(reader.span())
    } else if (field === 3 && wire === 2) {
      keys.push(reader.words())
    } else if (field === 4 && wire === 2) {
      const [start, end] = reader.span()
      values.push(valueIn(bytes, start, end))
    } else if (field === 5 && wire === 0) {
      extent = reader.varint()
    } else {
      reader.skip(wire)
    }
  }
  if (wanted && !wanted.has(name)) {
    return undefined
  }
  return [
    name,
    {
      extent,
      features: features.map(([start, end]) => featureIn(bytes, start, end, keys, values)),
    },
  ]
}

/**
 * A vector tile's layers, read from its bytes: **only those `wanted` names**,
 * where it names any, since a street tile's labels and landmarks are much of
 * its weight. Throws where the bytes are not a tile, such as a rate limit's
 * page served as a 200.
 */
export const vectorTile = (bytes: Uint8Array, wanted?: Iterable<string>): VectorTileLayers => {
  const names = wanted === undefined ? undefined : new Set(wanted)
  const reader = new Reader(bytes)
  const layers: Record<string, TileLayer> = {}
  while (reader.at < bytes.length) {
    const tag = reader.varint()
    const field = Math.floor(tag / 8)
    const wire = tag % 8
    if (field === 3 && wire === 2) {
      const [from, to] = reader.span()
      const layer = layerIn(bytes, from, to, names)
      if (layer) {
        layers[layer[0]] = layer[1]
      }
    } else {
      reader.skip(wire)
    }
  }
  return layers
}
