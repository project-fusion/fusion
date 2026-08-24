import { beforeAll, describe, expect, test } from 'bun:test'
import { mount, part, registerDom } from '@helix-io/testing/dom'

beforeAll(async () => {
  registerDom()
  await import('../index.js')
})

const chip = async (attrs = ''): Promise<HTMLElement> =>
  mount(
    `<helix-headless-radio variant="chip" value="-2" ${attrs}><i slot="icon"></i>Very dissatisfied</helix-headless-radio>`,
  )

describe('a radio drawn as a chip', () => {
  test('keeps the words as its name while showing only the mark', async () => {
    /* A satisfaction scale is picked between by its marks and read out by its
       words. They cannot share the default slot, because the rule that hides one
       there hides the other, which is what the `icon` slot is for.
     
       Asserted on the light DOM, not on `[part="label"]`: that part holds a
       `<slot>`, and a slot's `textContent` is its own fallback rather than what
       was assigned to it. Reading the part would have passed on an empty string
       whether or not the words survived. */
    const host = await chip()
    expect(host.textContent?.trim()).toBe('Very dissatisfied')
    expect(host.querySelector('[slot="icon"]')).not.toBe(null)
    expect(part(host, 'label')?.querySelector('slot')).not.toBe(null)
  })

  test('reports the value it was given, negative and all', async () => {
    /* The reason a scale like this is radios rather than a rating: the middle
       of it is 0 and the bottom is below zero, and neither is a count of
       anything. A rating's value counts marks, which is what lets it clip one
       partway and what makes -2 meaningless there. */
    const host = await chip()
    expect((host as HTMLElement & { value: string }).value).toBe('-2')
  })

  test('is still a radio, the drawing having changed and not the meaning', async () => {
    expect(part(await chip(), 'item')?.getAttribute('role')).toBe('radio')
  })

  test('takes the circle away without being asked, having nowhere to put it', async () => {
    // `hide-control` is a decision on a card, which has room for both.
    const host = await chip()
    expect(part(host, 'box')).not.toBe(null)
  })
})
