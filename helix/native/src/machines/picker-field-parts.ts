/**
 * What each part of a picker field does on a phone: the text, the trigger, the
 * clear, the count of tags past the cap, each tag, and the picker in the
 * panel, with what the tree reads of them.
 */

import { focus } from '@fusion.dev/helix-core/capabilities/focus'
import {
  committedValue,
  draftKey,
  pickedValues,
  shownValues,
  typedValue,
  withoutValue,
} from '@fusion.dev/helix-core/picker-text'
import type { PartBinding } from '../render/behavior'
import type { Entry } from '../render/entry'
import { wordsIn } from './date-picker-read'
import { type FieldKind, type Read, sayIn } from './picker-field-kind'
import type { HelixEvent } from './props'

/** What moves the field. */
export interface Moves {
  readonly clear: () => void
  readonly close: () => void
  readonly open: (from: 'text' | 'trigger') => void
  /** A value picked in the panel, or a tag taken away, which says `change` as it stands. */
  readonly picked: (next: string) => boolean
  readonly request: (next: string) => boolean
  readonly setDraft: (draft: string) => void
  readonly setEditing: (editing: boolean) => void
  readonly settle: () => void
  readonly toggleExpanded: () => void
}

/** What the field holds across draws: its text's view, a press under way, and the value as focus came in. */
export interface FieldHeld {
  readonly control: { current: Control | null }
  readonly entered: { current: string }
  readonly pressing: { current: boolean }
  /* Whether the field is handing focus back to its text itself, which is no edit. */
  readonly returning: { current: boolean }
}

/** What the parts read at one draw. */
export interface FieldNow {
  readonly held: FieldHeld
  readonly disabled: boolean
  readonly display: string
  readonly draft: string
  readonly editable: boolean
  readonly expanded: boolean
  readonly flag: (name: string) => string
  readonly kind: FieldKind
  readonly moves: Moves
  readonly open: boolean
  readonly read: Read
  readonly segmented: boolean
  readonly value: string
}

/** A text field's view, which focus goes back to. */
export interface Control {
  readonly focus?: () => void
}

/** What the text does: it holds the value while edited, and reads what was written as it is left. */
const controlOf = (now: FieldNow): PartBinding => {
  const { held, kind, moves } = now
  const { control, entered, pressing, returning } = held
  const several = kind.mode === 'multiple'
  const key = (name: string) => {
    const answer = draftKey(
      name,
      { draft: now.draft, sorts: kind.sorts, value: now.value },
      kind.text,
    )
    if (answer?.cleared === true) {
      moves.setDraft('')
    }
    if (answer?.value !== undefined) {
      moves.picked(answer.value)
    }
  }
  return {
    view: {
      accessibilityState: { disabled: now.disabled, expanded: now.open },
      editable: now.editable,
      onBlur: () => {
        moves.setEditing(false)
        if (!several) {
          const read = committedValue(kind.committed(now.value), kind.text)
          if (read !== undefined) {
            moves.request(read)
          }
        }
        if (entered.current !== now.value) {
          moves.settle()
        }
      },
      onChangeText: (text: string) => {
        moves.setEditing(true)
        if (several) {
          moves.setDraft(text)
        } else {
          moves.request(typedValue(text, kind.text))
        }
      },
      onFocus: () => {
        /* Picking hands focus back to the text, which then shows what was picked, written. */
        moves.setEditing(!returning.current)
        returning.current = false
        entered.current = now.value
        if (pressing.current && !now.open) {
          moves.open('text')
        }
        pressing.current = false
      },
      onKeyPress: (event: { readonly nativeEvent: { readonly key: string } }) => {
        if (several && event.nativeEvent.key === 'Backspace' && now.draft === '') {
          key('Backspace')
        }
      },
      onPressIn: () => {
        pressing.current = true
      },
      onSubmitEditing: () => {
        if (several) {
          key('Enter')
        }
      },
      ref: (node: Control | null) => {
        control.current = node
      },
      submitBehavior: several ? 'submit' : 'blurAndSubmit',
      value: now.display,
    },
  }
}

/** The tags of several, the count past the cap, and what the count says and does. */
const tagStates = (now: FieldNow) => {
  const say = sayIn(now.read, now.kind.lang)
  const expandable = now.read('expandable') === true
  const limit = now.expanded ? 0 : Number(now.read('max-tags') ?? 0)
  const { rest, shown } = shownValues(now.kind.mode === 'multiple' ? now.value : '', limit)
  const tags = shown.map((one) => {
    const words = now.kind.text.written(one)
    return {
      dismissible: now.editable,
      dismissLabel: say('remove-label', { name: words }),
      key: one,
      value: one,
      words,
    }
  })
  return {
    lists: { [now.flag('tags')]: tags },
    states: {
      [now.flag('restLabel')]: wordsIn(now.read(now.expanded ? 'collapse-label' : 'expand-label')),
      [now.flag('restPress')]: expandable && (rest > 0 || now.expanded),
      [now.flag('restShown')]: !expandable && rest > 0,
      [now.flag('restWords')]: now.expanded ? '' : say('rest-text', { count: rest }),
      [now.flag('tagsShown')]: tags.length > 0,
    },
  }
}

/** Every part's binding, and what the tree reads. */
export const fieldParts = (now: FieldNow) => {
  const { kind, moves } = now
  /* Through the focus capability, which a page and a test both see move. */
  const focusText = () =>
    requestAnimationFrame(() => {
      const control = now.held.control.current
      if (control !== null) {
        now.held.returning.current = true
        focus().focus(control, false)
      }
    })
  const several = kind.mode === 'multiple'
  const tagged = tagStates(now)
  const tagPart = kind.segmented === 'date' ? 'date' : 'time'
  const binding: Record<string, PartBinding> = {
    clear: {
      view: {
        onPress: () => {
          moves.clear()
          focusText()
        },
      },
    },
    control: controlOf(now),
    picker: {
      view: {
        /* The picker takes its value from here, and a refusal here is one there. */
        onBeforeChange: (heard: HelixEvent<{ value?: string }>) => {
          if (!moves.picked(String(heard.detail.value ?? ''))) {
            heard.preventDefault()
            return
          }
          if (kind.mode === 'single') {
            moves.close()
            focusText()
          }
        },
        value: pickedValues(now.value, kind.text),
      },
    },
    rest: { view: { onPress: moves.toggleExpanded } },
    [tagPart]: {
      copy: (item: Entry) => ({
        onDismiss: () => moves.picked(withoutValue(now.value, String(item.fields.value))),
      }),
    },
    trigger: {
      view: {
        accessibilityState: { disabled: now.disabled, expanded: now.open },
        onPress: () => (now.open ? moves.close() : moves.open('trigger')),
      },
    },
  }
  const placeholder = wordsIn(now.read('placeholder'))
  return {
    binding,
    lists: tagged.lists,
    states: {
      ...tagged.states,
      [now.flag('clearShown')]: now.read('clearable') === true && now.value !== '' && now.editable,
      [now.flag('fieldPlaceholder')]: several && now.value !== '' ? '' : placeholder,
    },
  }
}
