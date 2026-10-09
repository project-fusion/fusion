import { beforeAll, describe, expect, test } from 'bun:test'
import { mount, part, registerDom } from '@fusion.dev/helix-testing/dom'

/* The styled tier, which is paint over the headless frame. The grid, the
 * keys, and the connection are the headless tier's and the plot package's. */

beforeAll(async () => {
  registerDom()
  await import('../index.js')
})

/** Every sheet the chart adopts, as one text. */
const sheet = (): string => {
  const declared = (
    customElements.get('helix-spatial-surface-chart') as unknown as { styles: unknown }
  ).styles
  return (Array.isArray(declared) ? declared : [declared])
    .flat(Number.POSITIVE_INFINITY)
    .map((one) => String((one as { cssText?: string }).cssText ?? ''))
    .join('\n')
}

describe('the styled spatial surface chart', () => {
  test('its plot takes focus, it draws itself in SVG, and its faces are shaded along the ramp', async () => {
    const host = await mount(`<div>
      <table id="load" data-hidden-visually>
        <thead><tr><th>Slot</th><th>Hour</th><th>Day</th><th>Load</th></tr></thead>
        <tbody>
          <tr><th scope="row">Mon 0h</th><td>0</td><td>1</td><td>10</td></tr>
          <tr><th scope="row">Mon 1h</th><td>1</td><td>1</td><td>30</td></tr>
        </tbody>
      </table>
      <helix-spatial-surface-chart for="load" label="Load"></helix-spatial-surface-chart>
    </div>`)
    const element = host.querySelector('helix-spatial-surface-chart') as HTMLElement & {
      updateComplete: Promise<unknown>
    }
    await element.updateComplete
    expect(part(element, 'plot')?.getAttribute('tabindex')).toBe('0')
    expect(part(element, 'drawing')?.localName).toBe('svg')
    expect(sheet()).toContain('--spatial-surface-chart-high')
    expect(sheet()).toContain('--spatial-surface-chart-low')
  })

  test('under forced colors, the place the keys rest on is ringed in the highlight', () => {
    const forced = sheet().split('@media (forced-colors: active)')[1] ?? ''
    expect(forced).toContain('Highlight')
  })
})
