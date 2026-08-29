/**
 * The faults, derived from the rules and the manifest and nothing else.
 *
 * **Every rule here is set membership against the manifest, never a naming
 * pattern**, and that is the design decision the whole file turns on. The
 * obvious rule for a misnamed hook is "a `--<family>-*` property whose family
 * does not match the element it is set on", and in this library that rule is
 * wrong 27 times: `helix-breadcrumb` answers `--breadcrumbs-*` because the
 * family is plural, and every chart shares a `--chart-*` namespace across nine
 * tags. A pattern rule would open with 27 false findings in the library's own
 * repository, and `#238` is the row that says what that costs: a check that
 * cries wolf trains its only reader to ignore it.
 *
 * **Scope comes from the selector rather than the name.** A property is only
 * examined when the rule it sits in targets a Helix tag, which is what keeps a
 * consumer's own `--my-app-gap` out of the findings without a list of
 * exemptions, and what lets a finding say which tag it is wrong for.
 */
import type { Answered, Located } from './collect.js'
import { nearest, type Published } from './manifest.js'
import type { Finding, Origin } from './report.js'

/** Every `helix-*` tag a selector mentions, in source order. */
const targets = (selector: string): string[] => {
  const found = new Set<string>()
  for (const match of selector.matchAll(/\bhelix-[a-z0-9]+(?:-[a-z0-9]+)*/g)) {
    found.add(match[0])
  }
  return [...found]
}

/** Every `::part(a b)` in a selector, with the tag it hangs off. */
const parts = (selector: string): Array<{ names: string[]; tag: string }> => {
  const found: Array<{ names: string[]; tag: string }> = []
  for (const match of selector.matchAll(
    /(helix-[a-z0-9-]+)((?:[^\s>+~,]*))::part\(\s*([^)]*?)\s*\)/g,
  )) {
    const names = (match[3] ?? '').split(/\s+/).filter(Boolean)
    if (match[1] && names.length > 0) {
      found.push({ names, tag: match[1] })
    }
  }
  return found
}

/**
 * Whether any of `wanted` sits inside `host`, shadow roots included.
 *
 * **This is the check a static tool cannot make, and skipping it is a three
 * percent false-positive rate.** Measured on this repository: `landing.module.css`
 * sets `--icon-button-radius` and `--icon-button-size` on `helix-copy-button`,
 * which answers neither, and both work, because a copy button *renders* an icon
 * button and custom properties inherit through a shadow boundary. A rule that
 * reads the manifest alone calls those two dead. Six findings out of 197
 * declarations examined, every one wrong, in the library's own repository.
 *
 * A collector running in the page can simply look. That is the whole argument
 * for the collector being in the page rather than in a linter.
 */
const reaches = (host: Element, wanted: Set<string>, depth = 0): boolean => {
  if (depth > 16) {
    return false
  }
  for (const node of [host, ...host.querySelectorAll('*')]) {
    if (node !== host && wanted.has(node.localName)) {
      return true
    }
    const root = node.shadowRoot
    if (root) {
      for (const child of root.children) {
        if (wanted.has(child.localName) || reaches(child, wanted, depth + 1)) {
          return true
        }
      }
    }
  }
  return false
}

const origin = (located: Located): Origin => ({
  cssText: located.rule.cssText,
  index: located.index,
  sheet: located.sheet,
})

/**
 * The findings in one page's rules.
 *
 * `tiers` is the tier names in the order they were passed, which is how an
 * unforwarded part is phrased: the part exists, another tier publishes it, and
 * the one being styled did not forward it.
 */
export const analyze = (
  rules: Located[],
  tags: Map<string, Published>,
  from?: Document,
  answered: Answered = new Map(),
): Finding[] => {
  const findings: Finding[] = []

  for (const located of rules) {
    const selector = located.rule.selectorText
    if (!selector?.includes('helix-')) {
      continue
    }

    for (const { names, tag } of parts(selector)) {
      const element = tags.get(tag)
      if (!element) {
        findings.push({
          kind: 'unknown-tag',
          message: `\`${tag}\` is in no manifest passed to the collector. Either the tag is misspelled, or the manifest is from a different version of Helix than the page.`,
          origin: origin(located),
          subject: tag,
        })
        continue
      }
      for (const part of names) {
        const publishers = element.parts.get(part)
        if (publishers) {
          continue
        }
        /* A part the *other* tier publishes is not a typo, it is a part that
           was never forwarded, and the two need different sentences: one is
           the author's mistake and the other is ours. */
        const elsewhere = [...tags].find(([other, entry]) => other !== tag && entry.parts.has(part))
        if (elsewhere) {
          findings.push({
            expected: part,
            kind: 'unforwarded-part',
            message: `\`${tag}\` does not publish \`${part}\`, though \`${elsewhere[0]}\` does. The rule matches nothing until the part is forwarded, which is a gap in Helix rather than in this CSS.`,
            origin: origin(located),
            subject: `${tag}::part(${part})`,
          })
          continue
        }
        const suggestion = nearest(part, element.parts.keys())
        findings.push({
          expected: suggestion,
          kind: 'dead-part',
          message: suggestion
            ? `\`${tag}\` publishes no part named \`${part}\`. The closest it does publish is \`${suggestion}\`.`
            : `\`${tag}\` publishes no part named \`${part}\`, so this rule matches nothing. Published: ${[...element.parts.keys()].sort().join(', ') || 'none'}.`,
          origin: origin(located),
          subject: `${tag}::part(${part})`,
        })
      }
    }

    /* A property set on a selector naming several Helix tags is wrong only if
       it is unknown to all of them: `helix-button, helix-link { --gap: 0 }` is
       fine when either answers it. */
    const mentioned = targets(selector).map((tag) => [tag, tags.get(tag)] as const)
    const known = mentioned.filter(([, element]) => element)
    if (known.length === 0) {
      continue
    }
    for (const property of Array.from(located.rule.style ?? [])) {
      if (!property.startsWith('--')) {
        continue
      }
      if (known.some(([, element]) => element?.hooks.has(property))) {
        continue
      }
      /* The manifest is a floor, not the whole truth. A tag whose own shadow
         styles read the property answers it whatever `cem` recorded, which is
         how `helix-copy-button` answers `--icon-button-size` while declaring no
         hooks at all: it sets `styles = [HelixIconButton.styles, styles]` and
         borrows the stylesheet outright, a relationship no manifest field has a
         name for. */
      if (known.some(([tag]) => answered.get(tag)?.has(property))) {
        continue
      }
      /* Unknown to every tag in the selector, and unknown to Helix entirely, is
         a property of the consumer's own that happens to be set here. Only a
         name Helix does have somewhere is evidence of a mistake. */
      const answerers = new Set(
        [...tags].filter(([, element]) => element.hooks.has(property)).map(([tag]) => tag),
      )
      const candidates = known.flatMap(([, element]) => [...(element?.hooks.keys() ?? [])])
      const suggestion = nearest(property, candidates)
      if (answerers.size === 0 && !suggestion) {
        continue
      }
      /* Set on an ancestor of something that *does* answer it, this is
         deliberate: the property inherits through the shadow boundary and
         reaches the nested component. Only a page can settle that, so a run
         without one declines to guess. */
      if (answerers.size > 0 && !suggestion) {
        if (!from) {
          continue
        }
        let inherits = false
        for (const host of from.querySelectorAll(selector.replaceAll(/::part\([^)]*\)/g, ''))) {
          if (reaches(host, answerers)) {
            inherits = true
            break
          }
        }
        if (inherits) {
          continue
        }
      }
      const tag = known[0]?.[0] ?? 'the element'
      findings.push({
        expected: suggestion,
        kind: 'dead-hook',
        message: suggestion
          ? `\`${tag}\` does not answer \`${property}\`. It answers \`${suggestion}\`, which is one character class away and is almost certainly what was meant.`
          : `\`${tag}\` does not answer \`${property}\`, and nothing under it that does was found in the page. ${[...answerers].sort().slice(0, 3).join(', ')} answer it, so this either targets the wrong element or expects a descendant that is not there.`,
        origin: origin(located),
        subject: `${selector} { ${property} }`,
      })
    }
  }

  return findings
}

/**
 * Two copies of Helix on one page, which is not a CSS fault and is the most
 * expensive one on the list.
 *
 * **Helix already detects this, and detecting it again here would be worse.**
 * `@fusion.dev/helix-core`'s `customElement` decorator sees the second registration as
 * it happens, with both class objects in hand, which is a position nothing
 * later can improve on: by the time a page can be scanned, the losing class is
 * unreachable and all that is left is an identity mismatch to infer from. So
 * this reads `duplicateRegistrations()` rather than re-deriving it, which is
 * `AGENTS.md`'s rule about where a fix lives applied to a detector.
 *
 * The identity check stays as a fallback, for the copy that never went through
 * Helix's own decorator: a fork, a hand-written `customElements.define`, or a
 * version old enough to predate the warning. That case reports what it can see,
 * which is that a live element is not an instance of its own registered class.
 */
export const registrations = (
  from: Document = document,
  known: () => string[] = () => [],
): Finding[] => {
  const findings: Finding[] = []
  const registry = globalThis.customElements
  const said = new Set<string>()

  const duplicate = (tag: string, how: string): void => {
    if (said.has(tag)) {
      return
    }
    said.add(tag)
    findings.push({
      kind: 'duplicate-registration',
      message: `\`${tag}\` is registered twice by different classes, so this page holds two copies of Helix (${how}). The first registration keeps the tag: every element of that name is built from it whatever the second copy exports, which makes \`instanceof\` against the second copy false and leaves its fixes out of the DOM. Deduplicate the dependency.`,
      subject: tag,
    })
  }

  for (const tag of known()) {
    duplicate(tag, 'reported by the decorator at the moment it happened')
  }
  if (!registry) {
    return findings
  }
  for (const element of from.querySelectorAll('*')) {
    const tag = element.localName
    if (!tag.startsWith('helix-') || said.has(tag)) {
      continue
    }
    const registered = registry.get(tag)
    if (registered && !(element instanceof registered)) {
      duplicate(tag, 'a live element is not an instance of its own registered class')
    }
  }
  return findings
}
