import type { CSSProperties, ReactNode } from 'react'

/**
 * Three instants read in a column, and the last one is a date.
 *
 * **The column is the subject and the rows are only what it sits against.** A
 * timestamp is a few characters at the trailing edge of something else, so the
 * body lines here are context and carry the fainter ink: what says
 * `format-date` rather than `text` is that the right-hand marks share one
 * margin and step in length down the card.
 *
 * That step is the component's own argument. The compact reading runs to six
 * days and past that this shows a date, because `Intl.NumberFormat` narrow
 * renders both `minute` and `month` as `m` in en-US, so "3m" would be three
 * minutes at the top of a feed and three months further down it. The top two
 * marks are short and the last one is not.
 *
 * **Only the compact two move**, and they grow from the margin they are
 * measured against, which is a reading getting longer as its instant recedes.
 * The date is still, because a date is written once and never changes again:
 * `elapsedTime` answers `Infinity` for it and nothing is ever scheduled. A
 * card where all three stretched would draw a component that wakes for rows it
 * has no reason to.
 */
export const formatDateArt: ReactNode = (
  <>
    {[
      { body: 128, y: 68 },
      { body: 104, y: 96 },
      { body: 116, y: 124 },
    ].map((row) => (
      <rect
        className="artInk"
        fillOpacity="0.28"
        height="8"
        key={row.y}
        rx="4"
        width={row.body}
        x="48"
        y={row.y}
      />
    ))}

    {[
      { stamp: 20, y: 69 },
      { stamp: 26, y: 97 },
    ].map((row) => (
      <g
        className="artMotion artFill"
        key={row.y}
        style={{ transformOrigin: 'right center' } as CSSProperties}
      >
        <rect
          className="artInk"
          fillOpacity="0.55"
          height="6"
          rx="3"
          width={row.stamp}
          x={272 - row.stamp}
          y={row.y}
        />
      </g>
    ))}

    <rect className="artInk" fillOpacity="0.55" height="6" rx="3" width="44" x="228" y="125" />
  </>
)
