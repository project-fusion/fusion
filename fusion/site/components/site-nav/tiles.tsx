import { Art, ComponentArt } from '@fusion.dev/helix-gallery'
import type { CSSProperties, ReactNode } from 'react'

/**
 * The drawings for the destinations that are not a component family.
 *
 * Both obey the gallery's `system.md`: the viewBox is 1:1 with CSS pixels, the
 * palette is semantic tokens through the `art*` classes, there is no accent,
 * and nothing moves at rest. They live here and not in the gallery because the
 * gallery is one drawing per family and `fusion x prose` holds that list equal
 * to the catalog in both directions. A picture of a page on this site is this
 * site's content.
 */

/**
 * The component catalog: a grid of cards, each with one control on it.
 *
 * The page it depicts is the gallery itself, a measured grid of outlined
 * cards, so the drawing is that grid at card size. Each card carries a
 * different control at the compact density, since a grid of six buttons says
 * "button" and a grid of six families says "catalog". The cards arrive in
 * reading order on hover, the way the gallery's own rows do.
 */
const componentsArt: ReactNode = (
  <>
    {[
      { x: 48, y: 36 },
      { x: 126, y: 36 },
      { x: 204, y: 36 },
      { x: 48, y: 108 },
      { x: 126, y: 108 },
      { x: 204, y: 108 },
    ].map((card, index) => (
      <g
        className="artMotion artRow"
        key={`${card.x}-${card.y}`}
        style={{ '--art-i': index } as CSSProperties}
      >
        <rect className="artSurface" height="56" rx="4" width="68" x={card.x} y={card.y} />
        <rect className="artEdge" height="55" rx="4" width="67" x={card.x + 0.5} y={card.y + 0.5} />
      </g>
    ))}

    {/* A button. */}
    <rect className="artSolid" height="24" rx="4" width="44" x="60" y="52" />
    <rect className="artOnSolid" height="6" rx="3" width="20" x="72" y="61" />

    {/* A switch, on. */}
    <rect className="artSolid" height="24" rx="12" width="42" x="139" y="52" />
    <circle className="artOnSolid" cx="171" cy="64" r="8" />

    {/* A checkbox, checked. */}
    <rect className="artSolid" height="20" rx="4" width="20" x="228" y="54" />
    <path
      className="artStrokeOnSolid"
      d="M233 64l3.5 3.5 7-7"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
    />

    {/* A field. */}
    <rect className="artSurface" height="24" rx="4" width="52" x="56" y="124" />
    <rect className="artEdge" height="23" rx="4" width="51" x="56.5" y="124.5" />
    <rect className="artInk" fillOpacity="0.28" height="6" rx="3" width="24" x="64" y="133" />

    {/* A tag. */}
    <rect className="artInk" fillOpacity="0.12" height="24" rx="12" width="36" x="142" y="124" />
    <rect className="artInk" fillOpacity="0.55" height="5" rx="2.5" width="18" x="151" y="133.5" />

    {/* An avatar and its name. */}
    <circle className="artInk" cx="226" cy="136" fillOpacity="0.28" r="10" />
    <rect className="artInk" fillOpacity="0.55" height="5" rx="2.5" width="18" x="242" y="133.5" />
  </>
)

/**
 * The theme builder: a brand color in, and the ramp it computes.
 *
 * The top row is the input, a chip and the field its value was typed into.
 * Under it is the output, the tonal ramp from the page's own ground to the
 * inverse plate, drawn with the same surface tokens the ramp produces: this is
 * the one drawing in the set whose subject is literally the palette the
 * classes paint with. The ticks under the steps are the contrast audit, which
 * is the half of the tool that is not a picker. The ramp is computed step by
 * step on hover.
 */
const themeArt: ReactNode = (
  <>
    {/* The brand color, and the field it was typed into. */}
    <rect className="artSolid" height="40" rx="8" width="40" x="48" y="44" />
    <rect className="artSurface" height="40" rx="4" width="168" x="104" y="44" />
    <rect className="artEdge" height="39" rx="4" width="167" x="104.5" y="44.5" />
    <rect className="artInk" fillOpacity="0.55" height="8" rx="4" width="56" x="120" y="60" />

    {/* The ramp. Edges on the three steps that would otherwise have no
        silhouette against the page, and none on the ones that carry their
        own. */}
    {[
      { className: 'artSunken', edge: true },
      { className: 'artSurface', edge: true },
      { className: 'artRaised', edge: true },
      { className: 'artInk', edge: false, opacity: 0.12 },
      { className: 'artInk', edge: false, opacity: 0.28 },
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

const pictures: Record<string, ReactNode> = {
  components: componentsArt,
  theme: themeArt,
}

/**
 * The picture on a tile, by the name the product list gives it.
 *
 * A name drawn here is a site destination; any other name is a family slug and
 * the gallery draws it, so Maps, Graph, and Sandbox are the same pictures their
 * component cards carry.
 */
export function Picture({ name }: { name: string }) {
  const body = pictures[name]
  return body ? <Art>{body}</Art> : <ComponentArt slug={name} />
}
