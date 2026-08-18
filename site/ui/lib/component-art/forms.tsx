import type { CSSProperties, ReactNode } from 'react'

/**
 * Gallery art for the form controls. The system is documented at the top of
 * `core.tsx`.
 *
 * What separates these from each other, since they are all small boxes:
 *
 * - **Squares are checkboxes, circles are radios.** Nothing else in the set may
 *   use a small square with a mark cut out of it.
 * - **A tick, a knob or a raised segment is a real surface token**, not a
 *   lighter grey: `surface-overlay` for a thing sitting on top, `background` for
 *   the page coming back through. That is what makes them read as cut out.
 * - **Count carries meaning.** One row is Option, rows on selection bands are
 *   Listbox, rows with squares are Checkbox Group.
 *
 * There is no `field` entry. Field is a real part of the library but not a
 * family in the catalog, so a drawing for it would never be rendered.
 */
export const formsArt: Record<string, ReactNode> = {
  /**
   * Separate controls, one shape: the inner corners go flat and the outer ones
   * keep their radius. At a true 4 pixel radius that is a quiet idea, and it is
   * quiet in the component too.
   */
  'button-group': (
    <>
      <g className="artMotion artLift">
        <g className="artLiftShadow" filter="url(#helixArtShadow)">
          <rect className="artSurface" height="40" rx="4" width="216" x="52" y="80" />
        </g>
        <path className="artSurface" d="M56 80h68v40H56a4 4 0 0 1-4-4V84a4 4 0 0 1 4-4z" />
        <path className="artSurface" d="M124 80h72v40h-72z" />
        <path className="artSurface" d="M196 80h68a4 4 0 0 1 4 4v32a4 4 0 0 1-4 4h-68z" />
        <rect className="artEdge" height="39" rx="4" width="215" x="52.5" y="80.5" />
        <rect className="artRule" height="40" width="1" x="124" y="80" />
        <rect className="artRule" height="40" width="1" x="196" y="80" />
        {[74, 146, 218].map((x) => (
          <rect
            className="artInk"
            fillOpacity="0.55"
            height="8"
            key={x}
            rx="4"
            width="28"
            x={x}
            y="96"
          />
        ))}
      </g>
    </>
  ),

  /**
   * Seven columns, starting where the month starts, and one date taken.
   *
   * The offset first row is what separates this from `grid`, which is uniform
   * by definition. Rows arrive in order, because a month reads down.
   */
  calendar: (
    <>
      {[40, 72, 104, 136].map((y, row) => (
        <g className="artMotion artRow" key={y} style={{ '--art-i': row } as CSSProperties}>
          {[50, 82, 114, 146, 178, 210, 242].map((x, column) => {
            if ((row === 0 && column < 3) || (row === 3 && column > 4)) {
              return null
            }
            const selected = row === 1 && column === 3
            return (
              <rect
                className={selected ? 'artSolid' : 'artSunken'}
                height="28"
                key={x}
                rx="4"
                width="28"
                x={x}
                y={y}
              />
            )
          })}
        </g>
      ))}
    </>
  ),

  /**
   * One box and the thing it is an answer to, at twenty pixels.
   *
   * Ticked, unticked and mixed once, side by side. That is a state table, and a
   * state table belongs on the API page: three boxes in a row read as a set of
   * three checkboxes, which is Checkbox Group. One box with a label beside it is
   * the component, and the label is what separates the two cards.
   */
  checkbox: (
    <>
      {/* No edge on a filled control. `artEdge` is a `non-scaling-stroke`, so it
          renders one device pixel wide whatever the card is scaled to, which
          here is wider than the one unit it is inset by: the stroke spilled past
          the fill it was tracing and the page showed through between the two.
          A checked box has no border in the component either. The border
          belongs to the empty state, and the empty state is not drawn. */}
      <rect className="artSolid artMotion artOn" height="20" rx="4" width="20" x="94" y="90" />
      <path
        className="artOnSolid artMotion artMark"
        d="M98 100l3.5 3.5 7-7.5 1.4 1.4-8.4 8.9-4.9-4.9z"
      />
      <rect className="artInk" fillOpacity="0.55" height="8" rx="4" width="96" x="130" y="96" />
    </>
  ),

  /** Related boxes, reported as one set. */
  'checkbox-group': (
    <>
      {[
        { on: true, w: 96, y: 62 },
        { on: false, w: 72, y: 94 },
        { on: true, w: 84, y: 126 },
      ].map((row) => (
        <g key={row.y}>
          <rect className="artSunken" height="20" rx="4" width="20" x="104" y={row.y} />
          {row.on && (
            <rect
              className="artSolid artMotion artOn"
              height="20"
              rx="4"
              width="20"
              x="104"
              y={row.y}
            />
          )}
          {!row.on && (
            <rect className="artEdge" height="19" rx="4" width="19" x="104.5" y={row.y + 0.5} />
          )}
          {row.on && (
            <path
              className="artOnSolid artMotion artMark"
              d={`M108 ${row.y + 10}l3.5 3.5 7-7.5 1.4 1.4-8.4 8.9-4.9-4.9z`}
            />
          )}
          {/* 0.55, matching Checkbox and Radio. A control's label is a control's
              label whether there is one of them or three, and these sat at 0.28
              while the single checkbox next to them sat at 0.55, so the same
              text read at two weights across two adjacent cards. Nothing about
              being in a group makes a label secondary. */}
          <rect
            className="artInk"
            fillOpacity="0.55"
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

  /**
   * Square at the control height, and the glyph is all of it.
   *
   * The glyph was three stacked bars, which is not a glyph, it is *the* menu
   * icon: the card read as a hamburger button and the subject became what the
   * button opens rather than what the button is. Three dots is the one mark in
   * common use that means "this control's content is an icon, and the icon is
   * not the point", and nothing else in the gallery uses it.
   */
  'icon-button': (
    <>
      <g className="artMotion artLift">
        <g className="artLiftShadow" filter="url(#helixArtShadow)">
          <rect className="artSolid" height="40" rx="4" width="40" x="140" y="80" />
        </g>
        <rect className="artSolid" height="40" rx="4" width="40" x="140" y="80" />
        {[150, 160, 170].map((cx) => (
          <circle className="artOnSolid" cx={cx} cy="100" key={cx} r="2" />
        ))}
      </g>
    </>
  ),

  /** More than one of them is the answer, and only those carry a band. */
  /**
   * The field an `Input` draws, with a button welded to each end.
   *
   * The two ends are the whole silhouette. Without them this is `Input`
   * exactly, same sunken box at the same width, and a card that has to be read
   * rather than recognised has already failed at thumbnail size. The rules
   * between them and the number are what say the buttons are part of the field
   * and not two buttons after it, which is the one thing this component's
   * stylesheet is most careful about.
   *
   * The value is centred rather than left-aligned, which is the other thing that
   * tells it from `Input` at a glance and is true of the component.
   *
   * It counts on hover: the number ticks up by one step, which is the only thing
   * a stepper does that a field does not.
   */
  'input-number': (
    <>
      <rect className="artInk" fillOpacity="0.28" height="8" rx="4" width="48" x="48" y="52" />
      <rect className="artSunken" height="40" rx="4" width="224" x="48" y="72" />
      <rect className="artEdge" height="39" rx="4" width="223" x="48.5" y="72.5" />
      {/* The rules, one unit and filled rather than stroked, so they never
          half-render at the card's three-quarter scale. */}
      <rect className="artRule" height="40" width="1" x="88" y="72" />
      <rect className="artRule" height="40" width="1" x="232" y="72" />
      {/* Minus and plus, at the icon step, drawn as filled bars for the same
          reason the rules are. */}
      <rect className="artInk" fillOpacity="0.55" height="2" rx="1" width="12" x="62" y="91" />
      <rect className="artInk" fillOpacity="0.55" height="2" rx="1" width="12" x="246" y="91" />
      <rect className="artInk" fillOpacity="0.55" height="12" rx="1" width="2" x="251" y="86" />
      {/* Centred in what is left of the field, which is 89 to 232. */}
      <rect
        className="artSolid artMotion artTravel"
        height="8"
        rx="4"
        style={{ '--art-to': '0px', '--art-to-block': '-3px' } as CSSProperties}
        width="24"
        x="148"
        y="88"
      />
    </>
  ),

  /**
   * Boxes with real air between them, which is the whole silhouette.
   *
   * Four rather than six, because the card is 320 wide and six at the control
   * step would leave no margin either side. What has to survive at thumbnail
   * size is "separate boxes", not the count.
   *
   * Two are filled and two are not, so the row reads as a code part way in
   * rather than as four empty fields, and the third carries the focus edge: a
   * pin's ring is on the box the reader is in and never around the row, which is
   * the one thing its stylesheet is most careful about.
   *
   * The character in the third box arrives on hover, which is the only thing
   * this component does that a row of boxes does not.
   */
  'input-pin': (
    <>
      <rect className="artInk" fillOpacity="0.28" height="8" rx="4" width="40" x="48" y="60" />
      {[48, 100, 152, 204].map((x) => (
        <rect className="artSunken" height="40" key={x} rx="4" width="40" x={x} y="80" />
      ))}
      {[48, 100, 204].map((x) => (
        <rect className="artEdge" height="39" key={x} rx="4" width="39" x={x + 0.5} y="80.5" />
      ))}
      {/* The two already entered. A bar rather than a glyph, at the width a
          single character takes in the vocabulary the rest of the gallery uses. */}
      <rect className="artInk" fillOpacity="0.55" height="12" rx="2" width="8" x="64" y="94" />
      <rect className="artInk" fillOpacity="0.55" height="12" rx="2" width="8" x="116" y="94" />
      {/* The box the reader is in, ringed rather than filled. */}
      <rect className="artSolid" fillOpacity="0.12" height="42" rx="5" width="42" x="151" y="79" />
      <rect className="artSolid" height="40" rx="4" width="2" x="152" y="80" />
      <rect className="artSolid" height="40" rx="4" width="2" x="190" y="80" />
      <rect className="artSolid" height="2" rx="1" width="40" x="152" y="80" />
      <rect className="artSolid" height="2" rx="1" width="40" x="152" y="118" />
      <rect
        className="artSolid artMotion artFill"
        height="12"
        rx="2"
        style={{ '--art-grow': 1 } as CSSProperties}
        width="8"
        x="168"
        y="94"
      />
    </>
  ),

  listbox: (
    <>
      {[
        { on: true, w: 104, y: 44 },
        { on: false, w: 80, y: 80 },
        { on: true, w: 120, y: 116 },
        { on: false, w: 88, y: 152 },
      ].map((row, index) => (
        <g className="artMotion artRow" key={row.y} style={{ '--art-i': index } as CSSProperties}>
          {row.on && <rect className="artRaised" height="28" rx="4" width="208" x="56" y={row.y} />}
          <rect
            className="artInk"
            fillOpacity={row.on ? 0.55 : 0.28}
            height="8"
            rx="4"
            width={row.w}
            x="72"
            y={row.y + 10}
          />
        </g>
      ))}
    </>
  ),

  /** One choice, on its own. The count is the distinction from Listbox. */
  option: (
    <>
      <rect className="artRaised" height="40" rx="4" width="192" x="64" y="80" />
      <rect className="artInk" fillOpacity="0.55" height="8" rx="4" width="88" x="80" y="96" />
      <path
        className="artSolid artMotion artMark"
        d="M224 100l4 4 9-10 1.4 1.4-10.4 11.4-5.4-5.4z"
      />
    </>
  ),

  /**
   * One choice, and the one it is an answer to.
   *
   * Laid out to exactly Checkbox's measurements, on purpose: same 20 pixel
   * control on the same left edge, same label at the same offset. The only
   * difference in the frame is round against square, which is the only
   * difference that matters and the one thing a reader has to catch.
   */
  radio: (
    <>
      <circle className="artSolid artMotion artOn" cx="104" cy="100" r="10" />
      <circle className="artOnSolid artMotion artMark" cx="104" cy="100" r="4" />
      <rect className="artInk" fillOpacity="0.55" height="8" rx="4" width="96" x="130" y="96" />
    </>
  ),

  /**
   * A closed list, opened. The indicator is what says it was ever closed, and
   * the panel grows out of the edge it is anchored to rather than its middle.
   */
  select: (
    <>
      <rect className="artSunken" height="40" rx="4" width="208" x="56" y="36" />
      <rect className="artEdge" height="39" rx="4" width="207" x="56.5" y="36.5" />
      <rect className="artInk" fillOpacity="0.55" height="8" rx="4" width="72" x="72" y="52" />
      <path className="artInk" d="M236.5 54l5.5 5.5 5.5-5.5-1.5-1.5-4 4-4-4z" fillOpacity="0.28" />
      <g className="artMotion artOpen" style={{ transformOrigin: 'center top' } as CSSProperties}>
        <g filter="url(#helixArtShadow)">
          <rect className="artOverlay" height="80" rx="4" width="208" x="56" y="88" />
        </g>
        <rect className="artInk" fillOpacity="0.28" height="8" rx="4" width="88" x="76" y="104" />
        <rect className="artRaised" height="24" rx="4" width="192" x="64" y="120" />
        <rect className="artInk" fillOpacity="0.55" height="8" rx="4" width="104" x="76" y="128" />
        <rect className="artInk" fillOpacity="0.28" height="8" rx="4" width="72" x="76" y="150" />
      </g>
    </>
  ),

  /**
   * Width is height times 1.75, exactly, which is what the component computes.
   *
   * One switch, drawn on, and the hover replays the crossing from off. Off and
   * on side by side was a state table: two tracks reads as two settings, and
   * the whole point of a switch is that it is *one* thing in one of two states.
   * The motion carries the second state, which is what motion is for here.
   */
  switch: (
    <>
      <rect className="artSolid artMotion artOn" height="24" rx="12" width="42" x="139" y="88" />
      <g className="artMotion artKnob" style={{ '--art-to': '20px' } as CSSProperties}>
        <g filter="url(#helixArtShadow)">
          <circle className="artOverlay" cx="169" cy="100" r="8" />
        </g>
      </g>
    </>
  ),

  /**
   * Several lines, and a corner to pull.
   *
   * The lines arrive in order, which is the one thing that separates this from
   * a picture of a tall empty field: a textarea is the control that grows a
   * line at a time. The grip does not move, because the corner is always there.
   */
  textarea: (
    <>
      <rect className="artSunken" height="104" rx="4" width="224" x="48" y="48" />
      <rect className="artEdge" height="103" rx="4" width="223" x="48.5" y="48.5" />
      {[
        { w: 160, y: 66 },
        { w: 176, y: 84 },
        { w: 112, y: 102 },
      ].map((line, index) => (
        <g className="artMotion artRow" key={line.y} style={{ '--art-i': index } as CSSProperties}>
          <rect
            className="artInk"
            fillOpacity="0.28"
            height="8"
            rx="4"
            width={line.w}
            x="64"
            y={line.y}
          />
        </g>
      ))}
      <rect className="artInk" fillOpacity="0.28" height="4" rx="1" width="4" x="256" y="134" />
      <rect className="artInk" fillOpacity="0.28" height="4" rx="1" width="4" x="250" y="140" />
    </>
  ),

  /**
   * A sunken track at `radii-lg` with an indicator at `radii-sm` raised out of
   * it, which is the one control in the set carrying two different radii.
   */
  toggle: (
    <>
      <rect className="artSunken" height="40" rx="12" width="192" x="64" y="80" />
      <rect className="artEdge" height="39" rx="11.5" width="191" x="64.5" y="80.5" />
      <g className="artMotion artTravel" style={{ '--art-to': '64px' } as CSSProperties}>
        <g filter="url(#helixArtShadow)">
          <rect className="artOverlay" height="32" rx="4" width="60" x="68" y="84" />
        </g>
      </g>
      <rect className="artInk" fillOpacity="0.55" height="8" rx="4" width="28" x="84" y="96" />
      <rect className="artInk" fillOpacity="0.28" height="8" rx="4" width="28" x="146" y="96" />
      <rect className="artInk" fillOpacity="0.28" height="8" rx="4" width="28" x="210" y="96" />
    </>
  ),
}
