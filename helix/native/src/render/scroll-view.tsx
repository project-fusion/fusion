/**
 * The scroll views the adapter draws, and what each tells the scroll
 * capability: where it stands, how long its content and frame are, and when
 * it glides on and comes to rest.
 */
import { type Ref, useCallback, useRef, useSyncExternalStore } from 'react'
import {
  type LayoutChangeEvent,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  ScrollView,
  type ScrollViewInstance,
  type ScrollViewProps,
} from 'react-native'
import {
  glides,
  nativeScroll,
  observeScrollLock,
  scrolled,
  scrollLocked,
  settled,
  sizedScroll,
} from '../capabilities/scroll'
import { useHandOff } from './hand-off'

/** Hears each time a layer holds the screen still or lets it go. */
const subscribe = (changed: () => void): (() => void) => observeScrollLock(() => changed())

/**
 * Whether a layer holds the screen still, as the scroll capability's `lock`
 * says. A scroll view the adapter draws takes no scroll while it does.
 */
export const useScrollLocked = (): boolean => useSyncExternalStore(subscribe, scrollLocked)

/** A scroll event's offset. */
export type Scrolled = NativeSyntheticEvent<NativeScrollEvent>

/** The axes a scroll view's reports stand for: both its own, or one of the pair a part that scrolls both ways is. */
type Reports = 'both' | 'x' | 'y'

/**
 * What a scroll view the adapter draws tells the scroll capability about
 * `node`: how far it has scrolled, how long its content and frame are, and
 * when it glides on and comes to rest. **Each of a pair that scrolls both
 * ways reports its own axis** for the part they make, which `node` is.
 */
export const reporting = (node: () => ScrollViewInstance | null, axis: Reports = 'both') => {
  const along = (size: { height: number; width: number }) =>
    axis === 'x' ? { width: size.width } : axis === 'y' ? { height: size.height } : size
  const at = (view: ScrollViewInstance, x: number, y: number) => {
    const was = nativeScroll.offset(view)
    return axis === 'x' ? { x, y: was.y } : axis === 'y' ? { x: was.x, y } : { x, y }
  }
  const on = (act: (view: ScrollViewInstance) => void) => {
    const view = node()
    if (view !== null) {
      act(view)
    }
  }
  return {
    onContentSizeChange: (width: number, height: number) =>
      on((view) => sizedScroll(view, 'content', along({ height, width }))),
    onLayout: ({ nativeEvent: { layout } }: LayoutChangeEvent) =>
      on((view) => sizedScroll(view, 'frame', along(layout))),
    onMomentumScrollBegin: (_event: Scrolled) => on(glides),
    onMomentumScrollEnd: (_event: Scrolled) => on(settled),
    onScroll: (event: Scrolled) => {
      const { x, y } = event.nativeEvent.contentOffset
      on((view) => scrolled(view, at(view, x, y)))
    },
  }
}

/** Two handlers as one, the adapter's first. */
const both =
  <Args extends unknown[]>(
    own: (...args: Args) => void,
    given?: ((...args: Args) => void) | null,
  ) =>
  (...args: Args): void => {
    own(...args)
    given?.(...args)
  }

/**
 * A scroll view a page is drawn in. It tells the scroll capability where it
 * stands and when it comes to rest, and takes no scroll while a layer holds
 * the screen still, as every scroll view the elements draw does. It takes
 * what a scroll view takes, a `ref` among them, which the scroll
 * capability's `observe` and `to` take as the node. **Inside a layer that
 * swipes along its axis, it hands its drag to the layer at its start**, as a
 * scrolling part does.
 */
export const ScrollArea = ({
  ref,
  ...props
}: ScrollViewProps & { readonly ref?: Ref<ScrollViewInstance> }) => {
  const locked = useScrollLocked()
  const view = useRef<ScrollViewInstance>(null)
  const told = reporting(() => view.current)
  const own = useCallback(
    (node: ScrollViewInstance | null) => {
      view.current = node
      if (typeof ref === 'function') {
        ref(node)
      } else if (ref !== null && ref !== undefined) {
        ref.current = node
      }
    },
    [ref],
  )
  const handOff = useHandOff(props.horizontal === true ? 'x' : 'y', own)
  const scrolledBy = (event: Scrolled) => {
    const { contentOffset, contentSize, layoutMeasurement } = event.nativeEvent
    handOff.scrolled({ content: contentSize, frame: layoutMeasurement, offset: contentOffset })
  }
  const drawn = (
    <ScrollView
      {...props}
      onContentSizeChange={both(told.onContentSizeChange, props.onContentSizeChange)}
      onLayout={both(told.onLayout, props.onLayout)}
      onMomentumScrollBegin={both(told.onMomentumScrollBegin, props.onMomentumScrollBegin)}
      onMomentumScrollEnd={both(told.onMomentumScrollEnd, props.onMomentumScrollEnd)}
      onScroll={both(both(told.onScroll, scrolledBy), props.onScroll)}
      ref={handOff.held}
      scrollEnabled={!locked && props.scrollEnabled !== false}
      scrollEventThrottle={props.scrollEventThrottle ?? 16}
    />
  )
  return handOff.wrap(drawn)
}
