'use client'

import type { CSSProperties } from 'react'
import { useEffect, useRef, useState } from 'react'
import { BrandPicker } from '@/components/brand-picker/brand-picker'
import { STORAGE_KEY } from '@/components/preferences/preferences'
import { useThemeControls } from '@/components/theme-context/theme-context'
import { forgetSiteTheme } from '@/utils/site-theme/site-theme'
import { BOUNDS } from '@/utils/theme-defaults/theme-defaults'
import styles from './theme-fab.module.css'

/**
 * A pill that says "Make it yours", and becomes the toolbar that does it.
 */
export const ThemeFab = () => {
  const c = useThemeControls()
  const [open, setOpen] = useState(false)
  const [nearFooter, setNearFooter] = useState(false)
  const shell = useRef<HTMLDivElement | null>(null)

  /* **Retires as the footer arrives, rather than sitting over it.**
   *
   * The pill is fixed to the bottom of the viewport, so at the end of the page
   * it comes to rest on top of the footer: a floating control over a region
   * that is not a page any more, covering links it has nothing to do with.
   *
   * Watched rather than measured against a scroll offset, because the offset
   * that matters is "the footer is here" and only the footer knows where that
   * is. A number would be a second answer to that question and would be wrong
   * the first time the footer's height changed.
   *
   * `rootMargin` lifts the trigger a little above the fold so the pill is gone
   * before the two would touch rather than as they meet. It closes on the way
   * out too: an open toolbar fading is a set of controls a reader can no longer
   * reach but can still see.
   */
  useEffect(() => {
    const footer = document.querySelector('[data-site-footer]')
    if (!footer) {
      return
    }
    const watch = new IntersectionObserver(
      ([entry]) => {
        if (!entry) {
          return
        }
        setNearFooter(entry.isIntersecting)
        if (entry.isIntersecting) {
          setOpen(false)
        }
      },
      { rootMargin: '0px 0px -8% 0px' },
    )
    watch.observe(footer)
    return () => watch.disconnect()
  }, [])

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
    <div
      className={styles.fabRail}
      data-open={open || undefined}
      data-retired={nearFooter ? '' : undefined}
    >
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
          Make it yours
        </button>

        <div className={styles.fabTools} inert={!open || undefined}>
          {/* **Rows, not a bar, once the pointer is a finger.** Every control
              here is named by a `helix-tooltip` and an `aria-label`, and a touch
              screen has neither a hover nor a screen reader in play, so without
              these labels a phone gets three unlabeled sliders and a row of
              dots. They are the same words the tooltips carry, shown rather
              than hovered. Each row is `display: contents` above the
              breakpoint, so the bar is unchanged there. */}
          <helix-flex
            align-items="center"
            class={styles.fabStack}
            data-density="sm"
            gap="md"
            wrap={false}
          >
            <div className={styles.fabRow}>
              <span className={styles.fabRowLabel}>Brand color</span>
              <BrandPicker />
            </div>

            <div className={styles.fabRow}>
              <span className={styles.fabRowLabel}>Saturation</span>
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
            </div>

            <div className={styles.fabRow}>
              <span className={styles.fabRowLabel}>Corner radius</span>
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
            </div>

            {/*
             * *One button showing where it goes, not two showing where you
             *                 are.** A two-option toggle group spends the width of both words
             *                 on a choice with two states, in a bar that also has to hold
             *                 three sliders and a picker. The icon is the mode it switches to
             *                 and the tooltip says so, which is the pair that leaves no doubt
             *                 about which way the control reads.
             */}
            <div className={styles.fabRow}>
              <span className={styles.fabRowLabel}>Color scheme</span>
              <helix-tooltip
                content={c.scheme === 'dark' ? 'Switch to light' : 'Switch to dark'}
                placement="top"
              >
                <helix-icon-button
                  emphasis="ghost"
                  label={c.scheme === 'dark' ? 'Switch to light' : 'Switch to dark'}
                  onClick={() => {
                    const next = c.scheme === 'dark' ? 'light' : 'dark'
                    c.setScheme(next)
                    document.documentElement.dataset.colorMode = next
                    window.localStorage.setItem(STORAGE_KEY, next)
                  }}
                >
                  <helix-icon name={c.scheme === 'dark' ? 'sun' : 'moon'}></helix-icon>
                </helix-icon-button>
              </helix-tooltip>
            </div>

            {/*
             * *Beside the controls it undoes, not beside the close.** The
             *                 divider below splits the inputs from what the engine made of
             *                 them, and a reset is an input: it is the one that puts the other
             *                 four back. Next to the close it would read as a second way out
             *                 of the bar.
             */}
            <div className={styles.fabRow}>
              <span className={styles.fabRowLabel}>Reset</span>
              <helix-tooltip content="Back to the shipped palette" placement="top">
                <helix-icon-button
                  disabled={!c.touched || undefined}
                  emphasis="ghost"
                  label="Reset to the shipped palette"
                  onClick={() => forgetSiteTheme()}
                >
                  <helix-icon name="arrow-counter-clockwise"></helix-icon>
                </helix-icon-button>
              </helix-tooltip>
            </div>

            <div className={styles.fabDivider} />

            {/*
             * *What the engine made of it, which is the point.** The controls
             *                 on the left are the inputs; without this the bar is a color
             *                 picker and the claim that every pair is measured is a sentence
             *                 somewhere else on the page.
             */}
            <div className={styles.fabRow}>
              <span className={styles.fabRowLabel}>What the engine derived</span>
              <div className={styles.fabReadout}>
                <helix-tooltip
                  content="The roles the engine derived from your brand color."
                  placement="top"
                >
                  <div className={styles.fabSwatches}>
                    {(c.derived?.swatches ?? []).map((one) => (
                      <span
                        className={styles.fabSwatch}
                        key={one.name}
                        style={{ '--swatch': one.hex } as React.CSSProperties}
                      />
                    ))}
                  </div>
                </helix-tooltip>
                <helix-tooltip
                  content={
                    c.derived
                      ? c.derived.violations.length > 0
                        ? 'Pairs whose contrast falls short of the target for their size.'
                        : c.derived.collisions.length > 0
                          ? 'Two roles landed close enough that they cannot be told apart. Measured as perceptual distance, not contrast.'
                          : 'Every foreground clears the contrast target for the ground it sits on.'
                      : 'Nothing derived yet. The page is wearing the palette the stylesheet ships.'
                  }
                  placement="top"
                >
                  <span
                    className={styles.fabVerdict}
                    data-failing={c.derived && c.derived.violations.length > 0 ? '' : undefined}
                  >
                    {/* **Never assert a pass count here.** Counting the derived
                    roles that happen to carry a contrast reading gives "13 pairs
                    pass" while the metrics page says 67: two numbers for one
                    claim on one site, and the smaller one invented by this
                    component. What the engine reports per derivation is its
                    failures, so that is what this shows. */}
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
                </helix-tooltip>
              </div>
            </div>

            {/*
             * *The glyph is a child, not an attribute.** `name` on
             *                 `IconButton` is the form field name it inherits from `button`,
             *                 beside `type`, `value` and the `form*` pair. It is not the icon,
             *                 and setting it to `x-mark` gives the control a form name and no
             *                 content: an empty button the width of an icon, with no close in
             *                 it.
             */}
            <helix-icon-button
              class={styles.fabClose}
              emphasis="ghost"
              label="Close the theme controls"
              onClick={() => setOpen(false)}
            >
              <helix-icon name="x"></helix-icon>
            </helix-icon-button>
          </helix-flex>
        </div>
      </div>
    </div>
  )
}
