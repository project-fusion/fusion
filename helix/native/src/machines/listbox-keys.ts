/**
 * What a key does to a list of options, as the web element's `handleKeydown`
 * does, from core's arithmetic. Pure, so the machine only runs what this says.
 *
 * **A Shift range adds**, as core's `rangeAdd` does, and lets none go. See
 * `@fusion.dev/helix-core/listbox`.
 */
import type { KeyPress } from '@fusion.dev/helix-core/capabilities/types'
import { selectsAll } from '@fusion.dev/helix-core/listbox'
import { reorderKey } from '@fusion.dev/helix-core/reorder'

/** The keys that move the list from a field a reader is typing in. */
const FIELD_MOVES: ReadonlySet<string> = new Set(['ArrowDown', 'ArrowUp', 'PageDown', 'PageUp'])

/** The keys that move within a list. */
const MOVES: ReadonlySet<string> = new Set([...FIELD_MOVES, 'End', 'Home'])

/** What a key does. */
export type ListKey =
  | { readonly kind: 'all' }
  | { readonly kind: 'choose' }
  | { readonly kind: 'extend' }
  | { readonly kind: 'link' }
  | { readonly key: string; readonly kind: 'move'; readonly shift: boolean }
  | { readonly by: -1 | 1; readonly kind: 'along' }
  | { readonly kind: 'reorder'; readonly to: number }
  | { readonly key: string; readonly kind: 'type' }
  | { readonly kind: 'taken' }

/** What a key reads of the list. */
export interface ListKeyState {
  /** The highlighted option's place among those that move with it, and how many they are. */
  readonly around: { readonly at: number; readonly count: number } | undefined
  readonly grid: boolean
  /** Whether the highlight is on a link. */
  readonly link: boolean
  readonly multiple: boolean
  readonly rtl: boolean
  /** Whether a reader can move options now. */
  readonly reorders: boolean
  /** Whether letters typed a moment ago are still one search. */
  readonly searching: boolean
  /** Whether the key was pressed in the filter field. */
  readonly typing: boolean
}

/** Whether a key types a letter of a search. */
const types = (press: KeyPress): boolean =>
  [...press.key].length === 1 && !press.alt && !press.control && !press.meta

/** What Alt with a key does to the highlighted option. */
const reorderOf = (press: KeyPress, now: ListKeyState): ListKey | undefined => {
  if (!press.alt || !now.reorders || now.around === undefined) {
    return undefined
  }
  const to = reorderKey(press.key, {
    axis: 'block',
    count: now.around.count,
    rtl: now.rtl,
    to: now.around.at,
  })
  return to === null ? undefined : { kind: 'reorder', to }
}

/** What Enter and Space do. */
const answerOf = (press: KeyPress, now: ListKeyState): ListKey | undefined => {
  if (now.multiple && press.key === ' ' && press.shift && !now.typing) {
    return { kind: 'extend' }
  }
  if (press.key !== 'Enter' && (press.key !== ' ' || now.typing || now.searching)) {
    return undefined
  }
  if (now.link) {
    return press.key === 'Enter' ? { kind: 'link' } : { kind: 'taken' }
  }
  return { kind: 'choose' }
}

/** What an arrow along a grid's line does. */
const alongOf = (press: KeyPress, now: ListKeyState): ListKey | undefined => {
  if (!now.grid || now.typing || (press.key !== 'ArrowLeft' && press.key !== 'ArrowRight')) {
    return undefined
  }
  return { by: (press.key === 'ArrowRight') !== now.rtl ? 1 : -1, kind: 'along' }
}

/** What a key that moves the highlight does. */
const moveOf = (press: KeyPress, now: ListKeyState): ListKey | undefined => {
  const fieldRange =
    now.typing &&
    now.multiple &&
    press.shift &&
    (press.control || press.meta) &&
    (press.key === 'Home' || press.key === 'End')
  if (!fieldRange && !(now.typing ? FIELD_MOVES : MOVES).has(press.key)) {
    return undefined
  }
  const ranged = press.key === 'Home' || press.key === 'End'
  const adds = now.multiple && press.shift && (ranged ? !now.typing || fieldRange : !now.typing)
  return { key: press.key, kind: 'move', shift: adds }
}

/** What a key does to a list of options, or `undefined` where the list leaves it alone. */
export const listKey = (press: KeyPress, now: ListKeyState): ListKey | undefined => {
  const moved = reorderOf(press, now)
  if (moved !== undefined) {
    return moved
  }
  const answered = answerOf(press, now)
  if (answered !== undefined) {
    return answered
  }
  const chord = {
    altKey: press.alt,
    ctrlKey: press.control,
    key: press.key,
    metaKey: press.meta,
  }
  if (now.multiple && !now.typing && selectsAll(chord)) {
    return { kind: 'all' }
  }
  if (!now.typing && types(press)) {
    return { key: press.key, kind: 'type' }
  }
  return alongOf(press, now) ?? moveOf(press, now)
}
