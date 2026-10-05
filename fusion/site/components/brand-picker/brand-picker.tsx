'use client'

import type { HelixColorPicker, HelixPopover } from '@fusion.dev/helix'
import { useEffect, useRef, useState } from 'react'
import { useThemeControls } from '@/components/theme-context/theme-context'
import styles from './brand-picker.module.css'

/** The hue of Fusion's blue, `#3b82f6`, which the square opens on with no brand set. */
const INK_HUE = 217

/**
 * The page's ink as the picker reads it: a gray, written in `hsl()` so it
 * carries a hue. A gray hex has no hue to read, so the picker took 0 and opened
 * on a red square.
 */
const inkFor = (hex: string): string => {
  const channels = [1, 3, 5].map((at) => Number.parseInt(hex.slice(at, at + 2), 16))
  const lightness = (Math.max(...channels) + Math.min(...channels)) / 2 / 255
  return `hsl(${INK_HUE}, 0%, ${Math.round(lightness * 1000) / 10}%)`
}

/** A hex with the same red, green, and blue, which is a gray. */
const isGray = (hex: string): boolean => /^#([\da-f]{2})\1\1$/i.test(hex)

/**
 * The brand control, as a swatch that opens the picker.
 */
export const BrandPicker = () => {
  const c = useThemeControls()
  const picker = useRef<HelixColorPicker | null>(null)
  const [open, setOpen] = useState(false)

  /* **With no brand set, the picker opens on the page's ink, on the hue of
     Fusion's blue.** The chip shows the color the page is in, and the square
     shows the blue a first move into it starts from. */
  const primary = c.derived?.theme.tokens.find((t) => t.name === 'color-primary')?.hex
  const shown = c.brand || (primary ? inkFor(primary) : '')

  useEffect(() => {
    const el = picker.current
    if (!el) {
      return
    }
    /* A gray leaves the page in ink. Moving the hue of a gray hands back the
       same gray, and the engine makes a mid gray of a gray brand, so the page
       would change color with nothing chosen. */
    const sync = () => {
      if (!c.brand && isGray(el.value)) {
        return
      }
      c.setBrand(el.value)
    }
    el.addEventListener('input', sync)
    el.addEventListener('change', sync)
    return () => {
      el.removeEventListener('input', sync)
      el.removeEventListener('change', sync)
    }
  }, [c])

  /* The element owns its own value once mounted, so this only writes when the
     two have actually drifted: without the guard, echoing the value back on
     every render fights a reader mid-drag. */
  useEffect(() => {
    const el = picker.current
    if (el && el.value !== shown) {
      el.value = shown
    }
  }, [shown])

  return (
    /* The swatch says whether the picker is open, which the popover cannot say
       for a plain button: it reads it off the popover when `toggle` says it moved. */
    <helix-popover
      ontoggle={(event) => setOpen((event.currentTarget as HelixPopover).open)}
      placement="bottom-start"
    >
      <button
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-label={`Brand color, currently ${c.brand || 'ink'}`}
        className={styles.brandSwatch}
        slot="trigger"
        style={{ '--swatch': c.brand || 'var(--helix-color-foreground)' } as React.CSSProperties}
        type="button"
      />
      <helix-color-picker
        no-eyedropper
        no-format
        no-value
        ref={picker}
        swatches="#3b82f6, #0b6e4f, #c2410c, #7c3aed, #be123c, #0f766e"
        value={shown}
      ></helix-color-picker>
    </helix-popover>
  )
}
