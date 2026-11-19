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
  run('loads a profile, crossfades it in as the card grows, and reloads the next one', async () => {
    await example(revealing)
    const profile = document.getElementById('profile') as HTMLElement & { loading: boolean }
    const card = profile.closest('helix-card') as HTMLElement
    expect(profile.loading).toBe(true)
    expect(part(profile, 'content')?.hidden).toBe(true)
    const loading = card.getBoundingClientRect().height

    await until(() => !profile.loading)
    expect(profile.textContent).toContain('Ada Lovelace')
    await frame()
    await frame()
    // Two frames into the reveal, the card is between the two heights.
    expect(hasState(profile, 'revealing')).toBe(true)
    const moving = card.getBoundingClientRect().height
    await until(() => !hasState(profile, 'revealing'))
    const loaded = card.getBoundingClientRect().height
    expect(moving).toBeGreaterThan(loading)
    expect(moving).toBeLessThan(loaded)
    expect(part(profile, 'placeholder')?.hidden).toBe(true)

    ;(document.getElementById('reload') as HTMLElement).click()
    await frame()
    expect(profile.loading).toBe(true)
    await until(() => !profile.loading)
    expect(profile.textContent).toContain('Grace Hopper')
    expect(profile.textContent).not.toContain('Ada Lovelace')
  })
})
