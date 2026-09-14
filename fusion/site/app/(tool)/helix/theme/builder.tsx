'use client'

import type { HelixBeforeResizeEvent, HelixSandboxPreview } from '@fusion.dev/helix'
import { type DerivedTheme, initTheme, type ThemeEngine } from '@fusion.dev/helix-theme'
import { useEffect, useMemo, useRef, useState } from 'react'
import { PreferencesDrawer } from '@/components/preferences/preferences'
import { type Findable, SiteFind } from '@/components/site-find/site-find'
import { SiteMenu } from '@/components/site-nav/site-nav'
import { Wordmark } from '@/components/wordmark/wordmark'
import { type FaceRow, GOOGLE_FACES } from '@/content/faces/faces.generated'
import {
  BOUNDS,
  type Character,
  INITIAL,
  intentFrom,
  type Mechanism,
  queryFrom,
  SCOPE,
  type Settings,
} from '@/utils/theme-defaults/theme-defaults'
import { useSandboxEditor } from '../../../../hooks/use-sandbox-editor/use-sandbox-editor'
import { THEME_ENGINE } from '../../../../utils/theme-engine/theme-engine'
import { THEMED_PAGE_STYLES } from './themed-page-styles'
import { FACE_SAMPLE, useFacePreviews } from './use-face-previews'
import './builder.css'
import styles from '../tool-shell.module.css'

/**
 * What share of the stage the preview starts with.
 *
 * **`split` follows the lead pane, not the source pane**, which is worth
 * knowing because the manifest says otherwise: its description reads
 * "percentage of the sandbox given to the source pane", and measured with
 * `lead="preview"` a split of 32 gave the *preview* 32 per cent. The area
 * rules have it right, that `split` means the same thing in both directions.
 */
const PREVIEW_SHARE = 68

/**
 * The faces on offer, fetched rather than vendored.
 */
interface Face {
  /** Google's own category, which is what the dropdowns are grouped by. */
  category: number
  family: string
  google?: string
  label: string
  /** The one-weight request behind the sample, absent on the resting option. */
  preview?: string
}

/**
 * A named run of faces, which is what a dropdown shows instead of a wall.
 *
 * **Because two thousand alphabetical families is a wall**, and a combobox that
 * filters as it is typed into answers "I know what I want" rather than "show me
 * something reasonable".
 */
interface FaceGroup {
  faces: Face[]
  label: string
}

const SYSTEM: Face = { category: 0, family: '', label: 'System default' }

/**
 * Every Google family, from the catalog `turbo run faces` writes.
 *
 * **A family is asked for the weights it has, not for the three the token layer
 * uses.** It is offered when it can serve at least one of 400, 500 and 600; the
 * flat request against a family shipping only 400 and 700 returns a stylesheet
 * missing two weights and a page that synthesizes the difference.
 */
const fromCatalog = (row: FaceRow): Face => ({
  category: row[2],
  family: row[0],
  google: `${row[0].replace(/ /g, '+')}:wght@${row[1]}`,
  label: row[0],
  /* The first weight the family has, for the two-letter sample beside its name.
     `google` above asks for all three because the token layer sets all three;
     a preview needs one, and asking for the others triples a request whose
     whole point is to be cheap. */
  preview: `${row[0].replace(/ /g, '+')}:wght@${row[1].split(';')[0]}`,
})

/* **`!== 1` rather than `=== 0`.** The third field is a category and monospace
   is 1, so the proportional half is every other category. Written `=== 0` this
   list holds sans-serif alone and drops over a thousand serif, display and
   handwriting families in silence. */
const CATALOG: Face[] = GOOGLE_FACES.filter((row) => row[2] !== 1).map(fromCatalog)
const CATALOG_MONO: Face[] = GOOGLE_FACES.filter((row) => row[2] === 1).map(fromCatalog)

/**
 * The six that lead every dropdown, under a heading of their own.
 */
const LEADING = ['Inter', 'DM Sans', 'Work Sans', 'Fraunces', 'Playfair Display', 'Source Serif 4']

/** Google's five, in the order a reader is most likely to want them. */
const CATEGORY_ORDER = [0, 2, 3, 4, 1] as const

const CATEGORY_LABEL: Record<number, string> = {
  0: 'Sans serif',
  1: 'Monospace',
  2: 'Serif',
  3: 'Display',
  4: 'Handwriting',
}

/**
 * The catalog as named runs: the picked few, then Google's own categories.
 */
const grouped = (faces: Face[], leading: readonly string[]): FaceGroup[] => {
  const picked = leading
    .map((name) => faces.find((face) => face.family === name))
    .filter((face): face is Face => face !== undefined)

  const rest = faces.filter((face) => !leading.includes(face.family))

  return [
    { faces: picked, label: 'Recommended' },
    ...CATEGORY_ORDER.map((category) => ({
      faces: rest.filter((face) => face.category === category),
      label: CATEGORY_LABEL[category] ?? '',
    })),
  ].filter((group) => group.faces.length > 0)
}

const FACE_GROUPS: FaceGroup[] = grouped(CATALOG, LEADING)

/**
 * The same groups, with a different word for choosing none.
 */
const DISPLAY_REST: Face = { category: 0, family: '', label: 'Same as body' }

/* Monospace is a category in the catalog rather than a list here, so a face that
   calls itself mono is offered where mono is asked for and nowhere else. The
   three named below lead it for the same reason as above. */
const MONO_LEADING = ['JetBrains Mono', 'IBM Plex Mono', 'Space Mono']

const MONO_GROUPS: FaceGroup[] = grouped(CATALOG_MONO, MONO_LEADING)

const MONO_REST: Face = { category: 1, family: '', label: 'System mono' }

/** Every face carrying a Google request, for the fonts URL to look one up in. */
const ALL_FACES: Face[] = [...CATALOG, ...CATALOG_MONO]

/**
 * The options inside a face dropdown: the resting one loose, then the groups.
 */
const faceOptions = (groups: FaceGroup[], rest: Face) => (
  <>
    <helix-option value={rest.family}>{rest.label}</helix-option>
    {groups.map((group) => (
      <helix-option-group key={group.label} label={group.label}>
        {group.faces.map((face) => (
          <helix-option key={face.family} value={face.family}>
            {face.label}
            {/*
             * *The specimen, after the name.**
             */}
            <span aria-hidden="true" className="themeFace" slot="end">
              {/* **The face is named here or the sample is a lie.** It is the
                  one thing in this markup that cannot be moved to a stylesheet,
                  a rule per family being a rule per family. Drop it and every
                  sample renders in the page's own face: a thousand rows showing
                  one typeface wearing a thousand names, which is invisible by
                  eye and shows up only in the rendered glyphs. */}
              <span
                className="themeFaceSample"
                data-face-request={face.preview}
                style={{ fontFamily: `"${face.family}", var(--helix-font-sans)` }}
              >
                {FACE_SAMPLE}
              </span>
              <helix-skeleton className="themeFaceWaiting" shape="text" />
            </span>
          </helix-option>
        ))}
      </helix-option-group>
    ))}
  </>
)

export function ThemeBuilder({
  contexts,
  findable,
  initialContext,
  initialLayout,
  initialSettings,
  initialTheme,
  layouts,
  markup,
}: {
  /** Whose page the preview is, and what a reader picks one by. */
  contexts: readonly { label: string; value: string }[]
  findable: Findable[]
  /**
   * Which context and layout the link asked for, if it asked for either.
   *
   * Validated against the offered lists by the server component, so an unknown
   * one arrives here as `undefined` rather than as an axis value nothing can
   * render.
   */
  initialContext?: string
  initialLayout?: string
  /**
   * What the reader's link described, already validated.
   *
   * **Seeded from the URL on the server**, so a shared theme is in the HTML
   * rather than applied a frame after hydration. Every value has been checked
   * and clamped by `settingsFrom`: what arrives here is a `Settings` that the
   * controls below can all display.
   */
  initialSettings: Settings
  /**
   * The default theme, derived on the server.
   *
   * **The engine is WebAssembly and instantiates asynchronously**, so nothing
   * derives during server rendering unless it is arranged. Without this the
   * first paint carries no palette and the slider ramps (drawn off the
   * *derived* primary rather than the brand) appear 287ms after navigation,
   * mostly hydration rather than transfer.
   */
  initialTheme: DerivedTheme
  /** How much page there is, which is the axis the context is not. */
  layouts: readonly { label: string; value: string }[]
  /**
   * The preview's page, already a string, once per layout and context.
   */
  markup: Readonly<Record<string, string>>
}) {
  useSandboxEditor()

  const [menuOpen, setMenuOpen] = useState(false)
  const [prefsOpen, setPrefsOpen] = useState(false)

  /**
   * Whether the controls are on screen, and how much room they take when they
   * are.
   */
  const [controlsShown, setControlsShown] = useState(true)
  const [narrow, setNarrow] = useState(false)

  useEffect(() => {
    const query = window.matchMedia('(max-width: 60rem)')
    const sync = () => {
      setNarrow(query.matches)
      /* Shut on arrival at a narrow width: the preview is what a reader came
         for, and a form over almost all of it is not a first impression. */
      setControlsShown(!query.matches)
    }
    sync()
    query.addEventListener('change', sync)
    return () => query.removeEventListener('change', sync)
  }, [])

  /* Nearly the whole width on a phone: a column of labeled fields at a quarter
     of 375px reads as a column rather than as a form. A sliver is left so the
     preview says it is still there. */
  const controlsPosition = controlsShown ? (narrow ? 88 : 24) : 0

  /* **Declared as a correction, and answered so it stays one.** The splitter
     moves itself; this hears where it went and agrees. A reader dragging the
     separator to the edge has shut the pane, and the toggle has to hear that or
     it goes on saying "Hide controls" over a pane that is already gone. Two per
     cent rather than zero, because a drag that lands a pixel short of the edge
     is still a reader shutting it. */
  const controlsMoved = (event: HelixBeforeResizeEvent) => {
    // The splitter's own, rather than one sent by something inside it.
    if (event.target === event.currentTarget) {
      setControlsShown(Number(event.detail.value) > 2)
    }
  }
  const [brand, setBrand] = useState(initialSettings.brand)
  const [scheme, setScheme] = useState(initialSettings.scheme)
  const [contrastTarget, setContrastTarget] = useState(initialSettings.contrastTarget)
  const [chromaScale, setChromaScale] = useState(initialSettings.chromaScale)
  const [accentHue, setAccentHue] = useState(initialSettings.accentHue)
  const [density, setDensity] = useState(initialSettings.density)
  const [radius, setRadius] = useState(initialSettings.radius)
  const [allowance, setAllowance] = useState(initialSettings.allowance)
  const [harmony, setHarmony] = useState(initialSettings.harmony)
  const [split, setSplit] = useState(PREVIEW_SHARE)
  const [bodyFace, setBodyFace] = useState(initialSettings.bodyFace)
  const [displayFace, setDisplayFace] = useState(initialSettings.displayFace)
  const [monoFace, setMonoFace] = useState(initialSettings.monoFace)
  const [motion, setMotion] = useState(initialSettings.motion)
  const [textBase, setTextBase] = useState(initialSettings.textBase)
  const [textScale, setTextScale] = useState(initialSettings.textScale)
  const [surface, setSurface] = useState(initialSettings.surface)
  const [floating, setFloating] = useState(initialSettings.floating)
  /* The shipped policy, so the sliders start where the stylesheet already is and
     moving one is a departure a reader can see rather than a jump. */
  const [blur, setBlur] = useState(initialSettings.blur)
  const [translucency, setTranslucency] = useState(initialSettings.translucency)

  /**
   * Which of the audit's three panels is open.
   *
   * **Held here because the toolbar's counts open it.** A tag saying "2 fail"
   * has to reach the Contrast tab, which is the one mapping nobody can guess
   * from the words.
   */
  const [audit, setAudit] = useState('contrast')

  /* **What the preview pretends to be, and neither is part of the theme.**
     They change no token, appear in no artifact and are measured by nothing:
     the palette a reader leaves with is identical whichever pair is chosen. So
     they live here rather than in `Settings`, they are absent from
     `intentFrom`, and `reset` leaves them alone, `reset` being about the
     shipped values rather than about what a reader is looking at while they
     depart from them.

     The first entry of each list is its resting one, which is the convention
     the generated lists are ordered by. */
  const [context, setContext] = useState(initialContext ?? contexts[0]?.value ?? '')
  const [layout, setLayout] = useState(initialLayout ?? layouts[0]?.value ?? '')

  const source = markup[`${layout}:${context}`] ?? ''

  /* **Every reader-movable value in one object**, which is what the three uses
     below share. Stated separately in the state initializers, in the `pristine`
     comparison and in `reset`, a default changed in two of the three is a
     builder whose reset goes somewhere the reader never was. */
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

  /**
   * The link, kept current, so a reader can bookmark a theme or send one.
   */
  const written = useRef(false)

  useEffect(() => {
    if (!written.current) {
      written.current = true
      return
    }

    const timer = setTimeout(() => {
      const query = queryFrom(settings, {
        context: context === contexts[0]?.value ? undefined : context,
        layout: layout === layouts[0]?.value ? undefined : layout,
      })
      window.history.replaceState(null, '', query ? `?${query}` : window.location.pathname)
    }, 250)

    return () => clearTimeout(timer)
  }, [context, contexts, layout, layouts, settings])

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
     `intentFrom(settings)` from whatever the reader has moved since.

     `settings` is memoized for this: a fresh object every render would make this
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

  /* The pane holding the three face dropdowns, so the samples inside them can be
     watched. Every option is in the light DOM here whether the list is open or
     shut, and an option in a shut list has no box, so the observer reports the
     ones a reader can see and nothing else. */
  const controls = useRef<HTMLElement>(null)

  useFacePreviews(controls)

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
      .map((family) => ALL_FACES.find((face) => face.family === family)?.google)
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
    preview.current.source = source
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

       `@import` rather than a `<link>`, because `turbo run styles` is a channel that
       already exists and adding a second one would mean a new field on the
       render message, a new branch in the frame, and a shipped component
       changed to carry the theme tool's fonts. It has to lead the stylesheet:
       an `@import` after any rule is dropped. */
    preview.current.styles = [
      fontsHref ? `@import url("${fontsHref}");` : '',
      THEMED_PAGE_STYLES,
      framed,
    ].join('\n')
  }, [fontsHref, framed, source])

  /* **Lightness only, and in whichever direction reaches the target.** The
     solver moves one component: a brand keeps its hue and its chroma and gives
     up its lightness. Which way it gives it up depends on where the brand
     started, so the label cannot say "Darkened" unconditionally: `#2e394a`
     comes back *lighter*.

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
     through `turbo run styles`, because it cannot see this one. */
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
        {/* The way out, ahead of the mark. Same argument as the sandbox: a
            tool's header is full of the tool, so it carries one way back to the
            site rather than the four destinations the site's own header lists,
            and the menu sits outside the mark because it is outside the page. */}
        <helix-flex align="center" gap="2xs" slot="start">
          <helix-tooltip content="Menu" placement="bottom">
            <helix-icon-button label="Menu" onClick={() => setMenuOpen(true)}>
              <helix-icon name="list"></helix-icon>
            </helix-icon-button>
          </helix-tooltip>
          <a data-link="quiet" href="/">
            <Wordmark />
          </a>
        </helix-flex>
        <helix-flex align="center" gap="2xs" slot="end">
          <SiteFind findable={findable} />
          <helix-tooltip content="Preferences" placement="bottom">
            <helix-icon-button label="Preferences" onClick={() => setPrefsOpen(true)}>
              <helix-icon name="gear"></helix-icon>
            </helix-icon-button>
          </helix-tooltip>
        </helix-flex>
      </helix-app-header>

      <SiteMenu onOpenChange={setMenuOpen} open={menuOpen} placement="start" />

      <PreferencesDrawer onOpenChange={setPrefsOpen} open={prefsOpen} />

      {/*
       *  A splitter for the form, and `helix-sandbox` for everything else.
       */}
      <helix-splitter
        className={styles.workbenchBody}
        default-position={24}
        onhelix-before-resize={controlsMoved}
        position={controlsPosition}
      >
        <section className="themeControls" ref={controls} slot="start">
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

            {/*
             * *A preview control, in the form, because every input is.** The
             *                 toolbar above is status and the form is settings, which the
             *                 toolbar's own comment argues; a control up there would be a
             *                 second place to look for the same kind of thing.
             */}
            <helix-select
              hint="Only the words change. The palette is the same whichever you pick."
              label="Preview"
              name="context"
              onChange={(event) => setContext(event.currentTarget.value)}
              value={context}
            >
              <helix-icon name="caret-down" slot="indicator"></helix-icon>
              {contexts.map((entry) => (
                <helix-option key={entry.value} value={entry.value}>
                  {entry.label}
                </helix-option>
              ))}
            </helix-select>

            {/*
             * *The second axis, and it is a second control because two of the
             *                 answers can be true at once.** A minimal storefront and a dense
             *                 storefront are both real arrangements, so who is speaking and how
             *                 much page they speak on are independent questions. Nine rows in
             *                 one list would make a reader read every combination to find the
             *                 two facts they are choosing.
             */}
            <helix-select
              hint="How much page there is. Minimal has no chart and nothing that floats."
              label="Layout"
              name="layout"
              onChange={(event) => setLayout(event.currentTarget.value)}
              value={layout}
            >
              <helix-icon name="caret-down" slot="indicator"></helix-icon>
              {layouts.map((entry) => (
                <helix-option key={entry.value} value={entry.value}>
                  {entry.label}
                </helix-option>
              ))}
            </helix-select>

            <helix-color-input
              hint="The one color you own. Everything else is derived from it."
              label="Brand"
              name="brand"
              onChange={(event) => setBrand(event.currentTarget.value)}
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
                and an icon; this is a caption under the field it is about,
                saying what happened to the value that was just typed. As a
                callout it reads as a warning about a normal thing, and its icon
                and inset crowd a quarter-width pane. */}
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
              hint="Which half of the palette is derived. Both are emitted; this picks the one you see."
              label="Color scheme"
              name="scheme"
              onChange={(event) => setScheme(event.currentTarget.value as 'dark' | 'light')}
              value={scheme}
            >
              <helix-icon name="caret-down" slot="indicator"></helix-icon>
              <helix-option value="light">Light</helix-option>
              <helix-option value="dark">Dark</helix-option>
            </helix-select>

            <helix-select
              hint="The ratio every foreground has to clear against the ground it lands on."
              label="Contrast target"
              name="contrast"
              onChange={(event) => setContrastTarget(Number(event.currentTarget.value))}
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

            {/*
             * *Painted through `--slider-track-image`, the hook Slider already
             *                 publishes for exactly this.** `ColorPicker` paints its own hue
             *                 and alpha channels the same way and is itself built out of
             *                 `helix-slider`, so a color channel is a slider with a ramp on it
             *                 rather than a component of its own: it adds no behavior, no
             *                 state and no API, which is the test for whether something earns
             *                 an element.
             */}
            <helix-slider
              {...BOUNDS.chromaScale}
              className="themeChannel"
              hint="How much of the brand’s chroma the palette keeps. Zero is gray."
              label="Saturation"
              name="chroma"
              onInput={(event) => setChromaScale(Number(event.currentTarget.value))}
              show-value
              style={{ '--slider-track-image': ramps.saturation ?? '' }}
              value={String(chromaScale)}
            ></helix-slider>

            {/* The whole wheel, starting at the brand, so a reader is choosing
                a direction off their own color and not an abstract number. */}
            <helix-slider
              {...BOUNDS.accentHue}
              className="themeChannel"
              hint="How far around the wheel the accent sits from the brand, in degrees. At 0 it is the brand."
              label="Accent angle"
              name="accent"
              onInput={(event) => setAccentHue(Number(event.currentTarget.value))}
              show-value
              style={{ '--slider-track-image': ramps.accent ?? '' }}
              value={String(accentHue)}
            ></helix-slider>

            <helix-slider
              {...BOUNDS.density}
              hint="Control heights and the spacing scale, as a percentage of the shipped one."
              label="Density"
              name="density"
              onInput={(event) => setDensity(Number(event.currentTarget.value))}
              show-value
              value={String(density)}
            ></helix-slider>

            <helix-slider
              {...BOUNDS.radius}
              hint="As a percentage of the shipped radii. Zero is square."
              label="Corner radius"
              name="radius"
              onInput={(event) => setRadius(Number(event.currentTarget.value))}
              show-value
              value={String(radius)}
            ></helix-slider>

            {/* **Type is part of a theme.** Families are the half a consumer
                chooses; the size scale, the weights, the leading and the
                tracking are a system rather than a choice and are still fixed,
                which is the honest state of it. */}
            {/* **The placeholder names the resting state, it does not invite a
                choice.** The field shows the chosen option's words or its
                placeholder, and an option whose value is the empty string
                contributes no word, so a generic placeholder makes all three of
                these read `Choose` while sitting on a real, named answer. The
                option stays in each list so there is a way back to it. */}
            <helix-combobox
              label="Body face"
              name="body-face"
              onChange={(event) => setBodyFace(event.currentTarget.value)}
              placeholder="System default"
              value={bodyFace}
            >
              <helix-icon name="caret-down" slot="indicator"></helix-icon>
              {faceOptions(FACE_GROUPS, SYSTEM)}
            </helix-combobox>

            <helix-combobox
              hint="Headings. Follows the body face where it is left alone."
              label="Display face"
              name="display-face"
              onChange={(event) => setDisplayFace(event.currentTarget.value)}
              placeholder="Same as body"
              value={displayFace}
            >
              <helix-icon name="caret-down" slot="indicator"></helix-icon>
              {faceOptions(FACE_GROUPS, DISPLAY_REST)}
            </helix-combobox>

            <helix-combobox
              label="Mono face"
              name="mono-face"
              onChange={(event) => setMonoFace(event.currentTarget.value)}
              placeholder="System mono"
              value={monoFace}
            >
              <helix-icon name="caret-down" slot="indicator"></helix-icon>
              {faceOptions(MONO_GROUPS, MONO_REST)}
            </helix-combobox>

            {/* **Hue is meaning and loudness is not**, which is the line this
              draws. A status that rotates with the brand is a warning a reader
              re-learns per product and stays refused; a status that ignores how
              loud the palette around it is measured six times primary's chroma
              against a muted brand, which is a red that shouts. */}
            <helix-slider
              {...BOUNDS.harmony}
              hint="How far the statuses follow the palette's loudness."
              label="Status harmony"
              name="harmony"
              onInput={(event) => setHarmony(Number(event.currentTarget.value))}
              show-value
              value={String(harmony)}
            ></helix-slider>

            {/* The repair rather than the report. A status may rotate within its
              meaning to clear a role it cannot be told apart from, and it keeps
              its own hue when no rotation inside the allowance clears one: a
              warning that has stopped looking like a warning and still collides
              is worse than one that only collides. */}
            <helix-slider
              {...BOUNDS.allowance}
              hint="How far a status may rotate, in degrees, to clear a role it collides with."
              label="Status hue allowance"
              name="allowance"
              onInput={(event) => setAllowance(Number(event.currentTarget.value))}
              show-value
              value={String(allowance)}
            ></helix-slider>

            {/* **Two ends of one ramp, and they are different problems.** The
              steps under the body size are a UI ramp where a label has to be
              smaller than its field and still be read, so they step down a
              pixel; the steps above are a display ramp where each has to be
              obviously not the last, so they compound. One control for each. */}
            <helix-slider
              {...BOUNDS.textBase}
              hint="The base size in pixels. Every UI step is measured off it."
              label="Body size"
              name="text-base"
              onInput={(event) => setTextBase(Number(event.currentTarget.value))}
              show-value
              value={String(textBase)}
            ></helix-slider>

            <helix-slider
              {...BOUNDS.textScale}
              hint="The ratio between the display steps."
              label="Type scale"
              name="text-scale"
              onInput={(event) => setTextScale(Number(event.currentTarget.value))}
              show-value
              value={String(textScale)}
            ></helix-slider>

            {/*
             * *Character rather than a duration**, because the pace and the
             *               curve are one decision: a spring over 120ms is a twitch and a soft
             *               curve over 120ms is a fade. Leaving it alone emits neither, so the
             *               stylesheet's own pace stands.
             */}
            {/*
             * *A select, and it is the one of the three that has to be.** Six
             *               characters do not fit a form this narrow: measured, the track
             *               wanted 420px against a 312px host, so `Instant` sat 79px past the
             *               panel's right edge with nothing on screen to say a value was
             *               missing. Toggle Group wraps now rather than losing a segment, which
             *               is the right thing for it to do everywhere and the wrong thing
             *               here, where four across and two below reads as a control that ran
             *               out of room. The two separation groups keep their segments, because
             *               four and three fit at the widths this pane actually takes and the
             *               wrap is there for the extreme.
             */}
            {/* **The placeholder is the resting state's name, not an invitation**,
              for the reason the face fields above carry: the empty-valued option
              contributes no word, so a generic placeholder would report that
              nothing had been picked for a theme that does have a pace, the
              stylesheet's own. */}
            <helix-select
              hint="The pace and the curve together. Default keeps the stylesheet’s own."
              label="Motion"
              name="motion"
              onChange={(event) => setMotion(event.currentTarget.value as Character)}
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
              onChange={(event) => setSurface(event.currentTarget.value as Mechanism)}
              value={surface}
            >
              <helix-toggle value="border">Border</helix-toggle>
              <helix-toggle value="shadow">Shadow</helix-toggle>
              <helix-toggle value="fill">Fill</helix-toggle>
              <helix-toggle value="space">Space</helix-toggle>
            </helix-toggle-group>

            <helix-toggle-group
              label="Separation, floating"
              onChange={(event) => setFloating(event.currentTarget.value as Mechanism)}
              value={floating}
            >
              <helix-toggle value="shadow">Shadow</helix-toggle>
              <helix-toggle value="border">Border</helix-toggle>
              <helix-toggle value="fill">Fill</helix-toggle>
            </helix-toggle-group>

            {/*
             * *Material was an axis the engine took and this could not reach.**
             *               `ThemeIntent.material` is two numbers and the builder wrote neither,
             *               so a theme made here could say how its surfaces separate and not
             *               what they are made of. The header, the menu and the dialog all move
             *               on these, which is why they are the three things the preview opens.
             *
             * *And this is the one control that can cost the guarantee.**
             *               Anything below full stops being a known ground, so a pair over it
             *               comes back `unverifiable` rather than measured, which the pairings
             *               panel says out loud when it happens.
             */}
            <helix-slider
              {...BOUNDS.blur}
              hint="Pixels behind a translucent surface. Zero is flat."
              label="Material blur"
              name="material-blur"
              onInput={(event) => setBlur(Number(event.currentTarget.value))}
              show-value
              value={String(blur)}
            ></helix-slider>

            <helix-slider
              {...BOUNDS.translucency}
              hint="How opaque those surfaces are. Below 100 they stop being a known ground."
              label="Material opacity"
              name="material-opacity"
              onInput={(event) => setTranslucency(Number(event.currentTarget.value))}
              show-value
              value={String(translucency)}
            ></helix-slider>
          </helix-flex>
        </section>

        <div className="themeStage" slot="end">
          {/* `lead="preview"` because this is a place to look. The workbench
              leads with its source, being a place to write; here the artifact is
              an output rather than an input and a reader is judging a palette,
              not editing CSS. */}
          {/*
           *  See `PREVIEW_SHARE` for which pane the number is about, which is
           *               not what the manifest says.
           */}
          <helix-sandbox
            corner-label="Preview, artifact and audit"
            default-split={PREVIEW_SHARE}
            lead="preview"
            /* **Stacked on a phone.** Side by side at 375 the
               sheet pane came out about 130px and every custom property wrapped
               one word to a line, which is the same measurement 244 made of the
               sandbox's source pane. Only the axis changes: `lead` above already says
               preview, at every width, because that is what this tool is for. */
            onhelix-before-split={(event) => {
              setSplit((event.target as HTMLElement & { split: number }).split)
            }}
            orientation={narrow ? 'vertical' : 'horizontal'}
            panel-label="The audit"
            separator-label="Preview and artifact"
            split={split}
          >
            {/* Status rather than settings: what the palette measured, always
                on screen, with the detail one panel away. The form holds every
                input, so a toolbar of controls here would be a second place to
                look for the same thing. */}
            <helix-sandbox-toolbar slot="toolbar">
              {/* **First in the bar above the preview, at every width.** The
                  controls are the other half of this tool and a reader needs to
                  get back to them from here, which on a narrow viewport is the
                  only way back at all. */}
              <helix-tooltip
                content={controlsShown ? 'Hide controls' : 'Show controls'}
                placement="bottom"
              >
                <helix-icon-button
                  label={controlsShown ? 'Hide controls' : 'Show controls'}
                  onClick={() => setControlsShown((open) => !open)}
                >
                  <helix-icon name="sidebar-simple"></helix-icon>
                </helix-icon-button>
              </helix-tooltip>

              <helix-flex align="center" gap="xs">
                {/* **The tone belongs to what the tag counts, not to the run.**
                    Painted `danger` whenever anything failed, "65 pass" is the
                    same red as "2 fail": two identical tags side by side, one of
                    them good news, and the count a reader most wants to see
                    going up is the one that looks like an alarm. */}
                {/*
                 * *Each count opens the panel that lists it.**
                 *
                 *                     The tags say pass, fail, unverifiable and collisions; the
                 *                     panel's tabs say Contrast, Collisions and Unverifiable. Three
                 *                     map by their own word and the fourth cannot: "2 fail" and
                 *                     "65 pass" are both the Contrast tab, and nothing on screen
                 *                     says so. Renaming one to match the other is worse, "2
                 *                     contrast" not being English and "Contrast failures" not being
                 *                     a tab label that fits.
                 */}
                <button className="themeJump" onClick={() => setAudit('contrast')} type="button">
                  <helix-tag emphasis="subtle" tone="success">
                    {counts.pass ?? 0} pass
                  </helix-tag>
                </button>
                {failures.length > 0 ? (
                  <button className="themeJump" onClick={() => setAudit('contrast')} type="button">
                    <helix-tag emphasis="subtle" tone="danger">
                      {failures.length} fail
                    </helix-tag>
                  </button>
                ) : null}
                {unmeasured.length > 0 ? (
                  <button
                    className="themeJump"
                    onClick={() => setAudit('unmeasured')}
                    type="button"
                  >
                    <helix-tag emphasis="subtle" tone="neutral">
                      {unmeasured.length} unverifiable
                    </helix-tag>
                  </button>
                ) : null}
                {theme.collisions.length > 0 ? (
                  <button
                    className="themeJump"
                    onClick={() => setAudit('collisions')}
                    type="button"
                  >
                    <helix-tag emphasis="subtle" tone="warning">
                      {theme.collisions.length} collision
                      {theme.collisions.length === 1 ? '' : 's'}
                    </helix-tag>
                  </button>
                ) : null}
              </helix-flex>
            </helix-sandbox-toolbar>

            {/*
             * *A document of its own, and the leak is what forces it.** As a
             *                 `div` in the site's page the site's own stylesheet reaches it:
             *                 nineteen bare `helix-*` rules in `site.css`, three of which land
             *                 here. Measured, the preview's header computed
             *                 `--app-header-backdrop: none` and
             *                 `--app-header-background-color: transparent` because the masthead
             *                 sets those for itself, so the material control could be dragged
             *                 from zero to forty and the one surface most likely to be glass
             *                 never moved. The drawer took the site's header clearance too, for
             *                 a header that is not above it.
             */}
            <helix-sandbox-preview
              color-mode={scheme}
              label="The themed page"
              layout="fullscreen"
              ref={preview}
              slot="preview"
              src="/sandbox/frame.html"
            ></helix-sandbox-preview>

            {/*
             * *The editor, read-only, rather than a code block.** The
             *                 artifact pane should read as a source file, which is what the
             *                 workbench puts here: line numbers, the same syntax palette, the
             *                 same gutter. A code block is a figure in a page and this is a
             *                 pane in a tool.
             */}
            <helix-sandbox-editor
              field-label="The generated stylesheet"
              language="css"
              name="artifact"
              readonly
              slot="source"
              value={css}
            ></helix-sandbox-editor>

            {/* **Tabs, because these are three different questions.** A
                contrast failure is a token against a ground, a collision is two
                roles against each other, and an unmeasured pair is neither: it
                is a ground nobody can know. Stacked in one column they read as
                one list of complaints, and a reader looking for the second kind
                has to know it exists. */}
            <helix-tabs
              active={audit}
              data-density="sm"
              label="The audit"
              onhelix-before-activate={(event) => setAudit(event.detail.value)}
              slot="panel"
            >
              <helix-tab value="contrast">
                Contrast
                {failures.length > 0 ? ` (${failures.length})` : ''}
              </helix-tab>
              <helix-tab value="collisions">
                Collisions
                {theme.collisions.length > 0 ? ` (${theme.collisions.length})` : ''}
              </helix-tab>
              <helix-tab value="unmeasured">
                Unverifiable
                {unmeasured.length > 0 ? ` (${unmeasured.length})` : ''}
              </helix-tab>

              <helix-tab-panel slot="panels" value="contrast">
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
              </helix-tab-panel>

              <helix-tab-panel slot="panels" value="collisions">
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
              </helix-tab-panel>

              <helix-tab-panel slot="panels" value="unmeasured">
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
              </helix-tab-panel>
            </helix-tabs>
          </helix-sandbox>
        </div>
      </helix-splitter>
    </>
  )
}
