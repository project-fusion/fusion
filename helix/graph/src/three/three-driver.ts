import {
  forceCenter,
  forceLink,
  forceManyBody,
  forceSimulation,
  type SimulationNode,
} from 'd3-force-3d'
import {
  AdditiveBlending,
  BoxGeometry,
  BufferAttribute,
  BufferGeometry,
  DoubleSide,
  Euler,
  InstancedBufferAttribute,
  InstancedMesh,
  type InterleavedBufferAttribute,
  Matrix4,
  Mesh,
  NormalBlending,
  OctahedronGeometry,
  PerspectiveCamera,
  Points,
  Quaternion,
  Raycaster,
  Scene,
  ShaderMaterial,
  TOUCH,
  Vector2,
  Vector3,
  WebGLRenderer,
} from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { LineMaterial } from 'three/addons/lines/LineMaterial.js'
import { LineSegments2 } from 'three/addons/lines/LineSegments2.js'
import { LineSegmentsGeometry } from 'three/addons/lines/LineSegmentsGeometry.js'
import { mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js'
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
  type Bend,
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
   * How many pixels the drawing has for each of the page's. By default half
   * as many again as the screen has, at least two and at most three, which
   * smooths every edge. Fewer is faster on a slow GPU.
   */
  density?: number | undefined
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
const LINKS = { dark: { close: 0.16, far: 0.025 }, light: { close: 0.36, far: 0.07 } }

/** How long the graph rests after the reader lets go before it turns again, in milliseconds. */
const REST = 8000

/**
 * How a shape's surface is washed in its notes' colors: how strongly, on a
 * dark ground and a light one; how many notes each corner of it blends;
 * how far it reaches for them, in the spacing of the notes; and how much
 * weight of notes makes the wash whole.
 */
const WASH = { dark: 0.14, full: 1.5, light: 0.18, notes: 6, reach: 3.5 }

/**
 * How strong the halo every note carries is, on a dark ground and a light
 * one: light that falls off the note into the dark, and almost none on a
 * light ground, where a halo would read as a smudge.
 */
const BLOOM = { dark: 0.28, light: 0 }

/** Where the light falls from, fixed in the scene: above, to the left, and in front. */
const LIGHT = new Vector3(-0.4, 0.8, 0.45).normalize()

/** How high a signal's path rises over the shape, as a share of how far it goes. */
const LIFT = 0.42

/** How wide links are drawn, in pixels on screen: all of them, and the ones the reader is on. */
const WIDTH = { lit: 1.8, quiet: 0.8 }

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

/**
 * **A note as an orb of energy**: on a dark ground, a dark glassy body in
 * its color, a rim that glows brighter toward its edge, energy gathering at
 * its middle to a hot point, and a crisp glint where the light fixed in the
 * scene catches it, so the glint moves as the reader turns the graph. On a
 * light ground, where light cannot glow, frosted glass: pale at its middle,
 * its color deepening to a ring at its rim, and the same glint. `n` and `light` are in the view's space, `n` facing
 * the eye at `z` 1. Returns the color and how opaque it is.
 */
// language=GLSL
const ORB = /* glsl */ `
uniform vec3 light;
uniform float dark;

vec4 orb(vec3 base, vec3 n) {
  float diffuse = max(dot(n, light), 0.0);
  float rim = pow(1.0 - clamp(n.z, 0.0, 1.0), 2.2);
  float core = pow(clamp(n.z, 0.0, 1.0), 5.0);
  float glint = pow(max(dot(n, normalize(light + vec3(0.0, 0.0, 1.0))), 0.0), 140.0);
  vec3 energy = base * (0.08 + 0.2 * diffuse);
  energy += base * core * 0.5;
  energy += mix(base, vec3(1.0), 0.6) * pow(clamp(n.z, 0.0, 1.0), 40.0) * 0.55;
  energy += mix(base, vec3(1.0), 0.25) * rim * 1.2;
  energy += vec3(glint * 0.55);
  vec3 frost = mix(base, vec3(1.0), 0.45 * pow(clamp(n.z, 0.0, 1.0), 1.5));
  frost *= 0.86 + 0.14 * diffuse;
  frost = mix(frost, base * 0.78, rim * 0.75);
  frost += vec3(glint * 0.6);
  return dark > 0.5
    ? vec4(energy, mix(0.5, 1.0, max(rim, core)))
    : vec4(frost, mix(0.78, 1.0, rim));
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
uniform float bloom;
uniform float halo;

varying vec4 vTint;
varying float vShape;
varying float vGlow;
varying float vFade;
varying float vRoom;
varying vec3 vCenter;
varying float vRadius;

void main() {
  vec4 view = modelViewMatrix * vec4(position, 1.0);
  gl_Position = projectionMatrix * view;
  float depth = max(-view.z, 0.001);
  /* The halo's pass has room around the note for it, which every note has
     where the ground is dark, and more for a glowing one; the body's pass
     is the note and no more. */
  vRoom = halo > 0.5 ? 1.0 + (bloom > 0.0 ? 0.9 : 0.0) + glow * 1.4 : 1.0;
  /* As large as the note is, at the distance it is: nearer is larger. */
  gl_PointSize = size * unit * scale / depth * vRoom;
  vCenter = view.xyz;
  vRadius = size * unit * 0.5;
  vFade = fade(depth);
  vTint = tint;
  vShape = shape;
  vGlow = glow;
}
`

/**
 * A note's body: **a sphere, worked out for each pixel of its sprite**. The
 * sprite faces the eye, and each pixel inside it finds the point of the
 * sphere under it, its normal, and its depth, which it writes, so notes meet
 * the shape and each other as solids do, and are lit as solids are. A note
 * in another shape is drawn by a mesh, so its sprite draws nothing.
 */
// language=GLSL
const FRAGMENT = /* glsl */ `
uniform mat4 projectionMatrix;
${ORB}
varying vec4 vTint;
varying float vShape;
varying float vFade;
varying vec3 vCenter;
varying float vRadius;

void main() {
  if (vShape > 0.5) discard;
  vec2 q = (gl_PointCoord * 2.0 - 1.0) * vec2(1.0, -1.0);
  float d2 = dot(q, q);
  if (d2 > 1.0) discard;
  vec3 n = vec3(q, sqrt(1.0 - d2));
  vec4 clip = projectionMatrix * vec4(vCenter + n * vRadius, 1.0);
  gl_FragDepth = clip.z / clip.w * 0.5 + 0.5;
  /* Antialiased in the last few percent only, so the glowing rim runs to the edge. */
  float edge = 1.0 - smoothstep(0.965, 1.0, sqrt(d2));
  vec4 lit = orb(vTint.rgb, n);
  float alpha = edge * lit.a * vTint.a * vFade;
  if (alpha < 0.01) discard;
  gl_FragColor = vec4(lit.rgb, alpha);
}
`

/** A note's halo: soft light falling away past its body, drawn after the bodies and hidden where they are. */
// language=GLSL
const HALO_FRAGMENT = /* glsl */ `
uniform float bloom;
varying vec4 vTint;
varying float vShape;
varying float vGlow;
varying float vFade;
varying float vRoom;

void main() {
  vec2 q = (gl_PointCoord * 2.0 - 1.0) * vRoom;
  float d = vShape > 1.5 ? (abs(q.x) + abs(q.y)) * 0.78 : vShape > 0.5 ? max(abs(q.x), abs(q.y)) * 1.08 : length(q);
  /* From just inside the body's edge, under its antialiasing, so no seam of
     dark ground shows between the body and its halo. */
  if (d < 0.965) discard;
  float past = clamp((d - 0.965) / max(vRoom - 0.965, 0.001), 0.0, 1.0);
  float alpha = (bloom + vGlow * 0.6) * pow(1.0 - past, 2.4) * vTint.a * vFade;
  if (alpha < 0.01) discard;
  gl_FragColor = vec4(vTint.rgb, alpha);
}
`

/**
 * A note drawn as a mesh, a cube or an octahedron, one instance a note:
 * **a hologram**, faint faces with fine edges of light, the edges at the
 * back showing through. `frame` says how far a point is from its face's
 * edges, the least of its four numbers.
 */
// language=GLSL
const SHAPE_VERTEX = /* glsl */ `
${FADE}
attribute vec4 tone;
attribute vec4 frame;
varying vec3 vNormal;
varying vec4 vTone;
varying vec4 vFrame;
varying float vFade;

void main() {
  vec4 view = viewMatrix * modelMatrix * instanceMatrix * vec4(position, 1.0);
  gl_Position = projectionMatrix * view;
  vNormal = normalize(normalMatrix * mat3(instanceMatrix) * normal);
  vTone = tone;
  vFrame = frame;
  vFade = fade(max(-view.z, 0.001));
}
`

// language=GLSL
const SHAPE_FRAGMENT = /* glsl */ `
uniform float dark;
varying vec3 vNormal;
varying vec4 vTone;
varying vec4 vFrame;
varying float vFade;

void main() {
  float e = min(min(vFrame.x, vFrame.y), min(vFrame.z, vFrame.w));
  float w = fwidth(e);
  /* The edge as a line about a pixel and a half wide, whatever the size. */
  float line = 1.0 - smoothstep(w * 0.6, w * 2.2, e);
  float inner = exp(-e * 12.0);
  float facing = abs(normalize(vNormal).z);
  vec3 edge = dark > 0.5 ? mix(vTone.rgb, vec3(1.0), 0.35) : vTone.rgb * 0.8;
  vec3 face = vTone.rgb * (dark > 0.5 ? 0.3 + 0.7 * inner : 1.0);
  float faceAlpha = (dark > 0.5 ? 0.1 : 0.16) + 0.3 * inner + 0.12 * (1.0 - facing);
  float alpha = mix(faceAlpha, 1.0, line) * vTone.a * vFade;
  if (alpha < 0.01) discard;
  gl_FragColor = vec4(mix(face, edge, line), alpha);
}
`

// language=GLSL
const SOLID_VERTEX = /* glsl */ `
attribute vec4 wash;
varying vec3 vNormal;
varying vec3 vView;
varying vec4 vWash;

void main() {
  vec4 view = modelViewMatrix * vec4(position, 1.0);
  gl_Position = projectionMatrix * view;
  vNormal = normalize(normalMatrix * normal);
  vView = normalize(-view.xyz);
  vWash = wash;
}
`

// language=GLSL
const SOLID_FRAGMENT = /* glsl */ `
uniform vec3 ground;
uniform vec3 ink;
uniform float strength;
varying vec3 vNormal;
varying vec3 vView;
varying vec4 vWash;

void main() {
  /* **Each region washed in its notes' color**, as a translucent stain on
     the ground's color, and lit: a breath of ink where light from above and
     to the left falls, and the region's own color glowing at the edge
     turning away. Felt more than seen: the notes on it are what is drawn. */
  vec3 normal = normalize(vNormal);
  vec3 view = normalize(vView);
  if (dot(normal, view) < 0.0) normal = -normal;
  float edge = 1.0 - dot(normal, view);
  float lit = max(dot(normal, normalize(vec3(-0.4, 0.8, 0.45))), 0.0);
  float washed = strength * vWash.a;
  vec3 base = mix(ground, vWash.rgb, washed);
  vec3 shaded = mix(base, ink, 0.1 * pow(edge, 2.0) + 0.17 * lit * lit);
  vec3 rim = mix(shaded, vWash.rgb, washed * 1.6 * pow(edge, 3.0));
  gl_FragColor = vec4(rim, 1.0);
}
`

/**
 * A mesh with how far each point is from its face's edges, as the hologram
 * draws them: a box's faces are squares, read off their texture coordinates,
 * and an octahedron's triangles, read off each corner's share.
 */
const framed = (geometry: BufferGeometry): BufferGeometry => {
  const uv = geometry.getAttribute('uv') as BufferAttribute | undefined
  const count = geometry.getAttribute('position').count
  const frame = new Float32Array(count * 4)
  if (geometry.getIndex() && uv) {
    for (let at = 0; at < count; at++) {
      const u = uv.getX(at)
      const v = uv.getY(at)
      frame.set([u, 1 - u, v, 1 - v], at * 4)
    }
  } else {
    for (let at = 0; at < count; at++) {
      const corner = at % 3
      frame.set([corner === 0 ? 1 : 0, corner === 1 ? 1 : 0, corner === 2 ? 1 : 0, 1], at * 4)
    }
  }
  geometry.setAttribute('frame', new BufferAttribute(frame, 4))
  return geometry
}

/** How many passes smooth the way a surface is moved in, and the surface after. */
const SMOOTH = { surface: 3, ways: 6 }

/** Each corner's neighbors on a surface, from its triangles. */
const neighborsOf = (index: BufferAttribute, count: number): Int32Array[] => {
  const sets: Set<number>[] = Array.from({ length: count }, () => new Set())
  for (let at = 0; at < index.count; at += 3) {
    const a = index.getX(at)
    const b = index.getX(at + 1)
    const c = index.getX(at + 2)
    sets[a]?.add(b).add(c)
    sets[b]?.add(a).add(c)
    sets[c]?.add(a).add(b)
  }
  return sets.map((set) => Int32Array.from(set))
}

/** Each corner's three numbers moved `share` of the way toward its neighbors' average: away from it where `share` is below zero. */
const averaged = (
  values: Float32Array<ArrayBufferLike>,
  neighbors: Int32Array[],
  share: number,
): Float32Array<ArrayBufferLike> => {
  const out = new Float32Array(values.length)
  neighbors.forEach((around, at) => {
    let x = 0
    let y = 0
    let z = 0
    for (const other of around) {
      x += values[other * 3] as number
      y += values[other * 3 + 1] as number
      z += values[other * 3 + 2] as number
    }
    const many = around.length || 1
    for (const [axis, sum] of [
      [0, x],
      [1, y],
      [2, z],
    ] as const) {
      const value = values[at * 3 + axis] as number
      out[at * 3 + axis] = around.length ? value + share * (sum / many - value) : value
    }
  })
  return out
}

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
  /* **Drawn finer than the screen and smoothed down**: half as many pixels
     again as the screen has, and never fewer than two for each of the
     page's, so on a screen of one every edge is drawn twice as finely, and
     a dense phone's three are met. A page with a slow GPU asks for fewer. */
  renderer.setPixelRatio(
    options.density ?? Math.min(Math.max((window.devicePixelRatio || 1) * 1.5, 2), 3),
  )
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
    bloom: { value: BLOOM.dark },
    dark: { value: 1 },
    light: { value: new Vector3(-0.4, 0.8, 0.45).normalize() },
    middle: { value: 1 },
    radius: { value: 1 },
    scale: { value: 1 },
    steep: { value: 0 },
    unit: { value: 1 },
  }
  /**
   * A material for links: **lines of a set width with smooth edges**, as
   * meshes, since WebGL draws its own lines a device pixel wide whatever is
   * asked, a hairline on a dense screen that shimmers as the graph turns.
   * They fade behind the graph's middle as its notes do.
   */
  const lines = (opacity: number, width: number): LineMaterial => {
    const material = new LineMaterial({
      depthWrite: false,
      linewidth: width,
      opacity,
      transparent: true,
      vertexColors: true,
    })
    material.onBeforeCompile = (shader) => {
      shader.uniforms.middle = uniforms.middle
      shader.uniforms.radius = uniforms.radius
      shader.uniforms.steep = uniforms.steep
      shader.vertexShader = `${FADE}\nvarying float vLinkFade;\n${shader.vertexShader.replace(
        'vec4 end = modelViewMatrix * vec4( instanceEnd, 1.0 );',
        'vec4 end = modelViewMatrix * vec4( instanceEnd, 1.0 );\nvLinkFade = fade(max(-(position.y < 0.5 ? start.z : end.z), 0.001));',
      )}`
      shader.fragmentShader = `varying float vLinkFade;\n${shader.fragmentShader.replace(
        'gl_FragColor = vec4( diffuseColor.rgb, alpha );',
        'gl_FragColor = vec4( diffuseColor.rgb, alpha * vLinkFade );',
      )}`
    }
    return material
  }
  /* **Notes in two passes**: their bodies, solid, writing their depth, and
     after them their halos, which are light and hide behind what is solid. */
  const points = new Points(
    new BufferGeometry(),
    new ShaderMaterial({
      fragmentShader: FRAGMENT,
      transparent: true,
      uniforms: { ...uniforms, halo: { value: 0 } },
      vertexShader: VERTEX,
    }),
  )
  points.frustumCulled = false
  const halos = new Points(
    points.geometry,
    new ShaderMaterial({
      depthWrite: false,
      fragmentShader: HALO_FRAGMENT,
      transparent: true,
      uniforms: { ...uniforms, halo: { value: 1 } },
      vertexShader: VERTEX,
    }),
  )
  halos.frustumCulled = false
  halos.renderOrder = 1
  /* Notes in another shape, as meshes: a cube for a square, an octahedron for a diamond. */
  const shapeMaterial = new ShaderMaterial({
    depthWrite: false,
    fragmentShader: SHAPE_FRAGMENT,
    side: DoubleSide,
    transparent: true,
    uniforms: {
      dark: uniforms.dark,
      middle: uniforms.middle,
      radius: uniforms.radius,
      steep: uniforms.steep,
    },
    vertexShader: SHAPE_VERTEX,
  })
  const solids = {
    cube: {
      geometry: framed(new BoxGeometry(1.5, 1.5, 1.5)),
      mesh: undefined as InstancedMesh | undefined,
      spots: [] as number[],
    },
    octahedron: {
      geometry: framed(new OctahedronGeometry(1.15)),
      mesh: undefined as InstancedMesh | undefined,
      spots: [] as number[],
    },
  }
  const quiet = new LineSegments2(new LineSegmentsGeometry(), lines(LINKS.dark.far, WIDTH.quiet))
  const lit = new LineSegments2(new LineSegmentsGeometry(), lines(0.9, WIDTH.lit))
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
      uniforms: {
        ground: { value: [0, 0, 0] },
        ink: { value: [1, 1, 1] },
        strength: { value: WASH.dark },
      },
      vertexShader: SOLID_VERTEX,
    }),
  )
  solid.renderOrder = -1
  solid.visible = false
  solid.frustumCulled = false
  scene.add(solid, quiet, lit, points, halos)
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
    const { field } = frame
    /* Below the deepest notes in the shell, so none is cut by the surface it sits on. */
    const inset = frame.shell * 1.15
    /* **The shape's own surface where it came with one**, as a model does,
       which holds every fold; otherwise one made from the field. Moved in
       along the field's own slope, read a cell apart, which is smooth where
       the surface folds: moved along its own normals, a folded surface
       crumples through itself. */
    let geometry = new BufferGeometry()
    if (field.mesh) {
      geometry.setAttribute('position', new BufferAttribute(field.mesh.corners.slice(), 3))
      geometry.setIndex(new BufferAttribute(field.mesh.triangles, 1))
      geometry = mergeVertices(geometry)
      const place = geometry.getAttribute('position') as BufferAttribute
      const count = place.count
      const neighbors = neighborsOf(geometry.getIndex() as BufferAttribute, count)
      /* Which way is in at each corner: the field's slope, read a cell apart,
         and then **smoothed across neighboring corners**, since slopes read
         off a coarse field differ from corner to corner, and a surface moved
         along them comes out jagged. */
      const step = Math.max(field.width, field.height, field.depth) / 64
      let way: Float32Array<ArrayBufferLike> = new Float32Array(count * 3)
      for (let at = 0; at < count; at++) {
        const x = place.getX(at)
        const y = place.getY(at)
        const z = place.getZ(at)
        way[at * 3] = field.distance(x + step, y, z) - field.distance(x - step, y, z)
        way[at * 3 + 1] = field.distance(x, y + step, z) - field.distance(x, y - step, z)
        way[at * 3 + 2] = field.distance(x, y, z + step) - field.distance(x, y, z - step)
      }
      for (let pass = 0; pass < SMOOTH.ways; pass++) {
        way = averaged(way, neighbors, 0.5)
      }
      for (let at = 0; at < count; at++) {
        const length =
          Math.hypot(way[at * 3] as number, way[at * 3 + 1] as number, way[at * 3 + 2] as number) ||
          1
        place.setXYZ(
          at,
          place.getX(at) - ((way[at * 3] as number) / length) * inset,
          place.getY(at) - ((way[at * 3 + 1] as number) / length) * inset,
          place.getZ(at) - ((way[at * 3 + 2] as number) / length) * inset,
        )
      }
      /* **The surface itself smoothed** a few times over, each pass a step
         toward its neighbors and a step back out, so its folds soften and
         it keeps its size. */
      let corners: Float32Array<ArrayBufferLike> = place.array as Float32Array
      for (let pass = 0; pass < SMOOTH.surface; pass++) {
        corners = averaged(averaged(corners, neighbors, 0.5), neighbors, -0.53)
      }
      place.array.set(corners)
    } else {
      const { corners, triangles } = surfaceOf(field, { at: -inset })
      geometry.setAttribute('position', new BufferAttribute(corners, 3))
      geometry.setIndex(new BufferAttribute(triangles, 1))
    }
    const place = geometry.getAttribute('position') as BufferAttribute
    const { depth, height, width } = field
    for (let at = 0; at < place.count; at++) {
      place.setXYZ(
        at,
        (frame.middle.x + (place.getX(at) - width / 2) * frame.scale) * scale,
        (frame.middle.y - (place.getY(at) - height / 2) * frame.scale) * scale,
        (frame.middle.z + (place.getZ(at) - depth / 2) * frame.scale) * scale,
      )
    }
    geometry.computeVertexNormals()
    solid.geometry.dispose()
    solid.geometry = geometry
    solid.visible = true
    tieSurface()
  }

  /* **The notes nearest each corner of the shape's surface**, and how much
     each counts, found once a drawing, so washing the surface in its notes'
     colors on every repaint is a sum and not a search. */
  let washFrom = new Int32Array()
  let washWeight = new Float32Array()
  let noteTints = new Float32Array()
  const tieSurface = (): void => {
    const place = solid.geometry.getAttribute('position') as BufferAttribute | undefined
    if (!solid.visible || !place || ids.length === 0) {
      washFrom = new Int32Array()
      return
    }
    /* How far apart neighboring notes are, from a sample of them. */
    const sample = Math.min(ids.length, 200)
    const nearest: number[] = []
    for (let step = 0; step < sample; step++) {
      const one = Math.floor((step * ids.length) / sample)
      let best = Number.POSITIVE_INFINITY
      for (let other = 0; other < ids.length; other++) {
        if (other !== one) {
          best = Math.min(best, at(one).distanceToSquared(at(other)))
        }
      }
      nearest.push(Math.sqrt(best))
    }
    nearest.sort((one, other) => one - other)
    const reach = (nearest[Math.floor(nearest.length / 2)] ?? 1) * WASH.reach
    /* The notes by cell of a grid as wide as the reach. */
    const cells = new Map<string, number[]>()
    const key = (x: number, y: number, z: number): string =>
      `${Math.floor(x / reach)},${Math.floor(y / reach)},${Math.floor(z / reach)}`
    for (let spot = 0; spot < ids.length; spot++) {
      const k = key(
        positions[spot * 3] as number,
        positions[spot * 3 + 1] as number,
        positions[spot * 3 + 2] as number,
      )
      const list = cells.get(k)
      if (list) {
        list.push(spot)
      } else {
        cells.set(k, [spot])
      }
    }
    washFrom = new Int32Array(place.count * WASH.notes).fill(-1)
    washWeight = new Float32Array(place.count * WASH.notes)
    const best = new Float32Array(WASH.notes)
    const which = new Int32Array(WASH.notes)
    for (let corner = 0; corner < place.count; corner++) {
      const x = place.getX(corner)
      const y = place.getY(corner)
      const z = place.getZ(corner)
      best.fill(Number.POSITIVE_INFINITY)
      which.fill(-1)
      const cx = Math.floor(x / reach)
      const cy = Math.floor(y / reach)
      const cz = Math.floor(z / reach)
      for (let dx = -1; dx <= 1; dx++) {
        for (let dy = -1; dy <= 1; dy++) {
          for (let dz = -1; dz <= 1; dz++) {
            for (const spot of cells.get(`${cx + dx},${cy + dy},${cz + dz}`) ?? []) {
              const far =
                ((positions[spot * 3] as number) - x) ** 2 +
                ((positions[spot * 3 + 1] as number) - y) ** 2 +
                ((positions[spot * 3 + 2] as number) - z) ** 2
              if (far < (best[WASH.notes - 1] as number)) {
                let slot = WASH.notes - 1
                while (slot > 0 && (best[slot - 1] as number) > far) {
                  best[slot] = best[slot - 1] as number
                  which[slot] = which[slot - 1] as number
                  slot -= 1
                }
                best[slot] = far
                which[slot] = spot
              }
            }
          }
        }
      }
      for (let slot = 0; slot < WASH.notes; slot++) {
        washFrom[corner * WASH.notes + slot] = which[slot] as number
        /* Falling away smoothly with distance, to nothing at the reach. */
        const far = Math.sqrt(best[slot] as number) / reach
        washWeight[corner * WASH.notes + slot] = far < 1 ? (1 - far * far) ** 2 : 0
      }
    }
    washSurface()
  }

  /** The surface's wash: each corner the weighted blend of its nearest notes' colors, and how much of it there is. */
  const washSurface = (): void => {
    const place = solid.geometry.getAttribute('position') as BufferAttribute | undefined
    if (!place || washFrom.length !== place.count * WASH.notes || noteTints.length === 0) {
      return
    }
    const wash = new Float32Array(place.count * 4)
    for (let corner = 0; corner < place.count; corner++) {
      let red = 0
      let green = 0
      let blue = 0
      let total = 0
      for (let slot = 0; slot < WASH.notes; slot++) {
        const spot = washFrom[corner * WASH.notes + slot] as number
        const weight =
          (washWeight[corner * WASH.notes + slot] as number) * (noteTints[spot * 4 + 3] ?? 0)
        if (spot < 0 || weight <= 0) {
          continue
        }
        red += (noteTints[spot * 4] as number) * weight
        green += (noteTints[spot * 4 + 1] as number) * weight
        blue += (noteTints[spot * 4 + 2] as number) * weight
        total += weight
      }
      if (total > 0) {
        wash.set(
          [red / total, green / total, blue / total, Math.min(total / WASH.full, 1)],
          corner * 4,
        )
      }
    }
    solid.geometry.setAttribute('wash', new BufferAttribute(wash, 4))
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
  /* **A signal arcs over the shape**: its path rises from the middle of the
     graph out, as far as a share of how far it goes, so a signal between two
     notes on a brain runs over it and not through it. */
  const arc: Bend = (from, to) => {
    const one = index.get(from)
    const other = index.get(to)
    if (one === undefined || other === undefined) {
      return undefined
    }
    const a = at(one)
    const b = at(other)
    const middle = a.clone().add(b).multiplyScalar(0.5)
    const center = points.geometry.boundingSphere?.center ?? controls.target
    const out = middle.clone().sub(center)
    if (out.lengthSq() < 1e-9) {
      out.copy(camera.up)
    }
    /* Twice the rise, since a curve only reaches half way to the point it bends toward. */
    const peak = middle.add(out.normalize().multiplyScalar(a.distanceTo(b) * LIFT * 2))
    const depth = peak.clone().applyMatrix4(camera.matrixWorldInverse).z
    if (depth > 0) {
      return undefined
    }
    peak.project(camera)
    const { clientHeight: height, clientWidth: width } = container
    return { x: ((peak.x + 1) / 2) * width, y: ((1 - peak.y) / 2) * height }
  }
  /* Drawn only between notes in view, where the shape hides the far side. */
  const signals = signalsOver(container, (id) => nearOnScreen(id), arc)
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
    noteTints = tints
    washSurface()
    geometry.setAttribute('size', new BufferAttribute(drawn, 1))
    geometry.setAttribute('shape', new BufferAttribute(shapes, 1))
    geometry.setAttribute('glow', new BufferAttribute(glows, 1))
    drawnSizes = drawn
    meshShapes(shapes, tints)
    dark = !isLight(looks.ground)
    const solidUniforms = solid.material.uniforms as Record<string, { value: number[] }>
    ;(solidUniforms.ground as { value: number[] }).value = channels(looks.ground)
    ;(solidUniforms.ink as { value: number[] }).value = channels(looks.ink)
    ;(solid.material.uniforms.strength as { value: number }).value = dark ? WASH.dark : WASH.light
    uniforms.bloom.value = dark ? BLOOM.dark : BLOOM.light
    uniforms.dark.value = dark ? 1 : 0
    /* Bodies are solid and painted; light, the halos and links, adds up on a dark ground. */
    const blending = dark ? AdditiveBlending : NormalBlending
    halos.material.blending = blending
    shapeMaterial.blending = blending
    shapeMaterial.needsUpdate = true
    quiet.material.blending = blending
    lit.material.blending = blending
    halos.material.needsUpdate = true
    quiet.material.needsUpdate = true
    lit.material.needsUpdate = true
    paintLinks()
  }

  /* The notes drawn as meshes, by shape, each instance one note. */
  let drawnSizes = new Float32Array()
  const meshShapes = (shapes: Float32Array, tints: Float32Array): void => {
    for (const [code, solidShape] of [
      [SHAPES.square, solids.cube],
      [SHAPES.diamond, solids.octahedron],
    ] as const) {
      const spots: number[] = []
      shapes.forEach((shape, spot) => {
        if (shape === code) {
          spots.push(spot)
        }
      })
      solidShape.spots = spots
      if (!solidShape.mesh || solidShape.mesh.count !== spots.length) {
        if (solidShape.mesh) {
          scene.remove(solidShape.mesh)
          solidShape.mesh.dispose()
        }
        solidShape.mesh =
          spots.length > 0
            ? new InstancedMesh(solidShape.geometry, shapeMaterial, spots.length)
            : undefined
        if (solidShape.mesh) {
          solidShape.mesh.frustumCulled = false
          scene.add(solidShape.mesh)
        }
      }
      const mesh = solidShape.mesh
      if (mesh) {
        const tone = new Float32Array(spots.length * 4)
        spots.forEach((spot, at) => {
          tone.set(tints.subarray(spot * 4, spot * 4 + 4), at * 4)
        })
        mesh.geometry = solidShape.geometry
        mesh.geometry.setAttribute('tone', new InstancedBufferAttribute(tone, 4))
      }
    }
    placeShapes()
  }

  /* Each mesh where its note is and as large, turned a little of its own so
     a field of cubes is not a grid. */
  const turned = new Quaternion()
  const placed = new Matrix4()
  const where = new Vector3()
  const scaled = new Vector3()
  const placeShapes = (): void => {
    for (const solidShape of [solids.cube, solids.octahedron]) {
      const mesh = solidShape.mesh
      if (!mesh) {
        continue
      }
      solidShape.spots.forEach((spot, at) => {
        const size = (drawnSizes[spot] ?? 1) * uniforms.unit.value * 0.5
        const twist = depthOf(ids[spot] ?? '')
        turned.setFromEuler(new Euler(0.45 + twist * 0.3, 0.6 + twist, 0.2 * twist))
        where.set(
          positions[spot * 3] as number,
          positions[spot * 3 + 1] as number,
          positions[spot * 3 + 2] as number,
        )
        scaled.setScalar(size)
        mesh.setMatrixAt(at, placed.compose(where, turned, scaled))
      })
      mesh.instanceMatrix.needsUpdate = true
    }
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
    const fill = (line: LineSegments2, ends: number[], tints: number[]): void => {
      const place = new Float32Array(ends.length * 3)
      ends.forEach((spot, step) => {
        place.set(positions.subarray(spot * 3, spot * 3 + 3), step * 3)
      })
      line.geometry.dispose()
      line.geometry = new LineSegmentsGeometry()
      if (ends.length > 0) {
        line.geometry.setPositions(place)
        line.geometry.setColors(tints)
      }
      line.userData.ends = ends
    }
    fill(quiet, quietEnds, quietTints)
    fill(lit, litEnds, litTints)
  }

  /** The links' ends moved to where their notes are now, while a layout or a glide moves them. */
  const followLinks = (): void => {
    for (const line of [quiet, lit]) {
      const ends = line.userData.ends as number[] | undefined
      const place = line.geometry.getAttribute('instanceStart') as
        | InterleavedBufferAttribute
        | undefined
      if (!ends || !place) {
        continue
      }
      /* Start and end are read from one buffer, six numbers a link. */
      const array = place.data.array as Float32Array
      ends.forEach((spot, step) => {
        array.set(positions.subarray(spot * 3, spot * 3 + 3), step * 3)
      })
      place.data.needsUpdate = true
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
    /* The notes moved, so the surface's wash is tied to them again. */
    if (solid.visible) {
      tieSurface()
    }
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
    /* The light is fixed in the scene, so it turns against the view as the reader turns the graph. */
    camera.updateMatrixWorld()
    uniforms.light.value.copy(LIGHT).transformDirection(camera.matrixWorldInverse)
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
    quiet.material.opacity = shade.far + (shade.close - shade.far) * closeness
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
    if (solids.cube.mesh || solids.octahedron.mesh) {
      placeShapes()
    }
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
  /** The note under a point of the page, or undefined where there is none. */
  const noteAt = (clientX: number, clientY: number): number | undefined => {
    const box = canvas.getBoundingClientRect()
    pointer.set(
      ((clientX - box.left) / box.width) * 2 - 1,
      -((clientY - box.top) / box.height) * 2 + 1,
    )
    raycaster.setFromCamera(pointer, camera)
    raycaster.params.Points = { threshold: uniforms.unit.value * 2.4 }
    /* A note behind the shape is hidden by it, so the pointer cannot be on it. */
    const front = solid.visible
      ? (raycaster.intersectObject(solid, false)[0]?.distance ?? Number.POSITIVE_INFINITY)
      : Number.POSITIVE_INFINITY
    return raycaster.intersectObject(points, false).find((one) => {
      const id = one.index === undefined ? undefined : ids[one.index]
      return (
        id !== undefined &&
        looks?.node(id).hidden !== true &&
        one.distance < front + uniforms.unit.value * 3
      )
    })?.index
  }
  const hover = (event: PointerEvent): void => {
    const { clientX, clientY } = event
    cancelAnimationFrame(hovering)
    hovering = requestAnimationFrame(() => {
      const next = noteAt(clientX, clientY)
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
        /* A press, where a drag that turned the graph is not one: on the
           note under it, found now, since a finger has no hover before it;
           or, on no note, a press away. */
        if (
          was &&
          Math.hypot(event.clientX - was.x, event.clientY - was.y) < 5 &&
          performance.now() - was.time < 500
        ) {
          const spot = noteAt(event.clientX, event.clientY)
          press(spot === undefined ? undefined : ids[spot])
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
      for (const solidShape of [solids.cube, solids.octahedron]) {
        solidShape.mesh?.dispose()
        solidShape.geometry.dispose()
      }
      shapeMaterial.dispose()
      halos.material.dispose()
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
