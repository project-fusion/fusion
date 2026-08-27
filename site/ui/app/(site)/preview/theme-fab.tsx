'use client'

import type { CSSProperties } from 'react'
import { useEffect, useRef, useState } from 'react'
import { BOUNDS } from '../../(tool)/helix/theme/defaults'
import { BrandPicker } from './brand-picker'
import styles from './preview.module.css'
import { useThemeControls } from './theme-context'

/**
 * A pill that says "Theme this page", and becomes the toolbar that does it.
 *
 * **One element that changes size, not two that swap.** Both faces live in the
 * same grid cell and cross-fade while the container's width animates, so the
 * pill grows into the bar rather than being replaced by it. Swapping one node
 * for another would give a pop, and the point of the gesture is that the control
 * was always the same object.
 *
 * **Collapsed by default, and that is the argument.** A landing page's first
 * screen should be the page. A bar of five sliders across the bottom on arrival
 * says the demo is the product; a single pill says there is something here if
 * you want it, and gets out of the way if you do not.
 *
 * **Width is animatable and `auto` is not**, so both states carry an explicit
 * one. That is the cost of the effect: the open width is a number in the
 * stylesheet rather than the sum of what is inside it, and adding a sixth
 * control means changing it.
 */
export const ThemeFab = () => {
  const c = useThemeControls()
  const [open, setOpen] = useState(false)
  const shell = useRef<HTMLDivElement | null>(null)

  /* Escape closes it, and a press anywhere outside does too. A floating control
     with no way out but its own small button is a trap on a touch screen. */
  useEffect(() => {
    if (!open) {
      return
    }
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false)
      }
    }
    const onDown = (event: PointerEvent) => {
      if (shell.current && !shell.current.contains(event.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('keydown', onKey)
    document.addEventListener('pointerdown', onDown)
    return () => {
      document.removeEventListener('keydown', onKey)
      document.removeEventListener('pointerdown', onDown)
    }
  }, [open])

  return (
    <div className={styles.fabRail}>
      <div
        className={`${styles.fab} ${open ? styles.fabOpen : ''}`}
        data-open={open || undefined}
        ref={shell}
      >
        {/* The collapsed face. `inert` once open, so a closed control never
            takes a tab stop from the bar that replaced it. */}
        <button
          aria-expanded={open}
          className={styles.fabFace}
          inert={open || undefined}
          onClick={() => setOpen(true)}
          type="button"
        >
          <span className={styles.fabDot} style={{ '--swatch': c.brand } as CSSProperties} />
          Theme this page
        </button>

        <div className={styles.fabTools} inert={!open || undefined}>
          <helix-flex align="center" data-density="sm" gap="md" wrap={false}>
            <BrandPicker />

            <helix-tooltip
              class={styles.fabTip}
              content={`Saturation · ${c.chromaScale}`}
              placement="top"
            >
              <helix-slider
                {...BOUNDS.chromaScale}
                aria-label="Saturation"
                class={styles.fabChannel}
                name="chroma"
                onInput={(event) => c.setChromaScale(Number(event.currentTarget.value))}
                style={{ '--slider-track-image': c.derived?.ramps.saturation ?? '' }}
                value={String(c.chromaScale)}
              ></helix-slider>
            </helix-tooltip>

            <helix-tooltip
              class={styles.fabTip}
              content={`Accent angle · ${c.accentHue}`}
              placement="top"
            >
              <helix-slider
                {...BOUNDS.accentHue}
                aria-label="Accent angle"
                class={styles.fabChannel}
                name="accent"
                onInput={(event) => c.setAccentHue(Number(event.currentTarget.value))}
                style={{ '--slider-track-image': c.derived?.ramps.accent ?? '' }}
                value={String(c.accentHue)}
              ></helix-slider>
            </helix-tooltip>

            <helix-tooltip
              class={styles.fabTip}
              content={`Corner radius · ${c.radius}`}
              placement="top"
            >
              <helix-slider
                {...BOUNDS.radius}
                aria-label="Corner radius"
                class={styles.fabChannel}
                name="radius"
                onInput={(event) => c.setRadius(Number(event.currentTarget.value))}
                value={String(c.radius)}
              ></helix-slider>
            </helix-tooltip>

            <helix-toggle-group
              aria-label="Color scheme"
              onChange={(event) => {
                c.setScheme(
                  (event.currentTarget as HTMLElement & { value: string }).value as
                    | 'dark'
                    | 'light',
                )
              }}
              separation="outlined"
              value={c.scheme}
            >
              <helix-toggle value="light">Light</helix-toggle>
              <helix-toggle value="dark">Dark</helix-toggle>
            </helix-toggle-group>

            <div className={styles.fabDivider} />

            {/* **What the engine made of it, which is the point.** The controls
                on the left are the inputs; without this the bar is a color picker
                and the claim that every pair is measured is a sentence somewhere
                else on the page. The swatches are derived roles rather than the
                brand repeated, and the verdict is the engine's own count. */}
            <div className={styles.fabReadout}>
              <div className={styles.fabSwatches}>
                {(c.derived?.swatches ?? []).map((one) => (
                  <span
                    className={styles.fabSwatch}
                    key={one.name}
                    style={{ '--swatch': one.hex } as React.CSSProperties}
                    title={one.name}
                  />
                ))}
              </div>
              <span
                className={styles.fabVerdict}
                data-failing={c.derived && c.derived.violations.length > 0 ? '' : undefined}
              >
                {/* **A count is not asserted here, and that was a real bug.**
                    The first version printed "13 pairs pass", taken from how many
                    derived roles happened to carry a contrast reading. The
                    metrics page says 67. Two different numbers for one claim on
                    one site, and the smaller was invented by this component.
                    What the engine reports per derivation is its failures, so
                    that is what this shows. */}
                {/* Before the first touch nothing has been derived, and the
                    page is wearing the palette the stylesheet ships. Saying
                    "deriving" there would be a spinner for work that is not
                    happening and never will until somebody moves something. */}
                {c.derived
                  ? c.derived.violations.length > 0
                    ? `${c.derived.violations.length} pair${c.derived.violations.length === 1 ? '' : 's'} fail`
                    : c.derived.collisions.length > 0
                      ? 'roles too close'
                      : 'every pair clears'
                  : 'as shipped'}
              </span>
            </div>

            <helix-icon-button
              label="Close the theme controls"
              name="x-mark"
              onClick={() => setOpen(false)}
            ></helix-icon-button>
          </helix-flex>
        </div>
      </div>
    </div>
  )
}
