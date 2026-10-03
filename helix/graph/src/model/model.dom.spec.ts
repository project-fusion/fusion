import { beforeAll, describe, expect, test } from 'bun:test'
import { registerDom } from '@fusion.dev/helix-testing/dom'

let shapeFromModel: typeof import('./model.js').shapeFromModel

beforeAll(async () => {
  registerDom()
  ;({ shapeFromModel } = await import('./model.js'))
})

/**
 * A binary glTF file of cubes from 0 to 10 on each axis, one mesh each,
 * each moved along x by its node, which is named where a name is given.
 */
const cubeGlb = (by: number, ...more: { by: number; name: string }[]): ArrayBuffer => {
  const corners = new Float32Array([
    0, 0, 0, 10, 0, 0, 10, 10, 0, 0, 10, 0, 0, 0, 10, 10, 0, 10, 10, 10, 10, 0, 10, 10,
  ])
  const faces = new Uint32Array([
    0, 2, 1, 0, 3, 2, 4, 5, 6, 4, 6, 7, 0, 4, 7, 0, 7, 3, 1, 2, 6, 1, 6, 5, 0, 1, 5, 0, 5, 4, 3, 7,
    6, 3, 6, 2,
  ])
  const binary = new Uint8Array(corners.byteLength + faces.byteLength)
  binary.set(new Uint8Array(corners.buffer), 0)
  binary.set(new Uint8Array(faces.buffer), corners.byteLength)
  const text = new TextEncoder().encode(
    JSON.stringify({
      accessors: [
        {
          bufferView: 0,
          componentType: 5126,
          count: 8,
          max: [10, 10, 10],
          min: [0, 0, 0],
          type: 'VEC3',
        },
        { bufferView: 1, componentType: 5125, count: faces.length, type: 'SCALAR' },
      ],
      asset: { version: '2.0' },
      buffers: [{ byteLength: binary.byteLength }],
      bufferViews: [
        { buffer: 0, byteLength: corners.byteLength, byteOffset: 0 },
        { buffer: 0, byteLength: faces.byteLength, byteOffset: corners.byteLength },
      ],
      meshes: [{ primitives: [{ attributes: { POSITION: 0 }, indices: 1 }] }],
      nodes: [
        { mesh: 0, translation: [by, 0, 0], ...(more.length ? { name: 'first' } : {}) },
        ...more.map((one) => ({ mesh: 0, name: one.name, translation: [one.by, 0, 0] })),
      ],
      scene: 0,
      scenes: [{ nodes: [0, ...more.map((_, at) => at + 1)] }],
    }),
  )
  const jsonLength = Math.ceil(text.length / 4) * 4
  const total = 28 + jsonLength + binary.byteLength
  const out = new Uint8Array(total)
  const view = new DataView(out.buffer)
  view.setUint32(0, 0x46546c67, true)
  view.setUint32(4, 2, true)
  view.setUint32(8, total, true)
  view.setUint32(12, jsonLength, true)
  view.setUint32(16, 0x4e4f534a, true)
  out.fill(0x20, 20, 20 + jsonLength)
  out.set(text, 20)
  view.setUint32(20 + jsonLength, binary.byteLength, true)
  view.setUint32(24 + jsonLength, 0x004e4942, true)
  out.set(binary, 28 + jsonLength)
  return out.buffer
}

describe('shapeFromModel', () => {
  test('reads a binary glTF file into a solid, its meshes where the model puts them', async () => {
    const field = await shapeFromModel(cubeGlb(30), { resolution: 40 })
    /* A cube's box, wherever the model moved it: the field's box is the mesh's own. */
    expect(field.width).toBeGreaterThan(10)
    expect(field.width).toBeLessThan(12)
    expect(field.depth).toBeGreaterThan(10)
    expect(field.distance(field.width / 2, field.height / 2, field.depth / 2)).toBeCloseTo(-5, 0)
    expect(field.distance(0.1, field.height / 2, field.depth / 2)).toBeGreaterThan(0)
  })

  test('names a part for each mesh, where there are two or more', async () => {
    const field = await shapeFromModel(cubeGlb(0, { by: 20, name: 'second' }), { resolution: 40 })
    expect(field.regionOf?.(field.width * 0.2, field.height / 2, field.depth / 2)).toBe('first')
    expect(field.regionOf?.(field.width * 0.8, field.height / 2, field.depth / 2)).toBe('second')
    expect((await shapeFromModel(cubeGlb(0), { resolution: 40 })).regionOf).toBeUndefined()
  })
})

describe('shapeFromModel’s errors', () => {
  test('names the model it could not read, the loader’s error as the cause', async () => {
    const error = await shapeFromModel(new ArrayBuffer(8)).catch((caught: unknown) => caught)
    expect(error).toBeInstanceOf(Error)
    expect((error as Error).message).toContain('The model given as bytes could not be read')
    expect((error as Error).cause).toBeDefined()
  })
})
