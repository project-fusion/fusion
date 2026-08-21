'use client'

import type { HelixDrawer, HelixToggleGroup } from '@helix-io/web'
import { useEffect, useRef, useState } from 'react'

type ColorMode = 'system' | 'light' | 'dark'

/**
 * Which tier's API a reference page documents.
 *
 * `styled` is the default because it is the tier almost everyone consumes, and
 * because it is a superset: the styled element extends the base one, so its
 * tables already contain every member the base tables would show. A reader who
 * has not expressed a preference is better served by the larger, more common
 * answer than by being asked a question they have no reason to have an opinion
 * about yet.
 */
type ApiTier = 'styled' | 'base'

const STORAGE_KEY = 'fusion-color-mode'
const TIER_KEY = 'fusion-api-tier'

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

/**
 * Puts the tier on the document, where CSS can act on it.
 *
 * The same shape as the colour mode above, and for a sharper reason here: a
 * reference page is static and server-rendered, and this preference is read
 * from `localStorage`, which the server does not have. So the page renders
 * **both** tiers and this attribute decides which one is shown. Filtering in
 * React instead would mean the server rendering one answer and the client
 * wanting another, which is a hydration mismatch on every docs page.
 *
 * `styled` clears the attribute rather than writing it, so the default state of
 * the document is the default preference and there is one way to be normal.
 */
const applyTier = (tier: ApiTier): void => {
  if (tier === 'styled') {
    delete document.documentElement.dataset.apiTier
    return
  }
  document.documentElement.dataset.apiTier = tier
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
  const [tier, setTier] = useState<ApiTier>('styled')

  // Read after mount. The server has no localStorage, so choosing a mode during
  // render would make the first paint disagree with the stored choice.
  useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY) as ColorMode | null
    if (stored) {
      setMode(stored)
      apply(stored)
    }
    const storedTier = window.localStorage.getItem(TIER_KEY) as ApiTier | null
    if (storedTier) {
      setTier(storedTier)
      applyTier(storedTier)
    }
  }, [])

  const choose = (next: ColorMode) => {
    setMode(next)
    apply(next)
    window.localStorage.setItem(STORAGE_KEY, next)
  }

  const chooseTier = (next: ApiTier) => {
    setTier(next)
    applyTier(next)
    window.localStorage.setItem(TIER_KEY, next)
  }

  return (
    <helix-drawer
      label="Preferences"
      onhelix-close={() => onOpenChange(false)}
      onhelix-open={() => onOpenChange(true)}
      open={open}
      placement="end"
    >
      {/* No `align="start"`. It shrink wrapped every child to its own content,
          so each toggle group was as wide as its three words and the drawer had
          a column of ragged little controls in it. Stretch is the default and
          is what a column of fields wants: they share an edge, and a group that
          fills its column has segments wide enough to read. */}
      <helix-flex direction="column" gap="lg">
        <helix-text appearance="subheading" as="h2">
          Preferences
        </helix-text>

        {/* The label and the line under it are the control's own now. They were
            two `Text` elements hand-placed around it, which is exactly the
            arrangement `MixinField` exists to stop being hand-placed: the
            spacing was this file's guess at what every other field does, and
            the group was named twice, once visibly and once through
            `aria-label`. */}
        <helix-toggle-group
          hint="System keeps following your device."
          label="Color mode"
          onhelix-change={(event) => choose(event.detail.value as ColorMode)}
          value={mode}
        >
          <helix-toggle value="system">System</helix-toggle>
          <helix-toggle value="light">Light</helix-toggle>
          <helix-toggle value="dark">Dark</helix-toggle>
        </helix-toggle-group>

        <helix-toggle-group
          hint="Styled extends base, so it shows more."
          label="API reference"
          onhelix-change={(event) => chooseTier(event.detail.value as ApiTier)}
          value={tier}
        >
          <helix-toggle value="styled">Styled</helix-toggle>
          <helix-toggle value="base">Base</helix-toggle>
        </helix-toggle-group>
      </helix-flex>
    </helix-drawer>
  )
}
