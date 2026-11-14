/*
 * The generated Format Date, drawn from its real intermediate form: a date
 * in the options asked for, a reading of how long ago that ticks on core's
 * wall clock as its words go stale, named in full with the whole date as its
 * hint, and drawn as a run of the words around it. The clock is core's, on a
 * fake clock. `test:native` writes the component beside this file.
 */
import { setTimers, timers } from '@fusion.dev/helix-core/capabilities/timers'
import {
  FAKE_WALL_START,
  type FakeTimers,
  fakeTimers,
} from '@fusion.dev/helix-core/capabilities/timers/fake'
import { afterEach, beforeEach, describe, expect, test } from '@jest/globals'
import { act, render, screen } from '@testing-library/react-native'
import type { ReactNode } from 'react'
import { HelixTheme } from '../theme/helix-theme'
import { type Drawn, nodes, styleOf, wordsOf } from './drawn'
import { HelixFormatDate } from './format-date/index.native'

const original = timers()
let clock: FakeTimers

beforeEach(() => {
  clock = fakeTimers()
  setTimers(clock)
})

afterEach(() => {
  setTimers(original)
})

const themed = (children: ReactNode) => <HelixTheme mode="light">{children}</HelixTheme>

/** The run that holds the words: the innermost node with a name or words. */
const time = (): Drawn | undefined =>
  nodes(screen.toJSON())
    .filter((node) => wordsOf(node) !== '')
    .at(-1)

/** A moment `ms` before the fake clock starts. */
const ago = (ms: number): string => new Date(FAKE_WALL_START - ms).toISOString()

describe('the generated Format Date', () => {
  test('writes a date in the options asked for, as the web does', async () => {
    await render(
      themed(
        <HelixFormatDate
          date="2026-03-14T15:09:00.000Z"
          day="numeric"
          locale="en-US"
          month="short"
          timeZone="UTC"
          year="numeric"
        />,
      ),
    )
    expect(wordsOf(time() ?? { children: [], props: {}, type: '' })).toBe('Mar 14, 2026')
    expect(time()?.props.accessibilityLabel).toBeUndefined()
  })

  test('reads a day with no time in UTC, so it is that day everywhere', async () => {
    await render(themed(<HelixFormatDate date="2026-08-04" dateStyle="long" locale="en-US" />))
    expect(screen.getByText('August 4, 2026')).toBeTruthy()
  })

  test('draws nothing with no date', async () => {
    await render(themed(<HelixFormatDate />))
    expect(time()).toBeUndefined()
  })

  test('reads how long ago, named in full, and ticks as the words go stale', async () => {
    await render(themed(<HelixFormatDate date={ago(59 * 60_000)} elapsed locale="en-US" />))
    expect(screen.getByText('59m')).toBeTruthy()
    await act(async () => {
      clock.advance(60_000)
    })
    expect(screen.getByText('1h')).toBeTruthy()
    const named = nodes(screen.toJSON()).find(
      (one) => typeof one.props.accessibilityLabel === 'string',
    )
    expect(named?.props.accessibilityLabel).toBe('1 hour ago')
    expect(String(named?.props.accessibilityHint)).toMatch(/January 5, 2026/)
  })

  test('relative reads in words, and frozen keeps the words it drew', async () => {
    const view = await render(
      themed(<HelixFormatDate date={ago(5 * 60_000)} locale="en-US" relative="long" />),
    )
    expect(screen.getByText('5 minutes ago')).toBeTruthy()
    await view.rerender(
      themed(<HelixFormatDate date={ago(5 * 60_000)} frozen locale="en-US" relative="long" />),
    )
    await act(async () => {
      clock.advance(120_000)
    })
    expect(screen.getByText('5 minutes ago')).toBeTruthy()
  })

  test('starts its clock again only on a prop its reading reads, as the web does', async () => {
    const view = await render(
      themed(<HelixFormatDate date={ago(5 * 60_000)} locale="en-US" relative="long" />),
    )
    await act(async () => {
      clock.setWall(FAKE_WALL_START + 10 * 60_000)
    })
    await view.rerender(
      themed(
        <HelixFormatDate date={ago(5 * 60_000)} locale="en-US" relative="long" timeZone="UTC" />,
      ),
    )
    expect(screen.getByText('5 minutes ago')).toBeTruthy()
    await view.rerender(
      themed(
        <HelixFormatDate
          date={ago(5 * 60_000)}
          locale="en-US"
          numeric="always"
          relative="long"
          timeZone="UTC"
        />,
      ),
    )
    expect(screen.getByText('15 minutes ago')).toBeTruthy()
  })

  test('stops while the app is away, and catches up as it comes back', async () => {
    await render(themed(<HelixFormatDate date={ago(5 * 60_000)} locale="en-US" relative="short" />))
    await act(async () => {
      clock.setVisible(false)
      clock.advance(10 * 60_000)
    })
    expect(screen.getByText('5 min. ago')).toBeTruthy()
    await act(async () => {
      clock.setVisible(true)
    })
    expect(screen.getByText('15 min. ago')).toBeTruthy()
  })

  test('sets an elapsed reading in tabular figures', async () => {
    await render(themed(<HelixFormatDate date={ago(60_000)} elapsed locale="en-US" />))
    const styled = nodes(screen.toJSON()).map((one) => styleOf(one).fontVariant)
    expect(styled.some((one) => JSON.stringify(one ?? []).includes('tabular-nums'))).toBe(true)
  })
})
