'use client'

import type { HelixColorPicker } from '@fusion.dev/helix'
import { useEffect, useRef } from 'react'
import styles from './landing-c.module.css'
import { useThemeControls } from './theme-context'

/**
 * The brand control, as a swatch that opens the picker.
 *
 * **The short form of `helix-color-picker`, not `helix-color-input`.** The input
 * is a hex field with a swatch beside it, which asks a reader to know what a hex
 * code is before they can change anything. The picker is a square and two ramps,
 * so a color is chosen by looking at colors. `no-value`, `no-format` and
 * `no-eyedropper` take off the text field, the format switcher and the screen
 * sampler, leaving the part that does the job.
 *
 * **The listener is attached to the element, not passed as `onChange`.** The
 * picker sits inside a popover, and a popover that promotes its content to the
 * top layer moves it out of the position React delegates events from: the
 * handler is registered at the React root and the event never travels through
 * it, so the color changed on screen and nothing above it heard. The sliders
 * kept working throughout because they are direct children and never left the
 * tree. A direct listener does not care where the node ends up.
 *
 * Both `input` and `change` are taken. `input` is what fires while a reader
 * drags around the square, which is the difference between the page following
 * the pointer and the page waiting for them to let go.
 */
export const BrandPicker = () => {
  const c = useThemeControls()
  const picker = useRef<HelixColorPicker | null>(null)

  useEffect(() => {
    const el = picker.current
    if (!el) {
      return
    }
    const sync = () => c.setBrand(el.value)
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
    if (el && el.value !== c.brand) {
      el.value = c.brand
    }
  }, [c.brand])

  return (
    <helix-popover placement="bottom-start">
      <button
        aria-label={`Brand color, currently ${c.brand}`}
        className={styles.brandSwatch}
        slot="trigger"
        style={{ '--swatch': c.brand } as React.CSSProperties}
        type="button"
      />
      <helix-color-picker
        no-eyedropper
        no-format
        no-value
        ref={picker}
        swatches="#3b82f6 #0b6e4f #c2410c #7c3aed #be123c #0f766e"
        value={c.brand}
      ></helix-color-picker>
    </helix-popover>
  )
}
