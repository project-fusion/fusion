import { beforeAll, describe, expect, test } from 'bun:test'
import { mount, part, registerDom } from '@fusion-io/testing/dom'

beforeAll(async () => {
  registerDom()
  await import('../index.js')
})

type InputColor = HTMLElement & {
  format: string
  open: boolean
  updateComplete: Promise<unknown>
  value: string
}

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

/** Moves one axis of the square, which is a real range input. */
const axis = async (host: InputColor, which: string, to: number): Promise<void> => {
  const range = part(host, `grid-${which}`) as HTMLInputElement
  range.value = String(to)
  range.dispatchEvent(new Event('input', { bubbles: true }))
  await host.updateComplete
}

/** Moves one of the ramps, which announce rather than being driven directly. */
const ramp = async (host: InputColor, channel: string, to: number): Promise<void> => {
  host.shadowRoot?.querySelector(`[data-channel="${channel}"]`)?.dispatchEvent(
    new CustomEvent('helix-change', {
      bubbles: true,
      composed: true,
      detail: { name: channel, value: String(to) },
    }),
  )
  await host.updateComplete
}

const type = async (host: InputColor, text: string): Promise<void> => {
  control(host).value = text
  control(host).dispatchEvent(new Event('input', { bubbles: true }))
  await host.updateComplete
}

describe('input color syntaxes', () => {
  test('every one of them is read, whatever the field writes', async () => {
    // A field that refuses `rgb(255 0 0)` because it prefers hex is arguing with
    // the person using it. Each of these is the same red, and each has to land
    // as that red rather than as a validation error.
    for (const written of [
      '#f00',
      '#ff0000',
      '#FF0000',
      'rgb(255 0 0)',
      'rgb(255, 0, 0)',
      'rgba(255, 0, 0, 1)',
      'rgb(100% 0% 0%)',
      'hsl(0 100% 50%)',
      'hsl(0, 100%, 50%)',
      'hsla(0, 100%, 50%, 1)',
    ]) {
      const host = await field()
      await type(host, written)
      expect(internals(host).validationMessage).toBe('')
      // Read all the way into the model: moving one axis proves the hue landed.
      await axis(host, 'saturation', 0)
      expect(host.value).toBe('#ffffff')
    }
  })

  test('and the alpha comes with them', async () => {
    for (const written of ['#ff000080', 'rgb(255 0 0 / 50%)', 'rgba(255,0,0,0.5)']) {
      const host = await field('alpha')
      await type(host, written)
      await ramp(host, 'hue', 0)
      expect(host.value).toBe('#ff000080')
    }
  })

  test('what is written is the format, whatever was read', async () => {
    const host = await field('format="rgb"')
    await type(host, '#ff0000')
    await ramp(host, 'hue', 120)
    expect(host.value).toBe('rgb(0 255 0)')
  })

  test('hsl too, and it round trips through the model', async () => {
    const host = await field('format="hsl"')
    await type(host, 'rgb(255 0 0)')
    await ramp(host, 'hue', 240)
    expect(host.value).toBe('hsl(240 100% 50%)')
  })

  test('the toggle walks hex to rgb to hsl and back, rewriting as it goes', async () => {
    const host = await field('default-value="#ff0000"')
    const toggle = part(host, 'format') as HTMLElement
    toggle.click()
    await host.updateComplete
    expect(host.value).toBe('rgb(255 0 0)')
    toggle.click()
    await host.updateComplete
    expect(host.value).toBe('hsl(0 100% 50%)')
    toggle.click()
    await host.updateComplete
    expect(host.value).toBe('#ff0000')
  })

  test('a name is not a colour here, and says so rather than half working', async () => {
    // Resolving `rebeccapurple` means shipping a table of a hundred and forty or
    // asking a browser that is not there during a server render.
    const host = await field()
    await type(host, 'rebeccapurple')
    expect(internals(host).validationMessage).toContain('#ff0000')
  })

  test('an empty field is not invalid, it is empty', async () => {
    const host = await field()
    expect(internals(host).validationMessage).toBe('')
  })
})

describe('input color panel', () => {
  test('the square is two real range inputs, which is what makes it reachable', async () => {
    // No `role="application"` and no key handler: the platform brings the arrow
    // keys, Home, End, the page keys and a name a screen reader can announce.
    const host = await field()
    const saturation = part(host, 'grid-saturation') as HTMLInputElement
    const brightness = part(host, 'grid-brightness') as HTMLInputElement
    expect(saturation.type).toBe('range')
    expect(brightness.type).toBe('range')
    expect(saturation.getAttribute('aria-label')).toBe('Saturation')
    expect(brightness.getAttribute('aria-label')).toBe('Brightness')
    expect(part(host, 'grid')?.getAttribute('role')).toBeNull()
  })

  test('the handle is hidden from the tree, because the ranges are the control', async () => {
    const host = await field()
    expect(part(host, 'grid-handle')?.getAttribute('aria-hidden')).toBe('true')
  })

  test('moving an axis moves the colour', async () => {
    const host = await field('default-value="#ff0000"')
    await axis(host, 'brightness', 50)
    expect(host.value).toBe('#800000')
  })

  test('a hue survives a trip through a colour that has none', async () => {
    // The reason the model is the state rather than a reading of the value.
    // Black is brightness 0, whose hue and saturation are both undefined, so
    // re-deriving from the hex turns a green dragged down into a grey coming up.
    const host = await field('default-value="#00ff00"')
    await axis(host, 'brightness', 0)
    expect(host.value).toBe('#000000')
    await axis(host, 'brightness', 100)
    expect(host.value).toBe('#00ff00')
  })

  test('an empty field starts somewhere every control can move from', async () => {
    // Not black, which is where `<input type="color">` starts: from there the hue
    // ramp moves nothing and the square is one flat colour.
    const host = await field()
    await ramp(host, 'hue', 120)
    expect(host.value).toBe('#00ff00')
  })

  test('the square is painted from the hue and positioned from the two axes', async () => {
    const host = await field('default-value="#00ff00"')
    expect(part(host, 'surface')?.getAttribute('style')).toContain('--_hue: 120')
    const grid = part(host, 'grid')?.getAttribute('style')
    expect(grid).toContain('--_saturation: 100%')
    expect(grid).toContain('--_brightness: 100%')
  })

  test('alpha is offered only when it is asked for', async () => {
    const plain = await field()
    expect(plain.shadowRoot?.querySelector('[data-channel="alpha"]')).toBeNull()
    const clear = await field('alpha')
    expect(clear.shadowRoot?.querySelector('[data-channel="alpha"]')).not.toBeNull()
  })

  test('presets render, and only the ones that are colours', async () => {
    const host = await field('swatches="#ff0000, not-a-colour, rgb(0 255 0)"')
    expect(
      [...(host.shadowRoot?.querySelectorAll('[part="swatch"]') ?? [])].map((one) =>
        one.getAttribute('aria-label'),
      ),
    ).toEqual(['#ff0000', 'rgb(0 255 0)'])
  })

  test('a preset is taken in the field format, not as the preset spelled it', async () => {
    const host = await field('format="rgb" swatches="#00ff00"')
    const swatch = host.shadowRoot?.querySelector('[part="swatch"]') as HTMLElement
    swatch.click()
    await host.updateComplete
    expect(host.value).toBe('rgb(0 255 0)')
  })

  test('the format toggle can be withheld', async () => {
    const host = await field('no-format')
    expect(host.shadowRoot?.querySelector('[part="format"]')).toBeNull()
  })

  test('the trigger says whether the panel is up', async () => {
    const host = await field()
    expect(part(host, 'trigger')?.getAttribute('aria-expanded')).toBe('false')
    host.open = true
    await host.updateComplete
    expect(part(host, 'trigger')?.getAttribute('aria-expanded')).toBe('true')
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
