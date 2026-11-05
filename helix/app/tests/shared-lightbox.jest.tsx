import { HelixRoot } from '@fusion.dev/helix-native'
import { describe, expect, test } from '@jest/globals'
import { act, fireEvent, render, screen } from '@testing-library/react-native'
import { jsx, jsxs } from 'helix-shared/jsx-runtime'
import { useRef } from 'react'

/* A lightbox in shared code whose header's buttons step it and close it
   through its ref, as the gallery's examples do. */

type Viewer = { close(): void; next(): void }

const Viewer = ({ closed }: { readonly closed: string[] }) => {
  const viewer = useRef<Viewer>(null)
  return jsxs('helix-lightbox', {
    children: [
      jsxs('helix-button-group', {
        children: [
          jsx('helix-button', { children: 'Next picture', onClick: () => viewer.current?.next() }),
          jsx('helix-button', { children: 'Close', onClick: () => viewer.current?.close() }),
        ],
        label: 'Lightbox actions',
        slot: 'header',
      }),
      jsx('helix-lightbox-item', {
        children: jsx('helix-text', { children: 'Water' }),
        label: 'Seawater',
        value: 'seawater',
      }),
      jsx('helix-lightbox-item', {
        children: jsx('helix-text', { children: 'Sun' }),
        label: 'Sun',
        value: 'sun',
      }),
    ],
    counter: true,
    label: 'Beach photos',
    onClose: () => closed.push('close'),
    open: true,
    ref: viewer,
  })
}

describe('a lightbox in shared code', () => {
  test('its header steps it and closes it through its ref', async () => {
    const closed: string[] = []
    await render(<HelixRoot mode="light">{jsx(Viewer, { closed })}</HelixRoot>)
    await act(async () => new Promise((done) => setTimeout(done, 40)))
    expect(screen.queryByText('1 of 2', { includeHiddenElements: true })).not.toBeNull()
    await fireEvent.press(screen.getByText('Next picture'))
    expect(screen.queryByText('2 of 2', { includeHiddenElements: true })).not.toBeNull()
    await fireEvent.press(screen.getByText('Close'))
    await act(async () => new Promise((done) => setTimeout(done, 40)))
    expect(closed).toEqual(['close'])
  })
})
