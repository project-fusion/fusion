import { beforeAll, describe, expect, test } from 'bun:test'
import { formValue, hasLayout, mount, part, registerDom } from '@fusion-io/testing/dom'

beforeAll(async () => {
  registerDom()
  await import('../index.js')
})

const rating = async (attrs = ''): Promise<HTMLElement> =>
  mount(`<helix-rating label="Rate this" ${attrs}></helix-rating>`)

const options = (host: HTMLElement): HTMLElement[] => [
  ...host.shadowRoot!.querySelectorAll<HTMLElement>('[part="option"]'),
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
    expect(fill(host)).toContain('--_rating-full: 4')
    expect(fill(host)).toContain('--_rating-part: 0.2')
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
      expect(fill(host)).toContain('--_rating-part: 0.2')
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
      expect(fill(host)).toContain('--_rating-full: 2')
      expect(fill(host)).toContain('--_rating-part: 0.5')
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

if (hasLayout()) {
  describe('a rating being dragged', () => {
    type Rating = HTMLElement & { value: string; updateComplete: Promise<unknown> }

    const centre = (host: HTMLElement, step: number): number => {
      const option = [...host.shadowRoot!.querySelectorAll<HTMLElement>('[part="option"]')][step]
      const box = option!.getBoundingClientRect()
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
      await send(host, 'pointerdown', centre(host, 1))
      expect(host.value).toBe('1')

      await send(host, 'pointermove', centre(host, 4))
      expect(part(host, 'marks')?.getAttribute('style')).toContain('--_rating-full: 5')
      expect(host.value).toBe('1')

      await send(host, 'pointerup', centre(host, 4))
      expect(host.value).toBe('5')
    })

    test('reads the boxes, so a drag lands on the mark it is over', async () => {
      // Not recomputed from `max` and `step`, which would be a second copy of
      // the stylesheet's arithmetic that could disagree with it.
      const host = (await rating('default-value="1" step="0.5"')) as Rating
      await send(host, 'pointerdown', centre(host, 2))
      await send(host, 'pointerup', centre(host, 2))
      expect(host.value).toBe('1.5')
    })

    test('a drag off the end pins to the last mark rather than stopping short', async () => {
      const host = (await rating('default-value="1"')) as Rating
      const past = host.getBoundingClientRect().right + 200
      await send(host, 'pointerdown', centre(host, 0))
      await send(host, 'pointermove', past)
      await send(host, 'pointerup', past)
      expect(host.value).toBe('5')
    })

    test('a gesture the system takes away chooses nothing', async () => {
      const host = (await rating('value="2"')) as Rating
      await send(host, 'pointerdown', centre(host, 4))
      await send(host, 'pointercancel', centre(host, 4))
      await send(host, 'pointerup', centre(host, 4))
      expect(host.value).toBe('2')
    })

    test('a controlled rating announces the drag and waits to be told', async () => {
      /* `value` is a claim of ownership, and the gesture does not override it:
         the marks follow the pointer, the release asks, and nothing moves until
         the consumer passes a new value back. */
      const host = (await rating('value="1"')) as Rating
      let asked: string | undefined
      host.addEventListener('helix-change', (event) => {
        asked = (event as CustomEvent<{ value: string }>).detail?.value
      })
      await send(host, 'pointerdown', centre(host, 4))
      await send(host, 'pointerup', centre(host, 4))
      expect(asked).toBe('5')
      expect(host.value).toBe('1')
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
      await send(host, 'pointerdown', centre(host, 0))
      await send(host, 'pointerup', centre(host, 4))
      expect(host.value).toBe('2')
    })
  })
}
