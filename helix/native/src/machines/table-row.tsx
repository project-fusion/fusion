/**
 * The machines a row and a column of a table run on a phone. Each reads where it
 * stands from the table around it, and draws at the table's tracks.
 */

import { keys } from '@fusion.dev/helix-core/capabilities/keys'
import { locale } from '@fusion.dev/helix-core/capabilities/locale'
import type { KeyPress } from '@fusion.dev/helix-core/capabilities/types'
import { formatMessage, lookupWord } from '@fusion.dev/helix-core/words'
import {
  cloneElement,
  isValidElement,
  type ReactElement,
  type ReactNode,
  useContext,
  useMemo,
  useRef,
  useState,
} from 'react'
import { type HostInstance, type LayoutChangeEvent, Pressable } from 'react-native'
import { holdScrollViewsAbove } from '../capabilities/scroll'
import type { MachineUse } from '../ir.generated'
import type { Behavior, PartBinding, Props } from '../render/behavior'
import type { Family } from '../style/form'
import { boundTo, given, tell } from './props'
import {
  ColumnContext,
  RowContext,
  type RowPlace,
  TableContext,
  type TableOffer,
  usePin,
} from './table'
import { type CellModel, cellsOf, type RowModel } from './table-model'

/** The words a phone says of a cell: its column's heading, then its own. */
const cellReading = (column: string, words: string): string => {
  const tag = locale().read()
  const found = lookupWord(tag, 'helix-table', 'cellReading')
  const reading = typeof found?.[0] === 'string' ? found[0] : '{column}: {value}'
  return column === '' ? words : formatMessage(reading, { column, value: words }, tag)
}

/** How a column's edge lines a cell up. */
const JUSTIFY: Readonly<Record<string, string>> = { center: 'center', end: 'flex-end' }

/** A cell under a column that sets an edge, which it hears as two hooks. */
const atEdge = (element: ReactNode, edge: string): ReactNode =>
  edge === '' || !isValidElement(element)
    ? element
    : cloneElement(element as ReactElement<{ hooks?: unknown }>, {
        hooks: { cellAlign: edge, cellJustify: JUSTIFY[edge] ?? 'flex-start' },
      })

/** What one cell's box takes. */
const cellBox = (
  offer: TableOffer | undefined,
  rowKey: string,
  rowAt: number,
  disabled: boolean,
  cell: CellModel | undefined,
  at: number,
  pin: unknown,
): Readonly<Record<string, unknown>> => {
  const track = (offer?.lead.length ?? 0) + at
  const view = offer?.box(`${rowKey}/${track}`, track, cell?.words ?? '') ?? {}
  const heading = offer?.columns[at]?.words ?? ''
  const reading =
    cell?.plain === true
      ? {
          accessibilityLabel: cellReading(heading, cell.words),
          accessibilityState: disabled ? { disabled: true } : {},
          accessible: true,
        }
      : {}
  const grid = offer?.gridCell(rowAt, track) ?? {}
  const own = (view as { readonly style?: unknown }).style
  return {
    testID: `table:${rowKey}/${track}`,
    ...view,
    ...reading,
    ...grid,
    style: at === 0 ? [own, pin] : own,
  }
}

/** A touch as a responder hears it. */
interface Touch {
  readonly nativeEvent: { readonly pageY: number }
}

/** How far a finger travels on a grip before it drags, in points. */
const TRAVEL = 4

/** What a touch on a grip holds still while it lasts. */
interface GripTouch {
  readonly hold: () => void
  readonly node: () => HostInstance | null
  readonly release: () => void
}

/** A grip's touch, which holds the scroll views above its row still. */
const useGripTouch = (): GripTouch & { readonly ref: (view: HostInstance | null) => void } => {
  const node = useRef<HostInstance | null>(null)
  const letGo = useRef<(() => void) | undefined>(undefined)
  return useMemo(
    () => ({
      hold: () => {
        letGo.current?.()
        letGo.current = node.current ? holdScrollViewsAbove(node.current) : undefined
      },
      node: () => node.current,
      ref: (view: HostInstance | null) => {
        node.current = view
      },
      release: () => {
        letGo.current?.()
        letGo.current = undefined
      },
    }),
    [],
  )
}

/**
 * A drag on a grip carries its row, and a press stays the button's own: the cell
 * around the button takes the touch once it has traveled.
 */
const gripDrag = (
  offer: TableOffer | undefined,
  key: string,
  start: { current: number },
  touch: GripTouch,
): Readonly<Record<string, unknown>> => {
  const pageY = (event: { readonly nativeEvent: { readonly pageY: number } }) =>
    event.nativeEvent.pageY
  return {
    onMoveShouldSetResponderCapture: (event: Touch) =>
      offer?.grip.still === false && Math.abs(pageY(event) - start.current) > TRAVEL,
    onResponderGrant: () => offer?.grip.drag.start(key, touch.node()),
    onResponderMove: (event: Touch) =>
      offer?.grip.drag.move(pageY(event) - start.current, pageY(event)),
    onResponderRelease: () => offer?.grip.drag.end(true),
    onResponderTerminate: () => offer?.grip.drag.end(false),
    /* A drag on the grip moves the row, and the page around it stays. */
    onResponderTerminationRequest: () => false,
    onTouchCancel: touch.release,
    onTouchEnd: touch.release,
    onTouchStart: (event: Touch) => {
      start.current = pageY(event)
      /* **A finger on the grip never scrolls**, as the web's grip takes
         `touch-action: none`. Without it a quick drag starts the scroll view
         behind the row before the responder takes the touch, and nothing lifts. */
      if (offer?.grip.still === false) {
        touch.hold()
      }
    },
  }
}

/** The grip's button: its press, its keys, and a screen reader's two actions. */
const gripBinding = (
  offer: TableOffer | undefined,
  key: string,
  named: string,
  ref: unknown,
): PartBinding => ({
  view: {
    accessibilityActions: [
      { label: 'Move up', name: 'decrement' },
      { label: 'Move down', name: 'increment' },
    ],
    accessibilityLabel: offer?.said('moveRowLabel', { row: named }),
    accessibilityState: offer?.grip.still === true ? { disabled: true } : {},
    onAccessibilityAction: (event: { readonly nativeEvent: { readonly actionName: string } }) =>
      offer?.grip.move(key, event.nativeEvent.actionName === 'decrement' ? -1 : 1),
    onPress: () => offer?.grip.pick(key),
    ref,
    testID: `table:${key}:grip-button`,
  },
})

/** What a row says of itself as states. */
const rowStates = (
  place: RowPlace | undefined,
  lead: readonly string[],
  still: boolean,
  disabled: boolean,
): Readonly<Record<string, boolean>> => {
  const selected = place?.selected === true
  const branch = place?.branch === true
  return {
    branch,
    disabled,
    dragging: place?.move === 'dragging',
    'drop-after': place?.move === 'drop-after',
    'drop-before': place?.move === 'drop-before',
    expanded: branch && place?.open === true,
    'grip-still': still,
    grips: lead.includes('grip'),
    link: (place?.row.href ?? '') !== '' && !disabled,
    nests: lead.includes('expand'),
    selectable: lead.includes('select'),
    selected,
    'selected-cell': selected,
  }
}

/** A press anywhere on a row, where the table does anything with one. */
const rowWrap = (
  offer: TableOffer | undefined,
  row: RowModel | undefined,
  key: string,
): Pick<PartBinding, 'wrap'> => {
  const press = offer?.rowPress
  if (press === undefined || row === undefined) {
    return {}
  }
  return {
    wrap: (view) => (
      <Pressable accessible={false} onPress={() => press(row)} testID={`table-row:${key}`}>
        {view}
      </Pressable>
    ),
  }
}

/** Hosts a row: its cells at the table's tracks, and what it draws before them. */
export const useTableRow = (family: Family, props: Props, use: MachineUse): Behavior => {
  const offer = useContext(TableContext)
  const place = useContext(RowContext)
  const pin = usePin(offer)
  const cells = cellsOf(props.children)
  const disabled = given(family, props, boundTo(use, 'disabled', 'prop')) === true
  const key = place?.row.key ?? String(given(family, props, boundTo(use, 'value', 'prop')) ?? '')
  const at = place?.at ?? 0
  const named = place?.row.words ?? ''
  const lead = offer?.lead ?? []
  const leadBox = (name: string): Readonly<Record<string, unknown>> => {
    const track = lead.indexOf(name)
    return {
      testID: `table:${key}:${name}`,
      ...offer?.box(`${key}/${track}`, track, ''),
      ...offer?.gridCell(at, track),
    }
  }
  const gripStart = useRef({ current: 0 })
  const touch = useGripTouch()
  const heard = useRef<(press: KeyPress) => boolean>(() => false)
  heard.current = (press) => offer?.grip.key(key, press) === true
  const gripRef = useRef((view: unknown) =>
    view === null ? undefined : keys().listen(view, (press) => heard.current(press as KeyPress)),
  )
  const entries = cells.map((cell, index) => {
    return {
      at: index,
      draw: () => atEdge(cell.element, offer?.columns[index]?.textAlign ?? ''),
      key: String(index),
      pinned: index === 0 && offer !== undefined,
    }
  })
  const still = offer?.grip.still === true
  const parts: Record<string, PartBinding> = {
    'cell-box': {
      animated: true,
      copy: (item) => cellBox(offer, key, at, disabled, cells[item.index], item.index, pin),
    },
    checkbox: {
      view: {
        ariaLabel: offer?.said('selectRowLabel', { row: named }),
        checked: place?.selected === true,
        disabled,
        onBeforeCheck: (event: { readonly preventDefault: () => void }) => {
          event.preventDefault()
          offer?.choose(key, place?.selected !== true)
        },
      },
    },
    expand: { view: leadBox('expand') },
    'expand-button': {
      view: {
        accessibilityLabel: offer?.said('expandRowLabel', { row: named }),
        accessibilityState: { expanded: place?.open === true },
        onPress: () => offer?.disclose(key),
        testID: `table:${key}:expand-button`,
      },
    },
    grip: {
      view: {
        ...leadBox('grip'),
        ...gripDrag(offer, key, gripStart.current, touch),
        ref: touch.ref,
      },
    },
    'grip-button': gripBinding(offer, key, named, gripRef.current),
    host: {
      lists: { cells: entries },
      states: rowStates(place, lead, still, disabled),
      view: {
        onLayout: (event: LayoutChangeEvent) =>
          offer?.grip.measured(key, event.nativeEvent.layout.height),
        ...(offer?.total === undefined ? {} : { style: { width: offer.total } }),
      },
      ...rowWrap(offer, place?.row, key),
    },
    select: { view: leadBox('select') },
  }
  return { marks: [], parts }
}

const NARROWEST = 48
const STEP = 16

/** Hosts a column: a press that sorts, and a separator that resizes. */
export const useTableColumn = (family: Family, props: Props, use: MachineUse): Behavior => {
  const offer = useContext(TableContext)
  const place = useContext(ColumnContext)
  const field = String(given(family, props, boundTo(use, 'field', 'prop')) ?? '')
  const sortable = given(family, props, boundTo(use, 'sortable', 'prop')) === true
  const sorts = sortable && field !== ''
  const drawn = offer?.widths?.[place?.track ?? -1] ?? NARROWEST
  const [width, setWidth] = useState<string>()
  const start = useRef<{ from: number; width: number } | undefined>(undefined)
  const sorted = place?.sorted
  const words = place?.column.words ?? ''
  const name = { name: words, named: words ? 'yes' : 'no' }
  const resizeTo = (px: number): void => {
    const value = `${Math.max(NARROWEST, Math.round(px))}px`
    if (value === width) {
      return
    }
    const before = boundTo(use, 'onBeforeResize', 'event')
    if (before !== undefined && !tell(family, props, before, { value })) {
      return
    }
    setWidth(value)
    offer?.resize(place?.column.key ?? '', value)
    const after = boundTo(use, 'onResized', 'event')
    if (after !== undefined) {
      tell(family, props, after, { value })
    }
  }
  const labelOf = (bound: string): string =>
    formatMessage(
      String(given(family, props, boundTo(use, bound, 'prop')) ?? ''),
      name as never,
      '',
    )
  return {
    marks: [],
    parts: {
      column: {
        view: {
          accessibilityRole: 'header',
          ...(sorts ? {} : { accessibilityLabel: words, accessible: true }),
        },
      },
      host: {
        states: {
          movable: false,
          'sorted-ascending': sorted === 'ascending',
          'sorted-descending': sorted === 'descending',
          sorts,
          still: !sorts,
        },
      },
      resizer: {
        view: {
          accessibilityActions: [
            { label: 'Narrower', name: 'decrement' },
            { label: 'Wider', name: 'increment' },
          ],
          accessibilityLabel: labelOf('resizeLabel'),
          accessibilityValue: {
            text: formatMessage(
              String(given(family, props, boundTo(use, 'widthLabel', 'prop')) ?? ''),
              { width: Math.round(drawn) },
              '',
            ),
          },
          accessible: true,
          onAccessibilityAction: (event: {
            readonly nativeEvent: { readonly actionName: string }
          }) => resizeTo(drawn + (event.nativeEvent.actionName === 'decrement' ? -STEP : STEP)),
          onResponderGrant: (event: { readonly nativeEvent: { readonly pageX: number } }) => {
            start.current = { from: event.nativeEvent.pageX, width: drawn }
          },
          onResponderMove: (event: { readonly nativeEvent: { readonly pageX: number } }) => {
            if (start.current !== undefined) {
              resizeTo(start.current.width + event.nativeEvent.pageX - start.current.from)
            }
          },
          onResponderRelease: () => {
            start.current = undefined
          },
          onResponderTerminationRequest: () => false,
          onStartShouldSetResponder: () => true,
        },
      },
      sort: {
        view: {
          accessibilityRole: 'button',
          testID: `table:${place?.column.field}:sort`,
          ...(sorted === undefined ? {} : { accessibilityValue: { text: sorted } }),
          onPress: () => offer?.toggleSort(field),
        },
      },
    },
  }
}
