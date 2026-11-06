/**
 * The result of classifying a selector, a declaration, or an at-rule.
 *
 * **A classifier returns findings, and a verdict folds them.** Each finding is
 * one construct the item maps to, or one reason it cannot. The item's category
 * is the worst of its findings, so one unreadable condition makes a selector
 * not expressible however much of it the language names.
 */

/** The three categories. `RANK` orders them from best to worst. */
export type Category = 'expressible' | 'not-expressible' | 'web-only'

/** One thing a classifier found in an item. */
export interface Finding {
  /**
   * The category this finding puts its item in.
   */
  readonly category: Category
  /**
   * The construct, for `expressible` and `web-only`, or the reason code, for
   * `not-expressible`.
   */
  readonly name: string
  /**
   * The source fragment the finding is about.
   */
  readonly text: string
}

/** A reason an item is not expressible, and the fragment it is about. */
export interface Reason {
  /**
   * The reason code, such as `property:svg-paint`.
   */
  readonly code: string
  /**
   * The fragment, such as `stroke`.
   */
  readonly text: string
}

/** The folded verdict for one item. */
export interface Verdict {
  /**
   * The worst category among the findings.
   */
  readonly category: Category
  /**
   * The constructs the item maps to, `web:` ones included, sorted and unique.
   */
  readonly constructs: readonly string[]
  /**
   * Why it is not expressible, sorted, empty when it is.
   */
  readonly reasons: readonly Reason[]
}

const RANK: Readonly<Record<Category, number>> = {
  expressible: 0,
  'not-expressible': 2,
  'web-only': 1,
}

/** The worse of two categories. */
export const worse = (first: Category, second: Category): Category =>
  RANK[second] > RANK[first] ? second : first

/** A construct the language names. */
export const named = (name: string, text: string): Finding => ({
  category: 'expressible',
  name,
  text,
})

/** A construct the web keeps and a native view leaves out. */
export const webOnly = (name: string, text: string): Finding => ({
  category: 'web-only',
  name,
  text,
})

/** Something the language cannot say, with a reason code. */
export const missing = (name: string, text: string): Finding => ({
  category: 'not-expressible',
  name,
  text,
})

/** Code-unit order, which no locale changes. */
export const compare = (first: string, second: string): number =>
  first < second ? -1 : first > second ? 1 : 0

const unique = (values: readonly string[]): string[] => [...new Set(values)].sort(compare)

/** A key that sorts reasons by code, then by fragment. */
export const reasonKey = (reason: Reason): string => `${reason.code}\u0000${reason.text}`

/** Folds findings into one verdict. No findings is an expressible item. */
export const verdictOf = (findings: readonly Finding[]): Verdict => {
  const category = findings.reduce<Category>(
    (worst, finding) => worse(worst, finding.category),
    'expressible',
  )
  const constructs = unique(
    findings.filter((finding) => finding.category !== 'not-expressible').map(({ name }) => name),
  )
  const seen = new Map<string, Reason>()
  for (const finding of findings) {
    if (finding.category === 'not-expressible') {
      const reason = { code: finding.name, text: finding.text }
      seen.set(reasonKey(reason), reason)
    }
  }
  const reasons = [...seen.values()].sort((first, second) =>
    compare(reasonKey(first), reasonKey(second)),
  )
  return { category, constructs, reasons }
}
