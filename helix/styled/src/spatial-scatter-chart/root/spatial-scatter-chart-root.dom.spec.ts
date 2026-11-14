import '@fusion.dev/helix-testing/dom/register'
import { beforeAll, describe, expect, test } from 'bun:test'
import { mount, part, registerDom, unweighted } from '@fusion.dev/helix-testing/dom'

/* The styled tier, which is paint over the headless frame. The points, the
 * keys, and the connection are the headless tier's and the plot package's. */

beforeAll(async () => {
  registerDom()
  await import('../index.js')
})

/** Every sheet the chart adopts, as one text. */
const sheet = (): string => {
  const declared = (
    customElements.get('helix-spatial-scatter-chart') as unknown as { styles: unknown }
  ).styles
  return unweighted(
    (Array.isArray(declared) ? declared : [declared])
      .flat(Number.POSITIVE_INFINITY)
      .map((one) => String((one as { cssText?: string }).cssText ?? ''))
      .join('\n'),
  )
}

describe('the styled spatial scatter chart', () => {
  test('its plot takes focus, and its own drawing colors each group by a series token', async () => {
    const host = await mount(`<div>
      <table id="people" data-hidden-visually>
        <thead><tr><th>Name</th><th>Team</th><th>Age</th><th>Tenure</th><th>Score</th></tr></thead>
        <tbody>
          <tr><th scope="row">Ada</th><td>Core</td><td>36</td><td>4</td><td>81</td></tr>
          <tr><th scope="row">Grace</th><td>Tools</td><td>52</td><td>11</td><td>93</td></tr>
        </tbody>
      </table>
      <helix-spatial-scatter-chart for="people" group-by="Team" label="People"></helix-spatial-scatter-chart>
    </div>`)
    const element = host.querySelector('helix-spatial-scatter-chart') as HTMLElement & {
      updateComplete: Promise<unknown>
    }
    await element.updateComplete
    expect(part(element, 'plot')?.getAttribute('tabindex')).toBe('0')
    expect(element.shadowRoot?.querySelectorAll('[part~="point"]')).toHaveLength(2)
    expect(sheet()).toMatch(
      /--chart-series-2:\s*light-dark\(var\(--helix-color-series-2\), var\(--helix-color-series-10\)\)/,
    )
  })

  test('under forced colors, a point keeps its color and takes an edge in the text color', () => {
    const forced = sheet().split('@media (forced-colors: active)')[1] ?? ''
    expect(forced).toContain('forced-color-adjust: none')
    expect(forced).toContain('CanvasText')
  })
})
