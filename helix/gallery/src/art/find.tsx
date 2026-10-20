import type { CSSProperties, ReactNode } from 'react'

/**
 * A find bar over lines of text: a field, a count, and the buttons that move,
 * then the lines with the matches washed in and the current one solid, which
 * is what sets finding apart from filtering, where the lines that do not match
 * go away.
 */
export const findArt: ReactNode = (
  <>
    <rect className="artEdge" fill="none" height="104" rx="6" width="200" x="60" y="48" />
    <path className="artEdge" d="M60 64 H260" fill="none" />
    <rect className="artEdge" fill="none" height="9" rx="2" width="70" x="68" y="51.5" />
    <rect className="artInk" fillOpacity="0.4" height="3" rx="1.5" width="30" x="72" y="54.5" />
    <rect className="artInk" fillOpacity="0.28" height="3" rx="1.5" width="22" x="146" y="54.5" />
    {[0, 1, 2].map((button) => (
      <rect
        className="artInk"
        fillOpacity="0.28"
        height="6"
        key={button}
        rx="1.5"
        width="6"
        x={224 + button * 11}
        y="53"
      />
    ))}
    {[
      { match: 112, row: 0, width: 150 },
      { row: 1, width: 118 },
      { current: true, match: 92, row: 2, width: 160 },
      { row: 3, width: 96 },
      { match: 168, row: 4, width: 136 },
    ].map(({ current, match, row, width }) => (
      <g className="artMotion artRow" key={row} style={{ '--art-i': row } as CSSProperties}>
        <rect
          className="artInk"
          fillOpacity="0.4"
          height="4"
          rx="2"
          width={width}
          x="76"
          y={78 + row * 14}
        />
        {match === undefined ? null : (
          <rect
            className={current ? 'artSolid' : 'artInk'}
            fillOpacity={current ? undefined : '0.22'}
            height="8"
            rx="1.5"
            width="26"
            x={match}
            y={76 + row * 14}
          />
        )}
      </g>
    ))}
  </>
)
