/**
 * Writes the 3D models the Graph examples draw their notes on, once, as
 * binary glTF files, and they are committed:
 *
 * ```
 * bun scripts/build-models.mjs
 * ```
 *
 * **Made here**, so every vertex is this repository's and no model's license
 * travels with an example a reader copies:
 *
 * - **A torus knot**, from three.js's own geometry, three times round, which
 *   reads as a knot from any side a reader turns it to, in as few triangles
 *   as a field 144 cells across can tell apart from more.
 * - **A brain**, from the distance field in `brain-model.mjs`, wrapped in
 *   triangles by the surface nets the Graph driver draws shapes with, fine
 *   enough to hold its folds, and written in its lobes, one named mesh each,
 *   so a page can send a group of notes to `occipital`.
 *
 * Written by hand, not by three.js's exporter, which needs a browser's
 * `FileReader`: a `.glb` is a twelve-byte header, a JSON chunk saying where
 * the mesh is, and a binary chunk holding it.
 */
import { mkdir, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { surfaceOf } from '@fusion.dev/helix-graph/shapes'
import { TorusKnotGeometry } from 'three'
import { BOX, brain, LOBES, lobeOf } from './brain-model.mjs'

const OUT = join(dirname(fileURLToPath(import.meta.url)), '..', 'public', 'media', 'models')

/** A chunk's length padded to four bytes, as glTF asks. */
const padded = (length) => Math.ceil(length / 4) * 4

/**
 * A binary glTF file holding meshes, each named, each one node: its corners,
 * and its triangles by corner, in sixteen bits a corner where there are few
 * enough corners. A page reading the file sees each mesh as a named part.
 */
const glb = (meshes) => {
  const views = []
  const accessors = []
  const chunks = []
  let offset = 0
  const add = (array, target) => {
    const bytes = new Uint8Array(array.buffer, array.byteOffset, array.byteLength)
    views.push({ buffer: 0, byteLength: bytes.byteLength, byteOffset: offset, target })
    chunks.push([offset, bytes])
    offset = padded(offset + bytes.byteLength)
    return views.length - 1
  }
  const parts = meshes.map(({ name, positions, triangles }) => {
    const indices =
      positions.length / 3 < 65536 ? Uint16Array.from(triangles) : Uint32Array.from(triangles)
    const low = [Infinity, Infinity, Infinity]
    const high = [-Infinity, -Infinity, -Infinity]
    for (let at = 0; at < positions.length; at += 3) {
      for (let axis = 0; axis < 3; axis++) {
        low[axis] = Math.min(low[axis], positions[at + axis])
        high[axis] = Math.max(high[axis], positions[at + axis])
      }
    }
    accessors.push({
      bufferView: add(positions, 34962),
      componentType: 5126,
      count: positions.length / 3,
      max: high,
      min: low,
      type: 'VEC3',
    })
    accessors.push({
      bufferView: add(indices, 34963),
      componentType: indices instanceof Uint16Array ? 5123 : 5125,
      count: indices.length,
      type: 'SCALAR',
    })
    return { indices: accessors.length - 1, name, position: accessors.length - 2 }
  })
  const binary = new Uint8Array(padded(offset))
  for (const [at, bytes] of chunks) {
    binary.set(bytes, at)
  }
  const json = JSON.stringify({
    accessors,
    asset: { generator: 'fusion/site/scripts/build-models.mjs', version: '2.0' },
    buffers: [{ byteLength: binary.byteLength }],
    bufferViews: views,
    meshes: parts.map(({ indices, name, position }) => ({
      name,
      primitives: [{ attributes: { POSITION: position }, indices }],
    })),
    nodes: parts.map(({ name }, at) => ({ mesh: at, name })),
    scene: 0,
    scenes: [{ nodes: parts.map((_, at) => at) }],
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

/**
 * A surface split into named parts by the part each triangle's middle is in:
 * each part its own corners and triangles.
 */
const split = (corners, triangles, partOf, names) =>
  names.flatMap((name) => {
    const index = new Map()
    const own = []
    const tris = []
    for (let at = 0; at < triangles.length; at += 3) {
      const [a, b, c] = [triangles[at], triangles[at + 1], triangles[at + 2]]
      const middle = [0, 1, 2].map(
        (axis) => (corners[a * 3 + axis] + corners[b * 3 + axis] + corners[c * 3 + axis]) / 3,
      )
      if (partOf(...middle) !== name) {
        continue
      }
      for (const corner of [a, b, c]) {
        if (!index.has(corner)) {
          index.set(corner, own.length / 3)
          own.push(corners[corner * 3], corners[corner * 3 + 1], corners[corner * 3 + 2])
        }
        tris.push(index.get(corner))
      }
    }
    return tris.length > 0 ? [{ name, positions: new Float32Array(own), triangles: tris }] : []
  })

const knot = new TorusKnotGeometry(1, 0.32, 128, 16, 2, 3)
const positions = new Float32Array(knot.getAttribute('position').array)
const indices = new Uint32Array(knot.getIndex().array)

/** How many cells the brain's surface is read in along its longest side. */
const BRAIN_CELLS = 100

const started = performance.now()
const wrapped = surfaceOf(
  {
    depth: BOX.across * 2,
    distance: (x, y, z) => brain(x + BOX.left, y + BOX.top, z - BOX.across),
    height: BOX.height,
    width: BOX.width,
  },
  { cells: BRAIN_CELLS },
)
/* From the field's box, y down, to the model's, y up and the middle at the origin. */
const brainCorners = new Float32Array(wrapped.corners.length)
for (let at = 0; at < wrapped.corners.length; at += 3) {
  brainCorners[at] = wrapped.corners[at] + BOX.left - 110
  brainCorners[at + 1] = 85 - (wrapped.corners[at + 1] + BOX.top)
  brainCorners[at + 2] = wrapped.corners[at + 2] - BOX.across
}

await mkdir(OUT, { recursive: true })
/* The brain in its lobes, each a named mesh, read in the field's box where `lobeOf` is measured. */
const lobes = split(brainCorners, wrapped.triangles, (x, y, z) => lobeOf(x + 110, 85 - y, z), LOBES)
for (const [name, file, triangles] of [
  ['torus-knot.glb', glb([{ name: 'knot', positions, triangles: indices }]), indices.length / 3],
  ['brain.glb', glb(lobes), wrapped.triangles.length / 3],
]) {
  await writeFile(join(OUT, name), file)
  console.log(`models: ${name}, ${triangles} triangles, ${Math.round(file.length / 1024)} KB`)
}
console.log(`models: the brain took ${Math.round(performance.now() - started)} ms`)
