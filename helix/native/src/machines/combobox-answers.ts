/**
 * How a text field that filters a list takes an answer that is no choice from the
 * list: what was typed, under `allows-custom-value`; a new one, under `creatable`; and
 * nothing, where the reader emptied the field and left.
 */
import type { Entry } from './listbox-model'

/** What the answers read at one draw. */
export interface Answering {
  readonly allowsCustom: boolean
  /** Asks the page before a new answer is added; answers whether it may be. */
  readonly asksCreate: (value: string) => boolean
  readonly clear: () => void
  readonly close: () => void
  readonly created: Set<string>
  readonly creation: string
  readonly editing: boolean
  readonly emptied: { current: boolean }
  readonly entries: readonly Entry[]
  readonly multiple: boolean
  readonly request: (next: string) => boolean
  readonly typed: string
  readonly value: string
  readonly values: readonly string[]
}

/** The value with one answer added, or in place of the one there. */
const withAnswer = (now: Answering, answer: string): string =>
  now.multiple ? [...now.values, answer].join(',') : answer

/** What the field does with an answer that is no choice from the list. */
export const answersOf = (now: Answering) => {
  /** Takes what was typed as the answer: the option its words name, or the text. */
  const commitTyped = (): boolean => {
    const text = now.typed.trim()
    if (!now.allowsCustom || !now.editing || text === '') {
      return false
    }
    const named = now.entries.find((one) => one.text.trim().toLowerCase() === text.toLowerCase())
    const answer = named?.value ?? text
    now.created.add(answer)
    const held = now.multiple ? now.values.includes(answer) : answer === now.value
    if (!held) {
      now.request(withAnswer(now, answer))
    }
    now.clear()
    return true
  }
  return {
    commitEmptied: (): void => {
      if (now.emptied.current && !now.multiple && now.value !== '') {
        now.request('')
      }
      now.emptied.current = false
      commitTyped()
    },
    commitTyped,
    create: (): void => {
      if (now.creation === '' || !now.asksCreate(now.creation)) {
        return
      }
      now.created.add(now.creation)
      if (now.request(withAnswer(now, now.creation))) {
        now.clear()
        if (!now.multiple) {
          now.close()
        }
      }
    },
    drop: (one: string): void => {
      now.request(now.values.filter((each) => each !== one).join(','))
    },
  }
}
