import { type Holder, pageBudget } from '@fusion.dev/helix-core'
import {
  BufferGeometry,
  CanvasTexture,
  Color,
  Float32BufferAttribute,
  LineBasicMaterial,
  LineSegments,
  PerspectiveCamera,
  Points,
  PointsMaterial,
  Raycaster,
  Scene,
  Spherical,
  Sprite,
  SpriteMaterial,
  Vector2,
  Vector3,
  WebGLRenderer,
} from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import type {
  Axis,
  Field,
  PlotColors,
  Scatter3dDriver,
} from '../connect-scatter-3d/connect-scatter-3d.js'

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

/** How far one step of Shift with an arrow turns or tilts the view, in radians: 15 degrees. */
const STEP = Math.PI / 12

/** How long a step of the view takes, in milliseconds, as the graph driver's. */
const DURATION = 250

/** How far a drag goes before it is a turn rather than a press, in pixels. */
const DRAG = 4

/** The box's half edge, in three.js's units: the points stand between -1 and 1 on each axis. */
const HALF = 1

/** Eases in and out. */
const ease = (at: number): number => (at < 0.5 ? 2 * at * at : 1 - (-2 * at + 2) ** 2 / 2)

/** A number on an axis, written short enough for a tick. */
const tickText = (value: number): string => String(Number(value.toPrecision(6)))

/** Where a number stands in the box, from -1 at its axis' low end to 1 at its high end. */
const inBox = (axis: Axis, value: number): number => {
  const [low, high] = axis.range
  return high === low ? 0 : ((value - low) / (high - low)) * 2 * HALF - HALF
}

/** A round point with a soft edge, drawn once and used as every point's sprite. */
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

/** A ring, for the point the keys rest on. */
const ring = (): CanvasTexture => {
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = 64
  const context = canvas.getContext('2d')
  if (context) {
    context.beginPath()
    context.arc(32, 32, 24, 0, Math.PI * 2)
    context.lineWidth = 6
    context.strokeStyle = '#fff'
    context.stroke()
  }
  return new CanvasTexture(canvas)
}

/**
 * Draws a 3D Scatter chart's points in three dimensions with three.js. Pass
 * it to `connectScatter3d` with the element to draw in, which the chart
 * holds in its plot:
 *
 * ```js
 * import { connectScatter3d } from '@fusion.dev/helix-plot'
 * import { threeScatterDriver } from '@fusion.dev/helix-plot/three'
 *
 * connectScatter3d(chart, threeScatterDriver(chart.querySelector('div')))
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
): Scatter3dDriver => {
  const still = (): boolean =>
    window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false
  const renderer = new WebGLRenderer({ alpha: true, antialias: true })
  const screen = window.devicePixelRatio || 1
  const touch = window.matchMedia?.('(pointer: coarse)').matches ?? false
  renderer.setPixelRatio(
    options.density ?? (touch ? Math.min(screen, 2) : Math.min(Math.max(screen * 1.5, 2), 3)),
  )
  renderer.setClearColor(0x000000, 0)
  const canvas = renderer.domElement
  canvas.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;display:block'
  container.append(canvas)

  /* Names and numbers are text on the page, laid over the drawing, so they
     are as crisp as the page's own and take its typeface. */
  const labels = document.createElement('div')
  labels.setAttribute('aria-hidden', 'true')
  labels.style.cssText = 'position:absolute;inset:0;pointer-events:none;overflow:hidden'
  container.append(labels)

  const scene = new Scene()
  const camera = new PerspectiveCamera(35, 1, 0.1, 100)
  /* From the front right and above, far enough that the box and the names
     along its edges fit the view: about the box's half diagonal over the
     sine of half the field of view. */
  camera.position
    .set(3.4, 2.4, 3.8)
    .setLength((Math.sqrt(3) * HALF * 1.1) / Math.sin((35 / 2) * (Math.PI / 180)))
  const controls = new OrbitControls(camera, canvas)
  /* Aimed a little below the box's middle, since seen from above its front
     corner reaches lowest on the page, and the names along it below that. */
  controls.target.set(0, -0.2 * HALF, 0)
  camera.position.add(controls.target)
  controls.update()
  controls.enableDamping = false
  controls.enablePan = false
  controls.minDistance = 2.5
  controls.maxDistance = 12
  controls.rotateSpeed = 0.7

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
  scene.add(points)

  const gridMaterial = new LineBasicMaterial({ opacity: 0.35, transparent: true })
  const grid = new LineSegments(new BufferGeometry(), gridMaterial)
  scene.add(grid)

  const ringTexture = ring()
  const marker = new Sprite(new SpriteMaterial({ depthTest: false, map: ringTexture }))
  marker.visible = false
  marker.renderOrder = 1
  scene.add(marker)

  let field: Field | undefined
  let colors: PlotColors | undefined
  let font = 'sans-serif'
  let active = -1
  let hovered = -1
  let stopped = false
  let press: ((index: number) => void) | undefined

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

  /** The box's edges and a grid at the ticks, on its floor and its two back walls. */
  const gridLines = (axes: Field['axes']): number[] => {
    const lines: number[] = []
    const line = (from: [number, number, number], to: [number, number, number]): void => {
      lines.push(...from, ...to)
    }
    const h = HALF
    /* The box's twelve edges. */
    for (const a of [-h, h]) {
      for (const b of [-h, h]) {
        line([-h, a, b], [h, a, b])
        line([a, -h, b], [a, h, b])
        line([a, b, -h], [a, b, h])
      }
    }
    const xs = axes.x.ticks.map((tick) => inBox(axes.x, tick))
    const ys = axes.y.ticks.map((tick) => inBox(axes.y, tick))
    const zs = axes.z.ticks.map((tick) => inBox(axes.z, tick))
    for (const x of xs) {
      line([x, -h, -h], [x, -h, h])
      line([x, -h, -h], [x, h, -h])
    }
    for (const z of zs) {
      line([-h, -h, z], [h, -h, z])
      line([-h, -h, z], [-h, h, z])
    }
    for (const y of ys) {
      line([-h, y, -h], [h, y, -h])
      line([-h, y, -h], [-h, y, h])
    }
    return lines
  }

  /** Every name and number, placed over where its point in the box is drawn. */
  const drawLabels = (): void => {
    if (!field || !colors) {
      labels.replaceChildren()
      return
    }
    const width = container.clientWidth
    const height = container.clientHeight
    const marks: HTMLElement[] = []
    const label = (at: Vector3, text: string, strong = false): void => {
      const on = at.clone().project(camera)
      if (on.z > 1) {
        return
      }
      const mark = document.createElement('span')
      mark.textContent = text
      mark.style.cssText = `position:absolute;left:${((on.x + 1) / 2) * width}px;top:${((1 - on.y) / 2) * height}px;translate:-50% -50%;white-space:nowrap;font:${strong ? 600 : 500} ${strong ? 13 : 11}px ${font};color:${strong ? colors?.ink : colors?.quiet};text-shadow:0 0 3px ${colors?.ground},0 0 3px ${colors?.ground}`
      marks.push(mark)
    }
    const h = HALF
    const { x, y, z } = field.axes
    for (const tick of x.ticks) {
      label(new Vector3(inBox(x, tick), -h, h + 0.12), tickText(tick))
    }
    for (const tick of z.ticks) {
      label(new Vector3(h + 0.12, -h, inBox(z, tick)), tickText(tick))
    }
    /* The up axis' lowest tick is the floor, at the corner the across axis'
       first number already takes, so it is left to the floor's grid. */
    for (const tick of y.ticks.slice(1)) {
      label(new Vector3(-h - 0.12, inBox(y, tick), h), tickText(tick))
    }
    label(new Vector3(0, -h, h + 0.35), x.name, true)
    label(new Vector3(h + 0.62, -h, 0), z.name, true)
    label(new Vector3(-h, h + 0.28, h), y.name, true)
    /* The point the keys or the pointer rest on, named above it with its numbers. */
    const shown = hovered >= 0 ? hovered : active
    const point = field.points[shown]
    const at = placeOf(shown)
    if (point && at) {
      label(
        at.clone().add(new Vector3(0, 0.16, 0)),
        `${point.label}: ${tickText(point.x)}, ${tickText(point.y)}, ${tickText(point.z)}`,
        true,
      )
    }
    labels.replaceChildren(...marks)
    /* **Kept inside the plot**, whichever way it is turned: a name at the
       edge of a narrow plot ran off it. Measured once laid out, a few dozen
       names a frame. */
    for (const mark of marks) {
      const half = mark.offsetWidth / 2
      const at = Number.parseFloat(mark.style.left)
      const kept = Math.min(Math.max(at, half + 4), width - half - 4)
      if (kept !== at) {
        mark.style.left = `${kept}px`
      }
    }
  }

  /* Whether the box is in view, and the frame booked, if any. Out of view
     nothing is drawn and no frame is asked for, until it is back. */
  let visible = true
  let pending = 0
  let dirty = true
  const invalidate = (): void => {
    dirty = true
    if (!pending && !stopped && visible && container.isConnected) {
      pending = requestAnimationFrame(tick)
    }
  }
  let turn: { from: Spherical; start: number; to: Spherical } | undefined
  const tick = (now: number): void => {
    pending = 0
    if (stopped || !visible || !container.isConnected) {
      return
    }
    if (turn) {
      const through = Math.min((now - turn.start) / DURATION, 1)
      const eased = ease(through)
      const along = new Spherical(
        turn.from.radius,
        turn.from.phi + (turn.to.phi - turn.from.phi) * eased,
        turn.from.theta + (turn.to.theta - turn.from.theta) * eased,
      )
      camera.position.setFromSpherical(along).add(controls.target)
      camera.lookAt(controls.target)
      dirty = true
      if (through >= 1) {
        turn = undefined
      }
    }
    if (!dirty) {
      return
    }
    dirty = false
    renderer.render(scene, camera)
    drawLabels()
    if (turn && !pending) {
      pending = requestAnimationFrame(tick)
    }
  }
  controls.addEventListener('change', invalidate)

  const seen =
    typeof IntersectionObserver === 'function'
      ? new IntersectionObserver((entries) => {
          visible = entries.at(-1)?.isIntersecting ?? true
          if (visible) {
            invalidate()
          }
        })
      : undefined
  seen?.observe(container)

  const resize = (): void => {
    const width = Math.max(container.clientWidth, 1)
    const height = Math.max(container.clientHeight, 1)
    renderer.setSize(width, height, false)
    camera.aspect = width / height
    camera.updateProjectionMatrix()
    invalidate()
  }
  const sized =
    typeof ResizeObserver === 'function' ? new ResizeObserver(() => resize()) : undefined
  sized?.observe(container)
  resize()

  /* A context given back is drawn again at once, and the page's contexts
     are shared out, as the graph driver's are. */
  const restored = (): void => invalidate()
  canvas.addEventListener('webglcontextrestored', restored)
  const holder: Holder = {
    release: () => renderer.forceContextLoss(),
    restore: () => renderer.forceContextRestore(),
  }
  pageBudget().join(holder)
  const nearby =
    typeof IntersectionObserver === 'function'
      ? new IntersectionObserver(
          (entries) => {
            if (entries.at(-1)?.isIntersecting ?? true) {
              pageBudget().near(holder)
            } else {
              pageBudget().far(holder, performance.now())
            }
          },
          { rootMargin: '50%' },
        )
      : undefined
  nearby?.observe(container)

  /* The point under the pointer, by a ray through it, and a press that did not drag. */
  const raycaster = new Raycaster()
  const pointAt = (event: PointerEvent): number => {
    const box = canvas.getBoundingClientRect()
    const at = new Vector2(
      ((event.clientX - box.left) / box.width) * 2 - 1,
      -((event.clientY - box.top) / box.height) * 2 + 1,
    )
    raycaster.params.Points = { threshold: 0.06 }
    raycaster.setFromCamera(at, camera)
    const hit = raycaster.intersectObject(points)[0]
    return hit?.index ?? -1
  }
  let down: { x: number; y: number } | undefined
  const onDown = (event: PointerEvent): void => {
    down = { x: event.clientX, y: event.clientY }
  }
  const onUp = (event: PointerEvent): void => {
    const was = down
    down = undefined
    if (!was || Math.hypot(event.clientX - was.x, event.clientY - was.y) >= DRAG) {
      return
    }
    press?.(pointAt(event))
  }
  const onMove = (event: PointerEvent): void => {
    if (down) {
      return
    }
    const next = pointAt(event)
    if (next !== hovered) {
      hovered = next
      canvas.style.cursor = next >= 0 ? 'pointer' : ''
      invalidate()
    }
  }
  canvas.addEventListener('pointerdown', onDown)
  canvas.addEventListener('pointerup', onUp)
  canvas.addEventListener('pointermove', onMove)

  return {
    draw: (next, nextColors, nextFont) => {
      field = next
      colors = nextColors
      font = nextFont
      const positions: number[] = []
      const tints: number[] = []
      const tint = new Color()
      next.points.forEach((point, index) => {
        const at = placeOf(index) as Vector3
        positions.push(at.x, at.y, at.z)
        tint.setStyle(
          nextColors.groups[point.groupIndex % nextColors.groups.length] ?? nextColors.ink,
        )
        tints.push(tint.r, tint.g, tint.b)
      })
      points.geometry.dispose()
      const geometry = new BufferGeometry()
      geometry.setAttribute('position', new Float32BufferAttribute(positions, 3))
      geometry.setAttribute('color', new Float32BufferAttribute(tints, 3))
      points.geometry = geometry
      grid.geometry.dispose()
      const lines = new BufferGeometry()
      lines.setAttribute('position', new Float32BufferAttribute(gridLines(next.axes), 3))
      grid.geometry = lines
      /* The muted ink, see-through, which reads on any ground: the border
         color drawn on the sunken surface all but disappeared. */
      gridMaterial.color.setStyle(nextColors.quiet)
      ;(marker.material as SpriteMaterial).color.setStyle(nextColors.ink)
      invalidate()
    },
    focus: (index) => {
      active = index
      const at = placeOf(index)
      marker.visible = at !== undefined
      if (at) {
        marker.position.copy(at)
        const size = 0.16
        marker.scale.set(size, size, 1)
      }
      invalidate()
    },
    onPress: (listener) => {
      press = listener
      return () => {
        press = undefined
      }
    },
    stop: () => {
      stopped = true
      cancelAnimationFrame(pending)
      seen?.disconnect()
      sized?.disconnect()
      nearby?.disconnect()
      pageBudget().leave(holder)
      canvas.removeEventListener('webglcontextrestored', restored)
      canvas.removeEventListener('pointerdown', onDown)
      canvas.removeEventListener('pointerup', onUp)
      canvas.removeEventListener('pointermove', onMove)
      controls.dispose()
      points.geometry.dispose()
      grid.geometry.dispose()
      pointMaterial.dispose()
      gridMaterial.dispose()
      ;(marker.material as SpriteMaterial).dispose()
      pointTexture.dispose()
      ringTexture.dispose()
      renderer.dispose()
      canvas.remove()
      labels.remove()
    },
    turnBy: (across, up, animate) => {
      const from = new Spherical().setFromVector3(camera.position.clone().sub(controls.target))
      const to = from.clone()
      to.theta += across * STEP
      to.phi = Math.min(Math.max(to.phi - up * STEP, 0.15), Math.PI / 2 - 0.02)
      if (!animate || still()) {
        camera.position.setFromSpherical(to).add(controls.target)
        camera.lookAt(controls.target)
        invalidate()
        return
      }
      turn = { from, start: performance.now(), to }
      invalidate()
    },
  }
}
