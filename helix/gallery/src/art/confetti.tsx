import type { ReactNode } from 'react'

/** The pieces, as center, size, turn in degrees, and ink, rising out of the button in a dome. */
const PIECES: {
  ink: number
  key: string
  r: number
  round?: boolean
  w: number
  x: number
  y: number
}[] = [
  { ink: 0.55, key: 'a', r: -24, w: 9, x: 160, y: 56 },
  { ink: 0.28, key: 'b', r: 38, w: 8, x: 140, y: 68 },
  { ink: 0.55, key: 'c', r: 12, w: 8, x: 182, y: 66 },
  { ink: 0.12, key: 'd', r: -52, w: 7, x: 118, y: 84 },
  { ink: 0.28, key: 'e', r: 64, w: 9, x: 204, y: 80 },
  { ink: 0.55, key: 'f', r: 0, round: true, w: 5, x: 128, y: 54 },
  { ink: 0.28, key: 'g', r: 0, round: true, w: 4, x: 194, y: 50 },
  { ink: 0.12, key: 'h', r: 20, w: 7, x: 100, y: 68 },
  { ink: 0.12, key: 'i', r: -30, w: 7, x: 222, y: 64 },
  { ink: 0.28, key: 'j', r: 0, round: true, w: 4, x: 168, y: 40 },
  { ink: 0.12, key: 'k', r: 46, w: 6, x: 148, y: 42 },
  { ink: 0.28, key: 'l', r: -12, w: 6, x: 230, y: 92 },
  { ink: 0.28, key: 'm', r: 70, w: 6, x: 92, y: 94 },
]

/**
 * A filled button with fine pieces of confetti rising out of it in a dome:
 * an action that has just finished.
 */
export const confettiArt: ReactNode = (
  <>
    <rect className="artInk" fillOpacity="0.6" height="40" rx="6" width="144" x="88" y="114" />
    <rect className="artOverlay" height="6" rx="3" width="64" x="128" y="131" />
    {PIECES.map((piece) =>
      piece.round ? (
        <circle
          className="artInk"
          cx={piece.x}
          cy={piece.y}
          fillOpacity={piece.ink}
          key={piece.key}
          r={piece.w / 2}
        />
      ) : (
        <rect
          className="artInk"
          fillOpacity={piece.ink}
          height={piece.w / 2}
          key={piece.key}
          rx="1"
          transform={`rotate(${piece.r} ${piece.x} ${piece.y})`}
          width={piece.w}
          x={piece.x - piece.w / 2}
          y={piece.y - piece.w / 4}
        />
      ),
    )}
  </>
)
