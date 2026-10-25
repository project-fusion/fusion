/**
 * What a part that scrolls keeps beside its scroll view: which ends have
 * more past them, the pager its scroll buttons step with, the view its
 * content is laid out in, and the widths of the items that grow in it.
 */
import { type RefObject, useCallback, useLayoutEffect, useRef, useState } from 'react'
import type { HostInstance, ScrollViewInstance } from 'react-native'
import { layoutChanged } from '../capabilities/measure'
import { useTheme } from '../theme/theme'
import { useReducedMotion } from './motion'
import type { Fill } from './styles'

/** How long a scroll view's content and frame are along its axis, and how far it has scrolled. */
export interface Track {
  readonly content: number
  readonly frame: number
  readonly offset: number
}

/** Which ends of a scroll view have more past them, from what it reports. */
export const useMore = () => {
  const at = useRef<Track>({ content: 0, frame: 0, offset: 0 })
  const [more, setMore] = useState({ end: false, start: false })
  const track = useCallback((next: Partial<Track>) => {
    at.current = { ...at.current, ...next }
    const { content, frame, offset } = at.current
    const start = offset > 1
    const end = offset + frame < content - 1
    setMore((previous) =>
      previous.start === start && previous.end === end ? previous : { end, start },
    )
  }, [])
  return { at, more, track }
}

/**
 * What a scrolling part hands the binding that asks for it with a `pager`
 * prop: a step toward one end, as the web's scroll buttons take one.
 */
export interface Pager {
  /**
   * Scrolls most of the frame's length toward `toward`, and no further than
   * the content goes, gliding unless the reader asks for reduced motion.
   */
  readonly page: (toward: 'end' | 'start') => void
}

/** Hands `hand` a pager for the scroll view `scroller` holds, and takes it back as the part goes. */
export const usePager = (
  hand: unknown,
  scroller: RefObject<ScrollViewInstance | null>,
  at: RefObject<Track>,
  horizontal: boolean,
): void => {
  const reduced = useReducedMotion()
  const still = useRef(reduced)
  still.current = reduced
  useLayoutEffect(() => {
    if (typeof hand !== 'function') {
      return undefined
    }
    const pager: Pager = {
      page: (toward) => {
        const { content, frame, offset } = at.current
        const by = frame * 0.75 * (toward === 'end' ? 1 : -1)
        const to = Math.min(Math.max(0, offset + by), Math.max(0, content - frame))
        scroller.current?.scrollTo({ animated: !still.current, [horizontal ? 'x' : 'y']: to })
      },
    }
    hand(pager)
    return () => hand(null)
  }, [at, hand, horizontal, scroller])
}

/**
 * Holds the view a scroll view lays its content out in, and hands it to
 * `hand`, the `contentRef` a binding gives the part. **A part drawn inside
 * the content is placed against that view**, as a tab set's mark is, and it
 * scrolls with the content where the frame stays put.
 *
 * `sized` tells the measure capability each size the content reports, so an
 * observer of the view hears it change.
 */
export const useContent = (
  hand: unknown,
): {
  readonly held: (next: HostInstance | null) => void
  readonly node: RefObject<HostInstance | null>
  readonly sized: (width: number, height: number) => void
} => {
  const node = useRef<HostInstance | null>(null)
  const latest = useRef(hand)
  latest.current = hand
  const held = useCallback((next: HostInstance | null) => {
    node.current = next
    if (typeof latest.current === 'function') {
      latest.current(next)
    }
  }, [])
  const sized = useCallback((width: number, height: number) => {
    if (node.current !== null) {
      layoutChanged(node.current, { height, width, x: 0, y: 0 })
    }
  }, [])
  return { held, node, sized }
}

/**
 * The widths of the items that grow in a line that scrolls across, measured
 * at their own size, and kept for the text size they were measured at.
 *
 * **The line takes the widths once every item has reported its own**, so
 * no item grows from a width it has not measured yet.
 */
export const useFill = (): Fill => {
  const { rem } = useTheme()
  const [measured, setMeasured] = useState<{
    readonly least: readonly number[]
    readonly rem: number
  }>()
  const pending = useRef<{ rem: number; widths: number[] }>({ rem, widths: [] })
  const report = useCallback(
    (place: number, width: number, count: number) => {
      if (pending.current.rem !== rem) {
        pending.current = { rem, widths: [] }
      }
      const { widths } = pending.current
      widths[place] = width
      if (widths.filter((each) => each !== undefined).length >= count) {
        pending.current = { rem, widths: [] }
        setMeasured({ least: widths.slice(0, count), rem })
      }
    },
    [rem],
  )
  return measured?.rem === rem ? { least: measured.least, report } : { report }
}

/**
 * Hands `hand`, the `scrollerRef` a binding gives the part, the scroll view
 * the scroll capability takes as the part, and takes it back as the part
 * goes, as a scroll area reads where its viewport stands.
 */
export const useScroller = (
  hand: unknown,
  scroller: RefObject<ScrollViewInstance | null>,
): void => {
  useLayoutEffect(() => {
    if (typeof hand !== 'function') {
      return undefined
    }
    hand(scroller.current)
    return () => hand(null)
  }, [hand, scroller])
}

/**
 * The width the content of a part that scrolls across is laid out at: the
 * frame's, and more where what it holds overflows that.
 *
 * **A phone lays out what scrolls across with no width**, so an item whose
 * basis is nothing, as a timeline's entry across is, grows to its longest
 * line. The web lays the content out at the viewport's width, where items
 * share it and grow past it only to their least. **The content is laid out
 * at the frame's width first**, and where what it holds runs past it, as
 * items at their least do, at the width they run to, so it scrolls only
 * where the words need more room. It is laid out again as the frame or the
 * reader's text size changes.
 */
export const useSpread = (
  on: boolean,
  content: RefObject<HostInstance | null>,
): {
  readonly framed: (laid: number) => void
  readonly width: number | '100%' | undefined
} => {
  const { rem } = useTheme()
  const [frame, setFrame] = useState<number>()
  const [spread, setSpread] = useState<{ readonly key: string; readonly width: number }>()
  const key = `${frame}:${rem}`
  const width = spread?.key === key ? spread.width : frame
  useLayoutEffect(() => {
    if (!on || width === undefined) {
      return
    }
    const wide = (content.current as { readonly scrollWidth?: unknown } | null)?.scrollWidth
    if (typeof wide === 'number' && wide > width + 1) {
      setSpread({ key, width: wide })
    }
  })
  const framed = useCallback((laid: number) => {
    setFrame((was) => (was === laid ? was : laid))
  }, [])
  /* The frame's width as a share until it is measured, so what the content
     holds is never laid out with no width: a phone keeps the basis an item
     took then, and an entry would keep its longest line. */
  const laid: number | '100%' = spread?.key === key ? spread.width : '100%'
  return { framed, width: on ? laid : undefined }
}
