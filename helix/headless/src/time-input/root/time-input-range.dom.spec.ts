import { beforeAll, describe, expect, test } from 'bun:test'
import { registerDom, settle, type Updatable } from '@fusion.dev/helix-testing/dom'

beforeAll(async () => {
  registerDom()
  await import('../index.js')
})

type Field = Updatable & { value: string }

/** The validity the host stands behind, which is where this element writes it. */
const internals = (host: Field): ElementInternals =>
  (host as unknown as { internals: ElementInternals }).internals

/** What a reader would be told, or nothing where the field is content. */
const complaint = (host: Field): string => internals(host).validationMessage

const field = async (attributes: string, value = ''): Promise<Field> => {
  document.body.innerHTML = `<helix-headless-time-input label="When" ${attributes}></helix-headless-time-input>`
  const host = document.body.firstElementChild as Field
  if (value !== '') {
    host.value = value
  }
  await settle(host)
  return host
}

describe('a time input holding more than one time', () => {
  test('a filled range is valid, which is the bug this exists for', async () => {
    /* The value joins its times with commas, and validity ran `isTime` on the
       whole string: every range that had actually been filled in reported
       "Enter a time as HH:mm" and went invalid on being used correctly. Date
       Input validates each date in the value and says so in a note; this is
       that, ported. */
    const host = await field('mode="range"', '09:00,17:00')

    expect(complaint(host)).toBe('')
  })

  test('and so is a multiple holding several', async () => {
    const host = await field('mode="multiple"', '09:00,12:30,17:00')

    expect(complaint(host)).toBe('')
  })

  test('one bad time in a set is still bad, and says so in the plural', async () => {
    const host = await field('mode="range"', '09:00,tea time')

    expect(complaint(host)).toBe('Enter times as HH:mm, separated by commas.')
  })

  test('a single field keeps the singular message', async () => {
    const host = await field('', 'tea time')

    expect(complaint(host)).toBe('Enter a time as HH:mm.')
  })

  test('a bound is compared against each time rather than the list', async () => {
    /* The comparison was against the whole string, so a list could never be
       under a floor or over a ceiling in any meaningful way. */
    const host = await field('min="10:00" mode="range"', '09:00,17:00')

    expect(complaint(host)).toContain('at or after')
  })

  test('and a set inside the bounds passes', async () => {
    const host = await field('max="18:00" min="08:00" mode="range"', '09:00,17:00')

    expect(complaint(host)).toBe('')
  })

  test('a range is two times and says so when given three', async () => {
    const host = await field('mode="range"', '09:00,12:00,17:00')

    expect(complaint(host)).toBe('A range is two times.')
  })

  test('an empty field is not yet wrong', async () => {
    const host = await field('mode="range"')

    expect(complaint(host)).toBe('')
  })
})
