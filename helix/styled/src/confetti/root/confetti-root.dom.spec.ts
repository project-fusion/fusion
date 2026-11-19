import '@fusion.dev/helix-testing/dom/register'
import { afterEach, beforeAll, describe, expect, test } from 'bun:test'
import { pauseMotion } from '@fusion.dev/helix-core'
import { mount, registerDom } from '@fusion.dev/helix-testing/dom'

beforeAll(async () => {
  registerDom()
  await import('../index.js')
})

afterEach(() => {
  pauseMotion(false)
})

type Confetti = HTMLElement & { burst: () => Promise<void> }

describe('confetti', () => {
  test('a press bursts nothing by itself', async () => {
    const confetti = await mount('<helix-confetti><button>Publish</button></helix-confetti>')
    confetti.querySelector('button')?.click()
    expect(document.querySelector('canvas')).toBeNull()
  })

  test('burst draws nothing and resolves at once while the page has paused its motion', async () => {
    const confetti = (await mount(
      '<helix-confetti style="--confetti-colors: red, light-dark(navy, skyblue)"><button>Publish</button></helix-confetti>',
    )) as Confetti
    pauseMotion()
    await confetti.burst()
    expect(document.querySelector('canvas')).toBeNull()
  })

  test('projects its content through the default slot', async () => {
    const confetti = await mount('<helix-confetti><button>Publish</button></helix-confetti>')
    const slot = confetti.shadowRoot?.querySelector('slot:not([name])') as HTMLSlotElement | null
    expect(slot?.assignedElements()[0]?.textContent).toBe('Publish')
  })
})
