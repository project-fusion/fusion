import type { ReactNode } from 'react'

/** Where the cloud sits, and how wide, at `orb` size `lg`. */
const CENTER = { x: 160, y: 100 }
const RADIUS = 32

/** The tilt the component draws at, so the card and the element agree. */
const TILT = 0.55
const ROLL = 0.3

/** Flattens a point on the unit sphere the way the component does. */
const flatten = (x: number, y: number, z: number): { depth: number; x: number; y: number } => {
  const dx = x * Math.cos(ROLL) + z * Math.sin(ROLL)
  const dz = -x * Math.sin(ROLL) + z * Math.cos(ROLL)
  return {
    depth: y * Math.sin(TILT) + dz * Math.cos(TILT),
    x: CENTER.x + dx * RADIUS,
    y: CENTER.y - (y * Math.cos(TILT) - dz * Math.sin(TILT)) * RADIUS,
  }
}

/** Ink is a percentage of `foreground`, and there are three steps. */
const inkFor = (depth: number): number => (depth > 0.35 ? 0.55 : depth > -0.2 ? 0.28 : 0.12)

const dots: { ink: number; key: string; r: number; x: number; y: number }[] = []

/* The faint ball the sash is wrapped round, as an even sphere. */
const GHOST = 74
for (let i = 0; i < GHOST; i++) {
  const step = Math.PI * (3 - Math.sqrt(5))
  const y = 1 - (2 * (i + 0.5)) / GHOST
  const ring = Math.sqrt(Math.max(0, 1 - y * y))
  const spot = flatten(ring * Math.cos(i * step), y, ring * Math.sin(i * step))
  dots.push({ ink: 0.12, key: `ghost-${i}`, r: 0.9, x: spot.x, y: spot.y })
}

/* The sash: the `thinking` state, which is the one an orb is at rest in. Bands
   across a narrow belt, tipped so the band crosses the face rather than sitting
   level, exactly as the component parameterizes it. */
const LANES = 9
const SEGS = 34
for (let lane = 0; lane < LANES; lane++) {
  const u = lane / (LANES - 1)
  const edge = Math.abs(u - 0.5) * 2
  for (let seg = 0; seg < SEGS; seg++) {
    const angle = (seg / SEGS) * Math.PI * 2
    /* One still frame of the wave, so the card is the shape rather than a
       moment of the animation. */
    const wave = 0.16 * Math.sin(angle * 3 + u * 3.1)
    const height = Math.max(-0.99, Math.min(0.99, (u - 0.5) * 0.87 + wave))
    const ring = Math.sqrt(Math.max(0, 1 - height * height))
    /* Tipped about the same axis the component tips its sash about. */
    const lean = 1.52
    const spot = flatten(
      ring * Math.cos(angle),
      height * Math.cos(lean) - ring * Math.sin(angle) * Math.sin(lean),
      height * Math.sin(lean) + ring * Math.sin(angle) * Math.cos(lean),
    )
    dots.push({
      ink: inkFor(spot.depth) * (1 - 0.3 * edge),
      key: `sash-${lane}-${seg}`,
      r: 1.1 + 0.7 * ((spot.depth + 1) / 2),
      x: spot.x,
      y: spot.y,
    })
  }
}

dots.sort((a, b) => a.ink - b.ink)

/**
 * A cloud of dots on a sphere with a sash wrapped round it, which is what the
 * component draws at rest.
 *
 * Still, like every other card. The orb's motion is a wave traveling through
 * the sash rather than the whole thing turning, and a wave is not a thing a
 * frozen card can show; the sash and the depth are, so those are what it draws.
 */
export const orbArt: ReactNode = (
  <g>
    {dots.map((dot) => (
      <circle
        className="artInk"
        cx={dot.x.toFixed(2)}
        cy={dot.y.toFixed(2)}
        fillOpacity={dot.ink.toFixed(3)}
        key={dot.key}
        r={dot.r.toFixed(2)}
      />
    ))}
  </g>
)
