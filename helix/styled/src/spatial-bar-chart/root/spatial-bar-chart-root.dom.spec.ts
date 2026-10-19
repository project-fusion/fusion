import '@fusion.dev/helix-testing/dom/register'
import { beforeAll, describe, expect, test } from 'bun:test'
import { mount, part, registerDom } from '@fusion.dev/helix-testing/dom'

/* The styled tier, which is paint over the headless frame. The bars, the
 * keys, and the connection are the headless tier's and the plot package's. */

beforeAll(async () => {
  registerDom()
  await import('../index.js')
})

/** Every sheet the chart adopts, as one text. */
const sheet = (): string => {
  const declared = (customElements.get('helix-spatial-bar-chart') as unknown as { styles: unknown })
    .styles
  return (Array.isArray(declared) ? declared : [declared])
    .flat(Number.POSITIVE_INFINITY)
    .map((one) => String((one as { cssText?: string }).cssText ?? ''))
    .join('\n')
}

describe('the styled spatial bar chart', () => {
  test('its plot takes focus, it draws itself in SVG, and each bar takes its series color', async () => {
    const host = await mount(`<div>
      <table id="signups" data-hidden-visually>
        <thead><tr><th>Region</th><th>Q1</th><th>Q2</th></tr></thead>
        <tbody>
          <tr><th scope="row">North</th><td>420</td><td>465</td></tr>
        </tbody>
      </table>
      <helix-spatial-bar-chart for="signups" label="Signups"></helix-spatial-bar-chart>
    </div>`)
    const element = host.querySelector('helix-spatial-bar-chart') as HTMLElement & {
      updateComplete: Promise<unknown>
    }
    await element.updateComplete
    expect(part(element, 'plot')?.getAttribute('tabindex')).toBe('0')
    expect(part(element, 'drawing')?.localName).toBe('svg')
    expect(sheet()).toContain('--chart-series-1')
    expect(sheet()).toContain('--spatial-bar-chart-shade')
  })

  test('takes emphasis and material as every chart does', () => {
    expect(sheet()).toContain(':host([emphasis="outlined"])')
    expect(sheet()).toContain(':host([material="glass"])')
  })

  test('under forced colors, the bar the keys rest on is outlined in the highlight', () => {
    const forced = sheet().split('@media (forced-colors: active)')[1] ?? ''
    expect(forced).toContain('Highlight')
  })
})
