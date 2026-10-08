import {
  addFeature,
  formatWords,
  HelixBeforePasteEvent,
  type HelixElement,
  HelixPastedEvent,
} from '@fusion.dev/helix-core'
import { boardOf, INTERACTIVE, NUDGE } from '../board.js'
import { type CanvasDocument, fromJsonCanvas } from '../root/canvas-document.js'
import type { HelixHeadlessCanvas } from '../root/canvas-root.js'
import { parseCanvas, pasteInto } from './place.js'

/**
 * A copy on the board with cards selected writes them, and the connections
 * between them, as a JSON Canvas document in text. Not from a field a card
 * holds, nor over text a reader selected, which are the platform's to copy.
 */
const copy = (board: HelixHeadlessCanvas, event: ClipboardEvent): void => {
  const inner = boardOf(board)
  const { picked } = inner
  const origin = event.composedPath()[0] as Element | undefined
  const text = globalThis.getSelection?.()?.toString() ?? ''
  if (picked.length === 0 || !event.clipboardData || text !== '') {
    return
  }
  if (origin?.closest?.(INTERACTIVE)) {
    return
  }
  const chosen = new Set(picked)
  const whole = board.toJsonCanvas()
  const copied: CanvasDocument = {
    edges: (whole.edges ?? []).filter(
      (edge) => chosen.has(edge.fromNode) && chosen.has(edge.toNode),
    ),
    nodes: (whole.nodes ?? []).filter((node) => chosen.has(node.id)),
  }
  event.clipboardData.setData('text/plain', JSON.stringify(copied))
  event.preventDefault()
  inner.say(formatWords(board, 'copiedLabel', { count: copied.nodes?.length ?? 0 }))
}

/**
 * Adds the cards and connections of a JSON Canvas document, as a paste does,
 * and selects the cards: `paste()` on the board, once this entry is imported.
 */
const paste = (board: HelixHeadlessCanvas, document: CanvasDocument | string): boolean => {
  const inner = boardOf(board)
  const read = typeof document === 'string' ? parseCanvas(document) : document
  if (board.readOnly || !read?.nodes?.length) {
    return false
  }
  const taken = new Set(inner.edgeElements.map((one) => one.name).filter(Boolean))
  const placed = pasteInto(
    read,
    inner.nodes,
    taken,
    (board.snap ?? 0) > 0 ? (board.snap as number) : NUDGE * 2,
  )
  if (!board.dispatchEvent(new HelixBeforePasteEvent({ document: placed }))) {
    return false
  }
  const tier = (board.constructor as typeof HelixElement).tier
  /* Attributes, so the cards are in the markup as a page writes them. */
  const add = (
    name: string,
    attributes: Record<string, string | number | boolean | undefined>,
    color: string | undefined,
    text = '',
  ): void => {
    const element = board.ownerDocument.createElement(`${tier}${name}`)
    for (const [key, value] of Object.entries(attributes)) {
      if (value !== undefined && value !== false && value !== '') {
        element.setAttribute(key, value === true ? '' : String(value))
      }
    }
    if (color) {
      element.style.setProperty(`--${name}-color`, color)
    }
    element.textContent = text
    board.append(element)
  }
  const { edges, nodes } = fromJsonCanvas(placed)
  for (const one of nodes) {
    const { color, group, height, label, name, text, tone, width, x, y } = one
    add(
      'canvas-node',
      { group, height, label, name, tone, width, x, y },
      color,
      text ?? one.url ?? one.file,
    )
  }
  for (const one of edges) {
    add(
      'canvas-edge',
      {
        from: one.from,
        'from-end': one.fromEnd,
        'from-side': one.fromSide,
        label: one.label,
        name: one.name,
        to: one.to,
        'to-end': one.toEnd,
        'to-side': one.toSide,
        tone: one.tone,
      },
      one.color,
    )
  }
  board.requestUpdate()
  inner.choose(nodes.map((one) => one.name))
  inner.say(formatWords(board, 'pastedLabel', { count: nodes.length }))
  board.dispatchEvent(new HelixPastedEvent({ document: placed }))
  return true
}

/**
 * A copy or a paste on the board. A paste of a JSON Canvas document, the text
 * a copy writes, adds its cards and connections. Not into a field a card
 * holds, nor onto a `readonly` board, nor text that is not a board, which are
 * the platform's.
 */
const clipboard = (board: HelixHeadlessCanvas, event: ClipboardEvent): void => {
  if (event.type === 'copy') {
    copy(board, event)
    return
  }
  const origin = event.composedPath()[0] as Element | undefined
  if (event.defaultPrevented || origin?.closest?.(INTERACTIVE)) {
    return
  }
  if (paste(board, event.clipboardData?.getData('text/plain') ?? '')) {
    event.preventDefault()
  }
}

/**
 * Gives every board of a class copy and paste: Control or Command with C and
 * V, and `paste()`. The entries call it for their own tier's class.
 */
export const addPaste = (element: typeof HelixHeadlessCanvas): void => {
  addFeature(element, { clipboard, paste })
}
