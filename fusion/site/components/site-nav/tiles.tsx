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
 * Graph: linked notes beside the list of them, with one note selected in
 * both. The selected note is the one solid mark and the one plate in the
 * list, and only its links move, written outward from it on hover.
 */
const graphArt: ReactNode = (
  <>
    <rect className="artRule" height="128" width="1" x="190" y="36" />
    <g className="artStroke" strokeOpacity="0.12" strokeWidth="1.5">
      <path d="M152 66L176 92" />
      <path d="M78 70L64 104L82 134" />
      <path d="M150 128L118 150" />
      <path d="M78 70L122 48" />
    </g>
    {['M114 98L78 70', 'M114 98L152 66', 'M114 98L150 128', 'M114 98L82 134'].map((d, i) => (
      <path
        className="artStroke artMotion artDraw"
        d={d}
        key={d}
        pathLength="1"
        strokeLinecap="round"
        strokeOpacity="0.55"
        strokeWidth="1.5"
        style={{ '--art-i': i } as CSSProperties}
      />
    ))}
    <g className="artInk" fillOpacity="0.28">
      <circle cx="176" cy="92" r="4" />
      <circle cx="64" cy="104" r="4" />
      <circle cx="118" cy="150" r="4" />
      <circle cx="122" cy="48" r="4" />
    </g>
    <g className="artInk" fillOpacity="0.55">
      <circle cx="78" cy="70" r="5" />
      <circle cx="152" cy="66" r="5" />
      <circle cx="150" cy="128" r="5" />
      <circle cx="82" cy="134" r="5" />
    </g>
    <circle className="artBrand" cx="114" cy="98" r="7" />
    <rect className="artEdge" height="15" rx="4" width="63" x="198.5" y="46.5" />
    <rect className="artInk" fillOpacity="0.12" height="4" rx="2" width="28" x="204" y="52" />
    <rect className="artInk" fillOpacity="0.12" height="16" rx="4" width="64" x="198" y="70" />
    <rect className="artInk" fillOpacity="0.55" height="4" rx="2" width="36" x="204" y="76" />
    <rect className="artInk" fillOpacity="0.28" height="4" rx="2" width="42" x="204" y="94" />
    <rect className="artInk" fillOpacity="0.28" height="4" rx="2" width="30" x="204" y="110" />
    <rect className="artInk" fillOpacity="0.28" height="4" rx="2" width="38" x="204" y="126" />
    <rect className="artInk" fillOpacity="0.12" height="4" rx="2" width="44" x="204" y="142" />
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
