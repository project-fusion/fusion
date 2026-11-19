import '@fusion.dev/helix-testing/dom/register'
import { beforeAll, describe, expect, test } from 'bun:test'
import { example, hasLayout, hasState, part, registerDom } from '@fusion.dev/helix-testing/dom'
import revealing from '../.examples/revealing.html' with { type: 'text' }

beforeAll(async () => {
  registerDom()
  await import('../index.js')
  await import('../../avatar/index.js')
  await import('../../button/index.js')
  await import('../../card/index.js')
  await import('../../flex/index.js')
  await import('../../text/index.js')
})

/* Browser only: happy-dom does not run a script inserted by script, and lays
   nothing out to move. */
const run = hasLayout() ? test : (): void => {}

const frame = () => new Promise((resolve) => requestAnimationFrame(resolve))

/** Waits a frame at a time until `ready` holds, for up to three seconds. */
const until = async (ready: () => boolean): Promise<void> => {
  const end = performance.now() + 3000
  while (!ready() && performance.now() < end) {
    await frame()
  }
}

describe('the revealing example', () => {
  run(
    'loads a profile, crossfades it in as the card takes its new height, and reloads the next one',
    async () => {
      await example(revealing)
      const profile = document.getElementById('profile') as HTMLElement & { loading: boolean }
      const card = profile.closest('helix-card') as HTMLElement
      expect(profile.loading).toBe(true)
      expect((part(profile, 'content') as HTMLElement | null)?.hidden).toBe(true)
      const loading = card.getBoundingClientRect().height

      await until(() => !profile.loading)
      expect(profile.textContent).toContain('Ada Lovelace')
      expect(hasState(profile, 'revealing')).toBe(true)
      /* **Every frame of the reveal, never a fixed one.** Two frames in, a
         runner on CI read the card at its loaded height in both engines, where
         a Mac read it mid-move at any CPU speed. */
      const heights: number[] = []
      const end = performance.now() + 3000
      while (hasState(profile, 'revealing') && performance.now() < end) {
        await frame()
        heights.push(Math.round(card.getBoundingClientRect().height))
      }
      const loaded = card.getBoundingClientRect().height
      /* Between, whichever is taller: the placeholder is drawn to the card's
         shape, and the words it stands for wrap by the runner's fonts. On a
         failure the message lists the heights read. */
      expect(Math.round(loaded)).not.toBe(Math.round(loading))
      const low = Math.min(loading, loaded)
      const high = Math.max(loading, loaded)
      const between = heights.some((one) => one > low + 0.5 && one < high - 0.5)
      expect(between ? 'between' : `${low} to ${high}: ${heights.join(' ')}`).toBe('between')
      expect((part(profile, 'placeholder') as HTMLElement | null)?.hidden).toBe(true)

      ;(document.getElementById('reload') as HTMLElement).click()
      await frame()
      expect(profile.loading).toBe(true)
      await until(() => !profile.loading)
      expect(profile.textContent).toContain('Grace Hopper')
      expect(profile.textContent).not.toContain('Ada Lovelace')
      /* Two loads of 1200ms each and a reveal between them, past the harness's
       two seconds. */
    },
    8000,
  )
})
