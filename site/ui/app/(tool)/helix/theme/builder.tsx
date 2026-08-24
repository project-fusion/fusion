'use client'

import type { HelixSandboxPreview } from '@helix-io/styled'
import { type DerivedTheme, initTheme, type ThemeEngine } from '@helix-io/theme'
import { useEffect, useMemo, useRef, useState } from 'react'
import { PreferencesDrawer } from '@/components/preferences/preferences'
import { type Findable, SiteFind } from '@/components/site-find/site-find'
import { Wordmark } from '@/components/wordmark/wordmark'
import { useSandboxEditor } from '../../../../hooks/use-sandbox-editor/use-sandbox-editor'
import { THEME_ENGINE } from '../../../../utils/theme-engine/theme-engine'
import {
  type Character,
  INITIAL,
  intentFrom,
  type Mechanism,
  SCOPE,
  type Settings,
} from './defaults'
import { THEMED_PAGE_STYLES } from './themed-page-styles'
import './theme.css'
import styles from '../workbench.module.css'

/**
 * What share of the stage the preview starts with.
 *
 * **`split` follows the lead pane, not the source pane**, which is worth
 * knowing because the manifest says otherwise: its description reads
 * "percentage of the sandbox given to the source pane", and measured with
 * `lead="preview"` a split of 32 gave the *preview* 32 per cent. The area
 * rules have it right, that `split` means the same thing in both directions.
 *
 * The artifact is a column of custom properties whose longest line is a token
 * name and a hex, so it wants a third and the preview wants the rest.
 */
const PREVIEW_SHARE = 68

/**
 * The faces on offer, fetched rather than vendored.
 *
 * **A preview is not a deployment, which is what makes this fine here.** The
 * Sovereignty Constraint is about what a Fusion product does to a consumer's
 * page: `site/ui/app/fonts.css` vendors the site's own three faces precisely so
 * the wordmark does not sit behind someone else's uptime. Nothing here ships to
 * anybody. A reader is trying faces on, and trying one on means fetching it.
 *
 * **What is emitted stays free of it.** The artifact names the family and
 * nothing more, because a consumer pasting the block into their own stylesheet
 * should not thereby acquire a dependency on a host they did not pick. The
 * block says which faces it assumes and leaves the loading to them.
 *
 * `family` is what CSS is given; `google` is the request, with the weights the
 * token layer actually uses. The empty value is the stylesheet's own stack.
 */
interface Face {
  family: string
  google?: string
  label: string
}

const SYSTEM: Face = { family: '', label: 'System default' }

const FACES: Face[] = [
  SYSTEM,
  { family: 'Inter', google: 'Inter:wght@400;500;600', label: 'Inter' },
  { family: 'DM Sans', google: 'DM+Sans:wght@400;500;700', label: 'DM Sans' },
  { family: 'Work Sans', google: 'Work+Sans:wght@400;500;600', label: 'Work Sans' },
  { family: 'Fraunces', google: 'Fraunces:wght@400;500;600', label: 'Fraunces' },
  { family: 'Playfair Display', google: 'Playfair+Display:wght@400;500;600', label: 'Playfair' },
  { family: 'Source Serif 4', google: 'Source+Serif+4:wght@400;500;600', label: 'Source Serif' },
]

/**
 * The same faces, with a different word for choosing none.
 *
 * `--helix-font-display` is emitted as `display ?? body`, so leaving this alone
 * does not fall back to the system, it follows whatever the body face is: pick
 * Fraunces for the body and the headings are Fraunces too. Sharing `FACES` here
 * meant the resting option read `System default`, which is true only while the
 * body face is also unset and wrong the moment it is not. `Same as body` is
 * true in both cases, the body face being the system default when nobody has
 * chosen one.
 */
const DISPLAY_FACES: Face[] = [
  { family: '', label: 'Same as body' },
  ...FACES.filter((face) => face.family !== ''),
]

const MONO_FACES: Face[] = [
  { family: '', label: 'System mono' },
  { family: 'JetBrains Mono', google: 'JetBrains+Mono:wght@400;500', label: 'JetBrains Mono' },
  { family: 'IBM Plex Mono', google: 'IBM+Plex+Mono:wght@400;500', label: 'IBM Plex Mono' },
  { family: 'Space Mono', google: 'Space+Mono:wght@400;700', label: 'Space Mono' },
]

export function ThemeBuilder({
  findable,
  initialTheme,
  pageMarkup,
}: {
  findable: Findable[]
  /**
   * The default theme, derived on the server.
   *
   * **This is what the engine being synchronous used to buy for free.** It ran
   * during server rendering without anybody arranging it, so the first paint
   * carried a real palette: the slider ramps, which are drawn off the *derived*
   * primary rather than the brand, and the emitted block, and the counts. The
   * engine is WebAssembly now and instantiates asynchronously, and measured
   * without this the ramps appeared 287ms after navigation, of which 26ms was
   * the module transfer and the rest was hydration.
   */
  initialTheme: DerivedTheme
  /**
   * The preview's page, already a string.
   *
   * Rendered by the server component above, for the reason written out there:
   * taking it back out of the DOM with `innerHTML` loses every value React set
   * as a property rather than as an attribute, which on a client navigation is
   * all of them.
   */
  pageMarkup: string
}) {
  useSandboxEditor()

  const [prefsOpen, setPrefsOpen] = useState(false)
  const [brand, setBrand] = useState(INITIAL.brand)
  const [scheme, setScheme] = useState(INITIAL.scheme)
  const [contrastTarget, setContrastTarget] = useState(INITIAL.contrastTarget)
  const [chromaScale, setChromaScale] = useState(INITIAL.chromaScale)
  const [accentHue, setAccentHue] = useState(INITIAL.accentHue)
  const [density, setDensity] = useState(INITIAL.density)
  const [radius, setRadius] = useState(INITIAL.radius)
  const [allowance, setAllowance] = useState(INITIAL.allowance)
  const [harmony, setHarmony] = useState(INITIAL.harmony)
  const [split, setSplit] = useState(PREVIEW_SHARE)
  const [bodyFace, setBodyFace] = useState(INITIAL.bodyFace)
  const [displayFace, setDisplayFace] = useState(INITIAL.displayFace)
  const [monoFace, setMonoFace] = useState(INITIAL.monoFace)
  const [motion, setMotion] = useState(INITIAL.motion)
  const [textBase, setTextBase] = useState(INITIAL.textBase)
  const [textScale, setTextScale] = useState(INITIAL.textScale)
  const [surface, setSurface] = useState(INITIAL.surface)
  const [floating, setFloating] = useState(INITIAL.floating)
  /* The shipped policy, so the sliders start where the stylesheet already is and
     moving one is a departure a reader can see rather than a jump. */
  const [blur, setBlur] = useState(INITIAL.blur)
  const [translucency, setTranslucency] = useState(INITIAL.translucency)

  /* **Every reader-movable value in one object**, which is what the three uses
     below share. It was stated three times, as state initialisers, as the
     `pristine` comparison and again in `reset`, and a default changed in two of
     the three is a builder whose reset goes somewhere the reader never was. */
  const settings: Settings = useMemo(
    () => ({
      accentHue,
      allowance,
      blur,
      bodyFace,
      brand,
      chromaScale,
      contrastTarget,
      density,
      displayFace,
      floating,
      harmony,
      monoFace,
      motion,
      radius,
      scheme,
      surface,
      textBase,
      textScale,
      translucency,
    }),
    [
      accentHue,
      allowance,
      blur,
      bodyFace,
      brand,
      chromaScale,
      contrastTarget,
      density,
      displayFace,
      floating,
      harmony,
      monoFace,
      motion,
      radius,
      scheme,
      surface,
      textBase,
      textScale,
      translucency,
    ],
  )

  /* Compared against the values the engine and the stylesheet ship with, so
     "pristine" means the reader has changed nothing rather than that they have
     returned to some arrangement this file prefers.

     `split` is deliberately not in it: where a reader dragged the divider is not
     part of the theme, and resetting the palette should not move their panes. */
  const pristine = (Object.keys(INITIAL) as Array<keyof Settings>).every(
    (key) => settings[key] === INITIAL[key],
  )

  const reset = (): void => {
    setAccentHue(INITIAL.accentHue)
    setAllowance(INITIAL.allowance)
    setBlur(INITIAL.blur)
    setBodyFace(INITIAL.bodyFace)
    setBrand(INITIAL.brand)
    setChromaScale(INITIAL.chromaScale)
    setContrastTarget(INITIAL.contrastTarget)
    setDensity(INITIAL.density)
    setDisplayFace(INITIAL.displayFace)
    setFloating(INITIAL.floating)
    setHarmony(INITIAL.harmony)
    setMonoFace(INITIAL.monoFace)
    setMotion(INITIAL.motion)
    setRadius(INITIAL.radius)
    setScheme(INITIAL.scheme)
    setSurface(INITIAL.surface)
    setTextBase(INITIAL.textBase)
    setTextScale(INITIAL.textScale)
    setTranslucency(INITIAL.translucency)
  }

  /* Built from the settings above rather than inline, so the server and the
     browser cannot describe the same starting theme differently: the page
     derives `intentFrom(INITIAL)` before it renders, and this derives
     `intentFrom(settings)` from whatever the reader has moved since. */
  /* Built from the settings above rather than inline, so the server and the
     browser cannot describe the same starting theme differently: the page
     derives `intentFrom(INITIAL)` before it renders, and this derives
     `intentFrom(settings)` from whatever the reader has moved since.

     `settings` is memoised for this: a fresh object every render would make this
     memo miss every time, and a derivation is the expensive thing on this page. */
  const intent = useMemo(() => intentFrom(settings), [settings])

  /* **The engine is loaded once and held**, because every keystroke derives
     against it. `initTheme` caches its own promise, so the effect running twice
     under Strict Mode costs one instantiation. */
  const [engine, setEngine] = useState<ThemeEngine>()
  useEffect(() => {
    let live = true
    void initTheme(THEME_ENGINE).then((loaded) => {
      if (live) {
        setEngine(loaded)
      }
    })
    return () => {
      live = false
    }
  }, [])

  /* Derived on every change, which is affordable because it is a few hundred
     lines of color math rather than a request. `violations` is the whole
     product, so it has to be as live as the swatches are.

     **Both selectors in one call**, because deriving is the expensive half and
     rendering is not: asking for the block twice would derive twice for one
     keystroke. Measured at 17ms per derivation against the 39ms the TypeScript
     engine took for one, so this page does less work than it used to. */
  const theme = useMemo(
    () => engine?.derive(intent, [SCOPE, ':root']) ?? initialTheme,
    [engine, initialTheme, intent],
  )

  /* **The ramps are inline, because a stylesheet cannot know the brand.** Both
     are written in OKLCH off the derived primary so the track and the palette
     agree: a saturation ramp drawn in sRGB would promise a color the engine
     never produces.

     **Set on each slider rather than on the section for a stylesheet to route,**
     which is a bug fix rather than a tidy. The two rules that did the routing
     were `.themeChannel[label="Saturation"]` and `[label="Accent angle"]`, and a
     `label` attribute is only there when a *server* wrote it: on a client-side
     navigation React creates the element and assigns `label` as a property,
     which Lit does not reflect, so the attribute never exists and the selector
     matches nothing. Measured on the running site, soft navigation against
     reload: ten sliders, every label reading empty on the first and every one
     present on the second, with the ramps following exactly.

     A `style` prop has no such split. React applies it through `node.style` on
     both paths, and the DOM writes the attribute itself.

     Selecting on a component's *label text* was fragile on top of that: renaming
     a control in the markup would have silently unstyled it, with nothing to
     catch that either. */
  const ramps = useMemo(() => {
    const primary = theme.tokens.find((token) => token.name === 'color-primary')?.value
    if (!primary) {
      return { accent: undefined, saturation: undefined }
    }
    const { chroma, hue, lightness } = primary
    const wheel = Array.from(
      { length: 13 },
      (_, step) => `oklch(${lightness} ${chroma} ${(hue + step * 30) % 360})`,
    ).join(', ')

    return {
      accent: `linear-gradient(to right, ${wheel})`,
      saturation: `linear-gradient(to right, oklch(${lightness} 0 ${hue}), oklch(${lightness} ${chroma} ${hue}))`,
    }
  }, [theme])
  const preview = useRef<HelixSandboxPreview>(null)

  const css = theme.css[SCOPE] ?? ''

  /* **The artifact keeps its scope and the frame gets `:root`.** What the editor
     shows is what a consumer pastes, which wants a named scope so it can sit
     beside their own; what the frame renders is a whole document with one theme
     in it, where a scope nothing carries would style nothing at all. Same theme,
     derived once, written twice. */
  const framed = theme.css[':root'] ?? ''

  /* **Only the faces actually chosen, and only while they are chosen.**
     Requesting the whole list up front would fetch five faces to show one.

     `display=swap`, so a face that has not landed shows the fallback rather
     than nothing: a preview whose text disappears while a font downloads is
     worse than one that reflows.

     A value rather than an effect, because two documents need it now: this one
     appends a `<link>`, and the frame is sent the same URL as an `@import` at
     the head of its stylesheet. */
  const fontsHref = useMemo(() => {
    const wanted = [bodyFace, displayFace, monoFace]
      .map((family) => [...FACES, ...MONO_FACES].find((face) => face.family === family)?.google)
      .filter((request): request is string => Boolean(request))

    if (wanted.length === 0) {
      return ''
    }

    return `https://fonts.googleapis.com/css2?${[...new Set(wanted)]
      .map((request) => `family=${request}`)
      .join('&')}&display=swap`
  }, [bodyFace, displayFace, monoFace])

  useEffect(() => {
    if (!preview.current) {
      return
    }
    preview.current.source = pageMarkup
    /* **The palette, the layout and the faces, because the frame has none of
       them.** A sandboxed document cannot fetch the site's stylesheet, so the
       page's own rules travel with its markup the way the theme does. The theme
       goes second: both are written for `:root` and only one of them changes as
       the reader drags a slider.

       **The face is a third document the frame cannot reach.** `build-frame.mjs`
       inlines the three Fusion faces as data URIs precisely because `@font-face`
       fetches in CORS mode and an opaque origin cannot ask the site for a file;
       Google serves its own with `Access-Control-Allow-Origin`, so those are
       reachable and only the request was missing. It went into this document's
       head and nowhere else, so choosing Inter renamed the family in the
       artifact while the preview went on drawing the fallback.

       `@import` rather than a `<link>`, because `styles` is a channel that
       already exists and adding a second one would mean a new field on the
       render message, a new branch in the frame, and a shipped component
       changed to carry the theme tool's fonts. It has to lead the stylesheet:
       an `@import` after any rule is dropped. */
    preview.current.styles = [
      fontsHref ? `@import url("${fontsHref}");` : '',
      THEMED_PAGE_STYLES,
      framed,
    ].join('\n')
  }, [fontsHref, framed, pageMarkup])

  /* **Lightness only, and in whichever direction reaches the target.** The
     solver moves one component: a brand keeps its hue and its chroma and gives
     up its lightness. Which way it gives it up depends on where the brand
     started, and the first version of this said "Darkened" unconditionally,
     which was a lie for every brand that began too dark: `#2e394a` comes back
     *lighter* and the label still claimed it had been darkened.

     Comparing hexes would report a move on a rounding difference, so the
     comparison is on lightness and the threshold is what a reader could see. */
  const derived = theme.tokens.find((token) => token.name === 'color-primary')
  const derivedPrimary = derived?.hex ?? brand
  const shift = (derived?.value.lightness ?? 0) - (engine?.hexToOklch(brand).lightness ?? 0)
  const moved = Math.abs(shift) > 0.06

  /* **Injected rather than applied per property.** A `<style>` carrying the
     emitted block is the same code path as a consumer pasting it into their
     own stylesheet, so the preview cannot drift from the artifact. */
  useEffect(() => {
    const tag = document.createElement('style')
    tag.textContent = css
    document.head.append(tag)
    return () => tag.remove()
  }, [css])

  /* **This document's copy.** The effect owns exactly one tag and takes it away
     again, so changing a face replaces the link rather than accumulating one per
     selection for the length of the session. The frame gets the same request
     through `styles`, because it cannot see this one. */
  useEffect(() => {
    if (!fontsHref) {
      return
    }
    const link = document.createElement('link')
    link.rel = 'stylesheet'
    link.href = fontsHref
    document.head.append(link)
    return () => link.remove()
  }, [fontsHref])

  const counts = theme.pairings.reduce<Record<string, number>>((all, pair) => {
    all[pair.status] = (all[pair.status] ?? 0) + 1
    return all
  }, {})
  const failures = theme.pairings.filter((pair) => pair.status === 'fail')
  const unmeasured = theme.pairings.filter((pair) => pair.status === 'unverifiable')

  return (
    <>
      {/* The sandbox's header, not one shaped like it. Same component, same
          class, so the height, the density and the full bleed come from one
          place: two tools under the same roof that differ in their chrome are
          two tools a reader has to learn twice. */}
      <helix-app-header class={styles.workbenchHeader}>
        <a data-link="quiet" href="/" slot="start">
          <Wordmark />
        </a>
        <helix-flex align="center" gap="2xs" slot="end">
          <SiteFind findable={findable} />
          <helix-tooltip content="Preferences" placement="bottom">
            <helix-icon-button label="Preferences" onClick={() => setPrefsOpen(true)}>
              <helix-icon name="gear"></helix-icon>
            </helix-icon-button>
          </helix-tooltip>
        </helix-flex>
      </helix-app-header>

      <PreferencesDrawer onOpenChange={setPrefsOpen} open={prefsOpen} />

      {/* A splitter for the form, and `helix-sandbox` for everything else.

          **The same component the workbench uses**, rather than a grid shaped
          like it. It already owns the two-pane split, the collapsible bottom
          panel, the toolbar row and the separators a keyboard can move, and all
          of that was going to be rebuilt here badly. What it does not carry is
          file tabs, because a theme has one artifact and not four. */}
      <helix-splitter className={styles.workbenchBody} default-position={24}>
        <section className="themeControls" slot="start">
          <helix-flex direction="column" gap="lg">
            <helix-flex direction="column" gap="xs">
              <helix-flex align="center" gap="sm" justify="between">
                <helix-text as="h1" variant="subheading">
                  Theme builder
                </helix-text>
                <helix-tooltip content="Back to the shipped values" placement="bottom">
                  <helix-icon-button disabled={pristine || undefined} label="Reset" onClick={reset}>
                    <helix-icon name="arrow-counter-clockwise"></helix-icon>
                  </helix-icon-button>
                </helix-tooltip>
              </helix-flex>
              <helix-text variant="caption">
                Describe a brand. Every pair the palette produces is measured against the ground it
                lands on.
              </helix-text>
            </helix-flex>

            <helix-color-input
              label="Brand"
              name="brand"
              onhelix-change={(event) => setBrand(event.detail.value)}
              value={brand}
            ></helix-color-input>

            {/* **What the brand became, and why, because the gap surprises
                everybody once.** Pick a bright yellow at AAA and the button
                comes out olive: the hue and the chroma are kept and only the
                lightness moves, because a fill that light cannot carry legible
                text and cannot clear a near-white page at the same time.

                Shown only when it actually moved, and only by enough to notice.
                A swatch that always says "and here is the same color again" is
                a row of chrome nobody reads. */}
            {/* **Not a callout.** A callout is an interruption with a severity
                and an icon, and this is neither: it is a caption under the
                field it is about, saying what happened to the value that was
                just typed. As a callout it read as a warning about a normal
                thing, and its icon and inset crowded a quarter-width pane until
                the sentence wrapped four times.

                So: the two swatches on their own line, at a size worth looking
                at, and the reason under them. */}
            {moved ? (
              <div className="themeShift" key={shift > 0 ? 'up' : 'down'}>
                <div className="themeShiftPair">
                  <span className="themeSwatch" style={{ background: brand }} />
                  <span className="themeShiftArrow" />
                  <span className="themeSwatch" style={{ background: derivedPrimary }} />
                </div>
                <helix-text variant="caption">
                  {shift > 0 ? 'Lightened' : 'Darkened'} to clear {contrastTarget}:1. Hue and chroma
                  are kept.
                </helix-text>
              </div>
            ) : null}

            <helix-select
              label="Color scheme"
              name="scheme"
              onhelix-change={(event) => setScheme(event.detail.value as 'dark' | 'light')}
              value={scheme}
            >
              <helix-icon name="caret-down" slot="indicator"></helix-icon>
              <helix-option value="light">Light</helix-option>
              <helix-option value="dark">Dark</helix-option>
            </helix-select>

            <helix-select
              label="Contrast target"
              name="contrast"
              onhelix-change={(event) => setContrastTarget(Number(event.detail.value))}
              value={String(contrastTarget)}
            >
              <helix-icon name="caret-down" slot="indicator"></helix-icon>
              {/* **3:1 is a real target, not a lesser one.** WCAG 1.4.11 asks it
                  of a graphic or a control's own boundary, and 1.4.3 asks it of
                  large text, which is 24px or 18.66px bold. A theme built for a
                  display face answers to it, and holding such a theme to 4.5
                  darkens every brand for text that is never set that small. */}
              <helix-option value="3">3, AA for large text and controls</helix-option>
              <helix-option value="4.5">4.5, AA</helix-option>
              <helix-option value="7">7, AAA</helix-option>
            </helix-select>

            {/* **Painted through `--slider-track-image`, the hook Slider already
                publishes for exactly this.** `ColorPicker` paints its own hue
                and alpha channels the same way and is itself built out of
                `helix-slider`, so a color channel is a slider with a ramp on it
                rather than a component of its own: it adds no behavior, no
                state and no API, which is the test for whether something earns
                an element.

                The ramp is the value it chooses. Saturation runs from gray to
                the brand at full chroma, both ends at the brand's own lightness
                and hue, so the track shows what the slider will produce. */}
            <helix-slider
              className="themeChannel"
              label="Saturation"
              max={100}
              min={0}
              name="chroma"
              onhelix-input={(event) => setChromaScale(Number(event.detail.value))}
              show-value
              step={5}
              style={{ '--slider-track-image': ramps.saturation ?? '' }}
              value={String(chromaScale)}
            ></helix-slider>

            {/* The whole wheel, starting at the brand, so a reader is choosing
                a direction off their own color and not an abstract number. */}
            <helix-slider
              className="themeChannel"
              label="Accent angle"
              max={360}
              min={0}
              name="accent"
              onhelix-input={(event) => setAccentHue(Number(event.detail.value))}
              show-value
              step={15}
              style={{ '--slider-track-image': ramps.accent ?? '' }}
              value={String(accentHue)}
            ></helix-slider>

            <helix-slider
              label="Density"
              max={120}
              min={80}
              name="density"
              onhelix-input={(event) => setDensity(Number(event.detail.value))}
              show-value
              step={5}
              value={String(density)}
            ></helix-slider>

            <helix-slider
              label="Corner radius"
              max={150}
              min={0}
              name="radius"
              onhelix-input={(event) => setRadius(Number(event.detail.value))}
              show-value
              step={10}
              value={String(radius)}
            ></helix-slider>

            {/* **Type is part of a theme.** Families are the half a consumer
                chooses; the size scale, the weights, the leading and the
                tracking are a system rather than a choice and are still fixed,
                which is the honest state of it. */}
            {/* **The placeholder names the resting state, it does not invite a
                choice.** Select shows the chosen options' words or its
                placeholder, and an option whose value is the empty string
                contributes no word, so all three of these read `Choose` while
                sitting on a real, named answer. The option stays in each list so
                there is a way back to it, and both states now read alike. */}
            <helix-select
              label="Body face"
              name="body-face"
              onhelix-change={(event) => setBodyFace(event.detail.value)}
              placeholder="System default"
              value={bodyFace}
            >
              <helix-icon name="caret-down" slot="indicator"></helix-icon>
              {FACES.map((face) => (
                <helix-option key={face.label} value={face.family}>
                  {face.label}
                </helix-option>
              ))}
            </helix-select>

            <helix-select
              hint="Headings. Follows the body face where it is left alone."
              label="Display face"
              name="display-face"
              onhelix-change={(event) => setDisplayFace(event.detail.value)}
              placeholder="Same as body"
              value={displayFace}
            >
              <helix-icon name="caret-down" slot="indicator"></helix-icon>
              {DISPLAY_FACES.map((face) => (
                <helix-option key={face.label} value={face.family}>
                  {face.label}
                </helix-option>
              ))}
            </helix-select>

            <helix-select
              label="Mono face"
              name="mono-face"
              onhelix-change={(event) => setMonoFace(event.detail.value)}
              placeholder="System mono"
              value={monoFace}
            >
              <helix-icon name="caret-down" slot="indicator"></helix-icon>
              {MONO_FACES.map((face) => (
                <helix-option key={face.label} value={face.family}>
                  {face.label}
                </helix-option>
              ))}
            </helix-select>

            {/* **Hue is meaning and loudness is not**, which is the line this
              draws. A status that rotates with the brand is a warning a reader
              re-learns per product and stays refused; a status that ignores how
              loud the palette around it is measured six times primary's chroma
              against a muted brand, which is a red that shouts. */}
            <helix-slider
              hint="How far the statuses follow the palette's loudness."
              label="Status harmony"
              max={100}
              min={0}
              name="harmony"
              onhelix-input={(event) => setHarmony(Number(event.detail.value))}
              show-value
              step={10}
              value={String(harmony)}
            ></helix-slider>

            {/* The repair rather than the report. A status may rotate within its
              meaning to clear a role it cannot be told apart from, and it keeps
              its own hue when no rotation inside the allowance clears one: a
              warning that has stopped looking like a warning and still collides
              is worse than one that only collides. */}
            <helix-slider
              label="Status hue allowance"
              max={60}
              min={0}
              name="allowance"
              onhelix-input={(event) => setAllowance(Number(event.detail.value))}
              show-value
              step={10}
              value={String(allowance)}
            ></helix-slider>

            {/* **Two ends of one ramp, and they are different problems.** The
              steps under the body size are a UI ramp where a label has to be
              smaller than its field and still be read, so they step down a
              pixel; the steps above are a display ramp where each has to be
              obviously not the last, so they compound. One control for each. */}
            <helix-slider
              label="Body size"
              max={18}
              min={12}
              name="text-base"
              onhelix-input={(event) => setTextBase(Number(event.detail.value))}
              show-value
              step={1}
              value={String(textBase)}
            ></helix-slider>

            <helix-slider
              hint="The ratio between the display steps."
              label="Type scale"
              max={160}
              min={110}
              name="text-scale"
              onhelix-input={(event) => setTextScale(Number(event.detail.value))}
              show-value
              step={2}
              value={String(textScale)}
            ></helix-slider>

            {/* **Character rather than a duration**, because the pace and the
              curve are one decision: a spring over 120ms is a twitch and a soft
              curve over 120ms is a fade. Leaving it alone emits neither, so the
              stylesheet's own pace stands.

              `precise` is the one that is not physical: the other three
              accelerate, settle or overshoot, where linear reads as moved by a
              mechanism. `instant` is neither a pace nor a curve but the absence
              of both, and it emits no easings at all, three curves for
              transitions of zero length being a contradiction. */}
            {/* **A select, and it is the one of the three that has to be.** Six
              characters do not fit a form this narrow: measured, the track
              wanted 420px against a 312px host, so `Instant` sat 79px past the
              panel's right edge with nothing on screen to say a value was
              missing. Toggle Group wraps now rather than losing a segment, which
              is the right thing for it to do everywhere and the wrong thing
              here, where four across and two below reads as a control that ran
              out of room. The two separation groups keep their segments, because
              four and three fit at the widths this pane actually takes and the
              wrap is there for the extreme.

              What is lost is worth naming: a segmented control shows the whole
              set, and trying characters on is the one thing a reader does here
              repeatedly. Six labels they cannot read is not a better version of
              that. */}
            {/* **The placeholder is the resting state's name, not an invitation.**
              Select shows the chosen options' words or its placeholder, and an
              option whose value is the empty string contributes no word, so the
              default character rendered as `Choose`: a control reporting that
              nothing had been picked, for a theme that does have a pace, the
              stylesheet's own. The option stays in the list so there is a way
              back to it, and both states now read `Default`. */}
            <helix-select
              label="Motion"
              name="motion"
              onhelix-change={(event) => setMotion(event.detail.value as Character)}
              placeholder="Default"
              value={motion}
            >
              <helix-icon name="caret-down" slot="indicator"></helix-icon>
              <helix-option value="">Default</helix-option>
              <helix-option value="snappy">Snappy</helix-option>
              <helix-option value="gentle">Gentle</helix-option>
              <helix-option value="springy">Springy</helix-option>
              <helix-option value="precise">Precise</helix-option>
              <helix-option value="instant">Instant</helix-option>
            </helix-select>

            {/* Two policies rather than one, because the two kinds of surface are
              not the same problem: a card sits on a ground the theme knows and a
              menu floats over whatever the reader scrolled under it. `space` is
              offered here and refused there for that reason. */}
            <helix-toggle-group
              label="Separation, in flow"
              onhelix-change={(event) => setSurface(event.detail.value as Mechanism)}
              value={surface}
            >
              <helix-toggle value="border">Border</helix-toggle>
              <helix-toggle value="shadow">Shadow</helix-toggle>
              <helix-toggle value="fill">Fill</helix-toggle>
              <helix-toggle value="space">Space</helix-toggle>
            </helix-toggle-group>

            <helix-toggle-group
              label="Separation, floating"
              onhelix-change={(event) => setFloating(event.detail.value as Mechanism)}
              value={floating}
            >
              <helix-toggle value="shadow">Shadow</helix-toggle>
              <helix-toggle value="border">Border</helix-toggle>
              <helix-toggle value="fill">Fill</helix-toggle>
            </helix-toggle-group>

            {/* **Material was an axis the engine took and this could not reach.**
              `ThemeIntent.material` is two numbers and the builder wrote neither,
              so a theme made here could say how its surfaces separate and not
              what they are made of. The header, the menu and the dialog all move
              on these, which is why they are the three things the preview opens.

              Two sliders rather than a character, because unlike motion the pair
              does not have to move together: a heavy blur behind a nearly opaque
              pane is a real look and so is a clear pane with none.

              **And this is the one control that can cost the guarantee.**
              Anything below full stops being a known ground, so a pair over it
              comes back `unverifiable` rather than measured, which the pairings
              panel says out loud when it happens. */}
            <helix-slider
              hint="Pixels behind a translucent surface. Zero is flat."
              label="Material blur"
              max={40}
              min={0}
              name="material-blur"
              onhelix-input={(event) => setBlur(Number(event.detail.value))}
              show-value
              step={2}
              value={String(blur)}
            ></helix-slider>

            <helix-slider
              hint="How opaque those surfaces are. Below 100 they stop being a known ground."
              label="Material opacity"
              max={100}
              min={40}
              name="material-opacity"
              onhelix-input={(event) => setTranslucency(Number(event.detail.value))}
              show-value
              step={4}
              value={String(translucency)}
            ></helix-slider>
          </helix-flex>
        </section>

        <div className="themeStage" slot="end">
          {/* `lead="preview"` because this is a place to look. The workbench
              leads with its source, being a place to write; here the artifact is
              an output rather than an input and a reader is judging a palette,
              not editing CSS. */}
          {/* **The artifact is a column of custom properties**, so its longest
              line is a token name and a hex, so it wants a third of the stage
              and the preview wants the rest. See `PREVIEW_SHARE` for which pane
              the number is actually about, which is not what the manifest says.

              Held as state and written back on settle, which is the workbench's
              pattern and is necessary rather than tidy: `Sandbox` owns `split`
              and writes it back on every drag, so a bare prop would be reapplied
              by the next render and undo the reader's drag. `default-split` is
              not the lever either, being what a *reset* returns to. */}
          <helix-sandbox
            corner-label="Preview, artifact and audit"
            default-split={PREVIEW_SHARE}
            lead="preview"
            onhelix-change={(event) => {
              if (event.detail.property === 'split') {
                setSplit((event.target as HTMLElement & { split: number }).split)
              }
            }}
            orientation="horizontal"
            panel-label="The audit"
            separator-label="Preview and artifact"
            split={split}
          >
            {/* Status rather than settings: what the palette measured, always
                on screen, with the detail one panel away. The form holds every
                input, so a toolbar of controls here would be a second place to
                look for the same thing. */}
            <helix-sandbox-toolbar slot="toolbar">
              <helix-flex align="center" gap="xs">
                <helix-tag emphasis="subtle" tone={failures.length > 0 ? 'danger' : 'success'}>
                  {counts.pass ?? 0} pass
                </helix-tag>
                {failures.length > 0 ? (
                  <helix-tag emphasis="subtle" tone="danger">
                    {failures.length} fail
                  </helix-tag>
                ) : null}
                {unmeasured.length > 0 ? (
                  <helix-tag emphasis="subtle" tone="neutral">
                    {unmeasured.length} unverifiable
                  </helix-tag>
                ) : null}
                {theme.collisions.length > 0 ? (
                  <helix-tag emphasis="subtle" tone="warning">
                    {theme.collisions.length} collision
                    {theme.collisions.length === 1 ? '' : 's'}
                  </helix-tag>
                ) : null}
              </helix-flex>
            </helix-sandbox-toolbar>

            {/* **A document of its own, and the leak is what forced it.** This
                was a `div` in the site's page, which meant the site's own
                stylesheet reached it: nineteen bare `helix-*` rules in
                `site.css`, and three of them landed here. Measured, the preview's
                header computed `--app-header-backdrop: none` and
                `--app-header-background: transparent` because the masthead sets
                those for itself, so the material control could be dragged from
                zero to forty and the one surface most likely to be glass never
                moved. The drawer took the site's header clearance too, for a
                header that is not above it.

                Scoping the site's rules away from the preview is the same fix
                nineteen times and once more for every rule anybody adds. The
                cause is that a preview of a page was not a page, and
                `helix-sandbox-preview` already exists for exactly this: its own
                docstring says an example that restyles `helix-card` restyled the
                sandbox too. The workbench has previewed this way all along.

                The top layer comes free with it. A dialog opened here covered
                the whole tool, because `showModal` paints outside every ancestor
                and the tool was an ancestor; in a document of its own it is
                confined to the pane, which is what a reader is trying to judge.

                `color-mode` rather than a wrapper attribute, because the frame is
                a document and inherits nothing from this one. */}
            <helix-sandbox-preview
              color-mode={scheme}
              label="The themed page"
              layout="fullscreen"
              ref={preview}
              slot="preview"
              src="/sandbox/frame.html"
            ></helix-sandbox-preview>

            {/* **The editor, read-only, rather than a code block.** The
                artifact pane should read as a source file, which is what the
                workbench puts here: line numbers, the same syntax palette, the
                same gutter. A code block is a figure in a page and this is a
                pane in a tool.

                `read-only` because the artifact is an output. The editor takes
                it through `EditorState.readOnly` rather than by dropping focus,
                so the text is still selectable and reachable by keyboard, which
                is the whole point of showing it. */}
            <helix-sandbox-editor
              field-label="The generated stylesheet"
              language="css"
              name="artifact"
              read-only
              slot="source"
              value={css}
            ></helix-sandbox-editor>

            {/* **Tabs, because these are three different questions.** A
                contrast failure is a token against a ground, a collision is two
                roles against each other, and an unmeasured pair is neither: it
                is a ground nobody can know. Stacked in one column they read as
                one list of complaints, and a reader looking for the second kind
                has to know it exists. */}
            <helix-tabs data-density="sm" defaultActive="contrast" label="The audit" slot="panel">
              <helix-tabs-tab value="contrast">
                Contrast
                {failures.length > 0 ? ` (${failures.length})` : ''}
              </helix-tabs-tab>
              <helix-tabs-tab value="collisions">
                Collisions
                {theme.collisions.length > 0 ? ` (${theme.collisions.length})` : ''}
              </helix-tabs-tab>
              <helix-tabs-tab value="unmeasured">
                Unverifiable
                {unmeasured.length > 0 ? ` (${unmeasured.length})` : ''}
              </helix-tabs-tab>

              <helix-tabs-panel slot="panels" value="contrast">
                <div className="themeFindings">
                  {failures.length === 0 ? (
                    <helix-text variant="caption">
                      All {counts.pass ?? 0} measured pairs clear their target. Each is a foreground
                      against a ground the surface model says it lands on, rather than against the
                      page alone.
                    </helix-text>
                  ) : (
                    <helix-table label="Contrast failures">
                      <helix-table-column slot="columns">Foreground</helix-table-column>
                      <helix-table-column slot="columns">Ground</helix-table-column>
                      <helix-table-column slot="columns">Measured</helix-table-column>
                      <helix-table-column slot="columns">Target</helix-table-column>
                      {failures.map((pair) => (
                        <helix-table-row key={`${pair.foreground}-${pair.background}`}>
                          <helix-table-cell>{pair.foreground}</helix-table-cell>
                          <helix-table-cell>{pair.background}</helix-table-cell>
                          <helix-table-cell>{pair.ratio?.toFixed(2)}:1</helix-table-cell>
                          <helix-table-cell>{pair.target}:1</helix-table-cell>
                        </helix-table-row>
                      ))}
                    </helix-table>
                  )}
                </div>
              </helix-tabs-panel>

              <helix-tabs-panel slot="panels" value="collisions">
                <div className="themeFindings">
                  {theme.collisions.length === 0 ? (
                    <helix-text variant="caption">
                      Every role is distinguishable from every other. A collision is two roles a
                      reader cannot tell apart, which no contrast measurement can see: both may
                      clear the page and still say the same thing.
                    </helix-text>
                  ) : (
                    <helix-flex direction="column" gap="sm">
                      {theme.collisions.map((collision) => (
                        <helix-callout key={collision} tone="warning">
                          <helix-text>{collision}</helix-text>
                        </helix-callout>
                      ))}
                      <helix-text variant="caption">
                        The accent yields on its own, and a status may rotate within its meaning up
                        to the allowance. What is left here could not be repaired by either.
                      </helix-text>
                    </helix-flex>
                  )}
                </div>
              </helix-tabs-panel>

              <helix-tabs-panel slot="panels" value="unmeasured">
                <div className="themeFindings">
                  <helix-flex direction="column" gap="sm">
                    <helix-text variant="caption">
                      Not a softer failure: these pairs were never measured, because the ground is
                      not knowable: what sits behind a caption over a photograph is the photograph.
                      Folding them into the passes is how a guarantee becomes a claim about the
                      pairs that happened to be easy.
                    </helix-text>
                    {unmeasured.map((pair) => (
                      <helix-text key={`${pair.foreground}-${pair.background}`}>
                        {pair.foreground} on {pair.background}
                      </helix-text>
                    ))}
                  </helix-flex>
                </div>
              </helix-tabs-panel>
            </helix-tabs>
          </helix-sandbox>
        </div>
      </helix-splitter>
    </>
  )
}
