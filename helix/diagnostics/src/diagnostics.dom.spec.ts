import { beforeAll, describe, expect, test } from 'bun:test'
import { registerDom } from '@fusion.dev/helix-testing/dom'
import type { Report } from './report.js'

/**
 * The collector, against the faults it exists to find.
 *
 * **The tests that matter here are the negative ones.** A collector that reports
 * findings is easy; a collector that reports the *right* number is the whole
 * product, because a rules engine makes a wrong finding cheap to add and every
 * false one costs a reader's attention permanently. So the misnamed-hook rule is
 * tested against the 27 shapes in this library that a naive rule gets wrong,
 * and coverage is tested against a sheet the collector cannot read.
 */

beforeAll(() => {
  registerDom()
})

const { analyze, markup, skew } = await import('./analyze.js')
const { collect } = await import('./collect.js')
const { diagnose } = await import('./index.js')
const { index, nearest } = await import('./manifest.js')
const { report } = await import('./console.js')
const { applyRules, checkRules } = await import('./rules.js')
const { styled, walk, watch } = await import('./usage.js')
const { fingerprintOf, identify, normalize } = await import('./identity.js')
const { checkConfig, pagePattern, resolveConfig } = await import('./config.js')
const { VERSION } = await import('./version.js')

/** Two tiers, shaped like the real manifests and small enough to read. */
const tiers = [
  {
    manifest: {
      modules: [
        {
          declarations: [
            {
              attributes: [
                { name: 'emphasis', type: { text: "'ghost' | 'solid' | undefined" } },
                { name: 'label', type: { text: 'string' } },
              ],
              cssParts: [{ name: 'button' }, { name: 'icon' }],
              cssProperties: [{ name: '--button-background-color' }, { name: '--button-radius' }],
              tagName: 'helix-button',
            },
            {
              cssParts: [{ name: 'separator' }],
              /* The real shape: a singular tag answering the plural family's
                 hooks, which is what defeats a prefix rule. */
              cssProperties: [{ name: '--breadcrumbs-separator-color' }],
              tagName: 'helix-breadcrumb',
            },
            {
              cssProperties: [{ name: '--chart-band-color' }],
              tagName: 'helix-bar-chart',
            },
          ],
        },
      ],
    },
    name: '@fusion.dev/helix',
  },
  {
    manifest: {
      modules: [
        {
          declarations: [{ cssParts: [{ name: 'control' }], tagName: 'helix-headless-button' }],
        },
      ],
    },
    name: '@fusion.dev/helix-headless',
  },
]

const tags = index(tiers)

/**
 * One rule, built rather than parsed.
 *
 * **happy-dom drops a `::part()` rule on the floor.** Measured: a stylesheet
 * whose only content is `helix-button::part(button) { color: red }` parses to
 * `cssRules.length === 0`, and `@media` around it yields a `CSSMediaRule` with
 * an empty `cssRules`. So a spec that goes through the DOM parser to test the
 * part rules is a spec that can only ever pass, which is the failure this whole
 * package exists to prevent.
 *
 * `analyze` is a pure function of three fields, so the specs hand it those three
 * fields. What the parser does is a separate claim, held separately by
 * `check:spec:diagnostics` in a real engine.
 */
const ruled = (selector: string, declarations: string[] = []) => ({
  remove: () => {},
  rules: [
    {
      index: 0,
      rule: {
        cssText: `${selector} { ${declarations.join('; ')} }`,
        selectorText: selector,
        /* A declaration list with `getPropertyValue`, as `CSSStyleDeclaration` has. */
        style: Object.assign(
          declarations.map((text) => text.split(':')[0]?.trim() ?? ''),
          {
            getPropertyValue: (name: string) =>
              declarations
                .find((text) => text.split(':')[0]?.trim() === name)
                ?.split(':')
                .slice(1)
                .join(':')
                .trim() ?? '',
          },
        ),
      } as unknown as CSSStyleRule,
      sheet: 'test',
    },
  ],
})

describe('parts', () => {
  test('a part nothing publishes is dead, and the finding names the nearest one', () => {
    const { remove, rules } = ruled('helix-button::part(buton)', ['color: red'])
    const findings = analyze(rules, tags)
    expect(findings).toHaveLength(1)
    expect(findings[0]?.kind).toBe('dead-part')
    expect(findings[0]?.expected).toBe('button')
    remove()
  })

  test('a part another tier publishes is unforwarded rather than a typo', () => {
    const { remove, rules } = ruled('helix-button::part(control)', ['color: red'])
    const findings = analyze(rules, tags)
    expect(findings[0]?.kind).toBe('unforwarded-part')
    expect(findings[0]?.message).toContain('helix-headless-button')
    remove()
  })

  test('a published part is silent', () => {
    const { remove, rules } = ruled('helix-button::part(icon)', ['color: red'])
    expect(analyze(rules, tags)).toHaveLength(0)
    remove()
  })

  test('`::part(a b)` is two names and each is checked', () => {
    const { remove, rules } = ruled('helix-button::part(icon nope)', ['color: red'])
    const findings = analyze(rules, tags)
    expect(findings).toHaveLength(1)
    expect(findings[0]?.subject).toBe('helix-button::part(nope)')
    remove()
  })

  test('a tag no manifest knows is reported as skew, not as a dead part', () => {
    const { remove, rules } = ruled('helix-invented::part(thing)', ['color: red'])
    expect(analyze(rules, tags)[0]?.kind).toBe('unknown-tag')
    remove()
  })
})

describe('hooks', () => {
  test('a hook named for the wrong family is found, with the right one', () => {
    const { remove, rules } = ruled('helix-button', ['--button-backgruond-color: red'])
    const findings = analyze(rules, tags)
    expect(findings).toHaveLength(1)
    expect(findings[0]?.kind).toBe('dead-hook')
    expect(findings[0]?.expected).toBe('--button-background-color')
    remove()
  })

  /**
   * The 27 cases a naive rule breaks on.
   *
   * `helix-breadcrumb` answering `--breadcrumbs-*` and every chart answering
   * `--chart-*` are the shapes that make "the hook must be prefixed by the
   * family" produce 27 false findings in this library's own repository. Set
   * membership against the manifest gets them right without an exemption list.
   */
  test('a singular tag answering a plural family is not a finding', () => {
    const { remove, rules } = ruled('helix-breadcrumb', ['--breadcrumbs-separator-color: red'])
    expect(analyze(rules, tags)).toHaveLength(0)
    remove()
  })

  test('a shared namespace across families is not a finding', () => {
    const { remove, rules } = ruled('helix-bar-chart', ['--chart-band-color: red'])
    expect(analyze(rules, tags)).toHaveLength(0)
    remove()
  })

  test("the consumer's own custom property is not a finding", () => {
    const { remove, rules } = ruled('helix-button', ['--my-app-gap: 4px'])
    expect(analyze(rules, tags)).toHaveLength(0)
    remove()
  })

  /**
   * The three-percent false positive, and the two branches that fixed it.
   *
   * Measured on this repository before the fix: `landing.module.css` sets
   * `--icon-button-radius` and `--icon-button-size` on `helix-copy-button`,
   * which answers neither, and both work, because a copy button renders an icon
   * button and custom properties inherit through the shadow boundary. Six
   * findings out of 197 declarations, every one wrong. A manifest cannot settle
   * it; a page can, which is the argument for the collector being in the page.
   */
  test('a hook set on an ancestor of something that answers it is deliberate', () => {
    const host = document.createElement('helix-bar-chart')
    const outer = document.createElement('helix-button')
    outer.append(host)
    document.body.append(outer)

    const { remove, rules } = ruled('helix-button', ['--chart-band-color: red'])
    expect(analyze(rules, tags, document)).toHaveLength(0)
    outer.remove()
    remove()
  })

  test('the same hook with no such descendant in the page is a finding', () => {
    const alone = document.createElement('helix-button')
    document.body.append(alone)

    const { remove, rules } = ruled('helix-button', ['--chart-band-color: red'])
    const findings = analyze(rules, tags, document)
    expect(findings).toHaveLength(1)
    expect(findings[0]?.kind).toBe('dead-hook')
    alone.remove()
    remove()
  })

  test('with no page at all it declines to guess, because a finding needs evidence', () => {
    const { remove, rules } = ruled('helix-button', ['--chart-band-color: red'])
    expect(analyze(rules, tags)).toHaveLength(0)
    remove()
  })

  test('a descendant behind a shadow boundary counts, since the property inherits through it', () => {
    const outer = document.createElement('helix-button')
    document.body.append(outer)
    const root = outer.attachShadow({ mode: 'open' })
    root.append(document.createElement('helix-bar-chart'))

    const { remove, rules } = ruled('helix-button', ['--chart-band-color: red'])
    expect(analyze(rules, tags, document)).toHaveLength(0)
    outer.remove()
    remove()
  })

  /**
   * The second false positive, and the one the manifest can never fix.
   *
   * `helix-copy-button` declares no hooks and answers `--icon-button-size`,
   * because its class sets `styles = [HelixIconButton.styles, styles].flat()`
   * and borrows the icon button's stylesheet outright. That is not inheritance,
   * a mixin or a part, so no manifest field describes it and `cem` records
   * nothing. Two correct declarations in this repository's own
   * `landing.module.css` were called dead on the strength of that silence.
   */
  test('a tag whose own styles read the property answers it, whatever the manifest says', () => {
    const outer = document.createElement('helix-button')
    document.body.append(outer)
    const { remove, rules } = ruled('helix-button', ['--borrowed-from-elsewhere: red'])
    const borrowed = new Map([['helix-button', new Set(['--borrowed-from-elsewhere'])]])

    expect(analyze(rules, tags, document, borrowed)).toHaveLength(0)
    /* And without that evidence the same declaration is a finding, so the
       exemption is doing the work rather than the rule being toothless. */
    expect(
      analyze(
        rules,
        new Map([
          ...tags,
          [
            'helix-other',
            {
              attributes: new Map(),
              hooks: new Map([['--borrowed-from-elsewhere', new Set(['t'])]]),
              parts: new Map(),
              written: new Set(),
            },
          ],
        ]),
        document,
      ),
    ).toHaveLength(1)
    outer.remove()
    remove()
  })

  test('a misspelling is a finding whatever is in the page, since nothing answers it', () => {
    const outer = document.createElement('helix-button')
    document.body.append(outer)
    const { remove, rules } = ruled('helix-button', ['--button-backgruond-color: red'])
    expect(analyze(rules, tags, document)).toHaveLength(1)
    outer.remove()
    remove()
  })

  test('a selector naming two tags is silent when either answers the hook', () => {
    const { remove, rules } = ruled('helix-bar-chart, helix-button', ['--chart-band-color: red'])
    expect(analyze(rules, tags)).toHaveLength(0)
    remove()
  })

  test('a rule targeting no Helix element is not examined at all', () => {
    const { remove, rules } = ruled('.card', ['--button-nonsense: red'])
    expect(analyze(rules, tags)).toHaveLength(0)
    remove()
  })
})

describe('flattening', () => {
  /**
   * A dead `::part()` inside `@media` is dead at that width, which is still
   * dead, so grouping rules are descended into rather than skipped. Built by
   * hand for the same reason the part specs are: happy-dom parses `@media` to a
   * `CSSMediaRule` whose `cssRules` is empty, so the parser cannot produce the
   * input this needs to be tested against.
   */
  const list = (rules: unknown[]) =>
    Object.assign(rules.slice(), { length: rules.length }) as unknown as CSSRuleList

  const styleRule = (selector: string) => ({
    cssText: `${selector} { color: red }`,
    selectorText: selector,
    style: [],
  })

  test('a rule inside `@media` is collected, and keeps its index', () => {
    const inner = styleRule('helix-button::part(buton)')
    const sheet = {
      cssRules: list([{ cssRules: list([inner]) }]),
    } as unknown as CSSStyleSheet
    const style = document.createElement('style')
    document.head.append(style)
    Object.defineProperty(style, 'sheet', { configurable: true, get: () => sheet })

    const { rules } = collect(document)
    expect(rules.some((r) => r.rule.selectorText === 'helix-button::part(buton)')).toBe(true)
    style.remove()
  })

  test('an `@import` is followed, because an imported sheet is a sheet', () => {
    const imported = {
      cssRules: list([styleRule('helix-button::part(imported)')]),
    } as unknown as CSSStyleSheet
    const sheet = {
      cssRules: list([{ styleSheet: imported }]),
    } as unknown as CSSStyleSheet
    const style = document.createElement('style')
    document.head.append(style)
    Object.defineProperty(style, 'sheet', { configurable: true, get: () => sheet })

    const { rules } = collect(document)
    expect(rules.some((r) => r.rule.selectorText === 'helix-button::part(imported)')).toBe(true)
    style.remove()
  })
})

describe('coverage', () => {
  test('a sheet inside a shadow root is read, and the root is counted', () => {
    const host = document.createElement('div')
    document.body.append(host)
    const root = host.attachShadow({ mode: 'open' })
    const style = document.createElement('style')
    /* Not a `::part()` rule, though that is the interesting case: the claim
       under test is that a sheet inside a shadow root is reached at all, and
       happy-dom would drop a part rule before the collector ever saw it. */
    style.textContent = 'helix-button.inside-a-shadow-root { color: red }'
    root.append(style)

    const { coverage, rules } = collect(document)
    expect(coverage.roots).toBeGreaterThanOrEqual(1)
    expect(rules.some((r) => r.rule.selectorText?.includes('inside-a-shadow-root'))).toBe(true)
    host.remove()
  })

  /**
   * The bug this spec exists for: one sheet adopted by many hosts is one sheet.
   *
   * Lit gives a class one `CSSStyleSheet` and every instance adopts that same
   * object. Counted per host, a page of two hundred elements reports four
   * hundred sheets, which is the element count wearing the coverage field's
   * name, and every rule in it is analyzed two hundred times.
   */
  test('one stylesheet adopted by twenty hosts is counted once', () => {
    const sheet = new CSSStyleSheet()
    sheet.replaceSync('helix-button.shared { color: red }')
    const hosts = Array.from({ length: 20 }, () => {
      const host = document.createElement('div')
      document.body.append(host)
      host.attachShadow({ mode: 'open' }).adoptedStyleSheets = [sheet]
      return host
    })

    const { coverage, rules } = collect(document)
    expect(coverage.roots).toBe(20)
    expect(rules.filter((r) => r.rule.selectorText === 'helix-button.shared')).toHaveLength(1)
    for (const host of hosts) {
      host.remove()
    }
  })

  test('a sheet that throws on `cssRules` becomes an unreadable entry rather than a silent pass', () => {
    const style = document.createElement('style')
    style.textContent = 'helix-button { color: red }'
    document.head.append(style)
    const sheet = style.sheet
    if (!sheet) {
      throw new Error('the test document did not parse the stylesheet')
    }
    Object.defineProperty(sheet, 'cssRules', {
      configurable: true,
      get() {
        throw new DOMException('cross-origin', 'SecurityError')
      },
    })

    const { coverage } = collect(document)
    expect(coverage.unreadable.some((entry) => entry.reason === 'cross-origin')).toBe(true)
    expect(coverage.read).toBeLessThan(coverage.sheets)
    style.remove()
  })
})

/** A report's other halves, where a test is about coverage or findings. */
const quiet = {
  configuration: {
    console: { coverage: 'info', findings: 'info', usage: 'debug' },
    detail: { evidence: 'full', hookValues: true, pages: 'patterns' },
    environments: { ci: true, development: true, production: false },
    overrides: [],
    silenced: [],
  },
  project: { tags: [] },
  run: { at: '2026-10-04T00:00:00.000Z', duration: 1, id: 'run', source: 'page' },
  schema: 1,
  usage: {
    axes: {},
    composed: {},
    counted: 'walked',
    hooks: {},
    hookValues: {},
    parts: {},
    slots: {},
    tags: {},
    unlisted: {},
  },
  versions: { collector: '0', helix: [], manifests: {}, rules: '0' },
  withheld: [],
} satisfies Omit<Report, 'coverage' | 'findings'>

/** A console that records each entry with the method it went to. */
const recording = () => {
  const entries: Array<[string, string]> = []
  const at =
    (level: string) =>
    (text = '') =>
      entries.push([level, String(text)])
  return {
    entries,
    sink: {
      debug: at('debug'),
      error: at('error'),
      group: at('group'),
      groupCollapsed: at('groupCollapsed'),
      groupEnd: at('groupEnd'),
      info: at('info'),
      warn: at('warn'),
    },
    text: () => entries.map(([, text]) => text).join('\n'),
  }
}

/** One finding at a severity, for the sink. */
const finding = (
  severity: 'error' | 'info' | 'warn',
  decidedBy: 'argument' | 'shipped' = 'shipped',
) => ({
  category: 'styling' as const,
  decidedBy,
  fingerprint: 'f',
  kind: 'dead-part' as const,
  message: 'nope',
  origin: { cssText: 'helix-button::part(x) { }', index: 4, sheet: 'app.css' },
  owner: 'consumer' as const,
  severity,
  subject: 'helix-button::part(x)',
  tag: 'helix-button',
})

describe('the report', () => {
  test('diagnose refuses to run with no manifest', () => {
    expect(() => diagnose({ tiers: [] })).toThrow(/at least one manifest/)
  })

  test('coverage is printed on a clean run, so an empty result cannot read as a pass', () => {
    const { entries, sink } = recording()
    report(
      {
        ...quiet,
        coverage: {
          read: 18,
          roots: 0,
          sheets: 19,
          unreadable: [{ reason: 'cross-origin', sheet: 'https://cdn.example/x.css' }],
        },
        findings: [],
      },
      sink,
    )
    expect(entries[0]).toEqual(['group', 'helix diagnostics: no findings'])
    expect(entries).toContainEqual(['info', 'read 18 of 19 stylesheets across 0 shadow roots'])
    expect(entries.find(([level]) => level === 'warn')?.[1]).toContain('https://cdn.example/x.css')
    expect(entries.at(-1)).toEqual(['groupEnd', ''])
  })

  test('a clean run that read everything collapses to one line', () => {
    const { entries, sink } = recording()
    report(
      { ...quiet, coverage: { read: 2, roots: 1, sheets: 2, unreadable: [] }, findings: [] },
      sink,
    )
    expect(entries[0]?.[0]).toBe('groupCollapsed')
    expect(entries.some(([level]) => level === 'warn' || level === 'error')).toBe(false)
  })

  test('each finding goes to the console method named by its severity, with its receipt', () => {
    const { entries, sink } = recording()
    report(
      {
        ...quiet,
        coverage: { read: 1, roots: 0, sheets: 1, unreadable: [] },
        findings: [finding('error'), finding('warn', 'argument'), finding('info')],
      },
      sink,
    )
    expect(entries[0]).toEqual(['group', 'helix diagnostics: 1 error, 1 warning, 1 info'])
    const levels = entries.filter(([, text]) => text.includes('dead-part')).map(([level]) => level)
    expect(levels).toEqual(['error', 'warn', 'info'])
    const error = entries.find(([level]) => level === 'error')?.[1] ?? ''
    expect(error).toContain('app.css, rule 4')
    expect(error).toContain('helix-button::part(x) { }')
    expect(entries.find(([level]) => level === 'warn')?.[1]).toContain('set by the argument')
  })

  test('usage goes to debug, out of sight at the default level', () => {
    const { entries, sink } = recording()
    report(
      {
        ...quiet,
        coverage: { read: 1, roots: 0, sheets: 1, unreadable: [] },
        findings: [],
        usage: { ...quiet.usage, tags: { 'helix-button': 3 }, unlisted: { 'helix-mine': 1 } },
      },
      sink,
    )
    const usage = entries.filter(([, text]) => text.startsWith('usage'))
    expect(usage).toEqual([
      [
        'debug',
        'usage (walked): 1 tag in 3 elements, 0 parts styled, 0 hooks set, and 1 helix- tag no manifest lists',
      ],
    ])
  })
})

describe('the two fixes from review', () => {
  test('a manifest-skew finding turned off lets the page be judged as usual', () => {
    const host = document.createElement('helix-button')
    host.attachShadow({ mode: 'open' }).innerHTML = '<button part="button control-new"></button>'
    document.body.append(host)
    const style = document.createElement('style')
    style.textContent = 'helix-button { --button-backgruond-color: red }'
    document.head.append(style)
    const refused = diagnose({ tiers })
    expect(refused.findings.map((one) => one.kind)).toEqual(['manifest-skew'])
    const judged = diagnose({ rules: { 'manifest-skew': 'off' }, tiers })
    expect(judged.findings.map((one) => one.kind)).toEqual(['dead-hook'])
    expect(judged.configuration.silenced).toEqual([
      { count: 1, kind: 'manifest-skew', layer: 'argument' },
    ])
    style.remove()
    host.remove()
  })

  test('usage counts the tags a manifest lists, and keeps the rest apart', () => {
    document.body.innerHTML =
      '<helix-button></helix-button><helix-sandbox-editor></helix-sandbox-editor>'
    const { usage } = diagnose({ tiers })
    expect(usage.tags).toEqual({ 'helix-button': 1 })
    expect(usage.unlisted).toEqual({ 'helix-sandbox-editor': 1 })
    document.body.innerHTML = ''
  })
})

describe('nearest', () => {
  test('a close name is suggested', () => {
    expect(nearest('--button-backgruond-color', ['--button-background-color'])).toBe(
      '--button-background-color',
    )
  })

  test('a far name is not, however few candidates there are', () => {
    expect(nearest('--button-x', ['--button-background-color'])).toBeUndefined()
  })
})

describe('rules', () => {
  /** One raw finding of a kind, about a tag. */
  const raw = (kind: 'dead-hook' | 'dead-part' | 'unforwarded-part', tag = 'helix-button') => ({
    category: 'styling' as const,
    fingerprint: 'f',
    kind,
    message: 'm',
    owner: 'consumer' as const,
    subject: tag,
    tag,
  })

  test('the shipped rule sets the severity where nothing overrides it', () => {
    const { findings } = applyRules(
      [raw('dead-part'), raw('unforwarded-part')],
      undefined,
      undefined,
    )
    expect(findings.map((one) => [one.severity, one.decidedBy])).toEqual([
      ['error', 'shipped'],
      ['warn', 'shipped'],
    ])
  })

  test('the argument wins over the file, and the report says which decided', () => {
    const { findings } = applyRules(
      [raw('dead-part'), raw('dead-hook')],
      { 'dead-hook': 'info', 'dead-part': 'info' },
      { 'dead-part': 'warn' },
    )
    expect(findings.map((one) => [one.kind, one.severity, one.decidedBy])).toEqual([
      ['dead-part', 'warn', 'argument'],
      ['dead-hook', 'info', 'file'],
    ])
  })

  test('an override scoped to tags applies to those tags only, and outranks one that is not', () => {
    const { findings } = applyRules(
      [raw('dead-part', 'helix-card'), raw('dead-part', 'helix-button')],
      undefined,
      { 'dead-part': ['warn', { severity: 'info', tags: ['helix-card'] }] },
    )
    expect(findings.map((one) => [one.tag, one.severity])).toEqual([
      ['helix-card', 'info'],
      ['helix-button', 'warn'],
    ])
  })

  test('a finding turned off is counted against the layer that did it', () => {
    const { findings, silenced } = applyRules(
      [raw('dead-part'), raw('unforwarded-part'), raw('unforwarded-part', 'helix-card')],
      { 'unforwarded-part': 'off' },
      { 'dead-part': 'off' },
    )
    expect(findings).toHaveLength(0)
    expect(silenced).toEqual([
      { count: 1, kind: 'dead-part', layer: 'argument' },
      { count: 2, kind: 'unforwarded-part', layer: 'file' },
    ])
  })

  test('an override for a kind that does not exist throws, and names the closest', () => {
    expect(() => checkRules({ 'dead-parts': 'off' } as never, 'file')).toThrow(
      /closest is `dead-part`/,
    )
  })

  test('a severity that is not one throws', () => {
    expect(() => checkRules({ 'dead-part': 'fatal' } as never, 'argument')).toThrow(
      /error, warn, info, or off/,
    )
  })

  test('a scope with no tags throws, since it would apply to nothing', () => {
    expect(() => checkRules({ 'dead-part': { severity: 'off', tags: [] } }, 'argument')).toThrow(
      /no tags/,
    )
  })

  test('diagnose checks its overrides before it reads the page', () => {
    expect(() => diagnose({ rules: { 'dead-hooks': 'off' } as never, tiers })).toThrow(
      /argument overrides/,
    )
  })
})

describe('usage', () => {
  const slot = Symbol.for('fusion.dev/helix/usage')
  const store = globalThis as Record<symbol, unknown>

  test('a walk counts the page’s elements, their axes and their filled slots', () => {
    document.body.innerHTML =
      '<helix-button emphasis="solid" tone="danger"><span slot="start">x</span>Go</helix-button>' +
      '<helix-button emphasis="solid">Stop</helix-button><helix-card></helix-card>'
    const counted = walk(document)
    expect(counted.tags).toEqual({ 'helix-button': 2, 'helix-card': 1 })
    expect(counted.axes).toEqual({
      'helix-button': { emphasis: { solid: 2 }, tone: { danger: 1 } },
    })
    expect(counted.slots).toEqual({ 'helix-button': { start: 1 } })
    document.body.innerHTML = ''
  })

  test('an element a Helix element renders inside itself is composed, and kept apart', () => {
    const host = document.createElement('helix-pagination-size')
    host.attachShadow({ mode: 'open' }).innerHTML = '<helix-select></helix-select>'
    document.body.append(host)
    const counted = walk(document)
    expect(counted.tags).toEqual({ 'helix-pagination-size': 1 })
    expect(counted.composed).toEqual({ 'helix-select': 1 })
    host.remove()
  })

  test('a watcher counts what was there, and what renders and goes after it starts', () => {
    document.body.innerHTML = '<helix-card></helix-card>'
    const watcher = watch(document)
    const dialog = document.createElement('helix-dialog')
    document.body.append(dialog)
    ;(store[slot] as (element: Element) => void)(dialog)
    dialog.remove()
    /* Told twice, counted once. */
    ;(store[slot] as (element: Element) => void)(dialog)
    expect(watcher.counts().tags).toEqual({ 'helix-card': 1, 'helix-dialog': 1 })
    watcher.stop()
    expect(store[slot]).toBeUndefined()
    document.body.innerHTML = ''
  })

  test('a second watcher keeps the first counting, and stopping it gives the slot back', () => {
    const first = watch(document)
    const listener = store[slot]
    const second = watch(document)
    const element = document.createElement('helix-tag')
    ;(store[slot] as (element: Element) => void)(element)
    expect(first.counts().tags).toEqual({ 'helix-tag': 1 })
    expect(second.counts().tags).toEqual({ 'helix-tag': 1 })
    second.stop()
    expect(store[slot]).toBe(listener)
    first.stop()
  })

  test('the stylesheets count the parts and hooks that exist, and leave the dead ones to findings', () => {
    const { rules } = ruled('helix-button::part(button)', ['color: red'])
    const { rules: hooks } = ruled('helix-button', [
      '--button-radius: 0',
      '--button-radios: 0',
      '--my-own: 1',
    ])
    const { rules: dead } = ruled('helix-button::part(buton)', ['color: red'])
    expect(styled([...rules, ...hooks, ...dead], tags, new Map())).toEqual({
      hooks: { 'helix-button': { '--button-radius': 1 } },
      hookValues: { 'helix-button': { '--button-radius': { '0': 1 } } },
      parts: { 'helix-button': { button: 1 } },
    })
    expect(styled(hooks, tags, new Map(), false).hookValues).toEqual({})
  })

  test('diagnose reports usage, walked without a watcher and watched with one', () => {
    document.body.innerHTML = '<helix-button></helix-button>'
    expect(diagnose({ tiers }).usage).toMatchObject({
      counted: 'walked',
      tags: { 'helix-button': 1 },
    })
    const watcher = watch(document)
    expect(diagnose({ tiers, watcher }).usage.counted).toBe('watched')
    watcher.stop()
    document.body.innerHTML = ''
  })
})

describe('manifest skew', () => {
  test('an element rendering a part its manifest lacks is one finding in place of all the others', () => {
    const host = document.createElement('helix-button')
    host.attachShadow({ mode: 'open' }).innerHTML =
      '<button part="button control-new"></button><span part="icon"></span>'
    document.body.append(host)
    expect(skew(tags, document).map((one) => [one.kind, one.subject])).toEqual([
      ['manifest-skew', 'helix-button'],
    ])
    const style = document.createElement('style')
    style.textContent = 'helix-button { --button-backgruond-color: red }'
    document.head.append(style)
    const findings = diagnose({ tiers }).findings
    expect(findings.map((one) => one.kind)).toEqual(['manifest-skew'])
    expect(findings[0]?.message).toContain('`control-new`')
    style.remove()
    host.remove()
  })

  test('an element rendering only listed parts, or fewer, is no evidence', () => {
    const host = document.createElement('helix-button')
    host.attachShadow({ mode: 'open' }).innerHTML = '<button part="button"></button>'
    document.body.append(host)
    expect(skew(tags, document)).toEqual([])
    host.remove()
  })
})

describe('identity', () => {
  test('hashed class names are normalized out, as each bundler writes them', () => {
    expect(normalize('.trace-graph-module__lFhy0q__traceFrame helix-graph')).toBe(
      '.trace-graph-module__traceFrame helix-graph',
    )
    expect(normalize('.card__title___3xYz1 helix-card')).toBe('.card__title helix-card')
    expect(normalize('._title_1a2b3_7  helix-card')).toBe('._title helix-card')
  })

  test('the same fault in the next build has the same fingerprint, and another fault another', () => {
    const one = fingerprintOf({
      kind: 'dead-hook',
      subject: '.a__lFhy0q__b helix-card { --x }',
      tag: 'helix-card',
    })
    const next = fingerprintOf({
      kind: 'dead-hook',
      subject: '.a__Zq81Pw__b helix-card { --x }',
      tag: 'helix-card',
    })
    const other = fingerprintOf({
      kind: 'dead-part',
      subject: '.a__lFhy0q__b helix-card { --x }',
      tag: 'helix-card',
    })
    expect(one).toBe(next)
    expect(one).not.toBe(other)
    expect(one).toMatch(/^[0-9a-f]{14}$/)
  })

  test('a finding gets its category, its owner, and its family from the module path', () => {
    const own = index([
      {
        manifest: {
          modules: [
            { declarations: [{ tagName: 'helix-button' }], path: 'src/button/root/button-root.ts' },
          ],
        },
        name: '@fusion.dev/helix',
      },
    ])
    const found = identify(
      { kind: 'unforwarded-part', message: 'm', subject: 's', tag: 'helix-button' },
      own,
    )
    expect([found.category, found.owner, found.family]).toEqual(['styling', 'helix', 'button'])
    expect(
      identify({ kind: 'dead-part', message: 'm', subject: 's', tag: 'helix-button' }, own).owner,
    ).toBe('consumer')
  })
})

describe('configuration', () => {
  test('the file overrides the defaults, and the call overrides the file, field by field', () => {
    const { configuration, send } = resolveConfig(
      { console: { findings: 'warn' }, detail: { pages: 'full' }, send: { usage: false } },
      { detail: { hookValues: false }, send: { coverage: false, usage: true } },
    )
    expect(configuration.console).toEqual({ coverage: 'info', findings: 'warn', usage: 'debug' })
    expect(configuration.detail).toEqual({ evidence: 'full', hookValues: false, pages: 'full' })
    expect(send.usage).toEqual({ decidedBy: 'argument', on: true })
    expect(send.coverage).toEqual({ decidedBy: 'argument', on: false })
    expect(send.performance).toEqual({ decidedBy: 'shipped', on: false })
  })

  test('a setting that names nothing throws, and names the closest', () => {
    expect(() => checkConfig({ sends: {} } as never, 'file')).toThrow(
      /`sends`, which is no setting. The closest is `send`/,
    )
    expect(() => checkConfig({ send: { usag: true } } as never, 'argument')).toThrow(
      /`send.usag`.*closest is `send.usage`/,
    )
  })

  test('a value a setting cannot take throws, and says what it takes', () => {
    expect(() => checkConfig({ console: { findings: 'loud' } } as never, 'file')).toThrow(
      /`error`, `warn`, `info`, `off`/,
    )
    expect(() => checkConfig({ environments: { production: { sample: 2 } } }, 'file')).toThrow(
      /from 0 to 1/,
    )
    expect(() =>
      checkConfig({ environments: { production: { sample: 0.1 } } }, 'file'),
    ).not.toThrow()
  })

  test('a path becomes a pattern, each record named by it standing for any', () => {
    expect(pagePattern('/orders/1042/items/9f8e7d6c5b4a')).toBe('/orders/:id/items/:id')
    expect(pagePattern('/u/3f2504e0-4f89-11d3-9a0c-0305e82c3301/settings')).toBe('/u/:id/settings')
    expect(pagePattern('/docs/getting-started')).toBe('/docs/getting-started')
  })
})

describe('the run', () => {
  test('a run carries its schema, a new identity, its page as a pattern, and what was withheld', () => {
    document.body.innerHTML = ''
    const one = diagnose({
      environment: 'ci',
      page: '/products/1042',
      project: { key: 'secret', name: 'storefront', tags: ['fusion'] },
      send: { usage: false },
      tiers,
    })
    const two = diagnose({ tiers })
    expect(one.schema).toBe(1)
    expect(one.run.id).not.toBe(two.run.id)
    expect(one.run.environment).toBe('ci')
    expect(one.run.page).toBe('/products/:id')
    expect(one.project).toEqual({ name: 'storefront', tags: ['fusion'] })
    expect(JSON.stringify(one)).not.toContain('secret')
    expect(one.withheld).toEqual([
      { category: 'performance', decidedBy: 'shipped' },
      { category: 'usage', decidedBy: 'argument' },
    ])
    expect(one.versions.collector).toBe(VERSION)
    expect(diagnose({ detail: { pages: 'none' }, page: '/x', tiers }).run.page).toBeUndefined()
  })

  test('each finding in a run has a category, an owner, and a fingerprint', () => {
    const style = document.createElement('style')
    style.textContent = 'helix-button { --button-backgruond-color: red }'
    document.head.append(style)
    const [found] = diagnose({ tiers }).findings
    expect(found?.category).toBe('styling')
    expect(found?.owner).toBe('consumer')
    expect(found?.fingerprint).toMatch(/^[0-9a-f]{14}$/)
    style.remove()
  })
})

describe('versions', () => {
  const slot = Symbol.for('fusion.dev/helix/versions')
  const store = globalThis as Record<symbol, unknown>
  const versioned = (version: string) =>
    tiers.map((tier) => ({
      ...tier,
      manifest: { ...tier.manifest, helix: { package: tier.name, version } },
    }))

  test('a manifest naming another version than the page loads is one finding in place of all others', () => {
    store[slot] = ['0.136.0']
    const style = document.createElement('style')
    style.textContent = 'helix-button { --button-backgruond-color: red }'
    document.head.append(style)
    const run = diagnose({ tiers: versioned('0.130.0') })
    expect(run.findings.map((one) => [one.kind, one.subject])).toEqual([
      ['manifest-skew', '@fusion.dev/helix@0.130.0'],
      ['manifest-skew', '@fusion.dev/helix-headless@0.130.0'],
    ])
    expect(run.findings[0]?.message).toContain('the page runs Helix 0.136.0')
    expect(run.versions.helix).toEqual(['0.136.0'])
    expect(diagnose({ tiers: versioned('0.136.0') }).findings.map((one) => one.kind)).toEqual([
      'dead-hook',
    ])
    style.remove()
    delete store[slot]
  })

  test('with no version on either side, the run says none and judges as usual', () => {
    delete store[slot]
    const run = diagnose({ tiers })
    expect(run.versions.helix).toEqual([])
    expect(run.versions.manifests).toEqual({})
  })
})

describe('console levels', () => {
  test('findings print at or above the project’s floor, and the heading still counts them all', () => {
    const { entries, sink } = recording()
    report(
      {
        ...quiet,
        configuration: {
          ...quiet.configuration,
          console: { coverage: 'off', findings: 'error', usage: 'off' },
        },
        coverage: { read: 1, roots: 0, sheets: 1, unreadable: [] },
        findings: [finding('error'), finding('warn')],
      },
      sink,
    )
    expect(entries[0]).toEqual(['group', 'helix diagnostics: 1 error, 1 warning, 0 info'])
    expect(entries.map(([level]) => level)).toEqual(['group', 'error', 'groupEnd'])
  })

  test('findings turned off are counted in the heading, and said by kind and layer', () => {
    const { entries, sink } = recording()
    report(
      {
        ...quiet,
        configuration: {
          ...quiet.configuration,
          silenced: [{ count: 2, kind: 'unforwarded-part', layer: 'file' }],
        },
        coverage: { read: 1, roots: 0, sheets: 1, unreadable: [] },
        findings: [],
      },
      sink,
    )
    expect(entries[0]?.[1]).toBe('helix diagnostics: 0 errors, 0 warnings, 0 info, 2 turned off')
    expect(entries).toContainEqual(['info', '2 unforwarded-parts turned off by the file'])
  })
})

describe('attributes', () => {
  test('an attribute the element does not take is a finding, with the closest it does', () => {
    document.body.innerHTML = '<helix-button emphais="solid">Go</helix-button>'
    const [found] = markup(tags, document)
    expect([found?.kind, found?.subject, found?.expected]).toEqual([
      'unknown-attribute',
      '<helix-button emphais>',
      'emphasis',
    ])
    document.body.innerHTML = ''
  })

  test('a value outside a closed set is a finding, once however many elements carry it', () => {
    document.body.innerHTML =
      '<helix-button emphasis="bold"></helix-button><helix-button emphasis="bold"></helix-button><helix-button emphasis="solid" label="anything"></helix-button>'
    const found = markup(tags, document)
    expect(found.map((one) => [one.kind, one.subject])).toEqual([
      ['invalid-value', '<helix-button emphasis="bold">'],
    ])
    expect(found[0]?.message).toContain('On 2 elements.')
    document.body.innerHTML = ''
  })

  test('global attributes, framework prefixes, and Helix’s own markup are not findings', () => {
    document.body.innerHTML =
      '<helix-button class="a" id="b" slot="c" aria-label="d" data-e="f" hidden title="g" _ngcontent-abc="">Go</helix-button>'
    const host = document.createElement('helix-card')
    host.attachShadow({ mode: 'open' }).innerHTML = '<helix-button wrong="1"></helix-button>'
    document.body.append(host)
    expect(markup(tags, document)).toEqual([])
    document.body.innerHTML = ''
  })
})

describe('hooks set outside a Helix selector', () => {
  /** A page, its stylesheet, and the run's findings. */
  const run = (html: string, css: string) => {
    document.body.innerHTML = html
    const style = document.createElement('style')
    style.textContent = css
    document.head.append(style)
    const { answered, rules, used } = collect(document)
    const findings = analyze(rules, tags, document, answered, used).filter(
      (one) => one.kind === 'dead-hook',
    )
    style.remove()
    document.body.innerHTML = ''
    return findings
  }

  test('a hook on a class reaching an element that answers it is silent', () => {
    expect(
      run(
        '<div class="toolbar"><helix-button></helix-button></div>',
        '.toolbar { --button-radius: 0 }',
      ),
    ).toEqual([])
    expect(run('<helix-button></helix-button>', ':root { --button-radius: 0 }')).toEqual([])
  })

  test('a hook on a class matching elements none of which reach an answerer is a finding', () => {
    const [found] = run(
      '<div class="toolbar"></div><helix-button></helix-button>',
      '.toolbar { --button-radius: 0 }',
    )
    expect([found?.subject, found?.tag]).toEqual(['.toolbar { --button-radius }', 'helix-button'])
  })

  test('a selector matching nothing, or a page with nothing that answers, is left unjudged', () => {
    expect(run('<helix-button></helix-button>', '.elsewhere { --button-radius: 0 }')).toEqual([])
    expect(run('<div class="toolbar"></div>', '.toolbar { --button-radius: 0 }')).toEqual([])
  })

  test('a misspelled hook on a class is a finding, unless the page reads the name itself', () => {
    const [found] = run('<div class="toolbar"></div>', '.toolbar { --button-radios: 0 }')
    expect([found?.subject, found?.expected]).toEqual([
      '.toolbar { --button-radios }',
      '--button-radius',
    ])
    expect(
      run(
        '<div class="toolbar"></div>',
        '.toolbar { --button-radios: 0 } .x { width: var(--button-radios) }',
      ),
    ).toEqual([])
  })

  test('a class named like a tag is a class', () => {
    const [found] = run('<div class="helix-hero"></div>', '.helix-hero { --button-radios: 0 }')
    expect(found?.subject).toBe('.helix-hero { --button-radios }')
  })
})

describe('usage of hooks set outside a Helix selector', () => {
  test('a hook on a class counts for every tag that lists it, with its value', () => {
    const { rules } = ruled('.toolbar', ['--button-radius: 4px', '--my-own: 1'])
    expect(styled(rules, tags, new Map())).toEqual({
      hooks: { 'helix-button': { '--button-radius': 1 } },
      hookValues: { 'helix-button': { '--button-radius': { '4px': 1 } } },
      parts: {},
    })
  })
})

describe('hooks under a Helix selector, judged on what it matches now', () => {
  /** A page, its stylesheet, and the dead hooks found. */
  const dead = (html: string, css: string) => {
    document.body.innerHTML = html
    const style = document.createElement('style')
    style.textContent = css
    document.head.append(style)
    const { answered, rules, used } = collect(document)
    const findings = analyze(rules, tags, document, answered, used).filter(
      (one) => one.kind === 'dead-hook',
    )
    style.remove()
    document.body.innerHTML = ''
    return findings
  }

  test('an element the selector matches may answer the hook itself', () => {
    expect(
      dead(
        '<helix-breadcrumb><helix-button></helix-button></helix-breadcrumb>',
        'helix-breadcrumb > * { --button-radius: 0 }',
      ),
    ).toEqual([])
  })

  test('a selector matching nothing on this page is left for the page it is for', () => {
    expect(
      dead('<helix-button></helix-button>', '.elsewhere helix-breadcrumb { --button-radius: 0 }'),
    ).toEqual([])
  })
})

describe('a Helix component’s own sheets', () => {
  test('a private property a component sets is its own: read by it, never the page, and never a misspelled hook', () => {
    const host = document.createElement('helix-button')
    const root = host.attachShadow({ mode: 'open' })
    const style = document.createElement('style')
    style.textContent =
      ':host([tone="danger"]) { --_button-fill: red } [part="button"] { background: var(--_button-fill) }'
    root.append(style)
    document.body.append(host)
    const { answered, rules, used } = collect(document)
    expect(answered.get('helix-button')?.has('--_button-fill')).toBe(true)
    expect(used.has('--_button-fill')).toBe(false)
    expect(analyze(rules, tags, document, answered, used)).toEqual([])
    host.remove()
  })
})

describe('what the review of the examples found', () => {
  test('a hook the page reads itself is the page’s to use, wherever it is set', () => {
    document.body.innerHTML = '<helix-button></helix-button>'
    const style = document.createElement('style')
    style.textContent =
      'helix-button { --button-shade: red } helix-button::part(button) { color: var(--button-shade) }'
    document.head.append(style)
    const { answered, rules, used } = collect(document)
    expect(analyze(rules, tags, document, answered, used)).toEqual([])
    style.remove()
    document.body.innerHTML = ''
  })

  test('a token is never judged as a hook', () => {
    document.body.innerHTML = '<div class="x"></div><helix-button></helix-button>'
    const style = document.createElement('style')
    style.textContent = ':root { --helix-color-wel: red } .x { --helix-color-border: blue }'
    document.head.append(style)
    const { answered, rules, used } = collect(document)
    expect(analyze(rules, tags, document, answered, used)).toEqual([])
    style.remove()
    document.body.innerHTML = ''
  })

  test('a name three edits from a hook is no misspelling of it', () => {
    document.body.innerHTML = '<div class="x"></div>'
    const style = document.createElement('style')
    style.textContent = '.x { --button-radix-ab: 0 }'
    document.head.append(style)
    const { answered, rules, used } = collect(document)
    expect(analyze(rules, tags, document, answered, used)).toEqual([])
    style.remove()
    document.body.innerHTML = ''
  })

  test('an attribute a component writes on itself, named for a read-only member, is its own', () => {
    const own = index([
      {
        manifest: {
          modules: [
            {
              declarations: [
                {
                  attributes: [],
                  members: [
                    { kind: 'field', name: 'unread', readonly: true },
                    { kind: 'field', name: 'items' },
                  ],
                  tagName: 'helix-notifications',
                },
              ],
            },
          ],
        },
        name: '@fusion.dev/helix',
      },
    ])
    document.body.innerHTML = '<helix-notifications unread="2" items="x"></helix-notifications>'
    expect(markup(own, document).map((one) => one.subject)).toEqual(['<helix-notifications items>'])
    document.body.innerHTML = ''
  })
})

describe('a hook answered by a rule the page reads it in', () => {
  /** A page, its stylesheet, and the dead hooks found. */
  const dead = (html: string, css: string) => {
    document.body.innerHTML = html
    const style = document.createElement('style')
    style.textContent = css
    document.head.append(style)
    const { answered, readers, rules, used } = collect(document)
    const findings = analyze(rules, tags, document, answered, used, readers).filter(
      (one) => one.kind === 'dead-hook',
    )
    style.remove()
    document.body.innerHTML = ''
    return findings
  }
  const css = '[data-button] { border-radius: var(--button-radius) } .x { --button-radius: 0 }'

  test('an element a reading rule matches answers the hook, as a `[data-button]` link does', () => {
    expect(
      dead('<div class="x"><a data-button href="#">Go</a></div><helix-button></helix-button>', css),
    ).toEqual([])
  })

  test('a selector holding nothing a reading rule matches is a finding, though the page reads the hook elsewhere', () => {
    const [found] = dead('<div class="x"></div><a data-button href="#">Go</a>', css)
    expect(found?.subject).toBe('.x { --button-radius }')
  })

  test('a hook set on a moment, such as focus, is judged on the element it is set on', () => {
    expect(
      dead(
        '<div class="x"><helix-button></helix-button></div>',
        '.x:focus-visible { --button-radius: 0 }',
      ),
    ).toEqual([])
  })
})
