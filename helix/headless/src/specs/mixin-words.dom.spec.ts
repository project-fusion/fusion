import '@fusion.dev/helix-testing/dom/register'
import { afterEach, beforeAll, describe, expect, test } from 'bun:test'
import type {
  clearWords as ClearWords,
  registerWords as RegisterWords,
} from '@fusion.dev/helix-core'
import { part, registerDom, settle, type Updatable } from '@fusion.dev/helix-testing/dom'

/* Imported once the DOM is registered: core reads the globals it finds as
   it is evaluated, and a static import breaks the DOM when this file runs
   first. */
let clearWords: typeof ClearWords
let registerWords: typeof RegisterWords

/**
 * The words the shared mixins own, on the registry: the dismiss control's
 * name, the empty and loading texts, the count of the tokens past the cap,
 * the segments' words, a chart's position, and a field's own sentence for a
 * required value. Each resolves under the family's key, so a page registers
 * it for the family as it does the family's own words, and a family that
 * rewords one (Tag's "Remove {label}") is the English the registry replaces.
 */
beforeAll(async () => {
  registerDom()
  ;({ clearWords, registerWords } = await import('@fusion.dev/helix-core'))
  /* The families this exercises, not the barrel: see `native-events.dom.spec.ts`
     for why importing the barrel here would empty `hydration.dom.spec.ts`. */
  await Promise.all([
    import('../callout/index.js'),
    import('../checkbox/index.js'),
    import('../date-input/index.js'),
    import('../filter-input/index.js'),
    import('../line-chart/index.js'),
    import('../option/index.js'),
    import('../select/index.js'),
    import('../switch/index.js'),
    import('../tag/index.js'),
    import('../tree/index.js'),
  ])
})

afterEach(() => {
  clearWords()
  document.body.innerHTML = ''
})

/** The first element of a tag inside a German page, once it has drawn. */
const german = async <T extends Updatable>(markup: string, tag: string): Promise<T> => {
  document.body.innerHTML = `<div lang="de">${markup}</div>`
  const host = document.querySelector(tag) as T
  await settle(host)
  return host
}

describe('the dismiss control', () => {
  test('is named by the words registered for the family', async () => {
    registerWords('de', { 'helix-callout': { dismissLabel: 'Schließen' } })
    const host = await german(
      '<helix-headless-callout dismissible>Text</helix-headless-callout>',
      'helix-headless-callout',
    )
    expect(part(host, 'dismiss')?.getAttribute('aria-label')).toBe('Schließen')
  })

  test("takes a family's own English, which the registry replaces", async () => {
    const english = await german(
      '<helix-headless-tag dismissible>Apfel</helix-headless-tag>',
      'helix-headless-tag',
    )
    expect(part(english, 'dismiss')?.getAttribute('aria-label')).toBe('Remove Apfel')
    registerWords('de', {
      'helix-filter-chip': { dismissLabel: 'Filter entfernen' },
      'helix-tag': { dismissLabel: '{label} entfernen' },
    })
    const tag = await german(
      '<helix-headless-tag dismissible>Apfel</helix-headless-tag>',
      'helix-headless-tag',
    )
    expect(part(tag, 'dismiss')?.getAttribute('aria-label')).toBe('Apfel entfernen')
    const chip = await german(
      '<helix-headless-filter-chip label="Status" dismissible></helix-headless-filter-chip>',
      'helix-headless-filter-chip',
    )
    expect(part(chip, 'dismiss')?.getAttribute('aria-label')).toContain('Filter entfernen')
  })
})

describe('a collection', () => {
  test('says the empty text registered for the family', async () => {
    registerWords('de', { 'helix-tree': { emptyText: 'Nichts zu zeigen' } })
    const host = await german(
      '<helix-headless-tree label="T"></helix-headless-tree>',
      'helix-headless-tree',
    )
    expect((host as Updatable & { emptyText: string }).emptyText).toBe('Nichts zu zeigen')
    expect(part(host, 'empty')?.textContent?.trim()).toBe('Nichts zu zeigen')
  })
})

describe('a row of tokens', () => {
  test('writes the count past the cap, and names its button, in the words registered', async () => {
    registerWords('de', {
      'helix-date-input': { expandLabel: 'Alle zeigen', restText: 'und {count} weitere' },
    })
    const host = await german(
      `<helix-headless-date-input label="Daten" mode="multiple" max-tags="1" expandable
        default-value="2026-08-04,2026-08-11,2026-08-18"></helix-headless-date-input>`,
      'helix-headless-date-input',
    )
    const rest = part(host, 'rest')
    expect(rest?.textContent?.trim()).toBe('und 2 weitere')
    expect(rest?.getAttribute('aria-label')).toBe('Alle zeigen')
  })
})

describe('a row of segments', () => {
  test('says an empty segment and reports a missing date in the words registered', async () => {
    registerWords('de', {
      'helix-date-input': {
        emptyMessage: '{kind, select, date {Datum eingeben.} other {Uhrzeit eingeben.}}',
        emptySegmentLabel: 'Leer',
      },
    })
    const host = await german(
      '<helix-headless-date-input label="Datum" segmented required></helix-headless-date-input>',
      'helix-headless-date-input',
    )
    const segment = host.shadowRoot?.querySelector('[part~="segment"]')
    expect(segment?.getAttribute('aria-valuetext')).toBe('Leer')
    expect((host as Updatable & { validationMessage: string }).validationMessage).toBe(
      'Datum eingeben.',
    )
  })

  test('reports a date half typed in its English where nothing is registered', async () => {
    const host = await german(
      '<helix-headless-date-input label="Datum" segmented required></helix-headless-date-input>',
      'helix-headless-date-input',
    )
    expect((host as Updatable & { validationMessage: string }).validationMessage).toBe(
      'Enter a date.',
    )
  })
})

describe('a chart', () => {
  test('says the position registered for the family', async () => {
    registerWords('de', { 'helix-line-chart': { positionLabel: '{position} von {count}' } })
    const host = await german(
      '<helix-headless-line-chart></helix-headless-line-chart>',
      'helix-headless-line-chart',
    )
    expect((host as Updatable & { positionLabel: string }).positionLabel).toBe(
      '{position} von {count}',
    )
  })
})

describe("a field's own sentence for a required value", () => {
  const reported = async (markup: string, tag: string): Promise<string> =>
    ((await german(markup, tag)) as Updatable & { validationMessage: string }).validationMessage

  test('is its English, and the words registered for the family where there are some', async () => {
    expect(
      await reported(
        '<helix-headless-checkbox required>A</helix-headless-checkbox>',
        'helix-headless-checkbox',
      ),
    ).toBe('Tick this box to continue.')
    registerWords('de', {
      'helix-checkbox': { valueMissingMessage: 'Bitte ankreuzen.' },
      'helix-switch': { valueMissingMessage: 'Bitte einschalten.' },
    })
    expect(
      await reported(
        '<helix-headless-checkbox required>A</helix-headless-checkbox>',
        'helix-headless-checkbox',
      ),
    ).toBe('Bitte ankreuzen.')
    expect(
      await reported(
        '<helix-headless-switch required>A</helix-headless-switch>',
        'helix-headless-switch',
      ),
    ).toBe('Bitte einschalten.')
  })

  test("keeps the page's own sentence over the registry", async () => {
    registerWords('de', { 'helix-select': { valueMissingMessage: 'Bitte wählen.' } })
    expect(
      await reported(
        `<helix-headless-select label="S" required value-missing-message="Eine Farbe, bitte.">
          <helix-headless-option value="a">A</helix-headless-option>
        </helix-headless-select>`,
        'helix-headless-select',
      ),
    ).toBe('Eine Farbe, bitte.')
  })
})
