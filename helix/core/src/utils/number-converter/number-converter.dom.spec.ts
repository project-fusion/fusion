import '@fusion.dev/helix-testing/dom/register'
import { afterEach, beforeAll, describe, expect, test } from 'bun:test'
import { registerDom } from '@fusion.dev/helix-testing/dom'
import { numberConverter, timeConverter } from './number-converter.js'

/* What the converters do on an element, where Lit hands them the attribute.
   What they read is `number-converter.pure.spec.ts`'s. */

type Probe = HTMLElement & {
  delay: number
  page: number
  updateComplete: Promise<unknown>
}

const tag = 'number-converter-probe'

beforeAll(async () => {
  registerDom()
  const { HelixElement } = await import('../../helix-element/helix-element.js')
  customElements.define(
    tag,
    class extends HelixElement {
      static override properties = {
        delay: { converter: timeConverter('delay', 400) },
        page: { converter: numberConverter('page', undefined) },
      }

      declare delay: number
      defaultPage = 1
      private pageState: number | undefined = undefined

      constructor() {
        super()
        this.delay = 400
      }

      get page(): number {
        return this.pageState ?? this.defaultPage
      }

      set page(next: number) {
        const previous = this.page
        this.pageState = next
        this.requestUpdate('page', previous)
      }
    },
  )
})

const warn = console.warn
afterEach(() => {
  console.warn = warn
})

/** What the console was told while `during` ran. */
const warned = async (during: () => Promise<void> | void): Promise<string[]> => {
  const warnings: string[] = []
  console.warn = (message: string) => warnings.push(message)
  await during()
  console.warn = warn
  return warnings
}

const probe = async (attributes: string): Promise<Probe> => {
  document.body.innerHTML = `<${tag} ${attributes}></${tag}>`
  const host = document.querySelector(tag) as Probe
  await host.updateComplete
  return host
}

describe('an element whose numeric attribute is not a number', () => {
  test('keeps the property at its default, and takes the next one that is', async () => {
    let host: Probe | undefined
    const warnings = await warned(async () => {
      host = await probe('delay="soonish"')
    })
    expect([host?.delay, warnings.length]).toEqual([400, 1])
    host?.setAttribute('delay', '0.12s')
    expect(host?.delay).toBe(120)
    host?.removeAttribute('delay')
    expect(host?.delay).toBe(400)
  })

  test('hands an accessor the value that means unset, so its seed shows through', async () => {
    const host = await probe('page="3"')
    expect(host.page).toBe(3)
    const warnings = await warned(() => host.setAttribute('page', 'three'))
    expect([host.page, warnings.length]).toEqual([1, 1])
  })
})
