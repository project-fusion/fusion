import type { CSSProperties } from 'react'
import styles from './hero-field.module.css'

/**
 * Which dots on the hero's lattice catch the light, and when.
 *
 * `[x, y, seconds, delay]`, where the first two are **percentages of the
 * section**, snapped in CSS to the nearest lattice dot with `round()`. The
 * percentage is what lets the field cover the whole hero at any width, and the
 * snap is what keeps a shine on a dot rather than near one: the lattice is a
 * tile of `--site-lattice-pitch` positioned `center`, so dots sit at the
 * section's center and at whole multiples of the pitch out from it. Fixed
 * offsets in pitches would hold that alignment and cluster in the middle of a
 * wide viewport.
 */
const SHINE: readonly (readonly [number, number, number, number])[] = [
  // Across the top, where the lattice's mask leaves it strongest.
  [5, 14, 23, 0],
  [12, 8, 17, 6.2],
  [19, 20, 29, 2.4],
  [27, 11, 19, 11.5],
  [35, 18, 23, 8.1],
  [44, 7, 17, 3.7],
  [52, 22, 29, 14.6],
  [61, 10, 19, 5.3],
  [69, 19, 23, 12.8],
  [78, 9, 29, 1.6],
  [86, 21, 17, 9.4],
  [93, 13, 19, 15.2],
  // Down the left of the content column.
  [4, 38, 29, 7.1],
  [11, 58, 23, 13.9],
  [18, 44, 17, 4.5],
  [7, 74, 19, 10.2],
  [22, 66, 29, 0.8],
  [14, 86, 23, 16.4],
  // And the right.
  [96, 40, 17, 12.1],
  [88, 56, 19, 2.9],
  [79, 47, 23, 6.8],
  [93, 72, 29, 9.9],
  [82, 80, 17, 14.1],
  [75, 64, 19, 5.8],
]

/**
 * The lit lattice a gallery hero is drawn on.
 */
export function HeroField() {
  return (
    <div aria-hidden="true" className={styles.pageHeroField}>
      {SHINE.map(([x, y, seconds, delay]) => (
        <span
          className={styles.pageHeroShine}
          key={`${x}:${y}`}
          style={
            {
              '--shine-delay': `${delay}s`,
              '--shine-duration': `${seconds}s`,
              '--shine-x': x,
              '--shine-y': y,
            } as CSSProperties
          }
        />
      ))}
    </div>
  )
}
