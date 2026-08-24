import { beforeAll, describe, expect, test } from 'bun:test'
import { mount, part, registerDom } from '@helix-io/testing/dom'

beforeAll(async () => {
  registerDom()
  await import('../index.js')
})

type Tab = HTMLElement & { disabled: boolean; selected: boolean; value: string; select(): void }

const tab = async (attributes = ''): Promise<Tab> =>
  (await mount(`<helix-base-tabs-tab value="one" ${attributes}>One</helix-base-tabs-tab>`)) as Tab

/**
 * One tab, and the contract that is the tab's rather than the strip's.
 *
 * **The strip already proves the coordination**, which is roving focus, arrow
 * keys and which panel a selection reveals: that is the only arrangement those
 * mean anything in, and it is named 146 times in this family's specs. What is
 * left over is what one tab answers for alone, and every assertion here is
 * about a tab with no strip around it.
 */
describe('one tab', () => {
  /* Announcing is the tab's own act and refusing is too: a disabled tab is one
     the reader may not go to, so it says nothing rather than saying it quietly
     and leaving the strip to decide. */
  test('announces its value when selected, and stays silent when it is refusing', async () => {
    const host = await tab()
    const heard: string[] = []
    host.addEventListener('helix-select', (event) => {
      heard.push((event as CustomEvent<{ value: string }>).detail.value)
    })
    host.select()
    expect(heard).toEqual(['one'])

    const refusing = await tab('disabled')
    let ignored = 0
    refusing.addEventListener('helix-select', () => {
      ignored += 1
    })
    refusing.select()
    expect(ignored).toBe(0)
  })

  /* Both states reflect, so a document rule can select them and a server can
     emit them. A tab that knew it was selected and did not say so on the host
     would be a tab a stylesheet cannot draw. */
  test('mirrors selected and disabled to the host, where a stylesheet reads them', async () => {
    const host = await tab('selected disabled')
    expect(host.hasAttribute('selected')).toBe(true)
    expect(host.hasAttribute('disabled')).toBe(true)
    host.selected = false
    await (host as unknown as { updateComplete: Promise<boolean> }).updateComplete
    expect(host.hasAttribute('selected')).toBe(false)
  })

  test('draws the tab part that carries its label', async () => {
    const host = await tab()
    expect(part(host, 'tab')).not.toBeNull()
    expect(host.textContent?.trim()).toBe('One')
  })
})
