/**
 * Breadcrumbs' derivations: the words that name a trail's fold, in the
 * reader's language, and the crumbs it folded, as rows of the menu the fold
 * opens, as the web elements work them out.
 */
import { formatMessage } from '../../words/message.js'
import type { Derivation, DerivationProps, Entry } from '../derivations/derivations.js'
import { wordIn } from '../drilldown/drilldown-derivations.js'
import { textOf } from '../number-format/props.js'

/** The tag a trail's words are registered under. */
const TAG = 'helix-breadcrumbs'

/** The English that names a trail's fold, `{count}` the crumbs it folded. */
export const BREADCRUMBS_EXPAND = 'Show {count} more'

/** The words of what is passed into an element, as its text. */
const wordsOf = (content: unknown): string => {
  if (content === null || content === undefined || typeof content === 'boolean') {
    return ''
  }
  if (typeof content === 'string' || typeof content === 'number') {
    return String(content)
  }
  if (Array.isArray(content)) {
    return content.map(wordsOf).join('')
  }
  const props = (content as { props?: { children?: unknown } }).props
  return props === undefined ? '' : wordsOf(props.children)
}

/**
 * A folded crumb's link and words, keyed by its place: an element passed in,
 * or what the web's trail writes.
 */
export const foldedCrumb = (crumb: unknown, at: number): Entry => {
  const own = (crumb as { props?: DerivationProps }).props ?? (crumb as DerivationProps)
  const label = typeof own.label === 'string' ? own.label : wordsOf(own.children)
  return { at: String(at), href: textOf(own.href), label: label.trim() }
}

/**
 * `breadcrumb-fold-name`: what names a trail's fold on its first crumb,
 * `expand-label`, handed down as `fold-label`, or the words registered for
 * it, with `{count}` the crumbs folded, in the reader's language.
 */
export const breadcrumbFoldName: Derivation = (props) => {
  const words = wordIn(props, TAG, 'fold-label', 'expandLabel', BREADCRUMBS_EXPAND)
  const count = Number(props.fold ?? 0)
  return formatMessage(words, { count }, textOf(props.locale) || 'en')
}

/** `breadcrumb-fold-emphasis`: the fold's button's emphasis, `ghost`, as a crumb's split control draws one. */
export const breadcrumbFoldEmphasis: Derivation = () => 'ghost'

/** `breadcrumb-fold-mark`: the icon the fold's button draws, three dots. */
export const breadcrumbFoldMark: Derivation = () => 'dots-three'
