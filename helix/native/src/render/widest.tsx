/**
 * Words drawn as wide as the widest of the words they may say, as a copy
 * button's label holds its width from Copy to Copied, where the web stacks
 * every word in one grid cell and shows the one standing.
 *
 * **React Native measures text only by drawing it**, so each word is drawn
 * unseen and unheard, placed absolutely so it is measured at its own width,
 * and the words shown take the widest as their least width once each is
 * measured. Until then they take their own width. **A width once measured
 * is kept** for those words in that font, so words drawn again, as a press
 * draws a button anew around its tooltip, keep their width from the first
 * frame.
 */
import { type ReactNode, useCallback, useState } from 'react'
import { type LayoutChangeEvent, StyleSheet, type TextProps } from 'react-native'
import { ScaledText } from './text'

/** Where each word is measured: out of the way, unseen, and unheard. */
const UNSEEN = {
  left: 0,
  opacity: 0,
  pointerEvents: 'none',
  position: 'absolute',
  top: 0,
} as const

/** Each word's width as measured, by the word and the font it is drawn in. */
const MEASURED = new Map<string, number>()

/** The key a word's width is kept under: the word, and what sizes its font. */
const keyOf = (word: string, style: TextProps['style']): string => {
  const flat = (StyleSheet.flatten(style) ?? {}) as Readonly<Record<string, unknown>>
  return JSON.stringify([
    word,
    flat.fontFamily,
    flat.fontSize,
    flat.fontWeight,
    flat.fontStyle,
    flat.letterSpacing,
  ])
}

/** What `Widest` draws: the words shown, the words they may say, and the text's props. */
interface Drawn {
  readonly children: ReactNode
  readonly props: TextProps
  readonly words: readonly string[]
}

/** The words shown, as wide as the widest of `words`, with each measured unseen. */
export const Widest = ({ children, props, words }: Drawn) => {
  const { style } = props
  const [, setMeasures] = useState(0)
  const measured = useCallback(
    (word: string) => (event: LayoutChangeEvent) => {
      const { width } = event.nativeEvent.layout
      const key = keyOf(word, style)
      if (MEASURED.get(key) !== width) {
        MEASURED.set(key, width)
        setMeasures((count) => count + 1)
      }
    },
    [style],
  )
  const known = words.map((word) => MEASURED.get(keyOf(word, style)))
  const widest = known.every((width) => width !== undefined)
    ? Math.ceil(Math.max(0, ...(known as number[])))
    : undefined
  return (
    <>
      <ScaledText
        {...props}
        style={[props.style, widest === undefined ? {} : { minWidth: widest }]}
      >
        {children}
      </ScaledText>
      {words.map((word) => (
        <ScaledText
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
          key={`widest-${word}`}
          numberOfLines={1}
          onLayout={measured(word)}
          style={[props.style, UNSEEN]}
          testID="helix-widest"
        >
          {word}
        </ScaledText>
      ))}
    </>
  )
}
