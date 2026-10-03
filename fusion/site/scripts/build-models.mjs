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
import { MeshoptEncoder } from 'meshoptimizer'
import { TorusKnotGeometry } from 'three'
import { BOX, brain, LOBES, lobeOf } from './brain-model.mjs'

await MeshoptEncoder.ready

const OUT = join(dirname(fileURLToPath(import.meta.url)), '..', 'public', 'media', 'models')

/** A chunk's length padded to four bytes, as glTF asks. */
const padded = (length) => Math.ceil(length / 4) * 4

/**
 * A binary glTF file holding meshes, each named, each one node, **compressed
 * the two ways three.js reads without a second loader**:
 *
 * - **Quantized**, as `KHR_mesh_quantization` allows: each corner in sixteen
 *   bits a coordinate across its own mesh's box, which the mesh's node scales
 *   and moves back into place. A step is a sixty-thousandth of the mesh's
 *   size, far finer than any field the model is read into, and half the
 *   bytes of a float.
 * - **Compressed by meshopt**, as `EXT_meshopt_compression` stores it, after
 *   the triangles and corners are reordered to compress well, which
 *   three.js's `GLTFLoader` decodes with the decoder three.js ships.
 *
 * Measured on October 3, 2026: the brain went from 948 KB to 280 KB, and
 * from 625 KB to 226 KB as a server compresses it on its way, with the same
 * triangles in the same places to a hundredth.
 */
const glb = (meshes) => {
  const views = []
  const accessors = []
  const chunks = []
  let offset = 0
  /* Where each view's uncompressed bytes would be, in the fallback buffer
     the file declares and never fills, which is what the extension asks. */
  let fallback = 0
  const add = (raw, count, stride, mode, target) => {
    const compressed = MeshoptEncoder.encodeGltfBuffer(raw, count, stride, mode)
    views.push({
      buffer: 1,
      byteLength: raw.byteLength,
      byteOffset: fallback,
      ...(mode === 'ATTRIBUTES' ? { byteStride: stride } : {}),
      extensions: {
        EXT_meshopt_compression: {
          buffer: 0,
          byteLength: compressed.byteLength,
          byteOffset: offset,
          byteStride: stride,
          count,
          mode,
        },
      },
      target,
    })
    chunks.push([offset, compressed])
    offset = padded(offset + compressed.byteLength)
    fallback = padded(fallback + raw.byteLength)
    return views.length - 1
  }
  const parts = meshes.map(({ name, positions, triangles }) => {
    /* Reordered for the cache and for compression: the triangles first, then
       the corners in the order the triangles first reach them. */
    const order = Uint32Array.from(triangles)
    const [remap, unique] = MeshoptEncoder.reorderMesh(order, true, true)
    const corners = new Float32Array(unique * 3)
    for (let at = 0; at < remap.length; at++) {
      if (remap[at] !== 0xffffffff) {
        corners.set(positions.subarray(at * 3, at * 3 + 3), remap[at] * 3)
      }
    }
    const low = [Infinity, Infinity, Infinity]
    const high = [-Infinity, -Infinity, -Infinity]
    for (let at = 0; at < corners.length; at += 3) {
      for (let axis = 0; axis < 3; axis++) {
        low[axis] = Math.min(low[axis], corners[at + axis])
        high[axis] = Math.max(high[axis], corners[at + axis])
      }
    }
    const middle = low.map((value, axis) => (value + high[axis]) / 2)
    const half = low.map((value, axis) => Math.max((high[axis] - value) / 2, 1e-9))
    /* Four shorts a corner, the fourth unused, since meshopt reads corners in
       whole words. */
    const quantized = new Int16Array(unique * 4)
    for (let at = 0; at < unique; at++) {
      for (let axis = 0; axis < 3; axis++) {
        quantized[at * 4 + axis] = Math.round(
          ((corners[at * 3 + axis] - middle[axis]) / half[axis]) * 32767,
        )
      }
    }
    const indices = unique < 65536 ? Uint16Array.from(order) : order
    const bytes = (array) => new Uint8Array(array.buffer, array.byteOffset, array.byteLength)
    accessors.push({
      bufferView: add(bytes(quantized), unique, 8, 'ATTRIBUTES', 34962),
      componentType: 5122,
      count: unique,
      max: [32767, 32767, 32767],
      min: [-32767, -32767, -32767],
      normalized: true,
      type: 'VEC3',
    })
    accessors.push({
      bufferView: add(
        bytes(indices),
        indices.length,
        indices.BYTES_PER_ELEMENT,
        'TRIANGLES',
        34963,
      ),
      componentType: indices instanceof Uint16Array ? 5123 : 5125,
      count: indices.length,
      type: 'SCALAR',
    })
    return { half, indices: accessors.length - 1, middle, name, position: accessors.length - 2 }
  })
  const binary = new Uint8Array(padded(offset))
  for (const [at, bytes] of chunks) {
    binary.set(bytes, at)
  }
  const extensions = ['EXT_meshopt_compression', 'KHR_mesh_quantization']
  const json = JSON.stringify({
    accessors,
    asset: { generator: 'fusion/site/scripts/build-models.mjs', version: '2.0' },
    buffers: [
      { byteLength: binary.byteLength },
      { byteLength: fallback, extensions: { EXT_meshopt_compression: { fallback: true } } },
    ],
    bufferViews: views,
    extensionsRequired: extensions,
    extensionsUsed: extensions,
    meshes: parts.map(({ indices, name, position }) => ({
      name,
      primitives: [{ attributes: { POSITION: position }, indices }],
    })),
    nodes: parts.map(({ half, middle, name }, at) => ({
      mesh: at,
      name,
      scale: half,
      translation: middle,
    })),
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
