import type { CSSProperties, ReactNode } from 'react'

/**
 * Gallery art for the ten families the language was worked out on.
 *
 * Bodies only: the `<svg>`, its shared shadow filter and the `aria-hidden` live
 * in `index.tsx`, so they are stated once rather than eighty times.
 *
 * The system, which every entry in every one of these files obeys:
 *
 * - **The viewBox is 1:1 with CSS pixels.** 320 by 200 is a 320 by 200 region of
 *   a real page, so every size is a token's own value and can be checked against
 *   `helix/styles/src/tokens.css` rather than argued about. Control 40, tag 24,
 *   checkbox 20, badge 16, switch 24 by 42, icon 20, header 56, track 4.
 * - **Radii are 4, 8 and 12.** The seed is `0.5rem`, so that is the ladder.
 * - **Every color is a semantic token**, through the `art*` classes in
 *   `site.css`. A floating panel is `surface-overlay`, a dimmed page is
 *   `overlay`, a tooltip is `surface-inverse`. Ink is the one exception and
 *   stays a percentage of `foreground`, at 0.12, 0.28 or 0.55. Three steps, and
 *   a fourth is a sign the shape wanted a surface token instead.
 * - **Monotone throughout.** There is no accent. Emphasis is `artSolid`, which
 *   is `surface-inverse`: a near-black plate in light and a near-white one in
 *   dark, carrying `foreground-inverse` for anything on it. Color here was
 *   only ever saying "this one is emphasised", on about half the grid, which
 *   weight says as well and more quietly.
 * - **Every card sits on the same dot lattice**, drawn once in `index.tsx` at
 *   16 units, which is `space-md`. It shows through the sparse drawings and is
 *   covered by the dense ones, so the gallery reads as one measured field
 *   rather than eighty unrelated pictures.
 * - **An edge has to earn its place.** `artEdge` is for a border the component
 *   actually has (a field, a key cap, a group's shared outline, an unchecked
 *   box) or for a plane that would otherwise have no silhouette at all. It is
 *   *not* for anything already carrying a permanent shadow: a dialog, a menu, a
 *   popover, a select's list, a toast and a drilldown's front page were each
 *   drawing their outline twice, once in shadow and once in hairline, and a
 *   hairline on a floating panel is the one thing that stops it floating.
 * - **A drawing depicts what the component is, not what the treatment suggests.**
 *   Four of these were rebuilt after drifting into other people's illustrations:
 *   a node graph is not a Tree, browser chrome is not an App Header.
 * - **One motion archetype per card**, opted into by class, and **nothing moves
 *   at rest**. Skeleton and Spinner were the exception on the grounds that
 *   their motion *is* the component; in a grid of eighty still cards two
 *   that move on their own read as the only two that are broken. Both are
 *   recognisable frozen, so both wait for hover like everything else.
 */
export const coreArt: Record<string, ReactNode> = {
  /**
   * Items flush against each other, one hairline between neighbours, and a
   * disclosure indicator on every header.
   *
   * The indicators are the whole fix. Without them this was a stack of text
   * rows separated by rules, which is `list` exactly: same vocabulary, same
   * construction, and the only difference was that one row here had a fainter
   * line under it. What makes an accordion an accordion is that each row says
   * whether it is open, so the chevrons are not decoration on this card, they
   * are the subject. Two point right, the open one points down.
   *
   * The panel settles open from the header rather than sliding in from the
   * side. `artRow` was doing the work before, which is a horizontal move for a
   * component whose entire motion is vertical.
   */
  accordion: (
    <>
      <rect className="artRule" height="1" width="224" x="48" y="30" />
      <rect className="artInk" fillOpacity="0.28" height="8" rx="4" width="88" x="64" y="44" />
      <path className="artInk" d="M249 43l5 5-5 5 1.5 1.5 6.5-6.5-6.5-6.5z" fillOpacity="0.28" />

      <rect className="artRule" height="1" width="224" x="48" y="62" />
      <rect className="artInk" fillOpacity="0.55" height="8" rx="4" width="104" x="64" y="76" />
      <path
        className="artInk"
        d="M246.5 77.5l5.5 5.5 5.5-5.5-1.5-1.5-4 4-4-4z"
        fillOpacity="0.55"
      />
      <g className="artMotion artOpen" style={{ transformOrigin: 'center top' } as CSSProperties}>
        <rect className="artInk" fillOpacity="0.12" height="6" rx="3" width="176" x="64" y="100" />
        <rect className="artInk" fillOpacity="0.12" height="6" rx="3" width="132" x="64" y="116" />
      </g>

      <rect className="artRule" height="1" width="224" x="48" y="138" />
      <rect className="artInk" fillOpacity="0.28" height="8" rx="4" width="72" x="64" y="152" />
      <path className="artInk" d="M249 151l5 5-5 5 1.5 1.5 6.5-6.5-6.5-6.5z" fillOpacity="0.28" />

      <rect className="artRule" height="1" width="224" x="48" y="170" />
    </>
  ),

  /**
   * A 16 pixel mark pinned at 45 degrees, held off by a ring of the page.
   *
   * The thing it is pinned to is 56 across, not 80. At 80 the target was the
   * largest object in the gallery and the drawing read as "a big circle, with a
   * dot", which is the wrong subject: the mark is the component and the target
   * is only there to be marked. Smaller also keeps it clear of Avatar, which is
   * the other card in the set that is a plain circle.
   */
  badge: (
    <>
      <circle className="artSunken" cx="160" cy="100" r="28" />
      <circle className="artPage" cx="180" cy="80" r="12" />
      {/* The mark presses. It carried no motion class on the argument that a
          badge's mark is not a state it toggles into, which was right about the
          old `artMark`: that one faded up from nothing, and a mark appearing is
          exactly the claim a badge should not make. `artMark` is a press now,
          from full size back to full size, so it says "this one" without ever
          saying "this just arrived". */}
      <circle className="artSolid artMotion artMark" cx="180" cy="80" r="8" />
    </>
  ),

  /** One control at 40, lifting as the real `data-card` recipe lifts. */
  button: (
    <>
      <g className="artMotion artLift">
        <g className="artLiftShadow" filter="url(#helixArtShadow)">
          <rect className="artSolid" height="40" rx="4" width="120" x="100" y="80" />
        </g>
        <rect className="artSolid" height="40" rx="4" width="120" x="100" y="80" />
        <rect className="artOnSolid" height="8" rx="4" width="52" x="134" y="96" />
      </g>
    </>
  ),

  /**
   * One card, and what a card holds: media, a heading, a line about it, and
   * something to do.
   *
   * Two overlapping surfaces before, on the idea that a card is a thing that
   * lifts off a page. That drawing is now Drilldown's, exactly: two panels of
   * the same size, offset diagonally, the front one on top. Whichever of them
   * had the better claim to it, they cannot both have it, and "a stack" is a
   * far better description of Drilldown than of Card. Card's own claim is what
   * it *contains*, so that is what it shows.
   *
   * Everything sits on one 16 unit inset: the media runs full bleed to the
   * card's own edge, and the heading, the line and the action all start at 72
   * and end 16 above the bottom. The action was at x=180 on a card ending at
   * 224 once, drawn almost entirely outside the card it belongs to.
   */
  card: (
    <>
      <g className="artMotion artLift">
        <g className="artLiftShadow" filter="url(#helixArtShadow)">
          <rect className="artSurface" height="160" rx="4" width="208" x="56" y="20" />
        </g>
        <rect className="artSurface" height="160" rx="4" width="208" x="56" y="20" />
        <rect className="artSunken" height="64" width="208" x="56" y="20" />
        <rect className="artEdge" height="159" rx="4" width="207" x="56.5" y="20.5" />
        <rect className="artInk" fillOpacity="0.55" height="8" rx="4" width="112" x="72" y="100" />
        <rect className="artInk" fillOpacity="0.28" height="6" rx="3" width="160" x="72" y="122" />
        <rect className="artSolid" height="24" rx="4" width="56" x="72" y="140" />
      </g>
    </>
  ),

  /** A 40 pixel field at radius 4, sunken, with a caret in it. */
  input: (
    <>
      <rect className="artInk" fillOpacity="0.28" height="8" rx="4" width="56" x="48" y="52" />
      <rect className="artSunken" height="40" rx="4" width="224" x="48" y="72" />
      <rect className="artEdge" height="39" rx="4" width="223" x="48.5" y="72.5" />
      {/* The value grows with the caret rather than the caret leaving it behind.
          `--art-grow` is 22 units over the bar's own 88, which is the same 22
          the caret travels, so the gap between the last character and the caret
          holds for the whole run. */}
      <rect
        className="artInk artMotion artFill"
        fillOpacity="0.55"
        height="8"
        rx="4"
        style={{ '--art-grow': 1.25 } as CSSProperties}
        width="88"
        x="64"
        y="88"
      />
      <rect
        className="artSolid artMotion artTravel"
        height="20"
        style={{ '--art-to': '22px' } as CSSProperties}
        width="2"
        x="160"
        y="82"
      />
    </>
  ),

  /** Two keys at their real height, with the depth on the inside. */
  kbd: (
    <>
      {/* Both caps press together, because a chord is struck rather than typed.
          `artMark` carries no stagger, which is what makes it the right one. */}
      {[128, 168].map((x) => (
        <g className="artMotion artMark" key={x}>
          <rect className="artSunken" height="24" rx="4" width="24" x={x} y="88" />
          <rect className="artEdge" height="23" rx="4" width="23" x={x + 0.5} y="88.5" />
          <rect className="artRule" height="2" rx="1" width="22" x={x + 1} y="108" />
          <rect
            className="artInk"
            fillOpacity="0.55"
            height="4"
            rx="2"
            width="12"
            x={x + 6}
            y="97"
          />
        </g>
      ))}
    </>
  ),

  /**
   * A 40 pixel avatar and two lines, at 40% and 70% of the row.
   *
   * The sweep is the component's own: a straight band, travelling leftward,
   * 1.4s ease-in-out, continuous. It was skewed and resting once, which looked
   * better and was four separate departures from `helix-skeleton-sweep`.
   *
   * The bars are unequal on purpose. Two of the same length read as a pattern,
   * and a reader waiting on content reads a pattern as decoration rather than
   * as something about to be replaced.
   */
  skeleton: (
    <>
      <defs>
        <g id="helixArtSkeleton">
          <circle cx="80" cy="100" r="20" />
          <rect height="14" rx="7" width="64" x="116" y="86" />
          <rect height="14" rx="7" width="112" x="116" y="108" />
        </g>
        <linearGradient id="helixArtSkeletonSweep" x1="0" x2="1">
          <stop offset="0" stopColor="var(--helix-color-foreground)" stopOpacity="0" />
          <stop offset="0.5" stopColor="var(--helix-color-foreground)" stopOpacity="0.14" />
          <stop offset="1" stopColor="var(--helix-color-foreground)" stopOpacity="0" />
        </linearGradient>
        {/* The three shapes again, written out, rather than a `use` pointed at
            the group above.
         *
         * That is what it was, and it is why this card had no sweep at all. A
         * `clipPath` may hold shapes, `text` and `use`, but the `use` has to
         * reference a *basic shape*: pointed at a `<g>` it contributes no
         * geometry, so the clip is empty, and an empty clip does not mean "do
         * not clip", it means clip everything. The band was traversing the card
         * on schedule the whole time with every pixel of it discarded.
         *
         * Nothing warns. The markup is well formed, the id resolves, the
         * element exists, and the only symptom is that a thing you cannot see
         * is not there. */}
        <clipPath id="helixArtSkeletonClip">
          <circle cx="80" cy="100" r="20" />
          <rect height="14" rx="7" width="64" x="116" y="86" />
          <rect height="14" rx="7" width="112" x="116" y="108" />
        </clipPath>
      </defs>
      <use className="artInk" fillOpacity="0.12" href="#helixArtSkeleton" />
      <g clipPath="url(#helixArtSkeletonClip)">
        <rect
          className="artSweep"
          fill="url(#helixArtSkeletonSweep)"
          height="90"
          width="240"
          x="0"
          y="60"
        />
      </g>
    </>
  ),

  /** A 20 pixel thumb lifted off a 4 pixel track, with its 4 pixel halo. */
  slider: (
    <>
      <rect className="artInk" fillOpacity="0.28" height="7" rx="3.5" width="52" x="48" y="56" />
      <rect className="artRule" height="4" rx="2" width="200" x="48" y="98" />
      <rect className="artSolid artMotion artFill" height="4" rx="2" width="104" x="48" y="98" />
      <g className="artMotion artTravel">
        <circle className="artInk" cx="152" cy="100" fillOpacity="0.12" r="14" />
        <g filter="url(#helixArtShadow)">
          <circle className="artOverlay" cx="152" cy="100" r="10" />
        </g>
      </g>
    </>
  ),

  /**
   * A raised pill on the selected tab and nothing at all behind the row.
   *
   * The pill is `surface-raised` under a shadow, which is what the component
   * sets: it is lifted, not filled. Drawn as the heaviest mark once, which
   * inverted the whole idea.
   */
  tabs: (
    <>
      <g className="artMotion artTravel" style={{ '--art-to': '76px' } as CSSProperties}>
        <g filter="url(#helixArtShadow)">
          <rect className="artRaised" height="40" rx="4" width="76" x="56" y="80" />
        </g>
      </g>
      <rect className="artInk" fillOpacity="0.55" height="8" rx="4" width="36" x="76" y="96" />
      <rect className="artInk" fillOpacity="0.28" height="8" rx="4" width="36" x="152" y="96" />
      <rect className="artInk" fillOpacity="0.28" height="8" rx="4" width="36" x="228" y="96" />
    </>
  ),

  /**
   * Two chips at the real 24 pixel tag height.
   *
   * Each is one color at two strengths, which is how Tag derives its own look:
   * the fill at 12%, the label at 55%. Both are the same color, because with
   * the palette monotone an accented chip and a neutral one are the same
   * drawing, and implying a distinction the picture cannot show is worse than
   * not implying one.
   *
   * Staggered, because a tag is almost never on its own: what the card is
   * showing is a set being applied, and a set arrives one at a time. Two is
   * already a set; the third chip only made the row wider.
   */
  tag: (
    <>
      {[80, 168].map((x, index) => (
        <g className="artMotion artRow" key={x} style={{ '--art-i': index } as CSSProperties}>
          <rect className="artInk" fillOpacity="0.12" height="24" rx="4" width="72" x={x} y="88" />
          <rect
            className="artInk"
            fillOpacity="0.55"
            height="8"
            rx="4"
            width="36"
            x={x + 18}
            y="96"
          />
        </g>
      ))}
    </>
  ),
}
