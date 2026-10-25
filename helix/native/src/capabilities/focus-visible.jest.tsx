import { setFocus } from '@fusion.dev/helix-core/capabilities/focus'
import { type FakeFocus, fakeFocus } from '@fusion.dev/helix-core/capabilities/focus/fake'
import { setKeys } from '@fusion.dev/helix-core/capabilities/keys'
import { fakeKeys } from '@fusion.dev/helix-core/capabilities/keys/fake'
import { afterEach, beforeEach, describe, expect, test } from '@jest/globals'
import { act, fireEvent, render, screen } from '@testing-library/react-native'
import { HelixButton } from '../families/button/index.native'
import { styleOf } from '../families/drawn'
import { HelixTheme } from '../theme/helix-theme'
import { heardKey, heardTouch } from './focus-visible'

let focus: FakeFocus<unknown>
/** The view each press listens for keys on, in the order they started. */
let listened: unknown[]

beforeEach(() => {
  focus = fakeFocus<unknown>()
  setFocus(focus)
  const keys = fakeKeys<unknown>()
  listened = []
  setKeys({
    ...keys,
    listen: (node, heard) => {
      listened.push(node)
      return keys.listen(node, heard)
    },
  })
})

afterEach(() => {
  heardTouch()
})

/** The width of the button's outline, 0 where it draws none. */
const ring = (): number => Number(styleOf(screen.getByRole('button')).outlineWidth ?? 0)

const drawn = () =>
  render(
    <HelixTheme mode="light">
      <HelixButton>Save</HelixButton>
    </HelixTheme>,
  )

describe('the focus ring', () => {
  test('shows where keyboard focus is after a key from a hardware keyboard', async () => {
    await drawn()
    await act(() => {
      focus.place(listened[0])
      heardKey()
    })
    expect(ring()).toBeGreaterThan(0)
  })

  test('does not show after a touch, until the next key', async () => {
    await drawn()
    await act(() => {
      focus.place(listened[0])
      heardKey()
    })
    await fireEvent(screen.getByRole('button'), 'pressIn', {
      nativeEvent: { pageX: 0, pageY: 0 },
    })
    expect(ring()).toBe(0)
    await act(() => heardKey())
    expect(ring()).toBeGreaterThan(0)
  })

  test('does not show on a part without keyboard focus, or with focus and no key', async () => {
    await drawn()
    await act(() => focus.place(listened[0]))
    expect(ring()).toBe(0)
    await act(() => {
      focus.place(null)
      heardKey()
    })
    expect(ring()).toBe(0)
  })
})
