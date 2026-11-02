import { FusionMark } from '@/components/fusion-mark/fusion-mark'
import { StillWhenUnseen } from '@/components/still-when-unseen/still-when-unseen'
import styles from './platform-diagram.module.css'

/**
 * The platform, drawn as a routing diagram: what goes in, the Fusion mark, what comes out.
 *
 * **Every pulse carries its own path length.** A dash of `[16, len - 16]` is one
 * lit segment, and winding the offset by `len` returns the pattern to its start,
 * so the loop closes at any length. The lengths are integrated from the path
 * geometry, and the duration is `len / 96`.
 */

const ROWS = [140, 240, 340] as const

/* The two products sit either side of the hub's line. */
const OUTPUT_ROWS = [180, 300] as const

/* Each run: its path, the measured length, and the pulse's start offset. */
const LEFT: ReadonlyArray<{ begin: number; d: string; len: number }> = [
  { begin: 0, d: 'M280 140C340 140,340 240,400 240H488', len: 252.5 },
  { begin: 0.56, d: 'M280 240H488', len: 208 },
  { begin: 1.12, d: 'M280 340C340 340,340 240,400 240H488', len: 252.5 },
]

const RIGHT: ReadonlyArray<{ begin: number; d: string; len: number }> = [
  { begin: 0.64, d: 'M712 240H800C860 240,860 180,920 180', len: 226.7 },
  { begin: 1.02, d: 'M712 240H800C860 240,860 300,920 300', len: 226.7 },
]

const OUTPUTS = [
  { lines: ['every screen,', 'checked'], name: 'Helix' },
  { lines: ['every decision kept', 'with its reason'], name: 'Cortex' },
] as const

const Pulses = ({ runs }: { runs: typeof LEFT }) => (
  <>
    {runs.map((run) => (
      <path d={run.d} key={run.d} strokeDasharray={`16 ${(run.len - 16).toFixed(1)}`}>
        <animate
          attributeName="stroke-dashoffset"
          begin={`-${run.begin.toFixed(3)}s`}
          dur={`${(run.len / 96).toFixed(3)}s`}
          from="0"
          repeatCount="indefinite"
          to={`-${run.len.toFixed(1)}`}
        />
      </path>
    ))}
  </>
)

export const PlatformDiagram = () => (
  <StillWhenUnseen className={styles.platform}>
    <svg
      aria-labelledby="platform-title platform-desc"
      className={styles.platformSvg}
      role="img"
      viewBox="0 44 1200 366"
    >
      <title id="platform-title">What goes into Fusion and what comes out</title>
      <desc id="platform-desc">
        Your brand, your code and your decisions flow into Fusion. Out of it come Helix, which
        checks every screen, and Cortex, which keeps every decision with its reason.
      </desc>

      <defs>
        <radialGradient id="platform-bloom">
          <stop offset="0" stopColor="var(--helix-color-primary)" stopOpacity="0.22" />
          <stop offset="0.6" stopColor="var(--helix-color-primary)" stopOpacity="0.05" />
          <stop offset="1" stopColor="var(--helix-color-primary)" stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* ── What you bring ──────────────────────────────────────── */}
      <text className={styles.platformLabel} fontSize="13" x="72" y="72">
        What you bring
      </text>

      {/* Each glyph sits 16 units left of its measured label, so the gap is the
          same on every row. The x values assume Fusion Sans at 15. */}
      <g>
        <rect fill="var(--helix-color-primary)" height="32" rx="9" width="32" x="122" y="124" />
        <text className={styles.platformMeta} fontSize="15" textAnchor="end" x="246" y="145">
          your brand
        </text>
      </g>

      <g>
        <g
          fill="none"
          stroke="var(--helix-color-foreground-muted)"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.8"
          transform="translate(130 224)"
        >
          <path d="M11 9L4 16L11 23M21 9L28 16L21 23M18 7L14 25" />
        </g>
        <text className={styles.platformMeta} fontSize="15" textAnchor="end" x="246" y="245">
          your code
        </text>
      </g>

      <g>
        <g
          fill="none"
          stroke="var(--helix-color-foreground-muted)"
          strokeLinecap="round"
          strokeWidth="1.8"
          transform="translate(98 324)"
        >
          <circle cx="8" cy="6" r="3" />
          <circle cx="8" cy="26" r="3" />
          <circle cx="24" cy="10" r="3" />
          <path d="M8 9V23M24 13C24 20,8 18,8 23" />
        </g>
        <text className={styles.platformMeta} fontSize="15" textAnchor="end" x="246" y="345">
          your decisions
        </text>
      </g>

      {/* ── The routing ─────────────────────────────────────────── */}
      <g className={styles.platformBase} fill="none" strokeLinecap="round" strokeWidth="1.8">
        <g className={styles.platformFan}>
          {LEFT.map((run) => (
            <path d={run.d} key={run.d} />
          ))}
        </g>
        <g className={styles.platformFan}>
          {RIGHT.map((run) => (
            <path d={run.d} key={run.d} />
          ))}
        </g>
      </g>
      <g className={styles.platformPulse} fill="none" strokeLinecap="round" strokeWidth="1.6">
        <Pulses runs={LEFT} />
        <Pulses runs={RIGHT} />
      </g>

      {ROWS.map((y) => (
        <circle className={styles.platformNode} cx="280" cy={y} key={y} r="4" />
      ))}
      {OUTPUT_ROWS.map((y) => (
        <circle className={styles.platformNode} cx="920" cy={y} key={y} r="4" />
      ))}

      {/* ── The hub ─────────────────────────────────────────────── */}
      <circle cx="600" cy="240" fill="url(#platform-bloom)" r="180" />
      {/* Glass needs a `foreignObject`: `backdrop-filter` does nothing on an SVG
          shape. */}
      <foreignObject height="224" width="224" x="488" y="128">
        <div className={styles.platformGlass}>
          <span className={styles.platformMark}>
            <FusionMark size="120px" />
          </span>
        </div>
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

      {/* ── What comes out ──────────────────────────────────────── */}
      <text className={styles.platformLabel} fontSize="13" x="1030" y="72">
        What comes out
      </text>
      {OUTPUTS.map((output, index) => {
        const y = OUTPUT_ROWS[index] ?? 240
        return (
          <g key={output.name}>
            <text className={styles.platformName} fontSize="20" x="954" y={y - 14}>
              {output.name}
            </text>
            <text className={styles.platformMeta} fontSize="15" x="954" y={y + 8}>
              {output.lines[0]}
            </text>
            <text className={styles.platformMeta} fontSize="15" x="954" y={y + 26}>
              {output.lines[1]}
            </text>
          </g>
        )
      })}
    </svg>
  </StillWhenUnseen>
)

/**
 * The same platform, turned ninety degrees for a phone: a second drawing rather
 * than a responsive one, because the path data is the layout.
 */
export const PlatformDiagramStacked = () => (
  <div className={styles.platformStacked}>
    <svg
      aria-labelledby="platform-stacked-title platform-stacked-desc"
      className={styles.platformStackedSvg}
      role="img"
      viewBox="0 0 340 380"
    >
      <title id="platform-stacked-title">What goes into Fusion and what comes out</title>
      <desc id="platform-stacked-desc">
        Your brand, your code and your decisions flow into Fusion. Out of it come Helix, which
        checks every screen, and Cortex, which keeps every decision with its reason.
      </desc>

      <defs>
        <radialGradient id="platform-bloom-stacked">
          <stop offset="0" stopColor="var(--helix-color-primary)" stopOpacity="0.22" />
          <stop offset="0.6" stopColor="var(--helix-color-primary)" stopOpacity="0.05" />
          <stop offset="1" stopColor="var(--helix-color-primary)" stopOpacity="0" />
        </radialGradient>
      </defs>

      <text className={styles.platformLabel} fontSize="11" x="8" y="14">
        What you bring
      </text>

      <rect fill="var(--helix-color-primary)" height="24" rx="7" width="24" x="45" y="34" />
      <text className={styles.platformMeta} fontSize="11" textAnchor="middle" x="57" y="76">
        your brand
      </text>

      <g
        fill="none"
        stroke="var(--helix-color-foreground-muted)"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.6"
        transform="translate(158 34) scale(0.75)"
      >
        <path d="M11 9L4 16L11 23M21 9L28 16L21 23M18 7L14 25" />
      </g>
      <text className={styles.platformMeta} fontSize="11" textAnchor="middle" x="170" y="76">
        your code
      </text>

      <g
        fill="none"
        stroke="var(--helix-color-foreground-muted)"
        strokeLinecap="round"
        strokeWidth="1.6"
        transform="translate(271 34) scale(0.75)"
      >
        <circle cx="8" cy="6" r="3" />
        <circle cx="8" cy="26" r="3" />
        <circle cx="24" cy="10" r="3" />
        <path d="M8 9V23M24 13C24 20,8 18,8 23" />
      </g>
      <text className={styles.platformMeta} fontSize="11" textAnchor="middle" x="283" y="76">
        your decisions
      </text>

      <g className={styles.platformBase} fill="none" strokeLinecap="round" strokeWidth="1.6">
        <g className={styles.platformFan}>
          <path d="M57 88C57 116,170 108,170 136" />
          <path d="M170 88V136" />
          <path d="M283 88C283 116,170 108,170 136" />
        </g>
        <g className={styles.platformFan}>
          <path d="M170 204C170 232,100 228,100 264" />
          <path d="M170 204C170 232,240 228,240 264" />
        </g>
      </g>

      {[100, 240].map((x) => (
        <circle className={styles.platformNode} cx={x} cy="264" key={x} r="3.5" />
      ))}

      <circle cx="170" cy="170" fill="url(#platform-bloom-stacked)" r="64" />
      <foreignObject height="68" width="68" x="136" y="136">
        <div className={styles.platformGlass}>
          <span className={styles.platformMark}>
            <FusionMark size="40px" />
          </span>
        </div>
      </foreignObject>

      {OUTPUTS.map((output, index) => {
        const x = [100, 240][index] ?? 170
        return (
          <g key={output.name}>
            <text className={styles.platformName} fontSize="14" textAnchor="middle" x={x} y="290">
              {output.name}
            </text>
            {output.lines.map((line, row) => (
              <text
                className={styles.platformMeta}
                fontSize="11"
                key={line}
                textAnchor="middle"
                x={x}
                y={row === 0 ? 308 : 322}
              >
                {line}
              </text>
            ))}
          </g>
        )
      })}

      <text className={styles.platformLabel} fontSize="11" textAnchor="end" x="332" y="370">
        What comes out
      </text>
    </svg>
  </div>
)

/**
 * Both figures in one box, which decides between them by its own width.
 */
export const PlatformDiagrams = ({ className }: { className?: string }) => (
  <div className={`${styles.platforms} ${className ?? ''}`}>
    <PlatformDiagram />
    <PlatformDiagramStacked />
  </div>
)
