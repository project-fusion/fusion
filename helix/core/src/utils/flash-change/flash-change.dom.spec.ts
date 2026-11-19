import '@fusion.dev/helix-testing/dom/register'
import { afterEach, beforeAll, describe, expect, test } from 'bun:test'
import { registerDom } from '@fusion.dev/helix-testing/dom'
import { flashChange } from './flash-change.js'

beforeAll(() => {
  registerDom()
})

const realMatchMedia = globalThis.matchMedia

afterEach(() => {
  globalThis.matchMedia = realMatchMedia
  document.body.replaceChildren()
})

/** An animation the test moves by hand, as `animate` hands one back. */
interface Asked {
  animation: Animation & { finish(): void }
  keyframes: Keyframe[]
  options: KeyframeAnimationOptions
}

/** Records what an element is asked to animate. */
const watch = <E extends HTMLElement>(element: E): { asked: Asked[]; element: E } => {
  const asked: Asked[] = []
  element.animate = ((keyframes: Keyframe[], options: KeyframeAnimationOptions) => {
    const animation = new EventTarget() as Asked['animation']
    /* Settled as a browser settles it: fulfilled on finishing, refused on
       being canceled. */
    let settle: { cancel(): void; finish(): void } = { cancel() {}, finish() {} }
    const finished = new Promise<Animation>((resolve, reject) => {
      settle = {
        cancel: () => reject(new DOMException('Canceled', 'AbortError')),
        finish: () => resolve(animation),
      }
    })
    finished.catch(() => undefined)
    Object.assign(animation, {
      cancel: () => {
        settle.cancel()
        animation.dispatchEvent(new Event('cancel'))
      },
      currentTime: 0,
      finish: () => {
        settle.finish()
        animation.dispatchEvent(new Event('finish'))
      },
      finished,
    })
    asked.push({ animation, keyframes, options })
    return animation
  }) as HTMLElement['animate']
  return { asked, element }
}

/** A span of text on the page, watched. */
const text = () => {
  const span = document.createElement('span')
  span.textContent = '1,284'
  document.body.append(span)
  return watch(span)
}

const reduce = (): void => {
  globalThis.matchMedia = ((query: string) => ({
    matches: query.includes('reduce'),
  })) as unknown as typeof matchMedia
}

const settled = () => new Promise((resolve) => setTimeout(resolve, 0))

/** The strength a keyframe's wash is drawn at, as the percentage written. */
const strength = (keyframe: Keyframe | undefined): number =>
  Number(/ ([\d.]+)%, transparent\)$/.exec(String(keyframe?.boxShadow))?.[1])

describe('flashChange', () => {
  test('adds a wash under the content, holds it, fades it, and resolves once it is gone', async () => {
    const { asked, element } = text()
    let done = false
    const flashing = flashChange(element).then(() => {
      done = true
    })
    const [first] = asked
    expect(first?.options).toEqual({ composite: 'add', duration: 960 })
    expect(first?.keyframes.map((one) => one.offset)).toEqual([0, 1 / 3, 1])
    expect(first?.keyframes.map(strength)).toEqual([100, 100, 0])
    expect(String(first?.keyframes[0]?.boxShadow)).toStartWith('inset 0 0 0 100vmax')
    expect(String(first?.keyframes[0]?.boxShadow)).toContain('--helix-color-info')
    expect(element.getAttribute('style')).toBeNull()
    await settled()
    expect(done).toBe(false)
    first?.animation.finish()
    await flashing
    expect(done).toBe(true)
  })

  test('takes its times from the tokens, and the times and the color it is given', () => {
    const { asked, element } = text()
    element.style.setProperty('--helix-duration-slow', '200ms')
    void flashChange(element)
    const given = text()
    given.element.style.setProperty('--wash', 'rgb(0 0 0 / 0.1)')
    void flashChange(given.element, { color: '--wash', duration: 1000, hold: '0.5s' })
    expect(asked[0]?.options.duration).toBe(600)
    expect(given.asked[0]?.options.duration).toBe(1500)
    expect(given.asked[0]?.keyframes[1]?.offset).toBe(1 / 3)
    expect(String(given.asked[0]?.keyframes[0]?.boxShadow)).toContain('var(--wash)')
  })

  test('a second flash starts from the strength drawn, rises back, and the first resolves', async () => {
    const { asked, element } = text()
    let first = false
    void flashChange(element).then(() => {
      first = true
    })
    const [one] = asked
    if (one) {
      one.animation.currentTime = 640
    }
    void flashChange(element)
    await settled()
    expect(first).toBe(true)
    const two = asked[1]
    expect(strength(two?.keyframes[0])).toBe(50)
    expect(strength(two?.keyframes[1])).toBe(100)
    expect(two?.options.duration).toBe(60 + 320 + 640)
    expect(asked).toHaveLength(2)
  })

  test('under reduced motion, holds for its usual time and goes over the fade token, with no rise', () => {
    reduce()
    const { asked, element } = text()
    element.style.setProperty('--helix-duration-slow', '0.01ms')
    element.style.setProperty('--helix-duration-fade', '100ms')
    void flashChange(element)
    expect(asked[0]?.options.duration).toBe(320 + 100)
    if (asked[0]) {
      asked[0].animation.currentTime = 400
    }
    void flashChange(element)
    expect(asked[1]?.keyframes.map(strength)).toEqual([100, 100, 0])
    expect(asked[1]?.keyframes[0]?.offset).toBe(0)
  })

  test('washes a row that draws no box through its cells', () => {
    const row = document.createElement('div')
    row.style.display = 'contents'
    const cells = [watch(document.createElement('span')), watch(document.createElement('span'))]
    row.append(...cells.map((cell) => cell.element))
    document.body.append(row)
    const own = watch(row).asked
    void flashChange(row)
    expect(own).toHaveLength(0)
    expect(cells.map((cell) => cell.asked.length)).toEqual([1, 1])
  })

  test('washes a table row through its cells', () => {
    const table = document.createElement('table')
    table.innerHTML = '<tbody><tr><td>Alpha</td><td>1</td></tr></tbody>'
    document.body.append(table)
    const row = table.querySelector('tr') as HTMLTableRowElement
    row.style.display = 'table-row'
    const cells = [...row.cells].map((cell) => watch(cell).asked)
    const own = watch(row).asked
    void flashChange(row)
    expect(own).toHaveLength(0)
    expect(cells.map((one) => one.length)).toEqual([1, 1])
  })

  test('draws nothing on an element off the page, or with no time to show', async () => {
    const off = watch(document.createElement('span'))
    await flashChange(off.element)
    const none = text()
    await flashChange(none.element, { duration: 0, hold: 0 })
    expect(off.asked).toHaveLength(0)
    expect(none.asked).toHaveLength(0)
  })
})
