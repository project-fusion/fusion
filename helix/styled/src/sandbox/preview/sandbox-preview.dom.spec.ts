import { beforeAll, describe, expect, test } from 'bun:test'
import { mount, part, registerDom } from '@helix-io/testing/dom'

beforeAll(async () => {
  registerDom()
  await import('../index.js')
})

type Preview = HTMLElement & { updateComplete: Promise<boolean> }

const preview = async (attributes = 'src="/frame.html"'): Promise<Preview> =>
  (await mount(`<helix-sandbox-preview ${attributes}></helix-sandbox-preview>`)) as Preview

/**
 * The preview pane, and the contract that is the pane's rather than the
 * sandbox's.
 *
 * **The sandbox already proves the arrangement**, which is which pane leads,
 * what the splitter does and how the source reaches the preview: the preview is
 * named 32 times in this family's specs. What this pane owns alone is that it
 * *is* the security boundary, and the sandbox cannot assert that, because a
 * frame with `allow-same-origin` on it renders every example correctly and
 * passes every layout assertion ever written. It fails only against an example
 * that attacks the page, which nothing here runs on purpose.
 *
 * These are the assertions that make the name honest. `Sandbox.Preview` shipping
 * from `@helix-io/styled` was argued on exactly this: the component is the boundary
 * rather than a layout that happens to sit near one.
 */
describe('the preview pane', () => {
  /* `allow-scripts` with `allow-same-origin` beside it is the same as no sandbox
     at all: a document on its own origin can reach up and remove the attribute.
     Measured before this was closed, an `onerror` on a failing image read the
     site's `localStorage`, its cookies and the editor's contents. */
  test('never grants the frame its own origin, whatever else it grants', async () => {
    const frame = part(await preview(), 'frame') as HTMLIFrameElement
    const granted = (frame.getAttribute('sandbox') ?? '').split(/\s+/).filter(Boolean)

    expect(granted).not.toContain('allow-same-origin')
    expect(frame.hasAttribute('sandbox')).toBe(true)
  })

  /* Scripts and forms, because examples have both. Top-level navigation, popups
     and modals are not granted, and a list rather than a substring check is what
     makes this fail on a fourth token somebody adds without thinking. */
  test('grants scripts and forms, and nothing beyond them', async () => {
    const frame = part(await preview(), 'frame') as HTMLIFrameElement
    const granted = (frame.getAttribute('sandbox') ?? '').split(/\s+/).filter(Boolean).sort()

    expect(granted).toEqual(['allow-forms', 'allow-scripts'])
  })

  /* A frame with no accessible name is a region a reader reaches and cannot
     identify, and the name is the pane's rather than the sandbox's because the
     sandbox does not render the frame. */
  test('names the frame, so a reader who reaches it knows what it is', async () => {
    expect((part(await preview(), 'frame') as HTMLIFrameElement).getAttribute('title')).toBe(
      'Preview',
    )

    const named = await preview('src="/frame.html" label="Card, live"')
    expect((part(named, 'frame') as HTMLIFrameElement).getAttribute('title')).toBe('Card, live')
  })
})
