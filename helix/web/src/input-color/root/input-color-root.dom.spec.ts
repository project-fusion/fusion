import { beforeAll, describe, expect, test } from 'bun:test'
import { mount, part, registerDom } from '@fusion-io/testing/dom'

beforeAll(async () => {
  registerDom()
  await import('../index.js')
})

type InputColor = HTMLElement & { open: boolean; updateComplete: Promise<unknown>; value: string }

const field = async (attrs = ''): Promise<InputColor> => {
  const host = (await mount(`<helix-input-color label="Brand" ${attrs}>
  </helix-input-color>`)) as InputColor
  await host.updateComplete
  return host
}

const control = (host: InputColor): HTMLInputElement => part(host, 'control') as HTMLInputElement

/** Validity lives on the internals, not on the host, the same as Input Pin. */
const internals = (host: HTMLElement): ElementInternals =>
  (host as unknown as { internals: ElementInternals }).internals

const type = async (host: InputColor, text: string): Promise<void> => {
  control(host).value = text
  control(host).dispatchEvent(new Event('input', { bubbles: true }))
  await host.updateComplete
}

describe('input color', () => {
  test('the picker is the real helix-color, not a second one written here', async () => {
    // The same arrangement Input Date has with the calendar: a settings pane
    // wants the picker flat on a page, and neither should be the other one with
    // parts hidden.
    const picker = part(await field(), 'picker')
    expect(picker?.tagName.toLowerCase()).toBe('helix-color')
  })

  test('the value reaches the picker, and what it answers reaches the form', async () => {
    const host = await field('default-value="#ff0000" name="brand"')
    const picker = part(host, 'picker') as HTMLElement & { value: string }
    expect(picker.value).toBe('#ff0000')

    picker.dispatchEvent(
      new CustomEvent('helix-change', {
        bubbles: true,
        composed: true,
        detail: { name: 'color', value: '#00ff00' },
      }),
    )
    await host.updateComplete
    expect(host.value).toBe('#00ff00')
    expect(control(host).value).toBe('#00ff00')
  })

  test('the picker says nothing under its own name, so a consumer hears one control', async () => {
    const host = await field('default-value="#ff0000"')
    const said: string[] = []
    host.addEventListener('helix-change', (event) => {
      said.push((event as CustomEvent<{ value: string }>).detail.value)
    })
    part(host, 'picker')?.dispatchEvent(
      new CustomEvent('helix-change', {
        bubbles: true,
        composed: true,
        detail: { name: 'color', value: '#00ff00' },
      }),
    )
    await host.updateComplete
    expect(said).toEqual(['#00ff00'])
  })

  test('typing any syntax is accepted', async () => {
    for (const written of ['#f00', 'rgb(255 0 0)', 'hsl(0 100% 50%)', 'rgba(255,0,0,.5)']) {
      const host = await field()
      await type(host, written)
      expect(internals(host).validationMessage).toBe('')
    }
  })

  test('something that is not a colour is invalid, and says what one looks like', async () => {
    const host = await field()
    await type(host, 'rebeccapurple')
    expect(internals(host).validationMessage).toContain('#ff0000')
  })

  test('an empty field is not invalid, it is empty', async () => {
    const host = await field()
    expect(internals(host).validationMessage).toBe('')
  })

  test('the preview is clear before a colour is in it', async () => {
    const empty = await field()
    expect(part(empty, 'preview')?.getAttribute('style')).toContain('transparent')
    const set = await field('default-value="rgb(255 0 0)"')
    expect(part(set, 'preview')?.getAttribute('style')).toContain('255 0 0')
  })

  test('the trigger says whether the panel is up', async () => {
    const host = await field()
    expect(part(host, 'trigger')?.getAttribute('aria-expanded')).toBe('false')
    host.open = true
    await host.updateComplete
    expect(part(host, 'trigger')?.getAttribute('aria-expanded')).toBe('true')
  })

  test('the panel gets out of the way while the eyedropper has the pointer', async () => {
    /* `helix-color` cannot know it is in a panel, so it says what it is doing
       and whatever does know decides. A floating panel left up during a sample
       is one the reader cannot dismiss and may be trying to sample from
       underneath. */
    const host = await field()
    host.open = true
    await host.updateComplete
    const picker = part(host, 'picker') as HTMLElement
    picker.dispatchEvent(new Event('helix-sample-start', { bubbles: true, composed: true }))
    await host.updateComplete
    expect(host.open).toBe(false)
    picker.dispatchEvent(new Event('helix-sample-end', { bubbles: true, composed: true }))
    await host.updateComplete
    expect(host.open).toBe(true)
  })

  test('the hint is described by the input, not by the host', async () => {
    // An IDREF cannot leave a shadow root, so the description has to resolve in
    // the same tree as the control that points at it.
    const host = await field('hint="Any syntax"')
    const described = control(host).getAttribute('aria-describedby')
    expect(described).toBeTruthy()
    const scope = control(host).getRootNode() as ShadowRoot
    expect(scope.getElementById(described as string)?.textContent).toContain('Any syntax')
  })
})
