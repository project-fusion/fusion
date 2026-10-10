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
 * Whether a scene stands on a plate. Off, the objects float on the band and
 * the map keeps its sheet, because the map is its ground.
 */
const PLATES = false

/*
 * The projection. A point at `x, y, z` on a ground where `x` runs right and
 * up, away from the viewer, and `y` runs right and down, toward the viewer,
 * lands at `(x + y) * 0.866, (y - x) * 0.5 - z` from the scene's origin, which
 * sits at 160, 110 of the gallery's 320 by 200 canvas. So a row of things
 * along `x` reads left to right and recedes, the way a line of text on a desk
 * does from a chair. Every scene is drawn at round numbers on an 80 by 80
 * ground and scaled up a quarter by `Scene` to fill the tile's crop.
 */
const iso = (x: number, y: number, z: number) => ({
  x: 160 + (x + y) * 0.866,
  y: 110 + (y - x) * 0.5 - z,
})

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
  w,
  x,
  y,
}: {
  className: string
  d: number
  fillOpacity?: number
  h: number
  w: number
  x: number
  y: number
}) {
  const a = iso(x, y, h)
  const b = iso(x + w, y, h)
  const c = iso(x + w, y + d, h)
  const dd = iso(x, y + d, h)
  const a0 = iso(x, y, 0)
  const c0 = iso(x + w, y + d, 0)
  const d0 = iso(x, y + d, 0)
  const left = points([a, dd, d0, a0])
  const right = points([dd, c, c0, d0])
  return (
    <g>
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
 * under it so it floats on the band. Nothing while `PLATES` is off, unless
 * the scene says it is its own ground.
 */
function Plate({ always = false }: { always?: boolean }) {
  if (!PLATES && !always) {
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
 * A sphere: a circle under a white specular at the top left and a dark rim
 * at the edge, both colorless, so one pair shades ink and brand in either
 * mode. On a plate it casts a shadow on the ground and stands on a stem,
 * which is what makes its height read. Floating, it has neither.
 */
function Sphere({
  className,
  fillOpacity,
  glow,
  r,
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
function Scene({ children }: { children: ReactNode }) {
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
      <g transform="translate(160 105) scale(1.25) translate(-160 -105)">{children}</g>
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
  <Scene>
    <Plate />
    {[
      /* A button: the key itself is the control. */
      { brand: true, mark: 'bar', x: -34, y: -30 },
      /* A switch, on: a track with its knob at the end. */
      { mark: 'knob', x: -8, y: -30 },
      /* A checkbox, checked. */
      { mark: 'tick', x: 18, y: -30 },
      /* A field. */
      { mark: 'field', x: -34, y: 4 },
      /* A tag. */
      { mark: 'tag', x: -8, y: 4 },
      /* An avatar. */
      { mark: 'dot', x: 18, y: 4 },
    ].map((key, index) => (
      <g className="artMotion artRow" key={key.mark} style={{ '--art-i': index } as CSSProperties}>
        <Box
          className={key.brand ? 'artBrand' : 'artRaised'}
          d={22}
          h={6}
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
 * The sandbox: source on one side, what it renders on the other. The two
 * panes split the plate along `y`, so the code sits upper left and the
 * preview lower right, and each line of code runs along `x`, left to right.
 * The gap between the panes is the divider and the whole idea. The rendered
 * control floats over the preview and lifts on hover, as the gallery's does,
 * in ink: the sandbox is a tool, and the themed button one tile over already
 * says what a themed control looks like.
 */
const sandboxArt: ReactNode = (
  <Scene>
    <Plate />
    <Box className="artSunken" d={36} h={2} w={80} x={-40} y={-40} />
    {[
      { w: 26, x: -34, y: -35 },
      { w: 18, x: -30, y: -29 },
      { w: 30, x: -34, y: -23 },
      { w: 14, x: -30, y: -17 },
      { w: 22, x: -34, y: -11 },
    ].map((line) => (
      <Flat
        className="artInk"
        d={3}
        fillOpacity={0.28}
        key={line.y}
        w={line.w}
        x={line.x}
        y={line.y}
        z={2}
      />
    ))}
    {/* Raised and not the page's ground: in dark mode the ground is the one
        black in the frame, and a pane of it on the plate read as a hole. */}
    <Box className="artRaised" d={36} h={2} w={80} x={-40} y={4} />
    <g className="artMotion artLift">
      <ellipse
        className="artInk"
        cx={iso(0, 22, 0).x}
        cy={iso(0, 22, 2).y}
        fillOpacity="0.12"
        rx="22"
        ry="11"
      />
      <g className="artLiftShadow" filter="url(#helixArtShadow)">
        <Box className="artSolid" d={16} h={5} w={24} x={-12} y={14} />
      </g>
      <Box className="artSolid" d={16} h={5} w={24} x={-12} y={14} />
      <Flat className="artOnSolid" d={3} w={12} x={-6} y={20.5} z={5} />
    </g>
  </Scene>
)

/**
 * The theme builder: the brand color in, and the palette out. The input is a
 * block of the brand standing at the back; the output is the row of swatches
 * laid flat in front of it, from the page's sunken ground through the
 * primary's subtle and muted tints to the primary, then the two darks. Flat
 * and not stepped, because a palette is a row of swatches and a staircase is
 * a chart. The swatches arrive in order on hover, the palette being computed
 * step by step.
 */
const themeArt: ReactNode = (
  <Scene>
    <Plate />
    <Box className="artBrand" d={16} h={16} w={16} x={16} y={-34} />
    {[
      { className: 'artSunken', tone: 'sunken' },
      { className: 'artBrandSubtle', tone: 'subtle' },
      { className: 'artBrandMuted', tone: 'muted' },
      { className: 'artBrand', tone: 'primary' },
      { className: 'artInk', fillOpacity: 0.28, tone: 'ink-light' },
      { className: 'artInk', fillOpacity: 0.55, tone: 'ink' },
      { className: 'artSolid', tone: 'inverse' },
    ].map((step, index) => (
      <g className="artMotion artRow" key={step.tone} style={{ '--art-i': index } as CSSProperties}>
        <Box
          className={step.className}
          d={18}
          fillOpacity={step.fillOpacity}
          h={3}
          w={9}
          x={-38 + index * 11}
          y={8}
        />
      </g>
    ))}
  </Scene>
)

/**
 * Maps: a sheet with roads at the lightest ink, the route drawn across it in
 * the brand, and a pin standing at the end of the route. The sheet stays
 * when the plates go, since the map is its own ground. The pin is the place,
 * and it is the one thing with height, so it is what lifts on hover.
 */
const PIN = { x: 30, y: -16 }

const mapArt: ReactNode = (
  <Scene>
    <Plate always />
    {/* Roads: two along `x` and two along `y`, which on the sheet are the
        two directions the rhombus runs in. */}
    {[-14, 18].map((y) => (
      <Flat className="artInk" d={4} fillOpacity={0.12} key={`x${y}`} w={80} x={-40} y={y} z={0} />
    ))}
    {[-20, 12].map((x) => (
      <Flat className="artInk" d={80} fillOpacity={0.12} key={`y${x}`} w={4} x={x} y={-40} z={0} />
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
        y2={iso(PIN.x, PIN.y, 22).y}
      />
      <circle
        className="artBrand"
        cx={iso(PIN.x, PIN.y, 26).x}
        cy={iso(PIN.x, PIN.y, 26).y}
        r="6"
      />
      <circle
        cx={iso(PIN.x, PIN.y, 26).x}
        cy={iso(PIN.x, PIN.y, 26).y}
        fill="url(#helixSphereRim)"
        r="6"
      />
      <circle
        cx={iso(PIN.x, PIN.y, 26).x}
        cy={iso(PIN.x, PIN.y, 26).y}
        fill="url(#helixSphereLight)"
        r="6"
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
  a: { r: 7, selected: true, x: 0, y: 0, z: 34 },
  b: { r: 4.5, x: -28, y: -10, z: 22 },
  c: { r: 5.5, x: 22, y: -26, z: 34 },
  d: { r: 4.5, x: 26, y: 18, z: 18 },
  e: { r: 5, x: -12, y: 30, z: 40 },
  f: { r: 4, x: -34, y: 24, z: 12 },
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
  <Scene>
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
