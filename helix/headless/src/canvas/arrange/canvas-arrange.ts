import { addFeature, type MoveDetail } from '@fusion.dev/helix-core'
import { boardOf } from '../board.js'
import type { HelixHeadlessCanvas } from '../root/canvas-root.js'
import { arrangement, type CanvasArrangeOptions } from './arrangement.js'

/** The glide each board's `arrange()` started, while it runs. */
const glides = new WeakMap<HelixHeadlessCanvas, { frame: number; to: MoveDetail['nodes'] }>()

/** Ends a glide where it was going. */
const settle = (board: HelixHeadlessCanvas): void => {
  const glide = glides.get(board)
  if (!glide) {
    return
  }
  cancelAnimationFrame(glide.frame)
  glides.delete(board)
  const { byName } = boardOf(board)
  for (const { name, x, y } of glide.to) {
    const card = byName.get(name)
    if (card) {
      card.x = x
      card.y = y
    }
  }
  board.requestUpdate()
}

/**
 * Moves the cards so that none overlaps another: `arrange()` on the board,
 * once this entry is imported. Asks with `helix-before-move` first and tells
 * with `helix-move`, as a move does, and glides for as long as the board's
 * plane takes to glide.
 */
const arrange = (board: HelixHeadlessCanvas, options: CanvasArrangeOptions): boolean => {
  settle(board)
  const inner = boardOf(board)
  const places = arrangement(inner.nodes, inner.edges, options, board.snap)
  const from = new Map(inner.cards.map((card) => [card.name, { x: card.x, y: card.y }]))
  const detail: MoveDetail = {
    nodes: [...places]
      .filter(([name, at]) => from.get(name)?.x !== at.x || from.get(name)?.y !== at.y)
      .map(([name, at]) => ({ name, ...at })),
  }
  if (board.readOnly || detail.nodes.length === 0 || !inner.requestMove(detail)) {
    return false
  }
  inner.finishMove(detail)
  inner.say(board.arrangedLabel)
  /* The plane's own glide, read with the board out of its direct state,
     which a board that has only settled into its box is still in. */
  const plane = inner.partNamed('board')
  let time = 0
  if (plane && !globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
    inner.toggleState('direct', false)
    time = Number.parseFloat(getComputedStyle(plane).transitionDuration) * 1000
    inner.toggleState('direct', inner.direct)
  }
  if (!(time > 0) || typeof requestAnimationFrame === 'undefined') {
    return true
  }
  const { byName } = inner
  /* Back where they started before anything draws, and on from there. */
  for (const { name } of detail.nodes) {
    const card = byName.get(name)
    const start = from.get(name)
    if (card && start) {
      card.x = start.x
      card.y = start.y
    }
  }
  const begun = performance.now()
  const step = (now: number): void => {
    const t = Math.min(1, (now - begun) / time)
    /* Ease in and out, as the board's own glide does. */
    const eased = t < 0.5 ? 4 * t ** 3 : 1 - (-2 * t + 2) ** 3 / 2
    for (const { name, x, y } of detail.nodes) {
      const card = inner.byName.get(name)
      const start = from.get(name)
      if (card && start) {
        card.x = start.x + (x - start.x) * eased
        card.y = start.y + (y - start.y) * eased
      }
    }
    board.requestUpdate()
    const glide = glides.get(board)
    if (t < 1 && glide) {
      glide.frame = requestAnimationFrame(step)
    } else {
      glides.delete(board)
    }
  }
  glides.set(board, { frame: requestAnimationFrame(step), to: detail.nodes })
  return true
}

/**
 * Gives every board of a class `arrange()`. The entries call it for their own
 * tier's class.
 */
export const addArrange = (element: typeof HelixHeadlessCanvas): void => {
  addFeature(element, { arrange, settle })
}
