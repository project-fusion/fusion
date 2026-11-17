/**
 * A Select's keys while its list is closed: a typed letter chooses, the inline
 * arrows step the choice, and the keys that open the list say where it opens.
 */
import { keys } from '@fusion.dev/helix-core/capabilities/keys'
import type { KeyPress } from '@fusion.dev/helix-core/capabilities/types'
import type { Typeahead } from '@fusion.dev/helix-core/listbox'
import { I18nManager } from 'react-native'
import type { ListOpening } from './list-owner'
import type { Entry } from './listbox-model'
import { reachable } from './virtual-focus'

const OPENS: Readonly<Record<string, ListOpening['where']>> = {
  ' ': 'selected',
  ArrowDown: 'selected',
  ArrowUp: 'last',
  End: 'last',
  Enter: 'selected',
  Home: 'first',
}

/** What the closed trigger's keys read at one draw. */
export interface Closed {
  readonly choose: (value: string) => void
  readonly disabled: boolean
  readonly entries: readonly Entry[]
  readonly multiple: boolean
  readonly open: (opening: ListOpening) => void
  readonly standing: boolean
  readonly typeahead: Typeahead
  readonly value: string
}

/** Whether a key types one character, with nothing held that makes it a command. */
const typesOne = (press: KeyPress): boolean =>
  !press.alt && !press.control && !press.meta && [...press.key].length === 1

/** A typed letter: chooses, or under `multiple` opens the list on what it matched. */
const typed = (press: KeyPress, now: Closed): boolean => {
  const shown = reachable(now.entries)
  const at = now.typeahead.match(
    press.key,
    shown.map((one) => one.text),
    shown.findIndex((one) => one.value === now.value),
  )
  const match = shown[at]?.value
  if (match !== undefined && now.multiple) {
    now.open({ value: match, where: 'selected' })
  } else if (match !== undefined) {
    now.choose(match)
  }
  return true
}

/** The inline arrows step the choice, the other way round on a right-to-left page. */
const stepped = (press: KeyPress, now: Closed): boolean => {
  const forward = press.key === 'ArrowRight' ? 1 : -1
  const by = I18nManager.isRTL ? -forward : forward
  const shown = reachable(now.entries)
  const next = shown[Math.max(0, shown.findIndex((one) => one.value === now.value) + by)]
  if (next !== undefined) {
    now.choose(next.value)
  }
  return true
}

/** What a key does to the closed trigger, and whether it took it. */
export const closedKey = (press: KeyPress, now: Closed): boolean => {
  if (now.disabled || now.standing) {
    return false
  }
  if (typesOne(press) && (press.key !== ' ' || now.typeahead.typing())) {
    return typed(press, now)
  }
  const inline = press.key === 'ArrowLeft' || press.key === 'ArrowRight'
  if (inline && !now.multiple && !press.alt && !press.control && !press.meta) {
    return stepped(press, now)
  }
  const where = OPENS[press.key]
  if (where === undefined) {
    return false
  }
  /* Up opens on the chosen option where there is one, and on the last where there is none. */
  now.open({
    where: where === 'last' && press.key === 'ArrowUp' && now.value !== '' ? 'selected' : where,
  })
  return true
}

/** A view's keys on the closed trigger, heard as the view is drawn and let go as it goes. */
export const triggerRef =
  (
    listening: { current: (() => void) | undefined },
    closed: { readonly current: Closed | undefined },
  ) =>
  (node: unknown): void => {
    listening.current?.()
    listening.current =
      node === null
        ? undefined
        : keys().listen(node, (press) =>
            closed.current === undefined ? false : closedKey(press, closed.current),
          )
  }
