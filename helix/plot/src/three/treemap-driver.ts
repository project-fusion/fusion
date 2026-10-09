import {
  Box3,
  BoxGeometry,
  type BufferAttribute,
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
  SpatialTreemapDriver,
  TreemapField,
} from '../connect-spatial-treemap/connect-spatial-treemap.js'
import { createStage, edgeOf, HALF, inBox, lookThrough } from './stage.js'

/** How the three.js treemap driver behaves where the page does not say. */
export interface ThreeTreemapDriverOptions {
  /**
   * How many pixels the drawing has for each of the page's. By default, on a
   * screen worked with a mouse, half as many again as the screen has, at
   * least two and at most three; on a touch screen, as many as the screen
   * has, at most two.
   */
  density?: number | undefined
}

/**
 * Draws a Spatial Treemap's blocks in three dimensions with three.js. Pass it
 * to `connectSpatialTreemap` with the element to draw in, which the chart
 * holds in its plot:
 *
 * ```js
 * import { connectSpatialTreemap } from '@fusion.dev/helix-plot'
 * import { threeTreemapDriver } from '@fusion.dev/helix-plot/three'
 *
 * connectSpatialTreemap(chart, threeTreemapDriver(chart.querySelector('div')))
 * ```
 *
 * **Each block stands on its part of the floor, from zero to its height**,
 * or as one slab where the table gives no heights, in a box with the
 * height's grid on two of its walls, lit from above. Each group takes a
 * series color from the theme.
 *
 * **Dragging turns the box, and the wheel and a pinch bring it nearer.**
 * Shift with an arrow on the chart turns it a step. It never turns by itself.
 * It draws only while something moves, asks for no frames at rest, and
 * shares the page's WebGL contexts with every three.js drawing Helix makes.
 *
 * The renderer is the driver's own, and `disconnect()` frees it.
 */
export const threeTreemapDriver = (
  container: HTMLElement,
  options: ThreeTreemapDriverOptions = {},
): SpatialTreemapDriver => {
  let field: TreemapField | undefined
  /** Which block each solid drawn is, in the order the solids are built. */
  let drawnBlocks: number[] = []
  /** Where each block's top stands, by its index, which the ring and the tooltip point at. */
  let tops = new Map<number, Vector3>()

  const blockMaterial = new MeshLambertMaterial({
    polygonOffset: true,
    polygonOffsetFactor: 1,
    polygonOffsetUnits: 1,
    vertexColors: true,
  })
  const blocks = new Mesh<BufferGeometry>(new BufferGeometry(), blockMaterial)
  const edgeMaterial = new LineBasicMaterial({ vertexColors: true })
  const edges = new LineSegments<BufferGeometry>(new BufferGeometry(), edgeMaterial)

  const stage = createStage(container, {
    density: options.density,
    /* The block whose triangle the ray meets: twelve to a block, in the
       order the blocks are built. */
    pick: (ray) => {
      const hit = ray.intersectObject(blocks)[0]
      if (hit?.faceIndex === undefined || hit.faceIndex === null) {
        return -1
      }
      return drawnBlocks[Math.floor(hit.faceIndex / 12)] ?? -1
    },
  })
  const sky = new HemisphereLight(0xffffff, 0xffffff, 2.2)
  const sun = new DirectionalLight(0xffffff, 1)
  sun.position.set(-2, 4, 1)
  stage.scene.add(blocks, edges, sky, sun)

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
      const zero = inBox(next.axes.y, 0) * ey
      const page = new Color(colors.page)
      const { emphasis, through } = colors.look
      const solids: BufferGeometry[] = []
      const lines: BufferGeometry[] = []
      drawnBlocks = []
      tops = new Map()
      next.blocks.forEach((block, index) => {
        const tone = new Color(colors.groups[block.groupIndex % colors.groups.length] ?? colors.ink)
        /* As the chart's own drawing paints them: `outlined` fades the faces
           toward the page and draws the edges in the group's color, and
           `subtle` is a faint wash under the same edges. */
        const color = emphasis === 'outlined' ? tone.clone().lerp(page, 0.4) : tone
        const top = inBox(next.axes.y, next.height === '' ? 1 : (block.height ?? 0)) * ey
        const tall = Math.max(Math.abs(top - zero), 1e-3)
        const [x0, x1] = [
          inBox(next.axes.x, block.area.x0) * ex,
          inBox(next.axes.x, block.area.x1) * ex,
        ]
        const [z0, z1] = [
          inBox(next.axes.z, block.area.z0) * ez,
          inBox(next.axes.z, block.area.z1) * ez,
        ]
        const box = new BoxGeometry(Math.abs(x1 - x0), tall, Math.abs(z1 - z0))
        const [x, z] = [(x0 + x1) / 2, (z0 + z1) / 2]
        box.translate(x, Math.min(top, zero) + tall / 2, z)
        solids.push(painted(box, color))
        lines.push(painted(new EdgesGeometry(box), emphasis === 'solid' ? edgeOf(color) : tone))
        drawnBlocks.push(index)
        tops.set(index, new Vector3(x, Math.max(top, zero), z))
      })
      lookThrough(blockMaterial, (emphasis === 'subtle' ? 0.2 : 1) * through)
      lookThrough(edgeMaterial, through)
      blocks.geometry.dispose()
      edges.geometry.dispose()
      blocks.geometry = (solids.length > 0 && mergeGeometries(solids)) || new BufferGeometry()
      edges.geometry = (lines.length > 0 && mergeGeometries(lines)) || new BufferGeometry()
      for (const one of [...solids, ...lines]) {
        one.dispose()
      }
      stage.setAxes(next.axes, colors, font)
      /* Framed around the box, or with no box around the blocks alone, so
         they fill the view. */
      if (colors.look.box || tops.size === 0) {
        stage.frame(
          new Vector3(-HALF * ex, -HALF * ey, -HALF * ez),
          new Vector3(HALF * ex, HALF * ey, HALF * ez),
        )
      } else {
        const around = new Box3().setFromBufferAttribute(
          blocks.geometry.getAttribute('position') as BufferAttribute,
        )
        stage.frame(around.min, around.max)
      }
    },
    focus: (index) => {
      stage.setMarker(field ? tops.get(index) : undefined)
    },
    onHover: (listener) => stage.onHover(listener),
    onPlace: (listener) => stage.onPlace(listener),
    onPress: (listener) => stage.onPress(listener),
    stop: () => {
      blocks.geometry.dispose()
      blockMaterial.dispose()
      edges.geometry.dispose()
      edgeMaterial.dispose()
      stage.stop()
    },
    turnBy: (across, up, animate) => stage.turnBy(across, up, animate),
  }
}
