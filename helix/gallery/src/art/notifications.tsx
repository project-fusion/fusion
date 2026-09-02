import type { CSSProperties, ReactNode } from 'react'

/**
 * Three rows with a mark on the unread ones, which is the difference from
 * `list` and from `toast`: a notification is something a reader comes back to,
 * so what the card has to show is that two of them have not been seen.
 */
export const notificationsArt: ReactNode = (
  <>
    {[
      { read: false, y: 52 },
      { read: false, y: 92 },
      { read: true, y: 132 },
    ].map((row, index) => (
      <g className="artMotion artRow" key={row.y} style={{ '--art-i': index } as CSSProperties}>
        {/* The unread mark, on the inline start edge, which is where the eye
            already is and is what the styled tier actually draws. */}
        {row.read ? null : (
          <rect className="artSolid" height="24" rx="1.5" width="3" x="48" y={row.y} />
        )}
        <circle
          className="artInk"
          cx="70"
          cy={row.y + 12}
          fillOpacity={row.read ? 0.16 : 0.28}
          r="9"
        />
        <rect
          className="artInk"
          fillOpacity={row.read ? 0.28 : 0.55}
          height="8"
          rx="4"
          width={[132, 108, 120][index]}
          x="90"
          y={row.y + 2}
        />
        <rect
          className="artInk"
          fillOpacity="0.16"
          height="6"
          rx="3"
          width="34"
          x="90"
          y={row.y + 16}
        />
      </g>
    ))}
  </>
)
