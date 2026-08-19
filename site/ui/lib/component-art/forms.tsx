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

  'color-input': (
    <>
      <rect className="artInk" fillOpacity="0.28" height="8" rx="4" width="40" x="48" y="40" />
      <rect className="artSunken" height="40" rx="4" width="224" x="48" y="60" />
      <rect className="artEdge" height="39" rx="4" width="223" x="48.5" y="60.5" />
      {/* The hex, drawn as one run rather than as seven marks: it is a single
          code, and a field showing a word here would be the wrong picture. */}
      <rect className="artInk" fillOpacity="0.4" height="8" rx="4" width="64" x="64" y="76" />
      {/* The chip. `artSolid`, because it is the one mark on this card standing
          for a colour that was chosen rather than for furniture. */}
      <rect className="artSolid" height="14" rx="3" width="14" x="240" y="73" />
      {/* The panel: three tracks, each with its handle somewhere different, and
          the top one moving. The pitch is 26, which is what puts the three in
          the panel with the same gap above and below them. */}
      <rect className="artSunken" height="90" rx="4" width="224" x="48" y="112" />
      {[0, 1, 2].map((row) => (
        <rect
          className="artRule"
          height="4"
          key={row}
          rx="2"
          width="192"
          x="64"
          y={134 + row * 26}
        />
      ))}
      {[
        { at: 104, row: 1 },
        { at: 176, row: 2 },
      ].map(({ at, row }) => (
        <g filter="url(#helixArtShadow)" key={row}>
          <circle className="artOverlay" cx={at} cy={136 + row * 26} r="8" />
        </g>
      ))}
      {/* `artTravel` rather than `artFill`: a handle moves along its track, and
          the growing version of this drew a bar that got longer, which is what a
          progress reading looks like and not what a channel does. */}
      <g className="artMotion artTravel" style={{ '--art-to': '64px' } as CSSProperties}>
        <g filter="url(#helixArtShadow)">
          <circle className="artOverlay" cx="128" cy="136" r="8" />
        </g>
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
   * It counts on hover, and the first version did not: `--art-to: 0px` with a
   * three pixel block offset parses, animates, and moves nothing a reader can
   * see, which is the exact fault this file records against `Outline`. A value
   * getting longer is what counting looks like, so it stretches, which is the
   * archetype `Input` uses for the same thing.
   */
  /* A field with a dashed edge and two names under it, which is the one shape
     that reads as "a place to put files" at this size: a solid box is just a
     field, and a picture of a cloud says upload to nobody who has not already
     been told. The dashes are drawn as a run of short bars rather than stroked,
     for the reason the rules are: a stroke half-renders at the card's
     three-quarter scale. */
  /* A field with a calendar mark at its trailing end, and the grid it opens
     below. Three rows of dots rather than a real month: at card scale the
     shapes are all a reader can see anyway, and drawing seven columns of
     numbers would be a picture of text. */
  /**
   * A field with a chip of the colour at its trailing end, and the three tracks
   * it opens below.
   *
   * Tonal rather than coloured, like every card here. A hue ramp is the one
   * thing this component has that a picture could show literally, and showing it
   * would make this the only card on the page painted in something other than
   * the ink: the row would read as one card lit up and the rest switched off.
   * Three tracks with their handles at three different places says "channels"
   * without borrowing the attention.
   */
  /**
   * The square, and the ramp under it.
   *
   * Tonal rather than coloured, like every card here. A hue ramp is the one
   * thing this component has that a picture could show literally, and showing it
   * would make this the only card in the gallery painted in something other than
   * the ink: the row would read as one card lit up and the rest switched off.
   * The square's gradient carries the idea on its own.
   */
  'color-picker': (
    <>
      {/* Light at the top left, dark along the bottom, which is the shape of a
          saturation and brightness square whatever colour it is drawn in. */}
      <rect className="artSunken" height="96" rx="4" width="224" x="48" y="48" />
      <rect className="artInk" fillOpacity="0.28" height="96" rx="4" width="224" x="48" y="48" />
      <rect className="artEdge" height="95" rx="4" width="223" x="48.5" y="48.5" />
      {/* The handle, moving across the square rather than growing on it: a
          picker's mark travels, and `artFill` would have drawn it swelling in
          place, which is what a loading state looks like. */}
      <g className="artMotion artTravel" style={{ '--art-to': '48px' } as CSSProperties}>
        <g filter="url(#helixArtShadow)">
          <circle className="artOverlay" cx="132" cy="80" r="9" />
        </g>
      </g>
      {/* The ramp, and the chip beside it that says what was chosen. */}
      <rect className="artSolid" height="20" rx="4" width="20" x="48" y="160" />
      <rect className="artRule" height="8" rx="4" width="188" x="84" y="166" />
      <g filter="url(#helixArtShadow)">
        <circle className="artOverlay" cx="200" cy="170" r="8" />
      </g>
    </>
  ),

  'date-input': (
    <>
      <rect className="artInk" fillOpacity="0.28" height="8" rx="4" width="40" x="48" y="40" />
      <rect className="artSunken" height="40" rx="4" width="224" x="48" y="60" />
      <rect className="artEdge" height="39" rx="4" width="223" x="48.5" y="60.5" />
      <rect className="artInk" fillOpacity="0.4" height="8" rx="4" width="72" x="64" y="76" />
      {/* The calendar mark: a box with a torn-off top and two rings. */}
      <rect className="artRule" height="14" width="14" x="240" y="73" />
      <rect className="artInk" fillOpacity="0.55" height="1" width="14" x="240" y="77" />
      <rect className="artInk" fillOpacity="0.55" height="4" width="1" x="244" y="70" />
      <rect className="artInk" fillOpacity="0.55" height="4" width="1" x="251" y="70" />
      {/* The panel, and the one date that is chosen. */}
      <rect className="artSunken" height="72" rx="4" width="224" x="48" y="112" />
      {[0, 1, 2].map((row) =>
        [0, 1, 2, 3, 4, 5, 6].map((column) => (
          <rect
            className="artInk"
            fillOpacity="0.28"
            height="6"
            key={`${row}-${column}`}
            rx="3"
            width="6"
            x={62 + column * 28}
            y={128 + row * 20}
          />
        )),
      )}
      {/* The selection moves to the next day. It had `artFill`, which scales,
          so picking a date grew the circle by half rather than putting it
          somewhere else, and `artFill` also pivots at `left center`, so it grew
          sideways off its own column. Twenty eight units is the column pitch,
          which is what makes the destination land on a day rather than between
          two. */}
      <circle
        className="artSolid artMotion artTravel"
        cx="121"
        cy="151"
        r="9"
        style={{ '--art-to': '28px' } as CSSProperties}
      />
    </>
  ),

  'file-input': (
    <>
      <rect className="artInk" fillOpacity="0.28" height="8" rx="4" width="56" x="48" y="44" />
      <rect className="artSunken" height="56" rx="4" width="224" x="48" y="64" />
      {[0, 1, 2, 3, 4, 5, 6, 7].map((step) => (
        <rect
          className="artRule"
          height="1"
          key={`top-${step}`}
          width="16"
          x={52 + step * 28}
          y="64"
        />
      ))}
      {[0, 1, 2, 3, 4, 5, 6, 7].map((step) => (
        <rect
          className="artRule"
          height="1"
          key={`bottom-${step}`}
          width="16"
          x={52 + step * 28}
          y="119"
        />
      ))}
      {/* The trigger, centred in the box the way the label is, and static.
          It carried `artFill` and so the one thing this card animated was a
          label growing forty percent wider, which is not a thing a file input
          does to anything. `artFill` is for a value filling a track. */}
      <rect className="artSolid" height="8" rx="4" width="64" x="128" y="88" />
      {/* Two chosen files under it, each with the mark that takes it back out.
          The second one slides in, because accepting a file is the whole of
          what this component does and the list is where that shows. It comes
          from the right rather than fading in place: a row that appears where
          it already was is indistinguishable from a row that was always there.
          Forty units, which puts its far edge at 312 and so inside the frame
          with no clip needed. */}
      <rect className="artSunken" height="16" rx="4" width="224" x="48" y="128" />
      <rect className="artInk" fillOpacity="0.4" height="6" rx="3" width="96" x="56" y="133" />
      <rect className="artInk" fillOpacity="0.28" height="2" rx="1" width="8" x="256" y="135" />
      <g className="artMotion artEdgeIn" style={{ '--art-from': '40px' } as CSSProperties}>
        <rect className="artSunken" height="16" rx="4" width="224" x="48" y="152" />
        <rect className="artInk" fillOpacity="0.4" height="6" rx="3" width="72" x="56" y="157" />
        <rect className="artInk" fillOpacity="0.28" height="2" rx="1" width="8" x="256" y="159" />
      </g>
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

  'number-input': (
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
        className="artSolid artMotion artFill"
        height="8"
        rx="4"
        style={{ '--art-grow': 1.6 } as CSSProperties}
        width="24"
        x="140"
        y="88"
      />
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
   * **The ring moves to the next box on hover**, which is what a pin actually
   * does: a character lands and the focus steps along. The first version grew
   * the character instead, with `--art-grow: 1`, which is `scaleX(1)` and is
   * nothing at all. Same fault this file records against `Outline`'s
   * `--art-to: 0`, and it survived because a still card looks correct. Caught by
   * shooting the real gallery rather than a harness that approximates it.
   *
   * The four sides of the ring travel as a group, so they arrive together.
   */
  'pin-input': (
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
      {/* The box the reader is in, ringed rather than filled, and stepping to the
          next one on hover. 52 is the pitch: a 40 box and a 12 gap. */}
      <g className="artSolid artMotion artTravel" style={{ '--art-to': '52px' } as CSSProperties}>
        <rect height="40" rx="4" width="2" x="152" y="80" />
        <rect height="40" rx="4" width="2" x="190" y="80" />
        <rect height="2" rx="1" width="40" x="152" y="80" />
        <rect height="2" rx="1" width="40" x="152" y="118" />
      </g>
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
      {/* Eighteen, which is the distance between the two knob positions and
          not a round number. The track runs 139 to 181 and the knob is inset
          four, so on sits at 169 and off at 151. At twenty it drove two units
          past the off position and pushed the knob into the track's own end
          cap, which is what reads as an overshoot on the way left. */}
      <g className="artMotion artKnob" style={{ '--art-to': '18px' } as CSSProperties}>
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
   * A field with a clock mark, and the column it opens.
   *
   * The same shape as Date Input's card, because they are the same control over
   * a different set: a reader who recognises one should read the other without
   * being told.
   */
  'time-input': (
    <>
      <rect className="artInk" fillOpacity="0.28" height="8" rx="4" width="40" x="48" y="40" />
      <rect className="artSunken" height="40" rx="4" width="224" x="48" y="60" />
      <rect className="artEdge" height="39" rx="4" width="223" x="48.5" y="60.5" />
      <rect className="artInk" fillOpacity="0.4" height="8" rx="4" width="56" x="64" y="76" />
      {/* The clock: a ring with two hands, at the size the calendar mark takes on
          its own card. */}
      <circle className="artRule" cx="247" cy="80" fill="none" r="7" strokeWidth="1.5" />
      <rect className="artInk" fillOpacity="0.55" height="4" width="1" x="247" y="76" />
      <rect className="artInk" fillOpacity="0.55" height="1" width="4" x="247" y="79" />
      {/* The list, and the row that is landed on. */}
      <rect className="artSunken" height="72" rx="4" width="224" x="48" y="112" />
      {[0, 1, 2].map((row) => (
        <rect
          className="artInk"
          fillOpacity="0.28"
          height="8"
          key={row}
          rx="4"
          width="48"
          x="64"
          y={126 + row * 22}
        />
      ))}
      <g className="artMotion artTravel" style={{ '--art-to': '22px' } as CSSProperties}>
        <rect className="artSolid" height="16" rx="4" width="192" x="64" y="122" />
      </g>
    </>
  ),

  /**
   * A column of times with one of them taken.
   *
   * Rows rather than a clock face. A clock is what the component is *about* and
   * not what it looks like, and the rule this gallery keeps is that a card draws
   * the shape a reader will meet: a node graph is not a Tree, and a dial is not a
   * list of quarter hours.
   */
  'time-picker': (
    <>
      <rect className="artSunken" height="140" rx="4" width="180" x="70" y="42" />
      {[0, 1, 2, 3].map((row) => (
        <rect
          className="artInk"
          fillOpacity="0.28"
          height="8"
          key={row}
          rx="4"
          width="52"
          x="86"
          y={62 + row * 32}
        />
      ))}
      {/* The one that is taken, and it travels: a list is scrolled past and
          landed on, which is a move rather than a swell. Thirty two is the row
          pitch, so it lands on a row rather than between two. */}
      <g className="artMotion artTravel" style={{ '--art-to': '32px' } as CSSProperties}>
        <rect className="artSolid" height="20" rx="4" width="148" x="86" y="86" />
      </g>
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
