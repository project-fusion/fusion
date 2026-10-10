import type { CSSProperties, ReactNode } from 'react'

/**
 * The pictures on the tiles in the Helix band: five scenes in one isometric
 * projection.
 *
 * Each obeys the gallery's `system.md` where it can: every color is a semantic
 * token through the `art*` classes, nothing moves at rest, and one motion
 * archetype per picture. Where it departs is depth. A gallery drawing is card
 * art, flat and framed, and on a band of five the frame is the card. These are
 * product shots instead: each subject stands on or over a plate, in the one
 * projection, so the five read as one set of objects lit from the same side.
 *
 * In the site and not in the gallery, because the gallery is one drawing per
 * family and `fusion x prose` holds that list equal to the catalog in both
 * directions. A picture of a page on this site is this site's content.
 *
 * **One brand mark in each, and the rest is ink.** The gallery is monotone
 * because color there only ever said "this one is emphasized". A product shot
 * of a design system themed from your brand color shows the color: on the one
 * control that takes it, the route on the map, the note that is selected, and
 * the palette the theme builder computes. The marks are the primary tokens,
 * through the `artBrand*` classes in `site-nav.module.css`.
 *
 * **Shading is colorless.** A face turned away from the light is darkened by
 * black at an opacity, and a sphere's highlight is white at an opacity, so one
 * set of overlays shades ink and brand alike in either mode. These two are the
 * only non-token fills in the file, and they carry no color of their own.
 */

/**
 * Whether a scene stands on a plate. Off, the objects float on the band, and
 * the ground is only implied, by shadows and by the projection itself.
 */
const PLATES = false

/*
 * The camera. `yaw` turns the ground under it, in degrees, so that `x` runs
 * right and away from the viewer and `y` runs right and toward them; `pitch`
 * is how far above the ground it looks, 90 being straight down; `focal` is
 * the distance to the viewer, and `Infinity` is no perspective at all, every
 * parallel line staying parallel. A yaw of 45 and a pitch of 35.264 with no
 * perspective is the isometric projection, where a point at `x, y, z` lands at
 * `(x + y) * 0.866, (y - x) * 0.5 - z`.
 */
const CAMERA = { focal: Number.POSITIVE_INFINITY, pitch: 42, yaw: 30 }

/*
 * The projection. A point at `x, y, z` on the ground lands at a screen point
 * from the scene's origin, which sits at 160, 110 of the gallery's 320 by 200
 * canvas, and carries `k`, how much nearer things are drawn larger by, which
 * is 1 without perspective. So a row of things along `x` reads left to right
 * and recedes, the way a line of text on a desk does from a chair. Every
 * scene is drawn at round numbers on an 80 by 80 ground and scaled up a fifth
 * by `Scene` to fill the tile's crop.
 */
const iso = (x: number, y: number, z: number) => {
  const yaw = (CAMERA.yaw * Math.PI) / 180
  const pitch = (CAMERA.pitch * Math.PI) / 180
  /* Across the screen, and toward the viewer along the ground. */
  const u = x * Math.cos(yaw) + y * Math.sin(yaw)
  const v = -x * Math.sin(yaw) + y * Math.cos(yaw)
  /* How far toward the viewer, along the line of sight. */
  const depth = v * Math.cos(pitch) + z * Math.sin(pitch)
  const k = Number.isFinite(CAMERA.focal) ? CAMERA.focal / (CAMERA.focal - depth) : 1
  /* 1.2247 is what makes the isometric case the classic one, with a unit of
     height drawn as a unit on screen. */
  const scale = 1.2247 * k
  return {
    k,
    x: 160 + u * scale,
    y: 110 + (v * Math.sin(pitch) - z * Math.cos(pitch)) * scale,
  }
}

const points = (list: { x: number; y: number }[]) => list.map((p) => `${p.x},${p.y}`).join(' ')

/**
 * A box on the ground: a rectangle `w` along `x` and `d` along `y` at `x, y`,
 * raised `h`. Its top wears the class given, and the two faces toward the
 * viewer, the one at the near end of `x` and the one at the far end of `y`,
 * are the same fill under a colorless shade. The left one is lighter because
 * the light is at the top left.
 */
function Box({
  className,
  d,
  fillOpacity,
  h,
  shadow = false,
  w,
  x,
  y,
  z = 0,
}: {
  className: string
  d: number
  fillOpacity?: number
  h: number
  /**
   * The gallery's drop shadow under it, for a solid object standing on the
   * ground the projection implies: with no plate to stand on, the shadow is
   * what says the object has a ground at all.
   */
  shadow?: boolean
  w: number
  x: number
  y: number
  /** The height of its base, where it stands on something other than the ground. */
  z?: number
}) {
  const a = iso(x, y, z + h)
  const b = iso(x + w, y, z + h)
  const c = iso(x + w, y + d, z + h)
  const dd = iso(x, y + d, z + h)
  const a0 = iso(x, y, z)
  const c0 = iso(x + w, y + d, z)
  const d0 = iso(x, y + d, z)
  const left = points([a, dd, d0, a0])
  const right = points([dd, c, c0, d0])
  return (
    <g filter={shadow ? 'url(#helixArtShadow)' : undefined}>
      <polygon className={className} fillOpacity={fillOpacity} points={left} />
      <polygon fill="#000" fillOpacity="0.12" points={left} />
      <polygon className={className} fillOpacity={fillOpacity} points={right} />
      <polygon fill="#000" fillOpacity="0.3" points={right} />
      <polygon className={className} fillOpacity={fillOpacity} points={points([a, b, c, dd])} />
    </g>
  )
}

/**
 * The plate a scene stands on: 80 by 80, 6 thick, with the gallery's shadow
 * under it so it floats on the band. Nothing while `PLATES` is off.
 */
function Plate() {
  if (!PLATES) {
    return null
  }
  const top = points([iso(-40, -40, 0), iso(40, -40, 0), iso(40, 40, 0), iso(-40, 40, 0)])
  return (
    <>
      <g filter="url(#helixArtShadow)">
        <polygon className="artSurface" points={top} />
      </g>
      <polygon
        className="artInk"
        fillOpacity="0.12"
        points={points([iso(-40, -40, 0), iso(-40, 40, 0), iso(-40, 40, -6), iso(-40, -40, -6)])}
      />
      <polygon
        className="artInk"
        fillOpacity="0.28"
        points={points([iso(-40, 40, 0), iso(40, 40, 0), iso(40, 40, -6), iso(-40, 40, -6)])}
      />
      <polygon className="artSurface" points={top} />
      <polygon className="artEdge" points={top} />
    </>
  )
}

/**
 * A flat mark lying on a surface at height `z`: a rectangle on the ground,
 * projected, which is how a bar of text or a label reads on a plate.
 */
function Flat({
  className,
  d,
  fillOpacity,
  w,
  x,
  y,
  z,
}: {
  className: string
  d: number
  fillOpacity?: number
  w: number
  x: number
  y: number
  z: number
}) {
  return (
    <polygon
      className={className}
      fillOpacity={fillOpacity}
      points={points([iso(x, y, z), iso(x + w, y, z), iso(x + w, y + d, z), iso(x, y + d, z)])}
    />
  )
}

/**
 * A mark standing up: a rectangle in the plane across `x`, facing the
 * viewer's left, from `y` to `y + d` along the ground and from `z` to
 * `z + h` up. It is how a line of code reads on a slab stood on its edge.
 */
function Wall({
  className,
  d,
  fillOpacity,
  h,
  x,
  y,
  z,
}: {
  className: string
  d: number
  fillOpacity?: number
  h: number
  x: number
  y: number
  z: number
}) {
  return (
    <polygon
      className={className}
      fillOpacity={fillOpacity}
      points={points([iso(x, y, z), iso(x, y + d, z), iso(x, y + d, z + h), iso(x, y, z + h)])}
    />
  )
}

/**
 * A sphere: a circle under a white specular at the top left and a dark rim
 * at the edge, both colorless, so one pair shades ink and brand in either
 * mode. On a plate it casts a shadow on the ground and stands on a stem,
 * which is what makes its height read. Floating, it has neither.
 */
function Sphere({
  className,
  fillOpacity,
  glow,
  r: size,
  x,
  y,
  z,
}: {
  className: string
  fillOpacity?: number
  glow?: boolean
  r: number
  x: number
  y: number
  z: number
}) {
  const at = iso(x, y, z)
  const foot = iso(x, y, 0)
  /* Nearer is larger, by the projection's own factor. */
  const r = size * at.k
  return (
    <g>
      {PLATES && (
        <>
          <ellipse
            className="artInk"
            cx={foot.x}
            cy={foot.y}
            fillOpacity="0.12"
            rx={r + 1}
            ry={(r + 1) / 2}
          />
          <line
            className="artStroke"
            strokeOpacity="0.12"
            x1={foot.x}
            x2={at.x}
            y1={foot.y}
            y2={at.y + r}
          />
        </>
      )}
      {glow && (
        <circle
          className={className}
          cx={at.x}
          cy={at.y}
          fillOpacity="0.45"
          filter="url(#helixGlow)"
          r={r + 6}
        />
      )}
      <circle className={className} cx={at.x} cy={at.y} fillOpacity={fillOpacity} r={r} />
      <circle cx={at.x} cy={at.y} fill="url(#helixSphereRim)" r={r} />
      <circle cx={at.x} cy={at.y} fill="url(#helixSphereLight)" r={r} />
    </g>
  )
}

/**
 * A scene, scaled up a quarter about its center so the plate fills the crop,
 * with the gradients and filters every scene may use. Defs inside a group are
 * valid SVG and resolve within the tile's own `<svg>`.
 */
function Scene({
  children,
  dx = 0,
  dy = 0,
  scale = 1.2,
}: {
  children: ReactNode
  /** Right by this much after scaling, to center the drawn bounds in the crop. */
  dx?: number
  /** Down by this much after scaling, to center the drawn bounds in the crop. */
  dy?: number
  /** The scale that brings the drawn bounds to the width the others have. */
  scale?: number
}) {
  return (
    <>
      <defs>
        <radialGradient cx="0.35" cy="0.3" id="helixSphereLight" r="0.65">
          <stop offset="0" stopColor="#fff" stopOpacity="0.6" />
          <stop offset="1" stopColor="#fff" stopOpacity="0" />
        </radialGradient>
        <radialGradient cx="0.5" cy="0.5" id="helixSphereRim" r="0.5">
          <stop offset="0.6" stopColor="#000" stopOpacity="0" />
          <stop offset="1" stopColor="#000" stopOpacity="0.35" />
        </radialGradient>
        <filter height="300%" id="helixGlow" width="300%" x="-100%" y="-100%">
          <feGaussianBlur stdDeviation="5" />
        </filter>
      </defs>
      <g transform={`translate(${160 + dx} ${105 + dy}) scale(${scale}) translate(-160 -105)`}>
        {children}
      </g>
    </>
  )
}

/**
 * The component catalog: six keys on a board, one control each, the way the
 * gallery lays its cards out in a grid. Three along `x`, so a row reads left
 * to right, and two rows along `y`. The button's key is the brand, since the
 * primary button is the control that takes the color. The keys arrive in
 * reading order on hover, as the gallery's rows do.
 */
const componentsArt: ReactNode = (
  <Scene dy={-4} scale={1.25}>
    <Plate />
    {[
      /* A button: the key itself is the control. */
      { brand: true, mark: 'bar', x: -38, y: -36 },
      /* A switch, on: a track with its knob at the end. */
      { mark: 'knob', x: -10, y: -36 },
      /* A checkbox, checked. */
      { mark: 'tick', x: 18, y: -36 },
      /* A field. */
      { mark: 'field', x: -38, y: 6 },
      /* A tag. */
      { mark: 'tag', x: -10, y: 6 },
      /* An avatar. */
      { mark: 'dot', x: 18, y: 6 },
    ].map((key, index) => (
      <g className="artMotion artRow" key={key.mark} style={{ '--art-i': index } as CSSProperties}>
        <Box
          className={key.brand ? 'artBrand' : 'artRaised'}
          d={22}
          h={7}
          shadow
          w={20}
          x={key.x}
          y={key.y}
        />
        {key.mark === 'bar' && (
          <Flat className="artOnBrand" d={4} w={10} x={key.x + 5} y={key.y + 9} z={6} />
        )}
        {key.mark === 'knob' && (
          <>
            <Flat className="artSolid" d={8} w={14} x={key.x + 3} y={key.y + 7} z={6} />
            <Flat className="artOnSolid" d={6} w={6} x={key.x + 10} y={key.y + 8} z={6} />
          </>
        )}
        {key.mark === 'tick' && (
          <>
            <Flat className="artSolid" d={10} w={10} x={key.x + 5} y={key.y + 6} z={6} />
            <Flat className="artOnSolid" d={2} w={6} x={key.x + 7} y={key.y + 10} z={6} />
          </>
        )}
        {key.mark === 'field' && (
          <>
            <Flat className="artSurface" d={8} w={16} x={key.x + 2} y={key.y + 7} z={6} />
            <Flat
              className="artInk"
              d={3}
              fillOpacity={0.28}
              w={8}
              x={key.x + 4}
              y={key.y + 9.5}
              z={6}
            />
          </>
        )}
        {key.mark === 'tag' && (
          <>
            <Flat
              className="artInk"
              d={8}
              fillOpacity={0.12}
              w={14}
              x={key.x + 3}
              y={key.y + 7}
              z={6}
            />
            <Flat
              className="artInk"
              d={2.5}
              fillOpacity={0.55}
              w={7}
              x={key.x + 6}
              y={key.y + 10}
              z={6}
            />
          </>
        )}
        {key.mark === 'dot' && (
          <>
            <Sphere
              className="artInk"
              fillOpacity={0.4}
              r={3.5}
              x={key.x + 7}
              y={key.y + 11}
              z={10}
            />
            <Flat
              className="artInk"
              d={2.5}
              fillOpacity={0.55}
              w={6}
              x={key.x + 12}
              y={key.y + 10}
              z={6}
            />
          </>
        )}
      </g>
    ))}
  </Scene>
)

/**
 * The sandbox: the source stood on its edge, and what it renders standing on
 * the ground in front of it. The slab is a screen of code, in the inverse
 * plate with the lines knocked out of it, so it is the one dark object in
 * the light band and the one light object in the dark one. The rendered
 * control is a raised key with a bar on it, in ink: the sandbox is a tool,
 * and the themed button one tile over already says what a themed control
 * looks like. The control lifts on hover, as the gallery's does.
 */
const CODE_LINES = [
  { from: -34, to: -6, z: 30 },
  { from: -30, to: -14, z: 24 },
  { from: -34, to: 0, z: 18 },
  { from: -30, to: -18, z: 12 },
  { from: -34, to: -10, z: 6 },
]

const sandboxArt: ReactNode = (
  <Scene dx={-15} dy={8} scale={1.41}>
    <Box className="artSolid" d={72} h={36} shadow w={6} x={-16} y={-40} />
    {CODE_LINES.map((line) => (
      <Wall
        className="artOnSolid"
        d={line.to - line.from}
        fillOpacity={0.55}
        h={3}
        key={line.z}
        x={-16}
        y={line.from}
        z={line.z}
      />
    ))}
    <g className="artMotion artLift">
      <ellipse
        className="artInk"
        cx={iso(24, 24, 0).x}
        cy={iso(24, 24, 0).y}
        fillOpacity="0.12"
        rx="22"
        ry="11"
      />
      <g className="artLiftShadow" filter="url(#helixArtShadow)">
        <Box className="artRaised" d={18} h={6} w={26} x={10} y={14} />
      </g>
      <Box className="artRaised" d={18} h={6} w={26} x={10} y={14} />
      <Flat className="artSolid" d={4} w={12} x={17} y={21} z={6} />
    </g>
  </Scene>
)

/**
 * The theme builder: the brand color in, and the palette out. The input is
 * a block of the brand standing in front; the output is a stack of chips
 * rising behind it, fanned a little as they go up, from the inverse plate at
 * the bottom through the darks, the primary and its tints, to the sunken
 * ground at the top. A palette is a stack of paint chips, and lighter is
 * higher. The chips arrive in order on hover, the palette being computed
 * step by step.
 */
const CHIPS = [
  { className: 'artSolid', tone: 'inverse' },
  { className: 'artInk', fillOpacity: 0.55, tone: 'ink' },
  { className: 'artInk', fillOpacity: 0.28, tone: 'ink-light' },
  { className: 'artBrand', tone: 'primary' },
  { className: 'artBrandMuted', tone: 'muted' },
  { className: 'artBrandSubtle', tone: 'subtle' },
  { className: 'artSunken', tone: 'sunken' },
]

const themeArt: ReactNode = (
  <Scene dy={13} scale={1.26}>
    {CHIPS.map((chip, index) => (
      <g className="artMotion artRow" key={chip.tone} style={{ '--art-i': index } as CSSProperties}>
        <Box
          className={chip.className}
          d={34}
          fillOpacity={chip.fillOpacity}
          h={2.4}
          shadow={index === 0}
          w={58}
          x={-14 + index * 1.5}
          y={-30 - index * 1.5}
          z={index * 2.9}
        />
      </g>
    ))}
    <Box className="artBrand" d={20} h={20} shadow w={20} x={-44} y={-4} />
  </Scene>
)

/**
 * Maps: a few roads at the lightest ink, the route drawn across them in the
 * brand, and a pin standing at the end of the route. No sheet under them: the
 * roads are a fragment of a network, lying on the ground the projection
 * implies, and the route and the pin's shadow say where that ground is. The
 * pin is the place, and it is the one thing with height, so it is what lifts
 * on hover.
 */
const PIN = { x: 30, y: -16 }

/* Roads as flat strips on the ground: `along` is the axis each runs on, and
   `from` to `to` is its extent on that axis. A main road the whole way along
   `x`, two crossing it along `y`, and two shorter ones joining those. */
const ROADS: { along: 'x' | 'y'; at: number; from: number; to: number }[] = [
  { along: 'x', at: -14, from: -40, to: 40 },
  { along: 'y', at: -20, from: -40, to: 40 },
  { along: 'y', at: 12, from: -40, to: 40 },
  { along: 'x', at: 18, from: -40, to: 40 },
  { along: 'x', at: -34, from: 12, to: 40 },
]

const mapArt: ReactNode = (
  <Scene dy={-4} scale={1.4}>
    {ROADS.map((road) => (
      <Flat
        className="artInk"
        d={road.along === 'x' ? 5 : road.to - road.from}
        fillOpacity={0.28}
        key={`${road.along}${road.at}`}
        w={road.along === 'x' ? road.to - road.from : 5}
        x={road.along === 'x' ? road.from : road.at}
        y={road.along === 'x' ? road.at : road.from}
        z={0}
      />
    ))}
    {/* The route, as a polyline of ground points from the near left corner
        to the pin at the back right. */}
    <polyline
      className="artBrandStroke"
      fill="none"
      points={points([
        iso(-40, 10, 0),
        iso(-22, 4, 0),
        iso(-6, 14, 0),
        iso(8, 2, 0),
        iso(18, -10, 0),
        iso(PIN.x, PIN.y, 0),
      ])}
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="3"
    />
    <g className="artMotion artLift">
      <ellipse
        className="artInk"
        cx={iso(PIN.x, PIN.y, 0).x}
        cy={iso(PIN.x, PIN.y, 0).y}
        fillOpacity="0.12"
        rx="6"
        ry="3"
      />
      <line
        className="artStroke"
        strokeOpacity="0.28"
        strokeWidth="2"
        x1={iso(PIN.x, PIN.y, 0).x}
        x2={iso(PIN.x, PIN.y, 0).x}
        y1={iso(PIN.x, PIN.y, 0).y}
        y2={iso(PIN.x, PIN.y, 16).y}
      />
      <circle
        className="artBrand"
        cx={iso(PIN.x, PIN.y, 20).x}
        cy={iso(PIN.x, PIN.y, 20).y}
        r={6 * iso(PIN.x, PIN.y, 20).k}
      />
      <circle
        cx={iso(PIN.x, PIN.y, 20).x}
        cy={iso(PIN.x, PIN.y, 20).y}
        fill="url(#helixSphereRim)"
        r={6 * iso(PIN.x, PIN.y, 20).k}
      />
      <circle
        cx={iso(PIN.x, PIN.y, 20).x}
        cy={iso(PIN.x, PIN.y, 20).y}
        fill="url(#helixSphereLight)"
        r={6 * iso(PIN.x, PIN.y, 20).k}
      />
    </g>
  </Scene>
)

/**
 * Graph: the notes as spheres standing over the plate, linked, with one
 * selected. Graph draws in 3D, so this is the scene with the most height in
 * it. The selected note is the brand with a soft glow behind it, and its
 * links are the ones that draw outward on hover. Drawn back to front, so a
 * nearer sphere covers a farther link.
 */
const NOTES = {
  a: { r: 7, selected: true, x: 0, y: 0, z: 20 },
  b: { r: 5, x: -36, y: -16, z: 12 },
  c: { r: 6, x: 30, y: -36, z: 16 },
  d: { r: 5, x: 38, y: 18, z: 8 },
  e: { r: 5.5, x: -16, y: 38, z: 18 },
  f: { r: 4.5, x: -40, y: 28, z: 6 },
}

type Note = keyof typeof NOTES

const QUIET_LINKS: [Note, Note][] = [
  ['b', 'f'],
  ['e', 'f'],
  ['c', 'd'],
]

const SELECTED_LINKS: Note[] = ['b', 'c', 'd', 'e']

/* Farther back is smaller `y - x`, which is where the projection puts the
   top of the picture. */
const BACK_TO_FRONT = (Object.keys(NOTES) as Note[]).sort(
  (p, q) => NOTES[p].y - NOTES[p].x - (NOTES[q].y - NOTES[q].x),
)

const at = (key: Note) => iso(NOTES[key].x, NOTES[key].y, NOTES[key].z)

const graphArt: ReactNode = (
  <Scene dy={4} scale={1.37}>
    <Plate />
    <g className="artStroke" strokeOpacity="0.28" strokeWidth="1.5">
      {QUIET_LINKS.map(([p, q]) => (
        <line key={p + q} x1={at(p).x} x2={at(q).x} y1={at(p).y} y2={at(q).y} />
      ))}
    </g>
    {SELECTED_LINKS.map((key, i) => (
      <path
        className="artBrandStroke artMotion artDraw"
        d={`M${at('a').x} ${at('a').y}L${at(key).x} ${at(key).y}`}
        key={key}
        pathLength="1"
        strokeLinecap="round"
        strokeWidth="1.5"
        style={{ '--art-i': i } as CSSProperties}
      />
    ))}
    {BACK_TO_FRONT.map((key) => {
      const note = NOTES[key]
      return (
        <Sphere
          className={'selected' in note ? 'artBrand' : 'artInk'}
          fillOpacity={'selected' in note ? undefined : 0.4}
          glow={'selected' in note}
          key={key}
          r={note.r}
          x={note.x}
          y={note.y}
          z={note.z}
        />
      )
    })}
  </Scene>
)

const pictures: Record<string, ReactNode> = {
  components: componentsArt,
  graph: graphArt,
  map: mapArt,
  sandbox: sandboxArt,
  theme: themeArt,
}

/**
 * The frame: the `<svg>`, the shadow filter the plates and the lifted
 * controls need, and the `artBody` wrapper the gallery's motion rules move.
 *
 * The gallery's frame is 320 by 200 with a dot lattice behind the subject.
 * On a card both are right. On a tile the margins made each subject small
 * and the dots read as noise at the size, so the crop is tighter and the
 * lattice is gone: 16 units either side of the subject and 8 above and
 * below, which is 16 by 9. The filter has to be in the same document
 * fragment as the shape referencing it, so each tile carries its own, as
 * each gallery card does.
 */
function Frame({ children }: { children: ReactNode }) {
  return (
    <svg aria-hidden="true" className="componentArt" viewBox="32 28 256 144">
      <defs>
        <filter
          className="artShadow"
          height="200%"
          id="helixArtShadow"
          width="200%"
          x="-50%"
          y="-50%"
        >
          <feDropShadow dx="0" dy="4" stdDeviation="5" />
        </filter>
      </defs>
      <g className="artBody">{children}</g>
    </svg>
  )
}

/**
 * The picture on a tile, by the name the product list gives it. A name with
 * no drawing renders nothing, so a tile without one is a name and a sentence
 * and looks deliberate until somebody draws it.
 */
export function Picture({ name }: { name: string }) {
  const body = pictures[name]
  return body ? <Frame>{body}</Frame> : null
}
