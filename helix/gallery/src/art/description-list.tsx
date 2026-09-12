import type { CSSProperties, ReactNode } from 'react'

/**
 * Four pairs, the labels in one column and the values beside them.
 *
 * **The two columns are the subject.** Every label starts on one line and every
 * value on the next one over, which is what separates a description list from
 * a paragraph: the labels are short, faint and all the same length of margin,
 * and the values are the ink, each a different length because values are.
 *
 * The pairs arrive in reading order, a row at a time, since a pair is the unit
 * a reader takes in; a label and its value never move apart.
 */
export const descriptionListArt: ReactNode = (
  <>
    {[
      { label: 36, value: 104, y: 64 },
      { label: 44, value: 72, y: 88 },
      { label: 32, value: 128, y: 112 },
      { label: 40, value: 88, y: 136 },
    ].map((row, index) => (
      <g className="artMotion artRow" key={row.y} style={{ '--art-i': index } as CSSProperties}>
        <rect
          className="artInk"
          fillOpacity="0.28"
          height="8"
          rx="4"
          width={row.label}
          x="72"
          y={row.y}
        />
        <rect
          className="artInk"
          fillOpacity="0.55"
          height="8"
          rx="4"
          width={row.value}
          x="136"
          y={row.y}
        />
      </g>
    ))}
  </>
)
