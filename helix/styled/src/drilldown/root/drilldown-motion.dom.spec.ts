import '@fusion.dev/helix-testing/dom/register'
import { beforeAll, describe, expect, test } from 'bun:test'
import { hasLayout, mount, part, registerDom } from '@fusion.dev/helix-testing/dom'

beforeAll(async () => {
  registerDom()
  await import('../index.js')
})

/* Browser only: the copy is taken away when its animation ends, and happy-dom
   runs none. */
const run = hasLayout() ? test : (): void => {}

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

describe('the page leaving', () => {
  run('slides out as a copy of its rows, either way, which is emptied once it has', async () => {
    const stack = await mount(`<helix-drilldown label="Settings">
      <helix-drilldown-item value="account">Account
        <helix-drilldown-item slot="page" value="profile">Profile</helix-drilldown-item>
      </helix-drilldown-item>
      <helix-drilldown-item value="billing">Billing</helix-drilldown-item>
    </helix-drilldown>`)
    await wait(50)
    const account = stack.querySelector('helix-drilldown-item') as HTMLElement
    ;(part(account, 'item') as HTMLElement).click()
    await wait(30)
    const leaving = stack.shadowRoot?.querySelector('[part="leaving"]') as HTMLElement | null
    expect(leaving?.children.length).toBe(2)
    expect(leaving?.getAttribute('aria-hidden')).toBe('true')
    expect(leaving?.inert).toBe(true)
    await wait(800)
    expect(leaving?.children.length).toBe(0)
    ;(part(stack, 'back') as HTMLElement).click()
    await wait(30)
    expect(leaving?.children.length).toBe(1)
    await wait(800)
    expect(leaving?.children.length).toBe(0)
  })
})
