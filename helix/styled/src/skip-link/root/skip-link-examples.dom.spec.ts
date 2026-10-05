import { beforeAll, describe, expect, test } from 'bun:test'
import { example, hasLayout, idle, part, registerDom } from '@fusion.dev/helix-testing/dom'
import somewhere from '../.examples/custom-target.html' with { type: 'text' }
import preview from '../.examples/preview.html' with { type: 'text' }

beforeAll(async () => {
  registerDom()
  await import('../index.js')
  await import('../../app-header/index.js')
  await import('../../navigation/index.js')
  await import('../../text/index.js')
})

/* Browser only: happy-dom has no layout, and runs no script inserted by script. */
const run = hasLayout() ? test : (): void => {}

type Skip = HTMLElement & { updateComplete: Promise<unknown> }

/* Measured rather than read off an attribute: a skip link can carry every right
   attribute and still be painted over the page, or be hidden in a way the
   keyboard cannot reach. */
const box = (host: Element): { height: number; width: number } => {
  const { height, width } = host.getBoundingClientRect()
  return { height: Math.round(height), width: Math.round(width) }
}

describe('the somewhere-else example', () => {
  run('is out of sight until focus reaches it, and in plain sight once it has', async () => {
    await example(somewhere)
    const host = document.querySelector('helix-skip-link') as Skip
    await idle()
    expect(box(host)).toEqual({ height: 1, width: 1 })
    ;(part(host, 'link') as HTMLElement).focus()
    await idle()
    expect(box(host).width).toBeGreaterThan(80)
    expect(getComputedStyle(host).position).toBe('fixed')
  })

  run('pressed, it hands focus to the results and not to the header after it', async () => {
    await example(somewhere)
    const host = document.querySelector('helix-skip-link') as Skip
    await idle()
    ;(part(host, 'link') as HTMLElement).click()
    expect(document.activeElement?.id).toBe('results')
  })
})

describe('the preview example', () => {
  run('the page focuses the link, so the picture shows it revealed', async () => {
    await example(preview)
    await idle()
    const host = document.querySelector('helix-skip-link') as Skip
    expect(document.activeElement).toBe(host)
    expect(box(host).width).toBeGreaterThan(80)
  })
})

describe('the hooks the docs name', () => {
  /* The shown link's fill, ink, room and corner were fixed values, so a page
     whose header is dark could not make its skip link match without ::part. */
  test('are what the sheet reads, each falling back to the value it replaced', () => {
    const sheet = (
      customElements.get('helix-skip-link') as unknown as { styles: { cssText: string } }
    ).styles.cssText
    for (const [hook, fallback] of [
      ['--skip-link-background-color', '--helix-color-surface-inverse'],
      ['--skip-link-color', '--helix-color-foreground-inverse'],
      ['--skip-link-font-size', '--helix-text-sm'],
      ['--skip-link-inset-block', '--helix-space-sm'],
      ['--skip-link-inset-inline', '--helix-space-sm'],
      ['--skip-link-padding-block', '--helix-space-sm'],
      ['--skip-link-padding-inline', '--helix-space-md'],
      ['--skip-link-radius', '--helix-radii-sm'],
    ]) {
      expect(sheet).toContain(`var(${hook}, var(${fallback}))`)
    }
  })
})
