import {
  BoxGeometry,
  BufferGeometry,
  Color,
  DirectionalLight,
  EdgesGeometry,
  Float32BufferAttribute,
  HemisphereLight,
  LineBasicMaterial,
  LineSegments,
  Mesh,
  MeshLambertMaterial,
  Vector3,
} from 'three'
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js'
import type {
  BarField,
  SpatialBarChartDriver,
} from '../connect-spatial-bar-chart/connect-spatial-bar-chart.js'
import { createStage, edgeOf, HALF, inBox, lookThrough } from './stage.js'

/** How the three.js bar driver behaves where the page does not say. */
export interface ThreeBarDriverOptions {
  /**
   * How many pixels the drawing has for each of the page's. By default, on a
   * screen worked with a mouse, half as many again as the screen has, at
   * least two and at most three; on a touch screen, as many as the screen
   * has, at most two.
   */
  density?: number | undefined
}

/** How much of its place on the grid a bar covers along each edge, as the chart's own drawing leaves a gap. */
const FOOTPRINT = 0.6

/**
 * Draws a Spatial Bar Chart's bars in three dimensions with three.js. Pass it
 * to `connectSpatialBarChart` with the element to draw in, which the chart
 * holds in its plot:
 *
 * ```js
 * import { connectSpatialBarChart } from '@fusion.dev/helix-plot'
 * import { threeBarDriver } from '@fusion.dev/helix-plot/three'
 *
 * connectSpatialBarChart(chart, threeBarDriver(chart.querySelector('div')))
 * ```
 *
 * **Each bar is a block from zero to its value**, on a grid of categories
 * across and series in depth, in a box with a grid on its floor and two of
 * its walls, lit from above. Each series takes a series color from the theme.
 *
 * **Dragging turns the box, and the wheel and a pinch bring it nearer.**
 * Shift with an arrow on the chart turns it a step. It never turns by itself.
 * It draws only while something moves, asks for no frames at rest, and
 * shares the page's WebGL contexts with every three.js drawing Helix makes.
 *
 * The renderer is the driver's own, and `disconnect()` frees it.
 */
export const threeBarDriver = (
  container: HTMLElement,
  options: ThreeBarDriverOptions = {},
): SpatialBarChartDriver => {
  let field: BarField | undefined
  /** Which cell each block drawn is, in the order the blocks are built. */
  let drawnCells: number[] = []
  /** Where each bar's top stands, by its cell, which the ring and the tooltip point at. */
  let tops = new Map<number, Vector3>()

  const barMaterial = new MeshLambertMaterial({
    polygonOffset: true,
    polygonOffsetFactor: 1,
    polygonOffsetUnits: 1,
    vertexColors: true,
  })
  const bars = new Mesh<BufferGeometry>(new BufferGeometry(), barMaterial)
  const edgeMaterial = new LineBasicMaterial({ vertexColors: true })
  const edges = new LineSegments<BufferGeometry>(new BufferGeometry(), edgeMaterial)

  const stage = createStage(container, {
    density: options.density,
    /* The block whose triangle the ray meets: twelve to a block, in the
       order the bars are built. */
    pick: (ray) => {
      const hit = ray.intersectObject(bars)[0]
      if (hit?.faceIndex === undefined || hit.faceIndex === null) {
        return -1
      }
      return drawnCells[Math.floor(hit.faceIndex / 12)] ?? -1
    },
  })
  const sky = new HemisphereLight(0xffffff, 0xffffff, 2.2)
  const sun = new DirectionalLight(0xffffff, 1)
  sun.position.set(-2, 4, 1)
  stage.scene.add(bars, edges, sky, sun)

  /** A geometry painted one color at every corner. */
  const painted = (geometry: BufferGeometry, color: Color): BufferGeometry => {
    const count = geometry.getAttribute('position').count
    const colors = new Float32Array(count * 3)
    for (let at = 0; at < count; at++) {
      colors.set([color.r, color.g, color.b], at * 3)
    }
    geometry.setAttribute('color', new Float32BufferAttribute(colors, 3))
    return geometry
  }

  return {
    draw: (next, colors, font) => {
      field = next
      const [ex, ey, ez] = next.axes.extent ?? [1, 1, 1]
      const spacing = Math.min(
        (2 * HALF * ex) / Math.max(next.categories.length, 1),
        (2 * HALF * ez) / Math.max(next.series.length, 1),
      )
      const width = spacing * FOOTPRINT
      const zero = inBox(next.axes.y, 0) * ey
      const page = new Color(colors.page)
      const { emphasis, through } = colors.look
      const solids: BufferGeometry[] = []
      const lines: BufferGeometry[] = []
      drawnCells = []
      tops = new Map()
      next.cells.forEach((cell, index) => {
        if (cell.value === undefined) {
          return
        }
        const tone = new Color(colors.groups[cell.depth % colors.groups.length] ?? colors.ink)
        /* As the chart's own drawing paints them: `outlined` fades the faces
           toward the page and draws the edges in the series' color, and
           `subtle` is a faint wash under the same edges. */
        const color = emphasis === 'outlined' ? tone.clone().lerp(page, 0.4) : tone
        const top = inBox(next.axes.y, cell.value) * ey
        const tall = Math.max(Math.abs(top - zero), 1e-3)
        const x = inBox(next.axes.x, cell.across) * ex
        const z = inBox(next.axes.z, cell.depth) * ez
        const box = new BoxGeometry(width, tall, width)
        box.translate(x, Math.min(top, zero) + tall / 2, z)
        solids.push(painted(box, color))
        lines.push(painted(new EdgesGeometry(box), emphasis === 'solid' ? edgeOf(color) : tone))
        drawnCells.push(index)
        tops.set(index, new Vector3(x, Math.max(top, zero), z))
      })
      lookThrough(barMaterial, (emphasis === 'subtle' ? 0.2 : 1) * through)
      lookThrough(edgeMaterial, through)
      bars.geometry.dispose()
      edges.geometry.dispose()
      bars.geometry = (solids.length > 0 && mergeGeometries(solids)) || new BufferGeometry()
      edges.geometry = (lines.length > 0 && mergeGeometries(lines)) || new BufferGeometry()
      for (const one of [...solids, ...lines]) {
        one.dispose()
      }
      stage.setAxes(next.axes, colors, font)
      /* Framed around the box, whose proportions are the grid's. */
      stage.frame(
        new Vector3(-HALF * ex, -HALF * ey, -HALF * ez),
        new Vector3(HALF * ex, HALF * ey, HALF * ez),
      )
    },
    focus: (index) => {
      stage.setMarker(field ? tops.get(index) : undefined)
    },
    onHover: (listener) => stage.onHover(listener),
    onPlace: (listener) => stage.onPlace(listener),
    onPress: (listener) => stage.onPress(listener),
    stop: () => {
      bars.geometry.dispose()
      barMaterial.dispose()
      edges.geometry.dispose()
      edgeMaterial.dispose()
      stage.stop()
    },
    turnBy: (across, up, animate) => stage.turnBy(across, up, animate),
  }
}
