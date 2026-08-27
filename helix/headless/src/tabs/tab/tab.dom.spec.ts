import { beforeAll, describe, expect, test } from 'bun:test'
import { hasState, mount, part, registerDom } from '@helix-io/testing/dom'

beforeAll(async () => {
  registerDom()
  await import('../index.js')
})

type Tab = HTMLElement & { disabled: boolean; selected: boolean; value: string; select(): void }

const tab = async (attributes = ''): Promise<Tab> =>
  (await mount(`<helix-headless-tab value="one" ${attributes}>One</helix-headless-tab>`)) as Tab

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

  /* **The two are kept in different places now, and the split is the point.**
     `disabled` is a consumer's declaration and reflects, so a document rule can
     select it and a server can emit it. `selected` is the tab strip's own
     bookkeeping: reflected, it wrote a choice onto markup a consumer's server
     never sent, which React reconciles and reports. It is an
     `ElementInternals.states` entry now, which is not in the DOM at all, and
     `:host(:state(selected))` is what the stylesheet reads. See 302 and 304.

     **What is asserted is that the attribute does not follow.** A consumer who
     typed `selected` still has it: removing reflection stops the element writing
     the attribute, not the consumer. So the test types one, moves the property
     the other way, and asks for the state to have moved while the markup stayed
     exactly as it was written. Asserting the attribute merely absent would have
     been asserting the opposite of what a seed does, and did, until the run
     failed. */
  test('moves its own state and leaves the markup a consumer wrote alone', async () => {
    const host = await tab('selected disabled')
    expect(hasState(host, 'selected')).toBe(true)
    expect(host.hasAttribute('disabled')).toBe(true)

    host.selected = false
    await (host as unknown as { updateComplete: Promise<boolean> }).updateComplete

    expect(hasState(host, 'selected')).toBe(false)
    /* Still there, and untouched: the seed is the consumer's and this element
       has no business editing it. Before 302 this read `false`, because the
       element reflected its own answer back over what was typed. */
    expect(host.hasAttribute('selected')).toBe(true)
  })

  test('draws the tab part that carries its label', async () => {
    const host = await tab()
    expect(part(host, 'tab')).not.toBeNull()
    expect(host.textContent?.trim()).toBe('One')
  })
})
