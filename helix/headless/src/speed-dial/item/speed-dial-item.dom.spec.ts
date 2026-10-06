import { beforeAll, describe, expect, test } from 'bun:test'
import { mount, part, registerDom } from '@fusion.dev/helix-testing/dom'

beforeAll(async () => {
  registerDom()
  await import('../index.js')
})

const action = async (attributes = 'value="save"'): Promise<HTMLElement> =>
  (await mount(
    `<helix-headless-speed-dial-item ${attributes}><svg slot="icon"></svg>Save</helix-headless-speed-dial-item>`,
  )) as HTMLElement

/**
 * One action, and the contract that is the action's rather than the dial's.
 *
 * **The dial already proves the arrangement**, which is the fan opening, the
 * order the actions come out in and focus moving between them. What one action
 * owns alone is that it is a real disabled button rather than a dressed one,
 * which is the opposite of the neighboring drilldown row and is a decision
 * rather than an inconsistency: a dial is a fan of controls a reader steps
 * through, not a menu page they read down.
 */
describe('one speed dial action', () => {
  test('is a real button carrying the role its dial declares', async () => {
    const item = part(await action(), 'item')
    expect(item?.tagName).toBe('BUTTON')
    expect(item?.getAttribute('type')).toBe('button')
    expect(item?.getAttribute('role')).toBe('menuitem')
  })

  /* Genuinely disabled, so the platform refuses the press rather than the
     handler doing it, and `aria-disabled` beside it so the refusal is announced
     rather than merely enacted. */
  test('is refused by the platform, and says so as well', async () => {
    const host = await action('value="save" disabled')
    const item = part(host, 'item') as HTMLButtonElement
    expect(item.hasAttribute('disabled')).toBe(true)
    expect(item.getAttribute('aria-disabled')).toBe('true')

    let heard = 0
    host.addEventListener('helix-select', () => {
      heard += 1
    })
    item.click()
    expect(heard).toBe(0)
  })

  test('announces what it stands for when it is chosen', async () => {
    const host = await action()
    let value: string | undefined
    host.addEventListener('helix-select', (event) => {
      value = (event as CustomEvent<{ value: string }>).detail.value
    })
    ;(part(host, 'item') as HTMLElement).click()
    expect(value).toBe('save')
  })

  /* The mark is what a dial is read by, so both boxes are always rendered and
     the name sits beside the mark rather than replacing it. */
  test('keeps a box for the mark and a box for the name, always', async () => {
    const host = await action()
    expect(part(host, 'icon')?.querySelector('slot')?.getAttribute('name')).toBe('icon')
    expect(part(host, 'label')?.querySelector('slot')?.hasAttribute('name')).toBe(false)
  })
})

describe('the action the keyboard is on', () => {
  /* `Option` calls it `active`, and `selected` is kept for code that reads it. */
  test('is active while it has focus, and selected still says the same', async () => {
    const one = (await action()) as unknown as HTMLElement & {
      active: boolean
      focusItem(): void
      selected: boolean
    }
    const warnings: string[] = []
    const original = console.warn
    console.warn = (message: string) => warnings.push(message)
    try {
      expect(one.active).toBe(false)
      one.focusItem()
      expect(one.active).toBe(true)
      expect(one.selected).toBe(true)
      expect(one.selected).toBe(true)
    } finally {
      console.warn = original
    }
    /* Read by a page only, the dial moving from the action that has focus, so
       a page reading it is told once that `active` replaces it. */
    expect(warnings).toHaveLength(1)
    expect(warnings[0]).toContain('active')
  })
})

/* Menu's rows carry `aria-keyshortcuts` and draw their key; a dial's action
   could say neither. */
describe('an action with a shortcut', () => {
  test('carries it as aria-keyshortcuts, and draws what is slotted after the name', async () => {
    const one = await action('value="save" shortcut="ctrl+s"')
    expect(part(one, 'item')?.getAttribute('aria-keyshortcuts')).toBe('Control+S')
    const key = document.createElement('kbd')
    key.slot = 'shortcut'
    key.textContent = 'Ctrl+S'
    one.append(key)
    await new Promise((resolve) => setTimeout(resolve))
    await (one as HTMLElement & { updateComplete: Promise<unknown> }).updateComplete
    const box = part(one, 'shortcut') as HTMLElement
    expect([box.hidden, box.getAttribute('aria-hidden')]).toEqual([false, 'true'])
    expect(part(await action(), 'item')?.hasAttribute('aria-keyshortcuts')).toBe(false)
  })
})

/* A shortcut drew nothing until the page slotted a Kbd, where Menu draws its
   rows' shortcuts from `shortcut` alone. */
describe('a shortcut with nothing slotted', () => {
  const drawn = (host: HTMLElement): string =>
    (part(host, 'shortcut')?.querySelector('slot[name="shortcut"]')?.textContent ?? '').trim()

  test('is drawn after the name in the platform words, as Kbd draws a chord', async () => {
    const one = await action('value="save" shortcut="mod+shift+s"')
    const box = part(one, 'shortcut') as HTMLElement
    expect(box.hidden).toBe(false)
    expect(box.getAttribute('aria-hidden')).toBe('true')
    // happy-dom is no Apple keyboard, so `mod` is Control and keys join with `+`.
    expect(drawn(one)).toBe('Ctrl+Shift+S')
  })

  test('draws nothing and keeps the box hidden without one', async () => {
    const none = await action()
    expect((part(none, 'shortcut') as HTMLElement).hidden).toBe(true)
    expect(drawn(none)).toBe('')
  })
})
