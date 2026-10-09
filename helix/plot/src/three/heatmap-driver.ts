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
import type { Corners, Place } from '../connect-plot/connect-plot.js'
import type {
  SpatialHeatmapDriver,
  SpatialHeatmapField,
} from '../connect-spatial-heatmap/connect-spatial-heatmap.js'
import { createStage } from './stage.js'

/** How the three.js heatmap driver behaves where the page does not say. */
export interface ThreeHeatmapDriverOptions {
  /**
   * How many pixels the drawing has for each of the page's. By default, on a
   * screen worked with a mouse, half as many again as the screen has, at
   * least two and at most three; on a touch screen, as many as the screen
   * has, at most two.
   */
  density?: number | undefined
}

/** How much of its cell a prism covers along each edge, as the chart's own drawing leaves a gap. */
const FOOTPRINT = 0.84

/** How far the slab reaches past the grid, and how thick it is, in cells, as the chart's own drawing. */
const MARGIN = 0.3
const THICKNESS = 0.25

/** How low a day with nothing in it lies, in cells: a tile, so the floor's grid still shows. */
const TILE = 0.05

/** Where the floor stands in the box, which the stage's camera frames from -1 to 1. */
const FLOOR = -0.3

/** How wide the grid is drawn, at most, in the stage's units. */
const SPAN = 1.9

/**
 * An edge a little lighter than a dark face and a little darker than a light
 * one, as the chart's own drawing draws them, so every prism keeps its form
 * on every step of the ramp.
 */
const edgeOf = (face: Color): Color => {
  const hsl = { h: 0, l: 0, s: 0 }
  face.getHSL(hsl)
  return face.clone().lerp(new Color(hsl.l < 0.5 ? 0xffffff : 0x000000), hsl.l < 0.5 ? 0.22 : 0.18)
}

/**
 * Draws a spatial heatmap's readings as prisms in three dimensions with
 * three.js. Pass it to `connectSpatialHeatmap` with the element in the
 * chart's `renderer` slot:
 *
 * ```js
 * import { connectSpatialHeatmap } from '@fusion.dev/helix-plot'
 * import { threeHeatmapDriver } from '@fusion.dev/helix-plot/three'
 *
 * connectSpatialHeatmap(chart, threeHeatmapDriver(chart.querySelector('[slot="renderer"]')))
 * ```
 *
 * **Each reading is a prism on a slab**, as tall as the chart's own drawing
 * stands it and in its tone, lit from above and the upper left, with each
 * edge set a little apart from its face. A day with nothing in it is a tile.
 *
 * **Dragging turns the relief, and the wheel and a pinch bring it nearer.**
 * Shift with an arrow on the chart turns it a step. It never turns by itself.
 * It draws only while something moves, asks for no frames at rest, and
 * shares the page's WebGL contexts with every three.js drawing Helix makes.
 *
 * The renderer is the driver's own, and `disconnect()` frees it.
 */
export const threeHeatmapDriver = (
  container: HTMLElement,
  options: ThreeHeatmapDriverOptions = {},
): SpatialHeatmapDriver => {
  let field: SpatialHeatmapField | undefined
  /** Whether the view has been framed yet, which only the first drawing does from the isometric angle. */
  let framed = false
  /** Who hears where the front edge's ends are drawn, and what stops the stage following them. */
  let cornered: ((at: Corners | undefined) => void) | undefined
  let unfollow: (() => void) | undefined
  /** Where each reading's top stands, which the ring and the tooltip point at. */
  let tops: Vector3[] = []

  const prismMaterial = new MeshLambertMaterial({
    polygonOffset: true,
    polygonOffsetFactor: 1,
    polygonOffsetUnits: 1,
    vertexColors: true,
  })
  const prisms = new Mesh<BufferGeometry>(new BufferGeometry(), prismMaterial)
  const edgeMaterial = new LineBasicMaterial({ vertexColors: true })
  const edges = new LineSegments<BufferGeometry>(new BufferGeometry(), edgeMaterial)
  const baseMaterial = new MeshLambertMaterial()
  const base = new Mesh(new BoxGeometry(1, 1, 1), baseMaterial)
  base.visible = false

  const stage = createStage(container, {
    density: options.density,
    /* The prism whose triangle the ray meets: twelve to a prism, in the
       order the readings are built. */
    pick: (ray) => {
      const hit = ray.intersectObject(prisms)[0]
      return hit?.faceIndex === undefined || hit.faceIndex === null || !field
        ? -1
        : Math.min(Math.floor(hit.faceIndex / 12), field.cells.length - 1)
    },
  })
  const sky = new HemisphereLight(0xffffff, 0xffffff, 2.2)
  const sun = new DirectionalLight(0xffffff, 1)
  sun.position.set(-2, 4, 1)
  stage.scene.add(base, prisms, edges, sky, sun)

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
    draw: (next, colors) => {
      field = next
      const unit = SPAN / Math.max(next.columns, next.rows, 1)
      const tile = new Color(colors.extra.tile ?? colors.ground)
      const solids: BufferGeometry[] = []
      const lines: BufferGeometry[] = []
      tops = next.cells.map((cell) => {
        const color = cell.tone ? new Color(colors.extra[`tone-${cell.tone}`] ?? colors.ink) : tile
        const tall = Math.max(cell.height, TILE) * unit
        const x = (cell.column + 0.5 - next.columns / 2) * unit
        const z = (cell.row + 0.5 - next.rows / 2) * unit
        const box = new BoxGeometry(unit * FOOTPRINT, tall, unit * FOOTPRINT)
        box.translate(x, FLOOR + tall / 2, z)
        solids.push(painted(box, color))
        lines.push(painted(new EdgesGeometry(box), edgeOf(color)))
        return new Vector3(x, FLOOR + tall, z)
      })
      prisms.geometry.dispose()
      edges.geometry.dispose()
      prisms.geometry = (solids.length > 0 && mergeGeometries(solids)) || new BufferGeometry()
      edges.geometry = (lines.length > 0 && mergeGeometries(lines)) || new BufferGeometry()
      for (const one of [...solids, ...lines]) {
        one.dispose()
      }
      /* The slab under the whole grid, as the chart's own drawing lays it. */
      base.scale.set(
        (next.columns + 2 * MARGIN) * unit,
        THICKNESS * unit,
        (next.rows + 2 * MARGIN) * unit,
      )
      base.position.set(0, FLOOR - (THICKNESS * unit) / 2, 0)
      baseMaterial.color.setStyle(colors.extra.base ?? colors.grid)
      base.visible = next.cells.length > 0
      /* **Framed around the relief, from the isometric angle the chart's own
         drawing is seen from**, so the drawing does not jump when the
         renderer takes over; later drawings keep the angle the reader has
         turned to. */
      const tallest = Math.max(TILE, ...next.cells.map((cell) => cell.height)) * unit
      const wide = (next.columns + 2 * MARGIN) * unit
      const deep = (next.rows + 2 * MARGIN) * unit
      const high = tallest + THICKNESS * unit
      stage.frame(
        new Vector3(-wide / 2, FLOOR - THICKNESS * unit, -deep / 2),
        new Vector3(wide / 2, FLOOR - THICKNESS * unit + high, deep / 2),
        framed ? undefined : new Vector3(1, 1, 1),
      )
      framed = true
      /* **The two ends of the front edge, at the foot of the slab**, under the
         first column and the last, along the long edge nearer the reader, as
         the chart's own drawing names them, and the corners of the box round
         the relief, which its labels stand clear of. Followed on the page as
         the view turns. */
      unfollow?.()
      const foot = FLOOR - THICKNESS * unit
      const corners: Vector3[] = []
      for (const x of [-wide / 2, wide / 2]) {
        for (const z of [deep / 2, -deep / 2]) {
          corners.push(new Vector3(x, foot, z), new Vector3(x, foot + high, z))
        }
      }
      unfollow = stage.track(corners, (at) => {
        if (!at) {
          cornered?.(undefined)
          return
        }
        /* The feet of the four uprights: the last row's side, then the
           first's, under the first column and then the last. Seen from
           above, the nearer side stands lower on the page. */
        const [lastStart, firstStart, lastEnd, firstEnd] = [0, 2, 4, 6].map(
          (index) => at[index] as Place,
        ) as [Place, Place, Place, Place]
        const last = lastStart.y + lastEnd.y >= firstStart.y + firstEnd.y
        cornered?.({
          end: last ? lastEnd : firstEnd,
          outline: at,
          start: last ? lastStart : firstStart,
        })
      })
    },
    focus: (index) => {
      stage.setMarker(tops[index])
    },
    onCorners: (listener) => {
      cornered = listener
      return () => {
        cornered = undefined
      }
    },
    onHover: (listener) => stage.onHover(listener),
    onPlace: (listener) => stage.onPlace(listener),
    onPress: (listener) => stage.onPress(listener),
    stop: () => {
      prisms.geometry.dispose()
      prismMaterial.dispose()
      edges.geometry.dispose()
      edgeMaterial.dispose()
      base.geometry.dispose()
      baseMaterial.dispose()
      stage.stop()
    },
    turnBy: (across, up, animate) => stage.turnBy(across, up, animate),
  }
}
