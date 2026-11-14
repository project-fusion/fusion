/**
 * A phone's terminal's handle and the views its parts take: the web element's
 * methods on the ref, the field that takes the reader's keys, the find bar,
 * the screen a press focuses the field from, and the words the region is
 * named by.
 */
import { pasted } from '@fusion.dev/helix-core/terminal'
import { type Ref, useImperativeHandle } from 'react'
import type { MachineUse } from '../ir.generated'
import type { Props } from '../render/behavior'
import { wordsIn } from './date-picker-read'
import { boundTo } from './props'
import type { Engine } from './terminal-engine'
import type { Search } from './terminal-screen'

/** What a terminal's ref answers, its web element's methods. */
export interface TerminalHandle {
  /** Clears the scrollback, keeping the line the cursor is on. */
  readonly clear: () => void
  /** Focuses the field that takes the reader's keys. */
  readonly focus: () => void
  /** Inputs text as a paste does, in bracketed paste mode where the program asked for it. */
  readonly paste: (text: string) => void
  /** Resets the emulator: its modes, its colors, and its screen. */
  readonly reset: () => void
  /** The lines on screen, or with `all` every line the scrollback holds, as plain text. */
  readonly text: (scope?: 'all' | 'screen') => string
  /** Writes the program's output, and resolves once it has been parsed. */
  readonly write: (data: string | Uint8Array) => Promise<void>
}

/** The web element's methods, on the ref. */
export const useHandle = (
  ref: unknown,
  emulator: Engine,
  schedule: () => void,
  input: (data: string) => void,
  field: { current: { focus?: () => void } | null },
) =>
  useImperativeHandle(
    ref as Ref<TerminalHandle> | undefined,
    (): TerminalHandle => ({
      clear: () => {
        emulator.clear()
        schedule()
      },
      focus: () => field.current?.focus?.(),
      paste: (text) => input(pasted(text, emulator.bracketed())),
      reset: () => {
        emulator.reset()
        schedule()
      },
      text: (scope = 'screen') => emulator.text(scope),
      write: (data) =>
        new Promise<void>((resolve) => {
          emulator.write(data, () => {
            schedule()
            resolve()
          })
        }),
    }),
  )

/** The handlers of the field that takes the reader's keys. */
export const inputView = (
  open: boolean,
  input: (data: string) => void,
  field: { current: { focus?: () => void } | null },
) => ({
  caretHidden: true,
  contextMenuHidden: true,
  editable: open,
  keyboardType: 'ascii-capable',
  onChangeText: (typed: string) => input(typed),
  onKeyPress: (event: { nativeEvent: { key: string } }) => {
    if (event.nativeEvent.key === 'Backspace') {
      input('\x7f')
    }
  },
  onSubmitEditing: () => input('\r'),
  ref: field,
  spellCheck: false,
  submitBehavior: 'submit',
  value: '',
})

/** The find bar's parts. */
export const searchParts = (search: Search) => ({
  'find-toggle': { view: { onPress: search.toggle } },
  'search-close': { view: { onPress: search.close } },
  'search-field': {
    view: {
      onChangeText: search.type,
      onSubmitEditing: search.next,
      ref: search.fieldRef,
      value: search.query,
    },
  },
  'search-next': { view: { onPress: search.next } },
  'search-previous': { view: { onPress: search.previous } },
})

/** The screen's view: a press, and not the end of a scroll, puts the keys in the field. */
export const screenView = (
  open: boolean,
  touch: { current: number | undefined },
  field: { current: { focus?: () => void } | null },
) => ({
  onTouchEnd: (event: { nativeEvent: { pageY: number } }) => {
    if (open && Math.abs(event.nativeEvent.pageY - (touch.current ?? 0)) < 8) {
      field.current?.focus?.()
    }
  },
  onTouchStart: (event: { nativeEvent: { pageY: number } }) => {
    touch.current = event.nativeEvent.pageY
  },
})

/** The states a machine gives the host, each by the name the source binds. */
export const statesOf = (
  use: MachineUse,
  values: Readonly<Record<string, boolean | string>>,
): Record<string, boolean | string> =>
  Object.fromEntries(
    Object.entries(values).map(([name, value]) => [boundTo(use, name, 'state') ?? name, value]),
  )

/** The words the region is named by: `label`, the page's name for the element, or the fallback. */
export const namedBy = (read: (name: string) => unknown, props: Props, label: string): string =>
  label ||
  wordsIn(props['aria-label']) ||
  wordsIn(props.ariaLabel) ||
  wordsIn(read('fallback-label'))
