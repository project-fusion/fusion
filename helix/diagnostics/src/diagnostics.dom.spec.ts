import { beforeAll, describe, expect, test } from 'bun:test'
import { registerDom } from '@fusion.dev/helix-testing/dom'

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

const { analyze } = await import('./analyze.js')
const { collect } = await import('./collect.js')
const { diagnose } = await import('./index.js')
const { index, nearest } = await import('./manifest.js')
const { report } = await import('./console.js')

/** Two tiers, shaped like the real manifests and small enough to read. */
const tiers = [
  {
    manifest: {
      modules: [
        {
          declarations: [
            {
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
        style: declarations.map((text) => text.split(':')[0]?.trim() ?? ''),
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
            { hooks: new Map([['--borrowed-from-elsewhere', new Set(['t'])]]), parts: new Map() },
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

describe('the report', () => {
  test('diagnose refuses to run with no manifest', () => {
    expect(() => diagnose({ tiers: [] })).toThrow(/at least one manifest/)
  })

  test('coverage is printed on a clean run, so an empty result cannot read as a pass', () => {
    const lines: string[] = []
    const sink = { log: (text: string) => lines.push(text) } as unknown as Console
    report({ coverage: { read: 3, roots: 0, sheets: 19, unreadable: [] }, findings: [] }, sink)
    expect(lines[0]).toContain('read 3 of 19')
    expect(lines.join('\n')).toContain('were not checked')
  })

  test('a finding prints its receipt', () => {
    const lines: string[] = []
    const sink = { log: (text: string) => lines.push(text) } as unknown as Console
    report(
      {
        coverage: { read: 1, roots: 0, sheets: 1, unreadable: [] },
        findings: [
          {
            kind: 'dead-part',
            message: 'nope',
            origin: { cssText: 'helix-button::part(x) { }', index: 4, sheet: 'app.css' },
            subject: 'helix-button::part(x)',
          },
        ],
      },
      sink,
    )
    const text = lines.join('\n')
    expect(text).toContain('app.css, rule 4')
    expect(text).toContain('helix-button::part(x) { }')
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
