import { beforeAll, describe, expect, test } from 'bun:test'
import { hasState, mount, part, registerDom } from '@fusion.dev/helix-testing/dom'

beforeAll(async () => {
  registerDom()
  await import('../index.js')
  await import('../../toolbar/index.js')
})

const line = (host: HTMLElement): Element | null => part(host, 'line')

describe('divider semantics', () => {
  /* Decorative by default left every rule out of the tree, where `<hr>` and
     every peer's separator are in it. */
  test('is a separator by default, as `<hr>` is', async () => {
    const divider = await mount('<helix-headless-divider></helix-headless-divider>')
    expect(line(divider)?.getAttribute('role')).toBe('separator')
    expect(line(divider)?.getAttribute('aria-orientation')).toBe('horizontal')
  })

  test('`decorative` takes a rule that separates nothing out of the way', async () => {
    const divider = await mount('<helix-headless-divider decorative>Or</helix-headless-divider>')
    expect(line(divider)?.getAttribute('role')).toBe('presentation')
    expect(line(divider)?.hasAttribute('aria-orientation')).toBe(false)
    expect(line(divider)?.hasAttribute('aria-labelledby')).toBe(false)
  })

  test('`announced`, the old opt-in, keeps a separator over `decorative`', async () => {
    const divider = await mount(
      '<helix-headless-divider announced decorative></helix-headless-divider>',
    )
    expect(line(divider)?.getAttribute('role')).toBe('separator')
  })

  test('carries its orientation into the accessibility tree', async () => {
    const divider = await mount(
      '<helix-headless-divider announced orientation="vertical"></helix-headless-divider>',
    )
    expect(line(divider)?.getAttribute('aria-orientation')).toBe('vertical')
  })

  /* A word set into the line, such as "Or", was beside an unnamed separator. */
  test('an announced separator is named by the content set into it', async () => {
    const divider = await mount('<helix-headless-divider announced>Or</helix-headless-divider>')
    const reference = line(divider)?.getAttribute('aria-labelledby') ?? ''
    expect(divider.shadowRoot?.getElementById(reference) ?? null).toBe(
      part(divider, 'content') as HTMLElement | null,
    )
    const plain = await mount('<helix-headless-divider>Or</helix-headless-divider>')
    expect(line(plain)?.getAttribute('aria-labelledby')).toBe('content')
  })

  test('an announced separator with no orientation is horizontal', async () => {
    const divider = await mount('<helix-headless-divider announced></helix-headless-divider>')
    expect(line(divider)?.getAttribute('aria-orientation')).toBe('horizontal')
  })
})

/* React Aria's separator inside a toolbar takes the toolbar's other axis. A
   divider in a horizontal toolbar was a horizontal separator, and drew as one,
   unless the page wrote `orientation="vertical"` on it. */
describe('inside a toolbar', () => {
  const inside = async (
    toolbar: string,
    divider = '<helix-headless-divider></helix-headless-divider>',
  ) => {
    const host = await mount(toolbar.replace('><', `>${divider}<`))
    const found = host.querySelector('helix-headless-divider') as HTMLElement & {
      updateComplete: Promise<unknown>
    }
    await found.updateComplete
    return found
  }

  test('runs across a horizontal toolbar, as a vertical separator', async () => {
    const divider = await inside('<helix-headless-toolbar></helix-headless-toolbar>')
    expect(line(divider)?.getAttribute('role')).toBe('separator')
    expect(line(divider)?.getAttribute('aria-orientation')).toBe('vertical')
    expect(hasState(divider, 'vertical')).toBe(true)
    expect(divider.hasAttribute('orientation')).toBe(false)
  })

  test('runs across a vertical toolbar, as a horizontal separator', async () => {
    const divider = await inside(
      '<helix-headless-toolbar orientation="vertical"></helix-headless-toolbar>',
    )
    expect(line(divider)?.getAttribute('aria-orientation')).toBe('horizontal')
    expect(hasState(divider, 'vertical')).toBe(false)
  })

  test("in the page's own toolbar role, by its `aria-orientation`", async () => {
    expect(line(await inside('<div role="toolbar"></div>'))?.getAttribute('aria-orientation')).toBe(
      'vertical',
    )
    const across = await inside('<div role="toolbar" aria-orientation="vertical"></div>')
    expect(line(across)?.getAttribute('aria-orientation')).toBe('horizontal')
  })

  test('an `orientation` the page wrote still wins', async () => {
    const divider = await inside(
      '<helix-headless-toolbar></helix-headless-toolbar>',
      '<helix-headless-divider orientation="horizontal"></helix-headless-divider>',
    )
    expect(line(divider)?.getAttribute('aria-orientation')).toBe('horizontal')
    expect(hasState(divider, 'vertical')).toBe(false)
  })

  test('turns again when the toolbar turns', async () => {
    const divider = await inside('<helix-headless-toolbar></helix-headless-toolbar>')
    const toolbar = divider.parentElement as HTMLElement & { updateComplete: Promise<unknown> }
    toolbar.setAttribute('orientation', 'vertical')
    await toolbar.updateComplete
    await (divider as HTMLElement & { updateComplete: Promise<unknown> }).updateComplete
    expect(line(divider)?.getAttribute('aria-orientation')).toBe('horizontal')
  })

  test('reads the toolbar again when it moves into one', async () => {
    const divider = await mount('<helix-headless-divider></helix-headless-divider>')
    expect(hasState(divider, 'vertical')).toBe(false)
    const toolbar = document.createElement('helix-headless-toolbar')
    document.body.append(toolbar)
    toolbar.append(divider)
    await (divider as HTMLElement & { updateComplete: Promise<unknown> }).updateComplete
    expect(hasState(divider, 'vertical')).toBe(true)
  })

  test('a vertical divider outside a toolbar has the state too', async () => {
    const divider = await mount(
      '<helix-headless-divider orientation="vertical"></helix-headless-divider>',
    )
    expect(hasState(divider, 'vertical')).toBe(true)
  })
})
