'use client'

import type { HelixDrawer, HelixToggleGroup } from '@helix-io/web'
import { useEffect, useRef, useState } from 'react'
import { useHelixEvent } from '../lib/use-helix-event'

type ColorMode = 'system' | 'light' | 'dark'

const STORAGE_KEY = 'fusion-color-mode'

/**
 * Applies a color mode to the document.
 *
 * `system` removes the attribute rather than writing a resolved value, so the
 * page keeps following the OS afterwards. Writing "light" because the OS is
 * light right now would freeze it there the moment the OS changed.
 */
const apply = (mode: ColorMode): void => {
  if (mode === 'system') {
    delete document.documentElement.dataset.colorMode
    return
  }
  document.documentElement.dataset.colorMode = mode
}

interface Props {
  onOpenChange: (open: boolean) => void
  open: boolean
}

/**
 * The preferences drawer.
 *
 * Takes its open state rather than owning it, because the trigger belongs in
 * the header and the drawer must not be. `backdrop-filter`, and any filter,
 * makes an element a containing block for `position: fixed` descendants, so a
 * drawer rendered inside a header is positioned against the header: it comes
 * out one header tall and pushes the layout around instead of covering the
 * page. Splitting the two is the fix, and it is the only reason they are split.
 *
 * A drawer rather than a popover: this will grow past one setting, and a
 * surface that has to be rebuilt the first time it does is the wrong one to
 * start with.
 */
export function PreferencesDrawer({ onOpenChange, open }: Props) {
  const [mode, setMode] = useState<ColorMode>('system')
  const drawer = useRef<HelixDrawer>(null)
  const modes = useRef<HelixToggleGroup>(null)

  // Read after mount. The server has no localStorage, so choosing a mode during
  // render would make the first paint disagree with the stored choice.
  useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY) as ColorMode | null
    if (stored) {
      setMode(stored)
      apply(stored)
    }
  }, [])

  const choose = (next: ColorMode) => {
    setMode(next)
    apply(next)
    window.localStorage.setItem(STORAGE_KEY, next)
  }

  // Bound from effects. A Helix event given to React as a prop is never
  // listened for on a page that was server-rendered. See `useHelixEvent`.
  useHelixEvent(drawer, 'helix-close', () => {
    onOpenChange(false)
  })
  useHelixEvent(drawer, 'helix-open', () => {
    onOpenChange(true)
  })
  useHelixEvent(modes, 'helix-select', (event) => {
    choose(event.detail.value as ColorMode)
  })

  return (
    <helix-drawer label="Preferences" open={open} placement="end" ref={drawer}>
      <helix-flex align="start" class="prefsPanel" direction="column" gap="lg">
        <helix-text as="h2" appearance="subheading">
          Preferences
        </helix-text>

        <helix-flex direction="column" gap="xs">
          <helix-text appearance="label" tone="subtle">
            Color mode
          </helix-text>
          <helix-toggle-group label="Color mode" ref={modes} value={mode}>
            <helix-toggle value="system">System</helix-toggle>
            <helix-toggle value="light">Light</helix-toggle>
            <helix-toggle value="dark">Dark</helix-toggle>
          </helix-toggle-group>
          <helix-text appearance="caption" tone="subtle">
            System follows your operating system, and keeps following it.
          </helix-text>
        </helix-flex>
      </helix-flex>
    </helix-drawer>
  )
}
