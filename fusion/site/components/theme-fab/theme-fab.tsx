'use client'

import type { CSSProperties } from 'react'
import { useEffect, useRef, useState } from 'react'
import { BrandPicker } from '@/components/brand-picker/brand-picker'
import landing from '@/components/landing.module.css'
import { STORAGE_KEY } from '@/components/preferences/preferences'
import { useThemeControls } from '@/components/theme-context/theme-context'
import { forgetSiteTheme } from '@/utils/site-theme/site-theme'
import { BOUNDS } from '@/utils/theme-defaults/theme-defaults'

/**
 * A pill that says "Make it yours", and becomes the toolbar that does it.
 *
 * **The label is an invitation rather than an instruction.** Naming the feature
 * ("Theme this page") is correct and reads like a settings row. What the control
 * offers is the hero's own promise, one color in and the whole page follows, so
 * it borrows the hero's last three words. Three words is also the most a pill
 * can hold before it stops being a dot with a label and starts being a button.
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
    <div className={landing.fabRail} data-retired={nearFooter ? '' : undefined}>
      <div
        className={`${landing.fab} ${open ? landing.fabOpen : ''}`}
        data-open={open || undefined}
        ref={shell}
      >
        {/* The collapsed face. `inert` once open, so a closed control never
            takes a tab stop from the bar that replaced it. */}
        <button
          aria-expanded={open}
          className={landing.fabFace}
          inert={open || undefined}
          onClick={() => setOpen(true)}
          type="button"
        >
          <span className={landing.fabDot} style={{ '--swatch': c.brand } as CSSProperties} />
          Make it yours
        </button>

        <div className={landing.fabTools} inert={!open || undefined}>
          {/* **Rows, not a bar, once the pointer is a finger.** Every control
              here is named by a `helix-tooltip` and an `aria-label`, and a touch
              screen has neither a hover nor a screen reader in play, so without
              these labels a phone gets three unlabeled sliders and a row of
              dots. They are the same words the tooltips carry, shown rather
              than hovered. Each row is `display: contents` above the
              breakpoint, so the bar is unchanged there. */}
          <helix-flex
            align="center"
            class={landing.fabStack}
            data-density="sm"
            gap="md"
            wrap={false}
          >
            <div className={landing.fabRow}>
              <span className={landing.fabRowLabel}>Brand color</span>
              <BrandPicker />
            </div>

            <div className={landing.fabRow}>
              <span className={landing.fabRowLabel}>Saturation</span>
              <helix-tooltip
                class={landing.fabTip}
                content={`Saturation · ${c.chromaScale}`}
                placement="top"
              >
                <helix-slider
                  {...BOUNDS.chromaScale}
                  aria-label="Saturation"
                  class={landing.fabChannel}
                  name="chroma"
                  onInput={(event) => c.setChromaScale(Number(event.currentTarget.value))}
                  style={{ '--slider-track-image': c.derived?.ramps.saturation ?? '' }}
                  value={String(c.chromaScale)}
                ></helix-slider>
              </helix-tooltip>
            </div>

            <div className={landing.fabRow}>
              <span className={landing.fabRowLabel}>Corner radius</span>
              <helix-tooltip
                class={landing.fabTip}
                content={`Corner radius · ${c.radius}`}
                placement="top"
              >
                <helix-slider
                  {...BOUNDS.radius}
                  aria-label="Corner radius"
                  class={landing.fabChannel}
                  name="radius"
                  onInput={(event) => c.setRadius(Number(event.currentTarget.value))}
                  value={String(c.radius)}
                ></helix-slider>
              </helix-tooltip>
            </div>

            {/* **One button showing where it goes, not two showing where you
                are.** A two-option toggle group spends the width of both words
                on a choice with two states, in a bar that also has to hold
                three sliders and a picker. The icon is the mode it switches to
                and the tooltip says so, which is the pair that leaves no doubt
                about which way the control reads.

                **It writes the site preference, not just the scope.** Painting
                the scope and the attribute without persisting leaves the
                masthead's preferences panel showing the old answer and a reload
                taking the page back to it. Both go through `STORAGE_KEY`. */}
            <div className={landing.fabRow}>
              <span className={landing.fabRowLabel}>Color scheme</span>
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

            {/* **Beside the controls it undoes, not beside the close.** The
                divider below splits the inputs from what the engine made of
                them, and a reset is an input: it is the one that puts the other
                four back. Next to the close it would read as a second way out
                of the bar.

                **Disabled until there is something to reset**, which is what
                `touched` answers and `derived` cannot: the report is filled the
                moment the engine loads, whether or not a reader has painted
                anything with it. Enabled at rest, the control would claim the
                page is wearing a theme it is not.

                `forgetSiteTheme` rather than a handler of its own, because the
                preferences drawer's reset is the same act and the event it
                dispatches is what puts these controls back. Two paths to one
                reset is how one of them comes to leave half a palette on. */}
            <div className={landing.fabRow}>
              <span className={landing.fabRowLabel}>Reset</span>
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

            <div className={landing.fabDivider} />

            {/* **What the engine made of it, which is the point.** The controls
                on the left are the inputs; without this the bar is a color
                picker and the claim that every pair is measured is a sentence
                somewhere else on the page.

                **The readout says what the engine found and not what it is**, so
                both halves carry a tooltip that does.

                The swatches are the semantic roles derived from the brand, not
                a status indicator, which is the reading a row of colored dots
                invites. The verdict has three findings behind it and they are
                different measurements: `violations` is a foreground against the
                ground it is painted on, and `collisions` is two roles against
                each other, close enough that a reader cannot tell them apart.
                Neither substitutes for the other, and "roles too close" is the
                second one with no way to know that from the words.

                `helix-tooltip` rather than the native `title`. A `title` is the
                browser's own delayed box: it cannot be styled, it cannot be
                reached by touch, and it arrives late. */}
            <div className={`${landing.fabRow} ${landing.fabReadoutRow}`}>
              <span className={landing.fabRowLabel}>What the engine derived</span>
              <div className={landing.fabReadout}>
                <helix-tooltip
                  content="The roles the engine derived from your brand color."
                  placement="top"
                >
                  <div className={landing.fabSwatches}>
                    {(c.derived?.swatches ?? []).map((one) => (
                      <span
                        className={landing.fabSwatch}
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
                    className={landing.fabVerdict}
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

            {/* **The glyph is a child, not an attribute.** `name` on
                `IconButton` is the form field name it inherits from `button`,
                beside `type`, `value` and the `form*` pair. It is not the icon,
                and setting it to `x-mark` gives the control a form name and no
                content: an empty button the width of an icon, with no close in
                it.

                `x` rather than `x-mark`, which is not in the set either. */}
            <helix-icon-button
              class={landing.fabClose}
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
