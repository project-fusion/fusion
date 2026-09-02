'use client'

import type { HelixColorPicker } from '@fusion.dev/helix'
import { useEffect, useRef } from 'react'
import { useThemeControls } from '@/components/theme-context/theme-context'
import styles from './brand-picker.module.css'

/**
 * The brand control, as a swatch that opens the picker.
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
