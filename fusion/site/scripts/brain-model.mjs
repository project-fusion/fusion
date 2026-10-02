/**
 * A brain, as a distance field: for any point, how far it is from the
 * brain's surface, below zero inside. Built for the Graph examples' 3D
 * model, from the same side outline the flat brain example draws, so the
 * two are one brain seen two ways.
 *
 * - **Two hemispheres**, a fissure between them that runs from the top down
 *   to where they join and through at the front and the back.
 * - **A dome across**, each hemisphere fullest a little way in from its
 *   outline and narrower at the front than the back.
 * - **Grooves carved into the surface**, the lateral fissure and the main
 *   sulci where the flat example draws them, and folds all over.
 * - **A cerebellum of two lobes under the back**, finely striped, and a
 *   brainstem.
 *
 * Units are the flat example's: x from the front at 0 to the back at 220,
 * y down from 0 to 170, and z across, 0 at the middle.
 */

/** The width of the box the brain is drawn in, its height, and how far it reaches either side of the middle. */
export const BOX = { across: 92, height: 185, left: -5, top: -5, width: 230 }

const smoothstep = (low, high, value) => {
  const t = Math.min(Math.max((value - low) / (high - low), 0), 1)
  return t * t * (3 - 2 * t)
}

/** A smooth minimum: two shapes joined, the join rounded over `k`. */
const smin = (one, other, k) => {
  const h = Math.max(k - Math.abs(one - other), 0) / k
  return Math.min(one, other) - (h * h * k) / 4
}

/** A smooth maximum: one shape cut by another, the cut rounded over `k`. */
const smax = (one, other, k) => -smin(-one, -other, k)

/** A closed or open curve through points, as many points along it as `step` asks. */
const curve = (points, closed, step = 10) => {
  const count = points.length
  const out = []
  const last = closed ? count : count - 1
  for (let at = 0; at < last; at++) {
    const p0 = points[(at - 1 + count) % count]
    const p1 = points[at]
    const p2 = points[(at + 1) % count]
    const p3 = points[(at + 2) % count]
    const a = closed || at > 0 ? p0 : p1
    const d = closed || at + 2 < count ? p3 : p2
    for (let s = 0; s < step; s++) {
      const t = s / step
      const t2 = t * t
      const t3 = t2 * t
      out.push([
        0.5 *
          (2 * p1[0] +
            (-a[0] + p2[0]) * t +
            (2 * a[0] - 5 * p1[0] + 4 * p2[0] - d[0]) * t2 +
            (-a[0] + 3 * p1[0] - 3 * p2[0] + d[0]) * t3),
        0.5 *
          (2 * p1[1] +
            (-a[1] + p2[1]) * t +
            (2 * a[1] - 5 * p1[1] + 4 * p2[1] - d[1]) * t2 +
            (-a[1] + 3 * p1[1] - 3 * p2[1] + d[1]) * t3),
      ])
    }
  }
  if (!closed) {
    out.push(points[count - 1])
  }
  return out
}

/** The distance from a point to a segment, and how far along it the nearest point is, from 0 to 1. */
const toSegment = (x, y, [ax, ay], [bx, by]) => {
  const dx = bx - ax
  const dy = by - ay
  const along = Math.min(Math.max(((x - ax) * dx + (y - ay) * dy) / (dx * dx + dy * dy || 1), 0), 1)
  return [Math.hypot(x - ax - dx * along, y - ay - dy * along), along]
}

/** The cerebrum's side outline: the flat example's, without its scalloped top, since folds make those. */
const outline = (() => {
  const points = []
  for (let at = 0; at < 72; at++) {
    const turn = (2 * Math.PI * at) / 72
    const tall = Math.sin(turn) < 0 ? 62 : 50
    points.push([108 + 96 * Math.cos(turn), 74 + tall * Math.sin(turn)])
  }
  const push = (px, py, dx, dy, reach, amount) => {
    for (const point of points) {
      const weight = Math.exp(-((point[0] - px) ** 2 + (point[1] - py) ** 2) / (reach * reach))
      point[0] += dx * weight * amount
      point[1] += dy * weight * amount
    }
  }
  push(95, 124, 0, 1, 30, 8)
  push(30, 110, 1, -0.6, 14, 10)
  push(170, 118, 0, -1, 22, 9)
  return curve(points, true, 8)
})()

/** The grooves the flat example draws, each with how wide it is and how deep it cuts. */
const grooves = [
  {
    deep: 11,
    points: [
      [40, 102],
      [62, 91],
      [88, 82],
      [116, 76],
      [140, 74],
      [156, 69],
    ],
    wide: 2.6,
  },
  {
    deep: 7,
    points: [
      [120, 14],
      [114, 36],
      [108, 50],
      [104, 62],
      [100, 74],
    ],
    wide: 1.8,
  },
  {
    deep: 6,
    points: [
      [80, 20],
      [74, 36],
      [62, 46],
      [48, 56],
    ],
    wide: 1.5,
  },
  {
    deep: 6,
    points: [
      [150, 26],
      [146, 44],
      [152, 58],
      [164, 66],
    ],
    wide: 1.5,
  },
  {
    deep: 6,
    points: [
      [62, 108],
      [88, 102],
      [114, 98],
      [136, 96],
    ],
    wide: 1.5,
  },
  {
    deep: 6,
    points: [
      [176, 40],
      [182, 60],
      [188, 80],
    ],
    wide: 1.4,
  },
].map((groove) => ({ ...groove, line: curve(groove.points, false, 10) }))

/**
 * Grids over the side view, read between their cells: the outline's signed
 * distance, and how far inside the nearest groove a point is. Measured once,
 * since every point through the brain's depth asks the same of them.
 */
const GRID = 0.5
const columns = Math.ceil(BOX.width / GRID) + 1
const rows = Math.ceil(BOX.height / GRID) + 1
const side = new Float32Array(columns * rows)
const carve = new Float32Array(columns * rows)
const carveDeep = new Float32Array(columns * rows)
for (let row = 0; row < rows; row++) {
  for (let column = 0; column < columns; column++) {
    const x = BOX.left + column * GRID
    const y = BOX.top + row * GRID
    let nearest = Number.POSITIVE_INFINITY
    let inside = false
    for (let at = 0, before = outline.length - 1; at < outline.length; before = at++) {
      const [ax, ay] = outline[before]
      const [bx, by] = outline[at]
      nearest = Math.min(nearest, toSegment(x, y, [ax, ay], [bx, by])[0])
      if (ay > y !== by > y && x < ((bx - ax) * (y - ay)) / (by - ay) + ax) {
        inside = !inside
      }
    }
    side[row * columns + column] = inside ? -nearest : nearest
    /* Inside a groove below zero, tapering to nothing at its two ends. */
    let groove = Number.POSITIVE_INFINITY
    let deep = 0
    for (const { deep: depth, line, wide } of grooves) {
      for (let at = 0; at + 1 < line.length; at++) {
        const [distance, along] = toSegment(x, y, line[at], line[at + 1])
        const through = (at + along) / (line.length - 1)
        const taper = Math.sin(Math.PI * Math.min(Math.max(through, 0.04), 0.96)) ** 0.5
        const value = distance - wide * taper
        if (value < groove) {
          groove = value
          deep = depth * taper
        }
      }
    }
    carve[row * columns + column] = groove
    carveDeep[row * columns + column] = deep
  }
}
const read = (grid, x, y) => {
  const fx = Math.min(Math.max((x - BOX.left) / GRID, 0), columns - 1.001)
  const fy = Math.min(Math.max((y - BOX.top) / GRID, 0), rows - 1.001)
  const x0 = Math.floor(fx)
  const y0 = Math.floor(fy)
  const tx = fx - x0
  const ty = fy - y0
  const at = y0 * columns + x0
  return (
    (grid[at] * (1 - tx) + grid[at + 1] * tx) * (1 - ty) +
    (grid[at + columns] * (1 - tx) + grid[at + columns + 1] * tx) * ty
  )
}

/** How far out from the middle a hemisphere reaches at a point of the side view. */
const reach = (x, outside) => {
  const inset = Math.min(Math.max(-outside / 34, 0), 1)
  const widest = 74 * (0.78 + 0.22 * smoothstep(20, 150, x))
  return widest * Math.sqrt(1 - (1 - inset) ** 2)
}

/** Where the fissure between the hemispheres stops going down: low at the front and back, where it runs through. */
const fissureFloor = (x) => 70 + 140 * (1 - smoothstep(26, 52, x)) + 140 * smoothstep(156, 178, x)

/** How far apart the gyri are, ridge to ridge. */
const GYRUS = 15

/**
 * Folds: how far the surface sinks at a point, from 0 on a gyrus's crown to
 * 1 at the bottom of a sulcus. **Long winding ridges**: stripes, their
 * direction and their spacing bent by slow waves through the brain, so they
 * meander as gyri do, with broad rounded crowns and narrow deep sulci.
 */
const folds = (x, y, z) => {
  const bend =
    7 * Math.sin(0.045 * x + 1.2 * Math.sin(0.05 * z)) +
    7 * Math.sin(0.052 * y + 1.1 * Math.sin(0.043 * x)) +
    6 * Math.sin(0.048 * z + 0.9 * Math.sin(0.057 * y))
  const across = 0.55 * x + 0.75 * y + 0.35 * Math.abs(z) + bend
  const crown = (1 + Math.cos(((2 * Math.PI) / GYRUS) * across)) / 2
  return (1 - crown) ** 3
}

/** An ellipsoid's distance, near enough near its surface. */
const ellipsoid = (x, y, z, cx, cy, cz, rx, ry, rz) => {
  const k0 = Math.hypot((x - cx) / rx, (y - cy) / ry, (z - cz) / rz)
  const k1 = Math.hypot((x - cx) / (rx * rx), (y - cy) / (ry * ry), (z - cz) / (rz * rz))
  return (k0 * (k0 - 1)) / (k1 || 1e-9)
}

/** A capsule's distance: a segment thickened, from `r0` at one end to `r1` at the other. */
const capsule = (x, y, z, a, b, r0, r1) => {
  const dx = b[0] - a[0]
  const dy = b[1] - a[1]
  const dz = b[2] - a[2]
  const along = Math.min(
    Math.max(
      ((x - a[0]) * dx + (y - a[1]) * dy + (z - a[2]) * dz) / (dx * dx + dy * dy + dz * dz),
      0,
    ),
    1,
  )
  return (
    Math.hypot(x - a[0] - dx * along, y - a[1] - dy * along, z - a[2] - dz * along) -
    (r0 + (r1 - r0) * along)
  )
}

/** The brain's three parts' distances at a point: below zero inside each. */
const parts = (x, y, z) => {
  const outside = read(side, x, y)
  let cerebrum = Math.max(outside, Math.abs(z) - reach(x, outside))
  /* The fissure between the hemispheres, from the top down to where they join. */
  cerebrum = smax(cerebrum, -Math.max(Math.abs(z) - 2.4, y - fissureFloor(x)), 2.5)
  /* The grooves, carved only as deep as each goes from the surface. */
  const groove = read(carve, x, y)
  if (groove < 4) {
    const deep = read(carveDeep, x, y)
    cerebrum = smax(cerebrum, -Math.max(groove, -(cerebrum + deep)), 1.6)
  }
  /* Folds, near the surface only, where they shape what is seen. */
  if (cerebrum > -6 && cerebrum < 6) {
    cerebrum += 4.5 * folds(x, y, z)
  }
  /* The cerebellum's two lobes, finely striped across. */
  let cerebellum = smin(
    ellipsoid(x, y, z, 178, 138, 21, 31, 19, 27),
    ellipsoid(x, y, z, 178, 138, -21, 31, 19, 27),
    10,
  )
  if (cerebellum > -4 && cerebellum < 4) {
    cerebellum += 0.9 * (1 - smoothstep(0, 0.5, Math.abs(Math.sin(0.8 * y + 0.12 * x))))
  }
  /* The brainstem, and the pons swelling at its front. */
  const stem = smin(
    capsule(x, y, z, [126, 112, 0], [133, 176, 0], 11, 8),
    ellipsoid(x, y, z, 128, 140, 0, 13, 12, 14),
    6,
  )
  return { cerebellum, cerebrum, stem }
}

/** The brain's distance at a point: below zero inside. */
export const brain = (x, y, z) => {
  const { cerebellum, cerebrum, stem } = parts(x, y, z)
  return smin(smin(cerebrum, cerebellum, 5), stem, 7)
}

/** Where the lateral fissure runs, as how far down it is at a point along the brain. */
const fissureAt = (x) => {
  const line = grooves[0].points
  if (x <= line[0][0]) {
    return line[0][1]
  }
  for (let at = 1; at < line.length; at++) {
    const [ax, ay] = line[at - 1]
    const [bx, by] = line[at]
    if (x <= bx) {
      return ay + ((by - ay) * (x - ax)) / (bx - ax)
    }
  }
  return line[line.length - 1][1]
}

/** Where the central sulcus runs, as how far along the brain it is at a height. */
const centralAt = (y) => 120 - ((Math.min(Math.max(y, 14), 74) - 14) / 60) * 20

/** The lobes of the brain, as the model names its meshes. */
export const LOBES = ['frontal', 'parietal', 'temporal', 'occipital', 'cerebellum', 'brainstem']

/**
 * Which lobe a point of the brain's surface is in: **the cerebellum and the
 * brainstem by which part is nearest**, and the cerebrum's lobes by where
 * the point is, as anatomy draws them: the temporal lobe below the lateral
 * fissure, the occipital at the back, and the frontal and parietal either
 * side of the central sulcus.
 */
export const lobeOf = (x, y, z) => {
  const { cerebellum, cerebrum, stem } = parts(x, y, z)
  if (cerebellum < cerebrum && cerebellum < stem) {
    return 'cerebellum'
  }
  if (stem < cerebrum) {
    return 'brainstem'
  }
  if (x > 168) {
    return 'occipital'
  }
  if (y > fissureAt(x) + 2) {
    return 'temporal'
  }
  return x < centralAt(y) ? 'frontal' : 'parietal'
}
