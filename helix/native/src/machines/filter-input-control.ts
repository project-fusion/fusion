/**
 * A phone's filter field's text: the view a `TextInput` takes, its caret and its
 * keys, and the request each edit makes, as the web's field asks before it changes.
 */
import { keys } from '@fusion.dev/helix-core/capabilities/keys'
import type { MachineUse } from '../ir.generated'
import type { PartBinding, Props } from '../render/behavior'
import type { Family } from '../style/form'
import { fieldKey, type KeyNow, RETURN } from './filter-input-facets'
import { boundTo, tell, told } from './props'

/** A focusable field, as React Native's `TextInput` is. */
export type Control = { readonly focus?: () => void } | null

/** A caret's selection in the text. */
export interface Caret {
  readonly end: number
  readonly start: number
}

/** What the text field's view reads of the element at one draw. */
export interface ControlNow {
  readonly back: () => void
  readonly control: { current: Control }
  readonly disabled: boolean
  readonly edit: (text: string) => void
  readonly focus: (focused: boolean) => void
  readonly key: { readonly current: KeyNow }
  readonly listening: { current: (() => void) | undefined }
  readonly placed: Caret | undefined
  readonly select: (caret: Caret) => void
  readonly value: string
}

/** The text field's view: its text, its caret, and its keys. */
export const controlOf = (now: ControlNow): PartBinding => ({
  view: {
    editable: !now.disabled,
    onBlur: () => now.focus(false),
    onChangeText: now.edit,
    onFocus: () => now.focus(true),
    onKeyPress: (event: { readonly nativeEvent: { readonly key: string } }) => {
      if (event.nativeEvent.key === 'Backspace' && now.value === '') {
        now.back()
      }
    },
    onSelectionChange: (event: { readonly nativeEvent: { readonly selection: Caret } }) =>
      now.select(event.nativeEvent.selection),
    onSubmitEditing: () => fieldKey(RETURN, now.key.current),
    ref: (node: unknown) => {
      now.control.current = node as Control
      now.listening.current?.()
      now.listening.current =
        node === null ? undefined : keys().listen(node, (press) => fieldKey(press, now.key.current))
    },
    submitBehavior: 'submit',
    value: now.value,
    ...(now.placed === undefined ? {} : { selection: now.placed }),
  },
})

/** What an edit of the text reads of the field. */
export interface Editing {
  readonly family: Family
  readonly props: Props
  readonly setValue: (next: string) => void
  readonly touch: () => void
  readonly use: MachineUse
  readonly value: string
}

/** Asks `before-change` for new text, takes it, and says `input`, as each keystroke does on the web. */
export const textRequester =
  ({ family, props, setValue, touch, use, value }: Editing) =>
  (next: string): boolean => {
    const before = boundTo(use, 'onBeforeChange', 'event')
    if (before !== undefined && !tell(family, props, before, { value: next }, { value })) {
      return false
    }
    setValue(next)
    touch()
    const input = boundTo(use, 'onInput', 'event')
    if (input !== undefined) {
      told(family, props, input, {}, { value: next })
    }
    return true
  }
