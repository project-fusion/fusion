import type { ReactNode } from 'react'

/**
 * Gallery art for content and display.
 *
 * The system is documented at the top of `core.tsx`. The text vocabulary is
 * fixed here and holds across the whole gallery: a bar is a line, 16 tall for a
 * heading, 8 for body, 6 for a caption, always `radii-full`. Weight is emphasis
 * and there is no other kind. A rule is 1 or 2 pixels and is always a filled
 * rect, never a stroke.
 *
 * **Avatar and Spinner are the only two components that keep a `size`**, so
 * both cards are about size. Avatar shows its ladder directly, at 24, 40 and
 * 64. Spinner is drawn at `spinner-lg`, 40, because at `md` it is 24 pixels
 * across and its eight marks would be under two pixels each.
 *
 * Only Callout paints a plane, and its tint is real. `empty` lost its plane in
 * review and is better for it: an empty state drawn inside a box is a box, and
 * the whitespace is supposed to be the subject.
 */
export const contentArt: Record<string, ReactNode> = {
  /** One of only two components that keeps a size, so the size is the picture. */
  avatar: (
    <>
      <circle className="artFg" cx="88" cy="100" fillOpacity="0.12" r="12" />
      <circle className="artFg" cx="140" cy="100" fillOpacity="0.12" r="20" />
      <circle className="artFg" cx="212" cy="100" fillOpacity="0.12" r="32" />
      <rect className="artFg" fillOpacity="0.55" height="14" rx="2" width="9" x="203" y="93" />
      <rect className="artFg" fillOpacity="0.55" height="14" rx="2" width="9" x="215" y="93" />
    </>
  ),

  /** A passage set off by a rule and an indent. */
  blockquote: (
    <>
      <rect className="artFg" fillOpacity="0.55" height="80" width="2" x="48" y="60" />
      <rect className="artFg" fillOpacity="0.28" height="8" rx="4" width="176" x="72" y="64" />
      <rect className="artFg" fillOpacity="0.28" height="8" rx="4" width="192" x="72" y="84" />
      <rect className="artFg" fillOpacity="0.28" height="8" rx="4" width="144" x="72" y="104" />
      <rect className="artFg" fillOpacity="0.12" height="6" rx="3" width="64" x="72" y="128" />
    </>
  ),

  /**
   * Square where the rule is, rounded everywhere else.
   *
   * `callout-root.css` sets `border-inline-start` thick and then zeroes both
   * start corners, so the rule meets a flat edge rather than curving away from
   * it. That asymmetry is the silhouette, and it is why this is a path.
   */
  callout: (
    <>
      <path
        className="artFg"
        d="M48 64h204a8 8 0 0 1 8 8v56a8 8 0 0 1-8 8H48z"
        fillOpacity="0.06"
      />
      <rect className="artFg" fillOpacity="0.55" height="72" width="2" x="48" y="64" />
      <rect className="artFg" fillOpacity="0.28" height="20" rx="4" width="20" x="64" y="78" />
      <rect className="artFg" fillOpacity="0.28" height="8" rx="4" width="120" x="96" y="82" />
      <rect className="artFg" fillOpacity="0.12" height="6" rx="3" width="96" x="96" y="106" />
    </>
  ),

  /** One rule, and the two groups it makes. */
  divider: (
    <>
      <rect className="artFg" fillOpacity="0.28" height="8" rx="4" width="160" x="48" y="60" />
      <rect className="artFg" fillOpacity="0.28" height="8" rx="4" width="128" x="48" y="80" />
      <rect className="artFg" fillOpacity="0.28" height="1" width="224" x="48" y="100" />
      <rect className="artFg" fillOpacity="0.28" height="8" rx="4" width="176" x="48" y="120" />
      <rect className="artFg" fillOpacity="0.28" height="8" rx="4" width="112" x="48" y="140" />
    </>
  ),

  /**
   * Nothing here, and what to do about it. The space is the subject, which is
   * why there is no plane: an empty state drawn inside a box is a box.
   */
  empty: (
    <>
      <rect className="artFg" fillOpacity="0.28" height="20" rx="4" width="20" x="150" y="60" />
      <rect className="artFg" fillOpacity="0.28" height="8" rx="4" width="80" x="120" y="98" />
      <rect className="artFg" fillOpacity="0.12" height="6" rx="3" width="56" x="132" y="116" />
      <rect className="artFg" fillOpacity="0.28" height="32" rx="4" width="52" x="134" y="136" />
    </>
  ),

  /** One axis. The sizes differ, the gaps do not, and the gap is `space-md`. */
  flex: (
    <>
      <rect className="artFg" fillOpacity="0.12" height="40" rx="4" width="48" x="56" y="80" />
      <rect className="artFg" fillOpacity="0.12" height="40" rx="4" width="88" x="120" y="80" />
      <rect className="artFg" fillOpacity="0.12" height="40" rx="4" width="48" x="224" y="80" />
    </>
  ),

  /** Two axes, and every cell the same as every other. */
  grid: (
    <g className="artFg" fillOpacity="0.12">
      {[24, 80, 136].map((y) =>
        [48, 128, 208].map((x) => (
          <rect height="40" key={`${x}-${y}`} rx="4" width="64" x={x} y={y} />
        )),
      )}
    </g>
  ),

  /**
   * A named icon from the set, at the twenty pixel icon size. Three glyphs
   * rather than one, because "from a set" is the whole of what Icon is.
   */
  icon: (
    <>
      <path className="artFg" d="M116 92l8 8-8 8 3 3 11-11-11-11z" fillOpacity="0.55" />
      <rect className="artFg" fillOpacity="0.28" height="3" rx="1.5" width="16" x="152" y="98.5" />
      <rect className="artFg" fillOpacity="0.28" height="16" rx="1.5" width="3" x="158.5" y="92" />
      <circle className="artFg" cx="200" cy="100" fillOpacity="0.28" r="8" />
      <circle className="artSurface" cx="200" cy="100" r="4" />
    </>
  ),

  /** Rows read as a set, divided by a rule and nothing else. */
  list: (
    <>
      <rect className="artFg" fillOpacity="0.28" height="8" rx="4" width="140" x="56" y="64" />
      <rect className="artFg" fillOpacity="0.12" height="1" width="224" x="48" y="84" />
      <rect className="artFg" fillOpacity="0.28" height="8" rx="4" width="104" x="56" y="100" />
      <rect className="artFg" fillOpacity="0.12" height="1" width="224" x="48" y="120" />
      <rect className="artFg" fillOpacity="0.28" height="8" rx="4" width="164" x="56" y="136" />
    </>
  ),

  /**
   * A track and how far along it something is, at the eight pixel progress
   * height.
   *
   * Two shapes, and the second is the point: `progress` is `slider` with the
   * thumb taken off. One reports, the other takes a value, and at this level of
   * abstraction the thumb is the entire visible difference. Anything added here
   * to make the card busier would blur that.
   */
  progress: (
    <>
      <rect className="artFg" fillOpacity="0.28" height="6" rx="3" width="64" x="48" y="76" />
      <rect className="artFg" fillOpacity="0.12" height="8" rx="4" width="224" x="48" y="96" />
      <rect className="artFg" fillOpacity="0.55" height="8" rx="4" width="136" x="48" y="96" />
    </>
  ),

  /**
   * Set inline and carried by weight. The run wraps across two lines, which is
   * what stops it reading as a highlighted phrase: a quotation is part of the
   * sentence it sits in.
   */
  quote: (
    <>
      <rect className="artFg" fillOpacity="0.12" height="8" rx="4" width="88" x="48" y="68" />
      <rect className="artFg" fillOpacity="0.55" height="8" rx="4" width="112" x="144" y="68" />
      <rect className="artFg" fillOpacity="0.55" height="8" rx="4" width="72" x="48" y="90" />
      <rect className="artFg" fillOpacity="0.12" height="8" rx="4" width="128" x="128" y="90" />
      <rect className="artFg" fillOpacity="0.12" height="8" rx="4" width="140" x="48" y="112" />
    </>
  ),

  /**
   * Marks around a ring, at `spinner-lg`. Marks rather than an arc because that
   * is what the component draws, and because an arc would have needed a stroke.
   */
  spinner: (
    <>
      {[
        { cx: 160, cy: 85, o: 0.82 },
        { cx: 170.6, cy: 89.4, o: 0.55 },
        { cx: 175, cy: 100, o: 0.55 },
        { cx: 170.6, cy: 110.6, o: 0.28 },
        { cx: 160, cy: 115, o: 0.28 },
        { cx: 149.4, cy: 110.6, o: 0.12 },
        { cx: 145, cy: 100, o: 0.12 },
        { cx: 149.4, cy: 89.4, o: 0.06 },
      ].map((mark) => (
        <circle
          className="artFg"
          cx={mark.cx}
          cy={mark.cy}
          fillOpacity={mark.o}
          key={`${mark.cx}-${mark.cy}`}
          r="2.5"
        />
      ))}
    </>
  ),

  /**
   * One measurement at `text-3xl`, and the `text-xs` word for what it measures.
   * The pair behind a rule is the group, which is what stops one bar over
   * another from reading as `text`.
   */
  stat: (
    <>
      <rect className="artFg" fillOpacity="0.28" height="6" rx="3" width="56" x="48" y="76" />
      <rect className="artFg" fillOpacity="0.82" height="24" rx="4" width="104" x="48" y="92" />
      <rect className="artFg" fillOpacity="0.12" height="48" width="1" x="184" y="72" />
      <rect className="artFg" fillOpacity="0.12" height="6" rx="3" width="44" x="216" y="76" />
      <rect className="artFg" fillOpacity="0.28" height="24" rx="4" width="64" x="216" y="92" />
    </>
  ),

  /**
   * Three columns that line up across every row, which is both the difference
   * from `list` and literally what the component is: a grid, where every column
   * lines up while each row stays a real element.
   */
  table: (
    <>
      {[56, 144, 224].map((x, index) => (
        <rect
          className="artFg"
          fillOpacity="0.55"
          height="8"
          key={x}
          rx="4"
          width={[44, 40, 36][index]}
          x={x}
          y="52"
        />
      ))}
      <rect className="artFg" fillOpacity="0.28" height="1" width="224" x="48" y="72" />
      {[
        { widths: [52, 32, 28], y: 92 },
        { widths: [40, 36, 24], y: 124 },
      ].map((row) =>
        [56, 144, 224].map((x, column) => (
          <rect
            className="artFg"
            fillOpacity="0.28"
            height="8"
            key={`${x}-${row.y}`}
            rx="4"
            width={row.widths[column]}
            x={x}
            y={row.y}
          />
        )),
      )}
    </>
  ),

  /** What element it is, and what it looks like: the scale in one picture. */
  text: (
    <>
      <rect className="artFg" fillOpacity="0.82" height="16" rx="4" width="144" x="48" y="56" />
      <rect className="artFg" fillOpacity="0.28" height="8" rx="4" width="224" x="48" y="88" />
      <rect className="artFg" fillOpacity="0.28" height="8" rx="4" width="200" x="48" y="106" />
      <rect className="artFg" fillOpacity="0.28" height="8" rx="4" width="168" x="48" y="124" />
      <rect className="artFg" fillOpacity="0.12" height="6" rx="3" width="96" x="48" y="148" />
    </>
  ),
}
