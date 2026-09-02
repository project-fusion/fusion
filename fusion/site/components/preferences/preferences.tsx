'use client'
import { useEffect, useState } from 'react'
import type { ApiTier } from '@/hooks/use-api-tier/use-api-tier'
import { forgetSiteTheme, readSiteTheme } from '@/utils/site-theme/site-theme'

/* Re-exported, because the preview's theme toolbar writes the same preference
   and two components holding the same string is how they drift. The value
   itself lives in a plain module: the root layout needs it on the server to
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

  /**
   * Whether there is a theme to offer to forget.
   *
   * Read when the drawer opens rather than once on mount: the reader can derive
   * a palette on the landing page with this drawer closed and open it a moment
   * later, and a flag read at mount would say there was nothing to reset.
   */
  const [themed, setThemed] = useState(false)
  useEffect(() => {
    if (open) {
      setThemed(readSiteTheme() !== null)
    }
  }, [open])

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
      {/* No `align="start"`. It shrink wraps every child to its own content, so
          each toggle group comes out as wide as its three words. Stretch is the
          default and is what a column of fields wants: they share an edge, and a
          group that fills its column has segments wide enough to read. */}
      <helix-flex direction="column" gap="lg">
        <helix-text as="h2" variant="subheading">
          Preferences
        </helix-text>

        {/* The label and the line under it are the control's own, not `Text`
            elements placed around it: `MixinField` exists so the spacing is not
            a guess at what every other field does, and so the group is named
            once rather than visibly and again through `aria-label`. */}
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
            outward. The default is still styled, that being the tier almost
            everyone consumes; where a control sits in a row and which of its
            values is the resting one are different questions. */}
        <helix-toggle-group
          hint="Styled extends headless, so it shows more."
          label="API reference"
          onChange={(event) => chooseTier(event.currentTarget.value as ApiTier)}
          value={tier}
        >
          <helix-toggle value="headless">Headless</helix-toggle>
          <helix-toggle value="styled">Styled</helix-toggle>
        </helix-toggle-group>

        {/*
         * *Only when there is one, because a reset with nothing to reset is a
         *             control that reports the feature rather than offering it.** A reader
         *             who has never touched the theme controls should not have to work out
         *             what "site theme" means here to conclude it does not concern them.
         */}
        {themed && (
          <helix-flex direction="column" gap="xs">
            <helix-text variant="label">Site theme</helix-text>
            {/* **`subtle` rather than `outlined`, which light mode decided.** The
                drawer is glass over a near-white page, so an outlined control is
                a hairline and a transparent fill on a ground already close to
                white: the button reads as a disabled slab rather than as
                something to press, which is the whole of what it is here. A
                subtle fill gives it a surface of its own to sit on, and it is
                what the toggle groups above already stand on. */}
            <helix-button
              emphasis="subtle"
              onClick={() => {
                forgetSiteTheme()
                setThemed(false)
              }}
            >
              Reset to the default palette
            </helix-button>
          </helix-flex>
        )}
      </helix-flex>
    </helix-drawer>
  )
}
