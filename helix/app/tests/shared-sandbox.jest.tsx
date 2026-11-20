import { HelixRoot } from '@fusion.dev/helix-native'
import { describe, expect, test } from '@jest/globals'
import { render, screen } from '@testing-library/react-native'
import { jsx, jsxs } from 'helix-shared/jsx-runtime'

/* A sandbox in shared code, as the gallery's examples write one: its panes
   and bars slotted in by name, drawn read only on a phone. */

describe('a sandbox in shared code', () => {
  test('draws its bar, its source, the preview passed in, and its status bar', async () => {
    await render(
      <HelixRoot>
        {jsxs('helix-sandbox', {
          children: [
            jsx('helix-sandbox-toolbar', {
              children: jsx('helix-tag', { children: 'index.html' }),
              slot: 'toolbar',
            }),
            jsx('helix-sandbox-source', { name: 'html', slot: 'source', value: '<b>Save</b>' }),
            jsx('div', { children: jsx('helix-button', { children: 'Save' }), slot: 'preview' }),
            jsx('helix-sandbox-status-bar', {
              children: jsx('helix-text', { children: 'HTML', scale: 'caption' }),
              slot: 'status',
            }),
          ],
        })}
      </HelixRoot>,
    )
    expect(screen.getByText('index.html')).toBeTruthy()
    expect(screen.getByText('<b>Save</b>')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Save' })).toBeTruthy()
    expect(screen.getByText('HTML')).toBeTruthy()
  })
})
