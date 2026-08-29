import { beforeAll, describe, expect, test } from 'bun:test'
import { mount, part, registerDom } from '@fusion.dev/helix-testing/dom'

beforeAll(async () => {
  registerDom()
  await import('../index.js')
})

type Item = HTMLElement & { open: boolean; updateComplete: Promise<boolean> }

const message = async (attributes = ''): Promise<Item> =>
  (await mount(
    `<helix-headless-toast-item ${attributes}>Project saved</helix-headless-toast-item>`,
  )) as Item

/**
 * One message, and the contract that is the message's rather than the region's.
 *
 * **The toast region already proves the arrangement**, which is where messages
 * stack, how many are held and the order they leave in. What one message owns
 * alone is that it goes when it is asked to, so every assertion here is about a
 * message with no region around it: an item that waits to be told is one whose
 * own dismiss control looks broken to anyone who presses it.
 */
describe('one toast message', () => {
  /* Undeclared, the message is its own. It says it is going and then goes, the
     same as Dialog and Accordion, and the consumer still hears it and takes it
     out of their list. */
  test('goes when it is asked to, where nobody claimed it', async () => {
    const host = await message('dismissible')
    let heard = 0
    host.addEventListener('helix-dismiss', () => {
      heard += 1
    })
    expect(host.open).toBe(true)

    ;(part(host, 'dismiss') as HTMLElement).click()
    await host.updateComplete

    expect(heard).toBe(1)
    expect(host.open).toBe(false)
  })

  /* Declaring `open` seeds the state and does not claim ownership of it.
     Control is an action: it applies, and a consumer refuses to take the
     decision. */
  test('announces and closes, where the markup only seeded it', async () => {
    const host = await message('dismissible open')
    let heard = 0
    host.addEventListener('helix-dismiss', () => {
      heard += 1
    })

    ;(part(host, 'dismiss') as HTMLElement).click()
    await host.updateComplete

    expect(heard).toBe(1)
    expect(host.open).toBe(false)
  })

  test('and a refused dismissal leaves it open', async () => {
    const host = await message('dismissible open')
    host.addEventListener('helix-dismiss', (event: Event) => {
      event.preventDefault()
    })

    ;(part(host, 'dismiss') as HTMLElement).click()
    await host.updateComplete

    expect(host.open).toBe(true)
  })

  /* No tone, no mark. "Project saved" is not an error, a warning or an
     announcement, and a glyph there would be decoration standing where meaning
     is supposed to be. Callout falls back to `info` and this deliberately does
     not, which is a difference only a spec on the item can hold. */
  test('draws no mark for a message that means nothing in particular', async () => {
    expect(part(await message(), 'icon')).toBeNull()
    expect(part(await message('tone="danger"'), 'icon')).not.toBeNull()
  })

  /* The duration is published as a custom property rather than drawn, so
     whatever the styled tier does with the remaining time, the message is the
     one that knows how long it has. */
  test('publishes how long it has, and draws no timer where it has forever', async () => {
    const timed = part(await message('duration="4000"'), 'timer')
    expect(timed?.getAttribute('style')).toContain('--toast-duration: 4000ms')
    expect(timed?.getAttribute('aria-hidden')).toBe('true')
    expect(part(await message(), 'timer')).toBeNull()
  })
})
