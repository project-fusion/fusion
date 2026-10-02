import type { ShapeField } from '../connect-graph/shape-field.js'

/*
 * Solids measured exactly, from their formulas: no grid, so a sphere is as
 * round up close as from afar. Each sits in the middle of a box just large
 * enough to hold it.
 */

/** A ball `radius` across from its middle. */
export const sphere = ({ radius = 50 }: { radius?: number } = {}): ShapeField => ({
  depth: radius * 2,
  distance: (x, y, z = radius) => Math.hypot(x - radius, y - radius, z - radius) - radius,
  height: radius * 2,
  width: radius * 2,
})

/** A ring: `radius` from its middle to the middle of its tube, which is `tube` thick from its own middle out. */
export const torus = ({
  radius = 50,
  tube = 18,
}: {
  radius?: number
  tube?: number
} = {}): ShapeField => {
  const reach = radius + tube
  return {
    /* Lying flat, facing the viewer: the ring is across x and y. */
    depth: tube * 2,
    distance: (x, y, z = tube) =>
      Math.hypot(Math.hypot(x - reach, y - reach) - radius, z - tube) - tube,
    height: reach * 2,
    width: reach * 2,
  }
}

/** A box `width` by `height` by `depth`, its edges rounded `round` in. */
export const box = ({
  depth = 100,
  height = 100,
  round = 0,
  width = 100,
}: {
  depth?: number
  height?: number
  round?: number
  width?: number
} = {}): ShapeField => ({
  depth,
  distance: (x, y, z = depth / 2) => {
    const qx = Math.abs(x - width / 2) - width / 2 + round
    const qy = Math.abs(y - height / 2) - height / 2 + round
    const qz = Math.abs(z - depth / 2) - depth / 2 + round
    return (
      Math.hypot(Math.max(qx, 0), Math.max(qy, 0), Math.max(qz, 0)) +
      Math.min(Math.max(qx, qy, qz), 0) -
      round
    )
  },
  height,
  width,
})

/**
 * A flat shape wrapped round a ball, as a map of the world is round a globe:
 * the flat shape's width is the way round and its height pole to pole, as an
 * equirectangular map is drawn. The solid is a shell `thickness` deep at the
 * ball's surface, wherever the flat shape is, so notes placed in it draw the
 * map in three dimensions.
 */
export const onSphere = (
  flat: ShapeField,
  { radius = 50, thickness = radius * 0.08 }: { radius?: number; thickness?: number } = {},
): ShapeField => {
  /* How far one unit of the flat shape is round the ball, so a distance read
     off the map is a distance on the ball's surface, near enough. */
  const along = (Math.PI * 2 * radius) / Math.max(flat.width, 1e-9)
  return {
    depth: radius * 2,
    distance: (x, y, z = radius) => {
      const dx = x - radius
      const dy = y - radius
      const dz = z - radius
      const out = Math.hypot(dx, dy, dz)
      const shell = Math.abs(out - (radius - thickness / 2)) - thickness / 2
      /* Longitude round from the front, latitude down from the top, as the map is laid out. */
      const longitude = Math.atan2(dx, dz)
      const latitude = Math.acos(Math.min(Math.max(dy / (out || 1), -1), 1))
      const map = flat.distance(
        ((longitude + Math.PI) / (Math.PI * 2)) * flat.width,
        (latitude / Math.PI) * flat.height,
      )
      return Math.max(shell, map * along)
    },
    height: radius * 2,
    width: radius * 2,
  }
}
