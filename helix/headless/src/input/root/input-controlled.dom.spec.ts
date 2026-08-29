import { beforeAll, describe, expect, test } from 'bun:test'
import { mount, registerDom } from '@fusion.dev/helix-testing/dom'

beforeAll(async () => {
  registerDom()
  await import('../index.js')
})

type Input = HTMLElement & {
  requestValue(next: string): boolean
  updateComplete: Promise<boolean>
  value: string
}

const input = async (extra = ''): Promise<Input> =>
  (await mount(`<helix-headless-input label="Name" ${extra}></helix-headless-input>`)) as Input

/**
 * What a declared `value` means.
 *
 * Control is an action. The element always applies, `value="Ada"` is the native
 * seed it resembles, and a consumer who wants the change for themselves refuses
 * it. There is no mode to be silently in, so there is nothing to audit and no
 * warning to test. See (294).
 */
describe('a control whose markup declared a value', () => {
  test('still moves, the property being a seed rather than a claim', async () => {
    const host = await input('value="Ada"')
    expect(host.requestValue('Grace')).toBe(true)
    await host.updateComplete
    expect(host.value).toBe('Grace')
  })

  test('and refusing is what holds it where they put it', async () => {
    const host = await input('value="Ada"')
    host.addEventListener('helix-before-change', (event: Event) => {
      event.preventDefault()
    })
    expect(host.requestValue('Grace')).toBe(false)
    await host.updateComplete
    expect(host.value).toBe('Ada')
  })

  test('and a later assignment is a correction, not a takeover', async () => {
    const host = await input('value="Ada"')
    host.value = 'Grace'
    await host.updateComplete
    expect(host.requestValue('Hopper')).toBe(true)
    await host.updateComplete
    expect(host.value).toBe('Hopper')
  })
})

/* **There is no spec for the caret, and that is a finding rather than an
   omission.** Typing in the middle of a controlled field used to throw the
   caret to the end, measured in Chrome with real keystrokes: caret after `Ada`
   in `Ada Lovelace`, one key, and an uncontrolled field reported 4 while a
   controlled one reported 13. `holdCaret` fixes it, measured the same way.

   Two harnesses were tried and neither reproduces it. Under happy-dom the
   assertion passes with the fix disabled, because nothing there resets a
   selection when `value` is assigned. Under `hasLayout()` in real Chromium,
   through `bun run specs:browser`, it also passes with the fix disabled: the
   spec reported a caret of 4 either way. Setting `value` and dispatching
   `input` is evidently not what a keystroke does to a selection, and the
   difference is what the bug lives in.

   So the guard here would have been worse than nothing: a test that passes
   whether or not the code works reads as coverage. What holds this honest is
   the measurement in the commit and the note on `holdCaret`. If someone finds
   the harness that reproduces it, this is the place for it. */
