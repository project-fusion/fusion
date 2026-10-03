'use client'

import { type ReactNode, type Ref, useEffect, useState } from 'react'
import type { SentTheme } from '@/utils/scope-theme/scope-theme'
import { type Mode, YOURS } from '@/utils/scope-theme/use-scope-theme'
import styles from './theme-try.module.css'

/**
 * Brands to try, picked to be far apart on the wheel rather than pretty
 * together, and a gray first: the hero with no brand in it at all, which is
 * the one a reader comparing the others needs to compare them against.
 */
const BRANDS = [
  { hex: '#71717a', name: 'Neutral' },
  { hex: '#0d9488', name: 'Teal' },
  { hex: '#7c3aed', name: 'Violet' },
  { hex: '#e4572e', name: 'Coral' },
  { hex: '#ca8a04', name: 'Amber' },
  { hex: '#db2777', name: 'Pink' },
] as const

/**
 * The site's own brand, as the browser settles it at the root, for the swatch
 * that goes back to it: read inside the hero it would be whichever brand was
 * chosen last, since the hero is the scope the choice is painted on.
 */
const siteBrand = (): string => {
  const probe = document.createElement('span')
  probe.style.color = 'var(--helix-color-primary)'
  document.body.append(probe)
  const color = getComputedStyle(probe).color
  probe.remove()
  return color
}

/**
 * The bar that customizes a hero: brand swatches and the mode, and whatever
 * else the hero adds after them, such as a control that pauses its motion.
 * The Maps and Graph heroes share it; each places it on its own drawing.
 */
export function ThemeTry({
  brand,
  children,
  className,
  label,
  mode,
  onBrand,
  onMode,
  ref,
  sent,
}: {
  brand: string | null
  children?: ReactNode
  className?: string
  /** The bar's name, which names what it customizes: "Customize the map". */
  label: string
  mode: Mode
  onBrand: (brand: string | null) => void
  onMode: (mode: Mode) => void
  ref?: Ref<HTMLFieldSetElement>
  sent?: SentTheme | undefined
}) {
  const [home, setHome] = useState('')
  useEffect(() => {
    setHome(siteBrand())
  }, [])
  return (
    <fieldset className={`${styles.tryBar} ${className ?? ''}`} ref={ref}>
      <legend className={styles.tryLabel}>{label}</legend>
      <div className={styles.tryControls}>
        <fieldset className={styles.tryControl}>
          <legend className={styles.tryLegend}>Brand</legend>
          <div className={styles.trySwatches}>
            {sent ? (
              <button
                aria-label="Your theme, from the theme builder"
                aria-pressed={brand === YOURS}
                className={styles.trySwatch}
                onClick={() => onBrand(YOURS)}
                style={{ '--swatch': sent.settings.brand } as React.CSSProperties}
                type="button"
              />
            ) : null}
            <button
              aria-label="Site brand"
              aria-pressed={brand === null}
              className={styles.trySwatch}
              onClick={() => onBrand(null)}
              style={{ '--swatch': home } as React.CSSProperties}
              type="button"
            />
            {BRANDS.map((one) => (
              <button
                aria-label={one.name}
                aria-pressed={brand === one.hex}
                className={styles.trySwatch}
                key={one.hex}
                onClick={() => onBrand(one.hex)}
                style={{ '--swatch': one.hex } as React.CSSProperties}
                type="button"
              />
            ))}
          </div>
        </fieldset>
        <div className={styles.tryControl}>
          <helix-toggle-group
            label="Mode"
            onChange={(event) => onMode(event.currentTarget.value as Mode)}
            value={mode}
          >
            <helix-toggle value="site">Site</helix-toggle>
            <helix-toggle value="light">Light</helix-toggle>
            <helix-toggle value="dark">Dark</helix-toggle>
          </helix-toggle-group>
        </div>
        {children ? <div className={styles.tryControl}>{children}</div> : null}
      </div>
    </fieldset>
  )
}
