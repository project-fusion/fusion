/**
 * A part that takes an equal share of its row and is never narrower than its
 * content, as a `minmax(max-content, 1fr)` grid track is on the web.
 */

import { type ComponentProps, useRef, useState } from 'react'
import { type LayoutChangeEvent, useWindowDimensions, View } from 'react-native'
import type { Style } from '../style/resolved'
import { useTheme } from '../theme/theme'
import { Box } from './box'

/** The properties that lay out what a part holds, which the measured view inside it takes too. */
const LAYING = ['alignItems', 'columnGap', 'flexDirection', 'flexWrap', 'gap', 'rowGap'] as const

/** A length in points `style` sets for the first of `keys` it has, or none. */
const pointsOf = (style: Style, ...keys: readonly string[]): number => {
  for (const key of keys) {
    const set = style[key]
    if (typeof set === 'number') {
      return set
    }
  }
  return 0
}

/** The padding at each side of a part, across. */
const paddingOf = (style: Style): number =>
  pointsOf(style, 'paddingStart', 'paddingLeft', 'paddingHorizontal', 'padding') +
  pointsOf(style, 'paddingEnd', 'paddingRight', 'paddingHorizontal', 'padding')

/**
 * The part's own style, and the style of the view inside it that measures
 * what it holds.
 *
 * **The basis is nothing, so every part that shares the row grows by the same
 * amount**, and two of them end up the same width, as two `1fr` tracks are.
 * **A part whose share is narrower than its content is held at its content's
 * width**, its padding included, and grows no further, so the others share
 * what is left, as the web holds a track at its least and shares the rest.
 * A phone adds the share on top of a least width, so a `minWidth` alone would
 * make the part wider than its neighbors. The width is set, and not the
 * basis: a box whose basis changed from nothing kept no width on iOS.
 */
export const sharedStyles = (
  style: Style,
  least: number | undefined,
  held: boolean,
): { readonly inner: Style; readonly outer: Style } => {
  const inner: Record<string, number | string> = { flexDirection: 'row' }
  for (const key of LAYING) {
    const value = style[key]
    if (value !== undefined) {
      inner[key] = value
    }
  }
  return {
    inner,
    outer:
      held && least !== undefined
        ? {
            ...style,
            flexGrow: 0,
            minWidth: least + paddingOf(style),
            width: least + paddingOf(style),
          }
        : { ...style, flexBasis: 0 },
  }
}

/**
 * A box that shares its row with the others that grow and is never narrower
 * than what it holds.
 *
 * **A phone has no least width of `max-content`**, so the box measures what it
 * holds in a view inside it, which a row lays out at its own width, and holds
 * the part at that width where its share comes out narrower. It looks again
 * once the window or the reader's text size changes. A part laid along a row
 * grows from its content's width without this, so a wide brand beside narrow
 * actions pushed App Header's centered navigation off the middle of the bar.
 */
export const SharedBox = ({ children, style, view, ...rest }: ComponentProps<typeof Box>) => {
  const { rem } = useTheme()
  const window = useWindowDimensions()
  const key = `${window.width}:${rem}`
  const [least, setLeast] = useState<number>()
  /* The window and text size the share fell short of the content at. */
  const [heldAt, setHeldAt] = useState<string>()
  const held = heldAt === key
  const own = style ?? {}
  const { inner, outer } = sharedStyles(own, least, held)
  const laidOut = view.onLayout
  /* The part's width and its content's, as each was last laid out. */
  const widths = useRef<{ content?: number; part?: number }>({})
  const check = () => {
    const { content, part } = widths.current
    if (
      !held &&
      content !== undefined &&
      part !== undefined &&
      part < content + paddingOf(own) - 0.5
    ) {
      setHeldAt(key)
    }
  }
  return (
    <Box
      {...rest}
      style={outer}
      view={{
        ...view,
        onLayout: (event: LayoutChangeEvent) => {
          if (typeof laidOut === 'function') {
            laidOut(event)
          }
          widths.current.part = event.nativeEvent.layout.width
          check()
        },
      }}
    >
      <View
        onLayout={(event: LayoutChangeEvent) => {
          const { width } = event.nativeEvent.layout
          widths.current.content = width
          setLeast((was) => (was !== undefined && Math.abs(was - width) < 0.5 ? was : width))
          check()
        }}
        style={inner}
      >
        {children}
      </View>
    </Box>
  )
}
