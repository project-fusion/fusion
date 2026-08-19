import type { ReactNode } from 'react'
import { contentArt } from './content'
import { coreArt } from './core'
import { formsArt } from './forms'
import { overlaysArt } from './overlays'
import { toolingArt } from './tooling'

/**
 * Abstract art for a family's gallery card, keyed by slug.
 *
 * All sixty-eight families have an entry, and the five files are split by kind
 * rather than by anything the build cares about: one file of sixty-eight is hard
 * to navigate and every entry would sit beside a neighbour it has nothing to do
 * with. The system they all obey is documented at the top of `core.tsx`.
 *
 * **Sixty-eight, not the sixty-seven folders in `helix/web/src`.** The catalog is
 * built from the manifests, so it also carries `editor` and `sandbox` from
 * `@helix-io/sandbox`. Counting directories is how five families were missed on
 * the first pass, and the count that matters is whatever `getFamilies` returns.
 *
 * **This is moving to `@helix-io/gallery`, and has not yet.** Art is versioned
 * content about components rendered by a site, which is exactly what
 * `@helix-io/docs` already is, so it belongs beside it rather than inside the
 * app that renders it: lockstep-versioned so a consumer's cards match their
 * Helix version, private, and TSX with its stylesheet kept together.
 *
 * Not in `helix/web`, which has no React and no JSX transform, and which every
 * consumer installs: documentation illustration in the component library is the
 * shape the sandbox was extracted for. Not a CDN either, and that one fails on
 * mechanics before it reaches the Sovereignty Constraint. An external SVG in an
 * `<img>` is cut off from the page's CSS, so it can read no token and no hover
 * rule can reach it, and every card here is themed through `light-dark()` and
 * 54 of them move. Keeping either property means fetching and inlining
 * 57 files at build time, which is a docs build that breaks when the
 * CDN does.
 *
 * No manifest annotation with it. The mapping is slug to slug, one to one by
 * name, and `check:art` already holds the two sets equal in both directions;
 * `@documentation` earns its place because a URL is information a name does not
 * carry, and an art reference is not.
 *
 * A slug with no entry renders nothing rather than a placeholder. Card's media
 * region is a bare `<slot>`, so an unassigned one generates no box at all: no
 * grid row, no gap, no empty inset band. A new family therefore gets a card
 * that simply has no picture, and looks deliberate until someone draws one.
 */
const art: Record<string, ReactNode> = {
  ...contentArt,
  ...coreArt,
  ...formsArt,
  ...overlaysArt,
  ...toolingArt,
}

/**
 * The card art for one family.
 *
 * `aria-hidden`, deliberately. The card already carries the family's name as a
 * heading and its summary as prose, so a description of the picture would be a
 * third telling of the same thing. "Three rounded rectangles offset diagonally"
 * is noise to anyone who cannot see it and has just been told this is Button.
 *
 * The `slot` is here rather than on the call site because the wrapper is here:
 * slot assignment reads the light-DOM element, so the attribute has to land on
 * the `<svg>` itself.
 *
 * No background, no border and no radius of its own. The media region runs edge
 * to edge inside the card and the card's `overflow: hidden` clips it to the
 * corner, so anything stated here would be a second frame inside the first.
 *
 * `artBody` wraps the drawing so the baseline hover motion in `site.css` has
 * something to move that is not the whole `<svg>`. The dot lattice is a
 * substrate: it is the field the geometry was measured against, and a field
 * that swells with the thing measured on it is not a field.
 *
 * The shadow filter lives here rather than in each drawing. A `<filter>` has to
 * be in the same document fragment as the shape referencing it, and every card
 * gets its own `<svg>`, so a single shared definition is impossible: the honest
 * choice is one identical `defs` per card, written once here. Its id is the same
 * in all of them, which is legal because each is scoped to its own SVG, and
 * `url(#helixArtShadow)` resolves within the one it is written in.
 */
export function ComponentArt({ slug }: { slug: string }) {
  const body = art[slug]
  if (!body) {
    return null
  }
  return (
    <svg aria-hidden="true" className="componentArt" slot="media" viewBox="0 0 320 200">
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
        {/* Offset to the cell center rather than its corner. On the corner the
            dots land on 48, 64, 80 — the same coordinates the drawings start
            and end on — so every panel edge would have a dot sitting half under
            it. At the center they fall in the gaps and read as the field the
            geometry was measured against. */}
        {/* Radius 1, not 0.75. The card renders at about three quarters of the
            viewBox, so a 0.75 dot lands near a single device pixel and most of
            its alpha goes to antialiasing: it measured at the stated strength
            and read at roughly half of it. A radius of 1 survives the
            downscale, which is what let the opacity come back down. */}
        <pattern height="16" id="helixArtGrid" patternUnits="userSpaceOnUse" width="16">
          <circle className="artGridDot" cx="8" cy="8" r="1" />
        </pattern>
        <radialGradient cx="0.5" cy="0.5" id="helixArtFade" r="0.5">
          <stop offset="0" stopColor="#fff" stopOpacity="1" />
          <stop offset="0.65" stopColor="#fff" stopOpacity="0.7" />
          <stop offset="1" stopColor="#fff" stopOpacity="0" />
        </radialGradient>
        <mask id="helixArtGridMask">
          <rect fill="url(#helixArtFade)" height="200" width="320" x="0" y="0" />
        </mask>
      </defs>
      <rect
        fill="url(#helixArtGrid)"
        height="200"
        mask="url(#helixArtGridMask)"
        width="320"
        x="0"
        y="0"
      />
      <g className="artBody">{body}</g>
    </svg>
  )
}
