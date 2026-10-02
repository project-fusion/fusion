/**
 * Writes the 3D models the Graph examples draw their notes on, once, as
 * binary glTF files, and they are committed:
 *
 * ```
 * bun scripts/build-models.mjs
 * ```
 *
 * **Made here from three.js's own geometry**, so every vertex is this
 * repository's and no model's license travels with an example a reader
 * copies. A torus knot, three times round, which reads as a knot from any
 * side a reader turns it to, in as few triangles as a field 96 cells across
 * can tell apart from more.
 *
 * Written by hand, not by three.js's exporter, which needs a browser's
 * `FileReader`: a `.glb` is a twelve-byte header, a JSON chunk saying where
 * the mesh is, and a binary chunk holding it.
 */
import { mkdir, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { TorusKnotGeometry } from 'three'

const OUT = join(dirname(fileURLToPath(import.meta.url)), '..', 'public', 'media', 'models')

/** A chunk's length padded to four bytes, as glTF asks. */
const padded = (length) => Math.ceil(length / 4) * 4

/** A binary glTF file holding one mesh: its corners, and its triangles by corner. */
const glb = (positions, indices) => {
  const low = [Infinity, Infinity, Infinity]
  const high = [-Infinity, -Infinity, -Infinity]
  for (let at = 0; at < positions.length; at += 3) {
    for (let axis = 0; axis < 3; axis++) {
      low[axis] = Math.min(low[axis], positions[at + axis])
      high[axis] = Math.max(high[axis], positions[at + axis])
    }
  }
  const binary = new Uint8Array(padded(positions.byteLength + indices.byteLength))
  binary.set(new Uint8Array(positions.buffer, positions.byteOffset, positions.byteLength), 0)
  binary.set(
    new Uint8Array(indices.buffer, indices.byteOffset, indices.byteLength),
    positions.byteLength,
  )
  const json = JSON.stringify({
    accessors: [
      {
        bufferView: 0,
        componentType: 5126,
        count: positions.length / 3,
        max: high,
        min: low,
        type: 'VEC3',
      },
      { bufferView: 1, componentType: 5125, count: indices.length, type: 'SCALAR' },
    ],
    asset: { generator: 'fusion/site/scripts/build-models.mjs', version: '2.0' },
    buffers: [{ byteLength: binary.byteLength }],
    bufferViews: [
      { buffer: 0, byteLength: positions.byteLength, byteOffset: 0, target: 34962 },
      {
        buffer: 0,
        byteLength: indices.byteLength,
        byteOffset: positions.byteLength,
        target: 34963,
      },
    ],
    meshes: [{ primitives: [{ attributes: { POSITION: 0 }, indices: 1 }] }],
    nodes: [{ mesh: 0 }],
    scene: 0,
    scenes: [{ nodes: [0] }],
  })
  const text = new TextEncoder().encode(json)
  const jsonLength = padded(text.length)
  const total = 12 + 8 + jsonLength + 8 + binary.byteLength
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
  return out
}

const knot = new TorusKnotGeometry(1, 0.32, 128, 16, 2, 3)
const positions = new Float32Array(knot.getAttribute('position').array)
const indices = new Uint32Array(knot.getIndex().array)

await mkdir(OUT, { recursive: true })
const file = glb(positions, indices)
await writeFile(join(OUT, 'torus-knot.glb'), file)
console.log(
  `models: torus-knot.glb, ${indices.length / 3} triangles, ${Math.round(file.length / 1024)} KB`,
)
