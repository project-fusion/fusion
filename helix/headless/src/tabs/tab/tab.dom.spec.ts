import '@fusion.dev/helix-testing/dom/register'
import { beforeAll, describe, expect, test } from 'bun:test'
import { hasState, mount, part, registerDom } from '@fusion.dev/helix-testing/dom'

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
 * mean anything in. What is left over is what one tab answers for alone, and
 * every assertion here is about a tab with no strip around it.
 */
describe('one tab', () => {
  /* Announcing is the tab's own act and refusing is too: a disabled tab is one
     the reader may not go to, so it says nothing rather than saying it quietly
     and leaving the strip to decide. */
  test('announces its value when selected, and stays silent when it is refusing', async () => {
    const host = await tab()
    const heard: string[] = []
    host.addEventListener('helix-before-select', (event) => {
      heard.push((event as CustomEvent<{ value: string }>).detail.value)
    })
    host.select()
    expect(heard).toEqual(['one'])

    const refusing = await tab('disabled')
    let ignored = 0
    refusing.addEventListener('helix-before-select', () => {
      ignored += 1
    })
    refusing.select()
    expect(ignored).toBe(0)
  })

  /* A script's `click()` lands on the host, which answers nothing, so it chose
     no tab where a press on the control does. */
  test('is chosen by its own click(), once, as by a press on its control', async () => {
    const host = await tab()
    const heard: string[] = []
    host.addEventListener('helix-before-select', (event) => {
      heard.push((event as CustomEvent<{ value: string }>).detail.value)
    })
    let clicks = 0
    host.addEventListener('click', () => {
      clicks += 1
    })
    host.click()
    expect(heard).toEqual(['one'])
    expect(clicks).toBe(1)
  })

  /* **The two live in different places, and the split is the point.**
     `disabled` is a consumer's declaration and reflects, so a document rule can
     select it and a server can emit it. `selected` is the tab strip's own
     bookkeeping: reflected, it writes a choice onto markup a consumer's server
     never sent, which React reconciles and reports. It is an
     `ElementInternals.states` entry, which is not in the DOM at all, and
     `:host(:state(selected))` is what the stylesheet reads.

     **What is asserted is that the attribute does not follow.** A consumer who
     typed `selected` still has it: removing reflection stops the element writing
     the attribute, not the consumer. So the test types one, moves the property
     the other way, and asks for the state to have moved while the markup stayed
     exactly as it was written. Asserting the attribute merely absent would
     assert the opposite of what a seed does. */
  test('moves its own state and leaves the markup a consumer wrote alone', async () => {
    const host = await tab('selected disabled')
    expect(hasState(host, 'selected')).toBe(true)
    expect(host.hasAttribute('disabled')).toBe(true)

    host.selected = false
    await (host as unknown as { updateComplete: Promise<boolean> }).updateComplete

    expect(hasState(host, 'selected')).toBe(false)
    /* Still there, and untouched: the seed is the consumer's and this element
       has no business editing it. */
    expect(host.hasAttribute('selected')).toBe(true)
  })

  test('draws the tab part that carries its label', async () => {
    const host = await tab()
    expect(part(host, 'tab')).not.toBeNull()
    expect(host.textContent?.trim()).toBe('One')
  })

  /* `focus()` on the host left focus where it was, for a button tab and a link
     tab alike: the host is not focusable and delegates nothing. */
  test('takes focus on its control when a script focuses it', async () => {
    for (const attributes of ['', 'href="#one"']) {
      const host = await tab(attributes)
      host.focus()
      expect(host.shadowRoot?.activeElement).toBe(part(host, 'tab'))
    }
  })
})

describe('a dismissible tab', () => {
  /* Web Awesome's closable tab: the tab asks, and the page removes it. */
  test('asks to close on a press of its mark, and is not chosen by it', async () => {
    const host = await tab('dismissible')
    const heard: string[] = []
    host.addEventListener('helix-dismiss', (event) => {
      heard.push((event as CustomEvent<{ label: string }>).detail.label)
    })
    host.addEventListener('helix-before-select', () => heard.push('select'))
    ;(part(host, 'dismiss') as HTMLElement).click()
    expect(heard).toEqual(['One'])
    expect(part(host, 'dismiss')?.getAttribute('aria-hidden')).toBe('true')
  })

  test('asks on Delete and Backspace, and says so through aria-keyshortcuts', async () => {
    const host = await tab('dismissible')
    const control = part(host, 'tab') as HTMLElement
    expect(control.getAttribute('aria-keyshortcuts')).toBe('Delete')
    let asked = 0
    host.addEventListener('helix-dismiss', () => {
      asked += 1
    })
    for (const key of ['Delete', 'Backspace', 'a']) {
      control.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, cancelable: true, key }))
    }
    expect(asked).toBe(2)
  })

  test('draws no mark and takes no key unless it is dismissible', async () => {
    const host = await tab()
    expect(part(host, 'dismiss')).toBeNull()
    expect(part(host, 'tab')?.hasAttribute('aria-keyshortcuts')).toBe(false)
    expect((host as Tab & { dismiss(): boolean }).dismiss()).toBe(false)
  })
})
