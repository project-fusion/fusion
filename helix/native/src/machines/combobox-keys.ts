/**
 * What a hardware keyboard does in a text field that filters a list on a phone,
 * key for key as the web element's `keydown` does it. Focus stays in the field, and
 * what moves within the list goes to the list. Enter on a software keyboard is the
 * same Enter.
 */
import type { KeyPress } from '@fusion.dev/helix-core/capabilities/types'
import type { Highlight } from './virtual-focus'

/** What the field asks of the list drawn in its layer, while it stands open. */
export interface ListHands {
  readonly highlight: (where: Highlight) => void
  readonly key: (press: KeyPress) => boolean
}

/** What a key reads of the field at one draw. */
export interface FieldNow {
  readonly active: string
  readonly allowsCustom: boolean
  readonly back: () => void
  readonly chosenCount: number
  readonly clearChoice: () => void
  readonly close: () => void
  readonly commitTyped: () => boolean
  readonly create: () => void
  readonly creation: string
  readonly disabled: boolean
  readonly dropLast: () => void
  readonly flush: () => void
  readonly hands: ListHands | undefined
  readonly leave: () => void
  readonly multiple: boolean
  readonly onCreate: boolean
  readonly open: boolean
  readonly openOn: (where: 'first' | 'last' | 'none' | 'selected') => void
  readonly readonly: boolean
  readonly reachable: readonly string[]
  readonly setOnCreate: (on: boolean) => void
  readonly showing: boolean
  readonly typed: string
  readonly value: string
}

/** Keys that act on what was typed, so a narrowing still waiting happens first. */
const FLUSHES = new Set(['ArrowDown', 'ArrowUp', 'Enter', 'Escape', 'PageDown', 'PageUp'])

/** Escape closes the list and puts the words back, and on a closed field clears a single choice. */
const escapeKey = (now: FieldNow): boolean => {
  now.back()
  if (now.open) {
    now.close()
    return true
  }
  if (!now.multiple && now.value !== '' && !now.readonly) {
    now.clearChoice()
    return true
  }
  return false
}

/** Moves between the options and the create row after the last of them. */
const aroundCreate = (press: KeyPress, now: FieldNow): boolean => {
  if (now.creation === '' || (press.key !== 'ArrowDown' && press.key !== 'ArrowUp')) {
    return false
  }
  const down = press.key === 'ArrowDown'
  if (now.onCreate) {
    now.setOnCreate(false)
    now.hands?.highlight(down ? 'first' : 'last')
    return true
  }
  const at = now.reachable.indexOf(now.active)
  const edge = down ? now.reachable.length - 1 : 0
  if (now.reachable.length === 0 || at === edge) {
    now.setOnCreate(true)
    now.hands?.highlight('none')
    return true
  }
  return false
}

/** Enter with nothing left to choose creates, or takes the text where custom values are allowed. */
const enter = (now: FieldNow): boolean => {
  if (now.creation !== '' && (now.onCreate || !now.showing)) {
    now.create()
    return true
  }
  const highlighted = now.reachable.includes(now.active)
  if (now.allowsCustom && !highlighted && now.commitTyped()) {
    if (!now.multiple) {
      now.close()
    }
    return true
  }
  return false
}

/** Down and Up open a closed field, on the chosen option, the first, or the last. */
const closedKey = (press: KeyPress, now: FieldNow): boolean => {
  if (press.key === 'ArrowDown' && press.alt) {
    now.openOn('none')
    return true
  }
  if (press.key === 'ArrowDown' || press.key === 'ArrowUp') {
    const fallback = press.key === 'ArrowDown' ? 'first' : 'last'
    now.openOn(now.chosenCount > 0 ? 'selected' : fallback)
    return true
  }
  return false
}

/** Escape, Tab, and Backspace on nothing typed: the keys about the field, whatever the list does. */
const fieldOwn = (press: KeyPress, now: FieldNow): boolean | undefined => {
  if (press.key === 'Escape') {
    return escapeKey(now)
  }
  if (press.key === 'Tab') {
    now.leave()
    return false
  }
  if (press.key === 'Backspace' && now.multiple && now.typed === '') {
    now.dropLast()
    return true
  }
  return undefined
}

/** What a key does in the field, and whether it took it. */
export const fieldKey = (press: KeyPress, now: FieldNow): boolean => {
  if (now.disabled) {
    return false
  }
  if (FLUSHES.has(press.key)) {
    now.flush()
  }
  const own = fieldOwn(press, now)
  if (own !== undefined) {
    return own
  }
  if (press.key === 'Enter' && enter(now)) {
    return true
  }
  if (!now.open) {
    return closedKey(press, now)
  }
  if (press.key === 'ArrowUp' && press.alt) {
    now.close()
    return true
  }
  return aroundCreate(press, now) || (now.hands?.key(press) ?? false)
}
