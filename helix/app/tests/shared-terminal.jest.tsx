import { HelixRoot } from '@fusion.dev/helix-native'
import { describe, expect, test } from '@jest/globals'
import { act, render, screen } from '@testing-library/react-native'
import { jsx } from 'helix-shared/jsx-runtime'
import { createRef } from 'react'

/* A terminal in shared code, as the gallery's examples write one: output
   written on its ref, drawn as text by @xterm/headless, the web renderer's
   canvas passed in left to the web. */

describe('a terminal in shared code', () => {
  test('draws what is written on its ref, and leaves the renderer passed in to the web', async () => {
    const ref = createRef<{ write: (data: string) => Promise<void> }>()
    await render(
      <HelixRoot>
        {jsx('helix-terminal', {
          children: jsx('div', { children: 'canvas', 'data-preview-terminal-canvas': true }),
          label: '~/fusion',
          ref,
        })}
      </HelixRoot>,
    )
    await act(async () => {
      await ref.current?.write('\x1b[32m23 pass\x1b[0m')
      await new Promise<void>((done) => requestAnimationFrame(() => done()))
    })
    expect(screen.getByText('~/fusion')).toBeTruthy()
    expect(screen.getByText('23 pass')).toBeTruthy()
    expect(screen.queryByText('canvas')).toBeNull()
  })
})
