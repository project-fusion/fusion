import styles from './preview.module.css'

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
 * moves over it. The earlier single bright layer drew itself in on a `view()`
 * timeline and looped, so the figure dismantled and rebuilt itself every few
 * seconds while somebody was reading it.
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
 * are content: it left "brand" and "density" visibly weaker than "179" and "67"
 * across the same figure, which says the inputs matter less. They do not. The
 * asymmetry was worth trying and is not worth its cost.
 */
export const DerivationDiagram = () => (
  <figure className={styles.diagram}>
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
        <circle cx="939" cy="262" opacity="0.34" r="0.8" />
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
      <g
        fill="none"
        stroke="var(--helix-color-foreground-muted)"
        strokeOpacity="0.55"
        strokeWidth="1.2"
      >
        <path d="M44 98V84H58" />
        <path d="M1142 84H1156V98" />
        <path d="M1156 382V396H1142" />
        <path d="M58 396H44V382" />
      </g>
      <g stroke="var(--helix-color-border)" strokeDasharray="2 7" strokeWidth="1">
        <line x1="400" x2="400" y1="84" y2="396" />
        <line x1="760" x2="760" y1="84" y2="396" />
      </g>

      {/* ── What you choose ─────────────────────────────────────── */}
      {/* **Every row is centered on the track its connector leaves from.**
          The taps are at 120, 200, 280 and 360, evenly 80 apart. The brand
          swatch was drawn at 124 with a height of 32, putting its middle at 140:
          twenty units below the line running out of it, so the one row a reader
          looks at first was the one visibly detached from its own wire. The
          section label sat at 112 and was therefore *inside* that swatch.

          Glyph centres and text baselines are now derived from the tap rather
          than set by hand, and the label clears the first row. */}
      {/* **Outside the frame, and that is what centres the drawing.**
          These are annotations about the figure rather than parts of it, and
          sitting inside the dashed rectangle they added mass at the top with
          nothing balancing it below: the four rows are centered on the hub at
          240, but the block including the labels centered on 227, so the whole
          drawing read as riding high in its own frame. Lifted out, the frame
          holds only the rows, and the rows are already centered. */}
      <text className={styles.diagramLabel} fontSize="15" x="72" y="72">
        What you choose
      </text>

      <g data-ch="brand">
        <rect fill="var(--helix-color-primary)" height="32" rx="9" width="32" x="72" y="104" />
        <text className={styles.diagramMeta} fontSize="19" x="120" y="126">
          brand
        </text>
      </g>

      <g data-ch="saturation">
        <rect fill="url(#derivation-chroma)" height="14" rx="7" width="32" x="72" y="193" />
        <text className={styles.diagramMeta} fontSize="19" x="120" y="206">
          saturation
        </text>
      </g>

      <g data-ch="density">
        <g stroke="var(--helix-color-foreground-muted)" strokeLinecap="round" strokeWidth="1.6">
          <line x1="72" x2="104" y1="272" y2="272" />
          <line x1="72" x2="104" y1="280" y2="280" />
          <line x1="72" x2="104" y1="288" y2="288" />
        </g>
        <text className={styles.diagramMeta} fontSize="19" x="120" y="286">
          density
        </text>
      </g>

      <g data-ch="radius">
        <path
          d="M72 372v-12a12 12 0 0 1 12-12h20"
          fill="none"
          stroke="var(--helix-color-foreground-muted)"
          strokeWidth="1.6"
        />
        <text className={styles.diagramMeta} fontSize="19" x="120" y="366">
          radius
        </text>
      </g>

      {/* ── The routing ─────────────────────────────────────────── */}
      <g className={styles.diagramBase} fill="none" strokeLinecap="round" strokeWidth="1.4">
        <path d="M280 120H390A10 10 0 0 1 400 130" data-ch="brand" />
        <path d="M280 200H390A10 10 0 0 1 400 210" data-ch="saturation" />
        <path d="M280 280H390A10 10 0 0 0 400 270" data-ch="density" />
        <path d="M280 360H390A10 10 0 0 0 400 350" data-ch="radius" />
        <path d="M400 130V240" />
        <path d="M400 350V240" />
        <path d="M400 240H488" />
        <path d="M712 240H800" />
        <path d="M800 240V170" />
        <path d="M800 240V310" />
        <path d="M800 170A10 10 0 0 1 810 160H920" />
        <path d="M800 240H920" />
        <path d="M800 310A10 10 0 0 0 810 320H920" />
      </g>
      {/* **SMIL, not CSS, and it took three attempts to get here.**
          `stroke-dashoffset` will not interpolate to a `calc()` endpoint in
          WebKit: sampled across a second it returned only the two keyframe
          values and nothing between, so the pulse teleported rather than
          traveled. Registering the custom property did not help. Moving the
          animation onto the registered number instead produced no `CSSAnimation`
          at all, because keyframes holding only a custom property are dropped
          there.

          `<animate>` takes the numbers directly. Each path carries its own
          length as a literal, which is what keeps the loop seamless, and its own
          `begin`, which is what makes the flow read left to right. Nothing to
          interpolate through, and it is the mechanism SVG has always had for
          this. */}
      <g className={styles.diagramPulse} fill="none" strokeLinecap="round" strokeWidth="1.6">
        <path d="M280 120H390A10 10 0 0 1 400 130" data-ch="brand" strokeDasharray="27.7 98.1">
          <animate
            attributeName="stroke-dashoffset"
            begin="-0.000s"
            dur="2.028s"
            from="0"
            repeatCount="indefinite"
            to="-125.7"
          />
        </path>
        <path d="M280 200H390A10 10 0 0 1 400 210" data-ch="saturation" strokeDasharray="27.7 98.1">
          <animate
            attributeName="stroke-dashoffset"
            begin="-0.507s"
            dur="2.028s"
            from="0"
            repeatCount="indefinite"
            to="-125.7"
          />
        </path>
        <path d="M280 280H390A10 10 0 0 0 400 270" data-ch="density" strokeDasharray="27.7 98.1">
          <animate
            attributeName="stroke-dashoffset"
            begin="-1.014s"
            dur="2.028s"
            from="0"
            repeatCount="indefinite"
            to="-125.7"
          />
        </path>
        <path d="M280 360H390A10 10 0 0 0 400 350" data-ch="radius" strokeDasharray="27.7 98.1">
          <animate
            attributeName="stroke-dashoffset"
            begin="-1.520s"
            dur="2.028s"
            from="0"
            repeatCount="indefinite"
            to="-125.7"
          />
        </path>
        <path d="M400 130V240" strokeDasharray="24.2 85.8">
          <animate
            attributeName="stroke-dashoffset"
            begin="-0.250s"
            dur="1.774s"
            from="0"
            repeatCount="indefinite"
            to="-110.0"
          />
        </path>
        <path d="M400 350V240" strokeDasharray="24.2 85.8">
          <animate
            attributeName="stroke-dashoffset"
            begin="-0.760s"
            dur="1.774s"
            from="0"
            repeatCount="indefinite"
            to="-110.0"
          />
        </path>
        <path d="M400 240H488" strokeDasharray="19.4 68.6">
          <animate
            attributeName="stroke-dashoffset"
            begin="-0.400s"
            dur="1.419s"
            from="0"
            repeatCount="indefinite"
            to="-88.0"
          />
        </path>
        <path d="M712 240H800" strokeDasharray="19.4 68.6">
          <animate
            attributeName="stroke-dashoffset"
            begin="-0.150s"
            dur="1.419s"
            from="0"
            repeatCount="indefinite"
            to="-88.0"
          />
        </path>
        <path d="M800 240V170" strokeDasharray="15.4 54.6">
          <animate
            attributeName="stroke-dashoffset"
            begin="-0.600s"
            dur="1.129s"
            from="0"
            repeatCount="indefinite"
            to="-70.0"
          />
        </path>
        <path d="M800 240V310" strokeDasharray="15.4 54.6">
          <animate
            attributeName="stroke-dashoffset"
            begin="-1.050s"
            dur="1.129s"
            from="0"
            repeatCount="indefinite"
            to="-70.0"
          />
        </path>
        <path d="M800 170A10 10 0 0 1 810 160H920" strokeDasharray="27.7 98.1">
          <animate
            attributeName="stroke-dashoffset"
            begin="-0.350s"
            dur="2.028s"
            from="0"
            repeatCount="indefinite"
            to="-125.7"
          />
        </path>
        <path d="M800 240H920" strokeDasharray="26.4 93.6">
          <animate
            attributeName="stroke-dashoffset"
            begin="-0.850s"
            dur="1.935s"
            from="0"
            repeatCount="indefinite"
            to="-120.0"
          />
        </path>
        <path d="M800 310A10 10 0 0 0 810 320H920" strokeDasharray="27.7 98.1">
          <animate
            attributeName="stroke-dashoffset"
            begin="-1.450s"
            dur="2.028s"
            from="0"
            repeatCount="indefinite"
            to="-125.7"
          />
        </path>
      </g>

      <circle
        className={styles.diagramJunction}
        cx="400"
        cy="240"
        fill="var(--helix-color-primary)"
        r="4"
      />
      <circle
        className={styles.diagramJunction}
        cx="800"
        cy="240"
        fill="var(--helix-color-primary)"
        r="4"
      />

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
      <circle
        cx="600"
        cy="240"
        fill="var(--helix-color-background)"
        fillOpacity="0.82"
        r="112"
        stroke="var(--helix-color-foreground-muted)"
        strokeOpacity="0.18"
        strokeWidth="1"
      />
      {/* The hub as an instrument: what was measured, on the scale it is judged
          by, and the reading.

          **The bisection funnel is gone, and its own defense is why.** It drew
          the search rather than the result, which meant the one thing a reader
          could see was a stack of shrinking brackets whose meaning lived in a
          comment. A picture that needs a paragraph is not a picture. What the
          number is actually about is type on a ground, which is the form every
          contrast checker already uses and nobody has to be taught.

          The gauge stays, because it answers the question the ratio raises:
          4.9 means nothing until you can see that 4.5 is the line a build
          passes or fails on. */}
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
      <text className={styles.diagramLabel} fontSize="15" x="1015" y="72">
        What comes out
      </text>
      <text className={styles.diagramFigure} fontSize="34" x="939" y="164">
        179
      </text>
      <text className={styles.diagramMeta} fontSize="15" x="939" y="185">
        semantic tokens
      </text>

      <rect fill="var(--helix-color-foreground)" height="26" rx="8" width="26" x="939" y="227" />
      <rect
        fill="var(--helix-color-background)"
        height="26"
        rx="8"
        stroke="var(--helix-color-foreground-muted)"
        width="26"
        x="973"
        y="227"
      />
      <text className={styles.diagramMeta} fontSize="15" x="1015" y="246">
        both schemes
      </text>

      <text className={styles.diagramFigure} fontSize="34" x="939" y="324">
        67
      </text>
      <text className={styles.diagramMeta} fontSize="15" x="939" y="345">
        pairs measured
      </text>
    </svg>
  </figure>
)
