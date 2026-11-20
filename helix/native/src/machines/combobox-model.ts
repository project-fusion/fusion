/**
 * What a text field that filters a list works out at one draw: what it shows, its
 * tags, the words of its rows, and where the selection stands.
 */
import { locale } from '@fusion.dev/helix-core/capabilities/locale'
import { formatMessage } from '@fusion.dev/helix-core/words'
import { useEffect, useRef } from 'react'
import { Platform } from 'react-native'

/** How far a finger may move and still be a press on the field. */
const SLOP = 10

/** Fills a sentence the page may have written. */
export const says = (template: string, values: Readonly<Record<string, string | number>>): string =>
  formatMessage(template, values, locale().read())

/** Where a touch stands on the screen. */
interface Touched {
  readonly nativeEvent: { readonly pageX: number; readonly pageY: number }
}

/** The touches on the field: a press anywhere but the tags opens the list. */
export const fieldTouches = (press: (onText: boolean) => void, onText: { current: boolean }) => {
  const start = { x: 0, y: 0 }
  return {
    onTouchEnd: ({ nativeEvent: { pageX, pageY } }: Touched) => {
      if (Math.abs(pageX - start.x) < SLOP && Math.abs(pageY - start.y) < SLOP) {
        press(onText.current)
      }
      onText.current = false
    },
    onTouchStart: ({ nativeEvent: { pageX, pageY } }: Touched) => {
      start.x = pageX
      start.y = pageY
    },
  }
}

/** One chosen option. */
export interface ChosenOption {
  readonly text: string
  readonly value: string
}

/** The options that take a tag, what is over the limit, and what its count says. */
export const tagsOf = (
  chosen: readonly ChosenOption[],
  limit: number,
  dismissible: boolean,
  removeLabel: string,
) => {
  const tagged = limit > 0 ? chosen.slice(0, limit) : chosen
  return {
    over: chosen.length - tagged.length,
    tags: tagged.map((one) => ({
      at: 0,
      dismissible,
      dismissLabel: says(removeLabel, { name: one.text }),
      header: false,
      key: one.value,
      value: one.value,
      words: one.text,
    })),
  }
}

/** The words of the create row. A sentence without `{value}` is followed by it in quotes. */
export const createWordsOf = (label: string, creation: string): string =>
  label.includes('{value}') ? says(label, { value: creation }) : `${label} "${creation}"`

/** The selection a phone's field holds: a completion, or the chosen words as the list opens. */
export const selectionOf = (
  typedLength: number,
  suggestion: string,
  selectsAll: boolean,
  shown: string,
): { readonly end: number; readonly start: number } | undefined => {
  if (suggestion !== '') {
    return { end: suggestion.length, start: typedLength }
  }
  return selectsAll ? { end: shown.length, start: 0 } : undefined
}

/** What the live region reads of the list. */
interface Telling {
  readonly active: string
  readonly chosen: readonly string[]
  readonly count: number
  readonly open: boolean
  readonly resultsLabel: string
  readonly selectedLabel: string
  readonly setStatus: (next: string) => void
  readonly wordsOf: (value: string) => string
}

/** What one option says: its words, and `selected` where it is chosen. */
const heardOf = (now: Telling): string => {
  const name = now.wordsOf(now.active)
  return now.chosen.includes(now.active) ? says(now.selectedLabel, { name }) : name
}

/** Says the highlight and the count on iOS, where VoiceOver reads neither under a text field. */
export const useSayingHighlight = (now: Telling): void => {
  const said = useRef<string | undefined>(undefined)
  const counted = useRef(false)
  useEffect(() => {
    if (!now.open) {
      said.current = undefined
      counted.current = false
    } else if (Platform.OS === 'ios' && now.active !== said.current) {
      const opening = counted.current ? '' : says(now.resultsLabel, { count: now.count })
      said.current = now.active
      counted.current = now.active !== ''
      now.setStatus([opening, heardOf(now)].filter(Boolean).join('. '))
    }
  })
}

/** What a choice said, for VoiceOver, which is silent as an option's state changes. */
export const choiceSaid = (
  before: readonly string[],
  after: readonly string[],
  multiple: boolean,
  wordsOf: (value: string) => string,
  selectedLabel: string,
): string => {
  const taken = multiple ? after.find((one) => !before.includes(one)) : after[0]
  const name = wordsOf(taken ?? before.find((one) => !after.includes(one)) ?? '')
  return taken === undefined ? name : says(selectedLabel, { name })
}
