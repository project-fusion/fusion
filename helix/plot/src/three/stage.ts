import {
  type BoxAxisText,
  type BoxPlace,
  boxLabels,
  type Holder,
  pageBudget,
  type SeenPlace,
} from '@fusion.dev/helix-core'
import {
  BufferGeometry,
  CanvasTexture,
  Color,
  Float32BufferAttribute,
  LineBasicMaterial,
  LineSegments,
  type Material,
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

/**
 * Lets `amount` of a mark's material through, as `material` and a `subtle`
 * emphasis ask: opaque at 1, and see-through below it, where a mark writes
 * no depth so the marks behind it still draw.
 */
export const lookThrough = (material: Material, amount: number): void => {
  const clear = amount < 1
  material.opacity = amount
  material.transparent = clear
  material.depthWrite = !clear
  material.needsUpdate = true
}

/**
 * An edge a little lighter than a dark face and a little darker than a light
 * one, as the charts' own drawings draw them, so every block keeps its form
 * on every step of a ramp.
 */
export const edgeOf = (face: Color): Color => {
  const hsl = { h: 0, l: 0, s: 0 }
  face.getHSL(hsl)
  return face.clone().lerp(new Color(hsl.l < 0.5 ? 0xffffff : 0x000000), hsl.l < 0.5 ? 0.22 : 0.18)
}

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

/** The plot's three axes: across, up, and in depth, and how long the box is along each, where not a cube. */
export interface Axes {
  extent?: readonly [number, number, number] | undefined
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
  const [ex, ey, ez] = axes.extent ?? [1, 1, 1]
  const line = (from: [number, number, number], to: [number, number, number]): void => {
    lines.push(from[0] * ex, from[1] * ey, from[2] * ez, to[0] * ex, to[1] * ey, to[2] * ez)
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
  for (const x of (axes.x.rules ?? axes.x.ticks).map((tick) => inBox(axes.x, tick))) {
    line([x, -h, -h], [x, -h, h])
    line([x, -h, -h], [x, h, -h])
  }
  for (const z of (axes.z.rules ?? axes.z.ticks).map((tick) => inBox(axes.z, tick))) {
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
  labels.style.cssText =
    'position:absolute;inset:0;pointer-events:none;overflow:hidden;user-select:none;-webkit-user-select:none'
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
  /* **Never under the floor**, as a step of Shift with an arrow is held: a
     drag up went on past level and showed the slab from below. */
  controls.minPolarAngle = 0.15
  controls.maxPolarAngle = Math.PI / 2 - 0.02

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
    /* None along a box that is not drawn. */
    if (!axes || !colors?.look.box) {
      labels.replaceChildren()
      return
    }
    const width = container.clientWidth
    const height = container.clientHeight
    const marks: HTMLElement[] = []
    const label = (left: number, top: number, text: string, strong = false): void => {
      const mark = document.createElement('span')
      mark.textContent = text
      /* **In the theme's type scale**: the names and numbers are page text in
         the chart, so the theme's size and weight tokens reach them, with
         the sizes they had before as fallbacks where no theme is loaded. */
      const size = strong ? 'var(--helix-text-sm, 13px)' : 'var(--helix-text-xs, 11px)'
      const weight = strong
        ? 'var(--helix-weight-semibold, 600)'
        : 'var(--helix-weight-medium, 500)'
      mark.style.cssText = `position:absolute;left:${left}px;top:${top}px;translate:-50% -50%;white-space:nowrap;font-family:${font};font-size:${size};font-weight:${weight};line-height:1;color:${strong ? colors?.ink : colors?.quiet};text-shadow:0 0 3px ${colors?.ground},0 0 3px ${colors?.ground}`
      marks.push(mark)
    }
    /* **Along the edges that face the reader**, as the chart's own drawing
       writes them, so a turn moves them to the edges in front. */
    const place = new Vector3()
    const seen = ([x, y, z]: BoxPlace): SeenPlace => {
      const [ex, ey, ez] = axes?.extent ?? [1, 1, 1]
      place.set(x * HALF * ex, y * HALF * ey, z * HALF * ez)
      const depth = -place.distanceTo(camera.position)
      const on = place.project(camera)
      return { depth, x: ((on.x + 1) / 2) * width, y: ((1 - on.y) / 2) * height }
    }
    const text = (axis: Axis): BoxAxisText => ({
      name: axis.name,
      ticks: axis.ticks.map((tick, index) => ({
        at: inBox(axis, tick) / HALF,
        text: axis.labels?.[index] ?? tickText(tick),
      })),
    })
    for (const one of boxLabels(
      seen,
      { x: text(axes.x), y: text(axes.y), z: text(axes.z) },
      { gap: 6, name: 13, tick: 11, wide: 0.58 },
    )) {
      label(one.x, one.y, one.text, one.name)
    }
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
        turned()
      }
    }
    if (settle) {
      const through = Math.min((now - settle.start) / DURATION, 1)
      const eased = ease(through)
      const toward = camera.position.clone().sub(controls.target).normalize()
      const [near, far] = settle.distance
      controls.target.lerpVectors(settle.from, settle.to, eased)
      camera.position.copy(controls.target).add(toward.multiplyScalar(near + (far - near) * eased))
      camera.lookAt(controls.target)
      dirty = true
      if (through >= 1) {
        settle = undefined
        controls.update()
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
    if ((turn || settle) && !pending) {
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
  /** Where the camera is aimed, and how far back it stands, to hold the framed box seen from `toward`. */
  const fitFrom = (
    toward: Vector3,
    box: { high: Vector3; low: Vector3 },
  ): { center: Vector3; distance: number } => {
    const { high, low } = box
    /* The camera's own across and up, looking from `toward` at the middle. */
    const right = new Vector3(0, 1, 0).cross(toward).normalize()
    const up = toward.clone().cross(right).normalize()
    const tanUp = Math.tan((camera.fov * Math.PI) / 360)
    const tanAcross = tanUp * camera.aspect
    const corners: Vector3[] = []
    for (const x of [low.x, high.x]) {
      for (const y of [low.y, high.y]) {
        for (const z of [low.z, high.z]) {
          corners.push(new Vector3(x, y, z))
        }
      }
    }
    /* **Far enough that every corner of the box is inside the view**, each
       corner's distance off the middle over the tangent of half the view,
       plus how far toward the camera it stands. A sphere around a flat
       relief left most of the view empty. */
    const distanceFrom = (center: Vector3): number => {
      let far = 0
      for (const corner of corners) {
        const off = corner.clone().sub(center)
        const ahead = off.dot(toward)
        far = Math.max(
          far,
          ahead + Math.abs(off.dot(right)) / tanAcross,
          ahead + Math.abs(off.dot(up)) / tanUp,
        )
      }
      return far
    }
    /* **Aimed at the middle of what is drawn, not of the box.** In
       perspective the near corner lands lower on the page than the far one,
       and a view aimed at the box's middle left an empty band over a relief.
       So the aim moves until the corners' extremes on the page are even on
       each side, a few rounds being enough to settle it. */
    const center = low.clone().add(high).multiplyScalar(0.5)
    let distance = distanceFrom(center)
    for (let round = 0; round < 4; round++) {
      let [left, rightmost, bottom, top] = [Infinity, -Infinity, Infinity, -Infinity]
      for (const corner of corners) {
        const off = corner.clone().sub(center)
        const depth = Math.max(distance - off.dot(toward), 1e-6)
        const across = off.dot(right) / depth / tanAcross
        const rise = off.dot(up) / depth / tanUp
        left = Math.min(left, across)
        rightmost = Math.max(rightmost, across)
        bottom = Math.min(bottom, rise)
        top = Math.max(top, rise)
      }
      center
        .add(right.clone().multiplyScalar(((left + rightmost) / 2) * tanAcross * distance))
        .add(up.clone().multiplyScalar(((bottom + top) / 2) * tanUp * distance))
      distance = distanceFrom(center)
    }
    return { center, distance: distance * 1.06 }
  }
  /** How near the camera may come and how far it may go, round a box held `distance` back. */
  const reach = (distance: number): void => {
    controls.minDistance = distance * 0.35
    controls.maxDistance = distance * 3
  }
  const fit = (): void => {
    if (!framed) {
      return
    }
    const toward = camera.position.clone().sub(controls.target).normalize()
    const { center, distance } = fitFrom(toward, framed)
    settle = undefined
    controls.target.copy(center)
    camera.position.copy(center).add(toward.multiplyScalar(distance))
    reach(distance)
    camera.lookAt(controls.target)
    controls.update()
  }

  /**
   * **Held through a turn, and framed again once it ends.** The camera turns
   * round the middle of what is drawn at the distance it stood, so nothing
   * jumps while it moves, as the chart's own drawing holds its size through a
   * drag. Seen from the new side the box can reach past the view, so once a
   * drag or a step ends the camera eases to the framing for that side, over a
   * quarter of a second, or at once with reduced motion set. **A zoom the
   * reader chose is kept**: the camera stands off the new framing by as much
   * as it stands off the framing it began from, so a wheel or a pinch, which
   * starts and ends with no turn, leaves the camera where it put it.
   */
  let settle: { from: Vector3; start: number; to: Vector3; distance: [number, number] } | undefined
  /** How far back the framing stood when a turn began. */
  let began = 0
  const turning = (): void => {
    settle = undefined
    if (framed) {
      const toward = camera.position.clone().sub(controls.target).normalize()
      began = fitFrom(toward, framed).distance
    }
  }
  const turned = (): void => {
    if (!framed || began <= 0) {
      return
    }
    const toward = camera.position.clone().sub(controls.target).normalize()
    const { center, distance } = fitFrom(toward, framed)
    reach(distance)
    const zoomed = camera.position.distanceTo(controls.target) / began
    const to = { center, distance: distance * zoomed }
    if (still()) {
      controls.target.copy(to.center)
      camera.position.copy(to.center).add(toward.multiplyScalar(to.distance))
      camera.lookAt(controls.target)
      controls.update()
      invalidate()
      return
    }
    settle = {
      distance: [camera.position.distanceTo(controls.target), to.distance],
      from: controls.target.clone(),
      start: performance.now(),
      to: to.center,
    }
    invalidate()
  }
  controls.addEventListener('start', turning)
  controls.addEventListener('end', turned)

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
      grid.visible = nextColors.look.box
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
      controls.removeEventListener('start', turning)
      controls.removeEventListener('end', turned)
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
      turning()
      const from = new Spherical().setFromVector3(camera.position.clone().sub(controls.target))
      const to = from.clone()
      to.theta += across * STEP
      to.phi = Math.min(Math.max(to.phi - up * STEP, 0.15), Math.PI / 2 - 0.02)
      if (!animate || still()) {
        camera.position.setFromSpherical(to).add(controls.target)
        camera.lookAt(controls.target)
        turned()
        invalidate()
        return
      }
      turn = { from, start: performance.now(), to }
      invalidate()
    },
  }
}
