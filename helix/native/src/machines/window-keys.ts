/**
 * What a press and a key do on a row of a window, as the web element's
 * `press` and `handleKeydown` do, from core's arithmetic. Pure, so the window
 * machine only runs what these say.
 */
import type { KeyPress } from '@fusion.dev/helix-core/capabilities/types'
import {
  anchorAt,
  commaList,
  inRowOrder,
  rangeAdd,
  type Sections,
  skipDisabled,
  stepIndex,
  toggleValue,
} from '@fusion.dev/helix-core/virtual-list'

/** What a press and a key read of the list. */
export interface WindowState {
  readonly across: number
  readonly behavior: string
  readonly chosen: string
  readonly count: number
  readonly horizontal: boolean
  readonly keysOfItems: readonly string[]
  readonly mode: string
  readonly off: ReadonlySet<string>
  readonly reorderable: boolean
  readonly sections: Sections | undefined
  readonly waterfall: boolean
}

/** What a key does: choose a value, press a row, move an item, move the keys, or take it and do nothing. */
export type KeyAction =
  | { readonly kind: 'choose'; readonly value: string }
  | {
      readonly at: number
      readonly extend: boolean
      readonly kind: 'press'
      readonly toggle: boolean
    }
  | { readonly kind: 'reorder'; readonly to: number }
  | { readonly kind: 'taken' }
  | {
      readonly extend: boolean
      readonly kind: 'step'
      readonly press: boolean
      readonly to: number
    }

/** The keys in the order of the set, a key it no longer holds kept after them. */
const inOrder = (keys: readonly string[], order: readonly string[]): string =>
  inRowOrder(keys, order).join(',')

/** The range a Shift press takes in, or `undefined` where it adds nothing. */
const ranged = (
  now: WindowState,
  held: readonly string[],
  anchor: string | undefined,
  at: number,
): string | undefined => {
  const range = rangeAdd(
    held,
    now.keysOfItems.map((one) => (now.off.has(one) ? '' : one)),
    anchorAt(now.keysOfItems, anchor, at).anchor,
    at,
  )?.filter((one) => one !== '')
  return range ? inOrder(range, now.keysOfItems) : undefined
}

/** The `value` a press with no Shift leaves on the item `key` names. */
const plainValue = (
  now: WindowState,
  held: readonly string[],
  key: string,
  toggle: boolean,
): string | undefined => {
  const alone = held.length === 1 && held[0] === key
  if (now.behavior === 'replace' && !toggle) {
    return alone ? undefined : key
  }
  if (now.mode === 'single') {
    return alone ? '' : key
  }
  return inOrder(toggleValue(held, key), now.keysOfItems)
}

/**
 * The `value` a press on item `at` leaves, or `undefined` for one that changes
 * nothing. `anchor` is the key a Shift range runs from.
 */
export const pressedValue = (
  now: WindowState,
  at: number,
  anchor: string | undefined,
  extend: boolean,
  toggle: boolean,
): string | undefined => {
  const key = now.keysOfItems[at]
  if (!now.mode || key === undefined || now.off.has(key)) {
    return undefined
  }
  const held = commaList(now.chosen)
  if (extend && now.mode === 'multiple') {
    return ranged(now, held, anchor, at)
  }
  return plainValue(now, held, key, toggle)
}

/** Where Alt with a key moves item `at`, or `undefined` for a key that moves nothing. */
const movedTo = (key: string, at: number, count: number): number | undefined =>
  ({ ArrowDown: at + 1, ArrowUp: at - 1, End: count - 1, Home: 0 })[key]

/** What a key does in a list a reader chooses from, or `undefined` for one it leaves. */
const choosing = (now: WindowState, at: number, pressed: KeyPress): KeyAction | undefined => {
  const toggle = pressed.control || pressed.meta
  const replacing = now.behavior === 'replace'
  if (!now.mode || pressed.alt) {
    return undefined
  }
  if (toggle && pressed.key.toLowerCase() === 'a' && now.mode === 'multiple') {
    return { kind: 'choose', value: now.keysOfItems.filter((one) => !now.off.has(one)).join(',') }
  }
  if (pressed.key === ' ' && (!toggle || replacing)) {
    return { at, extend: pressed.shift, kind: 'press', toggle }
  }
  return pressed.key === 'Escape' && now.chosen !== '' && !toggle && !pressed.shift
    ? { kind: 'choose', value: '' }
    : undefined
}

/** The key as a list that runs down reads it: across, Right and Left step, and Down and Up are the row's. */
const alongList = (now: WindowState, key: string): string => {
  if (!now.horizontal) {
    return key
  }
  const across: Readonly<Record<string, string>> = {
    ArrowDown: '',
    ArrowLeft: 'ArrowUp',
    ArrowRight: 'ArrowDown',
    ArrowUp: '',
  }
  return across[key] ?? key
}

/** Whether the list is a grid a reader reads, whose Home and End keep to the line. */
const linedOf = (now: WindowState): boolean =>
  !now.mode && !now.waterfall && !now.horizontal && now.sections === undefined && now.across > 1

/** What a waterfall's columns answer for a key, which `step` reads. */
export type WaterfallStep = (way: string, at: number) => number | undefined

/** Where the key lands before disabled items are passed over. */
const stepped = (
  now: WindowState,
  key: string,
  at: number,
  page: number,
  toggle: boolean,
  fall: WaterfallStep,
): number | undefined => {
  const ends = key === 'Home' || key === 'End'
  if (linedOf(now) && ends && !toggle) {
    const start = at - (at % now.across)
    return key === 'Home' ? start : Math.min(start + now.across, now.count) - 1
  }
  if (now.waterfall && !ends) {
    return fall(key === 'ArrowRight' ? 'next' : key === 'ArrowLeft' ? 'previous' : key, at)
  }
  return stepIndex(key, at, now.count, page, { across: now.across })
}

/** Whether the keys held leave the key to the row. */
const leaves = (now: WindowState, pressed: KeyPress): boolean => {
  const toggle = pressed.control || pressed.meta
  const replacing = Boolean(now.mode) && now.behavior === 'replace'
  const ends = pressed.key === 'Home' || pressed.key === 'End'
  const extend = pressed.shift && now.mode === 'multiple'
  return (
    pressed.alt || (toggle && !replacing && !(linedOf(now) && ends)) || (pressed.shift && !extend)
  )
}

/** What a key that moves between items does, or `undefined` for one it leaves. */
const moving = (
  now: WindowState,
  at: number,
  pressed: KeyPress,
  page: number,
  fall: WaterfallStep,
): KeyAction | undefined => {
  const toggle = pressed.control || pressed.meta
  const replacing = Boolean(now.mode) && now.behavior === 'replace'
  const extend = pressed.shift && now.mode === 'multiple'
  if (leaves(now, pressed)) {
    return undefined
  }
  const key = alongList(now, pressed.key)
  const to = stepped(now, key, at, page, toggle, fall)
  if (to === undefined) {
    return undefined
  }
  const next = skipDisabled(
    key,
    at,
    to,
    now.count,
    (one) => now.off.has(now.keysOfItems[one] ?? ''),
    now.waterfall ? 1 : now.across,
  )
  return next === undefined
    ? { kind: 'taken' }
    : { extend, kind: 'step', press: replacing && !toggle && !extend, to: next }
}

/**
 * What a key on the row at `at` does, or `undefined` for one the list leaves:
 * Alt moves an item, then what a list a reader chooses from takes, then the
 * keys that move between items. `page` is how many lines a page key moves.
 * A typed letter is the machine's, which holds what was typed before it.
 */
export const keyAction = (
  now: WindowState,
  at: number,
  pressed: KeyPress,
  page: number,
  fall: WaterfallStep,
): KeyAction | undefined => {
  if (now.reorderable && pressed.alt) {
    const to = movedTo(pressed.key, at, now.count)
    return to === undefined ? undefined : { kind: 'reorder', to }
  }
  return choosing(now, at, pressed) ?? moving(now, at, pressed, page, fall)
}
