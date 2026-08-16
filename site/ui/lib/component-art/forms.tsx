import type { ReactNode } from 'react'

/**
 * Gallery art for the form controls.
 *
 * The system is documented at the top of `core.tsx`. What separates these
 * thirteen from each other, since they are all small boxes:
 *
 * - **Squares are checkboxes, circles are radios.** Nothing else in the set may
 *   use a small square with a mark punched out of it.
 * - **A tick or a knob is `artSurface`**, the page coming back through a dark
 *   fill, never a lighter grey. That is what makes a mark read as cut out
 *   rather than drawn on.
 * - **Count carries meaning.** One row is Option, rows on selection bands are
 *   Listbox, rows with squares are Checkbox Group.
 *
 * There is no `field` entry. `Field` is a real part of the library but it is
 * not a family in the catalog, so a drawing for it would never be rendered:
 * the registry is keyed by the slugs `getFamilies` returns, and a key nothing
 * looks up is dead art nobody will notice has gone stale.
 */
export const formsArt: Record<string, ReactNode> = {
  /**
   * The inner corners go flat and the outer ones keep their radius.
   *
   * This is the one card whose idea is quieter than it should be. At a true 4
   * pixel radius the difference is about three device pixels at card size; it
   * read before only because the radius was drawn two and a half times too
   * large. The answer is a different idea for this card, not a bigger radius.
   */
  'button-group': (
    <>
      <path
        className="artFg"
        d="M56 80h68v40H56a4 4 0 0 1-4-4V84a4 4 0 0 1 4-4z"
        fillOpacity="0.09"
      />
      <path className="artFg" d="M124 80h72v40h-72z" fillOpacity="0.09" />
      <path
        className="artFg"
        d="M196 80h68a4 4 0 0 1 4 4v32a4 4 0 0 1-4 4h-68z"
        fillOpacity="0.09"
      />
      {[74, 146, 218].map((x) => (
        <rect
          className="artFg"
          fillOpacity="0.28"
          height="8"
          key={x}
          rx="4"
          width="28"
          x={x}
          y="96"
        />
      ))}
    </>
  ),

  /**
   * Seven columns, starting where the month starts, and one date taken.
   *
   * Repetition is the subject, so the six shape cap does not apply, but the
   * cells sit at 6% and there is no header row: at 28 pixels they read as a
   * month without any furniture. The offset first row is what separates this
   * from `grid`, which is uniform by definition.
   */
  calendar: (
    <>
      {[40, 72, 104, 136].map((y, row) =>
        [50, 82, 114, 146, 178, 210, 242].map((x, column) =>
          (row === 0 && column < 3) || (row === 3 && column > 4) ? null : (
            <rect
              className="artFg"
              fillOpacity={row === 1 && column === 3 ? 0.44 : 0.04}
              height="28"
              key={`${x}-${y}`}
              rx="4"
              width="28"
              x={x}
              y={y}
            />
          ),
        ),
      )}
    </>
  ),

  /**
   * Ticked, not ticked, and neither, at twenty pixels.
   *
   * The tick is drawn at two units thick, not three and a half. The jog at the
   * elbow is what sets it: an offset of 1.4 on each axis is a perpendicular
   * distance of two across a 45 degree arm, and the first version's 2.5 came
   * out at three and a half, which is a seventh of the box it sits in.
   */
  checkbox: (
    <>
      <rect className="artFg" fillOpacity="0.09" height="20" rx="4" width="20" x="110" y="90" />
      <rect className="artFg" fillOpacity="0.44" height="20" rx="4" width="20" x="150" y="90" />
      <path className="artSurface" d="M154 100l3.5 3.5 7-7.5 1.4 1.4-8.4 8.9-4.9-4.9z" />
      <rect className="artFg" fillOpacity="0.44" height="20" rx="4" width="20" x="190" y="90" />
      <rect className="artSurface" height="3" rx="1.5" width="10" x="195" y="98.5" />
    </>
  ),

  /**
   * Related boxes, reported as one set.
   *
   * Checked is alpha rather than a tick: at twenty pixels three ticks were
   * three specks, and they pushed the card past six shapes for nothing.
   */
  'checkbox-group': (
    <>
      {[
        { box: 0.44, w: 96, y: 62 },
        { box: 0.09, w: 72, y: 94 },
        { box: 0.44, w: 84, y: 126 },
      ].map((row) => (
        <g key={row.y}>
          <rect
            className="artFg"
            fillOpacity={row.box}
            height="20"
            rx="4"
            width="20"
            x="104"
            y={row.y}
          />
          <rect
            className="artFg"
            fillOpacity="0.16"
            height="8"
            rx="4"
            width={row.w}
            x="136"
            y={row.y + 6}
          />
        </g>
      ))}
    </>
  ),

  /** Square at the control height, and the glyph is all of it. */
  'icon-button': (
    <>
      <rect className="artFg" fillOpacity="0.44" height="40" rx="4" width="40" x="140" y="80" />
      {[90, 98.75, 107.5].map((y) => (
        <rect className="artSurface" height="2.5" key={y} rx="1.25" width="20" x="150" y={y} />
      ))}
    </>
  ),

  /** More than one of them is the answer, and only those carry a band. */
  listbox: (
    <>
      <rect className="artFg" fillOpacity="0.09" height="28" rx="4" width="208" x="56" y="44" />
      <rect className="artFg" fillOpacity="0.28" height="8" rx="4" width="104" x="72" y="54" />
      <rect className="artFg" fillOpacity="0.16" height="8" rx="4" width="80" x="72" y="90" />
      <rect className="artFg" fillOpacity="0.09" height="28" rx="4" width="208" x="56" y="116" />
      <rect className="artFg" fillOpacity="0.28" height="8" rx="4" width="120" x="72" y="126" />
      <rect className="artFg" fillOpacity="0.16" height="8" rx="4" width="88" x="72" y="162" />
    </>
  ),

  /** One choice, on its own. The count is the distinction from Listbox. */
  option: (
    <>
      <rect className="artFg" fillOpacity="0.09" height="40" rx="4" width="192" x="64" y="80" />
      <rect className="artFg" fillOpacity="0.28" height="8" rx="4" width="88" x="80" y="96" />
      <path className="artFg" d="M224 100l4 4 9-10 1.4 1.4-10.4 11.4-5.4-5.4z" fillOpacity="0.28" />
    </>
  ),

  /** One choice, and the one it is an answer to. */
  radio: (
    <>
      <circle className="artFg" cx="136" cy="100" fillOpacity="0.09" r="10" />
      <circle className="artFg" cx="184" cy="100" fillOpacity="0.44" r="10" />
      <circle className="artSurface" cx="184" cy="100" r="4" />
    </>
  ),

  /**
   * A closed list, opened. The indicator is what says it was ever closed.
   *
   * A chevron rather than a filled caret, and the same one the breadcrumbs use
   * turned a quarter: the component flips its indicator across the x-axis when
   * the panel opens, which only makes sense for a mark that is symmetric about
   * that axis, and it names the chevron as the shape that is.
   */
  select: (
    <>
      <rect className="artFg" fillOpacity="0.09" height="40" rx="4" width="208" x="56" y="36" />
      <rect className="artFg" fillOpacity="0.28" height="8" rx="4" width="72" x="72" y="52" />
      <path className="artFg" d="M236.5 54l5.5 5.5 5.5-5.5-1.5-1.5-4 4-4-4z" fillOpacity="0.16" />
      <rect className="artFg" fillOpacity="0.04" height="80" rx="8" width="208" x="56" y="88" />
      <rect className="artFg" fillOpacity="0.16" height="8" rx="4" width="88" x="76" y="108" />
      <rect className="artFg" fillOpacity="0.28" height="8" rx="4" width="104" x="76" y="140" />
    </>
  ),

  /** Width is height times 1.75, exactly, which is what the component computes. */
  switch: (
    <>
      <rect className="artFg" fillOpacity="0.09" height="24" rx="12" width="42" x="88" y="88" />
      <circle className="artSurface" cx="100" cy="100" r="8" />
      <rect className="artFg" fillOpacity="0.44" height="24" rx="12" width="42" x="190" y="88" />
      <circle className="artSurface" cx="220" cy="100" r="8" />
    </>
  ),

  /** Several lines, and a corner to pull. */
  textarea: (
    <>
      <rect className="artFg" fillOpacity="0.09" height="104" rx="4" width="224" x="48" y="48" />
      <rect className="artFg" fillOpacity="0.16" height="8" rx="4" width="160" x="64" y="66" />
      <rect className="artFg" fillOpacity="0.16" height="8" rx="4" width="176" x="64" y="84" />
      <rect className="artFg" fillOpacity="0.16" height="8" rx="4" width="112" x="64" y="102" />
      <rect className="artFg" fillOpacity="0.16" height="4" rx="1" width="4" x="256" y="134" />
      <rect className="artFg" fillOpacity="0.16" height="4" rx="1" width="4" x="250" y="140" />
    </>
  ),

  /**
   * A sunken track at `radii-lg` with an indicator at `radii-sm` raised out of
   * it, which is the one control in the set carrying two different radii.
   */
  toggle: (
    <>
      <rect className="artFg" fillOpacity="0.09" height="40" rx="12" width="192" x="64" y="80" />
      <rect className="artSurface" height="32" rx="4" width="60" x="68" y="84" />
      <rect className="artFg" fillOpacity="0.44" height="8" rx="4" width="28" x="84" y="96" />
      <rect className="artFg" fillOpacity="0.16" height="8" rx="4" width="28" x="146" y="96" />
      <rect className="artFg" fillOpacity="0.16" height="8" rx="4" width="28" x="210" y="96" />
    </>
  ),
}
