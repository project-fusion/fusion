import { beforeAll, describe, expect, test } from 'bun:test'
import { formValue, hasLayout, mount, part, registerDom } from '@fusion.dev/helix-testing/dom'

beforeAll(async () => {
  registerDom()
  await import('../index.js')
})

const rating = async (attrs = ''): Promise<HTMLElement> =>
  mount(`<helix-headless-rating label="Rate this" ${attrs}></helix-headless-rating>`)

const options = (host: HTMLElement): HTMLElement[] => [
  ...(host.shadowRoot as ShadowRoot).querySelectorAll<HTMLElement>('[part="option"]'),
]

const fill = (host: HTMLElement): string => part(host, 'marks')?.getAttribute('style') ?? ''

describe('rating', () => {
  test('is a radio group, because choosing one of five is what that is', async () => {
    const host = await rating('value="3"')
    expect(part(host, 'marks')?.getAttribute('role')).toBe('radiogroup')
  })

  test('has one option per step, so halves are ten places rather than five', async () => {
    expect(options(await rating()).length).toBe(5)
    expect(options(await rating('step="0.5"')).length).toBe(10)
  })

  test('the options are the scores, not the marks', async () => {
    // With halves the third option is 1.5, which is the whole point of `step`.
    const host = await rating('step="0.5"')
    expect(
      options(host)
        .map((option) => option.dataset.score)
        .slice(0, 3),
    ).toEqual(['0.5', '1', '1.5'])
  })

  test('marks the chosen score and only it', async () => {
    const host = await rating('value="3"')
    const checked = options(host).filter((option) => option.getAttribute('aria-checked') === 'true')
    expect(checked.map((option) => option.dataset.score)).toEqual(['3'])
  })

  test('pressing one rates it', async () => {
    const host = await rating()
    options(host)[3]?.click()
    await (host as HTMLElement & { updateComplete: Promise<unknown> }).updateComplete
    expect((host as HTMLElement & { value: string }).value).toBe('4')
  })

  test('and reports it to the form, which is the point of being form-associated', async () => {
    const host = await rating('name="score"')
    options(host)[1]?.click()
    await (host as HTMLElement & { updateComplete: Promise<unknown> }).updateComplete
    expect(formValue(host)).toBe('2')
  })

  test('is one tab stop, wherever the score sits in it', async () => {
    const host = await rating('value="4"')
    const stops = options(host).filter((option) => option.getAttribute('tabindex') === '0')
    expect(stops.map((option) => option.dataset.score)).toEqual(['4'])
  })

  test('an unrated one still has a way in', async () => {
    // Nothing is checked, so nothing would be tabbable on the roving rule alone.
    const host = await rating()
    const stops = options(host).filter((option) => option.getAttribute('tabindex') === '0')
    expect(stops.map((option) => option.dataset.score)).toEqual(['1'])
  })

  test('a score outside the marks is pulled onto them', async () => {
    const over = await rating('value="9"')
    expect((over as HTMLElement & { score: number }).score).toBe(5)
    const under = await rating('value="-2"')
    expect((under as HTMLElement & { score: number }).score).toBe(0)
    const nonsense = await rating('value="soon"')
    expect((nonsense as HTMLElement & { score: number }).score).toBe(0)
  })

  test('hands the fill whole marks and a remainder, not a percentage', async () => {
    /* A share of the row would land in a gap: the row is marks and the spaces
       between them, and a score counts only marks. See the stylesheet. */
    const host = await rating('value="4.2"')
    expect(fill(host)).toContain('--rating-full: 4')
    expect(fill(host)).toContain('--rating-part: 0.2')
  })

  describe('read-only', () => {
    test('is an image of a score, not a group of choices', async () => {
      const host = await rating('readonly value="4.2"')
      expect(part(host, 'marks')?.getAttribute('role')).toBe('img')
      expect(options(host).length).toBe(0)
    })

    test('reads as one thing, with the score in its name', async () => {
      const host = await rating('readonly value="4.2"')
      expect(part(host, 'marks')?.getAttribute('aria-label')).toBe('4.2 out of 5')
    })

    test('and says what it was given to say, when a number is not enough', async () => {
      const host = await rating('readonly value="4.2" value-text="4.2 from 318 reviews"')
      expect(part(host, 'marks')?.getAttribute('aria-label')).toBe('4.2 from 318 reviews')
    })

    test('still draws the fraction it was given', async () => {
      const host = await rating('readonly value="4.2"')
      expect(fill(host)).toContain('--rating-part: 0.2')
    })

    test('follows the data it seeds from, since nothing here can take it over', async () => {
      /* A readout's number moves when the reviews do, and `default-value` is
         only a seed while something can overwrite it. Nothing can here: the
         reader has no option to press, so the internal value stays unset and
         the seed stays the answer. That is what lets the example write
         `default-value` rather than claiming ownership with `value`. */
      const host = await rating('readonly default-value="4.2"')
      const element = host as HTMLElement & {
        defaultValue: string
        updateComplete: Promise<unknown>
      }
      element.defaultValue = '2.5'
      await element.updateComplete
      expect(fill(host)).toContain('--rating-full: 2')
      expect(fill(host)).toContain('--rating-part: 0.5')
    })
  })

  describe('the score in words', () => {
    test('is not written out unless it is asked for', async () => {
      expect(part(await rating('value="3"'), 'value')).toBe(null)
    })

    test('says the score, because marks only say roughly', async () => {
      const host = await rating('show-value value="3.5" step="0.5"')
      expect(part(host, 'value')?.textContent).toBe('3.5')
    })

    test('is not read out, having been said twice already', async () => {
      /* The group announces the checked option and a readout carries the score
         in its own name. A third saying of it is noise. */
      const host = await rating('show-value value="3"')
      expect(part(host, 'value')?.getAttribute('aria-hidden')).toBe('true')
    })

    test('follows the marks rather than the form, since that is what it labels', async () => {
      /* A label reading 3 under a row of marks showing 5, because the pointer is
         over the fifth, is worse than no label. */
      const host = await rating('show-value value="3"')
      const previewed = host as HTMLElement & {
        previewing: number | undefined
        updateComplete: Promise<unknown>
      }
      previewed.previewing = 5
      await previewed.updateComplete
      expect(part(host, 'value')?.textContent).toBe('5')
      expect((host as HTMLElement & { value: string }).value).toBe('3')
    })
  })

  describe('shape', () => {
    test('both layers hold every mark, since the fill is a clip of the whole row', async () => {
      const host = await rating('value="2"')
      expect(part(host, 'track')?.children.length).toBe(5)
      expect(part(host, 'fill')?.children.length).toBe(5)
    })

    test('neither layer is read, because the options carry the score', async () => {
      const host = await rating('value="2"')
      expect(part(host, 'track')?.getAttribute('aria-hidden')).toBe('true')
      expect(part(host, 'fill')?.getAttribute('aria-hidden')).toBe('true')
    })

    test('an option is named by the score it is', async () => {
      const host = await rating('value="2" value-text="2 from 40 reviews"')
      expect(options(host)[2]?.getAttribute('aria-label')).toBe('3 out of 5')
    })

    test('a disabled rating disables every option', async () => {
      const host = await rating('disabled')
      expect(options(host).every((option) => option.hasAttribute('disabled'))).toBe(true)
    })
  })
})

describe('the lowest score a rating offers', () => {
  const scoreOf = (host: HTMLElement): number => (host as HTMLElement & { score: number }).score

  const scores = (host: HTMLElement): (string | undefined)[] =>
    options(host).map((option) => option.dataset.score)

  test('is where an unanswered row sits, the way an empty slider sits at its own', async () => {
    expect(scoreOf(await rating('min="2"'))).toBe(2)
    expect(fill(await rating('min="2"'))).toContain('--rating-full: 2')
  })

  test('and the value is still empty there, so a required rating is still missing', async () => {
    /* The row drawing `min` is the bottom of the scale rather than an answer.
       Reading the picture instead would call every `min="2"` rating answered
       the moment it rendered. */
    const host = await rating('min="2" name="score" required')
    expect((host as HTMLElement & { value: string }).value).toBe('')
    expect(
      (host as unknown as { internals: ElementInternals }).internals.validity.valueMissing,
    ).toBe(true)
    // Nothing submitted, as a radio group submits nothing: an empty entry reads as an answer.
    expect(formValue(host)).toBeNull()
  })

  test('is what clearing returns to, which is what the property always meant', async () => {
    const host = (await rating('min="2" value="4"')) as HTMLElement & {
      formResetCallback: () => void
      updateComplete: Promise<unknown>
    }
    host.formResetCallback()
    await host.updateComplete
    expect(scoreOf(host)).toBe(2)
  })

  test('drops the steps below it and leaves the rest where they were', async () => {
    const host = await rating('min="2"')
    expect(scores(host)).toEqual(['2', '3', '4', '5'])
  })

  test('without moving one of them along the row, which is the stylesheet’s arithmetic', async () => {
    /* The pitch is the whole row divided by every step, and a target sits at
       its own place in that row. Counted off the steps left instead, dropping
       two would widen every target and slide the row left. */
    const host = await rating('min="2"')
    expect(fill(host)).toContain('--rating-steps: 5')
    expect(options(host)[0]?.getAttribute('style')).toContain('--rating-step: 2')
  })

  test('pulls a value under it up, the same clamp the top of the scale has', async () => {
    expect(scoreOf(await rating('min="2" value="1"'))).toBe(2)
    expect(scoreOf(await rating('min="2" value="soon"'))).toBe(2)
  })

  test('takes the tab stop with it, so the way in is a score that can be given', async () => {
    const host = await rating('min="3"')
    const stops = options(host).filter((option) => option.getAttribute('tabindex') === '0')
    expect(stops.map((option) => option.dataset.score)).toEqual(['3'])
  })

  test('between two marks is a floor rather than a step', async () => {
    /* `min="1.5"` on whole marks is a real thing to ask for: it holds the value
       at 1.5 and offers 2 upward, 1.5 being nowhere the row can be pressed. */
    const host = await rating('min="1.5" value="1.2"')
    expect(scoreOf(host)).toBe(1.5)
    expect(scores(host)).toEqual(['2', '3', '4', '5'])
  })

  describe('off the scale is refused rather than obeyed, and says so', () => {
    const warnings = async (attrs: string): Promise<string[]> => {
      const said: string[] = []
      const before = console.warn
      console.warn = (...parts: unknown[]): void => {
        said.push(parts.join(' '))
      }
      try {
        await rating(attrs)
      } finally {
        console.warn = before
      }
      return said
    }

    test('above max, which collapses the scale to its top score', async () => {
      const host = await rating('min="9"')
      expect(scoreOf(host)).toBe(5)
      expect(scores(host)).toEqual(['5'])
    })

    test('below zero, there being no mark to draw for a negative score', async () => {
      const host = await rating('min="-2"')
      expect(scoreOf(host)).toBe(0)
      expect(scores(host)).toEqual(['1', '2', '3', '4', '5'])
    })

    test('and anything that is not a number at all', async () => {
      expect(scoreOf(await rating('min="soon"'))).toBe(0)
    })

    test('each of them named on the console, since the row cannot show it', async () => {
      /* A floor above `max` leaves one score to press and a negative one draws
         exactly like zero, so nothing on screen tells a consumer their number
         was not taken. */
      expect((await warnings('min="9"'))[0]).toContain('min="9"')
      expect((await warnings('min="9"'))[0]).toContain('the lowest score it offers is 5')
      expect((await warnings('min="-2"'))[0]).toContain('the lowest score it offers is 0')
    })

    test('and a min the marks can show says nothing at all', async () => {
      expect(await warnings('min="2"')).toEqual([])
      expect(await warnings('')).toEqual([])
    })
  })
})

describe('a rating as a field', () => {
  /* It applies `MixinField` and called none of its render seams, so `label`,
     `hint` and `feedback` were four rows of documented API a consumer could set
     and never see, and a required rating computed a message with nowhere to put
     it. */
  test('draws the question over the marks, a row of buttons having no `for` to take', async () => {
    const host = await rating('value="3"')
    expect(part(host, 'label')?.textContent?.trim()).toBe('Rate this')
  })

  test('draws the help under them', async () => {
    const host = await rating('hint="Five is best" value="3"')
    expect(part(host, 'hint')?.textContent?.trim()).toBe('Five is best')
  })

  test('and the message in the hint’s place rather than beside it', async () => {
    const host = await rating('feedback="Pick one" hint="Five is best" value="3"')
    expect(part(host, 'feedback')?.textContent?.trim()).toBe('Pick one')
    expect(part(host, 'hint')).toBeNull()
  })

  test('points the group at whichever of the two is showing', async () => {
    // One at a time: naming both would point a screen reader at an id that
    // renders nothing, which it reads as a description it cannot find.
    const hinted = await rating('hint="Five is best"')
    expect(part(hinted, 'marks')?.getAttribute('aria-describedby')).toBe('helix-hint')
    const wrong = await rating('feedback="Pick one" hint="Five is best"')
    expect(part(wrong, 'marks')?.getAttribute('aria-describedby')).toBe('helix-feedback')
    expect(part(await rating(''), 'marks')?.getAttribute('aria-describedby')).toBeNull()
  })

  test('says the group is required, and not only paints the mark beside the label', async () => {
    expect(part(await rating('required'), 'marks')?.getAttribute('aria-required')).toBe('true')
    expect(part(await rating(''), 'marks')?.getAttribute('aria-required')).toBeNull()
  })

  test('and a readout claims none of it, an image being neither required nor described', async () => {
    const host = await rating('readonly required value="4"')
    expect(part(host, 'marks')?.getAttribute('aria-required')).toBeNull()
  })

  test('keeps the marks and the readout in a row of their own', async () => {
    /* The host is the column, so a hint does not land in the middle of a line
       of stars and a row does not stretch to hold one. */
    const host = await rating('show-value value="3"')
    const field = part(host, 'field') as HTMLElement
    expect(field.contains(part(host, 'marks'))).toBe(true)
    expect(field.contains(part(host, 'value'))).toBe(true)
    expect(field.contains(part(host, 'label'))).toBe(false)
  })
})

if (hasLayout()) {
  /* In a browser only. happy-dom does not assign slotted content, so
     `assignedElements` comes back empty there and `slotchange` never fires:
     every case below would pass by finding no clones and expecting none.
     `Megamenu`'s specs say the same about events crossing a slot. */
  describe('a rating whose mark was slotted', () => {
    const withMarks = async (attrs: string, shapes: number): Promise<HTMLElement> => {
      const slotted = Array.from(
        { length: shapes },
        (_, index) => `<i data-shape="${index}" slot="mark"></i>`,
      ).join('')
      const host = await mount(
        `<helix-headless-rating label="Rate" ${attrs}>${slotted}</helix-headless-rating>`,
      )
      await (host as HTMLElement & { updateComplete: Promise<unknown> }).updateComplete
      return host
    }

    const shapes = (host: HTMLElement): (string | null)[] =>
      [...(host.shadowRoot as ShadowRoot).querySelectorAll<HTMLElement>('[part="mark"] > i')].map(
        (one) => one.dataset.shape ?? null,
      )

    test('takes one shape as the shape of every mark', async () => {
      /* A slot shows its content once and a rating needs it as many times as
       there are marks, twice over while there are two layers. So the slot is
       where the shape arrives, and what a reader sees is the clones. */
      const host = await withMarks('value="2"', 1)
      expect(shapes(host)).toEqual(['0', '0', '0', '0', '0', '0', '0', '0', '0', '0'])
    })

    test('and ignores anything past the first, a rating being one shape repeated', async () => {
      /* A row whose third mark is a different drawing from its first is not a
         rating, it is a set of choices: `Radio.Group`, whose options carry a
         value and a name each. This element is a quantity, and the fill is a
         clip across marks that are all the same. */
      const host = await withMarks('value="2"', 3)
      expect(new Set(shapes(host))).toEqual(new Set(['0']))
    })

    test('says it was given one, so the stylesheet stops drawing its own', async () => {
      expect(part(await withMarks('value="2"', 1), 'marks')?.hasAttribute('data-slotted')).toBe(
        true,
      )
      expect(part(await rating('value="2"'), 'marks')?.hasAttribute('data-slotted')).toBe(false)
    })

    test('the slot itself is never seen, being where the shape arrives', async () => {
      const host = await withMarks('value="2"', 1)
      const slot = (host.shadowRoot as ShadowRoot).querySelector('slot[name="mark"]')
      expect(slot?.hasAttribute('hidden')).toBe(true)
    })
  })

  describe('a rating being dragged', () => {
    type Rating = HTMLElement & { value: string; updateComplete: Promise<unknown> }

    const center = (host: HTMLElement, step: number): number => {
      const option = [
        ...(host.shadowRoot as ShadowRoot).querySelectorAll<HTMLElement>('[part="option"]'),
      ][step]
      const box = (option as HTMLElement).getBoundingClientRect()
      return box.left + box.width / 2
    }

    const send = async (host: Rating, type: string, clientX: number): Promise<void> => {
      const marks = part(host, 'marks') as HTMLElement
      marks.dispatchEvent(
        new PointerEvent(type, { bubbles: true, button: 0, clientX, pointerId: 7 }),
      )
      await host.updateComplete
    }

    test('draws a score while it moves, and chooses nothing until it is let go', async () => {
      /* One press and a slide is how a rating is given on a phone, and how
         somebody who overshoots corrects without lifting. Committing on the way
         would rate it every mark the pointer crossed. */
      /* `default-value`, not `value`. A rating told `value` is controlled: it
         announces the change and waits to be given a new one, so it would sit
         at 1 through every drag here and the specs would be measuring the
         controlled contract rather than the gesture. */
      const host = (await rating('default-value="1"')) as Rating
      await send(host, 'pointerdown', center(host, 1))
      expect(host.value).toBe('1')

      await send(host, 'pointermove', center(host, 4))
      expect(part(host, 'marks')?.getAttribute('style')).toContain('--rating-full: 5')
      expect(host.value).toBe('1')

      await send(host, 'pointerup', center(host, 4))
      expect(host.value).toBe('5')
    })

    test('reads the boxes, so a drag lands on the mark it is over', async () => {
      // Not recomputed from `max` and `step`, which would be a second copy of
      // the stylesheet's arithmetic that could disagree with it.
      const host = (await rating('default-value="1" step="0.5"')) as Rating
      await send(host, 'pointerdown', center(host, 2))
      await send(host, 'pointerup', center(host, 2))
      expect(host.value).toBe('1.5')
    })

    test('a drag off the end pins to the last mark rather than stopping short', async () => {
      const host = (await rating('default-value="1"')) as Rating
      const past = host.getBoundingClientRect().right + 200
      await send(host, 'pointerdown', center(host, 0))
      await send(host, 'pointermove', past)
      await send(host, 'pointerup', past)
      expect(host.value).toBe('5')
    })

    test('a gesture the system takes away chooses nothing', async () => {
      const host = (await rating('value="2"')) as Rating
      await send(host, 'pointerdown', center(host, 4))
      await send(host, 'pointercancel', center(host, 4))
      await send(host, 'pointerup', center(host, 4))
      expect(host.value).toBe('2')
    })

    /* A declared `value` is the native seed rather than a claim of ownership, so
       the drag applies to it like any other. */
    test('a drag announces before it acts, whoever declared the value', async () => {
      const host = (await rating('value="1"')) as Rating
      let asked: string | undefined
      host.addEventListener('helix-before-change', (event) => {
        asked = (event as CustomEvent<{ value: string }>).detail?.value
      })
      await send(host, 'pointerdown', center(host, 4))
      await send(host, 'pointerup', center(host, 4))
      expect(asked).toBe('5')
      expect(host.value).toBe('5')
    })

    test('and refusing the change is what holds it, so the consumer may own it', async () => {
      const host = (await rating('value="1"')) as Rating
      host.addEventListener('helix-before-change', (event) => {
        event.preventDefault()
      })
      await send(host, 'pointerdown', center(host, 4))
      await send(host, 'pointerup', center(host, 4))
      expect(host.value).toBe('1')
    })

    /* Where a floor leaves the targets it does not drop is the styled tier's
       question, this one having no stylesheet to lay them out with. Its own
       spec measures it. */
    test('a drag under the floor pins to the lowest score offered', async () => {
      const host = (await rating('min="3" value="5"')) as Rating
      const before = host.getBoundingClientRect().left - 200
      await send(host, 'pointerdown', center(host, 0))
      await send(host, 'pointerup', before)
      expect(host.value).toBe('3')
    })

    test('a readout cannot be dragged, having nothing to choose', async () => {
      const host = (await rating('readonly value="2"')) as Rating
      const box = host.getBoundingClientRect()
      await send(host, 'pointerdown', box.left + box.width / 2)
      await send(host, 'pointerup', box.right)
      expect(host.value).toBe('2')
    })

    test('and neither can a disabled one', async () => {
      const host = (await rating('disabled value="2"')) as Rating
      await send(host, 'pointerdown', center(host, 0))
      await send(host, 'pointerup', center(host, 4))
      expect(host.value).toBe('2')
    })
  })
}
