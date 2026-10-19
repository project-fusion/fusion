import '@fusion.dev/helix-testing/dom/register'
import { beforeAll, describe, expect, test } from 'bun:test'
import { hasState, mount, registerDom } from '@fusion.dev/helix-testing/dom'

beforeAll(async () => {
  registerDom()
  await import('../index.js')
})

type Tour = HTMLElement & {
  back: () => void
  index: number
  next: () => void
  open: boolean
  skip: () => void
  updateComplete: Promise<boolean>
}

const tick = (): Promise<void> => new Promise((resolve) => setTimeout(resolve, 0))

/* A stop, a `wait` stop for a menu that is not on the page, and a stop after. */
const waiting = async (): Promise<{ begin: HTMLButtonElement; tour: Tour }> => {
  const host = (await mount(
    `<div>
      <button id="begin">Begin</button><button id="target">Target</button>
      <helix-headless-tour label="Getting started">
        <helix-headless-tour-stop for="target">Open the menu</helix-headless-tour-stop>
        <helix-headless-tour-stop type="wait" for="menu"></helix-headless-tour-stop>
        <helix-headless-tour-stop for="target">Pick one</helix-headless-tour-stop>
      </helix-headless-tour>
    </div>`,
  )) as HTMLElement
  const tour = host.querySelector('helix-headless-tour') as Tour
  const begin = host.querySelector('#begin') as HTMLButtonElement
  await tour.updateComplete
  begin.focus()
  tour.open = true
  await tour.updateComplete
  await tick()
  tour.next()
  await tour.updateComplete
  return { begin, tour }
}

const menu = async (tour: Tour): Promise<void> => {
  const element = document.createElement('div')
  element.id = 'menu'
  element.textContent = 'Menu'
  tour.parentElement?.append(element)
  await tick()
  await tour.updateComplete
}

/* Every way out of a stop ends what the stop started, whichever way it was
   left: the convention that effects key off the change of state, never off the
   method that caused it. */
describe('leaving a `wait` stop', () => {
  test('by writing `open` stops the wait, so the run does not move on', async () => {
    const { tour } = await waiting()
    expect(hasState(tour, 'waiting')).toBe(true)
    tour.open = false
    await tour.updateComplete
    await menu(tour)
    expect([tour.index, hasState(tour, 'waiting')]).toEqual([1, false])
  })

  test('by writing `index` stops the wait too', async () => {
    const { tour } = await waiting()
    tour.index = 0
    await tour.updateComplete
    await menu(tour)
    expect([tour.index, hasState(tour, 'waiting')]).toEqual([0, false])
  })

  test('by skipping gives focus back to where it was when the tour opened', async () => {
    const { begin, tour } = await waiting()
    expect(document.activeElement?.id).toBe('target')
    tour.skip()
    await tour.updateComplete
    expect(document.activeElement).toBe(begin)
  })
})
