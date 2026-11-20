/**
 * Values a native view resolves from what the reader's device says: the
 * locale's quotation marks, and the private values an element computes from
 * its props.
 */

import * as derivations from '@fusion.dev/helix-core/derivations'
import type { QuoteMark } from '../ir.generated.js'

/**
 * Each language's quotation marks, from CLDR's delimiters: the outer pair,
 * then the inner pair.
 */
const MARKS: Readonly<Record<string, readonly [string, string, string, string]>> = {
  cs: ['„', '“', '‚', '‘'],
  da: ['“', '”', '‘', '’'],
  de: ['„', '“', '‚', '‘'],
  en: ['“', '”', '‘', '’'],
  es: ['«', '»', '“', '”'],
  fi: ['”', '”', '’', '’'],
  fr: ['«', '»', '«', '»'],
  it: ['«', '»', '“', '”'],
  ja: ['「', '」', '『', '』'],
  ko: ['“', '”', '‘', '’'],
  nb: ['«', '»', '‘', '’'],
  nl: ['‘', '’', '“', '”'],
  pl: ['„', '”', '«', '»'],
  pt: ['“', '”', '‘', '’'],
  'pt-PT': ['«', '»', '“', '”'],
  ru: ['«', '»', '„', '“'],
  sv: ['”', '”', '’', '’'],
  uk: ['«', '»', '„', '“'],
  zh: ['“', '”', '‘', '’'],
  'zh-Hant': ['「', '」', '『', '』'],
}

/** The marks of `locale`: its region's where they differ, then its language's, then English's. */
const marksOf = (locale: string | undefined) => {
  const [language = 'en', ...rest] = (locale ?? 'en').split(/[-_]/)
  const traditional = rest.some((subtag) => ['Hant', 'HK', 'MO', 'TW'].includes(subtag))
  return (
    MARKS[`${language}-${rest[0] ?? ''}`] ??
    (traditional ? MARKS[`${language}-Hant`] : undefined) ??
    MARKS[language] ??
    MARKS.en
  )
}

/**
 * The quotation mark `mark` draws in `locale`, `depth` quotations deep: the
 * outer pair at 0, and the inner pair deeper, as CSS's `quotes: auto` does.
 * A `no-` mark draws nothing.
 */
export const quotationMark = (mark: QuoteMark, locale?: string, depth = 0): string => {
  if (mark === 'no-close' || mark === 'no-open') {
    return ''
  }
  const [open, close, innerOpen, innerClose] = marksOf(locale) ?? ['“', '”', '‘', '’']
  const inner = depth > 0
  if (mark === 'open') {
    return inner ? innerOpen : open
  }
  return inner ? innerClose : close
}

/** A derivation from core, as this runtime calls it: words, or whether something holds. */
type Derivation = (props: Readonly<Record<string, unknown>>) => boolean | string | undefined

/**
 * What core's derivation `name` computes from `props`: words, whether
 * something holds, or `undefined` where core has no derivation by that name
 * or the props ask for none.
 *
 * **`helix system` refuses a name core does not export**, so a missing one
 * means this runtime and the form came from different versions of core.
 */
export const compute = (
  name: string,
  props: Readonly<Record<string, unknown>>,
): boolean | string | undefined => {
  const derivation = (derivations as Readonly<Record<string, unknown>>)[name]
  /* A list derivation's list is a repeat's alone, and no value here. */
  const computed: unknown =
    typeof derivation === 'function' ? (derivation as Derivation)(props) : undefined
  return typeof computed === 'boolean' || typeof computed === 'string' ? computed : undefined
}

/**
 * The words core's derivation `name` computes from `props`, as a style's
 * value or a node's words, or `undefined` where it gives none.
 */
export const derive = (
  name: string,
  props: Readonly<Record<string, unknown>>,
): string | undefined => {
  const computed = compute(name, props)
  return typeof computed === 'string' ? computed : undefined
}

/**
 * What core's derivation `name` computes from the props `names`, each read
 * by `read` under the web's name for it, as a key's chord from its `keys`.
 */
export const deriveFrom = (
  name: string,
  names: readonly string[],
  read: (name: string) => unknown,
): string | undefined => derive(name, Object.fromEntries(names.map((one) => [one, read(one)])))
