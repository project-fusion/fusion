import type { ReactNode } from 'react'
import type { Topic } from '@/content/insights'
import styles from './preview.module.css'

/**
 * A cover plate for an essay, drawn from what the essay is about.
 *
 * **None of the essays carries an image**, so `InsightArt` renders nothing and
 * every card is a block of text. Sourcing photography for a set of arguments
 * about design systems would be stock imagery pretending to be about something,
 * which is worse than nothing.
 *
 * **The first version was worse than nothing in its own way.** It composed one
 * drawing, a bloom and an elbow of wire, and placed its parts by a hash of the
 * slug. Measured across the set, the hash moved almost nothing: the bloom took
 * two distinct heights across twelve slugs and the wire four, so the carousel
 * was six near-identical smudges. Generated art that varies only in nudge reads
 * as filler, and filler next to an argument makes the argument look like filler
 * too.
 *
 * **So the plate is drawn from the topic, and it depicts it.** Sovereignty gets
 * the three scales the thesis actually names, personal inside organizational
 * inside national. Design gets a ramp derived from one color, which is the
 * mechanism the essay describes. Business gets three stages that differ in how
 * much of each is real, which is the whole of the honesty argument. A reader
 * who looks at two of these learns the vocabulary, which a hash can never
 * teach.
 *
 * **Position in the reel picks the variant, not a hash.** Two essays share a
 * topic and sit next to each other in the carousel, so the choice has to be
 * guaranteed rather than probable: a hash that happens to collide puts two
 * identical plates side by side, which is the exact failure this replaces.
 *
 * Everything is drawn in the same construction language as the derivation
 * diagram, so the plates read as a family, and everything takes its color from
 * `--helix-color-primary`, so they re-theme with the page.
 */
const W = 320
const H = 140
const CX = W / 2
const CY = H / 2

/**
 * Mixed toward the background rather than made transparent, so a chip keeps its
 * weight over the grid instead of letting the field show through it.
 */
const brand = (percent: number) =>
  `color-mix(in oklab, var(--helix-color-primary) ${percent}%, var(--helix-color-background))`

const MUTED = 'var(--helix-color-foreground-muted)'
const PRIMARY = 'var(--helix-color-primary)'

/** One color becoming a ramp, which is the essay. */
const Ramp = () => {
  const cols = 7
  const w = 28
  const gap = 8
  const total = cols * w + (cols - 1) * gap
  const x0 = (W - total) / 2
  const y = 46
  const h = 44
  /* Built as values rather than mapped over a length, so the position each chip
     is drawn at is the thing that identifies it and no index reaches the JSX. */
  const chips = Array.from({ length: cols }, (_, i) => ({
    fill: brand(94 - i * 9),
    x: x0 + i * (w + gap),
  }))

  return (
    <>
      {chips.map((chip) => (
        <rect fill={chip.fill} height={h} key={chip.x} rx="7" width={w} x={chip.x} y={y} />
      ))}
      <g fill="none" stroke={MUTED} strokeOpacity="0.5" strokeWidth="1">
        <path d={`M${x0} ${y - 11}h${total}`} />
        <path d={`M${x0} ${y - 15}v8`} />
        <path d={`M${x0 + total} ${y - 15}v8`} />
        {chips.map((chip) => (
          <path d={`M${chip.x + w / 2} ${y + h + 7}v5`} key={chip.x} />
        ))}
      </g>
    </>
  )
}

/** One tier that exists, where a ladder of them would usually be. */
const Tier = () => {
  const w = 176
  const x = CX - w / 2

  return (
    <>
      <rect fill={brand(90)} height="26" rx="7" width={w} x={x} y="34" />
      {[70, 96, 122].map((y, i) => (
        <rect
          fill="none"
          height="18"
          key={y}
          rx="6"
          stroke={MUTED}
          strokeDasharray="3 5"
          strokeOpacity={0.34 - i * 0.07}
          strokeWidth="1"
          width={w - i * 26}
          x={x}
          y={y}
        />
      ))}
      <g fill="none" stroke={MUTED} strokeOpacity="0.5" strokeWidth="1">
        <path d={`M${x - 14} 34v26`} />
        <path d={`M${x - 18} 34h8`} />
        <path d={`M${x - 18} 60h8`} />
      </g>
    </>
  )
}

/** Personal, then organizational, then national: the three scales as rings. */
const Rings = () => (
  <>
    {[24, 44, 62].map((r, i) => (
      <circle
        cx={CX}
        cy={CY}
        fill="none"
        key={r}
        r={r}
        stroke={i ? MUTED : PRIMARY}
        {...(i ? { strokeDasharray: i === 1 ? '3 6' : '2 8' } : {})}
        strokeOpacity={i ? 0.62 - i * 0.13 : 0.95}
        strokeWidth={i ? 1.1 : 1.6}
      />
    ))}
    <g fill="none" stroke={MUTED} strokeOpacity="0.4" strokeWidth="1">
      {[30, 90, 150, 210, 270, 330].map((deg) => {
        const rad = (deg * Math.PI) / 180
        const at = (d: number) =>
          `${(CX + Math.cos(rad) * d).toFixed(1)} ${(CY + Math.sin(rad) * d).toFixed(1)}`
        return <path d={`M${at(66)}L${at(74)}`} key={deg} />
      })}
    </g>
    <circle cx={CX} cy={CY} fill={PRIMARY} r="3.5" />
  </>
)

/** The same three scales, as boundaries a reader can sit inside. */
const Nested = () => (
  <>
    {[0, 1, 2].map((i) => {
      const w = 204 - i * 60
      const h = 116 - i * 35
      const box = { height: h, width: w, x: CX - w / 2, y: CY - h / 2 }
      return i === 2 ? (
        <rect fill={brand(88)} key={w} rx="9" {...box} />
      ) : (
        <rect
          fill="none"
          key={w}
          rx={12 - i * 2}
          stroke={MUTED}
          strokeDasharray={i === 0 ? '2 7' : '3 6'}
          strokeOpacity={0.6 - i * 0.14}
          strokeWidth="1"
          {...box}
        />
      )
    })}
  </>
)

/** One version across a domain's packages, and a second domain on its own. */
const Lockstep = () => (
  <>
    {[38, 70, 110].map((y, gi) => {
      const loose = gi === 2
      return (
        <g key={y}>
          <path d={`M40 ${y}H70`} fill="none" stroke={MUTED} strokeOpacity="0.45" strokeWidth="1" />
          <circle
            cx="40"
            cy={y}
            fill={loose ? MUTED : PRIMARY}
            fillOpacity={loose ? 0.45 : 1}
            r="3.5"
          />
          {[0, 1, 2].map((i) => (
            <rect
              fill={loose ? 'none' : brand(gi === 0 ? 90 : 58)}
              height="20"
              key={74 + i * 60}
              rx="6"
              {...(loose
                ? { stroke: MUTED, strokeDasharray: '3 5', strokeOpacity: 0.45, strokeWidth: 1 }
                : {})}
              width="48"
              x={74 + i * 60}
              y={y - 10}
            />
          ))}
        </g>
      )
    })}
    <path
      d="M40 90h240"
      fill="none"
      stroke={MUTED}
      strokeDasharray="2 6"
      strokeOpacity="0.35"
      strokeWidth="1"
    />
  </>
)

/**
 * Active ships, Building is real work with nothing shipped, Declared is
 * committed direction. Equal boxes, because the three are equal citizens: what
 * differs is how much of each is real, which is the whole of the argument. A
 * bar chart was the first attempt and it was the wrong picture, because varying
 * height claims the stages differ in size.
 */
const Stages = () => {
  const w = 78
  const h = 54
  const gap = 14
  const total = w * 3 + gap * 2
  const x0 = CX - total / 2
  const y = CY - h / 2 - 6

  return (
    <>
      {[1, 0.45, 0].map((fill, i) => {
        const x = x0 + i * (w + gap)
        return (
          <g key={fill}>
            {fill > 0 && (
              <rect
                fill={brand(i === 0 ? 92 : 62)}
                height={h}
                rx="8"
                width={w * fill}
                x={x}
                y={y}
              />
            )}
            <rect
              fill="none"
              height={h}
              rx="8"
              stroke={i === 2 ? MUTED : PRIMARY}
              {...(i === 2 ? { strokeDasharray: '4 5' } : {})}
              strokeOpacity={i === 2 ? 0.45 : 0.8}
              strokeWidth="1.2"
              width={w}
              x={x}
              y={y}
            />
          </g>
        )
      })}
      <g fill="none" stroke={MUTED} strokeOpacity="0.45" strokeWidth="1">
        {[0, 1, 2].map((i) => (
          <path d={`M${x0 + i * (w + gap)} ${y + h + 12}h${w}`} key={x0 + i * (w + gap)} />
        ))}
      </g>
    </>
  )
}

/**
 * A quantized signal settling, which is the shape of an inference rather than a
 * picture of a brain. No essay carries this topic yet; the map is exhaustive
 * over `Topic` so that adding one cannot fall through to a blank plate.
 */
const Signal = () => {
  const steps = [108, 88, 96, 64, 56, 60, 44]
  const x = (i: number) => 52 + i * 32

  return (
    <>
      <path
        d={
          steps.map((v, i) => `${i ? `H${x(i)}V${v}` : `M${x(0)} ${v}`}`).join('') +
          `H${x(steps.length)}`
        }
        fill="none"
        stroke={PRIMARY}
        strokeLinejoin="round"
        strokeOpacity="0.85"
        strokeWidth="1.8"
      />
      <g fill="none" stroke={MUTED} strokeDasharray="2 6" strokeOpacity="0.35" strokeWidth="1">
        <path d="M52 44h224" />
        <path d="M52 108h224" />
      </g>
      <circle cx={x(steps.length)} cy={steps[steps.length - 1]} fill={PRIMARY} r="3.5" />
    </>
  )
}

/**
 * Exhaustive over `Topic`, so a new one is a type error here rather than a
 * blank plate in the reel.
 */
const FAMILY: Record<Topic, readonly (() => ReactNode)[]> = {
  Business: [Stages],
  Design: [Tier, Ramp],
  Engineering: [Lockstep],
  Intelligence: [Signal],
  Sovereignty: [Rings, Nested],
}

export const InsightCover = ({
  index = 0,
  slot,
  slug,
  topic,
}: {
  /**
   * Position in the reel, which picks the variant. Guaranteed rather than
   * hashed, so two essays sharing a topic and sitting next to each other cannot
   * draw the same plate.
   */
  index?: number
  /** Slot to fill when the plate is projected into a card. */
  slot?: string
  /** The essay's slug, which only namespaces the pattern id. */
  slug: string
  /** What the essay is about, which chooses the drawing. */
  topic: Topic
}) => {
  const variants = FAMILY[topic] ?? FAMILY.Design
  const Motif = variants[index % variants.length]

  return (
    <svg aria-hidden="true" className={styles.cover} slot={slot} viewBox={`0 0 ${W} ${H}`}>
      <defs>
        <pattern height="20" id={`cover-grid-${slug}`} patternUnits="userSpaceOnUse" width="20">
          <path
            d="M20 0H0V20"
            fill="none"
            stroke="var(--helix-color-border)"
            strokeDasharray="2 5"
            strokeWidth="1"
          />
        </pattern>
      </defs>

      <rect fill={`url(#cover-grid-${slug})`} height={H} opacity="0.5" width={W} />
      {/* The same corner ticks the derivation diagram carries, which is what
          makes six different drawings read as one set. */}
      <g fill="none" stroke={MUTED} strokeOpacity="0.4" strokeWidth="1">
        <path d="M12 24V12H24" />
        <path d="M296 12H308V24" />
        <path d="M308 116V128H296" />
        <path d="M24 128H12V116" />
      </g>
      <Motif />
    </svg>
  )
}
