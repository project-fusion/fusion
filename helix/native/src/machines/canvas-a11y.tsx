/**
 * What a screen reader and a finger reach on a phone's board beyond the
 * drawing: a view over the middle of each connection, named for the two
 * cards it joins, each card's place, name and description, and the
 * minimap's frame and press.
 *
 * **A card hears the board through `CanvasBoard`**: where the plane's
 * corner is, so it places itself; whether it is selected; what its
 * connections lead to and come from, and what its tone means, so a screen
 * reader hears them after its name, as the web's description says them.
 */
import { type CanvasNode, descriptionOf, extent } from '@fusion.dev/helix-core/canvas'
import { formatMessage } from '@fusion.dev/helix-core/words'
import { createContext, type ReactNode, useContext, useMemo } from 'react'
import { type GestureResponderEvent, Pressable } from 'react-native'
import type { MachineUse } from '../ir.generated'
import type { Behavior, Props } from '../render/behavior'
import type { Family } from '../style/form'
import { type Line, type Link, type Stop, textOf } from './canvas-board'
import { type Area, minimapAreaOf } from './canvas-view'
import { kebab, numberIn, wordsIn } from './date-picker-read'
import { langOf } from './picker-field-kind'
import { boundTo, given } from './props'

type Read = (name: string) => unknown

/** What the board tells the cards on it. */
export interface Board {
  /** Selects a card or a connection, by its key, as a press on it does. */
  readonly choose: (key: string) => void
  /** What each card's connections lead to and come from, by its name. */
  readonly linked: ReadonlyMap<string, string>
  /** The plane's corner, in the document's units. */
  readonly origin: { readonly x: number; readonly y: number }
  readonly picked: ReadonlySet<string>
  readonly selectedLabel: string
  readonly toneLabels: Readonly<Record<string, string>>
}

/** The board around a card, or none where a card is drawn alone. */
export const CanvasBoard = createContext<Board | undefined>(undefined)

/** A card's name, whichever it has, as the web's `textOf` reads it. */
const nameOf = (node: CanvasNode): string => node.label ?? node.text ?? node.id

/** Each card's sentence of where its connections go, as the web's `readLinks` writes it. */
export const linkWords = (
  nodes: readonly CanvasNode[],
  links: readonly Link[],
  read: Read,
  lang: string,
): ReadonlyMap<string, string> => {
  const byId = new Map(nodes.map((node) => [node.id, node]))
  const named = (id: string) => {
    const other = byId.get(id)
    return other === undefined ? id : nameOf(other)
  }
  const leads = new Map<string, string[]>()
  const from = new Map<string, string[]>()
  for (const { edge } of links) {
    leads.set(edge.fromNode, [...(leads.get(edge.fromNode) ?? []), named(edge.toNode)])
    from.set(edge.toNode, [...(from.get(edge.toNode) ?? []), named(edge.fromNode)])
  }
  const list = new Intl.ListFormat(lang || undefined, { type: 'conjunction' })
  const words = (label: string, cards: string[]) =>
    cards.length === 0
      ? ''
      : formatMessage(wordsIn(read(label)), { cards: list.format(cards) }, lang)
  return new Map(
    nodes.map((node) => {
      const leadsTo = words('leads-to-label', leads.get(node.id) ?? [])
      const comesFrom = words('comes-from-label', from.get(node.id) ?? [])
      return [
        node.id,
        leadsTo && comesFrom
          ? formatMessage(wordsIn(read('linked-label')), { comesFrom, leadsTo }, lang)
          : leadsTo || comesFrom,
      ]
    }),
  )
}

/** The side of a connection's view, a finger's target, in the document's units. */
const SIDE = 44

/** One connection's view, a finger's target over its middle. */
const edgeView = (stop: Link, line: Line, label: string, board: Board, lang: string): ReactNode => {
  const selected = board.picked.has(stop.key)
  const hint = descriptionOf(lang, [
    selected ? board.selectedLabel : '',
    stop.tone ? board.toneLabels[stop.tone] : '',
    stop.edge.label,
  ])
  return (
    <Pressable
      accessibilityHint={hint || undefined}
      accessibilityLabel={label}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      key={stop.key}
      onPress={() => board.choose(stop.key)}
      style={{
        height: SIDE,
        left: line.mid.x - SIDE / 2,
        position: 'absolute',
        top: line.mid.y - SIDE / 2,
        width: SIDE,
      }}
      testID={`canvas-edge-${stop.key}`}
    />
  )
}

/**
 * A view of its own over the middle of each connection, after the card it
 * leaves: a button named for the two cards it joins, described by whether it
 * is selected, what its tone means, and its label. A press on it selects the
 * connection, as the board's own tap there does.
 */
export const edgeViewsOf = (
  walk: readonly Stop[],
  lines: readonly Line[],
  nodes: readonly CanvasNode[],
  board: Board,
  read: Read,
  lang: string,
): ReadonlyMap<string, ReactNode> => {
  const byId = new Map(nodes.map((node) => [node.id, node]))
  const byKey = new Map(lines.map((line) => [line.key, line]))
  const views = new Map<string, ReactNode>()
  for (const stop of walk) {
    if (stop.kind !== 'edge') {
      continue
    }
    const line = byKey.get(stop.key)
    const from = byId.get(stop.edge.fromNode)
    const to = byId.get(stop.edge.toNode)
    if (line !== undefined && from !== undefined && to !== undefined) {
      const label = formatMessage(
        wordsIn(read('connection-label')),
        { from: nameOf(from), to: nameOf(to) },
        lang,
      )
      views.set(stop.key, edgeView(stop, line, label, board, lang))
    }
  }
  return views
}

/** The minimap's picture, its cards and its frame, and the press that brings a place to the middle. */
export const useMinimap = (
  nodes: readonly CanvasNode[],
  screen: Area,
  shown: boolean,
  bring: (point: { x: number; y: number }) => void,
) => {
  const area = useMemo(() => minimapAreaOf(extent([...nodes]), screen), [nodes, screen])
  /* The picture is drawn whole and centered in its box, 160 by 120, so the
     box's spare room is split either side of it, as the web reads a press. */
  const press = (x: number, y: number) => {
    const scale = Math.min(160 / area.width, 120 / area.height) || 1
    bring({
      x: area.x + (x - (160 - area.width * scale) / 2) / scale,
      y: area.y + (y - (120 - area.height * scale) / 2) / scale,
    })
  }
  return {
    frame: [{ key: 'view', ...screen }],
    nodes: nodes.map((node) => ({
      group: node.type === 'group',
      height: node.height,
      key: node.id,
      width: node.width,
      x: node.x,
      y: node.y,
    })),
    shown,
    /* A press and a drag on it, as the web's pointer on its picture. */
    view: {
      onResponderGrant: (event: GestureResponderEvent) =>
        press(event.nativeEvent.locationX, event.nativeEvent.locationY),
      onResponderMove: (event: GestureResponderEvent) =>
        press(event.nativeEvent.locationX, event.nativeEvent.locationY),
      onStartShouldSetResponder: () => shown,
    },
    viewBox: `${area.x} ${area.y} ${area.width} ${area.height}`,
  }
}

/** Where a card sits on the plane, and its size where it gives one. */
const placeOf = (read: Read, board: Board): Readonly<Record<string, number>> => {
  const width = numberIn(read('width')) ?? 0
  const height = numberIn(read('height')) ?? 0
  return {
    '_canvas-card-x': (numberIn(read('x')) ?? 0) - board.origin.x,
    '_canvas-card-y': (numberIn(read('y')) ?? 0) - board.origin.y,
    ...(width > 0 ? { '_canvas-card-inline-size': width } : {}),
    ...(height > 0 ? { '_canvas-card-block-size': height } : {}),
  }
}

/** Hosts a card on a phone's board: its place, its name, whether it is selected, and what a screen reader hears. */
export const useCanvasNode = (family: Family, props: Props, use: MachineUse): Behavior => {
  const board = useContext(CanvasBoard)
  const read: Read = (name) => given(family, props, kebab(name))
  const name = wordsIn(read('name'))
  const group = read('group') === true
  const label = wordsIn(read('label'))
  const text = textOf(props.children as ReactNode)
  const tone = wordsIn(read('tone'))
  const selected = board?.picked.has(name) === true
  const flag = (one: string) => boundTo(use, one, 'state') ?? kebab(one)
  const hint = descriptionOf(langOf(read), [
    selected ? board?.selectedLabel : '',
    board?.toneLabels[tone],
    board?.linked.get(name),
  ])
  return {
    marks: [...(board === undefined ? [] : ['placed']), ...(selected ? ['selected'] : [])],
    measured: board === undefined ? {} : placeOf(read, board),
    parts: {
      host: {
        states: {
          [flag('groupName')]: label,
          [flag('named')]: label || (group ? '' : text),
          [flag('outlined')]: read('shape') === 'diamond' && !group,
        },
      },
      node: {
        view: {
          accessibilityHint: hint || undefined,
          accessibilityState: { selected },
          /* Asked as the finger lands and again as it lifts, as the web's
             board selects a card on its press and on its click. */
          onPress: () => board?.choose(name),
          onPressIn: () => board?.choose(name),
        },
      },
    },
  }
}
