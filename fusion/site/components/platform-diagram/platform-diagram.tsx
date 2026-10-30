import { FusionMark } from '@/components/fusion-mark/fusion-mark'
import { StillWhenUnseen } from '@/components/still-when-unseen/still-when-unseen'
import styles from './platform-diagram.module.css'

/**
 * The platform, drawn as a routing diagram in the derivation diagram's language.
 *
 * **Every pulse carries its own path length.** A dash of `[16, len - 16]` is one
 * lit segment, and winding the offset by `len` returns the pattern to its start,
 * so the loop closes at any length. The lengths are integrated from the path
 * geometry, and the duration is `len / 96`.
 */

const STARS: ReadonlyArray<readonly [number, number, number, number]> = [
  [597, 234, 0.39, 1.7],
  [1138, 362, 0.2, 1.3],
  [870, 155, 0.17, 1.2],
  [179, 396, 0.25, 1.6],
  [615, 267, 0.22, 1.1],
  [386, 341, 0.17, 1.0],
  [193, 362, 0.1, 1.2],
  [828, 393, 0.36, 1.4],
  [216, 127, 0.21, 1.6],
  [1100, 76, 0.26, 1.7],
  [513, 242, 0.12, 1.6],
  [154, 241, 0.17, 1.8],
  [434, 157, 0.31, 1.3],
  [100, 314, 0.23, 0.8],
  [59, 327, 0.14, 1.6],
  [763, 225, 0.1, 1.0],
  [661, 142, 0.1, 1.4],
  [951, 84, 0.31, 1.6],
  [529, 178, 0.35, 1.6],
  [150, 219, 0.13, 0.8],
  [1113, 218, 0.13, 0.9],
  [929, 294, 0.32, 1.2],
  [927, 128, 0.18, 1.7],
  [785, 382, 0.36, 1.6],
  [377, 241, 0.14, 1.3],
  [593, 352, 0.12, 1.5],
  [1083, 351, 0.32, 1.1],
  [783, 250, 0.24, 1.0],
  [1007, 150, 0.17, 1.8],
  [369, 353, 0.3, 1.0],
  [1055, 309, 0.33, 1.5],
  [274, 270, 0.2, 1.9],
  [844, 266, 0.14, 1.3],
  [627, 151, 0.35, 0.9],
  [1137, 179, 0.17, 1.4],
  [544, 341, 0.21, 1.2],
  [1042, 321, 0.34, 1.1],
  [1031, 70, 0.11, 1.2],
  [959, 388, 0.37, 1.8],
  [69, 218, 0.14, 0.9],
  [1133, 400, 0.37, 1.9],
  [1054, 77, 0.26, 1.4],
  [1144, 330, 0.13, 1.0],
  [558, 120, 0.22, 0.9],
  [575, 197, 0.3, 1.1],
  [954, 262, 0.34, 0.8],
]

const ROWS = [140, 240, 340] as const

/* Each run: its path, the measured length, and the pulse's start offset. */
const LEFT: ReadonlyArray<{ begin: number; d: string; len: number }> = [
  { begin: 0, d: 'M280 140C340 140,340 240,400 240H488', len: 252.5 },
  { begin: 0.56, d: 'M280 240H488', len: 208 },
  { begin: 1.12, d: 'M280 340C340 340,340 240,400 240H488', len: 252.5 },
]

const RIGHT: ReadonlyArray<{ begin: number; d: string; len: number }> = [
  { begin: 0.64, d: 'M712 240H800C860 240,860 140,920 140', len: 252.5 },
  { begin: 1.02, d: 'M712 240H920', len: 208 },
  { begin: 1.4, d: 'M712 240H800C860 240,860 340,920 340', len: 252.5 },
]

const OUTPUTS = [
  { lines: ['every screen,', 'checked'], name: 'Helix' },
  { lines: ['the work done', 'with any model'], name: 'Hartley' },
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
        checks every screen, Hartley, which does the work with any model, and Cortex, which keeps
        every decision with its reason.
      </desc>

      <defs>
        <linearGradient id="platform-fade" x1="0" x2="1">
          <stop offset="0" stopColor="white" stopOpacity="0" />
          <stop offset="0.13" stopColor="white" stopOpacity="1" />
          <stop offset="0.87" stopColor="white" stopOpacity="1" />
          <stop offset="1" stopColor="white" stopOpacity="0" />
        </linearGradient>
        <mask id="platform-mask">
          <rect fill="url(#platform-fade)" height="366" width="1200" x="0" y="44" />
        </mask>
        <pattern height="40" id="platform-grid" patternUnits="userSpaceOnUse" width="40" y="27">
          <path
            d="M40 0H0V40"
            fill="none"
            stroke="var(--helix-color-border)"
            strokeDasharray="3 5"
            strokeWidth="1"
          />
        </pattern>
        <radialGradient id="platform-bloom">
          <stop offset="0" stopColor="var(--helix-color-primary)" stopOpacity="0.22" />
          <stop offset="0.6" stopColor="var(--helix-color-primary)" stopOpacity="0.05" />
          <stop offset="1" stopColor="var(--helix-color-primary)" stopOpacity="0" />
        </radialGradient>
        <mask id="platform-corners">
          <rect fill="white" height="24" width="24" x="44" y="84" />
          <rect fill="white" height="24" width="24" x="1132" y="84" />
          <rect fill="white" height="24" width="24" x="1132" y="372" />
          <rect fill="white" height="24" width="24" x="44" y="372" />
        </mask>
      </defs>

      <g mask="url(#platform-mask)">
        <g className={styles.platformField}>
          <rect fill="url(#platform-grid)" height="440" opacity="0.5" width="1280" x="-40" y="20" />
        </g>
      </g>

      <g className={styles.platformStars} fill="var(--helix-color-foreground)">
        {STARS.map(([cx, cy, opacity, r]) => (
          <circle cx={cx} cy={cy} key={`${cx}-${cy}`} opacity={opacity} r={r} />
        ))}
      </g>

      <rect
        fill="none"
        height="312"
        stroke="var(--helix-color-border)"
        strokeDasharray="2 7"
        width="1112"
        x="44"
        y="84"
      />
      <rect
        className={styles.platformCorners}
        fill="none"
        height="312"
        mask="url(#platform-corners)"
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
        <g key={y}>
          <circle className={styles.platformNode} cx="280" cy={y} r="4" />
          <circle className={styles.platformNode} cx="920" cy={y} r="4" />
        </g>
      ))}

      {/* ── The hub ─────────────────────────────────────────────── */}
      <circle cx="600" cy="240" fill="url(#platform-bloom)" r="180" />
      <circle
        className={styles.platformRing}
        cx="600"
        cy="240"
        fill="none"
        r="146"
        stroke="var(--helix-color-border)"
        strokeDasharray="1.5 9"
        strokeWidth="1.1"
      />
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
        const y = ROWS[index] ?? 240
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
      aria-hidden="true"
      className={styles.platformStackedSvg}
      role="presentation"
      viewBox="0 0 340 380"
    >
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
          <path d="M57 88C57 132,170 128,170 170" />
          <path d="M170 88V170" />
          <path d="M283 88C283 132,170 128,170 170" />
        </g>
        <g className={styles.platformFan}>
          <path d="M170 170C170 210,57 206,57 264" />
          <path d="M170 170V264" />
          <path d="M170 170C170 210,283 206,283 264" />
        </g>
      </g>

      {[57, 170, 283].map((x) => (
        <circle className={styles.platformNode} cx={x} cy="264" key={x} r="3.5" />
      ))}

      <circle cx="170" cy="170" fill="url(#platform-bloom-stacked)" r="64" />
      <circle
        className={styles.platformRing}
        cx="170"
        cy="170"
        fill="none"
        r="46"
        stroke="var(--helix-color-border)"
        strokeDasharray="1.5 7"
        strokeWidth="1.1"
      />
      <foreignObject height="68" width="68" x="136" y="136">
        <div className={styles.platformGlass}>
          <span className={styles.platformMark}>
            <FusionMark size="40px" />
          </span>
        </div>
      </foreignObject>

      {OUTPUTS.map((output, index) => {
        const x = [57, 170, 283][index] ?? 170
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
