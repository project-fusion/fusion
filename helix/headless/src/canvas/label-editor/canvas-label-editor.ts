import {
  addFeature,
  adoptSheet,
  formatWords,
  HelixBeforeRelabelEvent,
  HelixRelabelEvent,
  type RelabelDetail,
} from '@fusion.dev/helix-core'
import { type CSSResult, html, nothing, type TemplateResult } from 'lit'
import { boardOf } from '../board.js'
import type { CanvasEditing, HelixHeadlessCanvas } from '../root/canvas-root.js'

/** The label each board is editing, while it is. */
const edits = new WeakMap<HelixHeadlessCanvas, CanvasEditing>()

/**
 * Opens the field for a connection's label or a group's name. The field takes
 * the caret with what it says selected once it is drawn, so typing replaces it
 * and an arrow key keeps it.
 */
const open = (board: HelixHeadlessCanvas, editing: CanvasEditing): void => {
  edits.set(board, editing)
  board.requestUpdate()
  void board.updateComplete.then(() => {
    const field = boardOf(board).partNamed<HTMLInputElement>('label-editor')
    field?.focus()
    field?.select()
  })
}

/**
 * Finishes editing a label: asks, writes it where the page did not refuse,
 * and says it did. The same value is no change and asks nothing.
 */
const finish = (board: HelixHeadlessCanvas, field: HTMLInputElement, keep: boolean): void => {
  const editing = edits.get(board)
  if (!editing) {
    return
  }
  edits.delete(board)
  board.requestUpdate()
  const inner = boardOf(board)
  const label = field.value.trim()
  const back = (): void => {
    void board.updateComplete.then(() => inner.focusStop(editing.key))
  }
  if (!keep || label === editing.was) {
    back()
    return
  }
  const edge = editing.target === 'edge' ? inner.edgeElement(editing.key) : undefined
  const card = editing.target === 'group' ? inner.cardNamed(editing.key) : undefined
  const detail: RelabelDetail = {
    label,
    name: edge ? edge.name : (card?.name ?? ''),
    target: editing.target,
    was: editing.was,
    ...(edge ? { from: edge.from, to: edge.to } : {}),
  }
  if (board.dispatchEvent(new HelixBeforeRelabelEvent(detail))) {
    if (edge) {
      edge.label = label || undefined
    } else if (card) {
      card.label = label
    }
    board.dispatchEvent(new HelixRelabelEvent(detail))
  }
  back()
}

/** The field a label is edited in, where the label is, while one is. */
const render = (
  board: HelixHeadlessCanvas,
  origin: { x: number; y: number },
): TemplateResult | typeof nothing => {
  const editing = edits.get(board)
  if (!editing) {
    return nothing
  }
  const inner = boardOf(board)
  let at: { x: number; y: number } | undefined
  let named = ''
  if (editing.target === 'edge') {
    const edge = inner.edges.find((one) => inner.keyOf(one) === editing.key)
    const drawn = edge ? inner.geometryOf(edge, origin) : undefined
    if (drawn) {
      at = drawn.mid
      named = formatWords(board, 'connectionLabel', {
        from: inner.textOf(drawn.from),
        to: inner.textOf(drawn.to),
      })
    }
  } else {
    const group = inner.byId.get(editing.key)
    if (group) {
      at = { x: group.x - origin.x, y: group.y - origin.y }
      named = inner.textOf(group)
    }
  }
  if (!at) {
    return nothing
  }
  /* The keys in the field are the field's: Enter keeps, Escape puts it back,
     and nothing reaches the board, whose arrows would otherwise pan it out
     from under the caret. */
  return html`<input
    part="label-editor"
    aria-label=${formatWords(board, 'labelEditorLabel', { name: named })}
    data-target=${editing.target}
    style=${`--_canvas-editor-x: ${at.x}px; --_canvas-editor-y: ${at.y}px`}
    type="text"
    .value=${editing.was}
    @blur=${(event: FocusEvent) => finish(board, event.currentTarget as HTMLInputElement, true)}
    @keydown=${(event: KeyboardEvent) => {
      event.stopPropagation()
      if (event.key === 'Enter' || event.key === 'Escape') {
        event.preventDefault()
        finish(board, event.currentTarget as HTMLInputElement, event.key === 'Enter')
      }
    }}
  />`
}

/**
 * Gives every board of a class the field that edits a connection's label or a
 * group's name in place, opened by a double click, F2, or Enter on a group.
 * The entries call it for their own tier's class: the headless entry for
 * `HelixHeadlessCanvas`, and the styled one for `HelixCanvas`, with the sheet
 * that draws the field.
 */
export const addLabelEditor = (element: typeof HelixHeadlessCanvas, sheet?: CSSResult): void => {
  addFeature(element, {
    labelEditor: {
      open,
      render: (board: HelixHeadlessCanvas, origin: { x: number; y: number }) => {
        adoptSheet(board, sheet)
        return render(board, origin)
      },
    },
  })
}
