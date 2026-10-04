/**
 * Every stylesheet rule the page will actually apply, and an honest account of
 * the ones that could not be read.
 *
 * **`document.styleSheets` is not the input.** Component CSS lives in adopted
 * stylesheets inside shadow roots, which appear in that list nowhere at all, so
 * a collector reading only it would report clean while blind to the half of the
 * page it exists to check. Four sources are walked: the document's sheets, the
 * document's adopted sheets, and both of those again for every shadow root
 * reachable from the document.
 *
 * **Cross-origin sheets throw rather than return nothing**, which is the one
 * failure mode that has to be caught rather than avoided: `.cssRules` on a sheet
 * from another origin raises `SecurityError`, and a `try` around the access is
 * the only way to know. Each one becomes a `Coverage.unreadable` entry, so the
 * hole is in the output rather than in the reader's assumptions.
 */
import type { Coverage, Unreadable } from './report.js'

/** One rule, with where it came from. */
export interface Located {
  index: number
  rule: CSSStyleRule
  /**
   * Where the rule's selector matches: the document for a page's own sheet,
   * and the shadow root of the first host to adopt it for a component's.
   */
  scope?: Document | ShadowRoot | undefined
  sheet: string
}

/**
 * Every custom property a tag's own shadow styles read, by tag.
 *
 * **This is what the manifest cannot tell you.** `helix-copy-button` declares no
 * hooks at all and answers `--icon-button-size` and `--icon-button-radius`,
 * because its class sets `styles = [HelixIconButton.styles, styles].flat()`:
 * it borrows another component's stylesheet outright. That is not inheritance,
 * not a mixin and not a part, so no manifest field describes it and `cem` records
 * nothing. Two correct declarations in this repository's own `landing.module.css`
 * were called dead on the strength of that silence.
 *
 * A `var(--x)` inside the element's own shadow styles is direct evidence that
 * the element reads the property, which is a stronger claim than the manifest
 * makes and is available only to something running in the page. So it is
 * collected on the way past and the manifest is treated as a floor rather than
 * the whole truth.
 */
export type Answered = Map<string, Set<string>>

/**
 * The rules outside Helix's components that read each custom property with
 * `var()`, by selector and the root they apply in. An element one of them
 * matches answers the property as surely as a Helix tag does: Helix's own
 * base sheet reads every button hook for a plain `[data-button]` link, and an
 * example reads `--chart-series-1` in its own `::part()` rules.
 */
export type Readers = Map<
  string,
  Array<{ scope: Document | ShadowRoot | undefined; selector: string }>
>

/**
 * A sheet with no `href` still needs a name a reader can act on.
 *
 * **The ordinal is load-bearing, not decoration.** A Lit element adopts several
 * sheets, its own and every base class's, and all of them are "adopted by
 * `<helix-button>`": without a number, a finding's receipt names a place that
 * matches three sheets and the reader has to guess which. Counted per label so
 * the first of a kind is unnumbered and reads naturally.
 */
const name = (sheet: CSSStyleSheet, seen: Map<string, number>, host?: Element): string => {
  if (sheet.href) {
    return sheet.href
  }
  const base = host
    ? `adopted by <${host.localName}>`
    : sheet.ownerNode instanceof globalThis.Element
      ? `<${sheet.ownerNode.localName}> in the document`
      : 'adopted by the document'
  const count = (seen.get(base) ?? 0) + 1
  seen.set(base, count)
  return count === 1 ? base : `${base} (${count})`
}

/**
 * The rules of one sheet, flattened through `@media` and `@supports`.
 *
 * A dead `::part()` inside a media query is dead at that width, which is still
 * dead. Grouping rules are descended into rather than skipped, and `@import` is
 * followed through `styleSheet` because an imported sheet is a sheet.
 */
const rules = (
  list: CSSRuleList,
  sheet: string,
  into: Located[],
  depth = 0,
  reads?: Set<string>,
): void => {
  if (depth > 8) {
    return
  }
  for (let index = 0; index < list.length; index += 1) {
    /* Indexed rather than `list.item(index)`. Both are standard and only one is
       universally implemented: happy-dom's `CSSRuleList` is array-like with no
       `item`, so a collector calling it throws under the DOM the specs run in
       and works in a browser, which is the worst of both. */
    const rule = list[index]
    if (!rule) {
      continue
    }
    if ('selectorText' in rule) {
      into.push({ index, rule: rule as CSSStyleRule, sheet })
      if (reads) {
        /* `\w`, so a private `--_button-fill` is read as a name: Helix's own
           sheets set and read dozens of them. */
        for (const match of (rule.cssText ?? '').matchAll(/var\(\s*(--[\w-]+)/g)) {
          if (match[1]) {
            reads.add(match[1])
          }
        }
      }
      /* A nested rule is a rule. CSS nesting puts `&::part(x)` inside the rule
         for the host, and the part name is just as wrong there. */
      const nested = (rule as CSSStyleRule).cssRules
      if (nested) {
        rules(nested, sheet, into, depth + 1, reads)
      }
      continue
    }
    const grouped = (rule as CSSGroupingRule).cssRules
    if (grouped) {
      rules(grouped, sheet, into, depth + 1, reads)
      continue
    }
    const imported = (rule as CSSImportRule).styleSheet
    if (imported) {
      read(imported, into, [], new Map(), depth + 1, undefined, reads)
    }
  }
}

/** One sheet, or the reason it could not be read. */
const read = (
  sheet: CSSStyleSheet,
  into: Located[],
  unreadable: Unreadable[],
  labels: Map<string, number>,
  depth = 0,
  host?: Element,
  reads?: Set<string>,
): boolean => {
  const label = name(sheet, labels, host)
  let list: CSSRuleList
  try {
    /* Reading the property is what throws, so it is read before anything else
       is done with it. `cssRules` on a cross-origin sheet raises SecurityError,
       and there is no flag to ask instead. */
    list = sheet.cssRules
  } catch (error) {
    unreadable.push({
      reason:
        error instanceof DOMException && error.name === 'SecurityError' ? 'cross-origin' : 'threw',
      sheet: label,
    })
    return false
  }
  rules(list, label, into, depth, reads)
  return true
}

/**
 * Every shadow root reachable from a node, depth first.
 *
 * **`querySelectorAll('*')` does not cross a shadow boundary**, so this recurses
 * per root rather than querying once. A closed root is invisible here and is
 * counted nowhere, which is the correct silence: the collector cannot know it
 * exists, and inventing a number for what it cannot see is the dishonesty the
 * coverage field is there to prevent. Every Helix root is open.
 */
const roots = (from: ParentNode, found: ShadowRoot[], depth = 0): void => {
  if (depth > 32) {
    return
  }
  for (const element of from.querySelectorAll('*')) {
    const root = element.shadowRoot
    if (root) {
      found.push(root)
      roots(root, found, depth + 1)
    }
  }
}

/**
 * Every readable rule in the page, and what was missed getting them.
 *
 * **Sheets are counted by identity, and the reason is Lit.** A Lit class holds
 * one `CSSStyleSheet` and every instance of it adopts that same object, so a
 * page with two hundred Helix elements presents the same twenty sheets over and
 * over. Counted naively that is `sheets: 400`, a coverage denominator that
 * describes the page's element count rather than its stylesheets, and four
 * hundred passes over rules already read. A `Set` keyed on the sheet object
 * fixes the number and the cost together.
 */
export const collect = (
  from: Document = document,
): {
  answered: Answered
  coverage: Coverage
  readers: Readers
  rules: Located[]
  used: Set<string>
} => {
  const located: Located[] = []
  const unreadable: Unreadable[] = []
  const seen = new Set<CSSStyleSheet>()
  const labels = new Map<string, number>()
  const answered: Answered = new Map()
  /* Every custom property any sheet reads with `var()`, so a property the
     page sets and reads itself is known to be its own. */
  const used = new Set<string>()
  const readers: Readers = new Map()
  let readable = 0

  const take = (sheet: CSSStyleSheet | null | undefined, host?: Element): void => {
    if (!sheet || seen.has(sheet)) {
      return
    }
    seen.add(sheet)
    let reads = used
    if (host) {
      reads = answered.get(host.localName) ?? new Set<string>()
      answered.set(host.localName, reads)
    }
    const before = located.length
    if (read(sheet, located, unreadable, labels, 0, host, reads)) {
      readable += 1
    }
    const scope = host ? (host.shadowRoot ?? undefined) : from
    const ours = !host?.localName.startsWith('helix-')
    for (let at = before; at < located.length; at += 1) {
      const one = located[at] as Located
      one.scope = scope
      if (ours && one.rule.selectorText) {
        for (const match of (one.rule.cssText ?? '').matchAll(/var\(\s*(--[\w-]+)/g)) {
          const property = match[1] as string
          readers.set(property, [
            ...(readers.get(property) ?? []),
            { scope, selector: one.rule.selectorText },
          ])
        }
      }
    }
  }

  for (const sheet of Array.from(from.styleSheets)) {
    take(sheet)
  }
  for (const sheet of from.adoptedStyleSheets ?? []) {
    take(sheet)
  }

  const shadows: ShadowRoot[] = []
  roots(from, shadows)
  for (const root of shadows) {
    for (const sheet of Array.from(root.styleSheets ?? [])) {
      take(sheet, root.host)
    }
    for (const sheet of root.adoptedStyleSheets ?? []) {
      take(sheet, root.host)
    }
    /* `ShadowRoot.styleSheets` covers a `<style>` inside the root in a browser
       and is absent from happy-dom entirely, so the elements are asked
       directly as well. Identity dedup is what makes asking twice free, and
       without this path every spec covering a root's own `<style>` would be a
       spec that cannot fail. */
    for (const owner of root.querySelectorAll('style, link')) {
      take((owner as HTMLStyleElement | HTMLLinkElement).sheet, root.host)
    }
  }

  /* **The page's reads, and a Helix component's apart.** A page's own
     components, a non-Helix shadow root, read for the page; what a Helix
     component reads is `answered`, and folding it in here would excuse a
     hook set on the wrong element because some other component reads it. */
  for (const [tag, reads] of answered) {
    if (!tag.startsWith('helix-')) {
      for (const property of reads) {
        used.add(property)
      }
    }
  }
  return {
    answered,
    coverage: { read: readable, roots: shadows.length, sheets: seen.size, unreadable },
    readers,
    rules: located,
    used,
  }
}
