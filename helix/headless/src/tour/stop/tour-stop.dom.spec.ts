import { beforeAll, describe, expect, test } from 'bun:test'
import { mount, part, registerDom } from '@fusion.dev/helix-testing/dom'

beforeAll(async () => {
  registerDom()
  await import('../index.js')
})

type Stop = HTMLElement & { updateComplete: Promise<boolean> }

const stop = async (attributes = 'current'): Promise<Stop> =>
  (await mount(
    `<helix-headless-tour-stop ${attributes}>This is the sidebar.</helix-headless-tour-stop>`,
  )) as Stop

const asked = async (host: Stop, name: string): Promise<string | undefined> => {
  let what: string | undefined
  host.addEventListener('helix-tour-ask', (event) => {
    what = (event as CustomEvent<{ what: string }>).detail.what
  })
  ;(part(host, name) as HTMLElement | null)?.click()
  await host.updateComplete
  return what
}

/**
 * One stop, and the contract that is the stop's rather than the tour's.
 *
 * **The tour already proves the sequence**, which is which stop is current, what
 * a `next` advances to and what happens at the end. What one stop owns alone is
 * that it *asks* rather than moves, and that is the assertion that cannot be
 * made from the tour, where a stop that moved the tour itself and one that
 * asked it to look identical from outside.
 */
describe('one tour stop', () => {
  /* A stop does not know what is after it, and a stop that reached up to its
     parent to find out would be a stop that only works inside one. So all three
     controls say the same kind of thing and the root decides. */
  test('asks to be moved rather than moving, on every control it draws', async () => {
    expect(await asked(await stop(), 'next')).toBe('next')
    expect(await asked(await stop(), 'skip')).toBe('skip')
    expect(await asked(await stop('current'), 'back')).toBe('back')
  })

  /* The event has to leave this shadow root to reach the root's own slot, and a
     composed event is the only kind that does. */
  test('sends the ask across its own boundary, where the root is listening', async () => {
    const host = await stop()
    let composed: boolean | undefined
    host.addEventListener('helix-tour-ask', (event) => {
      composed = event.composed
    })
    ;(part(host, 'next') as HTMLElement).click()
    expect(composed).toBe(true)
  })

  /* Where the stop sits in the sequence changes what it offers: nowhere back to
     on the first, and the last one finishes rather than continuing. Both are
     told to the stop and both are the stop's to draw. */
  test('draws no way back from the first stop, and finishes on the last', async () => {
    expect(part(await stop('current first'), 'back')).toBeNull()
    expect(part(await stop('current'), 'back')).not.toBeNull()

    expect(part(await stop('current last'), 'next')?.textContent?.trim()).toBe('Done')
    expect(part(await stop('current'), 'next')?.textContent?.trim()).toBe('Next')
  })

  /* The panel is `popover="manual"`, which is what keeps a press elsewhere from
     ending the tour: elsewhere is the thing being pointed at. */
  test('holds its panel open itself rather than letting a press elsewhere close it', async () => {
    const bubble = part(await stop(), 'bubble')
    expect(bubble?.getAttribute('popover')).toBe('manual')
    expect(bubble?.hasAttribute('hidden')).toBe(false)
    expect(part(await stop(''), 'bubble')?.hasAttribute('hidden')).toBe(true)
  })
})
