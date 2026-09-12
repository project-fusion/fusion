import { beforeAll, describe, expect, test } from 'bun:test'
import { hasLayout, mount, part, registerDom } from '@fusion.dev/helix-testing/dom'

/* Where the body starts against its heading. A claim about boxes, so browser
   only. Run them with `bun run specs:browser accordion`. */

beforeAll(async () => {
  registerDom()
  await import('../index.js')
})

const geometry = hasLayout() ? test : (): void => {}

type Updatable = HTMLElement & { updateComplete: Promise<unknown> }

/* Where the words start, from a Range over the text rather than an element's
   box: the heading's box starts at the trigger's padding and the chevron is
   inside it, so boxes would agree with each other and say nothing. */
const words = (node: Node): number => {
  const range = document.createRange()
  range.selectNodeContents(node)
  return range.getBoundingClientRect().left
}

const opened = async (placement: string): Promise<Updatable> => {
  const accordion = (await mount(`<helix-accordion style="inline-size: 30rem">
    <helix-accordion-item ${placement} default-open>
      <span slot="summary">Delivery</span>
      <p>Two to four working days across the mainland.</p>
    </helix-accordion-item>
  </helix-accordion>`)) as Updatable
  const item = accordion.querySelector('helix-accordion-item') as Updatable
  for (let pass = 0; pass < 3; pass++) {
    await new Promise((resolve) => requestAnimationFrame(resolve))
    await item.updateComplete
  }
  return item
}

describe('the body of an open item', () => {
  geometry('starts under the heading’s words when the chevron is at the start', async () => {
    const item = await opened('chevron-placement="start"')
    const heading = words(item.querySelector('[slot="summary"]') as Node)
    const body = words(item.querySelector('p') as Node)
    const chevron = (part(item, 'chevron') as Element).getBoundingClientRect()
    expect(chevron.right).toBeLessThan(heading)
    expect(Math.abs(body - heading)).toBeLessThan(1)
  })

  geometry('starts under the heading’s words when the chevron is at the end', async () => {
    const item = await opened('')
    const heading = words(item.querySelector('[slot="summary"]') as Node)
    const body = words(item.querySelector('p') as Node)
    expect(Math.abs(body - heading)).toBeLessThan(1)
  })
})
