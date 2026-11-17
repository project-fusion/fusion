/**
 * The place names a phone's still map draws over its streets and the
 * frame's shapes: each line of each name twice, first as its halo in the
 * land, then in its ink, centered on its place, as MapLibre draws a symbol
 * with a halo 1.5 pixels wide. Core's `placeNames` says which names fit and
 * where; MapLibre Native places its own.
 */
import type { PlaceName } from '@fusion.dev/helix-core/map'
import type { ReactNode } from 'react'
import type { svg } from '../render/vector'

/** The weight each kind of name is drawn in. */
const WEIGHT: Readonly<Record<PlaceName['weight'], '400' | '500' | '700'>> = {
  bold: '700',
  medium: '500',
  regular: '400',
}

/** How far a line's baseline sits below its middle, in ems. */
const BASELINE = 0.35

/** How tall a line is, in ems, as core measures a name's box. */
const LINE = 1.2

/** Each place name as text with a halo, a line at a time. */
export const nameShapes = (
  { Text }: ReturnType<typeof svg>,
  names: readonly PlaceName[],
  halo: string,
  inkOf: (amount: number) => string,
): ReactNode[] =>
  names.flatMap((name) => {
    const ink = inkOf(name.amount)
    const top = name.y - ((name.lines.length - 1) * name.size * LINE) / 2
    return name.lines.flatMap((line, row) =>
      [true, false].map((stroke) => (
        <Text
          fill={ink}
          fontSize={name.size}
          fontWeight={WEIGHT[name.weight]}
          key={`name-${name.id}-${name.x}-${name.y}-${line}${stroke ? '-halo' : ''}`}
          letterSpacing={name.letterSpacing}
          stroke={stroke ? halo : 'none'}
          strokeLinejoin="round"
          strokeWidth={stroke ? 3 : 0}
          textAnchor="middle"
          x={name.x}
          y={top + row * name.size * LINE + name.size * BASELINE}
        >
          {line}
        </Text>
      )),
    )
  })
