import { beforeAll, describe, expect, test } from 'bun:test'
import { mount, part, registerDom } from '@helix-io/testing/dom'

beforeAll(async () => {
  registerDom()
  await import('../index.js')
})

type Area = HTMLElement & { updateComplete: Promise<unknown> }

const area = async (attrs = '', body = '<p>One</p>'): Promise<Area> => {
  const host = (await mount(
    `<helix-base-scroll-area ${attrs}>${body}</helix-base-scroll-area>`,
  )) as Area
  await host.updateComplete
  return host
}

describe('a scroll area', () => {
  test('hands out the box that scrolls, because the host does not', async () => {
    /* A consumer holding a reference to this element holds the host, and the
       host does not scroll: `scrollBy` on it is a no-op that reports nothing.
       Anything bringing a row into view has to be told which box to move, and
       that box is in here. */
    const host = await area('label="Notes"')
    const scroller = (host as HTMLElement & { scroller: HTMLElement | null }).scroller
    expect(scroller).toBe(part(host, 'viewport') as HTMLElement)
    expect(scroller).not.toBe(host)
  })

  test('names its region only when it has a name to give', async () => {
    /* An unnamed region is an announcement with no content: a reader is told
       "region" and has learned nothing they did not already know. */
    expect(part(await area('label="Notes"'), 'viewport')?.getAttribute('role')).toBe('region')
    expect(part(await area(), 'viewport')?.getAttribute('role')).toBe(null)
  })

  test('carries the name onto the box that scrolls', async () => {
    expect(part(await area('label="Notes"'), 'viewport')?.getAttribute('aria-label')).toBe('Notes')
  })
})
