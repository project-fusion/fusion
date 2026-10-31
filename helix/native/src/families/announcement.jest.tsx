/*
 * The generated Announcement, drawn from its real intermediate form: a
 * region named by its label whose message is told as it arrives, a dismiss
 * button that sends `dismiss` with the message's words and leaves the
 * announcement for the page to take out, a `duration` spent on core's
 * countdown and held while a reader is on it, a queue that waits its turn,
 * and a band tinted by its tone. `test:native` writes the component beside
 * this file.
 */
import { type Announce, announce, setAnnounce } from '@fusion.dev/helix-core/capabilities/announce'
import { fakeAnnounce } from '@fusion.dev/helix-core/capabilities/announce/fake'
import {
  type Environment,
  environment,
  setEnvironment,
} from '@fusion.dev/helix-core/capabilities/environment'
import { fakeEnvironment } from '@fusion.dev/helix-core/capabilities/environment/fake'
import { setFocus } from '@fusion.dev/helix-core/capabilities/focus'
import { fakeFocus } from '@fusion.dev/helix-core/capabilities/focus/fake'
import { setTimers, type Timers, timers } from '@fusion.dev/helix-core/capabilities/timers'
import { type FakeTimers, fakeTimers } from '@fusion.dev/helix-core/capabilities/timers/fake'
import { afterEach, beforeEach, describe, expect, jest, test } from '@jest/globals'
import { act, fireEvent, render, screen } from '@testing-library/react-native'
import { type ReactNode, useState } from 'react'
import { Text } from 'react-native'
import { HelixTheme } from '../theme/helix-theme'
import { HelixAnnouncement } from './announcement/index.native'
import { nodes, styleOf } from './drawn'

const themed = (children: ReactNode) => <HelixTheme mode="light">{children}</HelixTheme>

const originals: { announce: Announce; environment: Environment; timers: Timers } = {
  announce: announce(),
  environment: environment(),
  timers: timers(),
}
let clock: FakeTimers = fakeTimers()

beforeEach(() => {
  clock = fakeTimers()
  setTimers(clock)
})

afterEach(() => {
  setTimers(originals.timers)
  setAnnounce(originals.announce)
  setEnvironment(originals.environment)
})

type Heard = (event: { detail: { label?: string }; preventDefault: () => void }) => void

/** The host, the first view drawn. */
const host = () => nodes(screen.toJSON())[0]

/** Calls the host's touch handler `name`, as a finger landing or lifting does. */
const touch = (name: 'onTouchEnd' | 'onTouchStart') =>
  act(async () => {
    ;(host()?.props[name] as ((event: object) => void) | undefined)?.({})
  })

/** Moves the fake clock, inside `act`. */
const wait = (ms: number) =>
  act(async () => {
    clock.advance(ms)
  })

const Queued = () => {
  const [first, setFirst] = useState(true)
  return themed(
    <>
      {first ? (
        <HelixAnnouncement dismissible onDismiss={() => setFirst(false)} queued>
          First
        </HelixAnnouncement>
      ) : null}
      <HelixAnnouncement queued>Second</HelixAnnouncement>
    </>,
  )
}

const Dismissible = () => {
  const [first, setFirst] = useState(true)
  return themed(
    <>
      {first ? (
        <HelixAnnouncement dismissible onDismiss={() => setFirst(false)}>
          <Text>First</Text>
        </HelixAnnouncement>
      ) : null}
      <HelixAnnouncement dismissible>Second</HelixAnnouncement>
    </>,
  )
}

describe('the generated Announcement', () => {
  test('is a region named Announcement, and tells its message as it arrives', async () => {
    const said = fakeAnnounce()
    setAnnounce(said)
    await render(themed(<HelixAnnouncement>Trial ends Friday.</HelixAnnouncement>))
    expect(host()?.props.role).toBe('region')
    expect(host()?.props.accessibilityLabel).toBe('Announcement')
    expect(said.said).toEqual([{ message: 'Trial ends Friday.', urgency: 'polite' }])
  })

  test('is no region where its label is empty', async () => {
    await render(themed(<HelixAnnouncement label="">Words</HelixAnnouncement>))
    expect(host()?.props.role).toBeUndefined()
  })

  test('sends dismiss with its words from its button, and stays for the page to take out', async () => {
    const heard = jest.fn<Heard>()
    await render(
      themed(
        <HelixAnnouncement dismissible onDismiss={heard}>
          Maintenance tonight.
        </HelixAnnouncement>,
      ),
    )
    await fireEvent.press(screen.getByLabelText('Dismiss'))
    expect(heard).toHaveBeenCalledTimes(1)
    expect(heard.mock.calls[0]?.[0].detail).toEqual({ label: 'Maintenance tonight.' })
    expect(screen.getByText('Maintenance tonight.')).toBeTruthy()
  })

  test('sends dismiss once its duration is spent, and not before', async () => {
    const heard = jest.fn<Heard>()
    await render(
      themed(
        <HelixAnnouncement duration={5000} onDismiss={heard}>
          Saved.
        </HelixAnnouncement>,
      ),
    )
    await wait(4999)
    expect(heard).not.toHaveBeenCalled()
    await wait(1)
    expect(heard).toHaveBeenCalledTimes(1)
    expect(heard.mock.calls[0]?.[0].detail).toEqual({ label: 'Saved.' })
  })

  test('holds its clock while touched, and runs on from what was left', async () => {
    const heard = jest.fn<Heard>()
    await render(
      themed(
        <HelixAnnouncement duration={1000} onDismiss={heard}>
          Saved.
        </HelixAnnouncement>,
      ),
    )
    await wait(600)
    await touch('onTouchStart')
    await wait(5000)
    expect(heard).not.toHaveBeenCalled()
    await touch('onTouchEnd')
    await wait(399)
    expect(heard).not.toHaveBeenCalled()
    await wait(1)
    expect(heard).toHaveBeenCalledTimes(1)
  })

  test('holds its clock while the app is away and while a screen reader runs', async () => {
    const heard = jest.fn<Heard>()
    const reader = fakeEnvironment({ screenReader: true })
    setEnvironment(reader)
    await render(
      themed(
        <HelixAnnouncement duration={1000} onDismiss={heard}>
          Saved.
        </HelixAnnouncement>,
      ),
    )
    await wait(5000)
    expect(heard).not.toHaveBeenCalled()
    await act(async () => {
      reader.change({ screenReader: false })
    })
    await act(async () => {
      clock.setVisible(false)
    })
    await wait(5000)
    expect(heard).not.toHaveBeenCalled()
    await act(async () => {
      clock.setVisible(true)
    })
    await wait(1000)
    expect(heard).toHaveBeenCalledTimes(1)
  })

  test('waits its turn when queued, and takes it as the one before leaves', async () => {
    const said = fakeAnnounce()
    setAnnounce(said)
    await render(<Queued />)
    const second = () => nodes(screen.toJSON()).filter((node) => node.props.role === 'region')
    expect(said.said.map((one) => one.message)).toEqual(['First'])
    expect(nodes(screen.toJSON()).some((node) => styleOf(node).display === 'none')).toBe(true)
    await fireEvent.press(screen.getByLabelText('Dismiss'))
    await act(async () => undefined)
    expect(said.said.map((one) => one.message)).toEqual(['First', 'Second'])
    expect(second()).toHaveLength(1)
    expect(styleOf(second()[0] ?? { props: {} }).display).not.toBe('none')
  })

  test('hands focus to the dismiss button beside it as the page takes it out', async () => {
    const focus = fakeFocus<unknown>()
    setFocus(focus)
    await render(<Dismissible />)
    await fireEvent.press(screen.getAllByLabelText('Dismiss')[0] as never)
    await act(async () => undefined)
    expect(focus.moved).toHaveLength(1)
    expect(screen.getAllByLabelText('Dismiss')).toHaveLength(1)
  })

  test('puts its actions under the message where the line has no room for both', async () => {
    await render(
      themed(
        <HelixAnnouncement actions={<Text>Stay signed in</Text>}>
          Your session expires in five minutes.
        </HelixAnnouncement>,
      ),
    )
    const band = styleOf(host() ?? { props: {} })
    expect(band.flexWrap).toBe('wrap')
    expect(band.justifyContent).toBe('center')
  })

  test('tints the band by its tone, and keeps the resting fill when neutral', async () => {
    const view = await render(themed(<HelixAnnouncement tone="info">Words</HelixAnnouncement>))
    expect(String(styleOf(host() ?? { props: {} }).backgroundImage)).toMatch(/^linear-gradient/)
    await view.rerender(themed(<HelixAnnouncement tone="neutral">Words</HelixAnnouncement>))
    expect(styleOf(host() ?? { props: {} }).backgroundImage).toBeUndefined()
  })
})
