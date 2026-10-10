import type { CSSProperties, ReactNode } from 'react'

/**
 * The pictures on the tiles in the Helix band.
 *
 * Each obeys the gallery's `system.md`: the viewBox is 1:1 with CSS pixels,
 * the palette is semantic tokens through the `art*` classes, there is no
 * accent, and nothing moves at rest. They are drawn here and not taken from
 * the gallery, even where the gallery draws the same family, because a
 * gallery drawing is card art: its subject sits inside a framed panel, and on
 * a band of five that frame is the card. These keep the subject and drop the
 * panel, so each sits on the band the way a product sits in a product shot.
 *
 * In the site and not in the gallery, because the gallery is one drawing per
 * family and `fusion x prose` holds that list equal to the catalog in both
 * directions. A picture of a page on this site is this site's content.
 *
 * **One brand mark in each, and the rest is ink.** The gallery is monotone
 * because color there only ever said "this one is emphasized". A tile is a
 * product shot, and a product shot of a design system themed from your brand
 * color shows the color: on the one control that takes it, the route the map
 * draws in it, the note that is selected, and the ramp the theme builder
 * computes from it. The marks are the primary tokens, through the `artBrand*`
 * classes in `site-nav.module.css`.
 */

/**
 * The frame: the `<svg>`, the shadow filter the lifted button needs, and the
 * `artBody` wrapper the gallery's motion rules move.
 *
 * The gallery's frame is 320 by 200 with the subject inside 48 to 272 and 36
 * to 164, and it draws a dot lattice behind the subject. On a card both are
 * right. On a tile the margins made each subject small and the dots read as
 * noise at the size, so the crop is tighter and the lattice is gone: 16 units
 * either side of the subject and 8 above and below, which is 16 by 9. The
 * filter has to be in the same document fragment as the shape referencing it,
 * so each tile carries its own, as each gallery card does.
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
 * The component catalog: six controls at the compact density, in the grid
 * the gallery lays them out in. A grid of six buttons says "button" and a
 * grid of six families says "catalog". They arrive in reading order on hover,
 * the way the gallery's own rows do.
 */
const componentsArt: ReactNode = (
  <>
    {[
      /* A button, and the one mark here in the brand: the primary button is
         the control that takes the color. */
      <g key="button">
        <rect className="artBrand" height="24" rx="4" width="44" x="60" y="52" />
        <rect className="artOnBrand" height="6" rx="3" width="20" x="72" y="61" />
      </g>,
      /* A switch, on. */
      <g key="switch">
        <rect className="artSolid" height="24" rx="12" width="42" x="139" y="52" />
        <circle className="artOnSolid" cx="171" cy="64" r="8" />
      </g>,
      /* A checkbox, checked. */
      <g key="checkbox">
        <rect className="artSolid" height="20" rx="4" width="20" x="228" y="54" />
        <path
          className="artStrokeOnSolid"
          d="M233 64l3.5 3.5 7-7"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2"
        />
      </g>,
      /* A field. */
      <g key="field">
        <rect className="artSurface" height="24" rx="4" width="52" x="56" y="124" />
        <rect className="artEdge" height="23" rx="4" width="51" x="56.5" y="124.5" />
        <rect className="artInk" fillOpacity="0.28" height="6" rx="3" width="24" x="64" y="133" />
      </g>,
      /* A tag. */
      <g key="tag">
        <rect
          className="artInk"
          fillOpacity="0.12"
          height="24"
          rx="12"
          width="36"
          x="142"
          y="124"
        />
        <rect
          className="artInk"
          fillOpacity="0.55"
          height="5"
          rx="2.5"
          width="18"
          x="151"
          y="133.5"
        />
      </g>,
      /* An avatar and its name. */
      <g key="avatar">
        <circle className="artInk" cx="226" cy="136" fillOpacity="0.28" r="10" />
        <rect
          className="artInk"
          fillOpacity="0.55"
          height="5"
          rx="2.5"
          width="18"
          x="242"
          y="133.5"
        />
      </g>,
    ].map((control, index) => (
      <g
        className="artMotion artRow"
        key={control.key}
        style={{ '--art-i': index } as CSSProperties}
      >
        {control}
      </g>
    ))}
  </>
)

/**
 * The sandbox: source on one side, what it renders on the other. The divider
 * is the whole idea, so it is the one thing drawn at full height, and the
 * right side holds one rendered control, which lifts on hover the way the
 * gallery's does.
 */
const sandboxArt: ReactNode = (
  <>
    <rect className="artInk" fillOpacity="0.28" height="8" rx="4" width="80" x="56" y="60" />
    <rect className="artInk" fillOpacity="0.28" height="8" rx="4" width="64" x="72" y="80" />
    <rect className="artInk" fillOpacity="0.28" height="8" rx="4" width="72" x="56" y="100" />
    <rect className="artInk" fillOpacity="0.28" height="8" rx="4" width="48" x="72" y="120" />
    <rect className="artRule" height="120" width="1" x="160" y="40" />
    {/* Ink, and not the brand: the sandbox is a tool, and the one themed
        control beside it in the band already says what a themed control
        looks like. */}
    <g className="artMotion artLift">
      <g className="artLiftShadow" filter="url(#helixArtShadow)">
        <rect className="artSolid" height="40" rx="4" width="80" x="184" y="80" />
      </g>
      <rect className="artSolid" height="40" rx="4" width="80" x="184" y="80" />
      <rect className="artOnSolid" height="8" rx="4" width="36" x="206" y="96" />
    </g>
  </>
)

/**
 * The theme builder: a brand color in, and the ramp it computes.
 *
 * The top row is the input, a chip and the value typed beside it. Under it is
 * the output, the tonal ramp from the page's own ground to the inverse plate,
 * drawn with the same surface tokens the ramp produces, so the subject is
 * literally the palette the classes paint with. The ticks under the steps are
 * the contrast audit, which is the half of the tool that is not a picker. The
 * ramp is computed step by step on hover.
 */
const themeArt: ReactNode = (
  <>
    <rect className="artBrand" height="40" rx="8" width="40" x="48" y="44" />
    <rect className="artInk" fillOpacity="0.55" height="8" rx="4" width="56" x="104" y="60" />
    {/* The ramp the builder computes: from the page's ground through the
        primary's subtle and muted tints to the primary itself, then the two
        darks, and the order holds in both modes, each step being the token
        that sits there in its own mode. Edges on the two steps that would
        otherwise have no silhouette against the band, and none on the ones
        that carry their own. */}
    {[
      { className: 'artPage', edge: true },
      { className: 'artSunken', edge: true },
      { className: 'artBrandSubtle', edge: false },
      { className: 'artBrandMuted', edge: false },
      { className: 'artBrand', edge: false },
      { className: 'artInk', edge: false, opacity: 0.55 },
      { className: 'artSolid', edge: false },
    ].map((step, index) => (
      <g
        className="artMotion artRow"
        key={step.className + (step.opacity ?? '')}
        style={{ '--art-i': index } as CSSProperties}
      >
        <rect
          className={step.className}
          fillOpacity={step.opacity}
          height="40"
          rx="4"
          width="26"
          x={48 + index * 33}
          y="104"
        />
        {step.edge && (
          <rect className="artEdge" height="39" rx="4" width="25" x={48.5 + index * 33} y="104.5" />
        )}
        <path
          className="artStroke"
          d={`M${55 + index * 33} 158l3 3 6-6`}
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeOpacity="0.55"
          strokeWidth="2"
        />
      </g>
    ))}
  </>
)

/**
 * Maps: a few roads and a river at the lightest ink, and the controls, which
 * are the family. The gallery draws the frame too, Helix shipping no tiles,
 * no projection and no network; here the frame would be the card, so the
 * controls sit on the band and the map shows through behind them.
 */
const mapArt: ReactNode = (
  <>
    <g className="artStroke" strokeOpacity="0.12" strokeWidth="5">
      <path d="M48 104h224" />
      <path d="M116 36v128" />
      <path d="M204 36v128" />
    </g>
    {/* The route, which is what a map themed from your brand draws in it. */}
    <path className="artBrandStroke" d="M48 138c36-6 54 12 84 5s48-24 76-17" strokeWidth="7" />
    <g className="artMotion artOpen">
      {[
        { d: 'M220 57v-6m-3 3 3-3 3 3', x: 212, y: 46 },
        { d: 'M205 72h-6m3-3-3 3 3 3', x: 194, y: 64 },
        { d: 'M235 72h6m-3-3 3 3-3 3', x: 230, y: 64 },
        { d: 'M220 87v6m-3-3 3 3 3-3', x: 212, y: 82 },
        { d: 'M252 54h8m-4-4v8', x: 248, y: 46 },
        { d: 'M252 72h8', x: 248, y: 64 },
      ].map((control) => (
        <g key={control.d}>
          <rect className="artOverlay" height="16" rx="3" width="16" x={control.x} y={control.y} />
          <rect
            className="artEdge"
            height="15"
            rx="3"
            width="15"
            x={control.x + 0.5}
            y={control.y + 0.5}
          />
          <path className="artStroke" d={control.d} strokeOpacity="0.55" strokeWidth="1.5" />
        </g>
      ))}
    </g>
  </>
)

/**
 * Graph: the notes as spheres standing over an isometric plate, linked, with
 * one selected.
 *
 * **Depth is drawn, and it is the subject.** Graph draws in 3D, so its tile
 * is the one scene in the band with a floor: a plate in isometric projection
 * (a point at `x, y, z` lands at `(x - y) * 0.866, (x + y) * 0.5 - z`), and
 * each note stands over it on a stem, with its shadow on the plate under it.
 * The stems and shadows are what make the heights read; without them six
 * circles at six heights are six circles.
 *
 * **A sphere is a circle and two overlays.** A white specular at the top
 * left and a dark rim at the edge, both as gradients with no color of their
 * own, so the same two shade an ink sphere and the brand sphere in either
 * mode. The selected note is the brand, with a soft glow of the same color
 * behind it, and its links are the ones that draw outward on hover.
 *
 * Drawn back to front, so a nearer sphere covers a farther link.
 */
const isometric = (x: number, y: number, z: number) => ({
  foot: { x: 160 + (x - y) * 0.866, y: 110 + (x + y) * 0.5 },
  x: 160 + (x - y) * 0.866,
  y: 110 + (x + y) * 0.5 - z,
})

const NOTES = {
  a: { ...isometric(0, 0, 34), r: 7, selected: true },
  b: { ...isometric(-28, -10, 22), r: 4.5 },
  c: { ...isometric(22, -26, 46), r: 5.5 },
  d: { ...isometric(26, 18, 18), r: 4.5 },
  e: { ...isometric(-12, 30, 40), r: 5 },
  f: { ...isometric(-34, 24, 12), r: 4 },
}

type Note = keyof typeof NOTES

const QUIET_LINKS: [Note, Note][] = [
  ['b', 'f'],
  ['e', 'f'],
  ['c', 'd'],
]

const SELECTED_LINKS: Note[] = ['b', 'c', 'd', 'e']

const BACK_TO_FRONT = (Object.keys(NOTES) as Note[]).sort(
  (p, q) => NOTES[p].foot.y - NOTES[q].foot.y,
)

const graphArt: ReactNode = (
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

    {/* The whole scene, scaled up a quarter about its center so the plate
        fills the crop: drawn at a size where its numbers are round, and
        shown at the size the tile has. */}
    <g transform="translate(160 105) scale(1.25) translate(-160 -105)">
      {/* The plate: a rhombus 80 by 80 on the ground, 6 thick, lit from the
        top left so its left face is lighter than its right. */}
      <g filter="url(#helixArtShadow)">
        <polygon className="artSurface" points="160,70 229,110 160,150 91,110" />
      </g>
      <polygon className="artInk" fillOpacity="0.12" points="91,110 160,150 160,156 91,116" />
      <polygon className="artInk" fillOpacity="0.28" points="160,150 229,110 229,116 160,156" />
      <polygon className="artSurface" points="160,70 229,110 160,150 91,110" />
      <polygon className="artEdge" points="160,70 229,110 160,150 91,110" />

      {/* Each note's shadow on the plate, and the stem it stands on. */}
      {BACK_TO_FRONT.map((key) => {
        const note = NOTES[key]
        return (
          <g key={key}>
            <ellipse
              className="artInk"
              cx={note.foot.x}
              cy={note.foot.y}
              fillOpacity="0.12"
              rx={note.r + 1}
              ry={(note.r + 1) / 2}
            />
            <line
              className="artStroke"
              strokeOpacity="0.12"
              x1={note.foot.x}
              x2={note.x}
              y1={note.foot.y}
              y2={note.y + note.r}
            />
          </g>
        )
      })}

      {/* Links between the other notes. */}
      <g className="artStroke" strokeOpacity="0.28" strokeWidth="1.5">
        {QUIET_LINKS.map(([p, q]) => (
          <line key={p + q} x1={NOTES[p].x} x2={NOTES[q].x} y1={NOTES[p].y} y2={NOTES[q].y} />
        ))}
      </g>

      {/* The selected note's links, written outward from it. */}
      {SELECTED_LINKS.map((key, i) => (
        <path
          className="artBrandStroke artMotion artDraw"
          d={`M${NOTES.a.x} ${NOTES.a.y}L${NOTES[key].x} ${NOTES[key].y}`}
          key={key}
          pathLength="1"
          strokeLinecap="round"
          strokeWidth="1.5"
          style={{ '--art-i': i } as CSSProperties}
        />
      ))}

      {/* The notes, back to front. The selected one glows. */}
      {BACK_TO_FRONT.map((key) => {
        const note = NOTES[key]
        return (
          <g key={key}>
            {note.selected && (
              <circle
                className="artBrand"
                cx={note.x}
                cy={note.y}
                fillOpacity="0.45"
                filter="url(#helixGlow)"
                r={note.r + 6}
              />
            )}
            <circle
              className={note.selected ? 'artBrand' : 'artInk'}
              cx={note.x}
              cy={note.y}
              fillOpacity={note.selected ? undefined : 0.4}
              r={note.r}
            />
            <circle cx={note.x} cy={note.y} fill="url(#helixSphereRim)" r={note.r} />
            <circle cx={note.x} cy={note.y} fill="url(#helixSphereLight)" r={note.r} />
          </g>
        )
      })}
    </g>
  </>
)

const pictures: Record<string, ReactNode> = {
  components: componentsArt,
  graph: graphArt,
  map: mapArt,
  sandbox: sandboxArt,
  theme: themeArt,
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
