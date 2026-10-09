import {
  BufferGeometry,
  CanvasTexture,
  Color,
  Float32BufferAttribute,
  Points,
  PointsMaterial,
  Vector3,
} from 'three'
import type {
  Field,
  SpatialScatterChartDriver,
} from '../connect-spatial-scatter-chart/connect-spatial-scatter-chart.js'
import { createStage, inBox } from './stage.js'

/** How the three.js scatter driver behaves where the page does not say. */
export interface ThreeScatterDriverOptions {
  /**
   * How many pixels the drawing has for each of the page's. By default, on a
   * screen worked with a mouse, half as many again as the screen has, at
   * least two and at most three; on a touch screen, as many as the screen
   * has, at most two.
   */
  density?: number | undefined
  /** How large a point is drawn, in CSS pixels, at any distance. 9 by default. */
  pointSize?: number | undefined
}

/** A round point, drawn once and used as every point's sprite. */
const dot = (): CanvasTexture => {
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = 64
  const context = canvas.getContext('2d')
  if (context) {
    context.beginPath()
    context.arc(32, 32, 28, 0, Math.PI * 2)
    context.fillStyle = '#fff'
    context.fill()
  }
  return new CanvasTexture(canvas)
}

/**
 * Draws a Spatial Scatter Chart's points in three dimensions with three.js. Pass
 * it to `connectSpatialScatterChart` with the element to draw in, which the chart
 * holds in its plot:
 *
 * ```js
 * import { connectSpatialScatterChart } from '@fusion.dev/helix-plot'
 * import { threeScatterDriver } from '@fusion.dev/helix-plot/three'
 *
 * connectSpatialScatterChart(chart, threeScatterDriver(chart.querySelector('div')))
 * ```
 *
 * **The points stand in a box**, each axis' range from one side of it to the
 * other, with a grid on its floor and two of its walls at the ticks, and the
 * axes named along its edges. Each group is a color of the theme's series.
 *
 * **Dragging turns the box, and the wheel and a pinch bring it nearer.**
 * Shift with an arrow on the chart turns it a step. It never turns by itself.
 * It draws only while something moves, asks for no frames at rest, and
 * shares the page's WebGL contexts with every three.js drawing Helix makes.
 *
 * The renderer is the driver's own, and `disconnect()` frees it.
 */
export const threeScatterDriver = (
  container: HTMLElement,
  options: ThreeScatterDriverOptions = {},
): SpatialScatterChartDriver => {
  let field: Field | undefined

  /** A point's place in the box. */
  const placeOf = (index: number): Vector3 | undefined => {
    const point = field?.points[index]
    if (!field || !point) {
      return undefined
    }
    return new Vector3(
      inBox(field.axes.x, point.x),
      inBox(field.axes.y, point.y),
      inBox(field.axes.z, point.z),
    )
  }

  const pointTexture = dot()
  const pointMaterial = new PointsMaterial({
    alphaTest: 0.5,
    map: pointTexture,
    /* **A point is the same size on screen at any distance**, as a 3D
       scatter's markers are: sized in the box, the near ones covered the far
       ones and the far ones shrank to specks. three.js scales it for the
       pixel ratio. */
    size: options.pointSize ?? 9,
    sizeAttenuation: false,
    vertexColors: true,
  })
  const points = new Points(new BufferGeometry(), pointMaterial)

  const stage = createStage(container, {
    density: options.density,
    pick: (ray) => {
      ray.params.Points = { threshold: 0.06 }
      return ray.intersectObject(points)[0]?.index ?? -1
    },
  })
  stage.scene.add(points)

  return {
    draw: (next, colors, font) => {
      field = next
      const positions: number[] = []
      const tints: number[] = []
      const tint = new Color()
      next.points.forEach((point, index) => {
        const at = placeOf(index) as Vector3
        positions.push(at.x, at.y, at.z)
        tint.setStyle(colors.groups[point.groupIndex % colors.groups.length] ?? colors.ink)
        tints.push(tint.r, tint.g, tint.b)
      })
      points.geometry.dispose()
      const geometry = new BufferGeometry()
      geometry.setAttribute('position', new Float32BufferAttribute(positions, 3))
      geometry.setAttribute('color', new Float32BufferAttribute(tints, 3))
      points.geometry = geometry
      stage.setAxes(next.axes, colors, font)
    },
    focus: (index) => {
      stage.setMarker(placeOf(index))
    },
    onHover: (listener) => stage.onHover(listener),
    onPlace: (listener) => stage.onPlace(listener),
    onPress: (listener) => stage.onPress(listener),
    stop: () => {
      points.geometry.dispose()
      pointMaterial.dispose()
      pointTexture.dispose()
      stage.stop()
    },
    turnBy: (across, up, animate) => stage.turnBy(across, up, animate),
  }
}
