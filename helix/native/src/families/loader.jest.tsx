/*
 * The generated Loader, drawn from its real intermediate form: a busy
 * progress bar named by its label, a track and an arc that turns, a mark at
 * the center, a `delay` that keeps quick work from flashing it, and content
 * it stands in for until it is `idle`. The delay is core's, on a fake clock.
 * `test:native` writes the component beside this file, as the styled
 * package's build writes the one it ships.
 */
import { setTimers, timers } from '@fusion.dev/helix-core/capabilities/timers'
import { type FakeTimers, fakeTimers } from '@fusion.dev/helix-core/capabilities/timers/fake'
import { afterEach, beforeEach, describe, expect, test } from '@jest/globals'
import { act, render, screen } from '@testing-library/react-native'
import type { ReactNode } from 'react'
import { Text } from 'react-native'
import { dark } from '../theme/dark.generated'
import { HelixTheme } from '../theme/helix-theme'
import { type Drawn, nodes, styleOf } from './drawn'
import { HelixLoader } from './loader/index.native'

const original = timers()
let clock: FakeTimers

beforeEach(() => {
  clock = fakeTimers()
  setTimers(clock)
})

afterEach(() => {
  setTimers(original)
})

const themed = (children: ReactNode, mode: 'dark' | 'light' = 'light') => (
  <HelixTheme mode={mode}>{children}</HelixTheme>
)

/** Every node drawn. */
const all = (): Drawn[] => nodes(screen.toJSON())

/** The host: the outermost view. */
const host = (): Drawn | undefined => all()[0]

/** The view the drawing is sized and turned in: the one around the vector. */
const drawing = (): Drawn | undefined =>
  all().find((node) =>
    (node.children ?? []).some(
      (child) => typeof child !== 'string' && child.type === 'RNSVGSvgView',
    ),
  )

/** The circles the drawing holds. */
const circles = (): Drawn[] => all().filter((node) => node.type === 'RNSVGCircle')

describe('the generated Loader', () => {
  test('is a busy progress bar named by its label, with no reading', async () => {
    await render(themed(<HelixLoader />))
    expect(host()?.props.accessibilityRole).toBe('progressbar')
    expect(host()?.props.accessibilityLabel).toBe('Loading')
    expect(host()?.props.accessibilityState).toMatchObject({ busy: true })
  })

  test('draws a track and an arc at the size token, turning, over the content', async () => {
    await render(themed(<HelixLoader />))
    expect(circles()).toHaveLength(2)
    const box = styleOf(drawing() ?? { props: {} })
    expect([box.width, box.height, box.position]).toEqual([24, 24, 'absolute'])
    expect(box.animationIterationCount).toBe('infinite')
    expect(box.animationDuration).toBe(800)
    expect(styleOf(host() ?? { props: {} })).toMatchObject({ minHeight: 24, minWidth: 24 })
  })

  test('sizes by `size`, and draws the arc in the words’ color, here a dark page’s', async () => {
    await render(themed(<HelixLoader size="lg" />, 'dark'))
    expect(styleOf(drawing() ?? { props: {} }).width).toBe(
      Number.parseFloat(String(dark['size-loader-lg'])) * 16,
    )
    const arc = circles()[1]
    expect(arc?.props.fill).toBeNull()
    expect(arc?.props.strokeLinecap).toBe(1)
  })

  test('waits out its delay unseen and silent, then shows', async () => {
    await render(themed(<HelixLoader delay={300} />))
    expect(styleOf(drawing() ?? { props: {} }).opacity).toBe(0)
    expect(host()?.props.accessibilityElementsHidden).toBe(true)
    await act(async () => {
      clock.advance(299)
    })
    expect(styleOf(drawing() ?? { props: {} }).opacity).toBe(0)
    await act(async () => {
      clock.advance(1)
    })
    expect(styleOf(drawing() ?? { props: {} }).opacity).toBeUndefined()
    expect(host()?.props.accessibilityRole).toBe('progressbar')
  })

  test('idle, it draws only its content, with no role, and busy again it waits again', async () => {
    const view = await render(themed(<HelixLoader content={<Text>Save</Text>} delay={200} idle />))
    expect(host()?.props.accessibilityRole).toBeUndefined()
    expect(circles()).toHaveLength(0)
    expect(screen.getByText('Save')).toBeTruthy()
    await act(async () => {
      clock.advance(500)
    })
    await view.rerender(themed(<HelixLoader content={<Text>Save</Text>} delay={200} />))
    const step = (): string =>
      JSON.stringify([host()?.props.accessibilityElementsHidden, host()?.props.accessibilityRole])
    const first = step()
    await act(async () => {
      clock.advance(200)
    })
    expect(`${first} ${step()}`).toBe('[true,null] [null,"progressbar"]')
  })

  test('pulse draws neither the arc nor the track, and a larger box for the mark', async () => {
    await render(themed(<HelixLoader variant="pulse" />))
    expect([styleOf(drawing() ?? { props: {} }).width]).toEqual([64])
    expect(circles()).toHaveLength(0)
  })
})
