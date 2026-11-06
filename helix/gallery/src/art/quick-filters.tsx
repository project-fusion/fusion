import type { ReactNode } from 'react'

/**
 * A track of presets over a table, one raised out of it with its count, which
 * is the row a reader picks a saved view from.
 */
export const quickFiltersArt: ReactNode = (
  <>
    <rect className="artInk" fillOpacity="0.1" height="20" rx="10" width="176" x="72" y="48" />
    <rect className="artSolid" height="14" rx="7" width="48" x="118" y="51" />
    {[84, 128, 178, 214].map((x, index) => (
      <rect
        className={index === 1 ? 'artStrokeOnSolid' : 'artInk'}
        fillOpacity={index === 1 ? undefined : '0.4'}
        height="4"
        key={x}
        rx="2"
        width={index === 3 ? 22 : 24}
        x={x}
        y="56"
      />
    ))}
    <rect className="artRule" height="1" width="176" x="72" y="88" />
    {[0, 1, 2].map((row) => (
      <rect
        className="artInk"
        fillOpacity="0.35"
        height="4"
        key={row}
        rx="2"
        width={[150, 120, 136][row]}
        x="72"
        y={102 + row * 18}
      />
    ))}
  </>
)
