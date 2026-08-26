import { beforeAll, describe, expect, test } from 'bun:test'
import { mount, part, registerDom, role } from '@helix-io/testing/dom'

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
  test('it is still a named picture', async () => {
    expect(role(await strip())).toBe('img')
  })

  test('a cell per reading, each carrying its tone', async () => {
    const element = await strip()
    const cells = [...(element.shadowRoot?.querySelectorAll('[part="cell"]') ?? [])]
    expect(cells).toHaveLength(2)
    expect(cells.map((cell) => cell.getAttribute('data-tone'))).toEqual(['success', 'danger'])
  })

  test('the footer is drawn for the slots to land in', async () => {
    expect(part(await strip(), 'footer')).not.toBeNull()
  })
})
