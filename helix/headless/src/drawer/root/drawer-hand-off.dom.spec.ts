import '@fusion.dev/helix-testing/dom/register'
import { beforeAll, describe, expect, test } from 'bun:test'
import { hasLayout, mount, part, registerDom } from '@fusion.dev/helix-testing/dom'

beforeAll(async () => {
  registerDom()
  await import('../index.js')
})

/* Browser only: a press on what the drawer holds reaches its scroller only
   through the flat tree's path, and happy-dom's path leaves the shadow root
   out, as it has no layout to scroll in either. */
const run = hasLayout() ? test : (): void => {}

type Drawer = HTMLElement & {
  updateComplete: Promise<unknown>
  open: boolean
  show(): void
}

/** A wait of `ms` milliseconds on the page's clock. */
const wait = (ms: number): Promise<void> => new Promise((done) => setTimeout(done, ms))

/**
 * The headless drawer's panel laid out as a styled one lays it out: a column
 * 320 pixels tall at the bottom of the window, whose content region scrolls.
 */
const LAYOUT = `<style>
  helix-headless-drawer::part(panel) {
    block-size: 320px;
    border: 0;
    display: flex;
    flex-direction: column;
    inset: auto 0 0;
    margin: 0;
    max-block-size: none;
    max-inline-size: none;
    padding: 0;
    position: fixed;
  }
  helix-headless-drawer::part(content) {
    flex: 1 1 auto;
    min-block-size: 0;
    overflow-y: auto;
  }
</style>`

/**
 * A drawer at the bottom holding a list of thirty rows that its content
 * region scrolls, opened and scrolled `scrolled` down.
 */
const opened = async (attributes = '', scrolled = 0): Promise<Drawer> => {
  const rows = Array.from(
    { length: 30 },
    (_, at) => `<p style="margin:0;height:40px">Row ${at}</p>`,
  )
  const markup = `<helix-headless-drawer label="Filters" placement="bottom" ${attributes}>${rows.join('')}</helix-headless-drawer>`
  const drawer = (await mount(`${markup}${LAYOUT}`)) as Drawer
  drawer.show()
  await drawer.updateComplete
  await wait(300)
  const list = part(drawer, 'content') as HTMLElement
  list.scrollTop = scrolled
  /* The scroll this sends is the list's last move. */
  await wait(0)
  return drawer
}

/** A touch pressed on a row and dragged down by `by`, let go a frame later. */
const drag = async (drawer: Drawer, by: number): Promise<void> => {
  const row = drawer.querySelector('p') as HTMLElement
  const box = row.getBoundingClientRect()
  const x = box.left + 10
  const y = box.top + 10
  const at = (type: string, to: number, target: EventTarget = window): void => {
    target.dispatchEvent(
      new PointerEvent(type, {
        bubbles: true,
        button: 0,
        clientX: x,
        clientY: to,
        composed: true,
        pointerId: 9,
        pointerType: 'touch',
      }),
    )
  }
  at('pointerdown', y, row)
  at('pointermove', y + by / 2)
  at('pointermove', y + by)
  at('pointerup', y + by)
  await drawer.updateComplete
  /* The click a swipe's release raises is swallowed for one task. */
  await wait(0)
}

describe('a list inside a drawer', () => {
  run('hands a drag down to the panel once it stands at its top and has stood still', async () => {
    const drawer = await opened()
    await wait(600)
    await drag(drawer, 250)
    expect(drawer.open).toBe(false)
  })

  run(
    'keeps a drag down while it stands below its top, and the panel stays where it rests',
    async () => {
      const drawer = await opened('', 120)
      await wait(600)
      await drag(drawer, 250)
      expect(drawer.open).toBe(true)
      const panel = part(drawer, 'panel') as HTMLElement
      expect(panel.style.getPropertyValue('--drawer-swipe-y')).toBe('')
    },
  )

  run(
    'keeps a drag down for half a second after it last moved, as momentum carries it to its top',
    async () => {
      const drawer = await opened('', 120)
      ;(part(drawer, 'content') as HTMLElement).scrollTop = 0
      await wait(100)
      await drag(drawer, 250)
      expect(drawer.open).toBe(true)
      await wait(600)
      await drag(drawer, 250)
      expect(drawer.open).toBe(false)
    },
  )

  run(
    'hands a drag up to a panel that rests short of the whole, wherever the list stands',
    async () => {
      const drawer = await opened('snap-points="0.5 1"', 120)
      await drag(drawer, -200)
      expect(drawer.open).toBe(true)
      const list = part(drawer, 'content') as HTMLElement
      expect(list.scrollTop).toBe(120)
    },
  )
})
