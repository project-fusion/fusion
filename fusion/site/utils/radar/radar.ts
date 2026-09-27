/**
 * Radar tiles made readable: weak returns dropped, speckle removed, the image
 * doubled for sharp screens and smoothed, and the rain recolored.
 *
 * The source is the Iowa Environmental Mesonet's NEXRAD composite, which is in
 * the public domain. Its tiles are drawn at the radar's own resolution, so a
 * zoomed-in map shows single-pixel speckle and hard steps between colors, and
 * the weakest returns, which are mostly clutter and drizzle, cover a large
 * share of the image.
 */

/**
 * The composite's colors, in order: the color at index `i` is a reflectivity
 * of `(i + 1 - 65) / 2` dBZ, from -32 to 95. From the IEM's raster table for
 * `composite_n0q`.
 */
const TABLE =
  '85718f85728f86738d87758b87768b887789897987897a878a7b858b7d848b7e848c7f828d81808d82808e837e8f847c' +
  '8f857c90877b918879918979928b77938d759691539894579b975b9d9a60a09d64a3a068a5a36da8a671aaa976adac7a' +
  'b0af7eb2b283b7b88cbabb90bdbe94bfc199c2c49dc4c7a2c7caa6cacdaaccd0afd2d4b4cfd2b4c9ccb4c6c9b4c3c7b4' +
  'c0c4b4bdc1b4b9beb4b6bbb4b3b9b4b0b6b4adb3b4aab0b4a4abb4a0a8b49da5b49aa2b497a0b4949db4919ab4949bb5' +
  '9098b48c95b38892b2808cb07c89af7886ae7483ac7080ab6c7daa6779a96376a85f73a75b70a6576da44f67a24b64a1' +
  '4761a0435e9f415b9e4361a24568a6486faa4a76ae4d7db24f84b6518bbb5699c3599fc75ba6cb5eadcf60b4d462bbd8' +
  '65c2dc67c9e06ad0e46fd6e868d6d759d6b352d6a24bd69043d67e3cd66d35d65b11d51811d11710cd1710c81610c416' +
  '0fbc150fb7140eb3140eaf130eab130da6120da2120d9e110c99110c95100c91100b880f0b840e0a800e0a7c0d0a770d' +
  '09730c096f0c096b0b08660b08620a095e09327308467d085b88076f9207849d0698a806adb205c1bd05d6c704ead204' +
  'ffe200ffd800ffd300ffce00ffc900ffc400ffc000ffbb00ffb600ffb100ffac00ffa700ffa200ff9900ff9400ff8f00' +
  'ff8a00ff8500ff8000ff0000f80000f10000ea0000e30000d50000cd0000c60000bf0000b80000b10000aa0000a30000' +
  '9b00009400008d00007f0000780000710000fffffffff5ffffeaffffdfffffd4ffffc9ffffbeffffb3ffff9dffff92ff' +
  'ff75fffc6bfdf960faf656f7f34bf4f040f1ed36efea2bece720e9e10be3b200ffac00fca400f79b00f49300ef8800ea' +
  '8300e87900e27200dd6900db05ecf005ebf005eaf005dde005dce005dbe005cdd005ccd004bdc004bcc004bbc004aeb0' +
  '04adb0049ea0049da0049ca0038e90038d90038c90037e80037d80036f70036e70036d70025f60025e60024f50024e50' +
  '024d50023f40023e40023d40013030012f30012020011f20011e203a67b53a66b53a65b53a64b53a63b53a62b5'

/** Reflectivity in dBZ, by the color that draws it as `0xRRGGBB`. */
const REFLECTIVITY = new Map<number, number>()
for (let i = 0; i < TABLE.length / 6; i += 1) {
  REFLECTIVITY.set(Number.parseInt(TABLE.slice(i * 6, i * 6 + 6), 16), (i + 1 - 65) / 2)
}

/** Below this, a return is not drawn. Light rain starts at about 20 dBZ. */
const FLOOR = 15

/** Where a return is drawn at its full strength. */
const FULL = 22

/** The colors rain is drawn in, by dBZ: greens for rain, yellow and orange for storms, red and magenta for hail. */
const RAMP: readonly (readonly [number, number, number, number])[] = [
  [FLOOR, 110, 215, 140],
  [25, 55, 190, 90],
  [32, 25, 150, 60],
  [36, 235, 215, 60],
  [44, 245, 145, 40],
  [50, 225, 50, 45],
  [58, 170, 20, 40],
  [65, 200, 60, 190],
]

/** How many of a pixel's eight neighbors must also show rain for it to stay. */
const COMPANY = 3

/** The blur's reach, in output pixels. */
const SIGMA = 1

const smoothstep = (from: number, to: number, value: number): number => {
  const t = Math.min(1, Math.max(0, (value - from) / (to - from)))
  return t * t * (3 - 2 * t)
}

/** The reflectivity at each pixel, or `-Infinity` where there is no return. */
const reflectivityOf = (rgba: Uint8Array, size: number): Float32Array => {
  const field = new Float32Array(size * size).fill(Number.NEGATIVE_INFINITY)
  for (let p = 0; p < size * size; p += 1) {
    if (rgba[p * 4 + 3] === 0) {
      continue
    }
    const color = (rgba[p * 4] << 16) | (rgba[p * 4 + 1] << 8) | rgba[p * 4 + 2]
    field[p] = REFLECTIVITY.get(color) ?? Number.NEGATIVE_INFINITY
  }
  return field
}

/**
 * Drops returns under the floor, and rain with too few neighbors: a lone pixel
 * is speckle from clutter or noise, and a real shower is wider than one pixel.
 * What is left is written as the floor's distance below zero, so the blur fades
 * rain out at its edges instead of cutting it off.
 */
const despeckle = (field: Float32Array, size: number): Float32Array => {
  const rain = (x: number, y: number): boolean =>
    x >= 0 && y >= 0 && x < size && y < size && field[y * size + x] >= FLOOR
  const kept = new Float32Array(size * size)
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const p = y * size + x
      if (!rain(x, y)) {
        kept[p] = FLOOR - 10
        continue
      }
      let company = 0
      for (let dy = -1; dy <= 1; dy += 1) {
        for (let dx = -1; dx <= 1; dx += 1) {
          if ((dx !== 0 || dy !== 0) && rain(x + dx, y + dy)) {
            company += 1
          }
        }
      }
      kept[p] = company >= COMPANY ? field[p] : FLOOR - 10
    }
  }
  return kept
}

/** The field at twice the size, sampled between pixels. */
const double = (field: Float32Array, size: number): Float32Array => {
  const out = size * 2
  const doubled = new Float32Array(out * out)
  const at = (x: number, y: number): number =>
    field[Math.min(size - 1, Math.max(0, y)) * size + Math.min(size - 1, Math.max(0, x))]
  for (let y = 0; y < out; y += 1) {
    const sy = (y + 0.5) / 2 - 0.5
    const y0 = Math.floor(sy)
    const fy = sy - y0
    for (let x = 0; x < out; x += 1) {
      const sx = (x + 0.5) / 2 - 0.5
      const x0 = Math.floor(sx)
      const fx = sx - x0
      const top = at(x0, y0) * (1 - fx) + at(x0 + 1, y0) * fx
      const bottom = at(x0, y0 + 1) * (1 - fx) + at(x0 + 1, y0 + 1) * fx
      doubled[y * out + x] = top * (1 - fy) + bottom * fy
    }
  }
  return doubled
}

/** A Gaussian blur, across and then down, holding the edge pixels past the edge. */
const blur = (field: Float32Array, size: number): Float32Array => {
  const reach = Math.ceil(SIGMA * 2)
  const weights = Array.from({ length: reach * 2 + 1 }, (_, i) =>
    Math.exp(-((i - reach) ** 2) / (2 * SIGMA * SIGMA)),
  )
  const total = weights.reduce((sum, weight) => sum + weight, 0)
  const pass = (from: Float32Array, across: boolean): Float32Array => {
    const to = new Float32Array(size * size)
    for (let y = 0; y < size; y += 1) {
      for (let x = 0; x < size; x += 1) {
        let sum = 0
        for (let i = -reach; i <= reach; i += 1) {
          const sx = across ? Math.min(size - 1, Math.max(0, x + i)) : x
          const sy = across ? y : Math.min(size - 1, Math.max(0, y + i))
          sum += from[sy * size + sx] * weights[i + reach]
        }
        to[y * size + x] = sum / total
      }
    }
    return to
  }
  return pass(pass(field, true), false)
}

/** The ramp's color at a reflectivity. */
const colorAt = (dbz: number): [number, number, number] => {
  for (let i = 1; i < RAMP.length; i += 1) {
    const [to, ...high] = RAMP[i]
    if (dbz <= to) {
      const [from, ...low] = RAMP[i - 1]
      const t = Math.max(0, (dbz - from) / (to - from))
      return [0, 1, 2].map((c) => Math.round(low[c] + (high[c] - low[c]) * t)) as [
        number,
        number,
        number,
      ]
    }
  }
  const [, ...last] = RAMP[RAMP.length - 1]
  return last as [number, number, number]
}

/**
 * A composite tile, cleaned and recolored at twice its size.
 *
 * `rgba` is the source tile's pixels, `size` by `size`. The result is
 * `size * 2` square. Light rain is drawn partly transparent and heavy rain
 * opaque, so the map shows through a drizzle and not through a storm.
 */
export const cleanRadar = (rgba: Uint8Array, size: number): Uint8Array => {
  const field = blur(double(despeckle(reflectivityOf(rgba, size), size), size), size * 2)
  const out = new Uint8Array(field.length * 4)
  for (let p = 0; p < field.length; p += 1) {
    const dbz = field[p]
    const alpha = smoothstep(FLOOR, FULL, dbz) * (0.85 + 0.15 * smoothstep(25, 45, dbz))
    if (alpha <= 0) {
      continue
    }
    const [r, g, b] = colorAt(dbz)
    out[p * 4] = r
    out[p * 4 + 1] = g
    out[p * 4 + 2] = b
    out[p * 4 + 3] = Math.round(alpha * 255)
  }
  return out
}
