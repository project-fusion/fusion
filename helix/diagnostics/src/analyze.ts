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
import type { Answered, Located, Readers } from './collect.js'
import { nearest, type Published } from './manifest.js'
import { type Page, pageOf } from './page.js'
import type { Origin, Raw } from './report.js'

/** Every `helix-*` tag a selector mentions, in source order. */
export const targets = (selector: string): string[] => {
  const found = new Set<string>()
  /* A type selector only: never the `helix-hero` of a class or an id. */
  for (const match of selector.matchAll(/(?<![\w.#-])helix-[a-z0-9]+(?:-[a-z0-9]+)*/g)) {
    found.add(match[0])
  }
  return [...found]
}

/** Every `::part(a b)` in a selector, with the tag it hangs off. */
export const parts = (selector: string): Array<{ names: string[]; tag: string }> => {
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
 * A selector made matchable now: pseudo-elements and the pseudo-classes of a
 * moment (hover, focus) taken off, since a hook set on `.card:hover` reaches
 * what `.card` matches. `null` where it cannot be judged from the page, as
 * for `:host`, which only a component's own root matches.
 *
 * The longer pseudo-classes come first, so `:focus-visible` is taken whole
 * and never read as `:focus` followed by `-visible`.
 */
const matchable = (selector: string): string | null => {
  if (selector.includes(':host')) {
    return null
  }
  const plain = selector
    .replace(/::[\w-]+(\([^)]*\))?/g, '')
    .replace(/:(focus-visible|focus-within|hover|focus|active|visited|target)(?![\w-])/g, '')
    .trim()
  return plain === '' ? null : plain
}

/**
 * Whether `node` answers `property`: a tag that does, or an element a rule
 * outside Helix's components reads it for, in that rule's own root.
 */
const answersAt = (
  node: Element,
  property: string,
  answering: ReadonlySet<string>,
  readers: Readers,
): boolean => {
  if (answering.has(node.localName)) {
    return true
  }
  for (const { scope, selector } of readers.get(property) ?? []) {
    if (scope !== undefined && node.getRootNode() !== scope) {
      continue
    }
    const plain = matchable(selector)
    try {
      if (plain !== null && node.matches(plain)) {
        return true
      }
    } catch {
      /* A selector this engine cannot parse matches nothing here. */
    }
  }
  return false
}

/**
 * Whether `host`, or anything under it, shadow roots included, answers
 * `property`. **The host counts**: `helix-button-group > *` sets a hook on
 * the buttons it matches, and they answer it themselves.
 *
 * **This is the check a static tool cannot make, and skipping it is a three
 * percent false-positive rate.** Measured on this repository: `landing.module.css`
 * sets `--icon-button-radius` and `--icon-button-size` on `helix-copy-button`,
 * which answers neither, and both work, because a copy button *renders* an icon
 * button and custom properties inherit through a shadow boundary. A rule that
 * reads the manifest alone calls those two dead. A collector running in the
 * page can simply look, which is the whole argument for the collector being in
 * the page and not in a linter.
 */
const reachesAnswer = (
  host: Element,
  property: string,
  answering: ReadonlySet<string>,
  readers: Readers,
  depth = 0,
): boolean => {
  if (depth > 16) {
    return false
  }
  for (const node of [host, ...host.querySelectorAll('*')]) {
    if (answersAt(node, property, answering, readers)) {
      return true
    }
    for (const child of node.shadowRoot?.children ?? []) {
      if (reachesAnswer(child, property, answering, readers, depth + 1)) {
        return true
      }
    }
  }
  return false
}

/**
 * The hooks a rule naming no Helix tag sets: on a class, an id, `:root`, or
 * any other selector, which is where most hooks are set. Measured on this
 * repository's site and examples, 95 of 159 Helix hook declarations sit in a
 * class selector.
 *
 * **Two faults, each judged only on evidence the page holds:**
 *
 * - **A misspelled hook**: a name no Helix element answers, two edits or
 *   fewer from one that one does, and read by no `var()` on the page. A name
 *   the page reads itself is the page's own custom property, however close.
 * - **A hook nothing under the selector answers**: the selector matches
 *   elements, something on the page answers the hook, and nothing the
 *   selector matches is, or holds, an element that does. A selector matching
 *   nothing yet, or a page where nothing answers the hook, is left unjudged:
 *   the rule may be for another route or a later state.
 */
const loose = (
  located: Located,
  answerers: Map<string, Set<string>>,
  from: Document | undefined,
  used: Set<string>,
  onPage: (property: string, answering: Set<string>) => boolean,
  listedBy: Map<string, Set<string>>,
  readers: Readers,
  suggested: Map<string, string | undefined>,
): Raw[] => {
  const findings: Raw[] = []
  /* **The page's CSS only.** A Helix component's own sheets, in its shadow
     root, set and read its private properties, and they are the library's to
     answer for: judged as a page's, every `--_button-fill` read as a typo. */
  if (located.scope instanceof ShadowRoot && located.scope.host.localName.startsWith('helix-')) {
    return findings
  }
  const selector = located.rule.selectorText
  for (const property of Array.from(located.rule.style ?? [])) {
    /* **Never a token, never private.** A `--helix-` token is read by every
       component, so neither rule below applies to it: judged as hooks, the
       token layer read as four thousand misspellings across the examples. A
       `--_` name is private by Helix's convention. */
    if (
      !property.startsWith('--') ||
      property.startsWith('--helix-') ||
      property.startsWith('--_')
    ) {
      continue
    }
    const answering = answerers.get(property)
    if (!answering) {
      /* A name the page reads itself is the page's own variable. */
      if (used.has(property)) {
        continue
      }
      /* Asked once per name, however many rules set it. */
      let suggestion = suggested.get(property)
      if (!suggested.has(property)) {
        suggestion = nearest(property, answerers.keys(), HOOK_DISTANCE)
        suggested.set(property, suggestion)
      }
      if (!suggestion) {
        continue
      }
      /* Named for a tag whose manifest lists the hook, so the finding's
         fingerprint does not move with which components a page renders. */
      const tag = [...(listedBy.get(suggestion) ?? answerers.get(suggestion) ?? [])].sort()[0] ?? ''
      findings.push({
        expected: suggestion,
        kind: 'dead-hook',
        message: `\`${selector}\` sets \`${property}\`, which no Helix element answers and nothing on the page reads. \`${suggestion}\` is a hook \`${tag}\` answers, two edits or fewer away, and almost certainly what was meant.`,
        origin: origin(located),
        subject: `${selector} { ${property} }`,
        tag,
      })
      continue
    }
    const scope = located.scope ?? from
    const plain = matchable(selector)
    if (!scope || !from?.documentElement || plain === null) {
      continue
    }
    let matched: Element[]
    try {
      matched = [...scope.querySelectorAll(plain)]
    } catch {
      /* A selector this engine cannot parse cannot be judged. */
      continue
    }
    if (matched.length === 0 || !onPage(property, answering)) {
      continue
    }
    if (matched.some((host) => reachesAnswer(host, property, answering, readers))) {
      continue
    }
    const tags = [...answering].sort()
    findings.push({
      kind: 'dead-hook',
      message: `\`${selector}\` sets \`${property}\`, and nothing under the ${matched.length === 1 ? 'element' : `${matched.length} elements`} it matches answers it, though something elsewhere on this page does. ${tags
        .slice(0, 3)
        .map((one) => `\`${one}\``)
        .join(
          ', ',
        )} ${tags.length === 1 ? 'answers' : 'answer'} it. It targets the wrong element, or expects a descendant that is not there.`,
      origin: origin(located),
      subject: `${selector} { ${property} }`,
      tag: tags[0] ?? '',
    })
  }
  return findings
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
  used: Set<string> = new Set(),
  readers: Readers = new Map(),
): Raw[] => {
  const findings: Raw[] = []
  /* Which tags answer each hook, by the manifest or by their own styles. */
  const answeredBy = new Map<string, Set<string>>()
  const answers = (property: string, tag: string): void => {
    const set = answeredBy.get(property) ?? new Set<string>()
    set.add(tag)
    answeredBy.set(property, set)
  }
  /* The manifest's own answer, kept apart for naming a finding's tag. */
  const listedBy = new Map<string, Set<string>>()
  for (const [tag, element] of tags) {
    for (const property of element.hooks.keys()) {
      answers(property, tag)
      listedBy.set(property, new Set([...(listedBy.get(property) ?? []), tag]))
    }
  }
  for (const [tag, reads] of answered) {
    for (const property of reads) {
      if (tags.has(tag)) {
        answers(property, tag)
      }
    }
  }
  /* The closest hook to each name that is not one, by name. */
  const suggested = new Map<string, string | undefined>()
  /* Whether anything on the page answers a hook, asked once per hook: the
     walk covers the whole page, shadow roots included. */
  const present = new Map<string, boolean>()
  const onPage = (property: string, answering: Set<string>): boolean => {
    let found = present.get(property)
    if (found === undefined) {
      found = from?.documentElement
        ? reachesAnswer(from.documentElement, property, answering, readers)
        : false
      present.set(property, found)
    }
    return found
  }

  for (const located of rules) {
    const selector = located.rule.selectorText
    if (!selector) {
      continue
    }

    for (const { names, tag } of selector.includes('helix-') ? parts(selector) : []) {
      const element = tags.get(tag)
      if (!element) {
        findings.push({
          kind: 'unknown-tag',
          message: `\`${tag}\` is in no manifest passed to the collector. Either the tag is misspelled, or the manifest is from a different version of Helix than the page.`,
          origin: origin(located),
          subject: tag,
          tag,
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
            tag,
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
          tag,
        })
      }
    }

    /* A property set on a selector naming several Helix tags is wrong only if
       it is unknown to all of them: `helix-button, helix-link { --gap: 0 }` is
       fine when either answers it. */
    const mentioned = targets(selector).map((tag) => [tag, tags.get(tag)] as const)
    const known = mentioned.filter(([, element]) => element)
    if (known.length === 0) {
      findings.push(...loose(located, answeredBy, from, used, onPage, listedBy, readers, suggested))
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
      const suggestion = nearest(property, candidates, HOOK_DISTANCE)
      /* A name the page reads itself is its own variable, set here for its
         own rules, however close it is to a hook. */
      if ((answerers.size === 0 && !suggestion) || (answerers.size === 0 && used.has(property))) {
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
        /* **Judged only on elements the selector matches now.** A selector
           matching nothing on this page may be for another route, which is
           how one shared stylesheet serves many: measured on this
           repository's site, a list rule in the document layout read as dead
           on the one page with no ordered list. And **the matched element
           itself may answer**: `helix-button-group > *` sets a hook on the
           group's buttons, and looking only under each button called it dead
           on all 163 pages. */
        const plain = matchable(selector)
        if (plain === null) {
          continue
        }
        let matched: Element[]
        try {
          matched = [...(located.scope ?? from).querySelectorAll(plain)]
        } catch {
          continue
        }
        if (
          matched.length === 0 ||
          matched.some((host) =>
            reachesAnswer(host, property, answeredBy.get(property) ?? answerers, readers),
          )
        ) {
          continue
        }
      }
      const tag = known[0]?.[0] ?? 'the element'
      findings.push({
        expected: suggestion,
        kind: 'dead-hook',
        message: suggestion
          ? `\`${tag}\` does not answer \`${property}\`. It answers \`${suggestion}\`, two edits or fewer away, which is almost certainly what was meant.`
          : `\`${tag}\` does not answer \`${property}\`, and nothing under it that does was found in the page. ${[...answerers].sort().slice(0, 3).join(', ')} answer it, so this either targets the wrong element or expects a descendant that is not there.`,
        origin: origin(located),
        subject: `${selector} { ${property} }`,
        tag,
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
  page: Page = pageOf(from),
): Raw[] => {
  const findings: Raw[] = []
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
      tag,
    })
  }

  for (const tag of known()) {
    duplicate(tag, 'reported by the decorator at the moment it happened')
  }
  if (!registry) {
    return findings
  }
  for (const element of page.elements) {
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

/**
 * Evidence that the manifest is from another version of Helix than the page
 * runs: an element rendering a part its manifest entry does not list.
 *
 * **Read from what the elements render, because nothing records a version.**
 * Neither the manifest nor the running code carries one. What a matching
 * manifest guarantees is that every part an element renders is listed, since
 * both are built from the same source, so a rendered part the manifest lacks
 * means the two were built from different source. The reverse proves nothing:
 * an element renders some parts only in some states.
 *
 * **One finding replaces all the others** (see `diagnose`). A part renamed
 * between versions reads as dead in every rule that styles it, and a hundred
 * findings that are each the same mistake are worse than one that names it.
 */
export const skew = (
  tags: Map<string, Published>,
  from: Document,
  page: Page = pageOf(from),
): Raw[] => {
  const findings: Raw[] = []
  const said = new Set<string>()
  for (const element of page.elements) {
    const shadow = element.shadowRoot
    if (!shadow) {
      continue
    }
    const tag = element.localName
    const published = tags.get(tag)
    if (published && !said.has(tag)) {
      const rendered = new Set(
        [...shadow.querySelectorAll('[part]')].flatMap((node) =>
          (node.getAttribute('part') ?? '').split(/\s+/).filter(Boolean),
        ),
      )
      const missing = [...rendered].filter((name) => !published.parts.has(name)).sort()
      if (missing.length > 0) {
        said.add(tag)
        findings.push({
          kind: 'manifest-skew',
          message: `\`${tag}\` renders ${missing.map((name) => `\`${name}\``).join(', ')}, which the manifest passed in does not list, so the manifest is from a different version of Helix than the page runs. Every other finding would be judged against the wrong version, so none are reported. Pass the \`custom-elements.json\` from the installed packages.`,
          subject: tag,
          tag,
        })
      }
    }
  }
  return findings
}

/**
 * A manifest from another version, read from the numbers where both sides
 * have one: the version a manifest describes, against the versions of core
 * loaded on the page. Definite where `skew` above infers, and the check
 * `diagnose` makes first.
 */
export const versionSkew = (manifests: Record<string, string>, seen: string[]): Raw[] =>
  seen.length === 0
    ? []
    : Object.entries(manifests)
        .filter(([, version]) => !seen.includes(version))
        .map(([name, version]) => ({
          kind: 'manifest-skew' as const,
          message: `The manifest passed in for \`${name}\` describes ${version}, and the page runs Helix ${seen.join(' and ')}. Every other finding would be judged against the wrong version, so none are reported. Pass the \`custom-elements.json\` from the installed packages.`,
          subject: `${name}@${version}`,
          tag: '',
        }))

/**
 * Attributes every element takes, whatever its manifest says: the global
 * ones HTML defines, and the prefixes frameworks write. Anything else on a
 * Helix element that its manifest does not list does nothing.
 */
const GLOBAL = new Set([
  'accesskey',
  'autocapitalize',
  'autofocus',
  'class',
  'contenteditable',
  'defer-hydration',
  'dir',
  'draggable',
  'enterkeyhint',
  'exportparts',
  'hidden',
  'id',
  'inert',
  'inputmode',
  'is',
  'itemid',
  'itemprop',
  'itemref',
  'itemscope',
  'itemtype',
  'lang',
  'nonce',
  'part',
  'popover',
  'role',
  'slot',
  'spellcheck',
  'style',
  'tabindex',
  'title',
  'translate',
  'writingsuggestions',
])

/** Attribute prefixes a page or a framework writes on any element. */
const PREFIXES = ['aria-', 'data-', 'on', '_ngcontent-', '_nghost-', 'ng-', 'v-', 'x-', ':', '@']

/**
 * How far a misspelled hook may be from the real one: two edits, which a
 * transposition is (`backgruond`) and a dropped or added letter is less
 * than (`breadcrumb` for `breadcrumbs`). A third of a long name reached
 * `--chart-terminus-y` from `--chart-series-1`, which is not a typo.
 */
const HOOK_DISTANCE = 2

/**
 * The attributes on the page's Helix elements that do nothing: a name the
 * element does not take, and a value outside the ones a closed set allows.
 * Both are valid HTML and silent, since the element falls back to its default.
 *
 * **Only what the page wrote.** An element Helix renders inside another is
 * Helix's own markup. One finding per tag, attribute, and value, however many
 * elements carry it.
 */
export const markup = (
  tags: Map<string, Published>,
  from: Document,
  page: Page = pageOf(from),
): Raw[] => {
  const found = new Map<string, Raw & { count: number }>()
  for (const element of page.elements) {
    const host = element.getRootNode()
    const composed = host instanceof ShadowRoot && host.host.localName.startsWith('helix-')
    const published = composed ? undefined : tags.get(element.localName)
    if (published) {
      for (const { name, value } of Array.from(element.attributes)) {
        if (
          GLOBAL.has(name) ||
          PREFIXES.some((prefix) => name.startsWith(prefix)) ||
          published.written.has(name)
        ) {
          continue
        }
        const tag = element.localName
        const allows = published.attributes.get(name)
        let raw: Raw | undefined
        if (allows === undefined) {
          const suggestion = nearest(name, published.attributes.keys())
          raw = {
            expected: suggestion,
            kind: 'unknown-attribute',
            message: suggestion
              ? `\`${tag}\` takes no attribute \`${name}\`, so it does nothing. The closest it takes is \`${suggestion}\`.`
              : `\`${tag}\` takes no attribute \`${name}\`, so it does nothing.`,
            subject: `<${tag} ${name}>`,
            tag,
          }
        } else if (allows && value !== '' && !allows.has(value)) {
          const suggestion = nearest(value, allows)
          raw = {
            expected: suggestion,
            kind: 'invalid-value',
            message: `\`${tag}\`'s \`${name}\` takes ${[...allows].map((one) => `\`${one}\``).join(', ')}, so \`${value}\` falls back to the default.${suggestion ? ` The closest is \`${suggestion}\`.` : ''}`,
            subject: `<${tag} ${name}="${value}">`,
            tag,
          }
        }
        if (raw) {
          const key = `${raw.kind} ${raw.subject}`
          const seen = found.get(key)
          if (seen) {
            seen.count += 1
          } else {
            found.set(key, { ...raw, count: 1 })
          }
        }
      }
    }
  }
  return [...found.values()].map(({ count, ...raw }) => ({
    ...raw,
    message: count > 1 ? `${raw.message} On ${count} elements.` : raw.message,
  }))
}
