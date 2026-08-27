import styles from './preview.module.css'

/**
 * Sparse construction rectangles that draw themselves as a band arrives.
 *
 * **Not a grid.** The reference does not use a uniform fine mesh; it scatters a
 * handful of large outlined rectangles at unrelated sizes, most of them
 * partly off the edge, so the page reads as a detail cropped out of a much
 * bigger drawing. A regular grid says "graph paper" and this says "there is more
 * of this than you can see", which is a different and better claim.
 *
 * **The geometry is fixed rather than random.** `Math.random()` in a server
 * component gives the client a different set and React reports the hydration
 * mismatch; a seeded shuffle would be the same numbers with more code. These
 * were placed by hand on a 40 pitch so they agree with the routing diagram's
 * field.
 *
 * Drawn with `stroke-dasharray` longer than any perimeter here, so each
 * rectangle is inked in rather than faded in, which is what makes it read as
 * construction rather than as decoration arriving.
 */
const BOXES = [
  { h: 200, w: 240, x: -40, y: 80 },
  { h: 120, w: 120, x: 280, y: 240 },
  { h: 320, w: 200, x: 520, y: -60 },
  { h: 160, w: 280, x: 800, y: 320 },
  { h: 240, w: 160, x: 1120, y: 40 },
  { h: 100, w: 100, x: 1360, y: 280 },
] as const

export const Blueprint = ({ tone = 'muted' }: { tone?: 'brand' | 'muted' }) => (
  <svg
    aria-hidden="true"
    className={styles.blueprint}
    data-layer
    preserveAspectRatio="xMidYMid slice"
    viewBox="0 0 1520 520"
  >
    <g
      className={styles.blueprintInk}
      fill="none"
      stroke={
        tone === 'brand' ? 'var(--helix-color-primary)' : 'var(--helix-color-foreground-muted)'
      }
      strokeWidth="1"
    >
      {BOXES.map((b) => (
        <rect height={b.h} key={`${b.x}-${b.y}`} width={b.w} x={b.x} y={b.y} />
      ))}
    </g>
  </svg>
)
