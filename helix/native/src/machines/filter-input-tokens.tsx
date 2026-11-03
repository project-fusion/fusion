/**
 * The tokens a field for filters draws: the page's own, passed into `tags`, and the
 * chips `chips` draws, the first `max-tags` of them, each handed what its remove
 * press asks of the field around, as the web's `helix-dismiss` reaches the field.
 */
import { contentWords, type FacetDetail } from '@fusion.dev/helix-core/filter-text'
import { cloneElement, type ReactElement } from 'react'
import { madeFor } from '../render/made'
import { elementsIn } from './filter-input-fields'
import type { HelixEvent } from './props'

/** An element's props, as a page passed them. */
type Passed = Readonly<Record<string, unknown>>

/** What the field does with a token's request to go, by the token's props. */
export type Dismissed = (token: Passed, heard: HelixEvent) => void

/**
 * The element a field's own handler is told sent a token's request, as a web
 * handler reads it from `event.target`: its props by their attribute names.
 */
export const tokenTarget = (token: Passed): Readonly<Record<string, unknown>> => ({
  getAttribute: (name: string): string | null => {
    const value = token[name.replace(/-([a-z])/gu, (_, letter: string) => letter.toUpperCase())]
    return typeof value === 'string' ? value : null
  },
  ...(typeof token.value === 'string' ? { value: token.value } : {}),
})

/** A request to go with no remove press behind it, as Backspace in an empty field sends. */
export const requestOf = (token: Passed): HelixEvent => {
  let refused = false
  const words = [token.label, token.operatorLabel, contentWords(token.children)]
    .filter((one) => typeof one === 'string' && one !== '')
    .join(' ')
  const target = tokenTarget(token)
  return {
    currentTarget: target,
    get defaultPrevented() {
      return refused
    },
    detail: { label: words },
    preventDefault: () => {
      refused = true
    },
    target,
  }
}

/** The chip `chips` draws for a facet in force. */
const chipFor = (facet: FacetDetail): ReactElement | undefined => {
  const chip = madeFor('helix-filter-chip')
  return chip === undefined ? undefined : (
    <chip.Component
      dismissible
      key={`own-${facet.field}`}
      label={facet.label}
      name={facet.field}
      operator={facet.operator}
      operatorLabel={facet.operatorLabel}
    >
      {facet.values.join(', ')}
    </chip.Component>
  )
}

/** What the tokens come to: those drawn, and how many are left out. */
export interface Tokens {
  readonly drawn: readonly ReactElement[]
  /** The props of the last token drawn, which Backspace asks to go. */
  readonly last: Passed | undefined
  readonly over: number
}

/**
 * The tokens drawn: the page's and the field's own chips, cut at `limit`, each
 * handed `dismissed` in place of its own remove handler, which `dismissed` calls.
 */
export const tokensOf = (
  passed: unknown,
  own: readonly FacetDetail[],
  limit: number,
  dismissed: Dismissed,
): Tokens => {
  const all = [
    ...elementsIn(passed),
    ...own.flatMap((facet) => {
      const chip = chipFor(facet)
      return chip === undefined ? [] : [chip]
    }),
  ] as ReactElement<Passed>[]
  const shown = limit > 0 ? all.slice(0, limit) : all
  return {
    drawn: shown.map((token) =>
      cloneElement(token, {
        onDismiss: (heard: HelixEvent) => dismissed(token.props, heard),
      }),
    ),
    last: shown.at(-1)?.props,
    over: all.length - shown.length,
  }
}
