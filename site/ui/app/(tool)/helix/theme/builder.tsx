'use client'

import type { HelixChangeEvent, HelixSandboxPreview } from '@helix-io/styled'
import { type DerivedTheme, initTheme, type ThemeEngine } from '@helix-io/theme'
import { useEffect, useMemo, useRef, useState } from 'react'
import { PreferencesDrawer } from '@/components/preferences/preferences'
import { type Findable, SiteFind } from '@/components/site-find/site-find'
import { SiteMenu } from '@/components/site-nav/site-nav'
import { Wordmark } from '@/components/wordmark/wordmark'
import { type FaceRow, GOOGLE_FACES } from '@/content/faces/faces.generated'
import { useSandboxEditor } from '../../../../hooks/use-sandbox-editor/use-sandbox-editor'
import { THEME_ENGINE } from '../../../../utils/theme-engine/theme-engine'
import {
  BOUNDS,
  type Character,
  INITIAL,
  intentFrom,
  type Mechanism,
  queryFrom,
  SCOPE,
  type Settings,
} from './defaults'
import { THEMED_PAGE_STYLES } from './themed-page-styles'
import { FACE_SAMPLE, useFacePreviews } from './use-face-previews'
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
 * **Because two thousand alphabetical families is a wall**, and a combobox that filters
 * as it is typed into answers "I know what I want" rather than "show me
 * something reasonable". Six of them led the list already, which helped the
 * second reader and left the other 1,933 in one undifferentiated run.
 */
interface FaceGroup {
  faces: Face[]
  label: string
}

const SYSTEM: Face = { category: 0, family: '', label: 'System default' }

/**
 * Every Google family, rather than the six somebody happened to like.
 *
 * The nine hardcoded here were a list, not a judgment: they carried the exact
 * weights the token layer uses because each was written out by hand, which is
 * precisely what does not scale and precisely what `bun run faces` now does for
 * two thousand of them. A family is offered when it can serve at least one of 400, 500
 * and 600, and asked for the ones it has: the same request against a family
 * shipping only 400 and 700 returns a stylesheet missing two weights and a page
 * that synthesizes the difference.
 *
 * **The policy did not have to change to allow this**, which is the point the
 * row this came from makes. The builder already fetched `fonts.googleapis.com`
 * and already argued why. A longer list is a longer list.
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

/* **`!== 1` rather than `=== 0`.** The third field is a category now and
   monospace kept the 1 it had, so the mono half is unchanged and the
   proportional half is every other category rather than the one value that used
   to mean "not mono". Read the old way, this list would have held sans-serif
   alone and lost 1,172 serif, display and handwriting families in silence. */
const CATALOG: Face[] = GOOGLE_FACES.filter((row) => row[2] !== 1).map(fromCatalog)
const CATALOG_MONO: Face[] = GOOGLE_FACES.filter((row) => row[2] === 1).map(fromCatalog)

/**
 * The six that lead every dropdown, under a heading of their own.
 *
 * These are the ones the builder used to offer, so a reader who opened it before
 * sees what they saw, and a reader with no opinion gets a short list of faces
 * that read well at the sizes the token layer sets rather than the first six
 * words in the alphabet.
 *
 * **"Recommended" is the honest word for them**, and it was worth checking
 * rather than assuming: they are not the most downloaded, not the newest and not
 * a partnership. They are the ones somebody tried at these sizes and kept, which
 * is what a reader hears when a font picker says recommended.
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
 *
 * **A face appears once.** The recommended group is drawn from the categories
 * below it, so those exclude it: two options carrying one value is a select that
 * shows the wrong word for the right choice, and a reader scrolling past Inter
 * twice has no way to know the two are the same.
 *
 * **Empty groups are dropped rather than rendered empty**, which matters for the
 * monospace field, where three of the five categories cannot occur at all.
 * Filtering is the listbox's own and it already hides a group whose options a
 * filter has all hidden, so this only has to answer for the ones that were never
 * going to have members.
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

/**
 * The resting option, which sits above every group and belongs to none.
 *
 * It is not a face and grouping it with faces would say it is one. Rendered
 * loose before the first group, the way a select's own empty option is.
 */
const FACE_GROUPS: FaceGroup[] = grouped(CATALOG, LEADING)

/**
 * The same groups, with a different word for choosing none.
 *
 * `--helix-font-display` is emitted as `display ?? body`, so leaving this alone
 * does not fall back to the system, it follows whatever the body face is: pick
 * Fraunces for the body and the headings are Fraunces too. `Same as body` is
 * true in both cases, the body face being the system default when nobody has
 * chosen one, where `System default` is true only while it is unset.
 */
const DISPLAY_REST: Face = { category: 0, family: '', label: 'Same as body' }

/* Monospace is a category in the catalog rather than a list here, so a face that
   calls itself mono is offered where mono is asked for and nowhere else. The
   three that used to be hardcoded lead it for the same reason as above. */
const MONO_LEADING = ['JetBrains Mono', 'IBM Plex Mono', 'Space Mono']

const MONO_GROUPS: FaceGroup[] = grouped(CATALOG_MONO, MONO_LEADING)

const MONO_REST: Face = { category: 1, family: '', label: 'System mono' }

/** Every face carrying a Google request, for the fonts URL to look one up in. */
const ALL_FACES: Face[] = [...CATALOG, ...CATALOG_MONO]

/**
 * The options inside a face dropdown: the resting one loose, then the groups.
 *
 * Written once because three fields render it and the only things that differ
 * are which catalog and which word for choosing none. Three copies would be
 * three chances for one of them to lose its grouping in a later edit.
 *
 * The resting option is not in a group because it is not a face, and putting it
 * under `Recommended` would recommend the absence of one.
 */
const faceOptions = (groups: FaceGroup[], rest: Face) => (
  <>
    <helix-option value={rest.family}>{rest.label}</helix-option>
    {groups.map((group) => (
      <helix-option-group key={group.label} label={group.label}>
        {group.faces.map((face) => (
          <helix-option key={face.family} value={face.family}>
            {face.label}
            {/* **The specimen, after the name.**

                `Ag` because two letters carry the most: an ascender, a bowl, a
                descender, and the terminal on the g, which is where a grotesque
                and a humanist part company. Longer samples say no more and take
                the width the name needs.

                The `end` slot rather than the start, so the names stay flush
                against the left edge a reader is scanning down. The column is a
                fixed width so its own right edge does not go ragged: `Ag` set in
                Playfair Display is wider than in Inter, and a thousand rows of
                that reads as a broken list rather than as type that varies.

                **The skeleton is not decoration.** `display=swap` means an
                unloaded sample renders in the fallback face, so without it a row
                saying `Playfair Display` would show `Ag` set in Inter: not
                blank, which a reader forgives, but wrong, which a reader
                believes. A stand-in says the face has not arrived, which is the
                one thing the fallback cannot say about itself.

                `aria-hidden` on the wrapper rather than on both children, which
                hides the subtree in one place and keeps the option's accessible
                name the family name it already was.

                `data-face-request` is what `useFacePreviews` observes, and it
                writes `data-face-ready` back when the face has actually loaded.
                The two swap on that, so neither is guessing. */}
            <span aria-hidden="true" className="themeFace" slot="end">
              {/* **The face is named here or the sample is a lie.** It is the
                  one thing in this markup that cannot be moved to a stylesheet,
                  a rule per family being a rule per family. Dropped once during
                  an edit and not noticed by eye: every sample rendered in the
                  page's own face, so a thousand rows showed one typeface wearing
                  a thousand names, which is the exact failure the skeleton beside
                  it exists to prevent. Caught by measuring the rendered glyphs
                  rather than by looking at them. */}
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
   * **This is what the engine being synchronous used to buy for free.** It ran
   * during server rendering without anybody arranging it, so the first paint
   * carried a real palette: the slider ramps, which are drawn off the *derived*
   * primary rather than the brand, and the emitted block, and the counts. The
   * engine is WebAssembly now and instantiates asynchronously, and measured
   * without this the ramps appeared 287ms after navigation, of which 26ms was
   * the module transfer and the rest was hydration.
   */
  initialTheme: DerivedTheme
  /** How much page there is, which is the axis the context is not. */
  layouts: readonly { label: string; value: string }[]
  /**
   * The preview's page, already a string, once per layout and context.
   *
   * Rendered by the server component above, for the reason written out there:
   * taking it back out of the DOM with `innerHTML` loses every value React set
   * as a property rather than as an attribute, which on a client navigation is
   * all of them.
   *
   * **Keyed by the pair**, and the labels arrive separately, so this component
   * never imports `themed-page.tsx`. It is a client component and that module
   * is three page skeletons nothing renders in a browser: importing it to read
   * six labels would ship all of them.
   */
  markup: Readonly<Record<string, string>>
}) {
  useSandboxEditor()

  const [menuOpen, setMenuOpen] = useState(false)
  const [prefsOpen, setPrefsOpen] = useState(false)

  /**
   * Whether the controls are on screen, and how much room they take when they
   * are.
   *
   * **One control at every width, because the answer is the same question.** The
   * sandbox learned this the hard way: it had a toggle in the toolbar that did
   * nothing on a phone and a second button in the masthead that did the work.
   * Here there is one, and what changes with the viewport is how far the pane
   * opens rather than what the button means.
   *
   * **The pane collapses rather than unmounting.** The stage holds an iframe, and
   * wrapping it in a condition would tear it down and reload it every time a
   * reader opened the form. That is the same reasoning the sandbox's rail
   * carries, and it is why this is a splitter position rather than a drawer.
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

  /* Nearly the whole width on a phone, because a column of labeled fields at a
     quarter of 375px is the thing 244 measured and called a column rather than a
     form. A sliver is left so the preview says it is still there. */
  const controlsPosition = controlsShown ? (narrow ? 88 : 24) : 0

  /* **Declared, so the consumer owns it and answers `helix-change`**, which is
     the contract the typings state and refuse a `position` without. A reader
     dragging the separator to the edge has shut the pane, and the toggle has to
     hear that or it goes on saying "Hide controls" over a pane that is already
     gone. Two per cent rather than zero, because a drag that lands a pixel short
     of the edge is still a reader shutting it. */
  const controlsMoved = (event: HelixChangeEvent) => {
    if (event.detail.property === 'position') {
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

  /* **What the preview pretends to be, and neither is part of the theme.**
     They change no token, appear in no artifact and are measured by nothing:
     the palette a reader leaves with is identical whichever pair is chosen. So
     they live here rather than in `Settings`, they are absent from
     `intentFrom`, and `reset` leaves them alone, `reset` being about the
     shipped values rather than about what a reader is looking at while they
     depart from them.

     **Two pieces of state because they are two questions.** A minimal
     storefront and a dense storefront are both real, so a single list of every
     combination would be nine rows a reader has to read to find the two facts
     they are choosing between.

     The first entry of each list is its resting one, which is the convention
     the generated lists are ordered by. */
  /**
   * Which of the audit's three panels is open.
   *
   * **Held here because the toolbar has to be able to move it.** The tags above
   * the preview count what the panel lists, and a reader with "2 fail" had no
   * way to get from the count to the list: the tag says fail and the tab says
   * Contrast, so the one mapping nobody could guess was the one that mattered.
   * Clicking a tag opens its panel now, which answers it by doing rather than by
   * renaming.
   *
   * `active` on Tabs is a seed and a correction rather than a strict controlled
   * property, so the set still moves itself on a click and this only has to
   * agree with it. Answering `helix-change` is what keeps them agreeing.
   */
  const [audit, setAudit] = useState('contrast')

  const [context, setContext] = useState(initialContext ?? contexts[0]?.value ?? '')
  const [layout, setLayout] = useState(initialLayout ?? layouts[0]?.value ?? '')

  const source = markup[`${layout}:${context}`] ?? ''

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

  /**
   * The link, kept current, so a reader can bookmark a theme or send one.
   *
   * **`replaceState` rather than the router.** `router.replace` re-runs the
   * server component, which would re-derive the theme on a server once per
   * frame of a slider drag to produce a palette this browser has already
   * derived. Nothing about the page needs to change: the URL is a record of
   * what is on screen, not a request for it.
   *
   * **Debounced, because `replaceState` is rate limited.** A slider announces
   * on every pointer move, and Safari has throttled history writes at around a
   * hundred per thirty seconds for years. A quarter second after the reader
   * stops is indistinguishable from live for something nobody reads until they
   * copy it, and it costs one write per gesture instead of forty.
   *
   * **Not on the first pass**, or a reader arriving at the bare `/helix/theme`
   * would have its query rewritten before they touched anything. There is
   * nothing to record until something moves.
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
  }, [fontsHref, framed, source])

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

      {/* A splitter for the form, and `helix-sandbox` for everything else.

          **The same component the workbench uses**, rather than a grid shaped
          like it. It already owns the two-pane split, the collapsible bottom
          panel, the toolbar row and the separators a keyboard can move, and all
          of that was going to be rebuilt here badly. What it does not carry is
          file tabs, because a theme has one artifact and not four. */}
      <helix-splitter
        className={styles.workbenchBody}
        default-position={24}
        onhelix-change={controlsMoved}
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

            {/* **A preview control, in the form, because every input is.** The
                toolbar above is status and the form is settings, which the
                toolbar's own comment argues; a control up there would be a
                second place to look for the same kind of thing.

                First, because it is the frame rather than a setting: a reader
                picks it once and then judges everything else against it. What
                keeps it from reading as the most important *theme* decision is
                the hint, which says out loud that it changes no token. It is
                absent from `Settings` and from `reset` for the same reason. */}
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

            {/* **The second axis, and it is a second control because two of the
                answers can be true at once.** A minimal storefront and a dense
                storefront are both real arrangements, so who is speaking and how
                much page they speak on are independent questions. Nine rows in
                one list would make a reader read every combination to find the
                two facts they are choosing.

                The hint says what it costs, because it does cost something: a
                sparse layout has no chart and nothing that floats, so two of
                the controls further down stop having anything on screen to act
                on. The audit is unaffected, measuring the palette rather than
                what is displayed. */}
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
              hint="How far around the wheel the accent sits from the brand, in degrees."
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
                choice.** Select shows the chosen options' words or its
                placeholder, and an option whose value is the empty string
                contributes no word, so all three of these read `Choose` while
                sitting on a real, named answer. The option stays in each list so
                there is a way back to it, and both states now read alike. */}
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
            /* **Stacked on a phone.** Side by side at 375 the
               sheet pane came out about 130px and every custom property wrapped
               one word to a line, which is the same measurement 244 made of the
               sandbox's source pane. Only the axis changes: `lead` above already says
               preview, at every width, because that is what this tool is for. */
            onhelix-change={(event) => {
              if (event.detail.property === 'split') {
                setSplit((event.target as HTMLElement & { split: number }).split)
              }
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
                    This was `danger` whenever anything failed, so a palette with
                    two bad pairs painted "65 pass" the same red as "2 fail":
                    two identical tags side by side, one of them good news, and
                    the count a reader most wants to see going up was the one
                    that looked like an alarm. The failures have their own tag
                    and it is already red. */}
                {/* **Each count opens the panel that lists it.**

                    The tags say pass, fail, unverifiable and collisions; the
                    panel's tabs say Contrast, Collisions and Unverifiable. Three
                    map by their own word and the fourth cannot: "2 fail" and
                    "65 pass" are both the Contrast tab, and nothing on screen
                    said so. Renaming one to match the other was the candidate
                    against this and is worse, "2 contrast" not being English and
                    "Contrast failures" not being a tab label that fits.

                    **Still status rather than settings**, which is the rule the
                    toolbar's own comment sets and this does not break: none of
                    them changes the theme. A count that opens its own detail is
                    a shortcut to reading, not a control over the palette.

                    A real `button` around the tag rather than a handler on it. A
                    tag is not an affordance, and the keyboard, the focus ring and
                    the announcement all come free from the element that is. */}
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
            <helix-tabs
              active={audit}
              data-density="sm"
              label="The audit"
              onhelix-change={(event) => setAudit(event.detail.value)}
              slot="panel"
            >
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
