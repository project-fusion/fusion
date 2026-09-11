import { beforeAll, describe, expect, test } from 'bun:test'
import { example, hasLayout, idle, logged, part, registerDom } from '@fusion.dev/helix-testing/dom'
import events from '../.examples/events.html' with { type: 'text' }
import in_a_drawer from '../.examples/in-a-drawer.html' with { type: 'text' }
import preview from '../.examples/preview.html' with { type: 'text' }
import read_on_the_server from '../.examples/read-on-the-server.html' with { type: 'text' }

beforeAll(async () => {
  registerDom()
  await import('../index.js')
  await import('../../flex/index.js')
  await import('../../list/index.js')
  await import('../../avatar/index.js')
  await import('../../button/index.js')
  await import('../../icon/index.js')
  await import('../../badge/index.js')
  await import('../../icon-button/index.js')
  await import('../../drawer/index.js')
  await import('../../format-date/index.js')
})

/* Browser only: happy-dom does not run a script inserted by script. */
const run = hasLayout() ? test : (): void => {}

type Item = HTMLElement & { markRead: (read: boolean) => void; read: boolean }
const items = (): Item[] => [...document.querySelectorAll<Item>('helix-notification')]

describe('the preview example', () => {
  run('each row is stamped with how long ago it happened', async () => {
    await example(preview)
    const stamps = items().map((one) =>
      one.shadowRoot
        ?.querySelector('helix-format-date')
        ?.shadowRoot?.querySelector('time')
        ?.textContent?.trim(),
    )
    expect(stamps.every((one) => one !== undefined && one !== '')).toBe(true)
    expect(new Set(stamps).size).toBe(stamps.length)
  })
})

describe('the read-on-the-server example', () => {
  run('opening a row asks, and the page marks it read once the server agrees', async () => {
    await example(read_on_the_server)
    const [first] = items()
    expect(first?.read).toBe(false)
    ;(part(first as HTMLElement, 'item') as HTMLElement).click()
    await idle()
    expect(first?.read).toBe(true)
  })
})

describe('the events example', () => {
  run('dismissing a row is heard, and marking all read is heard once per row', async () => {
    await example(events)
    ;(part(items()[1] as HTMLElement, 'dismiss') as HTMLElement).click()
    await idle()
    expect(logged()).toEqual(['helix-dismiss'])
  })
})

describe('the in-a-drawer example', () => {
  run('the badge counts what is unread, and reading one lowers it', async () => {
    await example(in_a_drawer)
    const count = document.getElementById('count') as HTMLElement & { value: number }
    const unread = items().filter((one) => !one.read).length
    const [first] = items()
    first?.markRead(true)
    await idle()
    expect(count.value).toBe(unread - 1)
  })
})
