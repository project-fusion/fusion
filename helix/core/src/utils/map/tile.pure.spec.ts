import { describe, expect, test } from 'bun:test'
import { vectorTile } from './tile.js'

/* A vector tile written by hand, field by field, as the format lays one out. */
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
const field = (number: number, wire: number): number[] => varint(number * 8 + wire)
const bytesOf = (words: string): number[] => [...new TextEncoder().encode(words)]
const delimited = (number: number, body: number[]): number[] => [
  ...field(number, 2),
  ...varint(body.length),
  ...body,
]
const packed = (number: number, values: number[]): number[] =>
  delimited(
    number,
    values.flatMap((one) => varint(one)),
  )
const command = (id: number, count: number): number => (count << 3) | id

/** A square ring from (10, 10) to (20, 20), and a line from (0, 0) to (5, -3). */
const SQUARE = [
  command(1, 1),
  zigzag(10),
  zigzag(10),
  command(2, 3),
  zigzag(10),
  zigzag(0),
  zigzag(0),
  zigzag(10),
  zigzag(-10),
  zigzag(0),
  command(7, 1),
]
const LINE = [command(1, 1), zigzag(0), zigzag(0), command(2, 1), zigzag(5), zigzag(-3)]

const water = [
  ...field(15, 0),
  ...varint(2),
  ...delimited(1, bytesOf('water')),
  ...delimited(2, [...packed(2, [0, 0]), ...field(3, 0), ...varint(3), ...packed(4, SQUARE)]),
  ...delimited(3, bytesOf('class')),
  ...delimited(4, delimited(1, bytesOf('lake'))),
  ...field(5, 0),
  ...varint(4096),
]
const roads = [
  ...delimited(1, bytesOf('transportation')),
  ...delimited(2, [...packed(2, [0, 0, 1, 1]), ...field(3, 0), ...varint(2), ...packed(4, LINE)]),
  ...delimited(3, bytesOf('class')),
  ...delimited(3, bytesOf('layer')),
  ...delimited(4, delimited(1, bytesOf('café road'))),
  ...delimited(4, [...field(6, 0), ...varint(zigzag(-1))]),
  ...field(5, 0),
  ...varint(512),
]
const TILE = new Uint8Array([...delimited(3, water), ...delimited(3, roads)])

describe('vectorTile', () => {
  test('reads each layer, its extent, its features, their kind, properties, and lines', () => {
    const layers = vectorTile(TILE)
    expect(Object.keys(layers)).toEqual(['water', 'transportation'])
    expect(layers.water?.extent).toBe(4096)
    expect(layers.water?.features[0]).toEqual({
      lines: [
        [
          { x: 10, y: 10 },
          { x: 20, y: 10 },
          { x: 20, y: 20 },
          { x: 10, y: 20 },
          { x: 10, y: 10 },
        ],
      ],
      properties: { class: 'lake' },
      type: 3,
    })
    expect(layers.transportation?.extent).toBe(512)
    expect(layers.transportation?.features[0]).toEqual({
      lines: [
        [
          { x: 0, y: 0 },
          { x: 5, y: -3 },
        ],
      ],
      properties: { class: 'café road', layer: -1 },
      type: 2,
    })
  })

  test('reads only the layers asked for', () => {
    expect(Object.keys(vectorTile(TILE, ['transportation']))).toEqual(['transportation'])
  })

  test('throws on bytes that are not a tile', () => {
    expect(() => vectorTile(new TextEncoder().encode('<html>Too many requests'))).toThrow()
  })
})
