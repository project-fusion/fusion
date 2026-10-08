import type { MoveDetail } from '@fusion.dev/helix-core'
import type { HelixHeadlessCanvasEdge } from './edge/canvas-edge.js'
import type { HelixHeadlessCanvasNode } from './node/canvas-node.js'
import type { CanvasEdge, CanvasNode } from './root/canvas-document.js'
import type { HelixHeadlessCanvas } from './root/canvas-root.js'

/**
 * The board as the family's own entries read it: the members of
 * `HelixHeadlessCanvas` its public API leaves out, under the board's own
 * names, so the minimap, the label editor, `arrange()` and paste can live in
 * entries of their own and still draw what the board draws.
 *
 * **The names are the board's, read through a cast**, since a member the class
 * keeps private is one TypeScript lets nothing outside it read. So a rename on
 * the board is one this does not see, and each entry's specs are what hold the
 * two together.
 */
export interface Board {
  at: { x: number; y: number; zoom: number }
  readonly box: { width: number; height: number }
  readonly byId: Map<string, CanvasNode>
  readonly byName: Map<string, HelixHeadlessCanvasNode>
  readonly cards: HelixHeadlessCanvasNode[]
  direct: boolean
  readonly edgeElements: HelixHeadlessCanvasEdge[]
  readonly edges: CanvasEdge[]
  readonly nodes: CanvasNode[]
  readonly picked: string[]
  touched: boolean
  cardNamed(name: string | undefined): HelixHeadlessCanvasNode | undefined
  choose(keys: string | readonly string[] | undefined, said?: boolean): void
  edgeElement(key: string): HelixHeadlessCanvasEdge | undefined
  finishMove(detail: MoveDetail): void
  focusStop(key: string | undefined): void
  geometryOf(
    edge: CanvasEdge,
    origin: { x: number; y: number },
  ): { d: string; mid: { x: number; y: number }; from: CanvasNode; to: CanvasNode } | undefined
  keyOf(edge: CanvasEdge): string
  partNamed<T extends Element = HTMLElement>(name: string): T | null
  requestMove(detail: MoveDetail): boolean
  say(words: string): void
  textOf(node: CanvasNode): string
  toggleState(name: string, on: boolean): void
}

/** The board's own members, for an entry of the family's. */
export const boardOf = (board: HelixHeadlessCanvas): Board => board as unknown as Board

/**
 * How far a key press moves a card, in the document's own units.
 *
 * Half the ruling's default spacing, so two presses cross one square and a card
 * moved by keys lands where one moved by hand could.
 */
export const NUDGE = 16

/**
 * Whether an event began on something inside a card that answers a press
 * itself: a field, a button, a link, text being edited.
 *
 * **Those are the card's, not the board's.** A press on a button in a card
 * dragged the card, and a page editing a card's text in place could not put a
 * caret in it, because every press became a move.
 */
export const INTERACTIVE =
  'input, textarea, select, button, a[href], [contenteditable]:not([contenteditable="false"])'
