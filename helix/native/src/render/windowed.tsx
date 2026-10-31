/**
 * A repeat marked `windowed`: `FlatList` draws a copy of its first child for
 * each row near the screen, and what follows stands after the rows, inside
 * what scrolls. A waterfall stands each item in a scroll view at the place
 * core's `Waterfall` gives it, and draws those that reach the screen.
 */
import {
  createContext,
  Fragment,
  type ReactNode,
  type Ref,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import {
  FlatList,
  type LayoutChangeEvent,
  type ListRenderItemInfo,
  ScrollView,
  type ScrollViewInstance,
  type ScrollViewProps,
  View,
  type ViewProps,
} from 'react-native'
import { Gesture, GestureDetector } from 'react-native-gesture-handler'
import type { DrawnRow, WindowDrawing } from '../machines/window'
import type { Node } from '../style/form'
import type { Style } from '../style/resolved'
import { ScrollArea, type Scrolled } from './scroll-view'
import type { Draw, Scope } from './styles'

/** What a windowed list draws with beside its rows. */
interface Drawing {
  readonly drawing: WindowDrawing
  /** What stands after the rows, inside what scrolls. */
  readonly footer: ReactNode
  /** A copy for one row, at its place among the rows. */
  readonly row: (row: DrawnRow, place: number) => ReactNode
}

/** The scroll view a list scrolls in: the adapter's, which takes the screen's hold and a layer's hand-off. */
const scrollIn = (props: ScrollViewProps & { readonly ref?: Ref<ScrollViewInstance> }) => (
  <ScrollArea {...props} />
)

/**
 * How far a finger may stray, in points, and still be holding a row. A touch
 * that travels further before the hold is up is a swipe, however slow, and the
 * list scrolls.
 */
const HOLD_STRAY = 5

/** A row a finger held on lifts and drags, where the list lets a reader move items. */
export const Held = ({
  at,
  children,
  dragging,
  horizontal,
  onLift,
}: {
  readonly at: number
  readonly children: ReactNode
  readonly dragging: NonNullable<WindowDrawing['dragging']>
  readonly horizontal: boolean
  /** Hears the lift, where the row is told apart by more than its place. */
  readonly onLift?: () => void
}) => {
  const pan = Gesture.Pan()
    .activateAfterLongPress(500)
    .failOffsetX([-HOLD_STRAY, HOLD_STRAY])
    .failOffsetY([-HOLD_STRAY, HOLD_STRAY])
    .runOnJS(true)
    .onStart(() => {
      onLift?.()
      dragging.start(at)
    })
    .onUpdate((event) => dragging.move(at, horizontal ? event.x : event.y))
    .onFinalize(() => dragging.end())
  return (
    <GestureDetector gesture={pan}>
      <View>{children}</View>
    </GestureDetector>
  )
}

/** What a list's cells read and tell: the row a reader holds in a move, and each cell's length. */
export const Cells = createContext<{
  readonly held?: string | undefined
  readonly laid?: ((length: number) => void) | undefined
}>({})

/**
 * The most of a row, in points, that may stand at the top of a list at its end
 * before it reads as part of a line: less than this is the foot of a letter
 * such as a `g`, cut off from the rest and drawn alone as a dot.
 */
const SLIVER = 6

/**
 * What a list that follows its end adds after its rows so that no sliver of a
 * row stands at the top of the frame, where the frame is not a whole number of
 * lines. `line` is the shortest cell, which is a line that does not wrap.
 */
const useSliver = (on: boolean) => {
  const line = useRef(Number.POSITIVE_INFINITY)
  const added = useRef(0)
  const [pad, setPad] = useState(0)
  const settle = (content: number, frame: number) => {
    const over = content - added.current - frame
    if (on && frame > 0 && over > 0 && Number.isFinite(line.current)) {
      const sliver = (line.current - (over % line.current)) % line.current
      added.current = sliver <= SLIVER ? sliver : 0
      setPad(added.current)
    }
  }
  const laid = useCallback(
    (length: number) => {
      if (on && length > 0) {
        line.current = Math.min(line.current, length)
      }
    },
    [on],
  )
  return { laid, pad, settle }
}

/**
 * A cell of a list. **The cell holding the held row stays drawn however far the
 * list scrolls from it**, as a list keeps its focused cell: a row that left the
 * window would end the touch on it. The list keeps the cell until another takes
 * its place or its key goes, which a drop does when the row moves.
 */
export const Cell = ({
  children,
  item,
  onFocusCapture,
  onLayout,
  style,
}: ViewProps & { readonly item: DrawnRow | readonly DrawnRow[] }) => {
  const { held, laid } = useContext(Cells)
  const holds = held !== undefined && [item].flat().some((row) => row.key === held)
  useEffect(() => {
    if (holds) {
      onFocusCapture?.(undefined as never)
    }
  }, [holds, onFocusCapture])
  return (
    <View
      onFocusCapture={onFocusCapture}
      onLayout={(event) => {
        onLayout?.(event)
        laid?.(event.nativeEvent.layout.height)
      }}
      style={style}
    >
      {children}
    </View>
  )
}

/** Each row's key. */
const keyed = (row: DrawnRow): string => row.key

/** What a list that follows its newest content draws with. */
const followingOf = ({ initial, maintainVisibleContentPosition, shrinks }: WindowDrawing) => ({
  ...(initial === undefined ? {} : { initialNumToRender: initial }),
  ...(maintainVisibleContentPosition === undefined ? {} : { maintainVisibleContentPosition }),
  ...(shrinks === true ? { maxToRenderPerBatch: 20, windowSize: 5 } : {}),
})

/** How a list takes the length it is given. */
const lengthOf = (horizontal: boolean, shrinks: boolean) => {
  if (horizontal) {
    return { flexGrow: 0 }
  }
  return shrinks ? { flexGrow: 0, flexShrink: 1 } : { flex: 1 }
}

/** A list of rows, lines of columns, or a line across, in `FlatList`. */
const Listed = ({ drawing, footer, row }: Drawing) => {
  const { across, gap, held, horizontal, laid, listRef, moved, rows, shrinks, sideways } = drawing
  const [width, setWidth] = useState(0)
  const list = useRef<FlatList<DrawnRow> | null>(null)
  const own = useCallback(
    (next: FlatList<DrawnRow> | null) => {
      list.current = next
      listRef(next)
    },
    [listRef],
  )
  const standing = useRef({ content: 0, frame: 0, offset: 0 })
  const { laid: lined, pad, settle } = useSliver(shrinks === true && !horizontal)
  const cells = useMemo(() => ({ held, laid: lined }), [held, lined])
  const tell = () =>
    moved(standing.current.offset, standing.current.frame, standing.current.content)
  const cell = across > 1 && width > 0 ? (width - gap * (across - 1)) / across : undefined
  const drawCell = ({ index, item }: ListRenderItemInfo<DrawnRow>) =>
    across > 1 ? (
      <View style={{ width: cell ?? `${100 / across}%` }}>{row(item, index)}</View>
    ) : sideways === true ? (
      <View style={{ minWidth: width }}>{row(item, index)}</View>
    ) : (
      row(item, index)
    )
  /* A list stands in a frame of its own length, so it windows by its own
     frame inside a page that scrolls, as the web's box does: it reads no
     scroll view around it. */
  const lengthwise = lengthOf(horizontal, shrinks === true)
  const listed = (
    <ScrollView.Context.Provider value={null}>
      <Cells.Provider value={cells}>
        <FlatList
          CellRendererComponent={Cell}
          columnWrapperStyle={across > 1 && gap > 0 ? { columnGap: gap } : undefined}
          contentContainerStyle={gap > 0 && across > 1 ? { rowGap: gap } : undefined}
          data={rows}
          horizontal={horizontal}
          ItemSeparatorComponent={
            gap > 0 && across === 1
              ? () => <View style={horizontal ? { width: gap } : { height: gap }} />
              : undefined
          }
          key={`columns-${across}-${horizontal ? 'across' : 'down'}`}
          keyExtractor={keyed}
          {...followingOf(drawing)}
          ListFooterComponent={<View style={{ paddingBottom: pad }}>{footer}</View>}
          nestedScrollEnabled
          numColumns={across}
          onContentSizeChange={(contentWidth, contentHeight) => {
            standing.current.content = horizontal ? contentWidth : contentHeight
            tell()
            settle(standing.current.content, standing.current.frame)
          }}
          onLayout={({ nativeEvent: { layout } }: LayoutChangeEvent) => {
            if (sideways !== true) {
              setWidth(layout.width)
            }
            standing.current.frame = horizontal ? layout.width : layout.height
            laid(layout.width, layout.height)
            tell()
            settle(standing.current.content, standing.current.frame)
          }}
          onScroll={({ nativeEvent }: Scrolled) => {
            standing.current = {
              content: horizontal ? nativeEvent.contentSize.width : nativeEvent.contentSize.height,
              frame: horizontal
                ? nativeEvent.layoutMeasurement.width
                : nativeEvent.layoutMeasurement.height,
              offset: horizontal ? nativeEvent.contentOffset.x : nativeEvent.contentOffset.y,
            }
            tell()
          }}
          onScrollToIndexFailed={(info) => {
            const line = Math.max(1, info.averageItemLength)
            list.current?.scrollToOffset({ animated: false, offset: line * info.index })
            requestAnimationFrame(() =>
              list.current?.scrollToIndex({ animated: false, index: info.index }),
            )
          }}
          ref={own}
          renderItem={drawCell}
          renderScrollComponent={scrollIn}
          scrollEventThrottle={16}
          style={lengthwise}
        />
      </Cells.Provider>
    </ScrollView.Context.Provider>
  )
  /* A row that runs past the frame scrolls across around the list, which scrolls
     down: the list is as wide as its widest row drawn, as the web's box is. */
  return sideways === true ? (
    <ScrollView
      contentContainerStyle={{ flexDirection: 'column' }}
      horizontal
      nestedScrollEnabled
      onLayout={({ nativeEvent: { layout } }: LayoutChangeEvent) => setWidth(layout.width)}
      showsVerticalScrollIndicator={false}
      style={lengthwise}
    >
      {listed}
    </ScrollView>
  ) : (
    listed
  )
}

/** A waterfall: each item at its place, in a scroll view as long as its longest column. */
const Walled = ({ drawing, footer, row }: Drawing) => {
  const { laid, listRef, measured, moved, rows, waterfall } = drawing
  const [view, setView] = useState({ frame: 0, offset: 0 })
  if (waterfall === undefined) {
    return null
  }
  return (
    <ScrollArea
      onLayout={({ nativeEvent: { layout } }: LayoutChangeEvent) => {
        laid(layout.width, layout.height)
        setView((was) => ({ ...was, frame: layout.height }))
      }}
      onScroll={({ nativeEvent }: Scrolled) => {
        const { contentOffset, contentSize, layoutMeasurement } = nativeEvent
        setView({ frame: layoutMeasurement.height, offset: contentOffset.y })
        moved(contentOffset.y, layoutMeasurement.height, contentSize.height)
      }}
      ref={listRef as unknown as Ref<ScrollViewInstance>}
      style={{ flex: 1 }}
    >
      <View style={{ height: waterfall.extent }}>
        {waterfall.reaching(view.offset - view.frame, view.offset + view.frame * 2).map((at) => {
          const place = waterfall.place(at)
          const one = rows[at]
          return one === undefined ? null : (
            <View
              key={one.key}
              onLayout={({ nativeEvent: { layout } }: LayoutChangeEvent) =>
                measured(at, layout.height)
              }
              style={{ left: place.left, position: 'absolute', top: place.top, width: place.width }}
            >
              {row(one, at)}
            </View>
          )
        })}
      </View>
      {footer}
    </ScrollArea>
  )
}

/** What a windowed repeat draws. */
export const drawWindowed = (
  scope: Scope,
  node: Node,
  text: Style,
  regions: Style,
  inside: Node | 'host',
  draw: Draw,
): ReactNode => {
  const drawing = scope.behavior.parts[node.name]?.windowed
  const [first, ...rest] = node.children ?? []
  if (drawing === undefined || first === undefined) {
    return null
  }
  const footer = rest.map((child, index) => (
    // biome-ignore lint/suspicious/noArrayIndexKey: what a repeat holds never reorders
    <Fragment key={`${child.name}-${index}`}>{draw(scope, child, text, regions, inside)}</Fragment>
  ))
  const count = drawing.rows.length
  const row = (entry: DrawnRow, place: number): ReactNode => {
    const kept = drawing.kept?.get(entry)
    if (kept !== undefined) {
      return kept
    }
    const drawn = (
      <Fragment key={entry.key}>
        {draw(
          {
            ...scope,
            copy: {
              child: place === 0 ? 'first' : 'later',
              fromEnd: count - place,
              index: place + 1,
              last: place === count - 1,
            },
            item: {
              fields: entry as unknown as Readonly<Record<string, unknown>>,
              index: entry.at,
            },
          },
          first,
          text,
          regions,
          inside,
        )}
      </Fragment>
    )
    drawing.kept?.set(entry, drawn)
    return drawing.dragging === undefined || entry.header ? (
      drawn
    ) : (
      <Held
        at={entry.at}
        dragging={drawing.dragging}
        horizontal={drawing.horizontal}
        key={entry.key}
      >
        {drawn}
      </Held>
    )
  }
  if (drawing.plain === true) {
    return (
      <Fragment key={node.name}>
        {drawing.rows.map((entry, place) => row(entry, place))}
        {footer}
      </Fragment>
    )
  }
  return drawing.waterfall === undefined ? (
    <Listed drawing={drawing} footer={footer} key={node.name} row={row} />
  ) : (
    <Walled drawing={drawing} footer={footer} key={node.name} row={row} />
  )
}
