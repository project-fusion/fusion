'use client'
import { useEffect, useState } from 'react'
import type { ApiTier } from '@/hooks/use-api-tier/use-api-tier'

/* Re-exported, because the preview's theme toolbar writes the same preference
   and two components holding the same string is how they drift. The value
   itself lives in a plain module now: the root layout needs it on the server to
   build its pre-paint script, and a `'use client'` file cannot hand a server
   component a string. */
export { COLOR_MODE_KEY as STORAGE_KEY } from '@/utils/color-mode/color-mode'

import { type ColorMode, COLOR_MODE_KEY as STORAGE_KEY } from '@/utils/color-mode/color-mode'

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
 * The same shape as the color mode above, and for a sharper reason here: a
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
    /* Only when the address did not say, which is the same rule the sandbox
       applies to its language. A link carrying `?tier=` is a statement about
       what that page is; what this browser last chose is not, and a link must
       never re-set somebody's own drawer. The page has already written the
       attribute server-side, so this leaves it alone rather than racing it. */
    const storedTier = window.localStorage.getItem(TIER_KEY) as ApiTier | null
    const asked = new URLSearchParams(window.location.search).get('tier')
    if (storedTier) {
      setTier(storedTier)
      if (asked !== 'headless' && asked !== 'styled') {
        applyTier(storedTier)
      }
    }
  }, [])

  /**
   * Follows the attribute, because this panel is not the only thing that sets it.
   *
   * **It read `localStorage` once at mount and never again**, so a scheme
   * chosen anywhere else left this showing the old answer: change it in the
   * landing page's theme bar, open preferences, and the radio still pointed at
   * what you had before. The panel was not wrong about what it had been told,
   * it had just stopped listening.
   *
   * `data-color-mode` is the one thing every control agrees on, so watching it
   * needs no coordination between them. Its absence is the system default,
   * which is what `system` means here.
   */
  useEffect(() => {
    const follow = () => {
      const attr = document.documentElement.dataset.colorMode
      setMode(attr === 'dark' || attr === 'light' ? attr : 'system')
    }
    const modes = new MutationObserver(follow)
    modes.observe(document.documentElement, {
      attributeFilter: ['data-color-mode'],
      attributes: true,
    })
    return () => modes.disconnect()
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
      material="glass"
      onhelix-before-close={() => onOpenChange(false)}
      onhelix-before-open={() => onOpenChange(true)}
      open={open}
      placement="end"
    >
      {/* No `align="start"`. It shrink wrapped every child to its own content,
          so each toggle group was as wide as its three words and the drawer had
          a column of ragged little controls in it. Stretch is the default and
          is what a column of fields wants: they share an edge, and a group that
          fills its column has segments wide enough to read. */}
      <helix-flex direction="column" gap="lg">
        <helix-text as="h2" variant="subheading">
          Preferences
        </helix-text>

        {/* The label and the line under it are the control's own now. They were
            two `Text` elements hand-placed around it, which is exactly the
            arrangement `MixinField` exists to stop being hand-placed: the
            spacing was this file's guess at what every other field does, and
            the group was named twice, once visibly and once through
            `aria-label`. */}
        <helix-toggle-group
          label="Color mode"
          onChange={(event) => choose(event.currentTarget.value as ColorMode)}
          value={mode}
        >
          <helix-toggle value="system">System</helix-toggle>
          <helix-toggle value="light">Light</helix-toggle>
          <helix-toggle value="dark">Dark</helix-toggle>
        </helix-toggle-group>

        {/* Headless first, styled second, which is the order the tiers are in:
            styled extends headless, so reading left to right is reading
            outward. The default is unchanged and is still styled, that being
            the tier almost everyone consumes; where a control sits in a row and
            which of its values is the resting one are different questions. */}
        <helix-toggle-group
          hint="Styled extends headless, so it shows more."
          label="API reference"
          onChange={(event) => chooseTier(event.currentTarget.value as ApiTier)}
          value={tier}
        >
          <helix-toggle value="headless">Headless</helix-toggle>
          <helix-toggle value="styled">Styled</helix-toggle>
        </helix-toggle-group>
      </helix-flex>
    </helix-drawer>
  )
}
