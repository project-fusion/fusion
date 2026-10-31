/**
 * A repeat marked `windowed`: `FlatList` draws a copy of its first child for
 * each row near the screen, and what follows stands after the rows, inside
 * what scrolls. A waterfall stands each item in a scroll view at the place
 * core's `Waterfall` gives it, and draws those that reach the screen.
 */
import { Fragment, type ReactNode, type Ref, useCallback, useRef, useState } from 'react'
import {
  FlatList,
  type LayoutChangeEvent,
  type ListRenderItemInfo,
  ScrollView,
  type ScrollViewInstance,
  type ScrollViewProps,
  View,
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

/** A row a finger held on lifts and drags, where the list lets a reader move items. */
const Held = ({
  at,
  children,
  dragging,
  horizontal,
}: {
  readonly at: number
  readonly children: ReactNode
  readonly dragging: NonNullable<WindowDrawing['dragging']>
  readonly horizontal: boolean
}) => {
  const pan = Gesture.Pan()
    .activateAfterLongPress(500)
    .runOnJS(true)
    .onStart(() => dragging.start(at))
    .onUpdate((event) => dragging.move(at, horizontal ? event.x : event.y))
    .onFinalize(() => dragging.end())
  return (
    <GestureDetector gesture={pan}>
      <View>{children}</View>
    </GestureDetector>
  )
}

/** Each row's key. */
const keyed = (row: DrawnRow): string => row.key

/** A list of rows, lines of columns, or a line across, in `FlatList`. */
const Listed = ({ drawing, footer, row }: Drawing) => {
  const { across, gap, horizontal, laid, listRef, moved, rows } = drawing
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
  const tell = () =>
    moved(standing.current.offset, standing.current.frame, standing.current.content)
  const cell = across > 1 && width > 0 ? (width - gap * (across - 1)) / across : undefined
  const drawCell = ({ index, item }: ListRenderItemInfo<DrawnRow>) =>
    across > 1 ? (
      <View style={{ width: cell ?? `${100 / across}%` }}>{row(item, index)}</View>
    ) : (
      row(item, index)
    )
  /* A list stands in a frame of its own length, so it windows by its own
     frame inside a page that scrolls, as the web's box does: it reads no
     scroll view around it. */
  return (
    <ScrollView.Context.Provider value={null}>
      <FlatList
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
        ListFooterComponent={<View>{footer}</View>}
        nestedScrollEnabled
        numColumns={across}
        onContentSizeChange={(contentWidth, contentHeight) => {
          standing.current.content = horizontal ? contentWidth : contentHeight
          tell()
        }}
        onLayout={({ nativeEvent: { layout } }: LayoutChangeEvent) => {
          setWidth(layout.width)
          standing.current.frame = horizontal ? layout.width : layout.height
          laid(layout.width, layout.height)
          tell()
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
        style={horizontal ? { flexGrow: 0 } : { flex: 1 }}
      />
    </ScrollView.Context.Provider>
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
