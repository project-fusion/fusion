import {
  BufferGeometry,
  Color,
  DirectionalLight,
  DoubleSide,
  Float32BufferAttribute,
  HemisphereLight,
  LineBasicMaterial,
  LineSegments,
  Mesh,
  MeshLambertMaterial,
  Vector3,
} from 'three'
import type {
  SpatialSurfaceChartDriver,
  SurfaceField,
} from '../connect-spatial-surface-chart/connect-spatial-surface-chart.js'
import { createStage, HALF, inBox } from './stage.js'

/** How far off the pointer's line of sight a reading is still under it, in radians: about 16 pixels in a chart's box. */
const REACH = 0.03

/** How the three.js surface driver behaves where the page does not say. */
export interface ThreeSurfaceDriverOptions {
  /**
   * How many pixels the drawing has for each of the page's. By default, on a
   * screen worked with a mouse, half as many again as the screen has, at
   * least two and at most three; on a touch screen, as many as the screen
   * has, at most two.
   */
  density?: number | undefined
}

/**
 * Draws a Spatial Surface Chart's grid as a surface in three dimensions with
 * three.js. Pass it to `connectSpatialSurfaceChart` with the element to draw in, which
 * the chart holds in its plot:
 *
 * ```js
 * import { connectSpatialSurfaceChart } from '@fusion.dev/helix-plot'
 * import { threeSurfaceDriver } from '@fusion.dev/helix-plot/three'
 *
 * connectSpatialSurfaceChart(chart, threeSurfaceDriver(chart.querySelector('div')))
 * ```
 *
 * **Each reading is a corner of the surface**, at its place across and in
 * depth and as high as its reading, in a box with a grid on its floor and
 * two of its walls. The surface is shaded along the ramp from
 * `--spatial-surface-chart-low` to `--spatial-surface-chart-high`, lit from above, and ruled along
 * the grid. A place the table has no reading for leaves a hole rather than a
 * pit.
 *
 * **Dragging turns the box, and the wheel and a pinch bring it nearer.**
 * Shift with an arrow on the chart turns it a step. It never turns by itself.
 * It draws only while something moves, asks for no frames at rest, and
 * shares the page's WebGL contexts with every three.js drawing Helix makes.
 *
 * The renderer is the driver's own, and `disconnect()` frees it.
 */
export const threeSurfaceDriver = (
  container: HTMLElement,
  options: ThreeSurfaceDriverOptions = {},
): SpatialSurfaceChartDriver => {
  let field: SurfaceField | undefined

  /** A place's corner in the box, or none where the table has no reading for it. */
  const placeOf = (index: number): Vector3 | undefined => {
    const cell = field?.cells[index]
    if (!field || cell?.value === undefined) {
      return undefined
    }
    return new Vector3(
      inBox(field.axes.x, cell.x),
      inBox(field.axes.y, cell.value),
      inBox(field.axes.z, cell.z),
    )
  }

  const surfaceMaterial = new MeshLambertMaterial({
    /* Pushed back a little, so the rules along the grid are drawn over it. */
    polygonOffset: true,
    polygonOffsetFactor: 1,
    polygonOffsetUnits: 1,
    side: DoubleSide,
    vertexColors: true,
  })
  const surface = new Mesh(new BufferGeometry(), surfaceMaterial)
  const ruleMaterial = new LineBasicMaterial({ opacity: 0.3, transparent: true })
  const rules = new LineSegments(new BufferGeometry(), ruleMaterial)

  const stage = createStage(container, {
    density: options.density,
    /* **The reading nearest the pointer's line of sight that the surface
       does not hide**, measured as an angle so it reads as a distance on the
       screen, and otherwise the nearest corner of the face the pointer is
       over. Taken from the face alone, a reading on the surface's edge was
       out of reach, and over a large face near the camera the face's own
       corner won over a reading drawn right under the pointer. */
    pick: (ray) => {
      const hit = ray.intersectObject(surface)[0]
      const position = surface.geometry.getAttribute('position')
      if (field && position) {
        const corner = new Vector3()
        let found = -1
        let nearest = REACH
        field.cells.forEach((cell, index) => {
          if (cell.value === undefined) {
            return
          }
          corner.fromBufferAttribute(position, index)
          const along = corner.clone().sub(ray.ray.origin).dot(ray.ray.direction)
          if (along <= 0 || (hit && along > hit.distance + 0.03)) {
            return
          }
          const away = ray.ray.distanceToPoint(corner) / along
          if (away < nearest) {
            nearest = away
            found = index
          }
        })
        if (found >= 0) {
          return found
        }
      }
      if (!hit?.face) {
        return -1
      }
      const corner = new Vector3()
      let nearest = -1
      let distance = Number.POSITIVE_INFINITY
      for (const at of [hit.face.a, hit.face.b, hit.face.c]) {
        corner.fromBufferAttribute(position, at)
        const away = corner.distanceTo(hit.point)
        if (away < distance) {
          distance = away
          nearest = at
        }
      }
      return field?.cells[nearest]?.value === undefined ? -1 : nearest
    },
  })
  /* **Lit from above and from the upper left**, so a slope facing the light
     reads lighter than one facing away, and the colors at the top stay
     close to the ramp's. */
  const sky = new HemisphereLight(0xffffff, 0xffffff, 2.2)
  const sun = new DirectionalLight(0xffffff, 1)
  sun.position.set(-2, 4, 1)
  stage.scene.add(surface, rules, sky, sun)

  return {
    draw: (next, colors, font) => {
      field = next
      const depths = next.depths.length
      const positions: number[] = []
      const tints: number[] = []
      const low = new Color(colors.ramp.low)
      const high = new Color(colors.ramp.high)
      const tint = new Color()
      const values = next.cells.flatMap((cell) => (cell.value === undefined ? [] : [cell.value]))
      const [least, most] = [Math.min(...values), Math.max(...values)]
      next.cells.forEach((cell, index) => {
        /* A place with no reading still has a corner, on the floor, which
           no face uses. */
        const at = placeOf(index) ?? new Vector3(0, -HALF, 0)
        positions.push(at.x, at.y, at.z)
        const level =
          cell.value === undefined || most === least ? 0.5 : (cell.value - least) / (most - least)
        tint.lerpColors(low, high, level)
        tints.push(tint.r, tint.g, tint.b)
      })
      const has = (index: number): boolean => next.cells[index]?.value !== undefined
      const faces: number[] = []
      const lines: number[] = []
      const line = (from: number, to: number): void => {
        if (has(from) && has(to)) {
          lines.push(
            ...positions.slice(from * 3, from * 3 + 3),
            ...positions.slice(to * 3, to * 3 + 3),
          )
        }
      }
      for (let across = 0; across < next.acrosses.length; across++) {
        for (let depth = 0; depth < depths; depth++) {
          const here = across * depths + depth
          if (depth + 1 < depths) {
            line(here, here + 1)
          }
          if (across + 1 < next.acrosses.length) {
            line(here, here + depths)
          }
          if (across + 1 >= next.acrosses.length || depth + 1 >= depths) {
            continue
          }
          /* A square of the grid is two triangles; one missing corner
             leaves the triangle of the other three. */
          const [a, b, c, d] = [here, here + 1, here + depths + 1, here + depths]
          const corners = [a, b, c, d].filter(has)
          if (corners.length === 4) {
            faces.push(a, b, c, a, c, d)
          } else if (corners.length === 3) {
            faces.push(...corners)
          }
        }
      }
      surface.geometry.dispose()
      const geometry = new BufferGeometry()
      geometry.setAttribute('position', new Float32BufferAttribute(positions, 3))
      geometry.setAttribute('color', new Float32BufferAttribute(tints, 3))
      geometry.setIndex(faces)
      geometry.computeVertexNormals()
      surface.geometry = geometry
      rules.geometry.dispose()
      const ruled = new BufferGeometry()
      ruled.setAttribute('position', new Float32BufferAttribute(lines, 3))
      rules.geometry = ruled
      ruleMaterial.color.setStyle(colors.ink)
      stage.setAxes(next.axes, colors, font)
    },
    focus: (index) => {
      stage.setMarker(placeOf(index))
    },
    onHover: (listener) => stage.onHover(listener),
    onPlace: (listener) => stage.onPlace(listener),
    onPress: (listener) => stage.onPress(listener),
    stop: () => {
      surface.geometry.dispose()
      surfaceMaterial.dispose()
      rules.geometry.dispose()
      ruleMaterial.dispose()
      stage.stop()
    },
    turnBy: (across, up, animate) => stage.turnBy(across, up, animate),
  }
}
