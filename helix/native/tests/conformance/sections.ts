import { type Measure, measure, setMeasure } from '@fusion.dev/helix-core/capabilities/measure'
import { type Scroll, scroll, setScroll } from '@fusion.dev/helix-core/capabilities/scroll'
import type { Rect } from '@fusion.dev/helix-core/capabilities/types'
import { SECTION_LAYOUT, type Setup, sectionsOf } from '@fusion.dev/helix-testing/conformance'
import { act, fireEvent, screen } from '@testing-library/react-native'
import { sectionsNow } from '../../src/render/sections'
import { laid, PAGE } from './page'

/*
 * The layout the React Native half gives a setup that holds sections, as the
 * web half's stylesheet gives it: Jest lays nothing out, and a host instance
 * there has no parent to find its scroll view by.
 *
 * **One page stands for the setup's scroll view.** A section's scroll view
 * is `PAGE`, which hears what the setup's one scroll view reports, so an
 * outline reads where the page stands from the scroll view the harness
 * scrolls. Its frame is `frame` tall, and each section `section` tall, one
 * below the other. A scroll the outline asks of `PAGE` glides the setup's
 * scroll view there, after the press that asked for it, as a phone does.
 */

/** The setup's scroll view, as React Native Testing Library finds it. */
const scrollView = () =>
  screen.root?.queryAll((node) => typeof node.props.onMomentumScrollEnd === 'function')[0]

/** Glides the setup's scroll view to `y`, as a reader's flick or a scroll to a section does. */
const glide = async (y: number): Promise<void> => {
  const view = scrollView()
  if (view === undefined) {
    return
  }
  const nativeEvent = { contentOffset: { x: 0, y } }
  await fireEvent(view, 'momentumScrollBegin', { nativeEvent })
  await fireEvent.scroll(view, { nativeEvent })
  await fireEvent(view, 'momentumScrollEnd', { nativeEvent })
}

/** What a layout does once the setup is drawn, and what takes it away. */
export interface Laid {
  /** Reports the lengths of the setup's scroll view, once it is drawn. */
  readonly drawn: () => Promise<void>
  readonly undo: () => void
}

/**
 * Lays out a setup's sections, where it holds any, before it is drawn: the
 * measure and the scroll the outline reads, and once drawn, the lengths the
 * scroll view reports.
 */
export const laySections = (setup: Setup): Laid => {
  const count = sectionsOf(setup).length
  if (count === 0) {
    return { drawn: async () => undefined, undo: () => undefined }
  }
  const before = { measure: measure(), scroll: scroll() }
  laid.on = true
  setMeasure({
    ...before.measure,
    box: (node: unknown): Rect | null => {
      const { frame, section } = SECTION_LAYOUT
      if (node === PAGE) {
        return { height: frame, width: 320, x: 0, y: 0 }
      }
      const at = sectionsNow().findIndex((one) => one.node === node)
      const y = before.scroll.offset(PAGE).y
      return at < 0
        ? before.measure.box(node)
        : { height: section, width: 320, x: 0, y: at * section - y }
    },
  } as Measure<unknown>)
  setScroll({
    ...before.scroll,
    to: (node: unknown, x: number, y: number, smooth: boolean) => {
      if (node !== PAGE) {
        before.scroll.to(node, x, y, smooth)
        return
      }
      setTimeout(() => void glide(y), 0)
    },
  } as Scroll<unknown>)
  const drawn = async () => {
    const view = scrollView()
    if (view === undefined) {
      return
    }
    const { frame, section } = SECTION_LAYOUT
    const layout = { height: frame, width: 320, x: 0, y: 0 }
    await act(async () => {
      await fireEvent(view, 'layout', { nativeEvent: { layout } })
      await fireEvent(view, 'contentSizeChange', 320, count * section + frame)
    })
  }
  const undo = () => {
    laid.on = false
    setMeasure(before.measure)
    setScroll(before.scroll)
  }
  return { drawn, undo }
}
