import type { ReactNode } from 'react'

/**
 * A filled band over the rows, with a count and two actions, where the
 * toolbar stood: what can be done to the rows that are ticked.
 */
export const selectionBarArt: ReactNode = (
  <>
    <rect className="artSolid" height="22" rx="5" width="176" x="72" y="44" />
    <rect className="artStrokeOnSolid" height="4" rx="2" width="36" x="82" y="53" />
    <rect className="artStrokeOnSolid" height="10" rx="3" width="28" x="176" y="50" />
    <rect className="artStrokeOnSolid" height="10" rx="3" width="28" x="210" y="50" />
    {[0, 1, 2, 3].map((row) => (
      <g key={row}>
        <rect
          className={row === 1 ? 'artEdge' : 'artSolid'}
          fill={row === 1 ? 'none' : undefined}
          height="9"
          rx="2"
          width="9"
          x="72"
          y={82 + row * 18}
        />
        <rect
          className="artInk"
          fillOpacity="0.35"
          height="4"
          rx="2"
          width={[120, 96, 130, 104][row]}
          x="90"
          y={84.5 + row * 18}
        />
      </g>
    ))}
  </>
)
