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
 * has to be read rather than recognized has already failed at thumbnail size.
 * Where a count carries meaning it stays: Divider needs something either side of
 * the rule, Quote needs to wrap. Where it was only filling space it is gone.
 *
 * Loader is drawn at `loader-lg` rather than `md`, because at `md` its eight
 * marks would be under two pixels each.
 *
 * **Most of this group declares no archetype, and still moves.** Avatar,
 * Blockquote, Flex, Grid, Icon, Quote, Stat and Text have no runtime behavior
 * to replay: a type scale is not climbed one line at a time. Each of them briefly carried an
 * `artRow` anyway, and a stagger that means nothing is worse than no stagger,
 * because it teaches a reader that the stagger means nothing.
 *
 * They take the baseline in `site.css` instead, which is selected with `:has()`
 * rather than opted into: a drawing that declares no archetype gets it, and one
 * that declares an archetype does not. So the way to say "this component does
 * nothing at runtime" is to write no motion at all, which is also the way to
 * say nothing, and the two cannot drift apart.
 *
 * Callout, Divider, Empty, List, Loader, Progress, Skeleton and Splitter do
 * have something of their own. Divider is the one that moved off the baseline
 * after the fact: it has a single dimension worth animating, and the baseline
 * was scaling the whole drawing instead of the rule that is its subject.
 */
export const contentArt: Record<string, ReactNode> = {
  /* Rows read as a set, divided by a rule and nothing else. */
  /**
   * Shafts of light fanning from a source above the frame.
   *
   * **Contours, not a gradient, and that is the only thing the first pass got
   * wrong.** It drew this composition with two `linearGradient`s, which is a
   * better picture and an illegal one: ink here is a percentage of foreground
   * at `0.12`, `0.28` or `0.55`, and a ramp is every step there is. Redrawn as
   * a bloom, two shafts and a core at exactly those three, the fan survives and
   * the ink is countable.
   *
   * The correction after that went too far the other way, into flat bands and a
   * serpentine, which obeyed every rule and stopped looking like light. A card
   * has to be legible as its component first.
   *
   * The apex sits far above and to the right, well outside the clip. Distance
   * is what stops it reading as a road: brought close, the shafts converge hard
   * on a vanishing point and the card becomes a highway at night. Pushed out to
   * nearly three times the plane's height, they rake across it almost parallel,
   * which is what light through an opening actually does.
   *
   * **The widths are uneven on purpose.** Three shafts at one width and one
   * spacing read as paint: a fan is legible as light because the gaps between
   * its members are not equal, which is what an opening actually casts. And the
   * bloom stops short of the plane's edges, so there is dark on both sides to
   * be lit against.
   *
   * `artOpen` on the bloom and the shafts. The core is the part that is always
   * there; the fan is what arrives around it.
   */
  aura: (
    <>
      <defs>
        {/* The fan is drawn from a point outside the plane and `artOpen` scales
            it further, so it is clipped to the plane's own radius. */}
        <clipPath id="helixArtAuraPlane">
          <rect height="112" rx="8" width="224" x="48" y="44" />
        </clipPath>
      </defs>

      <rect className="artSunken" height="112" rx="8" width="224" x="48" y="44" />

      <g clipPath="url(#helixArtAuraPlane)">
        <g className="artMotion artOpen" style={{ transformOrigin: 'center' } as CSSProperties}>
          <path className="artInk" d="M244-132 52 156h184z" fillOpacity="0.12" />
          <path className="artInk" d="M244-132 84 156h34z" fillOpacity="0.28" />
          <path className="artInk" d="M244-132 140 156h18z" fillOpacity="0.28" />
          <path className="artInk" d="M244-132 186 156h28z" fillOpacity="0.28" />
        </g>
        <path className="artInk" d="M244-132 122 156h10z" fillOpacity="0.55" />
      </g>

      <rect className="artEdge" height="111" rx="8" width="223" x="48.5" y="44.5" />
    </>
  ),
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

  /* A passage set off by a rule and an indent. Two lines is a passage. */
  /**
   * Four columns standing on a rule, at four different heights.
   *
   * The rule is the subject as much as the columns are. What separates this
   * from a row of bars is that a bar chart is measured *from* somewhere, and
   * that somewhere is zero: a card with columns floating free would be drawing
   * the mistake the component refuses to ship a switch for.
   *
   * Heights in a 4:2:7:5 ratio off the baseline, so no two are close enough to
   * read as the same and the tallest is not the last. A card whose columns
   * ascend evenly reads as a diagram of a bar chart rather than as one.
   *
   * Still, like the other charts. Columns do not move.
   */
  'bar-chart': (
    <>
      <rect className="artInk" fillOpacity="0.55" height="32" rx="2" width="28" x="64" y="112" />
      <rect className="artInk" fillOpacity="0.28" height="16" rx="2" width="28" x="108" y="128" />
      <rect className="artInk" fillOpacity="0.55" height="56" rx="2" width="28" x="152" y="88" />
      <rect className="artInk" fillOpacity="0.28" height="40" rx="2" width="28" x="196" y="104" />
      <rect className="artRule" height="1" width="224" x="48" y="144" />
    </>
  ),

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

  code: (
    <>
      <path
        className="artStroke"
        d="M138 92l-12 8 12 8"
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2.5"
      />
      {/* Only the slash moves. Lifting the whole glyph moved the two chevrons
          that hold it, which reads as the card breathing rather than as the one
          mark that makes this a fragment of code. */}
      <path
        className="artStroke artMotion artMark"
        d="M154 86l12 28"
        fill="none"
        strokeLinecap="round"
        strokeWidth="2.5"
      />
      <path
        className="artStroke"
        d="M182 92l12 8-12 8"
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2.5"
      />
    </>
  ),

  'code-block': (
    <>
      <rect className="artEdge" fill="none" height="72" rx="5" width="112" x="104" y="64" />
      <path className="artEdge" d="M104 84h112" />
      <g className="artMotion artLift">
        <rect className="artSolid" height="3" rx="1.5" width="30" x="118" y="98" />
        <rect className="artInk" height="3" rx="1.5" width="52" x="118" y="110" />
        <rect className="artInk" height="3" rx="1.5" width="38" x="118" y="122" />
      </g>
      <circle className="artOn artInk" cx="204" cy="74" r="3" />
    </>
  ),

  divider: (
    <>
      {/* Centered, all three. They were flush left at 48 while the rule ran 48 to
          272, so the one element already centered was the only one that looked
          wrong: two lines hanging left under a rule reaching further right than
          either of them. Each is centered on 160 now, and the only ragged thing
          left is the line lengths, which is what a line length is for. */}
      <rect className="artInk" fillOpacity="0.28" height="8" rx="4" width="160" x="80" y="84" />
      {/* The rule draws itself out, from the middle, and 224 is where it ends
          rather than where it starts.
       *
       * At rest it is 176, which is exactly the width of the longer line below
       * it: the rule spans its content and no further. Hovered it reaches 224,
       * running 48 to 272, which is the full measure every other drawing in the
       * gallery is built out to. So the gesture is the rule going from "as wide
       * as what it divides" to "as wide as the frame allows", and both ends of
       * it are a number that already meant something rather than a percentage
       * picked to be visible.
       *
       * `artFill` rather than the baseline swell, because a divider has exactly
       * one dimension worth moving and the baseline was scaling the whole
       * drawing, the two lines included. Those hold still now: the rule is the
       * component and the lines are only there to be divided.
       *
       * `transform-origin` overridden to `center`. `artFill` pivots at `left
       * center`, which is right for a value growing out of a track's start and
       * wrong for a rule that has no start: off a fixed left end it would
       * extend rightward, which is a progress bar. */}
      <rect
        className="artRule artMotion artFill"
        height="1"
        style={{ '--art-grow': 224 / 176, transformOrigin: 'center' } as CSSProperties}
        width="176"
        x="72"
        y="100"
      />
      <rect className="artInk" fillOpacity="0.28" height="8" rx="4" width="176" x="72" y="108" />
    </>
  ),

  /*
   * One rule, and the two groups it makes.
   *
   * One line either side, not two. The subject is the rule; the lines are only
   * there to be separated by it, and a second line on each side says nothing
   * the first did not while making the rule the smallest thing in the frame.
   */
  /**
   * A ring of three unequal arcs, drawn the way the component draws it.
   *
   * Unequal because a ring cut into equal parts reads as a diagram of a donut
   * rather than as one, the same reason the bar chart's columns are not a
   * staircase. Dashes rather than arc paths, for the reason the component
   * records: an arc command needs a sweep flag and a large-arc flag, both of
   * which flip at values a reader never sees coming.
   *
   * Still, like the other charts. The shares do not move.
   */
  'donut-chart': (
    <>
      <circle
        className="artStroke"
        cx="160"
        cy="112"
        fill="none"
        r="44"
        strokeDasharray="97 179"
        strokeOpacity="0.55"
        strokeWidth="14"
        transform="rotate(-90 160 112)"
      />
      <circle
        className="artStroke"
        cx="160"
        cy="112"
        fill="none"
        r="44"
        strokeDasharray="83 193"
        strokeDashoffset="-97"
        strokeOpacity="0.28"
        strokeWidth="14"
        transform="rotate(-90 160 112)"
      />
      <circle
        className="artStroke"
        cx="160"
        cy="112"
        fill="none"
        r="44"
        strokeDasharray="56 220"
        strokeDashoffset="-180"
        strokeOpacity="0.16"
        strokeWidth="14"
        transform="rotate(-90 160 112)"
      />
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

  /**
   * A picture in a bounded box, with a horizon, a sun and two ridges.
   *
   * The box is the subject rather than what is in it. What this component adds
   * over an `<img>` is that it reserves its ground and says whether the picture
   * arrived, so the drawing is a frame that is unmistakably a frame, holding a
   * scene generic enough that nobody reads it as a photograph of something.
   *
   * `artOpen` on the scene alone, not the frame. The frame is the part that was
   * there all along, and the picture is the part that arrives into it, which is
   * the whole of what the element does. Scaling the frame with it would say the
   * box turned up too, and the box turning up is the thing this component
   * exists to prevent.
   */
  image: (
    <>
      <defs>
        {/* The frame is a window and the picture is behind it, so the picture is
            clipped to it. Not decoration: the ridges are flush with the frame on
            three sides at rest, so the hover scale pushed them straight out and
            the card grew a grey wedge hanging off its own edge. */}
        <clipPath id="helixArtImageFrame">
          <rect height="112" rx="8" width="224" x="48" y="44" />
        </clipPath>
      </defs>
      <rect className="artSunken" height="112" rx="8" width="224" x="48" y="44" />
      {/* The clip is on a group of its own, outside the one that moves. A
          `clip-path` on the moving group would resolve in that group's own
          space, which is the space the scale just changed, so it would grow
          with the thing it is supposed to be holding in. */}
      <g clipPath="url(#helixArtImageFrame)">
        <g className="artMotion artOpen" style={{ transformOrigin: 'center' } as CSSProperties}>
          <circle className="artInk" cx="96" cy="80" fillOpacity="0.28" r="12" />
          <path className="artInk" d="M48 156v-24l40-32 34 28 30-24 48 52z" fillOpacity="0.28" />
          <path className="artInk" d="M136 156l40-36 96 36z" fillOpacity="0.55" />
        </g>
      </g>
      <rect className="artEdge" height="111" rx="8" width="223" x="48.5" y="44.5" />
    </>
  ),
  /* Two lines and a caret. A block of code drawn as real glyphs would be
     unreadable at this size and would be a different language per card. */
  /* `</>`, which is what a fragment of code looks like when it is small enough
     to be a mark. The first drawing was a single caret beside a rule, which
     read as a list item pointing the wrong way: it was a caret and a line, not
     a picture of anything. */
  /**
   * Three rows, each a filled patch and the name it stands for.
   *
   * The patch is the whole subject. Take it away and this is `list`, and every
   * other way of saying "legend" draws the chart instead, which the system
   * forbids for the reason `tree` records: a drawing depicts what the component
   * is, not what it sits next to.
   *
   * Solid and edgeless, so they read as colour rather than as controls. An
   * outlined square in a column of three is a checkbox list. The weights
   * descend because the grid is monotone and has no accent, and three series
   * that differ is the fact the card has to carry.
   *
   * Still, like `stat` and `trend`. A legend does not move.
   */
  legend: (
    <>
      <rect className="artInk" fillOpacity="0.55" height="12" rx="4" width="12" x="100" y="62" />
      <rect className="artInk" fillOpacity="0.55" height="8" rx="4" width="88" x="120" y="64" />

      <rect className="artInk" fillOpacity="0.28" height="12" rx="4" width="12" x="100" y="96" />
      <rect className="artInk" fillOpacity="0.28" height="8" rx="4" width="104" x="120" y="98" />

      <rect className="artInk" fillOpacity="0.12" height="12" rx="4" width="12" x="100" y="130" />
      <rect className="artInk" fillOpacity="0.12" height="8" rx="4" width="72" x="120" y="132" />
    </>
  ),

  /**
   * Two lines over one baseline, which is what separates this card from the
   * sparkline's.
   *
   * A sparkline is one stroke and no ground; a line chart is several series on
   * one scale, so the card shows two that cross rather than two that run
   * parallel. Crossing is the fact a shared scale makes visible and two scales
   * would hide.
   *
   * Still, like the other charts. The readings do not move.
   */
  'line-chart': (
    <>
      {/* Only the leading line answers the pointer. The whole drawing used to,
          which moved the baseline and the second series with it and read as the
          chart sliding rather than as a reading changing. */}
      <g className="artMotion artLift">
        <path
          className="artStroke"
          d="M64 128L108 104L152 116L196 76L240 88"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeOpacity="0.55"
          strokeWidth="2.5"
        />
      </g>
      <path
        className="artStroke"
        d="M64 92L108 118L152 100L196 126L240 118"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeOpacity="0.28"
        strokeWidth="2.5"
      />
      <rect className="artRule" height="1" width="224" x="48" y="144" />
    </>
  ),

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
   * Marks around a ring, at `loader-lg`. Marks rather than an arc, because
   * that is what the component draws, and because an arc would need a stroke.
   * It rotates about its own bounding-box center.
   */
  loader: (
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

  /*
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
   * that has to be read rather than recognized has already failed at thumbnail
   * size.
   *
   * The bands are color in the component and cannot be here, since the gallery
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
          Drawn in the page's own color, so they cut the fill rather than sit on
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
   * The one component whose picture is the component. A code is a square of
   * squares, so the card draws a fragment of one: three finders at the corners
   * and a scatter between them, at the scale a real code would sit at rather
   * than as a decorative grid.
   *
   * Not a scannable code, and deliberately not. A card is 320 wide at full
   * size and a quarter of that in a gallery, where a real code would be too
   * small to read and would invite a reader to try.
   */
  'qr-code': (
    <>
      <g className="artMotion artOpen">
        <rect className="artRaised" height="128" rx="4" width="128" x="96" y="36" />
        {(
          [
            [112, 52],
            [176, 52],
            [112, 116],
          ] as const
        ).map(([x, y]) => (
          <g key={`${x}-${y}`}>
            <rect className="artInk" fillOpacity="0.55" height="32" rx="2" width="32" x={x} y={y} />
            <rect className="artRaised" height="20" rx="1" width="20" x={x + 6} y={y + 6} />
            <rect
              className="artInk"
              fillOpacity="0.55"
              height="12"
              rx="1"
              width="12"
              x={x + 10}
              y={y + 10}
            />
          </g>
        ))}
        {(
          [
            [152, 92],
            [164, 92],
            [152, 104],
            [176, 104],
            [188, 92],
            [152, 128],
            [164, 140],
            [188, 128],
            [176, 140],
            [188, 152],
          ] as const
        ).map(([x, y], index) => (
          <rect
            className="artInk artMotion artRow"
            fillOpacity="0.28"
            height="8"
            key={`${x}-${y}`}
            rx="1"
            style={{ '--art-i': index % 3 } as CSSProperties}
            width="8"
            x={x}
            y={y}
          />
        ))}
      </g>
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

  'scroll-area': (
    <>
      <defs>
        <clipPath id="helixArtScrollFrame">
          <rect height="112" rx="8" width="224" x="48" y="44" />
        </clipPath>
        {/* Stops carry the token directly, the way `skeleton`'s sweep does:
            a class cannot reach a `<stop>`, which takes `stop-color` rather
            than `fill`. Fading to the sunken surface the frame is painted in,
            because that is the ground the rows are disappearing into. */}
        <linearGradient id="helixArtScrollFade" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="var(--helix-color-surface-sunken)" stopOpacity="0" />
          <stop offset="1" stopColor="var(--helix-color-surface-sunken)" stopOpacity="1" />
        </linearGradient>
      </defs>
      <rect className="artSunken" height="112" rx="8" width="224" x="48" y="44" />
      <g clipPath="url(#helixArtScrollFrame)">
        <g
          className="artMotion artTravel"
          style={{ '--art-to': '0px', '--art-to-block': '-14px' } as CSSProperties}
        >
          <rect className="artInk" fillOpacity="0.55" height="8" rx="4" width="152" x="64" y="60" />
          <rect className="artInk" fillOpacity="0.28" height="8" rx="4" width="184" x="64" y="80" />
          <rect
            className="artInk"
            fillOpacity="0.28"
            height="8"
            rx="4"
            width="168"
            x="64"
            y="100"
          />
          <rect
            className="artInk"
            fillOpacity="0.28"
            height="8"
            rx="4"
            width="192"
            x="64"
            y="120"
          />
          <rect
            className="artInk"
            fillOpacity="0.28"
            height="8"
            rx="4"
            width="144"
            x="64"
            y="140"
          />
        </g>
        {/* The band at the bottom edge, which is the whole point of the card. */}
        <rect fill="url(#helixArtScrollFade)" height="36" width="224" x="48" y="120" />
      </g>
      <rect className="artEdge" height="111" rx="8" width="223" x="48.5" y="44.5" />
    </>
  ),

  /**
   * A line and the dot on its last value, with nothing else on the card.
   *
   * The nothing else is half the drawing. What separates a sparkline from a
   * line chart is that it has no axis, no ticks and no grid, so the card that
   * says so is the one where those are conspicuously absent; adding a baseline
   * to give the line something to sit on would turn it into the chart it is
   * not. The empty band above and below carries the other half, that this is a
   * mark at the scale of the type beside it rather than a figure of its own.
   *
   * `artSolid` on the dot and ink on the line, because where the series ended
   * is the one point a reader looks for, and it is the only thing here worth
   * emphasising.
   *
   * Stroked rather than built from rects, which is the exception `code-block`
   * already makes: a rule stays a filled rect so it never half-renders at one
   * unit, and a path that changes direction six times cannot be rects at all.
   *
   * Still, like `stat`, `trend` and `legend`. A sparkline does not move.
   */
  sparkline: (
    <>
      <path
        className="artStroke"
        d="M80 120L107 96L133 132L160 100L187 112L213 88L240 72"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeOpacity="0.55"
        strokeWidth="2.5"
      />
      {/* The terminus presses, and the line does not move. A sparkline is one
          line, so swelling the body was swelling the only thing on the card. */}
      <circle className="artSolid artMotion artOn" cx="240" cy="72" r="5" />
    </>
  ),

  splitter: (
    <>
      {/* All three move, because a divider that slides across two panes which
          stay put is not a splitter, it is a line on top of a picture of one.
          The panes are what the drag is *for*.
       *
       * The numbers are one number. The divider travels 24, so the left pane
       * has to end 24 wider (128 over 104, a scale of 1.231 from its left edge)
       * and the right 24 narrower (88 over 112, 0.786 from its right edge).
       * Each pane keeps its outer edge nailed down and gives way at the seam,
       * which is what `transform-origin` is doing on both.
       *
       * `artFill` takes a scale under one, which it had never been asked for
       * before: the sustain interpolates the delta rather than the scale, so a
       * value below one shrinks toward the hold exactly as one above it grows. */}
      <g
        className="artMotion artFill"
        style={{ '--art-grow': 1.231, transformOrigin: 'left center' } as CSSProperties}
      >
        <rect className="artSunken" height="96" rx="4" width="104" x="48" y="52" />
      </g>
      <g
        className="artMotion artFill"
        style={{ '--art-grow': 0.786, transformOrigin: 'right center' } as CSSProperties}
      >
        <rect className="artSunken" height="96" rx="4" width="112" x="160" y="52" />
      </g>
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

  /**
   * A rail down the side with the marks on it, which is the whole difference
   * from `list`: what makes a timeline is the line joining one entry to the
   * next, and each mark sitting on it at the height of what it happened to.
   */
  timeline: (
    <>
      <rect className="artRule" height="112" width="2" x="71" y="48" />
      {[
        { fill: 0.55, y: 56 },
        { fill: 0.28, y: 100 },
        { fill: 0.12, y: 144 },
      ].map((entry) => (
        <g key={entry.y}>
          <circle className="artInk" cx="72" cy={entry.y} fillOpacity={entry.fill} r="9" />
          <rect
            className="artInk"
            fillOpacity="0.12"
            height="5"
            rx="2.5"
            width="36"
            x="100"
            y={entry.y - 12}
          />
          <rect
            className="artInk"
            fillOpacity={entry.fill}
            height="7"
            rx="3.5"
            width={entry.y === 100 ? 128 : 96}
            x="100"
            y={entry.y - 3}
          />
        </g>
      ))}
    </>
  ),

  /*
   * A frame with a bar across the bottom of it, which is the whole of what this
   * component replaces: the picture is the platform's and the controls are
   * ours. So the card draws the bar, and leaves the picture as a field.
   *
   * The played part of the scrubber grows on hover. It is the one thing on the
   * card that is about time passing, and a still card of a video player says
   * nothing that a still card of a card does not.
   */
  /**
   * Two movements of equal weight, one up and one down, and no clue which is
   * the good news.
   *
   * That is the component's whole argument drawn rather than stated. A card
   * that emphasised the rising one, with `artSolid` or with more ink, would
   * say up is the one that matters, which is the default this component exists
   * to refuse: the judgment is `good`, the consumer sets it, and the picture
   * has no business guessing.
   *
   * The arrow is the subject and the bars are what it qualifies, which is what
   * separates this from `stat`. There the number is the drawing; here the
   * number is a bar the same size twice, and the only difference between the
   * two rows is which way the glyph points.
   *
   * Still, like `stat`. A trend does not move, and the archetypes are for
   * components whose motion is part of what they are.
   */
  trend: (
    <>
      {/* One reading rather than two. Two of them said "here are two trends";
          the component says which way a number went, and an arrow that turns
          says that. */}
      <g className="artMotion artTurn">
        <path className="artInk" d="M58 60l-7.5 7.5L52 69l6-6 6 6 1.5-1.5z" fillOpacity="0.55" />
        <rect className="artInk" fillOpacity="0.55" height="14" rx="1" width="2" x="57" y="64" />
      </g>
      <rect className="artInk" fillOpacity="0.55" height="12" rx="6" width="64" x="76" y="64" />
      <rect className="artInk" fillOpacity="0.12" height="6" rx="3" width="88" x="76" y="84" />
    </>
  ),
  video: (
    <>
      <rect className="artInk" fillOpacity="0.12" height="128" rx="4" width="208" x="56" y="36" />
      <path className="artInk" d="M148 84l24 14-24 14z" fillOpacity="0.4" />
      <rect className="artInk" fillOpacity="0.28" height="28" rx="0" width="208" x="56" y="136" />
      <path className="artInk" d="M72 146l8 5-8 5z" fillOpacity="0.55" />
      <rect className="artInk" fillOpacity="0.28" height="4" rx="2" width="136" x="90" y="149" />
      <rect
        className="artSolid artMotion artFill"
        height="4"
        rx="2"
        style={{ '--art-grow': 3 } as CSSProperties}
        width="36"
        x="90"
        y="149"
      />
      <rect className="artInk" fillOpacity="0.55" height="8" rx="1" width="8" x="238" y="147" />
    </>
  ),
  'video-playlist': (
    <>
      {/* The player, and the set waiting beside it. The one playing is marked
          down its leading edge rather than filled, which is what the row does. */}
      <rect className="artInk" fillOpacity="0.12" height="104" rx="4" width="140" x="28" y="48" />
      <path className="artInk" d="M88 88l20 12-20 12z" fillOpacity="0.4" />
      <rect className="artInk" fillOpacity="0.28" height="20" rx="0" width="140" x="28" y="132" />
      <rect className="artInk" fillOpacity="0.12" height="28" rx="3" width="88" x="184" y="48" />
      <rect
        className="artSolid artMotion artFill"
        height="28"
        rx="3"
        style={{ '--art-grow': 3 } as CSSProperties}
        width="3"
        x="184"
        y="48"
      />
      <rect className="artInk" fillOpacity="0.4" height="16" rx="2" width="24" x="191" y="54" />
      <rect className="artInk" fillOpacity="0.28" height="4" rx="2" width="44" x="221" y="60" />
      <rect className="artInk" fillOpacity="0.12" height="28" rx="3" width="88" x="184" y="84" />
      <rect className="artInk" fillOpacity="0.4" height="16" rx="2" width="24" x="191" y="90" />
      <rect className="artInk" fillOpacity="0.28" height="4" rx="2" width="44" x="221" y="96" />
      <rect className="artInk" fillOpacity="0.12" height="28" rx="3" width="88" x="184" y="120" />
      <rect className="artInk" fillOpacity="0.4" height="16" rx="2" width="24" x="191" y="126" />
      <rect className="artInk" fillOpacity="0.28" height="4" rx="2" width="44" x="221" y="132" />
    </>
  ),

  /*
   * One measurement at `text-3xl`, and the `text-xs` word for what it measures.
   * The pair behind a rule is the group, which is what stops one bar over
   * another from reading as `text`.
   */
  /*
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
  /*
   * A bounded box with rows running past its bottom edge, and the edge saying so.
   *
   * The subject is the fade rather than the scrolling. What this component adds
   * over `overflow: auto` is the one fact CSS cannot work out, which is that
   * there is more below, so the drawing is a stack of rows cut off by a band
   * that dissolves into the ground.
   *
   * `artTravel` on the rows, downward, because the reader scrolls and the
   * content is what moves. The clip is on a group outside the one that travels,
   * for the reason `image` records: a clip on the moving group resolves in the
   * space the transform just changed and grows along with it.
   */
  /**
   * A window over a set most of which is not there.
   *
   * The rows inside the frame are drawn and the ones outside it are a pair of
   * spacers, which is exactly what the component renders: the picture is the
   * mechanism rather than an illustration of it. The two ghosts above and below
   * are at a fraction of the ink, so a reader can see there is more without the
   * card claiming those rows exist.
   *
   * `artTravel` on the drawn rows, because a scroll is what moves the window
   * and the window is the subject. The clip sits on a group outside the one
   * that travels, for the reason `image` records and `scroll-area` repeats.
   */
  'virtual-list': (
    <>
      <defs>
        <clipPath id="helixArtWindowFrame">
          <rect height="72" rx="6" width="224" x="48" y="64" />
        </clipPath>
      </defs>
      {/* The spacers, which stand in for the rows that were never made. */}
      <rect className="artInk" fillOpacity="0.1" height="20" rx="4" width="224" x="48" y="40" />
      <rect className="artInk" fillOpacity="0.1" height="20" rx="4" width="224" x="48" y="140" />
      <rect className="artSunken" height="72" rx="6" width="224" x="48" y="64" />
      <g clipPath="url(#helixArtWindowFrame)">
        <g
          className="artMotion artTravel"
          style={{ '--art-to': '0px', '--art-to-block': '-16px' } as CSSProperties}
        >
          <rect className="artInk" fillOpacity="0.55" height="8" rx="4" width="150" x="60" y="72" />
          <rect className="artInk" fillOpacity="0.28" height="8" rx="4" width="188" x="60" y="88" />
          <rect
            className="artInk"
            fillOpacity="0.55"
            height="8"
            rx="4"
            width="132"
            x="60"
            y="104"
          />
          <rect
            className="artInk"
            fillOpacity="0.28"
            height="8"
            rx="4"
            width="176"
            x="60"
            y="120"
          />
          <rect
            className="artInk"
            fillOpacity="0.28"
            height="8"
            rx="4"
            width="160"
            x="60"
            y="136"
          />
        </g>
      </g>
      {/* The frame edge, drawn over the rows so the window reads as a cut. */}
      <rect className="artEdge" fill="none" height="72" rx="6" width="224" x="48" y="64" />
    </>
  ),
}
