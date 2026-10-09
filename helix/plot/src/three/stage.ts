import { type Holder, pageBudget } from '@fusion.dev/helix-core'
import {
  BufferGeometry,
  CanvasTexture,
  Float32BufferAttribute,
  LineBasicMaterial,
  LineSegments,
  PerspectiveCamera,
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
import type { Axis, PlotColors } from '../connect-plot/connect-plot.js'

/* What every 3D plot Helix draws with three.js shares: the renderer and its
   camera, the box with its grid and its names, the frame loop that draws
   only while something moves, the page's budget of contexts, presses, and
   turning. A driver adds what it plots and how a pointer finds it. */

/** How far one step of Shift with an arrow turns or tilts the view, in radians: 15 degrees. */
const STEP = Math.PI / 12

/** How long a step of the view takes, in milliseconds, as the graph driver's. */
const DURATION = 250

/** How far a drag goes before it is a turn rather than a press, in pixels. */
const DRAG = 4

/** The box's half edge, in three.js's units: what is plotted stands between -1 and 1 on each axis. */
export const HALF = 1

/** Eases in and out. */
const ease = (at: number): number => (at < 0.5 ? 2 * at * at : 1 - (-2 * at + 2) ** 2 / 2)

/** A number on an axis, written short enough for a tick. */
export const tickText = (value: number): string => String(Number(value.toPrecision(6)))

/** Where a number stands in the box, from -1 at its axis' low end to 1 at its high end. */
export const inBox = (axis: Axis, value: number): number => {
  const [low, high] = axis.range
  return high === low ? 0 : ((value - low) / (high - low)) * 2 * HALF - HALF
}

/** A ring, for what the keys rest on. */
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

/** The plot's three axes: across, up, and in depth. */
export interface Axes {
  x: Axis
  y: Axis
  z: Axis
}

/** What a stage is asked for. */
export interface StageOptions {
  /** How many pixels the drawing has for each of the page's, as each driver's `density`. */
  density?: number | undefined
}

/** Where a reading is drawn, as fractions of the box the drawing fills, from its top left. */
export interface Place {
  x: number
  y: number
}

/** What moved a reading: the kinds of pointer a chart's readings name. */
export type PointerKind = 'mouse' | 'pen' | 'touch'

/** The box's edges and a grid at the ticks, on its floor and its two back walls. */
const gridLines = (axes: Axes): number[] => {
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
  for (const x of axes.x.ticks.map((tick) => inBox(axes.x, tick))) {
    line([x, -h, -h], [x, -h, h])
    line([x, -h, -h], [x, h, -h])
  }
  for (const z of axes.z.ticks.map((tick) => inBox(axes.z, tick))) {
    line([-h, -h, z], [h, -h, z])
    line([-h, -h, z], [-h, h, z])
  }
  for (const y of axes.y.ticks.map((tick) => inBox(axes.y, tick))) {
    line([-h, y, -h], [h, y, -h])
    line([-h, y, -h], [-h, y, h])
  }
  return lines
}

/**
 * The stage a 3D plot is drawn on, in `container`.
 *
 * `pick` is asked which reading a ray through the pointer meets, `-1` for
 * none. `onHover` hears the reading a mouse or a pen rests on, `onPress` a
 * press that did not drag, and `onPlace` where the ringed reading is drawn
 * after each frame, which is where the chart points its tooltip.
 */
export const createStage = (
  container: HTMLElement,
  options: StageOptions & {
    pick: (ray: Raycaster) => number
  },
) => {
  const still = (): boolean =>
    window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false
  const renderer = new WebGLRenderer({ alpha: true, antialias: true })
  /* **Drawn finer than the screen and smoothed down**, as the graph driver
     draws, and on a touch screen at the screen's own density, at most two. */
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

  const gridMaterial = new LineBasicMaterial({ opacity: 0.35, transparent: true })
  const grid = new LineSegments(new BufferGeometry(), gridMaterial)
  scene.add(grid)

  const ringTexture = ring()
  const marker = new Sprite(new SpriteMaterial({ depthTest: false, map: ringTexture }))
  marker.visible = false
  marker.renderOrder = 1
  scene.add(marker)

  let axes: Axes | undefined
  let colors: PlotColors | undefined
  let font = 'sans-serif'
  let stopped = false
  let press: ((index: number, kind: PointerKind) => void) | undefined
  let hover: ((index: number, kind: PointerKind) => void) | undefined
  let place: ((at: Place | undefined) => void) | undefined
  let placed: Place | undefined

  /* Places in the scene a driver asked to follow on the page, and who hears them. */
  let tracked:
    | { heard: (at: Place[] | undefined) => void; points: Vector3[]; was?: Place[] | undefined }
    | undefined

  /* Where each tracked place is drawn, told only when one moves, and as none
     while any of them is behind the camera. */
  const tellTracked = (): void => {
    if (!tracked) {
      return
    }
    const now = tracked.points.map((point) => point.clone().project(camera))
    const at = now.some((on) => on.z > 1)
      ? undefined
      : now.map((on) => ({ x: (on.x + 1) / 2, y: (1 - on.y) / 2 }))
    const was = tracked.was
    const moved =
      at === undefined || was === undefined
        ? at !== was
        : at.some((one, index) => {
            const other = was[index] as Place
            return Math.abs(one.x - other.x) > 1e-4 || Math.abs(one.y - other.y) > 1e-4
          })
    if (moved) {
      tracked.was = at
      tracked.heard(at)
    }
  }

  /* Where the ringed reading is drawn, told only when it moves. */
  const tellPlace = (): void => {
    let at: Place | undefined
    if (marker.visible) {
      const on = marker.position.clone().project(camera)
      at = on.z > 1 ? undefined : { x: (on.x + 1) / 2, y: (1 - on.y) / 2 }
    }
    const moved =
      at === undefined || placed === undefined
        ? at !== placed
        : Math.abs(at.x - placed.x) > 1e-4 || Math.abs(at.y - placed.y) > 1e-4
    if (moved) {
      placed = at
      place?.(at)
    }
  }

  /** Every name and number, placed over where its place in the box is drawn. */
  const drawLabels = (): void => {
    if (!axes || !colors) {
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
    const { x, y, z } = axes
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
    labels.replaceChildren(...marks)
    /* **Kept inside the plot**, whichever way it is turned: a name at the
       edge of a narrow plot ran off it. Measured once laid out, a few dozen
       names a frame. */
    for (const mark of marks) {
      const half = mark.offsetWidth / 2
      const left = Number.parseFloat(mark.style.left)
      const kept = Math.min(Math.max(left, half + 4), width - half - 4)
      if (kept !== left) {
        mark.style.left = `${kept}px`
      }
    }
  }

  /* Whether the box is in view, and the frame booked, if any. Out of view
     nothing is drawn and no frame is asked for, until it is back. **No frame
     is asked for at rest**: anything that changes the drawing asks for the
     next one here. */
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
    tellPlace()
    tellTracked()
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

  /**
   * What a driver asked the view to hold, if it asked: the box around what
   * it draws, which the camera stands just far enough back to see whole.
   */
  let framed: { high: Vector3; low: Vector3 } | undefined
  const fit = (): void => {
    if (!framed) {
      return
    }
    const { high, low } = framed
    const center = low.clone().add(high).multiplyScalar(0.5)
    const toward = camera.position.clone().sub(controls.target).normalize()
    /* The camera's own across and up, looking from `toward` at the middle. */
    const right = new Vector3(0, 1, 0).cross(toward).normalize()
    const up = toward.clone().cross(right).normalize()
    const tanUp = Math.tan((camera.fov * Math.PI) / 360)
    const tanAcross = tanUp * camera.aspect
    /* **Far enough that every corner of the box is inside the view**, each
       corner's distance off the middle over the tangent of half the view,
       plus how far toward the camera it stands. A sphere around a flat
       relief left most of the view empty. */
    let distance = 0
    for (const x of [low.x, high.x]) {
      for (const y of [low.y, high.y]) {
        for (const z of [low.z, high.z]) {
          const corner = new Vector3(x, y, z).sub(center)
          const ahead = corner.dot(toward)
          distance = Math.max(
            distance,
            ahead + Math.abs(corner.dot(right)) / tanAcross,
            ahead + Math.abs(corner.dot(up)) / tanUp,
          )
        }
      }
    }
    distance *= 1.06
    controls.target.copy(center)
    camera.position.copy(center).add(toward.multiplyScalar(distance))
    controls.minDistance = distance * 0.35
    controls.maxDistance = distance * 3
    camera.lookAt(controls.target)
    controls.update()
  }

  const resize = (): void => {
    const width = Math.max(container.clientWidth, 1)
    const height = Math.max(container.clientHeight, 1)
    renderer.setSize(width, height, false)
    camera.aspect = width / height
    camera.updateProjectionMatrix()
    fit()
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

  /* The reading under the pointer, by a ray through it, and a press that did not drag. */
  const raycaster = new Raycaster()
  const pickAt = (event: PointerEvent): number => {
    const box = canvas.getBoundingClientRect()
    raycaster.setFromCamera(
      new Vector2(
        ((event.clientX - box.left) / box.width) * 2 - 1,
        -((event.clientY - box.top) / box.height) * 2 + 1,
      ),
      camera,
    )
    return options.pick(raycaster)
  }
  const kindOf = (event: PointerEvent): PointerKind =>
    event.pointerType === 'touch' || event.pointerType === 'pen' ? event.pointerType : 'mouse'
  let down: { x: number; y: number } | undefined
  let hovered = -1
  const onDown = (event: PointerEvent): void => {
    down = { x: event.clientX, y: event.clientY }
  }
  const onUp = (event: PointerEvent): void => {
    const was = down
    down = undefined
    if (!was || Math.hypot(event.clientX - was.x, event.clientY - was.y) >= DRAG) {
      return
    }
    press?.(pickAt(event), kindOf(event))
  }
  /* **Only a mouse or a pen hovers**, as on every chart: a finger passing over
     the drawing turns it, and a tap is its hover, which `press` hears. */
  const hoverTo = (next: number, kind: PointerKind): void => {
    if (next !== hovered) {
      hovered = next
      canvas.style.cursor = next >= 0 ? 'pointer' : ''
      hover?.(next, kind)
    }
  }
  const onMove = (event: PointerEvent): void => {
    if (down || event.pointerType === 'touch') {
      return
    }
    hoverTo(pickAt(event), kindOf(event))
  }
  const onLeave = (event: PointerEvent): void => {
    if (event.pointerType !== 'touch') {
      hoverTo(-1, kindOf(event))
    }
  }
  canvas.addEventListener('pointerdown', onDown)
  canvas.addEventListener('pointerup', onUp)
  canvas.addEventListener('pointermove', onMove)
  canvas.addEventListener('pointerleave', onLeave)

  return {
    /**
     * Holds the box from `low` to `high` around what is drawn in view, from
     * `toward` where given, a direction from the middle toward the camera, or
     * from where the camera stands. Again on every resize, from wherever the
     * camera stands then.
     */
    frame: (low: Vector3, high: Vector3, toward?: Vector3): void => {
      framed = { high: high.clone(), low: low.clone() }
      if (toward) {
        camera.position.copy(controls.target).add(toward.clone().normalize())
      }
      fit()
      invalidate()
    },
    invalidate,
    /** Hears the reading a mouse or a pen rests on, `-1` for none. Returns what stops listening. */
    onHover: (listener: (index: number, kind: PointerKind) => void): (() => void) => {
      hover = listener
      return () => {
        hover = undefined
      }
    },
    /** Hears where the ringed reading is drawn after each frame that moves it, or that none is. */
    onPlace: (listener: (at: Place | undefined) => void): (() => void) => {
      place = listener
      listener(placed)
      return () => {
        place = undefined
      }
    },
    onPress: (listener: (index: number, kind: PointerKind) => void): (() => void) => {
      press = listener
      return () => {
        press = undefined
      }
    },
    scene,
    /** Draws the box and its grid for `next` axes, in `nextColors`. */
    setAxes: (next: Axes, nextColors: PlotColors, nextFont: string): void => {
      axes = next
      colors = nextColors
      font = nextFont
      grid.geometry.dispose()
      const lines = new BufferGeometry()
      lines.setAttribute('position', new Float32BufferAttribute(gridLines(next), 3))
      grid.geometry = lines
      /* The muted ink, see-through, which reads on any ground: the border
         color drawn on the sunken surface all but disappeared. */
      gridMaterial.color.setStyle(nextColors.quiet)
      ;(marker.material as SpriteMaterial).color.setStyle(nextColors.ink)
      invalidate()
    },
    /** Rings the reading the keys rest on, or none. */
    setMarker: (at: Vector3 | undefined): void => {
      marker.visible = at !== undefined
      if (at) {
        marker.position.copy(at)
        marker.scale.set(0.16, 0.16, 1)
      }
      invalidate()
    },
    stop: (): void => {
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
      canvas.removeEventListener('pointerleave', onLeave)
      controls.dispose()
      grid.geometry.dispose()
      gridMaterial.dispose()
      ;(marker.material as SpriteMaterial).dispose()
      ringTexture.dispose()
      renderer.dispose()
      canvas.remove()
      labels.remove()
    },
    /**
     * Follows `points` in the scene on the page: `heard` is told where each is
     * drawn, as fractions of the box from its top left, after every frame
     * that moves one, and `undefined` while one is behind the camera. Returns
     * what stops following.
     */
    track: (points: Vector3[], heard: (at: Place[] | undefined) => void): (() => void) => {
      tracked = { heard, points: points.map((point) => point.clone()) }
      invalidate()
      return () => {
        tracked = undefined
      }
    },
    turnBy: (across: number, up: number, animate: boolean): void => {
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
