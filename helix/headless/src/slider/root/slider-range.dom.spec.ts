import { beforeAll, describe, expect, test } from 'bun:test'
import { formValue, mount, part, registerDom } from '@fusion.dev/helix-testing/dom'

beforeAll(async () => {
  registerDom()
  await import('../index.js')
})

type Slider = HTMLElement & { value: string; updateComplete: Promise<unknown> }

const slider = async (attrs = ''): Promise<Slider> => {
  const host = (await mount(
    `<helix-headless-slider label="Price" ${attrs}></helix-headless-slider>`,
  )) as Slider
  await host.updateComplete
  return host
}

const thumbs = (host: Slider): HTMLInputElement[] => [
  ...(host.shadowRoot as ShadowRoot).querySelectorAll<HTMLInputElement>('[part="control"]'),
]

const move = async (host: Slider, which: 'end' | 'start', to: string): Promise<void> => {
  const control = thumbs(host).find((one) => one.dataset.thumb === which) as HTMLInputElement
  control.value = to
  control.dispatchEvent(new Event('input', { bubbles: true, composed: true }))
  await host.updateComplete
}

describe('a slider with two thumbs', () => {
  test('is two real ranges, not one control drawn twice', async () => {
    /* There is no native two-thumb range, and the answer is not to stop using
       the platform's: each thumb keeps its own drag, arrow keys, Home and End
       and finger-sized hit area. */
    const host = await slider('range default-value="20,70"')
    const controls = thumbs(host)
    expect(controls.length).toBe(2)
    expect(controls.every((one) => one.type === 'range')).toBe(true)
  })

  test('and one thumb without it', async () => {
    expect(thumbs(await slider('default-value="40"')).length).toBe(1)
  })

  test('both span the whole range, so they read against the same track', async () => {
    /* Bounding the lower one by the upper reads well and breaks the drawing: an
       input's thumb sits at a fraction of its own range, so a lower thumb
       bounded at the upper paints against a shorter track and the two stop
       lining up. */
    const host = await slider('range min="0" max="200" default-value="50,150"')
    for (const control of thumbs(host)) {
      expect(control.min).toBe('0')
      expect(control.max).toBe('200')
    }
  })

  /** A thumb's name as a reader hears it: every element it points at, in order. */
  const named = (control: HTMLInputElement): string => {
    const scope = control.getRootNode() as ShadowRoot
    return (control.getAttribute('aria-labelledby') ?? '')
      .split(/\s+/)
      .map((id) => scope.getElementById(id)?.textContent?.trim() ?? '')
      .join(' ')
  }

  test("each thumb says which end it is, after the slider's own name", async () => {
    const host = await slider('range default-value="20,70"')
    expect(thumbs(host).map(named)).toEqual(['Price minimum', 'Price maximum'])
  })

  test("and the words are the page's, the name included however it was given", async () => {
    /* `aria-label` on each thumb read the `label` string alone, so a slider
       named by the host's `aria-label` had thumbs called "minimum" and
       "maximum", and it overrode the label element besides. */
    document.body.innerHTML =
      '<helix-headless-slider aria-label="Prix" range default-value="20,70" minimum-label="plancher" maximum-label="plafond"></helix-headless-slider>'
    const host = document.body.firstElementChild as Slider
    await host.updateComplete
    expect(thumbs(host).map(named)).toEqual(['Prix plancher', 'Prix plafond'])
  })

  test('the lower thumb stops at the upper rather than crossing it', async () => {
    const host = await slider('range default-value="20,70"')
    await move(host, 'start', '90')
    expect(host.value).toBe('70,70')
  })

  test('and the upper stops at the lower', async () => {
    const host = await slider('range default-value="20,70"')
    await move(host, 'end', '5')
    expect(host.value).toBe('20,20')
  })

  test('moving one leaves the other where it was', async () => {
    const host = await slider('range default-value="20,70"')
    await move(host, 'start', '35')
    expect(host.value).toBe('35,70')
  })

  test('with no pair it opens fully wide rather than pinned shut', async () => {
    /* An untouched range slider does not hold an empty string: the native input
       reports its own midpoint and the mixin takes it, so `value` came back as
       "50" here and reading that as the lower thumb put the filter half shut
       before anyone touched it. Only a pair is a pair. */
    const host = await slider('range min="10" max="90"')
    const controls = thumbs(host)
    expect(controls.map((one) => one.value)).toEqual(['10', '90'])
  })

  test('the readout says a span, because the value is one', async () => {
    const host = await slider('range default-value="20,70" show-value')
    expect(part(host, 'output')?.textContent?.trim()).toBe('20 to 70')
  })

  test("and range-text joins the two in the page's words", async () => {
    const host = await slider(
      'range default-value="20,70" show-value range-text="{start} bis {end}"',
    )
    expect(part(host, 'output')?.textContent?.trim()).toBe('20 bis 70')
  })
})

describe('a single thumb with an origin', () => {
  const style = (host: Slider): string =>
    (thumbs(host)[0] as HTMLInputElement).getAttribute('style') ?? ''

  test('fills from the middle of the track to the thumb, on either side', async () => {
    const below = await slider('origin="center" min="-50" max="50" default-value="-30"')
    expect(style(below)).toContain('--slider-from: 0.2; --slider-to: 0.5')
    const above = await slider('origin="center" min="-50" max="50" default-value="30"')
    expect(style(above)).toContain('--slider-from: 0.5; --slider-to: 0.8')
    expect(thumbs(above)[0]?.dataset.origin).toBe('center')
  })

  test('fills from max with end, and from min with none', async () => {
    expect(style(await slider('origin="end" default-value="25"'))).toContain(
      '--slider-from: 0.25; --slider-to: 1',
    )
    const plain = await slider('default-value="25"')
    expect(style(plain)).toBe('--slider-fraction: 0.25')
    expect(thumbs(plain)[0]?.hasAttribute('data-origin')).toBe(false)
  })
})

describe('a range nobody has touched', () => {
  /* It was seeded with the midpoint, drew its thumbs at the ends, and submitted
     `sr=50`, a single number for a control that holds a pair. */
  test('holds and submits the whole span as a pair', async () => {
    const host = await slider('range name="sr" min="10" max="90"')
    expect(host.value).toBe('10,90')
    expect(formValue(host)).toBe('10,90')
  })

  test('and a reset returns it there', async () => {
    const host = (await slider('range min="10" max="90"')) as Slider & {
      formResetCallback(): void
    }
    await move(host, 'start', '40')
    host.formResetCallback()
    await host.updateComplete
    expect(host.value).toBe('10,90')
  })
})

describe('a value the slider cannot show', () => {
  /* The thumb showed the clamped number and the form submitted the written
     one, 150 on a slider that stops at 100. */
  test('is clamped into the bounds', async () => {
    const host = await slider('name="s" max="100"')
    host.value = '150'
    await host.updateComplete
    expect(host.value).toBe('100')
    expect(formValue(host)).toBe('100')
  })

  test('is snapped onto the step', async () => {
    const host = await slider('step="10"')
    host.value = '33'
    await host.updateComplete
    expect(host.value).toBe('30')
  })

  test('follows a bound that moves under it', async () => {
    const host = (await slider('default-value="80"')) as Slider & { max: number }
    host.max = 50
    await host.updateComplete
    expect(host.value).toBe('50')
  })

  test('and a range keeps its two ends in order and in bounds', async () => {
    const host = await slider('range max="100"')
    host.value = '120,-5'
    await host.updateComplete
    expect(host.value).toBe('0,100')
  })
})

describe('what a screen reader says for the value', () => {
  test('carries the words a consumer wrote for it', async () => {
    const host = await slider('default-value="40" value-text="{value} degrees"')
    expect(thumbs(host)[0]?.getAttribute('aria-valuetext')).toBe('40 degrees')
  })
})

describe('the bounds each thumb announces', () => {
  /* The multi-thumb slider pattern has each thumb stop at the other, and both
     announced the whole track. */
  test('stop at the other thumb', async () => {
    const host = await slider('range default-value="20,70"')
    const [start, end] = thumbs(host)
    expect(start?.getAttribute('aria-valuemax')).toBe('70')
    expect(start?.hasAttribute('aria-valuemin')).toBe(false)
    expect(end?.getAttribute('aria-valuemin')).toBe('20')
    expect(end?.hasAttribute('aria-valuemax')).toBe(false)
  })
})
