import styles from './landing-c.module.css'
import { StillWhenUnseen } from './still-when-unseen'

/**
 * The derivation, drawn as a routing diagram.
 *
 * **A drawing rather than a chart, and every piece here is what makes that
 * distinction.** A dashed frame with corner ticks says the figure is a detail
 * cropped from a larger sheet. A starfield puts it in space rather than on
 * paper. Dashed dividers on the two columns the routing uses say the layout was
 * planned. None of it is decoration for its own sake: taken away, the diagram
 * reads as a flowchart, which is a weaker and more common thing.
 *
 * **Two layers over one geometry.** The base is quiet and permanent, the pulse
 * moves over it. A single bright layer drawing itself in on a `view()` timeline
 * and looping makes the figure dismantle and rebuild itself every few seconds
 * while somebody is reading it.
 *
 * **The pulses never seam, because every path carries its own length.** A dash
 * of `[16, len - 16]` is exactly one lit segment, and winding the offset by
 * `len` over the cycle returns the pattern to its start, so the loop closes at
 * any length. This is what `pathLength="100"` was supposed to buy and does not
 * deliver in WebKit; the numbers are computed from the geometry that produced
 * the paths instead.
 *
 * **The reference's intake fade is not copied, and that is a judgment.** Its
 * left card dissolves at the outer edge, which reads well because what fades is
 * a panel behind icons. Applied here it fades the labels themselves, and those
 * are content: it leaves "brand" and "density" visibly weaker than "179" and
 * "67" across the same figure, which says the inputs matter less. They do not.
 */
export const DerivationDiagram = () => (
  <StillWhenUnseen className={styles.diagram}>
    <svg
      aria-labelledby="derivation-title derivation-desc"
      className={styles.diagramSvg}
      role="img"
      viewBox="0 44 1200 366"
    >
      <title id="derivation-title">How a palette is derived from one color</title>
      <desc id="derivation-desc">
        A brand color, a saturation, a density and a radius feed a derivation engine, which emits
        179 semantic tokens in both schemes with 67 foreground and ground pairs measured.
      </desc>

      <defs>
        <linearGradient id="derivation-chroma" x1="0" x2="1">
          <stop offset="0" stopColor="var(--helix-color-foreground-subtle)" />
          <stop offset="1" stopColor="var(--helix-color-primary)" />
        </linearGradient>
        <linearGradient id="derivation-fade" x1="0" x2="1">
          <stop offset="0" stopColor="white" stopOpacity="0" />
          <stop offset="0.13" stopColor="white" stopOpacity="1" />
          <stop offset="0.87" stopColor="white" stopOpacity="1" />
          <stop offset="1" stopColor="white" stopOpacity="0" />
        </linearGradient>
        <mask id="derivation-mask">
          <rect fill="url(#derivation-fade)" height="366" width="1200" x="0" y="44" />
        </mask>
        {/* **Dashed, so the mesh is broken rather than ruled.** A continuous
            grid reads as graph paper and sits flat behind everything; a
            fragmented one reads as a field the drawing is suspended in. The dash
            divides 40 evenly, so the pattern still tiles seamlessly. */}
        <pattern height="40" id="derivation-grid" patternUnits="userSpaceOnUse" width="40" y="27">
          <path
            d="M40 0H0V40"
            fill="none"
            stroke="var(--helix-color-border)"
            strokeDasharray="3 5"
            strokeWidth="1"
          />
        </pattern>
        <radialGradient id="derivation-bloom">
          <stop offset="0" stopColor="var(--helix-color-primary)" stopOpacity="0.22" />
          <stop offset="0.6" stopColor="var(--helix-color-primary)" stopOpacity="0.05" />
          <stop offset="1" stopColor="var(--helix-color-primary)" stopOpacity="0" />
        </radialGradient>
        {/* Four squares at the frame's corners. Unpainted area in a mask is
            black and therefore hidden, so the squares are the whole of it. 24
            units holds the largest corner the theme can ask for and still
            leaves an arm either side of it. */}
        <mask id="derivation-corners">
          <rect fill="white" height="24" width="24" x="44" y="84" />
          <rect fill="white" height="24" width="24" x="1132" y="84" />
          <rect fill="white" height="24" width="24" x="1132" y="372" />
          <rect fill="white" height="24" width="24" x="44" y="372" />
        </mask>
      </defs>

      <g mask="url(#derivation-mask)">
        {/* **Oversized and drifting exactly one tile.** The rect runs a tile
            past each edge so the translation never exposes its own boundary, and
            the travel is 40, the pattern's pitch, so the loop returns to an
            identical arrangement and has no seam. */}
        <g className={styles.diagramField}>
          <rect
            fill="url(#derivation-grid)"
            height="440"
            opacity="0.5"
            width="1280"
            x="-40"
            y="20"
          />
        </g>
      </g>

      {/* The field. Small enough to be noticed second. */}
      <g className={styles.diagramStars} fill="var(--helix-color-foreground)">
        <circle cx="597" cy="234" opacity="0.39" r="1.7" />
        <circle cx="1138" cy="362" opacity="0.20" r="1.3" />
        <circle cx="870" cy="155" opacity="0.17" r="1.2" />
        <circle cx="179" cy="396" opacity="0.25" r="1.6" />
        <circle cx="615" cy="267" opacity="0.22" r="1.1" />
        <circle cx="386" cy="341" opacity="0.17" r="1.0" />
        <circle cx="193" cy="362" opacity="0.10" r="1.2" />
        <circle cx="828" cy="393" opacity="0.36" r="1.4" />
        <circle cx="216" cy="127" opacity="0.21" r="1.6" />
        <circle cx="1100" cy="76" opacity="0.26" r="1.7" />
        <circle cx="513" cy="242" opacity="0.12" r="1.6" />
        <circle cx="154" cy="241" opacity="0.17" r="1.8" />
        <circle cx="434" cy="157" opacity="0.31" r="1.3" />
        <circle cx="100" cy="314" opacity="0.23" r="0.8" />
        <circle cx="59" cy="327" opacity="0.14" r="1.6" />
        <circle cx="763" cy="225" opacity="0.10" r="1.0" />
        <circle cx="661" cy="142" opacity="0.10" r="1.4" />
        <circle cx="951" cy="84" opacity="0.31" r="1.6" />
        <circle cx="529" cy="178" opacity="0.35" r="1.6" />
        <circle cx="150" cy="219" opacity="0.13" r="0.8" />
        <circle cx="1113" cy="218" opacity="0.13" r="0.9" />
        <circle cx="929" cy="294" opacity="0.32" r="1.2" />
        <circle cx="927" cy="128" opacity="0.18" r="1.7" />
        <circle cx="785" cy="382" opacity="0.36" r="1.6" />
        <circle cx="377" cy="241" opacity="0.14" r="1.3" />
        <circle cx="593" cy="352" opacity="0.12" r="1.5" />
        <circle cx="1083" cy="351" opacity="0.32" r="1.1" />
        <circle cx="783" cy="250" opacity="0.24" r="1.0" />
        <circle cx="1007" cy="150" opacity="0.17" r="1.8" />
        <circle cx="369" cy="353" opacity="0.30" r="1.0" />
        <circle cx="1055" cy="309" opacity="0.33" r="1.5" />
        <circle cx="274" cy="270" opacity="0.20" r="1.9" />
        <circle cx="844" cy="266" opacity="0.14" r="1.3" />
        <circle cx="627" cy="151" opacity="0.35" r="0.9" />
        <circle cx="1137" cy="179" opacity="0.17" r="1.4" />
        <circle cx="544" cy="341" opacity="0.21" r="1.2" />
        <circle cx="1042" cy="321" opacity="0.34" r="1.1" />
        <circle cx="1031" cy="70" opacity="0.11" r="1.2" />
        <circle cx="959" cy="388" opacity="0.37" r="1.8" />
        <circle cx="69" cy="218" opacity="0.14" r="0.9" />
        <circle cx="1133" cy="400" opacity="0.37" r="1.9" />
        <circle cx="1054" cy="77" opacity="0.26" r="1.4" />
        <circle cx="1144" cy="330" opacity="0.13" r="1.0" />
        <circle cx="558" cy="120" opacity="0.22" r="0.9" />
        <circle cx="575" cy="197" opacity="0.30" r="1.1" />
        <circle cx="954" cy="262" opacity="0.34" r="0.8" />
      </g>

      {/* The sheet this is a detail of. */}
      <rect
        className={styles.diagramFrame}
        fill="none"
        height="312"
        stroke="var(--helix-color-border)"
        strokeDasharray="2 7"
        width="1112"
        x="44"
        y="84"
      />
      {/* **The registration marks, as one rounded rect seen through its own
          corners.**

          Four `path` elements with a square turn in each is the obvious version
          and cannot be themed: path data is a string and CSS cannot reach
          inside it. Every card on the page answers to the radius slider, so
          that version leaves the drawing frame at right angles around content
          that has gone soft.

          A `rect` can be themed, because `rx` is an SVG 2 geometry property as
          well as an attribute and CSS may set it. Drawing the whole rectangle
          and masking it back to four 24-unit squares gives the same four marks
          with whatever corner the theme is using: the mask shows the turn and
          the first dozen units of each arm, and hides the long sides that the
          dashed frame underneath is already drawing. */}
      <rect
        className={styles.diagramCorners}
        fill="none"
        height="312"
        mask="url(#derivation-corners)"
        stroke="var(--helix-color-foreground-muted)"
        strokeOpacity="0.55"
        strokeWidth="1.2"
        width="1112"
        x="44"
        y="84"
      />
      <g stroke="var(--helix-color-border)" strokeDasharray="2 7" strokeWidth="1">
        <line x1="400" x2="400" y1="84" y2="396" />
        <line x1="800" x2="800" y1="84" y2="396" />
      </g>

      {/* ── What you choose ─────────────────────────────────────── */}
      {/* **Every row is centered on the track its connector leaves from.**
          The taps are at 120, 200, 280 and 360, evenly 80 apart. Glyph centers
          and text baselines are derived from the tap rather than set by hand, so
          a row cannot come out detached from its own wire. */}
      {/* **The section labels sit outside the frame, and that is what centers
          the drawing.** They are annotations about the figure rather than parts
          of it: inside the dashed rectangle they add mass at the top with
          nothing balancing it below, and the block including them centers on 227
          where the four rows center on the hub at 240. Lifted out, the frame
          holds only the rows, and the rows are already centered. */}
      <text className={styles.diagramLabel} fontSize="13" x="72" y="72">
        What you choose
      </text>

      {/* **A hit area, because a stroke is not a target.** The channel a
          pointer is over decides what the whole figure emphasizes, and painted
          pixels alone will not answer for it: `brand` and `saturation` are
          filled rects, but `density` is three 1.6-unit lines and `radius` is a
          `fill="none"` path, so both would want the pointer on a hairline. The
          gap between a glyph and its word would answer to nothing at all, which
          is most of the row.

          `fill="transparent"` rather than `fill="none"`: none is not painted
          and not hit-tested, transparent is hit-tested and invisible. The band
          stops at 264, short of the routing at 280, so a row claims its own
          words and none of the wire. */}
      {/* **The inputs are right-aligned, and the outputs are left-aligned.**
          Both columns put their clean vertical against the routing and their
          ragged edge against the outer air, which is the only arrangement that
          reads as symmetric: a column aligned the other way leaves a void
          between the words and the wire whose width is whatever the longest
          label happened to be.

          The outputs sit a flat 34 from their junction, and text on this side
          ends at 246, which is 280 minus that same 34, so both halves of the
          figure hold the same gap.

          **Each icon is placed from its label's width** rather than sharing one
          column, so the 16 between a glyph and its word is the same on every
          row. That is the relationship the eye checks; a shared icon column
          would hold a different line straight and let this one drift to 45.
          It does mean these four x values assume `Fusion Sans` at 15: a fallback
          face with wider metrics moves the words, not the icons, and the gap
          closes. The rows are hit-tested by the bands below, which are generous
          enough that none of this affects what is clickable. */}
      <g data-ch="brand">
        <rect fill="transparent" height="64" width="200" x="64" y="88" />
        <rect fill="var(--helix-color-primary)" height="32" rx="9" width="32" x="158.5" y="104" />
        <text className={styles.diagramMeta} fontSize="15" textAnchor="end" x="246" y="126">
          brand
        </text>
      </g>

      <g data-ch="saturation">
        <rect fill="transparent" height="64" width="200" x="64" y="168" />
        <rect fill="url(#derivation-chroma)" height="14" rx="7" width="32" x="129.3" y="193" />
        <text className={styles.diagramMeta} fontSize="15" textAnchor="end" x="246" y="206">
          saturation
        </text>
      </g>

      <g data-ch="density">
        <rect fill="transparent" height="64" width="200" x="64" y="248" />
        <g stroke="var(--helix-color-foreground-muted)" strokeLinecap="round" strokeWidth="1.6">
          <line x1="147.9" x2="179.9" y1="272" y2="272" />
          <line x1="147.9" x2="179.9" y1="280" y2="280" />
          <line x1="147.9" x2="179.9" y1="288" y2="288" />
        </g>
        <text className={styles.diagramMeta} fontSize="15" textAnchor="end" x="246" y="286">
          density
        </text>
      </g>

      <g data-ch="radius">
        <rect fill="transparent" height="64" width="200" x="64" y="328" />
        <path
          d="M156.5 372v-12a12 12 0 0 1 12-12h20"
          fill="none"
          stroke="var(--helix-color-foreground-muted)"
          strokeWidth="1.6"
        />
        <text className={styles.diagramMeta} fontSize="15" textAnchor="end" x="246" y="366">
          radius
        </text>
      </g>

      {/* ── The routing ─────────────────────────────────────────── */}
      <g className={styles.diagramBase} fill="none" strokeLinecap="round" strokeWidth="1.8">
        {/* **Each run is one path, and each side is one group.** Two reasons,
            and the second is the one that shows. Four strokes flattening onto a
            shared tangent stack unless they composite together, which is what
            the group is for. And a path that stopped at the junction while
            another began there put five round caps on one point and handed the
            pulse off: one light arriving and ending, a different one starting.
            A flow drawn as a relay is not a flow. */}
        <g className={styles.diagramFan}>
          <path d="M280 120C340 120,340 240,400 240H488" data-ch="brand" />
          <path d="M280 200C340 200,340 240,400 240H488" data-ch="saturation" />
          <path d="M280 280C340 280,340 240,400 240H488" data-ch="density" />
          <path d="M280 360C340 360,340 240,400 240H488" data-ch="radius" />
        </g>
        <g className={styles.diagramFan}>
          <path d="M712 240H800C860 240,860 160,920 160" />
          <path d="M712 240H920" />
          <path d="M712 240H800C860 240,860 320,920 320" />
        </g>
      </g>
      <g className={styles.diagramPulse} fill="none" strokeLinecap="round" strokeWidth="1.6">
        <path d="M280 120C340 120,340 240,400 240H488" data-ch="brand" strokeDasharray="16.0 251.4">
          <animate
            attributeName="stroke-dashoffset"
            begin="-0.000s"
            dur="2.786s"
            from="0"
            repeatCount="indefinite"
            to="-267.4"
          />
        </path>
        <path
          d="M280 200C340 200,340 240,400 240H488"
          data-ch="saturation"
          strokeDasharray="16.0 200.9"
        >
          <animate
            attributeName="stroke-dashoffset"
            begin="-0.560s"
            dur="2.259s"
            from="0"
            repeatCount="indefinite"
            to="-216.9"
          />
        </path>
        <path
          d="M280 280C340 280,340 240,400 240H488"
          data-ch="density"
          strokeDasharray="16.0 200.9"
        >
          <animate
            attributeName="stroke-dashoffset"
            begin="-1.120s"
            dur="2.259s"
            from="0"
            repeatCount="indefinite"
            to="-216.9"
          />
        </path>
        <path
          d="M280 360C340 360,340 240,400 240H488"
          data-ch="radius"
          strokeDasharray="16.0 251.4"
        >
          <animate
            attributeName="stroke-dashoffset"
            begin="-1.680s"
            dur="2.786s"
            from="0"
            repeatCount="indefinite"
            to="-267.4"
          />
        </path>
        <path d="M712 240H800C860 240,860 160,920 160" strokeDasharray="16.0 222.8">
          <animate
            attributeName="stroke-dashoffset"
            begin="-0.640s"
            dur="2.487s"
            from="0"
            repeatCount="indefinite"
            to="-238.8"
          />
        </path>
        <path d="M712 240H920" strokeDasharray="16.0 192.0">
          <animate
            attributeName="stroke-dashoffset"
            begin="-1.020s"
            dur="2.167s"
            from="0"
            repeatCount="indefinite"
            to="-208.0"
          />
        </path>
        <path d="M712 240H800C860 240,860 320,920 320" strokeDasharray="16.0 222.8">
          <animate
            attributeName="stroke-dashoffset"
            begin="-1.400s"
            dur="2.487s"
            from="0"
            repeatCount="indefinite"
            to="-238.8"
          />
        </path>
      </g>

      {/* ── The engine ──────────────────────────────────────────── */}
      <circle cx="600" cy="240" fill="url(#derivation-bloom)" r="180" />
      <circle
        className={styles.diagramRing}
        cx="600"
        cy="240"
        fill="none"
        r="146"
        stroke="var(--helix-color-border)"
        strokeDasharray="1.5 9"
        strokeWidth="1.1"
      />
      {/* **Real glass, which needs a `foreignObject` to exist at all.**
          `backdrop-filter` on an SVG shape does nothing: tested against sharp
          stripes, a `<circle>` carrying it left them sharp and only an HTML
          element inside a `foreignObject` blurred them. Without one the disc can
          only be a flat fill of the page background pretending to be a surface,
          while every card around it blurs what it sits on.

          Blurred harder than the cards, because this one is the subject rather
          than a container: the field and the aura behind it go soft enough that
          the reading in front reads as instrumentation rather than as type on a
          busy ground. */}
      <foreignObject height="224" width="224" x="488" y="128">
        <div className={styles.diagramGlass} />
      </foreignObject>
      <circle
        cx="600"
        cy="240"
        fill="none"
        r="112"
        stroke="var(--helix-color-foreground-muted)"
        strokeOpacity="0.18"
        strokeWidth="1"
      />
      {/* The hub as an instrument: what was measured, on the scale it is judged
          by, and the reading.

          **Type on a ground, not a drawing of the search.** Rendering the
          bisection gives a stack of shrinking brackets whose meaning lives in a
          comment, and a picture that needs a paragraph is not a picture. What
          the number is about is type on a ground, the form every contrast
          checker already uses.

          The gauge answers the question the ratio raises: 4.9 means nothing
          until you can see that 4.5 is the line a build passes or fails on. */}
      <g fill="none" strokeLinecap="round">
        <path
          className={styles.diagramGaugeTrack}
          d="M532.1 307.9A96 96 0 1 1 667.9 307.9"
          strokeWidth="2"
        />
        <path
          className={styles.diagramGaugeValue}
          d="M532.1 307.9A96 96 0 0 1 662.3 167.0"
          strokeDasharray="294.1"
          strokeWidth="3"
        >
          <animate
            attributeName="stroke-dashoffset"
            dur="4.2s"
            keyTimes="0;0.08;0.72;1"
            repeatCount="indefinite"
            values="294.1;294.1;0;0"
          />
        </path>
        <g className={styles.diagramGaugeTick} strokeLinecap="butt">
          <path d="M534.6 174.6L529.6 169.6" strokeOpacity="0.5" strokeWidth="1.2" />
          <path d="M634.3 157.3L639.2 145.3" strokeOpacity="0.9" strokeWidth="1.8" />
          <path d="M665.4 305.4L670.4 310.4" strokeOpacity="0.5" strokeWidth="1.2" />
        </g>
      </g>
      <text
        className={styles.diagramGaugeLabel}
        fontSize="13"
        textAnchor="middle"
        x="625.3"
        y="179.0"
      >
        AA
      </text>

      <rect
        fill="var(--helix-color-surface)"
        height="56"
        rx="12"
        stroke="var(--helix-color-border)"
        strokeWidth="1"
        width="96"
        x="552"
        y="194"
      />
      <text className={styles.diagramSample} fontSize="34" x="600" y="232">
        Aa
      </text>

      <text className={styles.diagramCoreSmall} fontSize="26" x="600" y="292">
        4.9:1
      </text>
      <text className={styles.diagramCoreMuted} fontSize="13" textAnchor="middle" x="600" y="312">
        measured contrast
      </text>

      {/* ── What comes out ──────────────────────────────────────── */}
      <text className={styles.diagramLabel} fontSize="13" x="1030" y="72">
        What comes out
      </text>
      <text className={styles.diagramFigure} fontSize="34" x="954" y="164">
        179
      </text>
      <text className={styles.diagramMeta} fontSize="15" x="954" y="185">
        semantic tokens
      </text>

      <rect fill="var(--helix-color-foreground)" height="26" rx="8" width="26" x="954" y="227" />
      <rect
        fill="var(--helix-color-background)"
        height="26"
        rx="8"
        stroke="var(--helix-color-foreground-muted)"
        width="26"
        x="988"
        y="227"
      />
      <text className={styles.diagramMeta} fontSize="15" x="1030" y="246">
        both schemes
      </text>

      <text className={styles.diagramFigure} fontSize="34" x="954" y="324">
        67
      </text>
      <text className={styles.diagramMeta} fontSize="15" x="954" y="345">
        pairs measured
      </text>
    </svg>
  </StillWhenUnseen>
)

/**
 * The same derivation, turned ninety degrees for a phone.
 *
 * **A second drawing rather than a responsive one.** The wide figure is 1200
 * units across because that is what four labeled inputs, a hub and three
 * labeled outputs need when they run left to right. Nothing about that reflows:
 * the path data is the layout, so a narrow screen could only scale it down, and
 * at 342px the type comes out near four pixels. Letting it scroll instead is
 * honest and still means dragging a box twice the width of the screen to read
 * the page's central explanation.
 *
 * So the flow runs top to bottom here: four inputs across, converging to the
 * hub, fanning out to three outputs across. Same three beats, same tokens, same
 * words. Only the axis changed.
 *
 * **Leaner on purpose.** The starfield, the corner registration marks and the
 * traveling pulses are all in the wide one and none of them are here. They are
 * atmosphere for a figure with room to breathe, and this is a phone: what
 * survives is the part that carries the argument.
 *
 * Both are in the DOM and CSS shows one, because the choice is a width and a
 * width is the stylesheet's to know. Picking in JavaScript would mean measuring
 * on the client and rendering neither on the server. `aria-hidden` on this one,
 * so the pair reads once: the wide figure carries the `title` and `desc` for
 * both.
 */
export const DerivationDiagramStacked = () => (
  <div className={styles.diagramStacked}>
    {/* Hidden on the element rather than only on the wrapper: the pair must read
        once, the wide figure carries the `title` and `desc` for both, and the
        a11y lint asks the question of the `svg` itself. */}
    <svg
      aria-hidden="true"
      className={styles.diagramStackedSvg}
      role="presentation"
      viewBox="0 0 340 374"
    >
      <defs>
        <linearGradient id="derivation-chroma-stacked" x1="0" x2="1">
          <stop offset="0" stopColor="var(--helix-color-foreground-subtle)" />
          <stop offset="1" stopColor="var(--helix-color-primary)" />
        </linearGradient>
      </defs>

      <text className={styles.diagramLabel} fontSize="11" x="8" y="14">
        What you choose
      </text>

      {/* Four across, each icon over its word. The columns are 85 apart, which
          is what `saturation` needs at 11 and the widest of the four. */}
      <g>
        <rect fill="var(--helix-color-primary)" height="24" rx="7" width="24" x="30" y="34" />
        <text className={styles.diagramMeta} fontSize="11" textAnchor="middle" x="42" y="76">
          brand
        </text>
      </g>

      <g>
        <rect
          fill="url(#derivation-chroma-stacked)"
          height="11"
          rx="5.5"
          width="24"
          x="115"
          y="40"
        />
        <text className={styles.diagramMeta} fontSize="11" textAnchor="middle" x="127" y="76">
          saturation
        </text>
      </g>

      <g stroke="var(--helix-color-foreground-muted)" strokeLinecap="round" strokeWidth="1.6">
        <line x1="200" x2="224" y1="40" y2="40" />
        <line x1="200" x2="224" y1="46" y2="46" />
        <line x1="200" x2="224" y1="52" y2="52" />
      </g>
      <text className={styles.diagramMeta} fontSize="11" textAnchor="middle" x="212" y="76">
        density
      </text>

      <path
        d="M285 58v-9a9 9 0 0 1 9-9h15"
        fill="none"
        stroke="var(--helix-color-foreground-muted)"
        strokeWidth="1.6"
      />
      <text className={styles.diagramMeta} fontSize="11" textAnchor="middle" x="297" y="76">
        radius
      </text>

      {/* In to the hub, out to the readings. One group so the four strokes
          composite together rather than stacking where they meet, which is the
          same reason the wide figure groups its runs. */}
      <g className={styles.diagramBase} fill="none" strokeLinecap="round" strokeWidth="1.6">
        <g className={styles.diagramFan}>
          <path d="M42 88C42 132,170 128,170 168" />
          <path d="M127 88C127 132,170 134,170 168" />
          <path d="M212 88C212 132,170 134,170 168" />
          <path d="M297 88C297 132,170 128,170 168" />
        </g>
        <g className={styles.diagramFan}>
          <path d="M170 168C170 208,57 206,57 248" />
          <path d="M170 168V248" />
          <path d="M170 168C170 208,283 206,283 248" />
        </g>
      </g>

      <circle cx="170" cy="168" fill="var(--helix-color-primary)" r="3.5" />

      {/* Three across, each number over its two words. Split onto two lines
          rather than shrunk: 113 units a column will not hold `semantic tokens`
          on one line at a size anybody reads. */}
      <text className={styles.diagramFigure} fontSize="26" textAnchor="middle" x="57" y="288">
        179
      </text>
      <text className={styles.diagramMeta} fontSize="10.5" textAnchor="middle" x="57" y="308">
        semantic
      </text>
      <text className={styles.diagramMeta} fontSize="10.5" textAnchor="middle" x="57" y="322">
        tokens
      </text>

      <rect fill="var(--helix-color-foreground)" height="20" rx="6" width="20" x="149" y="264" />
      <rect
        fill="var(--helix-color-background)"
        height="20"
        rx="6"
        stroke="var(--helix-color-border)"
        width="20"
        x="173"
        y="264"
      />
      <text className={styles.diagramMeta} fontSize="10.5" textAnchor="middle" x="170" y="308">
        both
      </text>
      <text className={styles.diagramMeta} fontSize="10.5" textAnchor="middle" x="170" y="322">
        schemes
      </text>

      <text className={styles.diagramFigure} fontSize="26" textAnchor="middle" x="283" y="288">
        67
      </text>
      <text className={styles.diagramMeta} fontSize="10.5" textAnchor="middle" x="283" y="308">
        pairs
      </text>
      <text className={styles.diagramMeta} fontSize="10.5" textAnchor="middle" x="283" y="322">
        measured
      </text>

      <text className={styles.diagramLabel} fontSize="11" textAnchor="end" x="332" y="360">
        What comes out
      </text>
    </svg>
  </div>
)
