'use client'

import type { CSSProperties } from 'react'
import { BrandPicker } from '@/components/brand-picker/brand-picker'
import { STORAGE_KEY } from '@/components/preferences/preferences'
import { useThemeControls } from '@/components/theme-context/theme-context'
import { forgetSiteTheme } from '@/utils/site-theme/site-theme'
import { BOUNDS } from '@/utils/theme-defaults/theme-defaults'
import styles from './hero-theme.module.css'

/**
 * The hero's card that themes the page from one color: the brand, two
 * dials, the mode, and what the engine made of them.
 *
 * **In the hero, beside the claim it proves.** The heading says the system
 * does the checking; this is where a reader makes it check, on the first
 * screen. It was a pill fixed to the bottom of the viewport, which sat over a
 * section heading wherever the page stopped scrolling.
 */
export const HeroTheme = () => {
  const c = useThemeControls()
  const verdict = c.derived
    ? c.derived.violations.length > 0
      ? `${c.derived.violations.length} pair${c.derived.violations.length === 1 ? '' : 's'} fail`
      : c.derived.collisions.length > 0
        ? 'Roles too close'
        : 'Every pair clears'
    : 'As shipped'

  return (
    <div className={styles.card} data-material="glass" data-substrate>
      <helix-flex align-items="center" gap="sm" justify-content="between" wrap>
        <helix-text as="h2" class={styles.title} variant="title">
          Theme this page from one color
        </helix-text>
        {/* **Never a pass count.** The engine reports its failures per
            derivation, so that is what this says; a count of the roles that
            happen to carry a reading would disagree with the metrics page. */}
        <helix-tag
          emphasis="subtle"
          tone={c.derived && c.derived.violations.length > 0 ? 'danger' : 'primary'}
        >
          {verdict}
        </helix-tag>
      </helix-flex>

      <div className={styles.rows}>
        <div className={styles.row}>
          <span className={styles.label}>Brand color</span>
          <BrandPicker />
        </div>

        <div className={styles.row}>
          <span className={styles.label}>Saturation</span>
          <helix-slider
            {...BOUNDS.chromaScale}
            aria-label="Saturation"
            class={styles.slider}
            name="chroma"
            onInput={(event) => c.setChromaScale(Number(event.currentTarget.value))}
            style={{ '--slider-track-image': c.derived?.ramps.saturation ?? '' }}
            value={String(c.chromaScale)}
          ></helix-slider>
        </div>

        <div className={styles.row}>
          <span className={styles.label}>Corner radius</span>
          <helix-slider
            {...BOUNDS.radius}
            aria-label="Corner radius"
            class={styles.slider}
            name="radius"
            onInput={(event) => c.setRadius(Number(event.currentTarget.value))}
            value={String(c.radius)}
          ></helix-slider>
        </div>
      </div>

      {/* What the engine derived, which is the point: without it the card is a
          color picker, and the claim that every pair is measured is a sentence
          somewhere else on the page. */}
      <div className={styles.derived}>
        <span className={styles.label}>What the engine derived</span>
        <div className={styles.swatches}>
          {(c.derived?.swatches ?? []).map((one) => (
            <span
              aria-label={`${one.name} ${one.hex}`}
              className={styles.swatch}
              key={one.name}
              role="img"
              style={{ '--swatch': one.hex } as CSSProperties}
            />
          ))}
        </div>
        <helix-text as="p" emphasis="muted" variant="caption">
          {c.derived
            ? c.derived.violations.length > 0
              ? 'Some text pairs fall short of the contrast target for their size.'
              : 'Every text pair on this page clears its contrast target.'
            : 'Choose a color, and Helix computes every token on this page from it.'}
        </helix-text>
      </div>

      <helix-flex align-items="center" data-density="sm" gap="sm" wrap>
        <button
          className={styles.action}
          onClick={() => {
            const next = c.scheme === 'dark' ? 'light' : 'dark'
            c.setScheme(next)
            document.documentElement.dataset.colorMode = next
            window.localStorage.setItem(STORAGE_KEY, next)
          }}
          type="button"
        >
          <helix-icon name={c.scheme === 'dark' ? 'sun' : 'moon'}></helix-icon>
          {c.scheme === 'dark' ? 'Switch to light' : 'Switch to dark'}
        </button>
        <button
          className={styles.action}
          disabled={!c.touched}
          onClick={() => forgetSiteTheme()}
          type="button"
        >
          <helix-icon name="arrow-counter-clockwise"></helix-icon>
          Reset the palette
        </button>
      </helix-flex>
    </div>
  )
}
