import '@fusion.dev/helix-testing/dom/register'
import { beforeAll, describe, expect, test } from 'bun:test'
import { mount, part, registerDom, settle, type Updatable } from '@fusion.dev/helix-testing/dom'

beforeAll(async () => {
  registerDom()
  await import('../index.js')
})

describe('the copy button of a code block', () => {
  /* A press on the block's own button is the block's business: the page hears
     what it did, `helix-copy` or `helix-copy-error`, which the block declares,
     and not the press of a control inside it. */
  test('keeps its press inside the block, and lets the copy through', async () => {
    const host = (await mount(
      '<helix-headless-code-block label="app.ts">const a = 1</helix-headless-code-block>',
    )) as Updatable
    await settle(host)
    const heard: string[] = []
    for (const name of ['helix-press', 'helix-copy', 'helix-copy-error']) {
      host.addEventListener(name, () => heard.push(name))
    }
    const copy = part(host, 'copy') as HTMLElement
    await settle(copy as Updatable)
    copy.shadowRoot?.querySelector('button')?.click()
    await settle(host)
    await new Promise((resolve) => setTimeout(resolve, 20))
    expect(heard).not.toContain('helix-press')
    expect(heard.some((name) => name.startsWith('helix-copy'))).toBe(true)
  })
})
