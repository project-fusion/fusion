/**
 * The suggestions a field for filters offers: the options passed into
 * `suggestions`, narrowed to the term at the caret under `filter-suggestions`, or
 * those a `source` gives, asked for as the text changes.
 */
import {
  contentWords,
  currentField,
  currentTerm,
  type FilterSource,
  type FilterSuggestion,
  suggests,
} from '@fusion.dev/helix-core/filter-text'
import { type ReactElement, useEffect, useRef, useState } from 'react'
import { madeFor } from '../render/made'
import { says } from './combobox-model'
import { elementsIn, isMade } from './filter-input-fields'

/** An element's props, as a page passed them. */
type Passed = Readonly<Record<string, unknown>>

/** The options passed in, those in a group among them. */
const optionsIn = (content: unknown): ReactElement<Passed>[] =>
  elementsIn(content).flatMap((one): ReactElement<Passed>[] =>
    isMade(one, 'helix-option')
      ? [one]
      : elementsIn((one as ReactElement<Passed>).props.children).filter((inner) =>
          isMade(inner, 'helix-option'),
        ),
  )

/** How many options there are, and how many the term leaves to choose from. */
export const countOptions = (
  content: unknown,
  term: string,
): { readonly all: number; readonly shown: number } => {
  const options = optionsIn(content)
  const shown = options.filter(
    (one) => one.props.disabled !== true && suggests(contentWords(one.props.children), term),
  )
  return { all: options.length, shown: shown.length }
}

/** A suggestion from a source, as a value and the words a reader sees. */
const plainOf = (one: FilterSuggestion): { readonly label: string; readonly value: string } =>
  typeof one === 'string'
    ? { label: one, value: one }
    : { label: one.label ?? one.value, value: one.value }

/** The options a source's suggestions are drawn as. */
export const sourcedOptions = (sourced: readonly FilterSuggestion[]): ReactElement[] => {
  const option = madeFor('helix-option')
  return option === undefined
    ? []
    : sourced.map(plainOf).map((one) => (
        <option.Component key={one.value} value={one.value}>
          {one.label}
        </option.Component>
      ))
}

/** What a source gave, and whether a request to it is still out. */
export interface Sourced {
  readonly fetching: boolean
  readonly suggestions: readonly FilterSuggestion[]
  readonly values: ReadonlySet<string>
}

/**
 * Asks `source` for suggestions as the text or the caret moves, once typing has
 * rested `delay` milliseconds, and aborts a request still out.
 */
export const useSource = (source: unknown, text: string, caret: number, delay: number): Sourced => {
  const [suggestions, setSuggestions] = useState<readonly FilterSuggestion[]>([])
  const [fetching, setFetching] = useState(false)
  const request = useRef<AbortController | undefined>(undefined)
  useEffect(() => {
    if (typeof source !== 'function') {
      return undefined
    }
    const ask = (): void => {
      request.current?.abort()
      const controller = new AbortController()
      request.current = controller
      const given = (source as FilterSource)({
        field: currentField(text, caret),
        signal: controller.signal,
        term: currentTerm(text, caret),
        text,
      })
      setFetching(true)
      void Promise.resolve(given)
        .then((answer) => {
          if (!controller.signal.aborted) {
            setSuggestions(answer ?? [])
          }
        })
        .catch(() => undefined)
        .finally(() => {
          if (!controller.signal.aborted) {
            setFetching(false)
          }
        })
    }
    const timer = delay > 0 ? setTimeout(ask, delay) : undefined
    if (timer === undefined) {
      ask()
    }
    return () => {
      if (timer !== undefined) {
        clearTimeout(timer)
      }
    }
  }, [caret, delay, source, text])
  useEffect(() => () => request.current?.abort(), [])
  return {
    fetching: typeof source === 'function' && fetching,
    suggestions,
    values: new Set(suggestions.map((one) => plainOf(one).value)),
  }
}

/** What a reader hears of the open panel: loading, nothing found, or how many. */
export const statusOf = (now: {
  readonly busy: boolean
  readonly count: number
  readonly noResultsText: string
  readonly loadingText: string
  readonly one: string
  readonly open: boolean
  readonly other: string
}): string => {
  if (!now.open) {
    return ''
  }
  if (now.busy) {
    return now.loadingText
  }
  if (now.count === 0 && now.noResultsText !== '') {
    return now.noResultsText
  }
  return says(now.count === 1 && now.one !== '' ? now.one : now.other, { count: now.count })
}
