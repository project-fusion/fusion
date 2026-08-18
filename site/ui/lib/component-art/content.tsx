import type { CSSProperties, ReactNode } from 'react'

/**
 * Gallery art for content and display. The system is documented at the top of
 * `core.tsx`.
 *
 * This group fixes the text vocabulary the whole gallery uses: a bar is a line,
 * 16 tall for a heading, 8 for body, 6 for a caption, always `radii-full`.
 * Weight is emphasis and there is no other kind. A rule is one unit and is
 * always a filled rect rather than a stroke, so it never half-renders.
 *
 * **Every drawing here is the fewest marks that still say which component it
 * is.** A second body line teaches nothing the first did not, and a card that
 * has to be read rather than recognised has already failed at thumbnail size.
 * Where a count carries meaning it stays: Divider needs something either side of
 * the rule, Quote needs to wrap. Where it was only filling space it is gone.
 *
 * Spinner is drawn at `spinner-lg` rather than `md`, because at `md` its eight
 * marks would be under two pixels each.
 *
 * Most of this group is `static`: Divider, Text, Quote, Blockquote, Flex, Grid,
 * Icon and Stat do not move, because the components do not. That is the largest
 * bucket in the motion system and it is the point of having one.
 */
export const contentArt: Record<string, ReactNode> = {
  /**
   * One avatar, and what is in it when there is no image.
   *
   * Three of them at three radii once, on the grounds that Avatar is one of the
   * two components that keeps a `size`. That is true and it is not a picture:
   * a size ladder is a fact about the API, and the card only has to say
   * *avatar*. One does that, and at 64 the silhouette is actually legible.
   */
  avatar: (
    <>
      <circle className="artSunken" cx="160" cy="100" r="32" />
      <circle className="artInk" cx="160" cy="92" fillOpacity="0.28" r="9" />
      <path className="artInk" d="M144 118a16 16 0 0 1 32 0z" fillOpacity="0.28" />
    </>
  ),

  /** A passage set off by a rule and an indent. Two lines is a passage. */
  blockquote: (
    <>
      <rect className="artInk" fillOpacity="0.55" height="36" width="2" x="48" y="82" />
      <rect className="artInk" fillOpacity="0.28" height="8" rx="4" width="176" x="72" y="86" />
      <rect className="artInk" fillOpacity="0.28" height="8" rx="4" width="144" x="72" y="106" />
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
      {/* A real surface rather than ink at some alpha below the ladder. The
          panel is a plane, and a plane large enough to sit text on wants a
          token, not a percentage picked to keep a big area from going heavy. */}
      <path className="artSunken" d="M48 64h204a4 4 0 0 1 4 4v64a4 4 0 0 1-4 4H48z" />
      <rect className="artInk" fillOpacity="0.55" height="72" width="2" x="48" y="64" />
      <g className="artMotion artRow" style={{ '--art-i': 0 } as CSSProperties}>
        <rect className="artInk" fillOpacity="0.28" height="20" rx="4" width="20" x="64" y="78" />
        <rect className="artInk" fillOpacity="0.28" height="8" rx="4" width="120" x="96" y="82" />
      </g>
      <g className="artMotion artRow" style={{ '--art-i': 1 } as CSSProperties}>
        <rect className="artInk" fillOpacity="0.12" height="6" rx="3" width="96" x="96" y="106" />
      </g>
    </>
  ),

  /**
   * One rule, and the two groups it makes.
   *
   * One line either side, not two. The subject is the rule; the lines are only
   * there to be separated by it, and a second line on each side says nothing
   * the first did not while making the rule the smallest thing in the frame.
   */
  divider: (
    <>
      <rect className="artInk" fillOpacity="0.28" height="8" rx="4" width="160" x="48" y="84" />
      <rect className="artRule" height="1" width="224" x="48" y="100" />
      <rect className="artInk" fillOpacity="0.28" height="8" rx="4" width="176" x="48" y="108" />
    </>
  ),

  /**
   * Nothing here, and what to do about it. The space is the subject, which is
   * why there is no plane: an empty state drawn inside a box is a box.
   */
  empty: (
    <>
      <rect className="artInk" fillOpacity="0.28" height="20" rx="4" width="20" x="150" y="56" />
      <rect className="artInk" fillOpacity="0.28" height="8" rx="4" width="80" x="120" y="94" />
      <rect className="artInk" fillOpacity="0.12" height="6" rx="3" width="56" x="132" y="112" />
      <g className="artMotion artLift">
        <g className="artLiftShadow" filter="url(#helixArtShadow)">
          <rect className="artSolid" height="32" rx="4" width="52" x="134" y="132" />
        </g>
        <rect className="artSolid" height="32" rx="4" width="52" x="134" y="132" />
        <rect className="artOnSolid" height="6" rx="3" width="24" x="148" y="145" />
      </g>
    </>
  ),

  /** One axis. The sizes differ, the gaps do not, and the gap is `space-md`. */
  flex: (
    <>
      <rect className="artSunken" height="40" rx="4" width="48" x="56" y="80" />
      <rect className="artSunken" height="40" rx="4" width="88" x="120" y="80" />
      <rect className="artSunken" height="40" rx="4" width="48" x="224" y="80" />
    </>
  ),

  /** Two axes, and every cell the same as every other. */
  grid: (
    <g className="artSunken">
      {[28, 80, 132].map((y) =>
        [48, 128, 208].map((x) => (
          <rect height="40" key={`${x}-${y}`} rx="4" width="64" x={x} y={y} />
        )),
      )}
    </g>
  ),

  /**
   * Three glyphs from the set, all at the twenty pixel icon size.
   *
   * Rebuilt because the three were not a set. They were 22, 16 and 16 across,
   * at two different alphas, in three different constructions: a solid wedge, a
   * pair of bars and a filled disc with a hole punched through it. That reads
   * as three unrelated marks rather than as one icon set, which is the only
   * thing the card has to say.
   *
   * Now: one 20 unit box each, one 2 unit weight each, one alpha, and every one
   * of them an outline rather than a solid, because that is what the icons in
   * `@helix-io/icons` are. The disc is a ring for the same reason, and the ring
   * is `artPage` through the middle rather than a lighter ink, so it is a hole
   * and not a paler circle.
   */
  icon: (
    <>
      <path className="artInk" d="M102 90l10 10-10 10h2.8l10-10-10-10z" fillOpacity="0.55" />
      <rect className="artInk" fillOpacity="0.55" height="2" rx="1" width="20" x="150" y="99" />
      <rect className="artInk" fillOpacity="0.55" height="20" rx="1" width="2" x="159" y="90" />
      <circle className="artInk" cx="212" cy="100" fillOpacity="0.55" r="10" />
      <circle className="artPage" cx="212" cy="100" r="8" />
    </>
  ),

  /** Rows read as a set, divided by a rule and nothing else. */
  list: (
    <>
      {[
        { w: 140, y: 64 },
        { w: 104, y: 100 },
        { w: 164, y: 136 },
      ].map((row, index) => (
        <g className="artMotion artRow" key={row.y} style={{ '--art-i': index } as CSSProperties}>
          <rect
            className="artInk"
            fillOpacity="0.28"
            height="8"
            rx="4"
            width={row.w}
            x="56"
            y={row.y}
          />
          {index < 2 && <rect className="artRule" height="1" width="224" x="48" y={row.y + 20} />}
        </g>
      ))}
    </>
  ),

  /**
   * A track and how far along it something is, at the eight pixel progress
   * height. Two shapes, and the second is the point: `progress` is `slider`
   * with the thumb taken off. One reports, the other takes a value.
   */
  /**
   * The bar `Progress` draws, with the two marks that make it a meter.
   *
   * Same track at the same height, because the two stand beside each other in a
   * panel and the component is deliberately the same shape. The ticks are the
   * entire silhouette: without them this card is `progress` exactly, and a card
   * that has to be read rather than recognised has already failed at thumbnail
   * size.
   *
   * The bands are colour in the component and cannot be here, since the gallery
   * is monotone throughout and says so at the top of `core.tsx`. The marks are
   * what the component draws for the same reason: a reading that only says
   * "poor" in red says nothing to a reader who cannot see red.
   *
   * It fills past the first mark on hover, which is a meter's one story: a
   * reading crossing into the next band.
   */
  meter: (
    <>
      <rect className="artInk" fillOpacity="0.28" height="6" rx="3" width="52" x="48" y="76" />
      <rect className="artRule" height="8" rx="4" width="224" x="48" y="96" />
      <rect
        className="artSolid artMotion artFill"
        height="8"
        rx="4"
        style={{ '--art-grow': 1.5 } as CSSProperties}
        width="88"
        x="48"
        y="96"
      />
      {/* Two units wide against an eight tall track, which is what the component
          uses: any wider and a threshold near the end reads as part of the fill.
          Drawn in the page's own colour, so they cut the fill rather than sit on
          it, which is how the component draws them too. */}
      <rect className="artPage" height="8" width="2" x="152" y="96" />
      <rect className="artPage" height="8" width="2" x="216" y="96" />
    </>
  ),

  progress: (
    <>
      <rect className="artInk" fillOpacity="0.28" height="6" rx="3" width="64" x="48" y="76" />
      <rect className="artRule" height="8" rx="4" width="224" x="48" y="96" />
      <rect className="artSolid artMotion artFill" height="8" rx="4" width="136" x="48" y="96" />
    </>
  ),

  /**
   * Set inline and carried by weight. The run wraps across two lines, which is
   * what stops it reading as a highlighted phrase: a quotation is part of the
   * sentence it sits in.
   */
  quote: (
    <>
      <rect className="artInk" fillOpacity="0.12" height="8" rx="4" width="88" x="48" y="68" />
      <rect className="artInk" fillOpacity="0.55" height="8" rx="4" width="112" x="144" y="68" />
      <rect className="artInk" fillOpacity="0.55" height="8" rx="4" width="72" x="48" y="90" />
      <rect className="artInk" fillOpacity="0.12" height="8" rx="4" width="128" x="128" y="90" />
      <rect className="artInk" fillOpacity="0.12" height="8" rx="4" width="140" x="48" y="112" />
    </>
  ),

  /**
   * Marks around a ring, at `spinner-lg`. Marks rather than an arc, because
   * that is what the component draws, and because an arc would need a stroke.
   * It rotates about its own bounding-box centre.
   */
  spinner: (
    <g className="artSpin">
      {[
        { cx: 160, cy: 85, o: 0.55 },
        { cx: 170.6, cy: 89.4, o: 0.46 },
        { cx: 175, cy: 100, o: 0.38 },
        { cx: 170.6, cy: 110.6, o: 0.3 },
        { cx: 160, cy: 115, o: 0.24 },
        { cx: 149.4, cy: 110.6, o: 0.18 },
        { cx: 145, cy: 100, o: 0.14 },
        { cx: 149.4, cy: 89.4, o: 0.1 },
      ].map((mark) => (
        <circle
          className="artInk"
          cx={mark.cx}
          cy={mark.cy}
          fillOpacity={mark.o}
          key={`${mark.cx}-${mark.cy}`}
          r="2.5"
        />
      ))}
    </g>
  ),

  /**
   * One measurement at `text-3xl`, and the `text-xs` word for what it measures.
   * The pair behind a rule is the group, which is what stops one bar over
   * another from reading as `text`.
   */
  /**
   * Two panes and the divider between them, which is the whole component.
   *
   * The panes are surfaces rather than the ink bars the rest of this group uses
   * for text, because what a splitter arranges is regions and not sentences:
   * filling them with lines would make this a card about content and it is a
   * card about the boundary.
   *
   * The divider is a rule at one unit, which is the vocabulary this file fixes
   * for a rule, and it is the only mark that has to survive at thumbnail size:
   * two panes with nothing between them is `grid`.
   *
   * It moves on hover, because that is the one thing a splitter does.
   */
  splitter: (
    <>
      <rect className="artSunken" height="96" rx="4" width="104" x="48" y="52" />
      <rect className="artSunken" height="96" rx="4" width="112" x="160" y="52" />
      <rect
        className="artSolid artMotion artTravel"
        height="96"
        style={{ '--art-to': '24px' } as CSSProperties}
        width="2"
        x="155"
        y="52"
      />
    </>
  ),

  stat: (
    <>
      <rect className="artInk" fillOpacity="0.28" height="6" rx="3" width="56" x="48" y="76" />
      <rect className="artInk" fillOpacity="0.55" height="24" rx="4" width="104" x="48" y="92" />
      <rect className="artRule" height="48" width="1" x="184" y="72" />
      <rect className="artInk" fillOpacity="0.12" height="6" rx="3" width="44" x="216" y="76" />
      <rect className="artInk" fillOpacity="0.28" height="24" rx="4" width="64" x="216" y="92" />
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
          className="artInk"
          fillOpacity="0.55"
          height="8"
          key={x}
          rx="4"
          width={[44, 40, 36][index]}
          x={x}
          y="52"
        />
      ))}
      <rect className="artRule" height="1" width="224" x="48" y="72" />
      {[
        { widths: [52, 32, 28], y: 92 },
        { widths: [40, 36, 24], y: 124 },
      ].map((row, index) => (
        <g className="artMotion artRow" key={row.y} style={{ '--art-i': index } as CSSProperties}>
          {[56, 144, 224].map((x, column) => (
            <rect
              className="artInk"
              fillOpacity="0.28"
              height="8"
              key={x}
              rx="4"
              width={row.widths[column]}
              x={x}
              y={row.y}
            />
          ))}
        </g>
      ))}
    </>
  ),

  /**
   * What element it is, and what it looks like: the scale in one picture.
   *
   * One line per step, which is the whole scale and the fewest marks that can
   * carry it. The three extra body lines were a paragraph, and a paragraph is
   * a picture of prose rather than of a type scale.
   */
  text: (
    <>
      <rect className="artInk" fillOpacity="0.55" height="16" rx="4" width="144" x="48" y="72" />
      <rect className="artInk" fillOpacity="0.28" height="8" rx="4" width="224" x="48" y="100" />
      <rect className="artInk" fillOpacity="0.12" height="6" rx="3" width="96" x="48" y="122" />
    </>
  ),
}
