import { beforeAll, describe, expect, test } from 'bun:test'
import { hasLayout, mount, part, registerDom } from '@fusion.dev/helix-testing/dom'

beforeAll(async () => {
  registerDom()
  await import('../index.js')
})

type Lightbox = HTMLElement & { show(): void; updateComplete: Promise<boolean> }

/* Browser only: these are rows and boxes, which happy-dom does not lay out. */
const run = hasLayout() ? test : (): void => {}

/** Where a box sits against the dialog, rounded to whole pixels. */
const box = (element: Element | null): { bottom: number; top: number } => {
  const rect = (element as HTMLElement).getBoundingClientRect()
  return { bottom: Math.round(rect.bottom), top: Math.round(rect.top) }
}

const opened = async (inside: string): Promise<Lightbox> => {
  const host = (await mount(
    `<helix-lightbox label="Photos">
      ${inside}
      <helix-lightbox-item label="Blue" value="one">
        <div style="block-size: 200px; inline-size: 300px"></div>
      </helix-lightbox-item>
    </helix-lightbox>`,
  )) as Lightbox
  host.show()
  await host.updateComplete
  return host
}

describe('the lightbox lays out its rows', () => {
  run('with no header and no footer, the picture is in the middle of the screen', async () => {
    /* The viewport took the first `auto` row, so the picture sat at the top
       with the empty `1fr` row under it. */
    const host = await opened('')
    const dialog = box(part(host, 'dialog'))
    const viewport = box(part(host, 'viewport'))
    const above = viewport.top - dialog.top
    const below = dialog.bottom - viewport.bottom
    expect(Math.abs(above - below)).toBeLessThanOrEqual(1)
    expect(viewport.bottom - viewport.top).toBeGreaterThan(200)
  })

  run('two elements in the header stack above the picture', async () => {
    const host = await opened(
      '<p slot="header" id="one">One</p><p slot="header" id="two">Two</p><p slot="footer" id="foot">Foot</p>',
    )
    const viewport = box(part(host, 'viewport'))
    expect(box(host.querySelector('#two')).bottom).toBeLessThanOrEqual(viewport.top)
    expect(box(host.querySelector('#one')).bottom).toBeLessThanOrEqual(
      box(host.querySelector('#two')).top,
    )
    expect(box(host.querySelector('#foot')).top).toBeGreaterThanOrEqual(viewport.bottom)
  })
})
