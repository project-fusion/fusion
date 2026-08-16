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
   * its own says nothing about where it sits, and would read as Callout.
   */
  announcement: (
    <>
      <rect className="artFg" fillOpacity="0.12" height="40" width="320" x="0" y="0" />
      <rect className="artFg" fillOpacity="0.55" height="8" rx="4" width="128" x="24" y="16" />
      <path className="artFg" d="M282 14l2-2 12 12-2 2z" fillOpacity="0.28" />
      <path className="artFg" d="M294 12l2 2-12 12-2-2z" fillOpacity="0.28" />
      <rect className="artFg" fillOpacity="0.06" height="56" width="320" x="0" y="48" />
    </>
  ),

  /** Fifty-six pixels tall, which is `--helix-size-header`, spanning the page. */
  'app-header': (
    <>
      <rect className="artFg" fillOpacity="0.06" height="56" width="320" x="0" y="0" />
      <rect className="artFg" fillOpacity="0.55" height="20" rx="4" width="20" x="24" y="18" />
      <rect className="artFg" fillOpacity="0.28" height="8" rx="4" width="32" x="64" y="24" />
      <rect className="artFg" fillOpacity="0.28" height="8" rx="4" width="28" x="108" y="24" />
      <rect className="artFg" fillOpacity="0.28" height="20" rx="4" width="44" x="252" y="18" />
    </>
  ),

  /**
   * The path to here, ending on where you are. Three crumbs rather than four:
   * the fourth added a shape without adding an idea.
   */
  breadcrumbs: (
    <>
      <rect className="artFg" fillOpacity="0.28" height="8" rx="4" width="40" x="76" y="96" />
      <path className="artFg" d="M126 94l5 6-5 6z" fillOpacity="0.12" />
      <rect className="artFg" fillOpacity="0.28" height="8" rx="4" width="48" x="142" y="96" />
      <path className="artFg" d="M200 94l5 6-5 6z" fillOpacity="0.12" />
      <rect className="artFg" fillOpacity="0.82" height="8" rx="4" width="30" x="214" y="96" />
    </>
  ),

  /**
   * One of several, with the others cropped by the frame. The crop is the idea:
   * neighbours that fit inside the card are three panels in a row, which is
   * `flex`.
   */
  carousel: (
    <>
      <rect className="artFg" fillOpacity="0.06" height="88" rx="8" width="64" x="-8" y="56" />
      <rect className="artFg" fillOpacity="0.06" height="88" rx="8" width="64" x="264" y="56" />
      <rect className="artFg" fillOpacity="0.12" height="104" rx="8" width="144" x="88" y="40" />
      {[146, 160, 174].map((cx) => (
        <circle
          className="artFg"
          cx={cx}
          cy="164"
          fillOpacity={cx === 160 ? 0.55 : 0.12}
          key={cx}
          r="4"
        />
      ))}
    </>
  ),

  /** A window, and the page held back behind it. */
  dialog: (
    <>
      <rect className="artFg" fillOpacity="0.12" height="200" width="320" x="0" y="0" />
      <rect className="artSurface" height="112" rx="8" width="208" x="56" y="44" />
      <rect className="artFg" fillOpacity="0.55" height="8" rx="4" width="96" x="76" y="64" />
      <rect className="artFg" fillOpacity="0.28" height="6" rx="3" width="152" x="76" y="88" />
      <rect className="artFg" fillOpacity="0.55" height="24" rx="4" width="48" x="196" y="120" />
    </>
  ),

  /** A panel that comes in from an edge and stays attached to it. */
  drawer: (
    <>
      <rect className="artFg" fillOpacity="0.12" height="200" width="320" x="0" y="0" />
      <rect className="artSurface" height="200" width="128" x="192" y="0" />
      <rect className="artFg" fillOpacity="0.55" height="8" rx="4" width="72" x="208" y="36" />
      <rect className="artFg" fillOpacity="0.28" height="6" rx="3" width="88" x="208" y="60" />
      <rect className="artFg" fillOpacity="0.28" height="6" rx="3" width="64" x="208" y="76" />
    </>
  ),

  /**
   * A stack of pages, one showing, with a way back. Three planes at one alpha,
   * so the depth comes from them compounding rather than from three values.
   */
  drilldown: (
    <>
      <rect className="artFg" fillOpacity="0.06" height="112" rx="8" width="176" x="48" y="44" />
      <rect className="artFg" fillOpacity="0.06" height="112" rx="8" width="176" x="72" y="56" />
      <rect className="artFg" fillOpacity="0.06" height="112" rx="8" width="176" x="96" y="68" />
      <path className="artFg" d="M124 82l-10 8 10 8z" fillOpacity="0.55" />
      <rect className="artFg" fillOpacity="0.28" height="8" rx="4" width="72" x="136" y="86" />
    </>
  ),

  /** Commands, and the trigger they came from. The panel is a real surface. */
  menu: (
    <>
      <rect className="artFg" fillOpacity="0.12" height="40" rx="4" width="72" x="56" y="32" />
      <rect className="artFg" fillOpacity="0.55" height="8" rx="4" width="40" x="72" y="48" />
      <rect className="artFg" fillOpacity="0.06" height="92" rx="8" width="168" x="56" y="84" />
      <rect className="artFg" fillOpacity="0.28" height="8" rx="4" width="96" x="72" y="100" />
      <rect className="artFg" fillOpacity="0.28" height="8" rx="4" width="80" x="72" y="126" />
      <rect className="artFg" fillOpacity="0.28" height="8" rx="4" width="104" x="72" y="152" />
    </>
  ),

  /** A two pixel marker, where Tabs has a pill. */
  'nav-bar': (
    <>
      {[
        { o: 0.28, w: 40, x: 56 },
        { o: 0.82, w: 48, x: 112 },
        { o: 0.28, w: 36, x: 176 },
        { o: 0.28, w: 44, x: 228 },
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
      <rect className="artFg" fillOpacity="0.82" height="2" width="48" x="112" y="116" />
    </>
  ),

  /** Mixed controls sharing one tab stop, and no plane under them. */
  toolbar: (
    <>
      <rect className="artFg" fillOpacity="0.12" height="40" rx="4" width="40" x="56" y="80" />
      <rect className="artFg" fillOpacity="0.12" height="40" rx="4" width="40" x="104" y="80" />
      <rect className="artFg" fillOpacity="0.28" height="24" width="1" x="160" y="88" />
      <rect className="artFg" fillOpacity="0.12" height="40" rx="4" width="64" x="176" y="80" />
      <rect className="artFg" fillOpacity="0.12" height="40" rx="4" width="40" x="248" y="80" />
    </>
  ),

  /** A description, pointing at the thing it describes. */
  tooltip: (
    <>
      <rect className="artFg" fillOpacity="0.82" height="32" rx="4" width="128" x="96" y="52" />
      <rect className="artSurface" height="8" rx="4" width="80" x="112" y="64" />
      <path className="artFg" d="M104 84h16l-8 8z" fillOpacity="0.82" />
      <rect className="artFg" fillOpacity="0.12" height="24" rx="4" width="24" x="100" y="112" />
    </>
  ),

  /** Depth is indentation, and the indent is the whole shape. */
  tree: (
    <>
      <rect className="artFg" fillOpacity="0.28" height="8" rx="4" width="88" x="64" y="52" />
      <rect className="artFg" fillOpacity="0.28" height="8" rx="4" width="72" x="88" y="80" />
      <rect className="artFg" fillOpacity="0.12" height="28" rx="4" width="152" x="104" y="100" />
      <rect className="artFg" fillOpacity="0.55" height="8" rx="4" width="80" x="120" y="110" />
      <rect className="artFg" fillOpacity="0.28" height="8" rx="4" width="64" x="112" y="140" />
    </>
  ),
}
