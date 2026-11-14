import { HelixRoot } from '@fusion.dev/helix-native'
import { describe, expect, test } from '@jest/globals'
import { render, screen } from '@testing-library/react-native'
import { jsx } from 'helix-shared/jsx-runtime'

/* A control inside a `<fieldset disabled>` in code shared with the web draws
   as its own `disabled` draws it, as `:disabled` reaches it on the web. */

const drawn = async (element: unknown): Promise<string> => {
  const { unmount } = await render(<HelixRoot mode="light">{element as never}</HelixRoot>)
  /* Gesture Handler's tags count up across every drawing. */
  const json = JSON.stringify(screen.toJSON()).replace(/"handlerTags":\[[\d,]*\],/g, '')
  await unmount()
  return json
}

/** Each control a fieldset disables on the web, with what it needs to draw. */
const CONTROLS: readonly (readonly [string, Record<string, unknown>])[] = [
  ['helix-button', { children: 'Save' }],
  ['helix-checkbox', { children: 'Agree' }],
  ['helix-checkbox-group', { children: jsx('helix-checkbox', { value: 'a' }), label: 'Mail' }],
  ['helix-color-input', { label: 'Color' }],
  ['helix-color-picker', { label: 'Color' }],
  ['helix-copy-button', { label: 'Copy', value: 'x' }],
  ['helix-file-input', { label: 'File' }],
  ['helix-icon-button', { label: 'Add', name: 'plus' }],
  ['helix-input', { label: 'Name' }],
  ['helix-number-input', { label: 'Guests' }],
  ['helix-pin-input', { label: 'Code' }],
  ['helix-radio-group', { children: jsx('helix-radio', { value: 'a' }), label: 'Plan' }],
  ['helix-rating', { label: 'Score' }],
  ['helix-slider', { label: 'Volume' }],
  ['helix-switch', { children: 'On' }],
  ['helix-textarea', { label: 'Notes' }],
  ['helix-toggle-group', { children: jsx('helix-toggle', { value: 'a' }), label: 'View' }],
]

describe('a disabled fieldset', () => {
  test.each(CONTROLS)('disables %s as its own disabled does', async (tag, props) => {
    const enabled = await drawn(jsx('div', { children: jsx(tag, props) }))
    const off = await drawn(jsx('div', { children: jsx(tag, { ...props, disabled: true }) }))
    const inside = await drawn(jsx('fieldset', { children: jsx(tag, props), disabled: true }))
    expect(off).not.toBe(enabled)
    expect(inside).toBe(off)
  })

  test('leaves a fieldset that is not disabled alone', async () => {
    const enabled = await drawn(jsx('div', { children: jsx('helix-slider', { label: 'Volume' }) }))
    expect(
      await drawn(jsx('fieldset', { children: jsx('helix-slider', { label: 'Volume' }) })),
    ).toBe(enabled)
  })

  test('reaches through a box, and a fieldset inside does not lift it', async () => {
    const off = await drawn(
      jsx('div', {
        children: jsx('div', {
          children: jsx('div', { children: jsx('helix-input', { disabled: true, label: 'Name' }) }),
        }),
      }),
    )
    const inside = await drawn(
      jsx('fieldset', {
        children: jsx('div', {
          children: jsx('fieldset', { children: jsx('helix-input', { label: 'Name' }) }),
        }),
        disabled: true,
      }),
    )
    expect(inside).toBe(off)
  })

  test('leaves what the first legend holds, as the web does', async () => {
    const enabled = await drawn(
      jsx('div', { children: jsx('div', { children: jsx('helix-button', { children: 'A' }) }) }),
    )
    const inLegend = await drawn(
      jsx('fieldset', {
        children: jsx('legend', { children: jsx('helix-button', { children: 'A' }) }),
        disabled: true,
      }),
    )
    expect(inLegend).toBe(enabled)
  })

  test('leaves an element no fieldset disables on the web', async () => {
    const enabled = await drawn(jsx('div', { children: jsx('helix-toggle', { value: 'a' }) }))
    expect(
      await drawn(
        jsx('fieldset', { children: jsx('helix-toggle', { value: 'a' }), disabled: true }),
      ),
    ).toBe(enabled)
  })
})
