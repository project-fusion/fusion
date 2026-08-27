import { beforeAll, describe, expect, test } from 'bun:test'
import { mount, part, registerDom } from '@helix-io/testing/dom'

/* The reading, after hydration. What is asserted here is what the element
   decides: which of the two modes it is in, where it takes its value from, and
   that `datetime` carries the instant whatever the text says. When the reading
   expires is `elapsedTime`'s own spec, which is pure and does not need a DOM. */

beforeAll(async () => {
  registerDom()
  await import('../index.js')
})

interface Stamp extends HTMLElement {
  date: string
  elapsed: boolean
  locale: string
  updateComplete: Promise<unknown>
}

const at = new Date(Date.now() - 42 * 60_000).toISOString()

const stamp = async (markup: string) => {
  const element = (await mount(markup)) as Stamp
  await element.updateComplete
  return element
}

describe('the reading', () => {
  test('elapsed is the compact form', async () => {
    const element = await stamp(
      `<helix-headless-format-date elapsed locale="en-US" date="${at}"></helix-headless-format-date>`,
    )
    expect(part(element, 'time')?.textContent).toBe('42m')
  })

  test('without it, the options a consumer set decide', async () => {
    const element = await stamp(
      `<helix-headless-format-date locale="en-US" month="short" day="numeric" year="numeric"
        date="2020-01-01T00:00:00.000Z"></helix-headless-format-date>`,
    )
    expect(part(element, 'time')?.textContent).toBe('Jan 1, 2020')
  })

  /**
   * `datetime` is the instant and the text is the reading, and they are
   * deliberately not the same thing: a screen reader, a copy and paste, and
   * anything parsing the page all want the first.
   */
  test('the exact instant is carried whatever the text says', async () => {
    const element = await stamp(
      `<helix-headless-format-date elapsed date="${at}"></helix-headless-format-date>`,
    )
    expect(part(element, 'time')?.getAttribute('datetime')).toBe(at)
  })

  test('no timestamp renders nothing, rather than the epoch', async () => {
    const element = await stamp('<helix-headless-format-date></helix-headless-format-date>')
    expect(part(element, 'time')).toBeNull()
  })

  test('a timestamp that is not one renders nothing either', async () => {
    const element = await stamp(
      '<helix-headless-format-date date="the day before yesterday"></helix-headless-format-date>',
    )
    expect(part(element, 'time')).toBeNull()
  })
})

describe('where the value comes from', () => {
  /**
   * The spelling that reads best in markup, and the client is the only place it
   * can work: the server shim has no `textContent` to read, which
   * `format-date-root.ssr.spec.ts` asserts from the other side.
   */
  test('the element text is read where no attribute carried one', async () => {
    const element = await stamp(
      `<helix-headless-format-date elapsed locale="en-US">${at}</helix-headless-format-date>`,
    )
    await element.updateComplete
    expect(part(element, 'time')?.textContent).toBe('42m')
  })

  test('an attribute wins over the text, so one element cannot say two things', async () => {
    const older = new Date(Date.now() - 3 * 3_600_000).toISOString()
    const element = await stamp(
      `<helix-headless-format-date elapsed locale="en-US" date="${older}">${at}</helix-headless-format-date>`,
    )
    await element.updateComplete
    expect(part(element, 'time')?.textContent).toBe('3h')
  })
})
