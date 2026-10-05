import { beforeAll, describe, expect, test } from 'bun:test'
import { mount, part, registerDom } from '@fusion.dev/helix-testing/dom'

/* The styled tier, which is paint over the headless behavior. The tones, the
 * bucketing and the published count are the headless tier's and are asserted
 * there. */

beforeAll(async () => {
  registerDom()
  await import('../index.js')
})

const strip = async (attributes = '') => {
  const host = await mount(
    `<div>
      <table id="uptime" data-hidden-visually>
        <caption>Uptime</caption>
        <tbody>
          <tr><th scope="row">Mon</th><td data-value="1" data-tone="success">100%</td></tr>
          <tr><th scope="row">Tue</th><td data-value="0.8" data-tone="danger">80%</td></tr>
        </tbody>
      </table>
      <helix-heatmap for="uptime" label="Uptime" ${attributes}></helix-heatmap>
    </div>`,
  )
  const element = host.querySelector('helix-heatmap') as HTMLElement & {
    updateComplete: Promise<unknown>
  }
  await element.updateComplete
  return element
}

describe('the styled heatmap', () => {
  /* A strip with cells is read by key, as every chart's plot is. */
  test('its strip takes focus to be read by key', async () => {
    const element = await strip()
    expect(part(element, 'strip')?.getAttribute('role')).toBe('application')
    expect(part(element, 'strip')?.getAttribute('tabindex')).toBe('0')
  })

  /* The styled class reads the base's observed attributes, so a host
     `aria-label` reaches the strip on this tier too. */
  test('an aria-label on the host names it', async () => {
    const element = await strip('aria-label="Uptime this week"')
    expect(part(element, 'strip')?.getAttribute('aria-label')).toBe('Uptime this week')
  })

  test('a cell per reading, each carrying its tone', async () => {
    const element = await strip()
    const cells = [...(element.shadowRoot?.querySelectorAll('[part~="cell"]') ?? [])]
    expect(cells).toHaveLength(2)
    expect(cells.map((cell) => cell.getAttribute('data-tone'))).toEqual(['success', 'danger'])
  })

  test('the footer is drawn for the slots to land in', async () => {
    expect(part(await strip(), 'footer')).not.toBeNull()
  })

  /**
   * **The seam, asserted from the side that would not have noticed.** A
   * `var(--helix-color-success)` written onto a cell by the base tier is correct
   * here and names nothing at all one tier down, and the failure is not an
   * undefined property: it is an *invalid* one, so
   * `background-color: var(--heatmap-tone, …)` declines its own fallback and the
   * cell paints transparent. A styled page looks perfect throughout, which is
   * why nothing else catches it. What the cell may carry is a `--heatmap-*` name.
   */
  test('a cell names a heatmap hook and never a token', async () => {
    const element = await strip()
    const cells = [...(element.shadowRoot?.querySelectorAll('[part~="cell"]') ?? [])]
    for (const cell of cells) {
      const declared = cell.getAttribute('style') ?? ''
      expect(declared).toContain('--heatmap-tone: var(--heatmap-tone-')
      expect(declared).not.toContain('--helix-')
    }
  })

  /**
   * The other half of the same seam: a name the base tier wrote has to be worth
   * something here, or the cell resolves to the invalid value and paints
   * nothing.
   *
   * Read off the sheet rather than off `getComputedStyle`, because happy-dom
   * does not resolve a custom property declared in an adopted stylesheet's
   * `:host` and reports every one of these as the empty string. The browser is
   * where the cascade is exercised; here the fact worth holding is that the
   * declaration exists at all, which is what was missing.
   */
  test('this tier is what the names are worth', async () => {
    /* Imported here rather than at the top of the file: the sheet pulls in
       `@fusion.dev/helix-core`, and a module that touches the DOM globals before
       `registerDom` has installed them takes happy-dom's parser down with it. */
    const { styles } = await import('./heatmap-root.css.js')
    const declared = [styles].flat().map(String).join('\n')
    for (const name of ['success', 'warning', 'danger', '1', '2', '3', '4', '5']) {
      expect(declared).toContain(`--heatmap-tone-${name}:`)
    }
  })

  /**
   * **A track the size of a cell, or the weeks splay.** An implicit column left
   * at `auto` absorbs the free space in the box: ten weeks in 592 pixels came
   * out as nine tracks of 62 holding 12px cells, correct cells 50 pixels apart.
   */
  test('a column is the width of a cell, not of the room going spare', async () => {
    const element = await strip('rows="2"')
    const laid = getComputedStyle(part(element, 'strip') as HTMLElement)
    expect(laid.gridAutoColumns).not.toBe('auto')
    expect(laid.justifyContent).toBe('start')
  })
})
