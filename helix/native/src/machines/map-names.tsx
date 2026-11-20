/**
 * The place names a phone's still map draws over its streets and the
 * frame's shapes: each line of each name twice, first as its halo in the
 * land, then in its ink, centered on its place, as MapLibre draws a symbol
 * with a halo 1.5 pixels wide. Core's `placeNames` says which names fit and
 * where; MapLibre Native places its own.
 *
 * **Each name is as wide as the phone draws it.** React Native has no
 * measure to ask before a draw, so the words a view's names could take are
 * drawn once each, unseen, in the face the picture draws them in, and the
 * names are placed by those widths once every one has answered. A width is
 * kept for every map after, by its words, weight, size and spacing.
 */
import { type PlaceName, type PlaceNameText, placeNameKey } from '@fusion.dev/helix-core/map'
import { type ReactNode, useReducer } from 'react'
import { StyleSheet, Text, type TextLayoutEvent, View } from 'react-native'
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
  { Text: SvgText }: ReturnType<typeof svg>,
  names: readonly PlaceName[],
  halo: string,
  inkOf: (amount: number) => string,
): ReactNode[] =>
  names.flatMap((name) => {
    const ink = inkOf(name.amount)
    const top = name.y - ((name.lines.length - 1) * name.size * LINE) / 2
    return name.lines.flatMap((line, row) =>
      [true, false].map((stroke) => (
        <SvgText
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
        </SvgText>
      )),
    )
  })

/** The widths measured, in points at their size, by `placeNameKey`, kept for every map. */
const WIDTHS = new Map<string, number>()

/** The most widths kept, past which the oldest go first. */
const MOST_WIDTHS = 4000

/** How wide the phone drew words, or `undefined` before it has. */
export const measuredWidth = (text: PlaceNameText): number | undefined =>
  WIDTHS.get(placeNameKey(text))

/** Whether every one of `texts` has been measured. */
export const allMeasured = (texts: readonly PlaceNameText[]): boolean =>
  texts.every((text) => WIDTHS.has(placeNameKey(text)))

/** Forgets every width measured, as a test starts. */
export const forgetWidths = (): void => {
  WIDTHS.clear()
}

/** The test id of the unseen words a still map measures. */
export const NAME_METER = 'helix-map-name-meter'

/** Wide enough that no name wraps while it is measured. */
const UNSEEN = StyleSheet.create({
  meter: {
    left: 0,
    opacity: 0,
    position: 'absolute',
    top: 0,
    width: 4096,
  },
  words: { alignSelf: 'flex-start' },
})

/**
 * **The words not yet measured, drawn unseen** in the face the picture
 * draws them in, at no larger text size, since an Svg's text does not
 * follow it; each width is kept as its line is laid out, and `measured`
 * runs once a draw's words have all answered.
 */
export const NameMeter = ({
  measured,
  texts,
}: {
  readonly measured: () => void
  readonly texts: readonly PlaceNameText[]
}) => {
  const [, again] = useReducer((count: number) => count + 1, 0)
  const waiting = texts.filter((text) => !WIDTHS.has(placeNameKey(text)))
  if (waiting.length === 0) {
    return null
  }
  const answered = (text: PlaceNameText) => (event: TextLayoutEvent) => {
    const width = Math.max(0, ...event.nativeEvent.lines.map((line) => line.width))
    if (WIDTHS.size >= MOST_WIDTHS) {
      const oldest = WIDTHS.keys().next().value
      if (oldest !== undefined) {
        WIDTHS.delete(oldest)
      }
    }
    WIDTHS.set(placeNameKey(text), width)
    if (allMeasured(texts)) {
      measured()
      again()
    }
  }
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      pointerEvents="none"
      style={UNSEEN.meter}
      testID={NAME_METER}
    >
      {waiting.map((text) => (
        <Text
          allowFontScaling={false}
          key={placeNameKey(text)}
          numberOfLines={1}
          onTextLayout={answered(text)}
          style={[
            UNSEEN.words,
            {
              fontSize: text.size,
              fontWeight: WEIGHT[text.weight],
              letterSpacing: text.letterSpacing * text.size,
            },
          ]}
        >
          {text.text}
        </Text>
      ))}
    </View>
  )
}
