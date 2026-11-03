/**
 * What a text field that filters a list lays over its parts: the field's touches,
 * the text field's edits and keys, the list, and each tag.
 */
import { keys } from '@fusion.dev/helix-core/capabilities/keys'
import type { KeyPress } from '@fusion.dev/helix-core/capabilities/types'
import type { PartBinding } from '../render/behavior'
import type { Entry as Copy } from '../render/entry'
import { type FieldNow, fieldKey } from './combobox-keys'
import { fieldTouches } from './combobox-model'
import type { ListOwner } from './list-owner'
import type { HelixEvent } from './props'

/** A text field's view, as far as this reaches it. */
export type Control = { readonly focus?: () => void } | null

/** What the parts read at one draw. */
export interface FieldParts {
  readonly choose: (next: string) => void
  readonly create: () => void
  readonly deleting: { current: boolean }
  readonly disabled: boolean
  readonly drop: (value: string) => void
  readonly edit: (text: string) => void
  readonly editable: boolean
  readonly focusField: () => void
  readonly latest: { readonly current: FieldNow }
  readonly listOwner: ListOwner
  readonly listening: { current: (() => void) | undefined }
  readonly control: { current: Control }
  readonly multiple: boolean
  readonly onFocused: () => void
  readonly onText: { current: boolean }
  readonly open: boolean
  readonly openPressed: (onText: boolean) => void
  readonly selection: { readonly end: number; readonly start: number } | undefined
  readonly shown: string
  readonly toggleExpanded: () => void
  readonly value: string
}

/** Enter on a software keyboard is the same Enter a hardware one sends. */
const ENTER = { alt: false, control: false, key: 'Enter', meta: false, shift: false } as KeyPress

/** What the text field does. */
const controlOf = (parts: FieldParts): PartBinding => ({
  view: {
    accessibilityRole: 'combobox',
    accessibilityState: { disabled: parts.disabled, expanded: parts.open },
    editable: parts.editable,
    onChangeText: parts.edit,
    onFocus: parts.onFocused,
    onKeyPress: (event: { readonly nativeEvent: { readonly key: string } }) => {
      parts.deleting.current = event.nativeEvent.key === 'Backspace'
      const now = parts.latest.current
      if (parts.deleting.current && now.multiple && now.typed === '') {
        now.dropLast()
      }
    },
    onSubmitEditing: () => fieldKey(ENTER, parts.latest.current),
    onTouchEnd: () => {
      parts.onText.current = true
    },
    ref: (node: unknown) => {
      parts.control.current = node as Control
      parts.listening.current?.()
      parts.listening.current =
        node === null
          ? undefined
          : keys().listen(node, (press) => fieldKey(press, parts.latest.current))
    },
    selection: parts.selection,
    submitBehavior: 'submit',
    value: parts.shown,
  },
})

/** What every part but the host takes. */
export const partsOf = (parts: FieldParts): Readonly<Record<string, PartBinding>> => ({
  control: controlOf(parts),
  create: { view: { onPress: parts.create } },
  field: { view: fieldTouches(parts.openPressed, parts.onText) },
  listbox: {
    view: {
      listOwner: parts.listOwner,
      /* The list takes its value from here, whichever way this goes. */
      onBeforeChange: (heard: HelixEvent) => {
        heard.preventDefault()
        parts.choose((heard.detail as { readonly value: string }).value)
      },
      value: parts.value,
    },
  },
  rest: { view: { onPress: parts.toggleExpanded } },
  tag: {
    copy: (item: Copy) => ({
      onDismiss: () => parts.drop(String(item.fields.value)),
    }),
  },
  /* A tag is its own control: a press on one opens nothing. */
  tags: {
    view: {
      onTouchEnd: (event: { readonly stopPropagation?: () => void }) => event.stopPropagation?.(),
    },
  },
})
