import { beforeAll, describe, expect, test } from 'bun:test'
import { mount, part, registerDom } from '@fusion-io/testing/dom'

beforeAll(async () => {
  registerDom()
  await import('../index.js')
})

type InputColor = HTMLElement & {
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

/** Moves one channel the way its slider does, which is by announcing. */
const move = async (host: InputColor, channel: string, to: number): Promise<void> => {
  const slider = host.shadowRoot?.querySelector(`[data-channel="${channel}"]`)
  slider?.dispatchEvent(
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

describe('input color', () => {
  test('the value is hex, and it is what the form gets', async () => {
    const host = await field('name="brand" default-value="#3366ff"')
    expect(host.value).toBe('#3366ff')
    expect(control(host).value).toBe('#3366ff')
  })

  test('the channels are read from a value that arrives from outside', async () => {
    // Pure red: hue 0, saturation 100, lightness 50. Moving lightness alone then
    // has to keep the red, which is only true if the hue was read in.
    const host = await field('default-value="#ff0000"')
    await move(host, 'lightness', 25)
    expect(host.value).toBe('#800000')
  })

  test('a hue survives a trip through a colour that has none', async () => {
    // The reason the channels are the state rather than a reading of the value.
    // Black is `hue: 0, saturation: 0`, so re-deriving the channels from the hex
    // on every change turns a red dragged to black into a grey on the way back.
    const host = await field('default-value="#00ff00"')
    await move(host, 'lightness', 0)
    expect(host.value).toBe('#000000')
    await move(host, 'lightness', 50)
    expect(host.value).toBe('#00ff00')
  })

  test('typing a colour seeds the channels, because that value came from outside too', async () => {
    const host = await field()
    await type(host, '#0000ff')
    await move(host, 'lightness', 25)
    expect(host.value).toBe('#000080')
  })

  test('short hex is a colour, and the channels read it', async () => {
    const host = await field()
    await type(host, '#f00')
    await move(host, 'lightness', 25)
    expect(host.value).toBe('#800000')
  })

  test('an empty field starts somewhere every slider can move from', async () => {
    // Not black, which is where `<input type="color">` starts: from black the hue
    // and saturation sliders both move nothing at all.
    const host = await field()
    await move(host, 'hue', 120)
    expect(host.value).toBe('#00ff00')
  })

  test('alpha widens the value, and only when it is asked for', async () => {
    const plain = await field('default-value="#ff0000"')
    await move(plain, 'lightness', 50)
    expect(plain.value).toBe('#ff0000')

    const clear = await field('alpha default-value="#ff0000"')
    await move(clear, 'alpha', 50)
    expect(clear.value).toBe('#ff000080')
  })

  test('and says so under its own name', async () => {
    const host = await field('default-value="#ff0000"')
    const said: { name: string; value: string }[] = []
    host.addEventListener('helix-change', (event) => {
      said.push((event as CustomEvent<{ name: string; value: string }>).detail)
    })
    await move(host, 'hue', 240)
    expect(said.at(-1)?.value).toBe('#0000ff')
  })

  test('presets render, and only the ones that are colours', async () => {
    const host = await field('swatches="#ff0000, not-a-colour, #00ff00"')
    const swatches = host.shadowRoot?.querySelectorAll('[part="swatch"]') ?? []
    expect([...swatches].map((one) => one.getAttribute('aria-label'))).toEqual([
      '#ff0000',
      '#00ff00',
    ])
  })

  test('choosing a preset takes it and shuts the panel', async () => {
    const host = await field('swatches="#ff0000,#00ff00"')
    host.open = true
    await host.updateComplete
    const swatch = host.shadowRoot?.querySelectorAll('[part="swatch"]')[1] as HTMLElement
    swatch.click()
    await host.updateComplete
    expect(host.value).toBe('#00ff00')
    expect(host.open).toBe(false)
    expect(swatch.getAttribute('aria-pressed')).toBe('true')
  })

  test('there are no presets before any are given', async () => {
    const host = await field()
    expect(host.shadowRoot?.querySelector('[part="swatches"]')).toBeNull()
  })

  test('the trigger says whether the panel is up', async () => {
    const host = await field()
    expect(part(host, 'trigger')?.getAttribute('aria-expanded')).toBe('false')
    host.open = true
    await host.updateComplete
    expect(part(host, 'trigger')?.getAttribute('aria-expanded')).toBe('true')
  })

  test('something that is not a colour is invalid, and says why', async () => {
    const host = await field()
    await type(host, '#zzz')
    expect(internals(host).validationMessage).toContain('#rrggbb')
  })

  test('an empty field is not invalid, it is empty', async () => {
    const host = await field()
    expect(internals(host).validationMessage).toBe('')
  })

  test('the hint is described by the input, not by the host', async () => {
    // An IDREF cannot leave a shadow root, so the description has to resolve in
    // the same tree as the control that points at it.
    const host = await field('hint="Any hex"')
    const described = control(host).getAttribute('aria-describedby')
    expect(described).toBeTruthy()
    const scope = control(host).getRootNode() as ShadowRoot
    expect(scope.getElementById(described as string)?.textContent).toContain('Any hex')
  })

  test('the channel numbers reach the stylesheet, so a track can be painted', async () => {
    const host = await field('default-value="#00ff00"')
    const channels = part(host, 'channels') as HTMLElement
    expect(channels.getAttribute('style')).toContain('--_hue: 120')
    expect(channels.getAttribute('style')).toContain('--_saturation: 100%')
  })
})
