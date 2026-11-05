import '@fusion.dev/helix-testing/dom/register'
import { beforeAll, describe, expect, test } from 'bun:test'
import { registerDom, settle, type Updatable } from '@fusion.dev/helix-testing/dom'

beforeAll(async () => {
  registerDom()
  await import('../index.js')
  await import('../../option/index.js')
})

type Row = HTMLElement & { active: boolean; disabled: boolean; value: string }

const list = async (): Promise<Updatable & HTMLElement> => {
  document.body.innerHTML = `<helix-headless-listbox label="L" value="b">
    <helix-headless-option value="a">A</helix-headless-option>
    <helix-headless-option value="b">B</helix-headless-option>
    <helix-headless-option value="c">C</helix-headless-option>
    <helix-headless-option value="d" disabled>D</helix-headless-option>
  </helix-headless-listbox>`
  const host = document.body.querySelector('helix-headless-listbox') as Updatable & HTMLElement
  await settle(host)
  return host
}

const row = (value: string): Row =>
  document.body.querySelector(`helix-headless-option[value="${value}"]`) as Row

const move = async (
  host: Updatable & HTMLElement,
  to: Element,
  pointerType = 'mouse',
): Promise<void> => {
  to.dispatchEvent(new PointerEvent('pointermove', { bubbles: true, composed: true, pointerType }))
  await settle(host)
}

const active = (): string[] =>
  [...document.body.querySelectorAll<Row>('helix-headless-option')]
    .filter((option) => option.active)
    .map((option) => option.value)

describe('the highlight and the pointer', () => {
  test('a mouse moving over an option highlights it, and nothing is chosen', async () => {
    const host = await list()
    await move(host, row('c'))
    expect(active()).toEqual(['c'])
    expect((host as unknown as { value: string }).value).toBe('b')
  })

  test('a touch, a disabled option and the option already highlighted move nothing', async () => {
    const host = await list()
    await move(host, row('c'))
    await move(host, row('a'), 'touch')
    await move(host, row('d'))
    expect(active()).toEqual(['c'])
  })

  test('leaving the list gives the highlight back to where the keyboard left it', async () => {
    const host = await list()
    host.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, key: 'ArrowDown' }))
    await settle(host)
    const before = active()
    await move(host, row('a'))
    expect(active()).toEqual(['a'])
    host.dispatchEvent(new PointerEvent('pointerleave'))
    await settle(host)
    expect(active()).toEqual(before)
  })

  test('a key after the pointer moves on from the pointer, and leaving keeps it', async () => {
    const host = await list()
    await move(host, row('a'))
    host.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, key: 'ArrowDown' }))
    await settle(host)
    expect(active()).toEqual(['b'])
    host.dispatchEvent(new PointerEvent('pointerleave'))
    await settle(host)
    expect(active()).toEqual(['b'])
  })
})
