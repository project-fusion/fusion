/**
 * What a screen reader hears of an element's host, as its form's `host`
 * says: a role, and a name, where the web element sets them through
 * `ElementInternals` and draws no part to carry them.
 */
import { isValidElement } from 'react'
import type { Node } from '../style/form'
import { announcedAs, holds, readingOf } from './announced'
import { silent } from './semantics'
import { bound, type Values } from './styles'

/**
 * The words of content passed in, as `textContent` reads them: its words and
 * numbers, and those of the elements it holds, in order.
 */
export const wordsIn = (content: unknown): string => {
  if (typeof content === 'string' || typeof content === 'number') {
    return String(content)
  }
  if (Array.isArray(content)) {
    return content.map(wordsIn).join('')
  }
  if (isValidElement(content)) {
    return wordsIn((content.props as { readonly children?: unknown }).children)
  }
  return ''
}

/**
 * The host's role and its name. **A group with no name has no role**, as
 * the web gives an unnamed stat or stat group none: "group" alone adds a
 * word to what a reader hears and says nothing. A name bound to a region is
 * the words passed into it, as a stat is named by its label.
 */
export const hostSemantics = (values: Values): Readonly<Record<string, unknown>> => {
  const host = values.family.api?.host
  if (host === undefined) {
    return {}
  }
  const said = bound(values, host.label, 'host')
  const label = wordsIn(said).replace(/\s+/g, ' ').trim()
  const node: Node = { attributes: host, kind: 'box', name: 'host' }
  /* A host out of a screen reader's reach, as a skeleton with no name. */
  if (holds(values, node, 'decorative')) {
    return silent
  }
  const announced = announcedAs(values, node)
  const range = rangeOf(values, node)
  if (label === '') {
    return host.role === 'group' ? {} : { ...announced, ...range }
  }
  return { ...announced, accessibilityLabel: label, ...range }
}

/** The roles whose host is one element whose reading is its value: its parts are presentational. */
const RANGED = new Set(['meter', 'progressbar'])

/**
 * **A host that is a range is one element** a screen reader reaches, with its
 * reading as its value, as a meter's and a progress bar's parts are
 * presentational on the web, and **a busy host says so**, as a skeleton does
 * while what it holds loads.
 */
const rangeOf = (values: Values, node: Node): Readonly<Record<string, unknown>> => {
  const role = bound(values, node.attributes?.role, 'host')
  const ranged = typeof role === 'string' && RANGED.has(role)
  const busy = holds(values, node, 'busy')
  return {
    ...(ranged ? { accessible: true, ...readingOf(values, node) } : {}),
    ...(busy ? { accessibilityState: { busy: true } } : {}),
  }
}
