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
    expect((formValue(host) as FormData).getAll('sr')).toEqual(['10', '90'])
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

describe('a range in a form', () => {
  /* It sent `price=40,80`, one entry a server has to split on a convention
     this library chose. React Aria's thumbs send one entry each. */
  test('submits one entry per thumb under its name, the lower first', async () => {
    const host = await slider('range name="price" default-value="40,80"')
    await move(host, 'end', '90')
    expect((formValue(host) as FormData).getAll('price')).toEqual(['40', '90'])
  })

  test('and restores the pair it saved', async () => {
    const host = (await slider('range name="price" default-value="40,80"')) as Slider & {
      formStateRestoreCallback(state: string): void
    }
    host.formStateRestoreCallback('20,60')
    await host.updateComplete
    expect(host.value).toBe('20,60')
  })
})

describe('a read-only slider', () => {
  const key = (control: HTMLInputElement, name: string): KeyboardEvent => {
    const event = new KeyboardEvent('keydown', { bubbles: true, cancelable: true, key: name })
    control.dispatchEvent(event)
    return event
  }

  test('says so on each thumb, and keeps its value under a drag', async () => {
    const host = await slider('range readonly name="price" default-value="40,80"')
    expect(thumbs(host).map((one) => one.getAttribute('aria-readonly'))).toEqual(['true', 'true'])
    await move(host, 'start', '10')
    expect(host.value).toBe('40,80')
    expect(thumbs(host)[0]?.value).toBe('40')
    expect((formValue(host) as FormData).getAll('price')).toEqual(['40', '80'])
  })

  test('refuses the keys that move a thumb and lets Tab through', async () => {
    const host = await slider('readonly default-value="40"')
    const control = thumbs(host)[0] as HTMLInputElement
    for (const name of ['ArrowRight', 'ArrowUp', 'PageUp', 'Home', 'End']) {
      expect(key(control, name).defaultPrevented).toBe(true)
    }
    expect(key(control, 'Tab').defaultPrevented).toBe(false)
  })

  test('and a slider that is not read-only says nothing of it', async () => {
    const host = await slider('default-value="40"')
    const control = thumbs(host)[0] as HTMLInputElement
    expect(control.hasAttribute('aria-readonly')).toBe(false)
    expect(key(control, 'ArrowRight').defaultPrevented).toBe(false)
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

  /* `max="1OO"` parses to `NaN`, and the form received `NaN`. A native range
     falls back to its default bound for one it cannot read. */
  test('is held to the default bounds and step where those are not numbers', async () => {
    const high = await slider('name="s" max="1OO" default-value="150"')
    expect([high.value, formValue(high)]).toEqual(['100', '100'])
    const low = await slider('min="zero" default-value="-5"')
    expect(low.value).toBe('0')
    const stepped = await slider('step="ten" default-value="33.4"')
    expect(stepped.value).toBe('33')
    const range = await slider('range max="1OO"')
    expect(range.value).toBe('0,100')
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

/* Web Awesome's slider has `with-tooltip`: each thumb's value in a bubble
   beside it. Here only the readout beside the track said the value. */
describe('a bubble for each thumb', () => {
  const bubbles = (host: Slider): HTMLElement[] => [
    ...(host.shadowRoot as ShadowRoot).querySelectorAll<HTMLElement>('[part="tooltip"]'),
  ]

  test('is drawn only under `tooltip`, hidden from a reader', async () => {
    expect(bubbles(await slider('default-value="40"'))).toHaveLength(0)
    const host = await slider('tooltip default-value="40"')
    expect(bubbles(host).map((one) => one.textContent?.trim())).toEqual(['40'])
    expect(part(host, 'tooltips')?.getAttribute('aria-hidden')).toBe('true')
    expect(part(host, 'field')?.hasAttribute('data-tooltip')).toBe(true)
    expect(bubbles(host)[0]?.getAttribute('style')).toContain('--slider-at: 0.4')
  })

  test('says each thumb of a range where it is, and follows a move', async () => {
    const host = await slider('range tooltip default-value="20,70"')
    expect(bubbles(host).map((one) => [one.dataset.thumb, one.textContent?.trim()])).toEqual([
      ['start', '20'],
      ['end', '70'],
    ])
    await move(host, 'end', '60')
    expect(bubbles(host)[1]?.textContent?.trim()).toBe('60')
    expect(bubbles(host)[1]?.getAttribute('style')).toContain('--slider-at: 0.6')
  })
})

describe('content on a thumb', () => {
  const boxes = (host: Slider): HTMLElement[] => [
    ...(host.shadowRoot as ShadowRoot).querySelectorAll<HTMLElement>('[part="thumb"]'),
  ]
  const layer = (host: Slider): HTMLElement =>
    (host.shadowRoot as ShadowRoot).querySelector('[part="thumbs"]') as HTMLElement
  const settle = async (host: Slider): Promise<void> => {
    for (const slot of (host.shadowRoot as ShadowRoot).querySelectorAll('slot')) {
      slot.dispatchEvent(new Event('slotchange'))
    }
    await host.updateComplete
  }

  test('is a box for each thumb at its place, holding its slot, hidden from a reader', async () => {
    const host = await slider('range default-value="20,70"')
    expect(layer(host).getAttribute('aria-hidden')).toBe('true')
    expect(boxes(host).map((box) => box.dataset.thumb)).toEqual(['start', 'end'])
    expect(boxes(host).map((box) => box.style.getPropertyValue('--slider-at').trim())).toEqual([
      '0.2',
      '0.7',
    ])
    expect(boxes(host).map((box) => box.querySelector('slot')?.name)).toEqual([
      'thumb',
      'thumb-end',
    ])
  })

  test('takes no room until a slot has content, then says so on the field', async () => {
    const host = await slider('default-value="40"')
    const field = part(host, 'field') as HTMLElement
    expect(layer(host).hidden).toBe(true)
    expect(field.hasAttribute('data-thumbs')).toBe(false)
    const glyph = document.createElement('span')
    glyph.slot = 'thumb'
    glyph.textContent = '|'
    host.append(glyph)
    await settle(host)
    expect(layer(host).hidden).toBe(false)
    expect(field.hasAttribute('data-thumbs')).toBe(true)
    expect(boxes(host)[0]?.style.getPropertyValue('--slider-at').trim()).toBe('0.4')
  })
})

describe('a vertical slider', () => {
  /* `orientation` reached the stylesheet alone, so the headless slider was a
     horizontal one to the accessibility tree, which reads the axis off the
     range's writing mode. */
  test('stands each range on end, maximum at the top, with no stylesheet', async () => {
    for (const extra of ['', 'range']) {
      const host = await slider(`orientation="vertical" ${extra}`)
      for (const control of thumbs(host)) {
        expect(control.style.writingMode).toBe('vertical-lr')
        expect(control.style.direction).toBe('rtl')
      }
    }
    const flat = await slider()
    expect(thumbs(flat)[0]?.style.writingMode).toBe('')
  })
})

/* React Aria's slider takes any number of thumbs; a range here held two, and a
   third value was dropped. */
describe('a range with more than two thumbs', () => {
  test('has a thumb for each value, in order, each named by its place', async () => {
    const host = await slider('range name="p" default-value="80,20,50"')
    expect(host.value).toBe('20,50,80')
    const controls = thumbs(host)
    expect(controls.map((one) => one.value)).toEqual(['20', '50', '80'])
    expect(controls.map((one) => one.dataset.thumb)).toEqual(['start', 'middle', 'end'])
    expect(controls.map((one) => one.id)).toEqual(['control', 'control-1', 'control-end'])
    const scope = host.shadowRoot as ShadowRoot
    const named = (control: HTMLInputElement): string =>
      (control.getAttribute('aria-labelledby') ?? '')
        .split(/\s+/)
        .map((id) => scope.getElementById(id)?.textContent?.trim() ?? '')
        .join(' ')
    expect(controls.map(named)).toEqual(['Price minimum', 'Price thumb 2', 'Price maximum'])
    expect((formValue(host) as FormData).getAll('p')).toEqual(['20', '50', '80'])
  })

  test('stops each thumb at its neighbors, and says so', async () => {
    const host = await slider('range default-value="20,50,80" min-steps-between-thumbs="5"')
    const middle = thumbs(host)[1] as HTMLInputElement
    expect(middle.getAttribute('aria-valuemin')).toBe('25')
    expect(middle.getAttribute('aria-valuemax')).toBe('75')
    middle.value = '95'
    middle.dispatchEvent(new Event('input', { bubbles: true, composed: true }))
    await host.updateComplete
    expect(host.value).toBe('20,75,80')
    middle.value = '0'
    middle.dispatchEvent(new Event('input', { bubbles: true, composed: true }))
    await host.updateComplete
    expect(host.value).toBe('20,25,80')
  })

  test('lists every value in the readout', async () => {
    const host = await slider('range show-value default-value="20,50,80"')
    expect(part(host, 'output')?.textContent?.trim()).toBe('20, 50, and 80')
    expect(part(host, 'output')?.getAttribute('for')).toBe('control control-1 control-end')
  })
})

describe('a press on a range track', () => {
  /* A track 216 pixels long from x = 0, with a 16 pixel thumb: the thumb's
     center runs from 8 to 208, so a value of 0 to 100 is two pixels a step. */
  const laidOut = async (host: Slider, run: () => Promise<void>): Promise<void> => {
    const real = HTMLElement.prototype.getBoundingClientRect
    HTMLElement.prototype.getBoundingClientRect = function (this: HTMLElement) {
      const width = this.localName === 'span' ? 16 : 216
      return { bottom: 8, height: 8, left: 0, right: width, top: 0, width, x: 0, y: 0 } as DOMRect
    }
    try {
      await run()
    } finally {
      HTMLElement.prototype.getBoundingClientRect = real
    }
    await host.updateComplete
  }
  const press = (host: Slider, type: string, clientX: number): void => {
    const field = part(host, 'field') as HTMLElement
    field.dispatchEvent(
      new PointerEvent(type, { bubbles: true, button: 0, cancelable: true, clientX, pointerId: 1 }),
    )
  }

  /* Measured before this: a press at 90 on a range holding 20 and 60 reached
     no input, the inputs taking presses on their thumbs only, and changed
     nothing. */
  test('takes the nearest thumb there, drags it, and says `change` as it lifts', async () => {
    const host = (await slider('range default-value="20,60"')) as Slider & {
      internals: ElementInternals
    }
    const heard: string[] = []
    host.addEventListener('change', () => heard.push(host.value))
    await laidOut(host, async () => {
      press(host, 'pointerdown', 188)
      await host.updateComplete
      expect(host.value).toBe('20,90')
      expect(host.internals.states.has('dragging')).toBe(true)
      press(host, 'pointermove', 158)
      await host.updateComplete
      expect(host.value).toBe('20,75')
      press(host, 'pointerup', 158)
      window.dispatchEvent(new Event('pointerup'))
    })
    expect(host.internals.states.has('dragging')).toBe(false)
    expect(heard).toEqual(['20,75'])
    expect(host.shadowRoot?.activeElement?.getAttribute('data-thumb')).toBe('end')
  })

  test('the lower thumb for a press below it, kept short of the other', async () => {
    const host = await slider('range default-value="20,60" min-steps-between-thumbs="5"')
    await laidOut(host, async () => {
      press(host, 'pointerdown', 18)
      press(host, 'pointerup', 18)
    })
    expect(host.value).toBe('5,60')
  })

  test('and nothing on a single thumb, whose input takes the press itself', async () => {
    const host = await slider('default-value="40"')
    await laidOut(host, async () => {
      press(host, 'pointerdown', 188)
    })
    expect(host.value).toBe('40')
  })
})

describe('Page Up and Page Down under `page-step`', () => {
  const page = async (host: Slider, at: number, key: string): Promise<void> => {
    thumbs(host)[at]?.dispatchEvent(
      new KeyboardEvent('keydown', { bubbles: true, cancelable: true, composed: true, key }),
    )
    await host.updateComplete
  }

  /* React Aria's `pageSize` and Zag's `largeStep`. Measured before this, the
     page keys moved a tenth of the track, the platform's step, and nothing
     set it. */
  test('move a thumb that far, and say `change`', async () => {
    const host = await slider('default-value="40" page-step="25"')
    const heard: string[] = []
    host.addEventListener('change', () => heard.push(host.value))
    await page(host, 0, 'PageUp')
    expect(host.value).toBe('65')
    await page(host, 0, 'PageDown')
    await page(host, 0, 'PageDown')
    expect(host.value).toBe('15')
    expect(heard).toEqual(['65', '40', '15'])
  })

  test("and a range's thumb, kept short of its neighbor", async () => {
    const host = await slider('range default-value="20,60" page-step="50"')
    await page(host, 0, 'PageUp')
    expect(host.value).toBe('60,60')
  })
})
