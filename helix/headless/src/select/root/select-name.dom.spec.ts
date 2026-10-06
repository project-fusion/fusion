import { beforeAll, describe, expect, test } from 'bun:test'
import { hasLayout, mount, part, registerDom } from '@fusion.dev/helix-testing/dom'

/**
 * A select's trigger is named by its label and then its choice.
 *
 * **A button is named by its label alone.** Read from Chromium's tree, a
 * Select showing "Spanish" was a button named "Language", so a reader never
 * heard what was chosen. A native `<select>` says both.
 */
beforeAll(async () => {
  registerDom()
  await import('../index.js')
  await import('../../option/index.js')
})

const OPTIONS = `<helix-headless-option value="en">English</helix-headless-option>
  <helix-headless-option value="es">Spanish</helix-headless-option>`

describe('a select trigger', () => {
  test('is named by the label and the value, in that order', async () => {
    const host = await mount(
      `<helix-headless-select label="Language" default-value="es">${OPTIONS}</helix-headless-select>`,
    )
    const trigger = part(host, 'trigger') as HTMLElement
    const ids = (trigger.getAttribute('aria-labelledby') ?? '').split(' ')
    const words = ids.map((id) => host.shadowRoot?.getElementById(id)?.textContent?.trim())
    expect(words).toEqual(['Language', 'Spanish'])
  })

  test('leaves the name to a consumer who wrote aria-labelledby', async () => {
    const host = await mount(
      `<helix-headless-select aria-labelledby="outside" label="Language">${OPTIONS}</helix-headless-select>`,
    )
    expect((part(host, 'trigger') as HTMLElement).hasAttribute('aria-labelledby')).toBe(false)
  })

  /* Only in a real engine, which reflects element references: happy-dom does
     not, and the component feature-tests it. Measured before this: a select
     named by a host `aria-labelledby` was a button named by the label alone. */
  if (hasLayout()) {
    test('and names it by that and then the value', async () => {
      const host = await mount(
        `<helix-headless-select aria-labelledby="outside" default-value="es">${OPTIONS}</helix-headless-select>
        <span id="outside">Language</span>`,
      )
      const trigger = part(host, 'trigger') as HTMLElement & { ariaLabelledByElements: Element[] }
      const words = (): (string | undefined)[] =>
        trigger.ariaLabelledByElements.map((one) => one.textContent?.trim())
      expect(words()).toEqual(['Language', 'Spanish'])
      /* And still after focus arrives, when the forwarding runs again. */
      trigger.focus()
      expect(words()).toEqual(['Language', 'Spanish'])
    })

    /* The trigger named itself by its value, so a page's `<label for>` named
       only the host: read from Chromium's tree, a button named "Choose". */
    test('and names it by a label the page wrote, then the value', async () => {
      const host = await mount(
        `<label for="fruit">Fruit</label>
        <helix-headless-select id="fruit" default-value="es">${OPTIONS}</helix-headless-select>`,
      )
      const select = host.parentElement?.querySelector('helix-headless-select') as HTMLElement
      await (select as HTMLElement & { updateComplete: Promise<unknown> }).updateComplete
      const trigger = part(select, 'trigger') as HTMLElement & {
        ariaLabelledByElements: Element[]
      }
      expect(trigger.ariaLabelledByElements.map((one) => one.textContent?.trim())).toEqual([
        'Fruit',
        'Spanish',
      ])
    })
  }
})

/**
 * What the console was warned while `markup` mounted and settled, with nothing
 * printed. The warning is in development builds only, so this needs
 * `bun test --conditions helix-development`, which the package's scripts pass.
 */
const warnedOn = async (markup: string): Promise<string[]> => {
  const warnings: string[] = []
  const original = console.warn
  console.warn = (message: string) => warnings.push(message)
  try {
    await mount(markup)
    await new Promise((done) => setTimeout(done, 5))
  } finally {
    console.warn = original
  }
  return warnings
}

describe('an unnamed select', () => {
  /* Measured before this: two warnings, the second for the list inside, which
     the page never wrote and cannot name. */
  test('is reported once, for itself and not for its list', async () => {
    const warnings = await warnedOn(
      '<helix-headless-select><helix-headless-option value="a">Alpha</helix-headless-option></helix-headless-select>',
    )
    expect(warnings.filter((one) => one.includes('no accessible name'))).toHaveLength(1)
    expect(warnings.some((one) => one.includes('<helix-headless-select>'))).toBe(true)
  })

  test('names its list by `list-label`, which a name for the select replaces', async () => {
    const host = await mount(
      `<helix-headless-select list-label="Fruits">${OPTIONS}</helix-headless-select>`,
    )
    expect(part(host, 'listbox')?.getAttribute('aria-label')).toBe('Fruits')
    const named = await mount(
      `<helix-headless-select aria-label="Fruit" list-label="Fruits">${OPTIONS}</helix-headless-select>`,
    )
    expect(part(named, 'listbox')?.getAttribute('aria-label')).toBe('Fruit')
  })
})
