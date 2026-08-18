import { beforeAll, describe, expect, test } from 'bun:test'
import { mount, part, registerDom, slotted } from '@fusion-io/testing/dom'

beforeAll(async () => {
  registerDom()
  await import('../index.js')
})

type Splitter = HTMLElement & { position: number; updateComplete: Promise<unknown> }

const splitter = async (attrs = ''): Promise<Splitter> => {
  const host = (await mount(`<helix-splitter ${attrs}>
    <div slot="start">one</div><div slot="end">two</div>
  </helix-splitter>`)) as Splitter
  await host.updateComplete
  return host
}

const separator = (host: HTMLElement): HTMLElement => part(host, 'separator') as HTMLElement

const press = async (host: Splitter, key: string): Promise<KeyboardEvent> => {
  const event = new KeyboardEvent('keydown', { bubbles: true, cancelable: true, key })
  separator(host).dispatchEvent(event)
  await host.updateComplete
  return event
}

describe('splitter', () => {
  test('two panes and a divider between them', async () => {
    const host = await splitter()
    expect(slotted(host, 'start').map((one) => one.textContent)).toEqual(['one'])
    expect(slotted(host, 'end').map((one) => one.textContent)).toEqual(['two'])
    expect(separator(host)).not.toBeNull()
  })

  test('the divider is a real separator a keyboard can reach', async () => {
    // A divider only a mouse can move is unusable without one.
    const host = await splitter('default-position="40"')
    const bar = separator(host)
    expect(bar.getAttribute('role')).toBe('separator')
    expect(bar.getAttribute('tabindex')).toBe('0')
    expect(bar.getAttribute('aria-valuenow')).toBe('40')
  })

  test('the orientation announced is the way it is drawn, not the way it moves', async () => {
    /* A separator between panes laid out side by side is drawn upright, so the
       two words are opposite each other here. The code had this right and the
       sentence beside it said the reverse. */
    const side = await splitter()
    expect(separator(side).getAttribute('aria-orientation')).toBe('vertical')
    const stacked = await splitter('orientation="vertical"')
    expect(separator(stacked).getAttribute('aria-orientation')).toBe('horizontal')
  })

  test('the position sizes the first pane, and never the host', async () => {
    /* The number has to reach the layout, and writing an inline style onto the
       host at upgrade is markup a server's output never had. It goes on the pane
       instead, which is an element in this shadow root. */
    const host = await splitter('default-position="30"')
    expect(part(host, 'start')?.getAttribute('style')).toContain('30%')
    expect(host.getAttribute('style')).toBeNull()
  })
})

describe('splitter keyboard', () => {
  test('the arrows move it by a step', async () => {
    const host = await splitter('default-position="50" step="5"')
    await press(host, 'ArrowRight')
    expect(host.position).toBe(55)
    await press(host, 'ArrowLeft')
    await press(host, 'ArrowLeft')
    expect(host.position).toBe(45)
  })

  test('the arrows follow the axis the panes are on', async () => {
    const host = await splitter('default-position="50" orientation="vertical" step="5"')
    await press(host, 'ArrowDown')
    expect(host.position).toBe(55)
  })

  test('Home and End go all the way to either end', async () => {
    // A divider that stops dead short of the edge gives a reader no way to put a
    // pane away.
    const host = await splitter('default-position="50"')
    await press(host, 'Home')
    expect(host.position).toBe(0)
    await press(host, 'End')
    expect(host.position).toBe(100)
  })

  test('and only as far as a consumer’s own bounds', async () => {
    const host = await splitter('default-position="50" max="80" min="20"')
    await press(host, 'Home')
    expect(host.position).toBe(20)
    await press(host, 'End')
    expect(host.position).toBe(80)
  })

  test('the arrows are taken, or the page scrolls under the divider', async () => {
    const host = await splitter()
    expect((await press(host, 'ArrowLeft')).defaultPrevented).toBe(true)
  })

  test('a key it does not answer is left alone', async () => {
    const host = await splitter()
    expect((await press(host, 'Tab')).defaultPrevented).toBe(false)
  })
})

describe('splitter settling', () => {
  test('says so when a key move settles', async () => {
    const host = await splitter('default-position="50" step="5"')
    let settled = ''
    host.addEventListener('helix-change', (event) => {
      settled = (event as CustomEvent<{ value: string }>).detail.value
    })
    await press(host, 'ArrowRight')
    expect(settled).toBe('55')
  })

  test('declaring `position` hands it over: it announces and applies nothing', async () => {
    const host = await splitter('position="50" step="5"')
    let asked = ''
    host.addEventListener('helix-change', (event) => {
      asked = (event as CustomEvent<{ value: string }>).detail.value
    })
    await press(host, 'ArrowRight')
    expect(asked).toBe('55')
    expect(host.position).toBe(50)
  })

  test('a double click puts it back where the markup put it', async () => {
    const host = await splitter('default-position="30" step="5"')
    await press(host, 'ArrowRight')
    expect(host.position).toBe(35)
    separator(host).dispatchEvent(new MouseEvent('dblclick', { bubbles: true }))
    await host.updateComplete
    expect(host.position).toBe(30)
  })
})
