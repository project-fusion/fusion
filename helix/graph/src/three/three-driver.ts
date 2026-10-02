import {
  forceCenter,
  forceLink,
  forceManyBody,
  forceSimulation,
  type SimulationNode,
} from 'd3-force-3d'
import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  DoubleSide,
  LineSegments,
  Mesh,
  NormalBlending,
  PerspectiveCamera,
  Points,
  Raycaster,
  Scene,
  ShaderMaterial,
  TOUCH,
  Vector2,
  Vector3,
  WebGLRenderer,
} from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import type {
  DrawnLink,
  DrawnNode,
  GraphChanges,
  GraphDriver,
} from '../connect-graph/connect-graph.js'
import type { GraphLooks, NodeLook } from '../connect-graph/looks.js'
import type { GraphPoint } from '../connect-graph/seed.js'
import type { StencilFrame } from '../connect-graph/stencil.js'
import {
  ease,
  gesturesHeld,
  groupsOver,
  isLight,
  namesOver,
  type OnScreen,
  signalsOver,
} from '../overlay/overlay.js'
import { surfaceOf } from './surface.js'

/** How the three.js driver behaves where the page does not say. */
export interface ThreeDriverOptions {
  /**
   * Whether the graph turns slowly while nobody is handling it. On by
   * default, and never for a reader who asks for less motion.
   */
  autoRotate?: boolean | undefined
  /** Whether each group's name is drawn over its notes. On by default. */
  groupLabels?: boolean | undefined
  /** The longest a layout runs, in milliseconds, settled or not. 10 seconds by default. */
  layoutLimit?: number | undefined
  /** A note's shape where it does not say: `circle` by default, `square` or `diamond`. */
  shape?: NodeLook['shape']
}

/** The shader's numbers for the shapes it draws. A ring has none, and is a circle. */
const SHAPES = { circle: 0, diamond: 2, ring: 0, square: 1 } as const

/** How far out the whole graph is drawn, in three.js's units, whatever the layout's units are. */
const REACH = 100

/** How long a step of the view takes, in milliseconds. */
const STEP = 250

/** How long notes take to glide to places they were moved to, in milliseconds. */
const MORPH = 1400

/** How far one zoom step goes. */
const ZOOM = 1.5

/** How many notes of each group are read on screen, to place its name over those on the near side. */
const SAMPLE = 96

/**
 * How clear a link is drawn across the whole graph, from 0 to 1, and up
 * close. Fainter on a dark ground, where links add their light together and
 * a hub's fan of thousands burns white.
 */
const LINKS = { dark: { close: 0.3, far: 0.05 }, light: { close: 0.55, far: 0.12 } }

/** How long the graph rests after the reader lets go before it turns again, in milliseconds. */
const REST = 8000

/** The field of view, in degrees. Narrow, so depth reads without the edges stretching. */
const FOV = 40

/**
 * How far behind the graph's middle a point is, as a fade. **The far side
 * recedes**: gently for a graph seen through, whose far notes are as much
 * the graph as its near ones; and steeply, to a tenth, for notes on a
 * shape's surface, whose far side would show between the points of its
 * near side.
 */
// language=GLSL
const FADE = /* glsl */ `
uniform float middle;
uniform float radius;
uniform float steep;

float fade(float depth) {
  float gentle = mix(1.0, 0.45, smoothstep(middle - radius, middle + radius, depth));
  float sharp = mix(1.0, 0.1, smoothstep(middle - radius * 0.2, middle + radius * 0.4, depth));
  return mix(gentle, sharp, steep);
}
`

// language=GLSL
const VERTEX = /* glsl */ `
${FADE}
attribute float size;
attribute vec4 tint;
attribute float shape;
attribute float glow;

uniform float scale;
uniform float unit;

varying vec4 vTint;
varying float vShape;
varying float vGlow;
varying float vFade;

void main() {
  vec4 view = modelViewMatrix * vec4(position, 1.0);
  gl_Position = projectionMatrix * view;
  float depth = max(-view.z, 0.001);
  /* As large as the note is, at the distance it is: nearer is larger. */
  gl_PointSize = size * unit * scale / depth * (1.0 + glow * 1.4);
  vFade = fade(depth);
  vTint = tint;
  vShape = shape;
  vGlow = glow;
}
`

// language=GLSL
const FRAGMENT = /* glsl */ `
varying vec4 vTint;
varying float vShape;
varying float vGlow;
varying float vFade;

void main() {
  vec2 p = gl_PointCoord * 2.0 - 1.0;
  /* The note's body inside the sprite; the rest is room for its glow. */
  float body = 1.0 / (1.0 + vGlow * 1.4);
  float reach = vShape > 1.5 ? (abs(p.x) + abs(p.y)) * 0.78 : vShape > 0.5 ? max(abs(p.x), abs(p.y)) * 1.08 : length(p);
  float d = reach / body;
  float inside = 1.0 - smoothstep(0.86, 1.0, d);
  /* Lit from the middle out, so a note reads as round. */
  vec3 color = vTint.rgb * mix(1.15, 0.8, clamp(d, 0.0, 1.0));
  float halo = vGlow * (1.0 - smoothstep(1.0, 1.0 / body, d)) * 0.55;
  float alpha = (inside + halo * (1.0 - inside)) * vTint.a * vFade;
  if (alpha < 0.01) discard;
  gl_FragColor = vec4(color, alpha);
}
`

// language=GLSL
const LINE_VERTEX = /* glsl */ `
${FADE}
attribute vec3 color;
varying vec3 vColor;
varying float vFade;

void main() {
  vec4 view = modelViewMatrix * vec4(position, 1.0);
  gl_Position = projectionMatrix * view;
  vColor = color;
  vFade = fade(max(-view.z, 0.001));
}
`

// language=GLSL
const LINE_FRAGMENT = /* glsl */ `
uniform float opacity;
varying vec3 vColor;
varying float vFade;

void main() {
  gl_FragColor = vec4(vColor, opacity * vFade);
}
`

// language=GLSL
const SOLID_VERTEX = /* glsl */ `
varying vec3 vNormal;
varying vec3 vView;

void main() {
  vec4 view = modelViewMatrix * vec4(position, 1.0);
  gl_Position = projectionMatrix * view;
  vNormal = normalize(normalMatrix * normal);
  vView = normalize(-view.xyz);
}
`

// language=GLSL
const SOLID_FRAGMENT = /* glsl */ `
uniform vec3 ground;
uniform vec3 ink;
varying vec3 vNormal;
varying vec3 vView;

void main() {
  /* The ground's color, a breath of ink at the edge turning away, so the
     shape is felt and not seen: the notes on it are what is drawn. */
  float edge = 1.0 - abs(dot(normalize(vNormal), normalize(vView)));
  gl_FragColor = vec4(mix(ground, ink, 0.16 * pow(edge, 2.0)), 1.0);
}
`

/** An `rgb()` color as three channels from 0 to 1. */
const channels = (color: string): [number, number, number] => {
  const [red = 128, green = 128, blue = 128] = color.match(/[\d.]+/g)?.map(Number) ?? []
  return [red / 255, green / 255, blue / 255]
}

/** A small, stable depth for a note with none, read from its `id`, so a flat graph opens out in three dimensions. */
const depthOf = (id: string): number => {
  let hash = 2166136261
  for (let at = 0; at < id.length; at++) {
    hash = Math.imul(hash ^ id.charCodeAt(at), 16777619)
  }
  return ((hash >>> 0) / 4294967296 - 0.5) * 2
}

/**
 * Drives three.js for a Graph frame: the graph drawn in three dimensions, to
 * be turned and looked into. Pass the box inside the frame the drawing goes
 * in, and `connectGraph` fills it:
 *
 * ```js
 * connectGraph(frame, threeDriver(box))
 * ```
 *
 * **A layout runs in three dimensions**, with d3-force-3d, where notes have no
 * place; with a solid `stencil`, the notes are drawn in its shape and none
 * runs. Dragging turns the graph, the wheel and a pinch bring it nearer, and
 * it turns slowly by itself while nobody is handling it, unless the reader
 * asks for less motion.
 */
export const threeDriver = (
  container: HTMLElement,
  options: ThreeDriverOptions = {},
): GraphDriver => {
  const still = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false
  const renderer = new WebGLRenderer({ alpha: true, antialias: true })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
  renderer.setClearColor(0x000000, 0)
  const canvas = renderer.domElement
  canvas.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;display:block'
  container.append(canvas)
  const scene = new Scene()
  const camera = new PerspectiveCamera(FOV, 1, 0.1, REACH * 40)
  camera.position.set(0, 0, REACH * 3)
  const controls = new OrbitControls(camera, canvas)
  controls.enableDamping = !still
  controls.dampingFactor = 0.08
  controls.rotateSpeed = 0.6
  controls.autoRotate = !still && options.autoRotate !== false
  controls.autoRotateSpeed = 0.5

  /* Each note's place in the arrays, which are by index. */
  let ids: string[] = []
  let index = new Map<string, number>()
  let drawnNow = new Map<string, DrawnNode>()
  let links: DrawnLink[] = []
  let sizes: number[] = []
  let looks: GraphLooks | undefined
  let hovered: number | undefined
  let selected: string | undefined
  let near = new Set<string>()
  let stopped = false
  /* Whether the reader has moved the view since the graph was drawn, after
     which the view is theirs and nothing fits it again. */
  let moved = false
  let handled = 0

  /* **Positions in the connector's units**, scaled so the graph reaches
     `REACH` whatever its units are, and settled on the first drawing. */
  let scale = 1
  let positions: Float32Array<ArrayBufferLike> = new Float32Array()

  const uniforms = {
    middle: { value: 1 },
    radius: { value: 1 },
    scale: { value: 1 },
    steep: { value: 0 },
    unit: { value: 1 },
  }
  /** A material for links, which fade behind the graph's middle as its notes do. */
  const lines = (opacity: number): ShaderMaterial =>
    new ShaderMaterial({
      depthWrite: false,
      fragmentShader: LINE_FRAGMENT,
      transparent: true,
      uniforms: {
        middle: uniforms.middle,
        opacity: { value: opacity },
        radius: uniforms.radius,
        steep: uniforms.steep,
      },
      vertexShader: LINE_VERTEX,
    })
  const points = new Points(
    new BufferGeometry(),
    new ShaderMaterial({
      depthWrite: false,
      fragmentShader: FRAGMENT,
      transparent: true,
      uniforms,
      vertexShader: VERTEX,
    }),
  )
  points.frustumCulled = false
  const quiet = new LineSegments(new BufferGeometry(), lines(LINKS.dark.far))
  const lit = new LineSegments(new BufferGeometry(), lines(0.9))
  quiet.frustumCulled = false
  lit.frustumCulled = false
  /* **The shape the notes are on, drawn in the ground's color** just inside
     them, where they are on a solid's surface: what is behind it is hidden by
     it, as it would be by the thing it is shaped like. */
  const solid = new Mesh(
    new BufferGeometry(),
    new ShaderMaterial({
      fragmentShader: SOLID_FRAGMENT,
      polygonOffset: true,
      polygonOffsetFactor: 2,
      polygonOffsetUnits: 2,
      side: DoubleSide,
      uniforms: { ground: { value: [0, 0, 0] }, ink: { value: [1, 1, 1] } },
      vertexShader: SOLID_VERTEX,
    }),
  )
  solid.renderOrder = -1
  solid.visible = false
  solid.frustumCulled = false
  scene.add(solid, quiet, lit, points)
  let shapeFrame: StencilFrame | undefined
  let surfaced = false
  let solidAt = Number.NaN

  /** The solid, made again where the shape or how far the notes reach has changed. */
  const shapeSolid = (): void => {
    const frame = shapeFrame
    if (!frame || !surfaced || frame.field.depth <= 0) {
      solid.visible = false
      return
    }
    if (solidAt === scale) {
      solid.visible = true
      return
    }
    solidAt = scale
    const { corners, triangles } = surfaceOf(frame.field, -frame.shell * 0.6)
    const { depth, height, width } = frame.field
    for (let at = 0; at < corners.length; at += 3) {
      corners[at] = (frame.middle.x + ((corners[at] as number) - width / 2) * frame.scale) * scale
      corners[at + 1] =
        (frame.middle.y - ((corners[at + 1] as number) - height / 2) * frame.scale) * scale
      corners[at + 2] =
        (frame.middle.z + ((corners[at + 2] as number) - depth / 2) * frame.scale) * scale
    }
    solid.geometry.dispose()
    solid.geometry = new BufferGeometry()
    solid.geometry.setAttribute('position', new BufferAttribute(corners, 3))
    solid.geometry.setIndex(new BufferAttribute(triangles, 1))
    solid.geometry.computeVertexNormals()
    solid.visible = true
  }

  const at = (spot: number): Vector3 =>
    new Vector3(positions[spot * 3], positions[spot * 3 + 1], positions[spot * 3 + 2])

  /** Where a note is drawn on screen, in the container's pixels, and how large. */
  const onScreen: OnScreen = (id) => {
    const spot = index.get(id)
    if (spot === undefined) {
      return undefined
    }
    const world = at(spot)
    const depth = world.clone().applyMatrix4(camera.matrixWorldInverse).z
    const projected = world.project(camera)
    if (projected.z > 1 || depth > 0) {
      return undefined
    }
    const { clientHeight: height, clientWidth: width } = container
    const pixels =
      ((sizes[spot] ?? 1) * uniforms.unit.value * uniforms.scale.value) /
      -depth /
      renderer.getPixelRatio()
    return {
      radius: pixels / 2,
      x: ((projected.x + 1) / 2) * width,
      y: ((1 - projected.y) / 2) * height,
    }
  }

  const held = gesturesHeld(container)
  const signals = signalsOver(container, onScreen)
  /* **On a shape's surface, a group is named where its near side is**: over
     the notes in front of the graph's middle, so a group that wraps round
     the far side is named over what of it the reader sees, and one entirely
     behind is not named. */
  const nearOnScreen: OnScreen = (id) => {
    const spot = index.get(id)
    if (spot === undefined) {
      return undefined
    }
    const depth = -at(spot).applyMatrix4(camera.matrixWorldInverse).z
    return (uniforms.steep.value > 0 || solid.visible) && depth > uniforms.middle.value
      ? undefined
      : onScreen(id)
  }
  const groups = groupsOver(container, nearOnScreen)
  const names = namesOver(container, onScreen)
  const drawNames = (): void => {
    const pointed = hovered === undefined ? undefined : ids[hovered]
    const shown = [...new Set([selected, pointed, ...near])].flatMap((id) =>
      id === undefined
        ? []
        : [{ id, name: drawnNow.get(id)?.label ?? id, strong: id === selected || id === pointed }],
    )
    names.draw(looks, shown)
  }

  /* **The view glides** to where it is asked, over the frames that follow:
     a target to look at and a distance to look from. */
  let glide:
    | {
        from: Vector3
        fromDistance: number
        start: number
        to: Vector3
        toDistance: number
        duration: number
      }
    | undefined
  const glideTo = (to: Vector3, distance: number, duration: number): void => {
    const from = controls.target.clone()
    const fromDistance = camera.position.distanceTo(controls.target)
    if (duration <= 0 || still) {
      const way = camera.position.clone().sub(controls.target).normalize()
      controls.target.copy(to)
      camera.position.copy(to.clone().add(way.multiplyScalar(distance)))
      glide = undefined
      return
    }
    glide = { duration, from, fromDistance, start: performance.now(), to, toDistance: distance }
  }

  /** The middle of a set of notes, and how far out the furthest is from it. */
  const sphereOf = (spots: readonly number[]): { center: Vector3; radius: number } => {
    const center = new Vector3()
    for (const spot of spots) {
      center.add(at(spot))
    }
    center.divideScalar(Math.max(spots.length, 1))
    let radius = 0
    for (const spot of spots) {
      radius = Math.max(radius, at(spot).distanceTo(center))
    }
    return { center, radius: Math.max(radius, 1) }
  }
  const frame = (spots: readonly number[], duration: number): void => {
    if (spots.length === 0) {
      return
    }
    const { center, radius } = sphereOf(spots)
    const fov = ((camera.fov / 2) * Math.PI) / 180
    /* Near enough that the graph's widest turn still fits, and no nearer. */
    const fits = radius / Math.tan(Math.min(fov, Math.atan(Math.tan(fov) * camera.aspect)))
    glideTo(center, fits * 1.02, duration)
  }
  /** Frames the whole graph, unless the reader has moved the view. */
  const fitAll = (duration: number): void => {
    if (!moved) {
      frame(
        ids.map((_, spot) => spot),
        duration,
      )
    }
  }

  /* How large a note is drawn, relative to the others, from its size. Its
     size in three.js's units is the `unit` uniform's, set each frame from how
     far the graph reaches and how crowded it is, so ten notes and ten
     thousand both read as notes however far a layout spreads them. */
  let crowding = 1
  /* Whether the ground is dark, where light adds up. */
  let dark = true
  const sizeOf = (size: number): number => 1.6 + 1.35 * Math.max(size, 0)

  /** Colors, sizes, shapes and glows from the looks, and the links' colors. */
  const paint = (): void => {
    if (!looks) {
      return
    }
    const tints = new Float32Array(ids.length * 4)
    const drawn = new Float32Array(ids.length)
    const shapes = new Float32Array(ids.length)
    const glows = new Float32Array(ids.length)
    selected = undefined
    near = new Set()
    ids.forEach((id, spot) => {
      const look = (looks as GraphLooks).node(id)
      const [red, green, blue] = channels(look.color)
      tints.set([red, green, blue, look.hidden ? 0 : 1], spot * 4)
      drawn[spot] =
        (sizes[spot] ?? 1) * (look.selected ? 1.5 : look.raised || spot === hovered ? 1.25 : 1)
      shapes[spot] = SHAPES[look.shape ?? options.shape ?? 'circle']
      glows[spot] = look.selected ? 1 : spot === hovered ? 0.6 : 0
      if (look.selected) {
        selected = id
      } else if (look.raised) {
        near.add(id)
      }
    })
    const geometry = points.geometry
    geometry.setAttribute('tint', new BufferAttribute(tints, 4))
    geometry.setAttribute('size', new BufferAttribute(drawn, 1))
    geometry.setAttribute('shape', new BufferAttribute(shapes, 1))
    geometry.setAttribute('glow', new BufferAttribute(glows, 1))
    dark = !isLight(looks.ground)
    const solidUniforms = solid.material.uniforms as Record<string, { value: number[] }>
    ;(solidUniforms.ground as { value: number[] }).value = channels(looks.ground)
    ;(solidUniforms.ink as { value: number[] }).value = channels(looks.ink)
    const blending = dark ? AdditiveBlending : NormalBlending
    points.material.blending = blending
    quiet.material.blending = blending
    lit.material.blending = blending
    points.material.needsUpdate = true
    quiet.material.needsUpdate = true
    lit.material.needsUpdate = true
    paintLinks()
  }

  /** The links: all of them faint, and the ones the reader is on whole. */
  const paintLinks = (): void => {
    if (!looks) {
      return
    }
    const on = hovered === undefined ? undefined : ids[hovered]
    const quietEnds: number[] = []
    const quietTints: number[] = []
    const litEnds: number[] = []
    const litTints: number[] = []
    for (const link of links) {
      const from = index.get(link.source)
      const to = index.get(link.target)
      if (from === undefined || to === undefined) {
        continue
      }
      const look = looks.link(link.source, link.target)
      if (look.hidden) {
        continue
      }
      const touches = on !== undefined && (link.source === on || link.target === on)
      const whole = look.raised || touches
      const color = channels(touches ? looks.node(on).color : look.color)
      const ends = whole ? litEnds : quietEnds
      const tints = whole ? litTints : quietTints
      ends.push(from, to)
      tints.push(...color, ...color)
    }
    const fill = (line: LineSegments, ends: number[], tints: number[]): void => {
      const place = new Float32Array(ends.length * 3)
      ends.forEach((spot, step) => {
        place.set(positions.subarray(spot * 3, spot * 3 + 3), step * 3)
      })
      line.geometry.setAttribute('position', new BufferAttribute(place, 3))
      line.geometry.setAttribute('color', new BufferAttribute(new Float32Array(tints), 3))
      line.userData.ends = ends
    }
    fill(quiet, quietEnds, quietTints)
    fill(lit, litEnds, litTints)
  }

  /** The links' ends moved to where their notes are now, while a layout or a glide moves them. */
  const followLinks = (): void => {
    for (const line of [quiet, lit]) {
      const ends = line.userData.ends as number[] | undefined
      const place = line.geometry.getAttribute('position') as BufferAttribute | undefined
      if (!ends || !place) {
        continue
      }
      ends.forEach((spot, step) => {
        place.array.set(positions.subarray(spot * 3, spot * 3 + 3), step * 3)
      })
      place.needsUpdate = true
    }
  }

  /** Puts the whole graph into the arrays, at the given places in three.js's units. */
  const load = (
    nodes: readonly DrawnNode[],
    next: readonly DrawnLink[],
    places: Float32Array,
  ): void => {
    ids = nodes.map((node) => node.id)
    index = new Map(ids.map((id, spot) => [id, spot]))
    drawnNow = new Map(nodes.map((node) => [node.id, node]))
    crowding = Math.min(Math.max(8 / Math.sqrt(Math.max(ids.length, 1)), 0.25), 1.5)
    sizes = nodes.map((node) => sizeOf(node.size))
    links = next.filter((link) => index.has(link.source) && index.has(link.target))
    positions = places
    points.geometry.setAttribute('position', new BufferAttribute(positions, 3))
    points.geometry.computeBoundingSphere()
    hovered = undefined
    paint()
  }

  const toWorld = (node: GraphPoint & { id?: string }): [number, number, number] => [
    node.x * scale,
    node.y * scale,
    (node.z ?? (node.id ? depthOf(node.id) : 0)) * scale,
  ]

  /* **Notes glide** to places they were moved to: from where each was to where it goes. */
  let morph: { from: Float32Array; start: number; to: Float32Array } | undefined

  /* A layout running, a few ticks a frame. */
  let layout:
    | {
        done: () => void
        limit: number
        nodes: SimulationNode[]
        simulation: ReturnType<typeof forceSimulation>
      }
    | undefined

  /* The view's depth cue, from how near and far the graph is from the camera. */
  const cue = (): void => {
    const distance = camera.position.distanceTo(controls.target)
    const { center, radius } = points.geometry.boundingSphere ?? {
      center: controls.target,
      radius: REACH,
    }
    /* **The camera's depth follows the graph**, which a layout can spread far
       past where it was first drawn: a fixed far plane cut away every note
       beyond it. */
    const nearest = Math.max(distance - radius * 1.5, distance * 0.01)
    const furthest = distance + radius * 1.5
    if (
      Math.abs(camera.near - nearest) > nearest * 0.05 ||
      Math.abs(camera.far - furthest) > furthest * 0.05
    ) {
      camera.near = nearest
      camera.far = furthest
      camera.updateProjectionMatrix()
    }
    uniforms.unit.value = (radius / REACH) * crowding
    uniforms.middle.value = camera.position.distanceTo(center)
    uniforms.radius.value = radius
    uniforms.scale.value =
      renderer.domElement.height / 2 / Math.tan(((camera.fov / 2) * Math.PI) / 180)
    /* Links clear as the reader comes close and faint across the whole graph. */
    const closeness = Math.min(Math.max(1 - distance / (radius * 3), 0), 1)
    const shade = LINKS[dark ? 'dark' : 'light']
    ;(quiet.material.uniforms.opacity as { value: number }).value =
      shade.far + (shade.close - shade.far) * closeness
  }

  let pending = 0
  const tick = (now: number): void => {
    if (stopped) {
      return
    }
    pending = requestAnimationFrame(tick)
    if (glide) {
      const through = Math.min((now - glide.start) / glide.duration, 1)
      const eased = ease(through)
      const target = glide.from.clone().lerp(glide.to, eased)
      const distance = glide.fromDistance + (glide.toDistance - glide.fromDistance) * eased
      const way = camera.position.clone().sub(controls.target).normalize()
      controls.target.copy(target)
      camera.position.copy(target.clone().add(way.multiplyScalar(distance)))
      if (through >= 1) {
        glide = undefined
      }
    }
    if (morph) {
      const through = still ? 1 : Math.min((now - morph.start) / MORPH, 1)
      const eased = ease(through)
      for (let step = 0; step < positions.length; step++) {
        positions[step] =
          (morph.from[step] as number) +
          ((morph.to[step] as number) - (morph.from[step] as number)) * eased
      }
      ;(points.geometry.getAttribute('position') as BufferAttribute).needsUpdate = true
      followLinks()
      if (through >= 1) {
        morph = undefined
        points.geometry.computeBoundingSphere()
      }
    }
    if (layout) {
      const started = performance.now()
      while (
        performance.now() - started < 10 &&
        layout.simulation.alpha() > layout.simulation.alphaMin()
      ) {
        layout.simulation.tick()
      }
      layout.nodes.forEach((node, spot) => {
        positions.set([node.x * scale, node.y * scale, node.z * scale], spot * 3)
      })
      ;(points.geometry.getAttribute('position') as BufferAttribute).needsUpdate = true
      points.geometry.computeBoundingSphere()
      followLinks()
      if (layout.simulation.alpha() <= layout.simulation.alphaMin() || now > layout.limit) {
        layout.done()
      } else if (!moved && !glide) {
        fitAll(0)
      }
    }
    /* Turning by itself only while nobody is on a note or has just let go. */
    controls.autoRotate =
      !still &&
      options.autoRotate !== false &&
      hovered === undefined &&
      selected === undefined &&
      now - handled > REST
    controls.update()
    cue()
    renderer.render(scene, camera)
    groups.draw()
    drawNames()
  }

  /* The drawing is sized to its box, a frame after the box changes, so the
     resize is never made inside the observer's own callback. */
  const resize = (): void => {
    const width = Math.max(container.clientWidth, 1)
    const height = Math.max(container.clientHeight, 1)
    renderer.setSize(width, height, false)
    camera.aspect = width / height
    camera.updateProjectionMatrix()
  }
  let resizing = 0
  const sized = new ResizeObserver(() => {
    cancelAnimationFrame(resizing)
    resizing = requestAnimationFrame(resize)
  })
  sized.observe(container)
  resize()
  pending = requestAnimationFrame(tick)

  controls.addEventListener('start', () => {
    moved = true
    handled = Number.POSITIVE_INFINITY
    glide = undefined
  })
  controls.addEventListener('end', () => {
    handled = performance.now()
  })

  /* **The note under the pointer**, found once a frame at most: a ray from
     the eye through the pointer, wide enough to catch a note's whole body. */
  const raycaster = new Raycaster()
  const pointer = new Vector2()
  let hovering = 0
  const hover = (event: PointerEvent): void => {
    const box = canvas.getBoundingClientRect()
    pointer.set(
      ((event.clientX - box.left) / box.width) * 2 - 1,
      -((event.clientY - box.top) / box.height) * 2 + 1,
    )
    cancelAnimationFrame(hovering)
    hovering = requestAnimationFrame(() => {
      raycaster.setFromCamera(pointer, camera)
      raycaster.params.Points = { threshold: uniforms.unit.value * 2.4 }
      /* A note behind the shape is hidden by it, so the pointer cannot be on it. */
      const front = solid.visible
        ? (raycaster.intersectObject(solid, false)[0]?.distance ?? Number.POSITIVE_INFINITY)
        : Number.POSITIVE_INFINITY
      const hit = raycaster.intersectObject(points, false).find((one) => {
        const id = one.index === undefined ? undefined : ids[one.index]
        return (
          id !== undefined &&
          looks?.node(id).hidden !== true &&
          one.distance < front + uniforms.unit.value * 3
        )
      })
      const next = hit?.index
      if (next !== hovered) {
        hovered = next
        canvas.style.cursor = next === undefined ? '' : 'pointer'
        paint()
      }
    })
  }
  const leave = (): void => {
    if (hovered !== undefined) {
      hovered = undefined
      canvas.style.cursor = ''
      paint()
    }
  }
  canvas.addEventListener('pointermove', hover)
  canvas.addEventListener('pointerleave', leave)

  return {
    center: (id, animate) => {
      const spot = index.get(id)
      if (spot !== undefined) {
        glideTo(at(spot), camera.position.distanceTo(controls.target), animate ? STEP * 2 : 0)
      }
    },
    draw: ({ links: next, nodes }) => {
      const reach = Math.max(
        1e-6,
        ...nodes.map((node) => Math.max(Math.abs(node.x), Math.abs(node.y), Math.abs(node.z ?? 0))),
      )
      scale = REACH / reach
      const places = new Float32Array(nodes.length * 3)
      nodes.forEach((node, spot) => {
        places.set(toWorld(node), spot * 3)
      })
      moved = false
      load(nodes, next, places)
      shapeSolid()
      fitAll(0)
    },
    fit: (fitted, animate) => {
      frame(
        fitted.flatMap((id) => {
          const spot = index.get(id)
          return spot === undefined ? [] : [spot]
        }),
        animate ? STEP * 2 : 0,
      )
    },
    gestures: (next) => {
      held.set(next)
      controls.enabled = next !== 'off'
      /* One finger scrolls the page past a graph that shares its gestures. */
      controls.touches.ONE = next === 'cooperative' ? (null as unknown as TOUCH) : TOUCH.ROTATE
    },
    groups: (next) => {
      if (options.groupLabels !== false) {
        groups.set(next.map((group) => ({ ...group, ids: group.ids.slice(0, SAMPLE) })))
      }
    },
    look: (next) => {
      looks = next
      signals.look(next)
      groups.look(next)
      paint()
    },
    onPress: (press) => {
      let down: { time: number; x: number; y: number } | undefined
      const start = (event: PointerEvent): void => {
        down = { time: performance.now(), x: event.clientX, y: event.clientY }
      }
      const end = (event: PointerEvent): void => {
        const was = down
        down = undefined
        /* A press, where a drag that turned the graph is not one. */
        if (
          was &&
          Math.hypot(event.clientX - was.x, event.clientY - was.y) < 5 &&
          performance.now() - was.time < 500 &&
          hovered !== undefined
        ) {
          const id = ids[hovered]
          if (id !== undefined) {
            press(id)
          }
        }
      }
      canvas.addEventListener('pointerdown', start)
      canvas.addEventListener('pointerup', end)
      return () => {
        canvas.removeEventListener('pointerdown', start)
        canvas.removeEventListener('pointerup', end)
      }
    },
    panBy: (x, y, animate) => {
      /* The pan buttons turn the graph: across by its width, up and down by half its height. */
      const { clientHeight: height, clientWidth: width } = container
      const offset = camera.position.clone().sub(controls.target)
      const turn = new Vector3(0, 1, 0)
      offset.applyAxisAngle(turn, (-x / Math.max(width, 1)) * Math.PI)
      const side = new Vector3().crossVectors(turn, offset).normalize()
      offset.applyAxisAngle(side, (y / Math.max(height, 1)) * (Math.PI / 2))
      const to = controls.target.clone().add(offset)
      if (!animate || still) {
        camera.position.copy(to)
        return
      }
      const from = camera.position.clone()
      const start = performance.now()
      const step = (now: number): void => {
        const through = Math.min((now - start) / STEP, 1)
        camera.position.copy(from.clone().lerp(to, ease(through)))
        if (through < 1 && !stopped) {
          requestAnimationFrame(step)
        }
      }
      requestAnimationFrame(step)
    },
    settle: (unplaced, placed) => {
      /* The notes that have a place keep it, held, while the layout places the rest. */
      const nodes: SimulationNode[] = ids.map((id, spot) => {
        const x = (positions[spot * 3] as number) / scale
        const y = (positions[spot * 3 + 1] as number) / scale
        const z = (positions[spot * 3 + 2] as number) / scale
        return unplaced.has(id) ? { id, x, y, z } : { fx: x, fy: y, fz: z, id, x, y, z }
      })
      const simulation = forceSimulation(nodes, 3)
        .force(
          'link',
          forceLink(links.map((link) => ({ source: link.source, target: link.target })))
            .id((node) => node.id)
            .distance(1.6),
        )
        .force('charge', forceManyBody().strength(-1.2).theta(1.2))
        .force('center', forceCenter(0, 0, 0))
        .alphaDecay(0.03)
        .stop()
      let done = false
      layout = {
        done: () => {
          if (done) {
            return
          }
          done = true
          layout = undefined
          fitAll(STEP * 2)
          placed(new Map(nodes.map((node) => [node.id, { x: node.x, y: node.y, z: node.z }])))
        },
        limit: performance.now() + (options.layoutLimit ?? 10000),
        nodes,
        simulation,
      }
      return () => {
        done = true
        layout = undefined
      }
    },
    shape: (place, frame) => {
      surfaced = place === 'surface'
      if (frame !== shapeFrame) {
        shapeFrame = frame
        solidAt = Number.NaN
      }
      /* Steeply only where there is no solid to hide the far side. */
      uniforms.steep.value = surfaced && !frame ? 1 : 0
    },
    signal: (from, to, colors, animate) => {
      signals.signal(from, to, colors, animate)
    },
    stop: () => {
      stopped = true
      cancelAnimationFrame(pending)
      cancelAnimationFrame(hovering)
      cancelAnimationFrame(resizing)
      sized.disconnect()
      canvas.removeEventListener('pointermove', hover)
      canvas.removeEventListener('pointerleave', leave)
      controls.dispose()
      for (const object of [points, quiet, lit, solid]) {
        object.geometry.dispose()
        object.material.dispose()
      }
      renderer.dispose()
      canvas.remove()
      signals.stop()
      groups.stop()
      names.stop()
      held.stop()
    },
    update: (changes: GraphChanges, animate) => {
      /* The arrays again, every note where it is drawn now, unless the page or a stencil moved it. */
      const kept = new Map<string, { node: DrawnNode; world: [number, number, number] }>()
      ids.forEach((id, spot) => {
        const node = drawnNow.get(id)
        if (node) {
          kept.set(id, {
            node,
            world: [
              positions[spot * 3] as number,
              positions[spot * 3 + 1] as number,
              positions[spot * 3 + 2] as number,
            ],
          })
        }
      })
      for (const id of changes.removeNodes) {
        kept.delete(id)
      }
      let shifted = false
      const goes = new Map<string, [number, number, number]>()
      for (const node of changes.changeNodes) {
        const was = drawnNow.get(node.id)
        const now = kept.get(node.id)
        const moves =
          was !== undefined && (was.x !== node.x || was.y !== node.y || was.z !== node.z)
        shifted ||= moves
        if (moves) {
          goes.set(node.id, toWorld(node))
        }
        kept.set(node.id, { node, world: now?.world ?? toWorld(node) })
      }
      for (const node of changes.addNodes) {
        kept.set(node.id, { node, world: toWorld(node) })
      }
      const removed = new Set(
        changes.removeLinks.map((link) => `${link.source}\u0000${link.target}`),
      )
      const next = [
        ...links.filter((link) => !removed.has(`${link.source}\u0000${link.target}`)),
        ...changes.addLinks,
      ]
      const entries = [...kept.values()]
      const from = new Float32Array(entries.length * 3)
      const to = new Float32Array(entries.length * 3)
      entries.forEach(({ node, world }, spot) => {
        from.set(world, spot * 3)
        to.set(goes.get(node.id) ?? world, spot * 3)
      })
      /* A copy to draw from, since a glide moves the drawn places and not where it started. */
      load(
        entries.map(({ node }) => node),
        next,
        new Float32Array(animate && shifted ? from : to),
      )
      if (animate && shifted) {
        morph = { from, start: performance.now(), to }
      }
      if (shifted) {
        fitAll(animate ? MORPH : 0)
      }
    },
    zoomBy: (direction, animate) => {
      const distance = camera.position.distanceTo(controls.target)
      glideTo(
        controls.target.clone(),
        direction > 0 ? distance / ZOOM : distance * ZOOM,
        animate ? STEP : 0,
      )
    },
  }
}
