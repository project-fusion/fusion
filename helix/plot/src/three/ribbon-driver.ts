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
  RibbonField,
  SpatialRibbonChartDriver,
} from '../connect-spatial-ribbon-chart/connect-spatial-ribbon-chart.js'
import { createStage, edgeOf, HALF, inBox, lookThrough } from './stage.js'

/** How the three.js ribbon driver behaves where the page does not say. */
export interface ThreeRibbonDriverOptions {
  /**
   * How many pixels the drawing has for each of the page's. By default, on a
   * screen worked with a mouse, half as many again as the screen has, at
   * least two and at most three; on a touch screen, as many as the screen
   * has, at most two.
   */
  density?: number | undefined
}

/** How deep a ribbon is, as a share of its place in depth, as the chart's own drawing draws it. */
const THICKNESS = 0.45

/** The room left round the box for the names along its floor, in the box's own units. */
const ROOM = 0.12

/**
 * Draws a Spatial Ribbon Chart's series as ribbons in three dimensions with
 * three.js. Pass it to `connectSpatialRibbonChart` with the element to draw
 * in, which the chart holds in its plot:
 *
 * ```js
 * import { connectSpatialRibbonChart } from '@fusion.dev/helix-plot'
 * import { threeRibbonDriver } from '@fusion.dev/helix-plot/three'
 *
 * connectSpatialRibbonChart(chart, threeRibbonDriver(chart.querySelector('div')))
 * ```
 *
 * **Each series is a ribbon in its own depth**, its top following the
 * values and its sides falling to zero, in a box long across and shallow in
 * depth, lit from above. Each series takes a series color from the theme.
 *
 * **Dragging turns the box, and the wheel and a pinch bring it nearer.**
 * Shift with an arrow on the chart turns it a step. It never turns by itself.
 * It draws only while something moves, asks for no frames at rest, and
 * shares the page's WebGL contexts with every three.js drawing Helix makes.
 *
 * The renderer is the driver's own, and `disconnect()` frees it.
 */
export const threeRibbonDriver = (
  container: HTMLElement,
  options: ThreeRibbonDriverOptions = {},
): SpatialRibbonChartDriver => {
  let field: RibbonField | undefined
  /** Where each reading stands on its ribbon's top, by its index in `field.cells`. */
  let readings = new Map<number, Vector3>()

  const ribbonMaterial = new MeshLambertMaterial({
    polygonOffset: true,
    polygonOffsetFactor: 1,
    polygonOffsetUnits: 1,
    side: DoubleSide,
    vertexColors: true,
  })
  const ribbons = new Mesh<BufferGeometry>(new BufferGeometry(), ribbonMaterial)
  const edgeMaterial = new LineBasicMaterial({ vertexColors: true })
  const edges = new LineSegments<BufferGeometry>(new BufferGeometry(), edgeMaterial)

  const stage = createStage(container, {
    density: options.density,
    /* The reading nearest where the ray meets a ribbon. */
    pick: (ray) => {
      const hit = ray.intersectObject(ribbons)[0]
      if (!hit) {
        return -1
      }
      let found = -1
      let nearest = Number.POSITIVE_INFINITY
      for (const [index, at] of readings) {
        const away = at.distanceTo(hit.point)
        if (away < nearest) {
          nearest = away
          found = index
        }
      }
      return found
    },
  })
  const sky = new HemisphereLight(0xffffff, 0xffffff, 2.2)
  const sun = new DirectionalLight(0xffffff, 1)
  sun.position.set(-2, 4, 1)
  stage.scene.add(ribbons, edges, sky, sun)

  return {
    draw: (next, colors, font) => {
      field = next
      const [ex, ey, ez] = next.axes.extent ?? [1, 1, 1]
      const count = Math.max(next.series.length, 1)
      const half = ((THICKNESS * 2) / count / 2) * HALF * ez
      const zero = inBox(next.axes.y, Math.max(next.axes.y.range[0], 0)) * ey
      const page = new Color(colors.page)
      const { emphasis, through } = colors.look
      const positions: number[] = []
      const tints: number[] = []
      const lines: number[] = []
      const lineTints: number[] = []
      readings = new Map()
      next.series.forEach((_, series) => {
        const tone = new Color(colors.groups[series % colors.groups.length] ?? colors.ink)
        const color = emphasis === 'outlined' ? tone.clone().lerp(page, 0.4) : tone
        const edge = emphasis === 'solid' ? edgeOf(color) : tone
        const z = inBox(next.axes.z, series) * ez
        const points: Vector3[] = []
        next.categories.forEach((__, across) => {
          const index = across * next.series.length + series
          const value = next.cells[index]?.value
          if (value !== undefined) {
            const at = new Vector3(
              inBox(next.axes.x, across) * ex,
              inBox(next.axes.y, value) * ey,
              z,
            )
            points.push(at)
            readings.set(index, at.clone().setZ(z + half))
          }
        })
        const quad = (a: Vector3, b: Vector3, c: Vector3, d: Vector3): void => {
          for (const one of [a, b, c, a, c, d]) {
            positions.push(one.x, one.y, one.z)
            tints.push(color.r, color.g, color.b)
          }
        }
        const line = (a: Vector3, b: Vector3): void => {
          lines.push(a.x, a.y, a.z, b.x, b.y, b.z)
          lineTints.push(edge.r, edge.g, edge.b, edge.r, edge.g, edge.b)
        }
        const near = (point: Vector3, y = point.y): Vector3 => new Vector3(point.x, y, z + half)
        const far = (point: Vector3, y = point.y): Vector3 => new Vector3(point.x, y, z - half)
        for (let at = 0; at + 1 < points.length; at++) {
          const [a, b] = [points[at] as Vector3, points[at + 1] as Vector3]
          /* The top, and the two sides down to zero. */
          quad(near(a), near(b), far(b), far(a))
          quad(near(a, zero), near(b, zero), near(b), near(a))
          quad(far(a, zero), far(b, zero), far(b), far(a))
          line(near(a), near(b))
          line(far(a), far(b))
        }
        const [first, last] = [points[0], points.at(-1)]
        for (const end of [first, last]) {
          if (end) {
            quad(near(end, zero), near(end), far(end), far(end, zero))
          }
        }
      })
      ribbons.geometry.dispose()
      const geometry = new BufferGeometry()
      geometry.setAttribute('position', new Float32BufferAttribute(positions, 3))
      geometry.setAttribute('color', new Float32BufferAttribute(tints, 3))
      geometry.computeVertexNormals()
      ribbons.geometry = geometry
      edges.geometry.dispose()
      const lined = new BufferGeometry()
      lined.setAttribute('position', new Float32BufferAttribute(lines, 3))
      lined.setAttribute('color', new Float32BufferAttribute(lineTints, 3))
      edges.geometry = lined
      lookThrough(ribbonMaterial, (emphasis === 'subtle' ? 0.2 : 1) * through)
      lookThrough(edgeMaterial, through)
      stage.setAxes(next.axes, colors, font)
      /* **Framed with room for the names along the floor.** The box is long
         and shallow, so its near corner sits at the foot of the view, and a
         frame around the box alone cut off the last place's name under it. */
      stage.frame(
        new Vector3(-HALF * ex - ROOM, -HALF * ey - ROOM, -HALF * ez - ROOM),
        new Vector3(HALF * ex + ROOM, HALF * ey, HALF * ez + ROOM),
      )
    },
    focus: (index) => {
      stage.setMarker(field ? readings.get(index) : undefined)
    },
    onHover: (listener) => stage.onHover(listener),
    onPlace: (listener) => stage.onPlace(listener),
    onPress: (listener) => stage.onPress(listener),
    stop: () => {
      ribbons.geometry.dispose()
      ribbonMaterial.dispose()
      edges.geometry.dispose()
      edgeMaterial.dispose()
      stage.stop()
    },
    turnBy: (across, up, animate) => stage.turnBy(across, up, animate),
  }
}
