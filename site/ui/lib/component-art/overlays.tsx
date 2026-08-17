import type { ReactNode } from 'react'

/**
 * Gallery art for navigation and the overlays.
 *
 * The system is documented at the top of `core.tsx`. Two conventions belong to
 * this group and stop meaning anything if another file borrows them:
 *
 * - **A full-bleed wash at 12% is a scrim, and only overlays draw one.** Dialog
 *   and Drawer. It says the page is still there and is being held back, which
 *   is what separates a modal from a panel that happens to be on top.
 * - **`artSurface` at full strength is a surface above the scrim**, and on a
 *   card whose background is already `surface` it is invisible on its own.
 *   That is correct: the panel is visible only because the scrim is behind it.
 *
 * Toolbar has no plane under it. A toolbar's strip is not a fill in the
 * component, and drawing one made it the fifth card in the gallery with a pale
 * rounded rectangle behind everything. What is left is the mixture of control
 * widths, which was always the actual idea.
 */
export const overlaysArt: Record<string, ReactNode> = {
  /**
   * Above the masthead, which is why the masthead is in the picture: a band on
   * its own says nothing about where it sits.
   *
   * The bands attach to the page plane rather than to the frame. Run to the
   * frame's edges and the drawing stops being an object and becomes a crop, and
   * on a card it reads as a picture that has slipped out of its box.
   */
  announcement: (
    <>
      <rect className="artFg" fillOpacity="0.04" height="144" rx="8" width="232" x="44" y="28" />
      <path
        className="artFg"
        d="M44 36a8 8 0 0 1 8-8h216a8 8 0 0 1 8 8v32H44z"
        fillOpacity="0.16"
      />
      <rect className="artFg" fillOpacity="0.28" height="8" rx="4" width="96" x="60" y="44" />
      <path
        className="artFg"
        d="M248 42l1.5-1.5 9 9-1.5 1.5zM257 40.5l1.5 1.5-9 9-1.5-1.5z"
        fillOpacity="0.28"
      />
      <rect className="artFg" fillOpacity="0.09" height="56" width="232" x="44" y="68" />
    </>
  ),

  /**
   * Fifty-six pixels tall, which is `--helix-size-header`, spanning the page.
   *
   * The page is what it spans, so the page is drawn: a floating plane with the
   * band across its top, sharing its upper corners.
   */
  'app-header': (
    <>
      <rect className="artFg" fillOpacity="0.04" height="144" rx="8" width="232" x="44" y="28" />
      <path
        className="artFg"
        d="M44 36a8 8 0 0 1 8-8h216a8 8 0 0 1 8 8v48H44z"
        fillOpacity="0.09"
      />
      <rect className="artFg" fillOpacity="0.28" height="20" rx="4" width="20" x="60" y="46" />
      <rect className="artFg" fillOpacity="0.16" height="8" rx="4" width="32" x="96" y="52" />
      <rect className="artFg" fillOpacity="0.16" height="8" rx="4" width="28" x="140" y="52" />
      <rect className="artFg" fillOpacity="0.16" height="20" rx="4" width="44" x="212" y="46" />
    </>
  ),

  /**
   * The path to here, ending on where you are. Three crumbs rather than four:
   * the fourth added a shape without adding an idea.
   *
   * The separators are chevrons rather than filled triangles.
   *
   * A solid triangle is a caret, which is a different mark: it is heavier than
   * anything else at that size, and the library's own marks are chevrons.
   * `accordion-item.css` names its `[part="chevron"]` outright, and `select`
   * flips its indicator across the x-axis precisely because a chevron is
   * symmetric about that axis. The only filled triangle left in the gallery is
   * `tooltip`, where it is a pointer rather than a glyph.
   */
  breadcrumbs: (
    <>
      <rect className="artFg" fillOpacity="0.16" height="8" rx="4" width="40" x="76" y="96" />
      <path className="artFg" d="M126 96l4 4-4 4 1.5 1.5 5.5-5.5-5.5-5.5z" fillOpacity="0.16" />
      <rect className="artFg" fillOpacity="0.16" height="8" rx="4" width="48" x="142" y="96" />
      <path className="artFg" d="M198 96l4 4-4 4 1.5 1.5 5.5-5.5-5.5-5.5z" fillOpacity="0.16" />
      <rect className="artFg" fillOpacity="0.44" height="8" rx="4" width="30" x="214" y="96" />
    </>
  ),

  /**
   * One of several, with the others behind it rather than cropped by the frame.
   *
   * Behind and shorter, so the set still reads as more slides than one without
   * the drawing having to run off the edge. Three panels in a row at equal size
   * would be `flex`; overlapping and unequal is a stack you move through.
   */
  carousel: (
    <>
      <rect className="artFg" fillOpacity="0.09" height="72" rx="8" width="56" x="56" y="56" />
      <rect className="artFg" fillOpacity="0.09" height="72" rx="8" width="56" x="208" y="56" />
      <rect className="artFg" fillOpacity="0.16" height="104" rx="8" width="128" x="96" y="40" />
      {[146, 160, 174].map((cx) => (
        <circle
          className="artFg"
          cx={cx}
          cy="158"
          fillOpacity={cx === 160 ? 0.28 : 0.09}
          key={cx}
          r="3.5"
        />
      ))}
    </>
  ),

  /**
   * A window, and the page held back behind it.
   *
   * The dimmed plane is the page, not the frame. One plane at 0.16 rather than
   * a page and a scrim stacked on it: two rects of identical geometry is the
   * same tone drawn twice, and the panel is what says the page is behind
   * something.
   */
  dialog: (
    <>
      <rect className="artFg" fillOpacity="0.16" height="144" rx="8" width="232" x="44" y="28" />
      <rect className="artSurface" height="88" rx="8" width="168" x="76" y="56" />
      <rect className="artFg" fillOpacity="0.28" height="8" rx="4" width="72" x="92" y="72" />
      <rect className="artFg" fillOpacity="0.16" height="6" rx="3" width="112" x="92" y="92" />
      <rect className="artFg" fillOpacity="0.28" height="20" rx="4" width="40" x="188" y="114" />
    </>
  ),

  /**
   * A panel that comes in from an edge and stays attached to it.
   *
   * The edge is the page's, so the panel shares the page's right corners. Flush
   * against the frame instead, it read as a band that had fallen off the card.
   */
  drawer: (
    <>
      <rect className="artFg" fillOpacity="0.16" height="144" rx="8" width="232" x="44" y="28" />
      <path className="artSurface" d="M180 28h88a8 8 0 0 1 8 8v128a8 8 0 0 1-8 8h-88z" />
      <rect className="artFg" fillOpacity="0.28" height="8" rx="4" width="56" x="196" y="52" />
      <rect className="artFg" fillOpacity="0.16" height="6" rx="3" width="64" x="196" y="72" />
      <rect className="artFg" fillOpacity="0.16" height="6" rx="3" width="44" x="196" y="88" />
    </>
  ),

  /**
   * A stack of pages, one showing, with a way back. Three planes at one alpha,
   * so the depth comes from them compounding rather than from three values.
   *
   * The back mark is a chevron for the same reason the breadcrumb separators
   * are: it points the way out of the stack, it does not open anything.
   */
  drilldown: (
    <>
      <rect className="artFg" fillOpacity="0.04" height="112" rx="8" width="176" x="48" y="32" />
      <rect className="artFg" fillOpacity="0.04" height="112" rx="8" width="176" x="72" y="44" />
      <rect className="artFg" fillOpacity="0.04" height="112" rx="8" width="176" x="96" y="56" />
      <path className="artFg" d="M121 72.5l-5.5 5.5 5.5 5.5 1.5-1.5-4-4 4-4z" fillOpacity="0.28" />
      <rect className="artFg" fillOpacity="0.16" height="8" rx="4" width="72" x="136" y="74" />
    </>
  ),

  /** Commands, and the trigger they came from. The panel is a real surface. */
  menu: (
    <g transform="translate(20 -4)">
      <rect className="artFg" fillOpacity="0.09" height="40" rx="4" width="72" x="56" y="32" />
      <rect className="artFg" fillOpacity="0.28" height="8" rx="4" width="40" x="72" y="48" />
      <rect className="artFg" fillOpacity="0.04" height="92" rx="8" width="168" x="56" y="84" />
      <rect className="artFg" fillOpacity="0.16" height="8" rx="4" width="96" x="72" y="100" />
      <rect className="artFg" fillOpacity="0.16" height="8" rx="4" width="80" x="72" y="126" />
      <rect className="artFg" fillOpacity="0.16" height="8" rx="4" width="104" x="72" y="152" />
    </g>
  ),

  /** A two pixel marker, where Tabs has a pill. */
  'nav-bar': (
    <g transform="translate(-4 -7)">
      {[
        { o: 0.16, w: 40, x: 56 },
        { o: 0.44, w: 48, x: 112 },
        { o: 0.16, w: 36, x: 176 },
        { o: 0.16, w: 44, x: 228 },
      ].map((label) => (
        <rect
          className="artFg"
          fillOpacity={label.o}
          height="8"
          key={label.x}
          rx="4"
          width={label.w}
          x={label.x}
          y="96"
        />
      ))}
      <rect className="artFg" fillOpacity="0.44" height="2" width="48" x="112" y="116" />
    </g>
  ),

  /**
   * Headings on this page, with a marker on the one being read.
   *
   * The hairline down the left is the component's own: it is a repeating
   * background rather than a border, and each item carries a transparent
   * `border-inline-start` at `border-thick` that the current one colors in.
   * So the marker sits *on* the rule rather than beside it, and the indents are
   * heading depth rather than tree depth.
   */
  'page-nav': (
    <g transform="translate(44.5 0)">
      <rect className="artFg" fillOpacity="0.09" height="112" width="1" x="64" y="44" />
      <rect className="artFg" fillOpacity="0.16" height="8" rx="4" width="88" x="80" y="48" />
      <rect className="artFg" fillOpacity="0.16" height="8" rx="4" width="64" x="96" y="76" />
      <rect className="artFg" fillOpacity="0.44" height="16" width="2" x="63" y="100" />
      <rect className="artFg" fillOpacity="0.44" height="8" rx="4" width="72" x="96" y="104" />
      <rect className="artFg" fillOpacity="0.16" height="8" rx="4" width="80" x="80" y="132" />
    </g>
  ),

  /**
   * A panel that opens against a trigger and holds anything.
   *
   * Mixed content rather than a column of equal rows, which is the whole of
   * what separates it from `menu`: a menu holds commands, a popover holds
   * whatever you put in it. Its panel is also offset from the trigger rather
   * than flush under it, because it opens *against* one.
   */
  popover: (
    <g transform="translate(-4 -2)">
      <rect className="artFg" fillOpacity="0.09" height="40" rx="4" width="64" x="56" y="36" />
      <rect className="artFg" fillOpacity="0.04" height="80" rx="8" width="184" x="88" y="88" />
      <rect className="artFg" fillOpacity="0.28" height="8" rx="4" width="88" x="104" y="104" />
      <rect className="artFg" fillOpacity="0.16" height="6" rx="3" width="140" x="104" y="124" />
      <rect className="artFg" fillOpacity="0.16" height="20" rx="4" width="48" x="104" y="140" />
    </g>
  ),

  /**
   * Messages arriving at a corner of the page, each with a leading edge.
   *
   * They stack in the page's corner rather than running off the frame. The
   * cropped version was truthful about a toast being `22rem` and wider than
   * this drawing, and it looked like a mistake: two bars sliced by the card.
   * Where they sit is the more useful fact, and it needs the page to sit in.
   */
  toast: (
    <>
      <rect className="artFg" fillOpacity="0.04" height="144" rx="8" width="232" x="44" y="28" />
      <rect className="artSurface" height="36" rx="8" width="164" x="96" y="76" />
      <rect className="artFg" fillOpacity="0.28" height="28" rx="1" width="2" x="105" y="80" />
      <rect className="artFg" fillOpacity="0.16" height="6" rx="3" width="88" x="118" y="91" />
      <rect className="artSurface" height="36" rx="8" width="164" x="96" y="120" />
      <rect className="artFg" fillOpacity="0.28" height="28" rx="1" width="2" x="105" y="124" />
    </>
  ),

  /** Mixed controls sharing one tab stop, and no plane under them. */
  toolbar: (
    <g transform="translate(-12 0)">
      <rect className="artFg" fillOpacity="0.09" height="40" rx="4" width="40" x="56" y="80" />
      <rect className="artFg" fillOpacity="0.09" height="40" rx="4" width="40" x="104" y="80" />
      <rect className="artFg" fillOpacity="0.16" height="24" width="1" x="160" y="88" />
      <rect className="artFg" fillOpacity="0.09" height="40" rx="4" width="64" x="176" y="80" />
      <rect className="artFg" fillOpacity="0.09" height="40" rx="4" width="40" x="248" y="80" />
    </g>
  ),

  /** A description, pointing at the thing it describes. */
  tooltip: (
    <g transform="translate(0 6)">
      <rect className="artFg" fillOpacity="0.44" height="32" rx="4" width="128" x="96" y="52" />
      <rect className="artSurface" height="8" rx="4" width="80" x="112" y="64" />
      <path className="artFg" d="M104 84h16l-8 8z" fillOpacity="0.44" />
      <rect className="artFg" fillOpacity="0.09" height="24" rx="4" width="24" x="100" y="112" />
    </g>
  ),

  /** Depth is indentation, and the indent is the whole shape. */
  tree: (
    <>
      <rect className="artFg" fillOpacity="0.16" height="8" rx="4" width="88" x="64" y="52" />
      <rect className="artFg" fillOpacity="0.16" height="8" rx="4" width="72" x="88" y="80" />
      <rect className="artFg" fillOpacity="0.09" height="28" rx="4" width="152" x="104" y="100" />
      <rect className="artFg" fillOpacity="0.28" height="8" rx="4" width="80" x="120" y="110" />
      <rect className="artFg" fillOpacity="0.16" height="8" rx="4" width="64" x="112" y="140" />
    </>
  ),
}
