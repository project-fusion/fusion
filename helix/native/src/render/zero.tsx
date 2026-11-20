import { type ReactNode, useCallback, useState } from 'react'
import type { TextLayoutEvent } from 'react-native'
import type { Family } from '../style/form'
import type { Style } from '../style/resolved'
import { ScaledText } from './text'

/** Whether any of a family's values is written in `ch`, which only then measures its `0`. */
export const readsZero = (family: Family): boolean =>
  /"text":"-?\d*\.?\d+ch"/.test(JSON.stringify(family.rules))

/** Where the measured `0` is drawn: out of the way, unseen, and unheard. */
const HIDDEN = {
  left: 0,
  opacity: 0,
  pointerEvents: 'none',
  position: 'absolute',
  top: 0,
} as const

/** What `useZero` gives an element. */
export interface Zero {
  /** The `0` to draw in the element's host while it is measured. */
  readonly probe: ReactNode
  /** How wide the font's `0` is as a share of its size, once measured. */
  readonly share?: number
}

/**
 * How wide the font of `text` draws a `0`, as a share of its size, which a
 * `ch` is: an element whose values are written in `ch` draws `probe`, an
 * unseen `0` in its text, and takes the width its layout reports.
 *
 * **React Native measures text only by drawing it**, so the share is
 * absent at the first draw, where `style()` takes 0.5, as CSS does where it
 * cannot measure, and the element draws again once it is known. It is
 * measured again when the font changes.
 */
export const useZero = (reads: boolean, text: Style): Zero => {
  const [share, setShare] = useState<number>()
  const size = typeof text.fontSize === 'number' ? text.fontSize : undefined
  const measured = useCallback(
    (event: TextLayoutEvent) => {
      const width = event.nativeEvent.lines[0]?.width
      if (width !== undefined && size !== undefined && size > 0) {
        setShare(Math.round((width / size) * 1000) / 1000)
      }
    },
    [size],
  )
  if (!reads) {
    return { probe: null }
  }
  const probe = (
    <ScaledText
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      key="zero"
      numberOfLines={1}
      onTextLayout={measured}
      style={{ ...text, ...HIDDEN }}
      testID="helix-zero"
    >
      0
    </ScaledText>
  )
  return share === undefined ? { probe } : { probe, share }
}
