import type { CSSProperties, ReactNode } from 'react'

/**
 * Gallery art for navigation and the overlays. The system is documented at the
 * top of `core.tsx`.
 *
 * Two conventions belong to this group and stop meaning anything if another
 * file borrows them:
 *
 * - **A full-bleed `overlay` wash is a scrim, and only Drawer draws one.** It
 *   says the page is still there and is being held back, which is what
 *   separates a modal from a panel that happens to be on top. It is the real
 *   `--helix-color-overlay` token, so a drawing of a dimmed page is dimmed by
 *   exactly what dims a page.
 * - **A masthead's top corners are an arc of four, not a chord of eleven.** All
 *   four paths here that cap a page at the top were written `a4 4 0 0 1 8-8`,
 *   which asks for a radius-4 arc across a chord of 11.3. SVG cannot draw that,
 *   and rather than fail it scales both radii up until the arc fits, so every
 *   one of those corners rendered as a semicircle bulging out past the frame.
 *   The corner is `a4 4 0 0 1 4-4` off a start point four units back.
 * - **Draw what a panel overlays only when the panel has no silhouette without
 *   it.** Drawer does: it is *attached* to an edge, and a drawer detached from
 *   the edge it came in from is just a tall card, so the page is the subject as
 *   much as the panel is. Dialog does not, and drawing one for it cost two
 *   thirds of the frame to say something a shadow already says. This is the
 *   rule that most wants over-applying: a relationship is easy to draw and it
 *   is almost never the component.
 */
export const overlaysArt: Record<string, ReactNode> = {
  /**
   * The band, its message and the way out of it.
   *
   * Drawn over a masthead and a page once, because an announcement is a thing
   * that sits *above* chrome. That is true, and it made the card mostly a
   * picture of the chrome: the band was a fifth of the frame and the other four
   * fifths were App Header's drawing. The relationship belongs in the prose.
   *
   * It still unfurls from its own top edge rather than fading, which is the one
   * thing an announcement does that a static notice does not.
   */
  announcement: (
    <>
      <g className="artMotion artOpen" style={{ transformOrigin: 'center top' } as CSSProperties}>
        {/* No edge. The band is `surface-sunken`, which in light mode is oklch
            0.96 against a 1.0 page: a four percent step, the same one Callout's
            panel carries with nothing tracing it. App Header keeps its outline
            because its bar is `surface` at 0.985, a step of one and a half
            percent, which is not a silhouette at all. Same question, opposite
            answers, and the fill is what decides it. */}
        <rect className="artSunken" height="40" rx="4" width="232" x="44" y="80" />
        <rect className="artInk" fillOpacity="0.55" height="8" rx="4" width="96" x="60" y="96" />
        <path
          className="artInk"
          d="M248 96l1.5-1.5 9 9-1.5 1.5zM257 94.5l1.5 1.5-9 9-1.5-1.5z"
          fillOpacity="0.28"
        />
      </g>
    </>
  ),

  /**
   * Fifty-six pixels tall, which is `--helix-size-header`, spanning the page.
   *
   * The bar and nothing else. A page under it, twice: first as an empty grey
   * field, then with content, on the reasoning that what makes fifty-six pixels
   * read as *header* is something beginning where it ends. That is true of a
   * page and it is not true of a card. What the card has to say is "a bar of
   * this height, holding a mark, some nav and an action", and the page under it
   * was the biggest thing in the frame while contributing none of that.
   *
   * **Static, and it is the only card in the set that has to be.** Everything
   * else here either performs its own interaction on hover or is a component
   * that genuinely does not move. A masthead is neither: it moves nothing, but
   * the controls in it obviously do, so it invites a token gesture. It had one,
   * the trailing action lifting on hover, and a header whose button floats off
   * the bar is a picture of a bug. The note that used to sit over that lift
   * already said chrome that animates is wrong; it just did not follow it far
   * enough. A page can scroll under this bar and nothing in the frame moves.
   */
  'app-header': (
    <>
      {/* A rule under it rather than an outline around it, which is what a
          masthead actually has. The four sides were only ever there because the
          bar's `surface` fill sits one and a half percent off the page and
          could not hold a silhouette on its own. One edge does the same job
          honestly: a header is defined by where it *ends*, and the mark, the
          nav and the action say where it begins.

          `artRule` rather than `artEdge` because it is a rule. Rules in this
          gallery are filled rects at one unit, so they never half-render at a
          fractional scale the way a stroke does. */}
      <rect className="artSurface" height="56" width="232" x="44" y="72" />
      <rect className="artRule" height="1" width="232" x="44" y="128" />
      <rect className="artSolid" height="20" rx="4" width="20" x="60" y="90" />
      <rect className="artInk" fillOpacity="0.28" height="8" rx="4" width="32" x="96" y="96" />
      <rect className="artInk" fillOpacity="0.28" height="8" rx="4" width="28" x="140" y="96" />
      <rect className="artRaised" height="20" rx="4" width="44" x="212" y="90" />
    </>
  ),

  /**
   * The path to here, ending on where you are. Chevrons, never filled carets.
   *
   * Staggered along the path rather than still, because the order is the
   * content: a trail is read from the root outward, and `artRow` run left to
   * right says that without needing a second archetype.
   */
  breadcrumbs: (
    <>
      <g className="artMotion artRow" style={{ '--art-i': 0 } as CSSProperties}>
        <rect className="artInk" fillOpacity="0.28" height="8" rx="4" width="40" x="76" y="96" />
        <path className="artInk" d="M126 96l4 4-4 4 1.5 1.5 5.5-5.5-5.5-5.5z" fillOpacity="0.28" />
      </g>
      <g className="artMotion artRow" style={{ '--art-i': 1 } as CSSProperties}>
        <rect className="artInk" fillOpacity="0.28" height="8" rx="4" width="48" x="142" y="96" />
        <path className="artInk" d="M198 96l4 4-4 4 1.5 1.5 5.5-5.5-5.5-5.5z" fillOpacity="0.28" />
      </g>
      <g className="artMotion artRow" style={{ '--art-i': 2 } as CSSProperties}>
        <rect className="artInk" fillOpacity="0.55" height="8" rx="4" width="30" x="214" y="96" />
      </g>
    </>
  ),

  /** One of several, with the others behind it rather than cropped by the frame. */
  carousel: (
    <>
      <rect className="artSunken" height="72" rx="4" width="56" x="56" y="56" />
      <rect className="artSunken" height="72" rx="4" width="56" x="208" y="56" />
      <g className="artMotion artLift">
        <g className="artLiftShadow" filter="url(#helixArtShadow)">
          <rect className="artSurface" height="104" rx="4" width="128" x="96" y="40" />
        </g>
        <rect className="artSurface" height="104" rx="4" width="128" x="96" y="40" />
        <rect className="artEdge" height="103" rx="4" width="127" x="96.5" y="40.5" />
      </g>
      {[146, 160, 174].map((cx) => (
        <circle
          className={cx === 160 ? 'artSolid' : 'artInk'}
          cx={cx}
          cy="164"
          fillOpacity={cx === 160 ? 1 : 0.28}
          key={cx}
          r="3.5"
        />
      ))}
    </>
  ),

  /**
   * The window: a title, a line of it, and the two ways out.
   *
   * The page and its scrim are gone. They were here on the rule below, that an
   * overlay is only convincing if you draw what it overlays, and for Dialog
   * that rule was buying a relationship at the cost of the subject: two thirds
   * of the frame was a page, dimmed almost to flat, with the actual dialog
   * small in the middle of it. Drawer keeps the page because Drawer is
   * *attached* to an edge and has no silhouette without one. A dialog is
   * centred and floating, and floating is a shadow, which needs nothing behind
   * it to read.
   */
  dialog: (
    <>
      <g className="artMotion artOpen">
        <g filter="url(#helixArtShadow)">
          <rect className="artOverlay" height="104" rx="4" width="192" x="64" y="48" />
        </g>
        <rect className="artInk" fillOpacity="0.55" height="8" rx="4" width="80" x="80" y="68" />
        <rect className="artInk" fillOpacity="0.28" height="6" rx="3" width="128" x="80" y="88" />
        <rect className="artEdge" height="19" rx="4" width="43" x="144.5" y="116.5" />
        <rect className="artSolid" height="20" rx="4" width="40" x="200" y="116" />
      </g>
    </>
  ),

  /** A panel that comes in from an edge and stays attached to it. */
  drawer: (
    <>
      <defs>
        <clipPath id="helixArtDrawerClip">
          <rect height="144" rx="4" width="232" x="44" y="28" />
        </clipPath>
      </defs>
      <rect className="artPage" height="144" rx="4" width="232" x="44" y="28" />
      <path className="artSurface" d="M44 32a4 4 0 0 1 4-4h224a4 4 0 0 1 4 4v28H44z" />
      <rect className="artSunken" height="34" rx="4" width="100" x="56" y="72" />
      <rect className="artInk" fillOpacity="0.28" height="6" rx="3" width="164" x="56" y="122" />
      <rect className="artInk" fillOpacity="0.28" height="6" rx="3" width="128" x="56" y="140" />
      <rect className="artScrim" height="144" rx="4" width="232" x="44" y="28" />
      <g clipPath="url(#helixArtDrawerClip)">
        {/* Flush to the page edge, and travelling exactly the distance that
            clears it.
         *
         * The panel stopped at 272 against a page ending at 276, leaving a four
         * unit sliver of page down its outer side: a drawer that is not touching
         * the edge it came in from is a tall card. It also started 120 out when
         * 96 clears the clip, so a quarter of the run happened off-screen and it
         * entered the frame already at speed, then decelerated into place. That
         * is what read as overshoot. The easing never overshot: it is
         * `cubic-bezier(0.22, 1, 0.36, 1)`, whose control points are both at
         * y=1, so the curve is monotonic and cannot exceed its end value.
         *
         * The right corners are square here and rounded by the clip, which is
         * the page's own radius, so the panel takes the page's corner rather
         * than carrying a second one just inside it. */}
        <g className="artMotion artEdgeIn" style={{ '--art-from': '100px' } as CSSProperties}>
          <g filter="url(#helixArtShadow)">
            <path className="artOverlay" d="M180 28h96v144h-96z" />
          </g>
          <rect className="artInk" fillOpacity="0.55" height="8" rx="4" width="56" x="196" y="52" />
          <rect className="artInk" fillOpacity="0.28" height="6" rx="3" width="64" x="196" y="72" />
          <rect className="artInk" fillOpacity="0.28" height="6" rx="3" width="44" x="196" y="88" />
          <rect className="artSolid" height="20" rx="4" width="40" x="196" y="140" />
        </g>
      </g>
    </>
  ),

  /**
   * A page, the one that came from it, and the way back.
   *
   * Two layers, not three. The idea is *the level you are on and the level
   * behind it*, and two is what that takes: a third only proves the stack can
   * keep going, which is a claim about the API rather than about the component,
   * and it cost a third of the frame to make.
   */
  drilldown: (
    <>
      <rect className="artSurface" height="108" rx="4" width="176" x="56" y="36" />
      <rect className="artEdge" height="107" rx="4" width="175" x="56.5" y="36.5" />
      <g className="artMotion artOpen">
        <g filter="url(#helixArtShadow)">
          <rect className="artOverlay" height="108" rx="4" width="176" x="88" y="56" />
        </g>
        <path
          className="artInk"
          d="M113 72.5l-5.5 5.5 5.5 5.5 1.5-1.5-4-4 4-4z"
          fillOpacity="0.55"
        />
        <rect className="artInk" fillOpacity="0.28" height="8" rx="4" width="72" x="128" y="74" />
        <rect className="artInk" fillOpacity="0.12" height="6" rx="3" width="128" x="104" y="104" />
        <rect className="artInk" fillOpacity="0.12" height="6" rx="3" width="96" x="104" y="122" />
      </g>
    </>
  ),

  /** Commands, and the trigger they came from. */
  menu: (
    <>
      <rect className="artSunken" height="40" rx="4" width="72" x="56" y="32" />
      <rect className="artEdge" height="39" rx="4" width="71" x="56.5" y="32.5" />
      <rect className="artInk" fillOpacity="0.55" height="8" rx="4" width="40" x="72" y="48" />
      <g className="artMotion artOpen" style={{ transformOrigin: 'center top' } as CSSProperties}>
        <g filter="url(#helixArtShadow)">
          <rect className="artOverlay" height="92" rx="4" width="168" x="56" y="84" />
        </g>
        <rect className="artRaised" height="24" rx="4" width="152" x="64" y="92" />
        <rect className="artInk" fillOpacity="0.55" height="8" rx="4" width="96" x="72" y="100" />
        <rect className="artInk" fillOpacity="0.28" height="8" rx="4" width="80" x="72" y="126" />
        <rect className="artInk" fillOpacity="0.28" height="8" rx="4" width="104" x="72" y="152" />
      </g>
    </>
  ),

  /** A two pixel marker, where Tabs has a pill. */
  'nav-bar': (
    <>
      {[
        { on: false, w: 40, x: 56 },
        { on: true, w: 48, x: 112 },
        { on: false, w: 36, x: 176 },
        { on: false, w: 44, x: 228 },
      ].map((label) => (
        <rect
          className="artInk"
          fillOpacity={label.on ? 0.55 : 0.28}
          height="8"
          key={label.x}
          rx="4"
          width={label.w}
          x={label.x}
          y="96"
        />
      ))}
      <rect
        className="artSolid artMotion artTravel"
        height="2"
        style={{ '--art-to': '64px' } as CSSProperties}
        width="48"
        x="112"
        y="116"
      />
    </>
  ),

  /**
   * Headings on this page, with a marker on the one being read.
   *
   * The hairline down the left is the component's own: a repeating background
   * rather than a border, with each item carrying a transparent
   * `border-inline-start` that the current one colours in. So the marker sits
   * *on* the rule rather than beside it.
   */
  'page-nav': (
    <>
      <rect className="artRule" height="112" width="1" x="64" y="44" />
      <rect className="artInk" fillOpacity="0.28" height="8" rx="4" width="88" x="80" y="48" />
      <rect className="artInk" fillOpacity="0.28" height="8" rx="4" width="64" x="96" y="76" />
      {/* The one marker in the set that travels down rather than across, which
          is the axis the component reads on. It was written with `--art-to: 0`
          once, which parses, animates, and moves nothing: the card was the only
          one in the gallery that claimed an archetype and then sat still. */}
      <rect
        className="artSolid artMotion artTravel"
        height="16"
        style={{ '--art-to': '0px', '--art-to-block': '28px' } as CSSProperties}
        width="2"
        x="63"
        y="100"
      />
      <rect className="artInk" fillOpacity="0.55" height="8" rx="4" width="72" x="96" y="104" />
      <rect className="artInk" fillOpacity="0.28" height="8" rx="4" width="80" x="80" y="132" />
    </>
  ),

  /** A panel that opens against a trigger and holds anything. */
  popover: (
    <>
      <rect className="artSunken" height="40" rx="4" width="64" x="56" y="36" />
      <rect className="artEdge" height="39" rx="4" width="63" x="56.5" y="36.5" />
      <g className="artMotion artOpen" style={{ transformOrigin: 'left top' } as CSSProperties}>
        <g filter="url(#helixArtShadow)">
          <rect className="artOverlay" height="80" rx="4" width="184" x="88" y="88" />
        </g>
        <rect className="artInk" fillOpacity="0.55" height="8" rx="4" width="88" x="104" y="104" />
        <rect className="artInk" fillOpacity="0.28" height="6" rx="3" width="140" x="104" y="124" />
        <rect className="artRaised" height="20" rx="4" width="48" x="104" y="140" />
      </g>
    </>
  ),

  /** Messages arriving at a corner of the page, one after another. */
  toast: (
    <>
      <rect className="artSunken" height="144" rx="4" width="232" x="44" y="28" />
      <defs>
        <clipPath id="helixArtToastClip">
          <rect height="144" rx="4" width="232" x="44" y="28" />
        </clipPath>
      </defs>
      <g clipPath="url(#helixArtToastClip)">
        {[
          { i: 0, y: 76 },
          { i: 1, y: 120 },
        ].map((toast) => (
          <g
            className="artMotion artEdgeIn"
            key={toast.y}
            style={{ '--art-from': '200px', animationDelay: `${toast.i * 170}ms` } as CSSProperties}
          >
            <g filter="url(#helixArtShadow)">
              <rect className="artOverlay" height="36" rx="4" width="164" x="96" y={toast.y} />
            </g>
            <rect
              className="artInk"
              fillOpacity="0.28"
              height="6"
              rx="3"
              width="88"
              x="118"
              y={toast.y + 15}
            />
          </g>
        ))}
      </g>
    </>
  ),

  /**
   * Mixed controls sharing one tab stop, and no plane under them.
   *
   * The stagger is that one tab stop: focus enters the group once and then
   * moves control to control, so the controls arrive in order rather than
   * together. The rule between them does not, because a separator is not a stop.
   */
  toolbar: (
    <>
      {[
        { i: 0, w: 40, x: 56 },
        { i: 1, w: 40, x: 104 },
        { i: 2, w: 64, x: 176 },
        { i: 3, w: 40, x: 248 },
      ].map((control) => (
        <g
          className="artMotion artRow"
          key={control.x}
          style={{ '--art-i': control.i } as CSSProperties}
        >
          <rect className="artSunken" height="40" rx="4" width={control.w} x={control.x} y="80" />
          {/* Kept. These are the one case in the set where the fill really is
              not enough: a 40 unit sunken square on the page is a ghost at card
              size, and four ghosts beside a rule is Flex with a divider. */}
          <rect
            className="artEdge"
            height="39"
            rx="4"
            width={control.w - 1}
            x={control.x + 0.5}
            y="80.5"
          />
        </g>
      ))}
      <rect className="artRule" height="24" width="1" x="160" y="88" />
    </>
  ),

  /** A description, pointing at the thing it describes. */
  tooltip: (
    <>
      <rect className="artSunken" height="24" rx="4" width="24" x="100" y="112" />
      <rect className="artEdge" height="23" rx="4" width="23" x="100.5" y="112.5" />
      <g
        className="artMotion artOpen"
        style={{ transformOrigin: 'center bottom' } as CSSProperties}
      >
        <g filter="url(#helixArtShadow)">
          <rect className="artInverse" height="32" rx="4" width="128" x="96" y="52" />
        </g>
        <path className="artInverse" d="M104 84h16l-8 8z" />
        <rect className="artOnInverse" height="8" rx="4" width="80" x="112" y="64" />
      </g>
    </>
  ),

  /** Depth is indentation, and the indent is the whole shape. */
  tree: (
    <>
      <path className="artEdge" d="M74 44v96M106 96v44M74 68h14M74 96h14M106 140h14" />
      <path className="artInk" d="M60 64l5 4-5 4z" fillOpacity="0.55" />
      <rect className="artInk" fillOpacity="0.28" height="8" rx="4" width="88" x="94" y="64" />
      <g className="artMotion artRow" style={{ '--art-i': 0 } as CSSProperties}>
        <path className="artInk" d="M92 92l5 4-5 4z" fillOpacity="0.55" />
        <rect className="artInk" fillOpacity="0.28" height="8" rx="4" width="58" x="126" y="92" />
      </g>
      <g className="artMotion artRow" style={{ '--art-i': 1 } as CSSProperties}>
        <rect className="artRaised" height="26" rx="4" width="150" x="118" y="112" />
        <rect className="artInk" fillOpacity="0.55" height="8" rx="4" width="66" x="134" y="121" />
      </g>
      <g className="artMotion artRow" style={{ '--art-i': 2 } as CSSProperties}>
        <rect className="artInk" fillOpacity="0.28" height="8" rx="4" width="52" x="134" y="150" />
      </g>
    </>
  ),
}
