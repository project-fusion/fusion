import {
  type ReactNode,
  type RefObject,
  useCallback,
  useLayoutEffect,
  useRef,
  useState,
} from 'react'
import {
  type LayoutChangeEvent,
  ScrollView,
  type ScrollViewInstance,
  type ScrollViewProps,
  type StyleProp,
  type ViewStyle,
} from 'react-native'
import { pairAcross } from '../capabilities/scroll'
import type { Line, Motion, Snap, Style, Transition } from '../style/resolved'
import { Box } from './box'
import { holding, useHandOff } from './hand-off'
import { growing, movesOf, parted, passingThrough, spreads, wrapWidth } from './scroll-layout'
import {
  useContent,
  useFill,
  useHeldEnd,
  useMore,
  usePager,
  useScroller,
  useSnap,
  useSpread,
} from './scroll-parts'
import { reporting, type Scrolled, useScrollLocked } from './scroll-view'
import type { Scrolling } from './styles'
import { WrapWidth } from './text'

export type { Pager } from './scroll-parts'
export { ScrollArea, useScrollLocked } from './scroll-view'

/**
 * What a press inside a part that scrolls does with a keyboard up: it reaches
 * what it lands on, as a press does on the web, unless the binding says
 * otherwise. React Native's default spends a first press on putting the
 * keyboard away, in every scroll view around the press, so a dialog's surface
 * or a field's panel that scrolls swallowed it although the list inside kept
 * handled presses.
 */
const tapsKept = (given: unknown): ScrollViewProps['keyboardShouldPersistTaps'] =>
  (given ?? 'handled') as ScrollViewProps['keyboardShouldPersistTaps']

/** What `ScrollingPart` takes. */
interface ScrollingProps {
  /** The axis the part scrolls along, or both. */
  readonly axis: 'both' | 'x' | 'y'
  /** The radius of the blur behind the frame, in points, where `backdrop-filter` draws one. */
  readonly blur?: number | undefined
  /** The part's style: how it lays out what it holds goes to its content, and the rest to its frame. */
  readonly box: Style
  /** Draws what scrolls, given the axis and which ends have more. */
  readonly content: (scrolling: Scrolling) => ReactNode
  /** Draws the scroll buttons, given the axis and which ends have more. */
  readonly controls: (scrolling: Scrolling) => ReactNode
  /**
   * Whether the part is as wide as its content along its parent's row, as
   * `Resolved.hugs` says.
   */
  readonly hugs?: boolean | undefined
  /** A line along one edge, where the part's background draws one. */
  readonly line?: Line | undefined
  /** The part's animation, which its frame runs, where it has one. */
  readonly motion?: Motion | undefined
  /** How the part snaps what scrolls in it, as its `scroll-snap-type` says. */
  readonly snap?: Snap | undefined
  /** How each property of the frame's style moves to a new value. */
  readonly transitions?: Readonly<Record<string, Transition>> | undefined
  /**
   * The frame's props besides its style: its accessibility, and what the
   * part's binding lays over it. A `style` here is drawn over the frame's own,
   * a `pager` is handed the part's `Pager` once it is drawn, a
   * `contentRef` is handed the view its content is laid out in, a
   * `scrollerRef` the scroll view the scroll capability takes as the part,
   * `indicators` shows the platform's scroll indicators,
   * `keyboardShouldPersistTaps` and `onScroll` go to the scroll view, `holdsEnd` keeps the
   * end of the content showing as it grows, `onSnapOffsets` hears
   * the offsets a part that snaps can rest at, and `snapOffsets` takes the place
   * of those, as a carousel stops only at its stops.
   */
  readonly view: Readonly<Record<string, unknown>>
}

/**
 * **A part that scrolls is a frame holding a scroll view.** The frame keeps
 * the part's box, its edge line, and its scroll buttons, and the content
 * scrolls inside it, as a background and a sticky button stay put while a
 * browser scrolls a box's content.
 *
 * **The content is at least as long as the frame**, as an overflow box's
 * content is on the web, so items that grow share the frame, as tabs at
 * `width="full"` do, and the rest scrolls. **Content that scrolls across is
 * laid out at the frame's width**, and wider only where what it holds runs
 * past it, as `useSpread` says.
 *
 * **A part that hugs its content is as wide as what it holds**, as the web's
 * scroll box with an automatic basis is, and narrower only where its row runs
 * out of room. Its content is laid out at its own width and its scroll view
 * does not grow. A scroll view across grows by default, and a phone measures
 * a part along a row at the most room the row has left, so a growing scroll
 * view took all of it: a centered App Header's navigation filled the bar, and
 * the brand and the actions had no room to center it between them.
 *
 * **An item that grows is never narrower than its own content**, as a flex
 * item's automatic minimum keeps it on the web. A view has no such minimum:
 * tabs at `width="full"` shared the frame however long their labels were,
 * so the content never outgrew the frame and nothing scrolled. Each one is
 * measured at its own size first and then grows from that width, so the line
 * scrolls once the items no longer fit.
 *
 * **A part that scrolls both ways is a scroll view across inside one
 * down**, which the scroll capability takes as one node: the outer one,
 * standing at the offset and ends of both. Its scroll buttons, where it
 * draws any, step down. **Its content stacks down unless its style says
 * otherwise**: React Native lays a scroll view across in a row, which drew
 * a scroll area's notes side by side on one line.
 *
 * **A part that snaps comes to rest on the boxes in it that say where**, as
 * `useSnap` works out, and its content is as long as they make it.
 *
 * **Inside a layer that swipes along its axis, the part hands its drag to the
 * layer at its start**, as `useSwipe` says: its gesture runs beside the
 * layer's swipe, and the swipe reads where it stands and holds it there.
 *
 * **A part that takes no touch of its own between what it holds**, as a
 * toast's stack, passes those touches through its scroll view while nothing
 * scrolls, and does not bounce under a finger. Its scroll view takes them once its content is longer than its
 * frame, since a scroll view that passes its touches through scrolls on iOS
 * alone.
 *
 * **The frame is the part's box**, so it moves as the part's transitions and
 * its animation say, and blurs what is behind it, as a dialog's panel that
 * scrolls fades and rises in and swells.
 */
export const ScrollingPart = ({
  axis,
  blur,
  box,
  content,
  controls,
  hugs,
  line,
  motion,
  snap,
  transitions,
  view,
}: ScrollingProps) => {
  const horizontal = axis === 'x'
  const locked = useScrollLocked()
  const scroller = useRef<ScrollViewInstance>(null)
  const { at, more, track } = useMore()
  const [frame, inner] = parted(box)
  const {
    contentRef,
    holdsEnd,
    indicators,
    keyboardShouldPersistTaps,
    maintainVisibleContentPosition,
    onSnapOffsets,
    pager,
    scrollerRef,
    onScroll: heard,
    snapOffsets,
    style: over,
    ...props
  } = view
  usePager(pager, scroller, at, horizontal)
  useScroller(scrollerRef, scroller)
  const laidOut = useContent(contentRef)
  const spread = useSpread(spreads(axis, hugs, snap), laidOut.node)
  const snapping = useSnap(snap, horizontal, onSnapOffsets, snapOffsets)
  const fill = useFill()
  const buttons = horizontal ? 'x' : 'y'
  const heldEnd = useHeldEnd(holdsEnd === true, scroller, at)
  const scrolling: Scrolling = {
    ...(horizontal ? { axis: 'x', fill, more } : { axis: 'y', more }),
    ...snapping.reports,
  } as Scrolling
  const twoWays = axis === 'both'
  /* The frame's width, which words inside wrap at, less the content's
     padding, when it scrolls both ways. */
  const [wide, setWide] = useState<number>()
  /* The view across, paired with the one down once both are drawn. */
  const acrossView = useRef<ScrollViewInstance>(null)
  useLayoutEffect(() => {
    const outer = scroller.current
    if (!twoWays || outer === null) {
      return undefined
    }
    pairAcross(outer, acrossView.current)
    return () => pairAcross(outer, null)
  }, [twoWays])
  const told = reporting(() => scroller.current, twoWays ? 'y' : 'both')
  const own = useCallback((node: ScrollViewInstance | null) => holding(scroller)(node), [])
  const handOff = useHandOff(twoWays ? undefined : horizontal ? 'x' : 'y', own)
  const through = passingThrough(props.pointerEvents, more, locked, handOff.waits)
  const shared = {
    keyboardShouldPersistTaps: tapsKept(keyboardShouldPersistTaps),
    scrollEnabled: through.scrollEnabled,
    scrollEventThrottle: 16,
    showsHorizontalScrollIndicator: indicators === true,
    showsVerticalScrollIndicator: indicators === true,
  }
  const laid = (
    <ScrollView
      {...shared}
      {...snapping.scroller}
      contentContainerStyle={{
        ...(twoWays ? { flexDirection: 'column' } : {}),
        ...inner,
        flexGrow: 1,
        ...through.content,
        ...(spread.width === undefined ? {} : { width: spread.width }),
      }}
      horizontal={horizontal || twoWays}
      innerViewRef={laidOut.held}
      maintainVisibleContentPosition={
        maintainVisibleContentPosition as ScrollViewProps['maintainVisibleContentPosition']
      }
      onContentSizeChange={(width, height) => {
        track({ content: buttons === 'x' ? width : height })
        heldEnd(height)
        laidOut.sized(width, height)
        ;(twoWays ? reporting(() => scroller.current, 'x') : told).onContentSizeChange(
          width,
          height,
        )
      }}
      {...(twoWays
        ? across(
            acrossView,
            reporting(() => scroller.current, 'x'),
          )
        : {
            onLayout: (event: LayoutChangeEvent) => {
              const { layout } = event.nativeEvent
              track({ frame: horizontal ? layout.width : layout.height })
              spread.framed(layout.width)
              snapping.framed(horizontal ? layout.width : layout.height)
              told.onLayout(event)
            },
            onMomentumScrollBegin: told.onMomentumScrollBegin,
            onMomentumScrollEnd: told.onMomentumScrollEnd,
            onScroll: (event: Scrolled) => {
              told.onScroll(event)
              ;(heard as ((event: Scrolled) => void) | undefined)?.(event)
              const { contentOffset, contentSize, layoutMeasurement } = event.nativeEvent
              track({ offset: horizontal ? contentOffset.x : contentOffset.y })
              handOff.scrolled({
                content: contentSize,
                frame: layoutMeasurement,
                offset: contentOffset,
              })
            },
            ref: handOff.held,
          })}
      style={growing(hugs)}
      {...through.scroller}
    >
      <WrapWidth.Provider value={twoWays ? wrapWidth(wide, inner) : undefined}>
        {content(scrolling)}
      </WrapWidth.Provider>
    </ScrollView>
  )
  return (
    <Box
      blur={blur}
      line={line}
      motion={motion}
      style={{ ...frame, overflow: 'hidden' }}
      {...movesOf(transitions)}
      view={{ ...props, style: over as StyleProp<ViewStyle> }}
    >
      {twoWays ? (
        <ScrollView
          {...shared}
          {...told}
          onLayout={(event) => {
            track({ frame: event.nativeEvent.layout.height })
            setWide(event.nativeEvent.layout.width)
            told.onLayout(event)
          }}
          onScroll={(event) => {
            told.onScroll(event)
            track({ offset: event.nativeEvent.contentOffset.y })
          }}
          ref={scroller}
          style={{ flexGrow: 1 }}
        >
          {laid}
        </ScrollView>
      ) : (
        handOff.wrap(laid)
      )}
      {controls(scrolling)}
    </Box>
  )
}

/**
 * What the scroll view across inside a part that scrolls both ways takes: its
 * reports, for the outer one, and its pairing with it, so the scroll
 * capability moves both.
 */
const across = (
  inner: RefObject<ScrollViewInstance | null>,
  told: ReturnType<typeof reporting>,
) => ({
  nestedScrollEnabled: true,
  onLayout: told.onLayout,
  onMomentumScrollBegin: told.onMomentumScrollBegin,
  onMomentumScrollEnd: told.onMomentumScrollEnd,
  onScroll: told.onScroll,
  ref: inner,
})
