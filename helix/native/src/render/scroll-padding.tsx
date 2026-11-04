/**
 * The padding a part that scrolls lays along its axis, which a windowed list
 * inside it takes over.
 *
 * **On the web a scroll container's padding scrolls with its content**, so a
 * wheel padded by half its height less a row lets its first and last rows rest
 * in the middle. On a phone a windowed list is its own scroll view inside the
 * part's frame, and the part's padding would stand still around it and shrink
 * it. So the list takes the padding into its own content, and the part lays
 * none of it. **A box that holds a windowed repeat is the web's scroller**, as a
 * list's `items` is, though it does not scroll itself on a phone, so it hands its
 * padding along the list in too.
 */
import {
  createContext,
  type ReactNode,
  useContext,
  useLayoutEffect,
  useMemo,
  useState,
} from 'react'
import type { Node } from '../style/form'
import type { Style } from '../style/resolved'

/** What a part that scrolls down offers the windowed list inside it. */
export interface HeldPadding {
  /** Its padding along the axis, top and bottom. */
  readonly padding: Style
  /** Tells the part whether a list inside has taken its padding. */
  readonly take: (taken: boolean) => void
}

export const ScrollPadding = createContext<HeldPadding | undefined>(undefined)

/** A padding along a list that runs down, by React Native's names. */
const BLOCK = /^padding(Top|Bottom|Vertical|BlockStart|BlockEnd|Block)$/

/** A content style split into its padding along a list that runs down, and the rest. */
export const blockPadding = (inner: Style): readonly [Style, Style] => {
  const block: Record<string, unknown> = {}
  const rest: Record<string, unknown> = {}
  for (const [name, value] of Object.entries(inner)) {
    ;(BLOCK.test(name) ? block : rest)[name] = value
  }
  return [block as Style, rest as Style]
}

/**
 * The content style a part that scrolls lays, less the padding along it once a
 * windowed list inside has taken that, and what it offers the list: nothing,
 * where the part scrolls across or both ways.
 */
export const useHeldPadding = (
  inner: Style,
  axis: 'both' | 'x' | 'y',
): readonly [Style, HeldPadding | undefined] => {
  const [taken, setTaken] = useState(false)
  const [block, unblocked] = blockPadding(inner)
  const key = JSON.stringify(block)
  const padding = useMemo(() => ({ padding: JSON.parse(key) as Style, take: setTaken }), [key])
  const down = axis === 'y'
  return [taken && down ? unblocked : inner, down ? padding : undefined]
}

/** Whether a box holds a windowed repeat, itself or under a `when`. */
const holdsWindowed = (node: Node): boolean =>
  (node.children ?? []).some(
    (child) =>
      (child.kind === 'repeat' && child.attributes?.windowed === true) ||
      (child.kind === 'when' && holdsWindowed(child)),
  )

/** A box's padding is its own to lay, so it is told of no list that takes it. */
const kept = (): void => undefined

/**
 * A box's style less the padding a windowed repeat it holds takes into its own
 * content, and what passes that padding to it. A box that holds none keeps all.
 */
export const windowedPadding = (
  node: Node,
  box: Style,
): readonly [Style, (content: ReactNode) => ReactNode] => {
  if (!holdsWindowed(node)) {
    return [box, (content) => content]
  }
  const [padding, rest] = blockPadding(box)
  if (Object.keys(padding).length === 0) {
    return [box, (content) => content]
  }
  return [
    rest,
    (content) => (
      <ScrollPadding.Provider value={{ padding, take: kept }}>{content}</ScrollPadding.Provider>
    ),
  ]
}

/**
 * The padding a windowed list lays in its own content: that of the part that
 * scrolls around it, which then lays none, where the list runs down.
 */
export const useTakenPadding = (horizontal: boolean): Style => {
  const held = useContext(ScrollPadding)
  const takes = held !== undefined && !horizontal && Object.keys(held.padding).length > 0
  const take = held?.take
  useLayoutEffect(() => {
    if (!takes || take === undefined) {
      return undefined
    }
    take(true)
    return () => take(false)
  }, [take, takes])
  return takes && held !== undefined ? held.padding : {}
}
