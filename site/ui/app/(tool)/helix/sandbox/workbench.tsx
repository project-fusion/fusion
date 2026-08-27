'use client'

import { scrollItemIntoView } from '@helix-io/core'
import { htmlToJsx, jsxToHtml } from '@helix-io/sandbox'
import type { HelixSandboxEditor } from '@helix-io/sandbox/editor'
import type {
  HelixBeforeEditEvent,
  HelixBeforeResizeEvent,
  HelixDialog,
  HelixInput,
  HelixMenu,
  HelixSandbox,
  HelixSandboxPreview,
  HelixSandboxTerminal,
  HelixSelectEvent,
  HelixSplitter,
  HelixTabs,
  HelixToggleGroup,
  HelixTree,
  HelixTreeItem,
} from '@helix-io/styled'
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { PreferencesDrawer } from '@/components/preferences/preferences'
import { type Findable, SiteFind } from '@/components/site-find/site-find'
import { SiteMenu } from '@/components/site-nav/site-nav'
import { Wordmark } from '@/components/wordmark/wordmark'
import type { Family } from '../../../../content/catalog/catalog'
import { useApiTier } from '../../../../hooks/use-api-tier/use-api-tier'
import { useElementRef } from '../../../../hooks/use-element-ref/use-element-ref'
import { useSandboxEditor } from '../../../../hooks/use-sandbox-editor/use-sandbox-editor'
import styles from '../workbench.module.css'
import { readHashState, writeHashState } from './hash-state'
import { DEFAULTS, readUrlState, type Section, writeUrlState } from './url-state'

/**
 * The sandbox workbench: source files, a live preview, and the example tree.
 *
 * What you are looking at lives in the URL, so the address bar is the share
 * format. How you are looking at it, the split and the preview theme, is local
 * to the session.
 */

interface Props {
  families: Family[]
  /** Where the palette can go, built on a server by the page above. */
  findable?: Findable[]
}

/**
 * Which syntax the example is written in.
 *
 * One file, not three: the syntaxes are the same tree said differently, and
 * showing all of them at once invites a reader to edit one and wonder why the
 * others disagree. What is on screen is what runs.
 */
/* Two files, not three. `index.jsx` was here and produced the same bytes as
   `index.tsx`: an example is Helix elements with attributes, so there is no
   annotation, no generic, and nothing else for TypeScript to hold. It was one
   more row in the menu, one more file name, and no difference on screen. TSX is
   the one kept, because a consumer scaffolding a React app gets TypeScript by
   default and that is the file they will be pasting into. */
const SYNTAXES = [
  { file: 'index.html', label: 'HTML', language: 'html', value: 'html' },
  { file: 'index.tsx', label: 'TSX', language: 'tsx', value: 'tsx' },
] as const

type Syntax = (typeof SYNTAXES)[number]['value']

/** What the stylesheet opens with, so the file is not a blank box. */
const CSS_START = '/* Styles for this example. They apply to the preview. */\n'

/** How the preview lays the example out. */
const LAYOUTS = [
  { label: 'Padded', value: 'padded' },
  { label: 'Centered', value: 'centered' },
  /* Shrinks the example to its content and centers that, rather than centering
     a full-width box whose ink sits at the start. Most Helix roots are
     full-width blocks, so the two read very differently for a third of them. */
  { label: 'Hugged', value: 'hug' },
  { label: 'Fullscreen', value: 'fullscreen' },
] as const

/** Which way the preview reads. */
const DIRECTIONS = [
  { label: 'Left to right', value: 'ltr' },
  { label: 'Right to left', value: 'rtl' },
] as const

/** The files a sandbox shows: the example, in one syntax, and its stylesheet. */
type Pane = 'source' | 'css'

/**
 * Where the arrangement is kept between visits.
 *
 * The site's business, not the sandbox's. What a reader dragged is a preference
 * about this page, and a component that wrote to storage on its own would be
 * deciding for every consumer that it should, under a key it chose.
 */
const ARRANGEMENT = 'fusion-sandbox-arrangement'

/** How wide the examples rail opens to, in pixels. The 17rem it always was. */
const RAIL_OPEN = 272

interface Arrangement {
  panelSize?: number
  split?: number
  syntax?: Syntax
}

const readArrangement = (): Arrangement => {
  try {
    return JSON.parse(window.localStorage.getItem(ARRANGEMENT) ?? '{}') as Arrangement
  } catch {
    // Storage can be unavailable or hold something else entirely. An arrangement
    // is a convenience, so a broken one is worth nothing more than the default.
    return {}
  }
}

const resolve = (families: Family[], familySlug: string | null, exampleSlug: string | null) => {
  const withExamples = families.filter((entry) => entry.examples.length > 0)
  const family =
    withExamples.find((entry) => entry.slug === familySlug) ?? (withExamples[0] as Family)
  const example = family.examples.find((entry) => entry.slug === exampleSlug) ?? family.examples[0]
  return { example, family, withExamples }
}

export function SandboxWorkbench({ families, findable = [] }: Props) {
  useSandboxEditor()

  const preview = useRef<HelixSandboxPreview>(null)
  const _files = useRef<HelixToggleGroup>(null)
  /* Held as state, not as a ref: an effect observes the splitter's width and a
     memo reads the tree's rows, and both have to run when the element arrives,
     which a `RefObject` cannot announce. */
  const scroller = useRef<HTMLDivElement>(null)
  const [tree, setTree] = useElementRef<HelixTree>()
  const [railSplitter, setRailSplitter] = useElementRef<HelixSplitter>()

  /* Handlers are props now. An element rendered in two places, which the
     examples tree is, gets the prop in both, and React binds whichever one it
     rendered. The ref dance this used to need existed because a `RefObject`
     cannot say that its `.current` moved. */
  const sandbox = useRef<HelixSandbox>(null)
  const panelTabs = useRef<HelixTabs>(null)
  const _settings = useRef<HelixMenu>(null)
  const [layout, setLayout] = useState<'padded' | 'centered' | 'fullscreen' | 'hug'>('padded')
  const [direction, setDirection] = useState<'ltr' | 'rtl'>('ltr')
  const [showEditor, setShowEditor] = useState(true)
  const [showPanel, setShowPanel] = useState(true)
  // Off. It reports the caret and the language, which is worth having while
  // typing and is noise the rest of the time.
  const [showStatus, setShowStatus] = useState(DEFAULTS.panes.includes('status'))
  const terminal = useRef<HelixSandboxTerminal>(null)
  const editors = useRef<Record<string, HelixSandboxEditor | null>>({})
  const [familySlug, setFamilySlug] = useState<string | null>(null)
  const [exampleSlug, setExampleSlug] = useState<string | null>(null)
  const [pane, setPane] = useState<Pane>('source')
  const [syntax, setSyntax] = useState<Syntax>('html')
  /* The text as it is on screen, in whichever syntax is showing, and not a
     canonical form the editor is a rendering of. It was HTML, and the JSX view
     was `htmlToJsx` of it while every keystroke was `jsxToHtml` back: a round
     trip through two converters on every character, which never reproduces
     half-typed markup, so the editor was handed a different document than the
     one being typed into and replaced it. Held as-is, what the editor emits is
     exactly what comes back, and the conversion happens where it is actually
     needed. */
  /* What is in the editor now, and in which language, so the effect below can
     tell "a new example arrived" from "the same one, asked for differently". */
  const seeded = useRef<{ example: string; syntax: Syntax } | null>(null)
  /* The markup as the example handed it over, which is what "edited" is measured
     against. A flag set on the first keystroke would stay set after the reader
     put it back, and typing a character and deleting it is not a change worth
     stopping anyone over. */
  const pristine = useRef('')
  /* An environment change a reader has been asked about but not yet agreed to.
     Held rather than applied, because the conversion is the thing being
     confirmed and doing it first would leave nothing to cancel. */
  const [pendingSyntax, setPendingSyntax] = useState<Syntax | null>(null)
  const confirmSyntax = useRef<HelixDialog | null>(null)
  /* Where the divider is, held here rather than left on the element. Hiding the
     editor drives the split to zero, so showing it again has to put a number
     back, and the number it has to put back is the one it had. This was
     `undefined` meaning "the default", which is not a size: it reached the
     stylesheet as `undefined%` and cost the sandbox its entire grid template. */
  const [split, setSplit] = useState(50)
  /* What the address bar carried in, read during render because the seeding
     effect below runs before anything that could have written it, and paired
     with *which example it was meant for*.
   *
   * The pairing is the whole of it. The workbench seeds a default example one
   * render before the query's `e=` has been resolved into state, so an edit
   * consumed on the first seed lands on the wrong component entirely: traced,
   * a fragment arriving for `card.default` was spent on `accordion/default`,
   * and by the time the card was seeded there was nothing left to give it.
   * Which is why the first attempt at this looked like the fragment being
   * ignored, when it was being applied to something nobody was looking at.
   *
   * Null on the server, where there is no address to read. */
  const arrived = useRef(
    typeof window === 'undefined'
      ? null
      : {
          ...readHashState(window.location.hash),
          ...(({ example, family }) => ({ example, family }))(readUrlState(window.location.search)),
        },
  )

  const [markup, setMarkup] = useState('')
  const [css, setCss] = useState(CSS_START)
  // Unset means the preview follows the page. A reader who has chosen a mode
  // for the site has said how they want to look at things, and a preview that
  // ignored it would be the one part of the page that did.
  const [previewTheme, setPreviewTheme] = useState<'dark' | 'light' | null>(null)
  const [siteTheme, setSiteTheme] = useState<'dark' | 'light'>('dark')
  const [copied, setCopied] = useState(false)
  const [filter, setFilter] = useState('')
  const filterRef = useRef<HelixInput>(null)

  /* Focus and select, so a second press of `/` replaces what is there rather
     than appending to it: the key means "start filtering", and starting again is
     what pressing it twice asks for. */
  const focusFilter = useCallback(() => {
    filterRef.current?.focus()
    filterRef.current?.select()
  }, [])
  // Null is "nobody has said", which is the current family open and the rest
  // shut. Once the button is pressed it is an answer, and it holds.
  const [expandAll, setExpandAll] = useState<boolean | null>(null)
  const [railOpen, setRailOpen] = useState(false)
  /* How wide the examples rail is, in pixels.
   *
   * Pixels rather than the share of the window a splitter works in, and for the
   * same reason the sandbox holds its panel that way: a navigation column is a
   * column of names, and a share of a wide screen makes it a column of names
   * with half a screen of space after them. The conversion happens here, where
   * the box is known.
   */
  const [railSize, setRailSize] = useState(RAIL_OPEN)
  const [bodyWidth, setBodyWidth] = useState(0)
  // The rail on a wide screen, which is a different thing from the drawer a
  // phone gets: one is a region of the layout and the other is an overlay.
  const [showRail, setShowRail] = useState(DEFAULTS.panes.includes('rail'))
  const [prefsOpen, setPrefsOpen] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [narrow, setNarrow] = useState(false)

  /* Measured on layout and then watched, so a rail asked for at 272px keeps
     that width when the window changes rather than the share of it that
     happened to be.
   *
     The measurement is taken here rather than left to the observer's first
     callback. `ResizeObserver` delivers from the rendering lifecycle, so a
     document that is not being painted runs none of them, and a width of zero
     reads as a rail shut: the column simply never appeared. The sandbox learned
     the same thing about its panel. */
  useLayoutEffect(() => {
    if (!railSplitter) {
      return
    }
    setBodyWidth(railSplitter.getBoundingClientRect().width)
    const watch = new ResizeObserver(([entry]) => {
      setBodyWidth(entry?.contentRect.width ?? 0)
    })
    watch.observe(railSplitter)
    return () => watch.disconnect()
  }, [railSplitter])

  /* A hundred is the rail shut, which puts the divider on the trailing edge
     where the splitter draws no line: a boundary needs two sides, and it takes
     that away itself rather than needing the border switched off here. */
  /** Whether the examples are on screen, as a pane on a wide viewport and as a
   * drawer on a narrow one. The toggle reads this rather than either state, so
   * it says the same thing at both widths. */
  const railShown = narrow ? railOpen : showRail

  /* **Always shut on a narrow viewport, because the rail is not in the splitter
     there.** It moves to a drawer below, and the `slot="end"` pane is not
     rendered at all, so a position under a hundred left the divider partway
     across with nothing on the far side: measured at 375, the whole workbench
     was squeezed into a 103px start pane with the preview stranded beneath it,
     which is what 279 was reported as. `showRail` still governs the drawer. */
  const railPosition =
    !narrow && showRail && bodyWidth > 0 ? Math.max(0, 100 - (railSize / bodyWidth) * 100) : 100

  /* Where a double click on the divider puts it back to, which is the width the
     rail opens at rather than the splitter's own half-and-half. Shut, the
     divider is still there and still takes a double click, so this is the way
     back from nothing without reaching for the toggle. */
  const railHome = bodyWidth > 0 ? Math.max(0, 100 - (RAIL_OPEN / bodyWidth) * 100) : 100

  const railMoved = (event: HelixBeforeResizeEvent) => {
    if (event.detail.property !== 'position' || bodyWidth <= 0) {
      return
    }
    const width = ((100 - Number(event.detail.value)) / 100) * bodyWidth
    // Dragged off the edge is a reader opening it, which the toggle has to hear
    // or its label goes on saying "Show examples" over an open rail.
    setShowRail(width > 1)
    if (width > 1) {
      setRailSize(width)
    }
  }

  // Read the URL after mount, not during render: the page is static, so the
  // server has no query string and reading one would make the first paint
  // disagree with the address bar. The stored arrangement is read here for the
  // same reason.
  useEffect(() => {
    const url = readUrlState(window.location.search)
    setRead(true)
    setFamilySlug(url.family)
    setExampleSlug(url.example)
    setLayout(url.layout)
    setDirection(url.direction)
    setSyntax(url.syntax)
    setPreviewTheme(url.colorMode)
    setForcedTier(url.tier)
    setShowEditor(url.panes.includes('editor'))
    setShowPanel(url.panes.includes('panel'))
    setShowStatus(url.panes.includes('status'))
    setShowRail(url.panes.includes('rail'))
    setSiteTheme(document.documentElement.dataset.colorMode === 'light' ? 'light' : 'dark')

    const stored = readArrangement()
    // Only when the address did not say. A link that names a language is a
    // statement about what to show; what this browser last chose is not.
    if (stored.syntax && !new URLSearchParams(window.location.search).has('x')) {
      setSyntax(stored.syntax)
    }
    if (typeof stored.split === 'number') {
      setSplit(stored.split)
    }
    if (sandbox.current && typeof stored.panelSize === 'number') {
      sandbox.current.panelSize = stored.panelSize
    }
  }, [])

  // Written back when a divider is let go, not while it is moving: a drag is a
  // stream of positions and only the one it ends at is a preference.
  const sandboxChanged = (event: HelixBeforeResizeEvent) => {
    /* Both dividers report themselves now, where this was one `arrangement`
       event carrying a JSON blob nothing read: the handler has always taken the
       numbers off the element below. */
    const settled = event.detail.property
    if (settled !== 'split' && settled !== 'panelSize') {
      return
    }
    const element = sandbox.current
    if (!element) {
      return
    }
    /* Back into state as well as into storage. The split is a prop now, so a
       drag that moved the element without telling React would be undone by the
       next render putting the old number back. Only where the editor is
       showing: with it off the split is being held at zero deliberately, and
       taking that as the new resting place would lose the size to come back
       to. */
    if (showEditor) {
      setSplit(element.split)
    }
    window.localStorage.setItem(
      ARRANGEMENT,
      JSON.stringify({ panelSize: element.panelSize, split: element.split, syntax }),
    )
  }

  // Watched, not read once: the preferences drawer is on this page now, so the
  // site's mode can change while the sandbox is open and a preview following it
  // has to notice.
  useEffect(() => {
    const root = document.documentElement
    const sync = () => setSiteTheme(root.dataset.colorMode === 'light' ? 'light' : 'dark')
    sync()
    const watch = new MutationObserver(sync)
    watch.observe(root, { attributeFilter: ['data-color-mode'], attributes: true })
    return () => watch.disconnect()
  }, [])

  // Side by side is unusable on a phone: at 375px a 45/55 split leaves two
  // slivers. Orientation is a property rather than a stylesheet override,
  // because the component lays the panes out and only it knows how.
  useEffect(() => {
    const query = window.matchMedia('(max-width: 60rem)')
    const sync = () => setNarrow(query.matches)
    sync()
    query.addEventListener('change', sync)
    return () => query.removeEventListener('change', sync)
  }, [])

  /* The reader's tier decides which examples exist here, not which ones are
     painted over. The reference pages render both tiers and let CSS hide one,
     because they are static and the preference is in `localStorage`; this is a
     client component that has already read it, so it can drop the examples of
     the other tier from the data and never build the rows at all. Hiding is
     what put two rows called "Preview" in this rail: the stylesheet doing the
     work only reached the surface it was written for.
     `base` is what the drawer calls it and `headless` is what the manifest
     calls the tier those examples render, which is the same tier under the two
     names each surface already uses. */
  /* **The address wins over the drawer, and never writes back to it.**
     `useApiTier` reads the reader's own setting, which is theirs and applies to
     every page. A link that names a tier is saying what *this* sandbox is
     about, so it forces the answer here and leaves `localStorage` alone:
     following somebody's link must not re-set your own preference, which is the
     half of the color-mode argument in `url-state.ts` that still applies to a
     tier. Null until the URL is read, which is after mount, so the first paint
     follows the drawer exactly as it did. See 211. */
  /* Whether the address has been read yet.
     **State rather than a ref, and the difference is the whole fix.** A ref set
     inside the reading effect is true before the values it read have landed:
     effects run in order on one flush, so the writing effect below saw
     `read.current === true` beside a `familySlug` still null, wrote an empty
     query and emptied the address of the link it had just arrived on. Measured,
     not reasoned about: `?e=accordion.default&l=centered&d=rtl&tier=headless`
     became `/helix/sandbox` within a frame. A `setState` batches with the other
     setters, so this turns true on the same render that carries the values, and
     the effect that reads it cannot run early. */
  const [read, setRead] = useState(false)
  const [forcedTier, setForcedTier] = useState<'headless' | 'styled' | null>(null)
  const preferredTier = useApiTier()
  const wanted = (forcedTier ?? preferredTier) === 'headless' ? 'headless' : 'styled'
  const inTier = useMemo(() => {
    const kept = families.map((entry) => ({
      ...entry,
      examples: entry.examples.filter((item) => item.tier === wanted),
    }))
    /* A floor, not a feature. `resolve` has to come back with an example for
       the panes to have anything to show, so a tier nothing has written an
       example for yet would leave the workbench with nothing to open. Three
       families carry headless examples today and #135 is about the rest. */
    return kept.some((entry) => entry.examples.length > 0) ? kept : families
  }, [families, wanted])

  const { example, family, withExamples } = resolve(inTier, familySlug, exampleSlug)
  const current = SYNTAXES.find((entry) => entry.value === syntax) ?? SYNTAXES[0]

  const select = useCallback((value: string) => {
    const [nextFamily, nextExample] = value.split('/')
    if (!nextFamily || !nextExample) {
      return
    }
    setFamilySlug(nextFamily)
    setExampleSlug(nextExample)
    setRailOpen(false)
  }, [])

  /* The applied value, off the target, because this binds the native `input`.
   *
   * The pair matters and the wrong half of it is a field that cannot be typed
   * into. `helix-before-change` announces what is being *proposed*, before the
   * element has moved, so reading the host there sets the filter to what it
   * already was and the text goes back: the sandbox's own examples were
   * unfilterable that way. The native `input` fires after the element applied,
   * so the target is the answer, which is what every handler ever written
   * expects. See 294. */
  const filterChanged = (event: Event & { currentTarget: HelixInput }) => {
    setFilter(event.currentTarget.value)
  }

  const paneChosen = (event: Event & { currentTarget: HelixToggleGroup }) => {
    setPane(event.currentTarget.value as Pane)
  }
  // Verbatim. What is typed is what is held and what is handed back.
  const paneEdited = (event: HelixBeforeEditEvent) => {
    const pane = event.composedPath()[0] as { name?: string }
    if (pane?.name === 'source') {
      setMarkup(event.detail.value)
    } else if (pane?.name === 'css') {
      setCss(event.detail.value)
    }
  }
  /**
   * Switches the language the example is written in.
   *
   * Split out because two callers reach it now: the menu, where there is nothing
   * to lose, and the confirmation below, where the reader has said to go ahead.
   */
  const applySyntax = (next: Syntax) => {
    setSyntax(next)
    setPane('source')
    const element = sandbox.current
    window.localStorage.setItem(
      ARRANGEMENT,
      JSON.stringify({
        panelSize: element?.panelSize,
        split: element?.split,
        syntax: next,
      }),
    )
  }

  /* Escape and the backdrop close it too, and neither goes through a button.
     `open` is a prop here, so a close this file did not hear about would leave
     the dialog shut and the state saying it was open, and the next edit would
     reopen it. */
  const confirmClosed = () => {
    setPendingSyntax(null)
  }

  // One listener for the whole menu: the value says which setting and, where
  // it drilled down, which option.
  const settingChosen = (event: HelixSelectEvent) => {
    const [setting, option] = event.detail.value.split(':')
    if (setting === 'syntax' && option) {
      const next = option as Syntax
      if (next !== syntax && markup !== pristine.current) {
        setPendingSyntax(next)
        return
      }
      applySyntax(next)
    } else if (setting === 'layout' && option) {
      setLayout(option as 'padded' | 'centered' | 'fullscreen' | 'hug')
    } else if (setting === 'direction' && option) {
      setDirection(option as 'ltr' | 'rtl')
    } else if (setting === 'color' && option) {
      setPreviewTheme(option === 'site' ? null : (option as 'dark' | 'light'))
    } else if (setting === 'editor') {
      setShowEditor((was) => !was)
    } else if (setting === 'panel') {
      setShowPanel((was) => !was)
    } else if (setting === 'status') {
      setShowStatus((was) => !was)
    }
  }
  const exampleChosen = (event: HelixSelectEvent) => {
    select(event.detail.value)
  }

  /* The address follows the sandbox, in one place rather than at each of the
     handlers that can change it. `replaceState`, not `pushState`: turning the
     panel off is not somewhere to go Back to, and a settings menu that filled
     the history would make the browser's own Back button useless for leaving.

     Guarded on whether the address has been read, which is a different question
     from whether an example is open and used to be answered with the same
     value. `familySlug` is null before the first effect runs, so testing it did
     stop the empty write that would have replaced a real query on load. It is
     also null for as long as nobody has chosen an example, and at a bare
     `/helix/sandbox` that is forever: every setting a reader changed there,
     tier and layout and direction and panes and syntax alike, went unrecorded,
     while the same sandbox reached from a component's preview worked because
     that link always carries `?e=`. One symptom, two paths, and the difference
     was a proxy standing in for a fact. `read` is the fact. */
  useEffect(() => {
    if (!read) {
      return
    }
    const panes: Section[] = []
    if (showEditor) {
      panes.push('editor')
    }
    if (showPanel) {
      panes.push('panel')
    }
    if (showRail) {
      panes.push('rail')
    }
    if (showStatus) {
      panes.push('status')
    }
    const query = writeUrlState({
      colorMode: previewTheme,
      direction,
      example: exampleSlug,
      family: familySlug,
      layout,
      panes,
      syntax,
      /* **What is being shown, not only what the address asked for.**
         `forcedTier` is null unless the URL carried one, so writing it back
         meant a reader who switched to base in the drawer got a link that said
         styled: following it showed the other package, which is exactly the
         failure the parameter exists to prevent. The address has to describe the
         sandbox, whichever control put it in that state.

         Still never written back to `localStorage`, which is the half of the
         argument that holds: a link says what it is about, and opening one must
         not re-set the reader's own preference.

         Styled is the absence, so a default sandbox is `?e=family.slug` and
         nothing else. An explicit `t=styled` survives, because a link that
         deliberately pins the common tier still means it for a reader whose
         preference is base. */
      tier: forcedTier ?? (preferredTier === 'headless' ? 'headless' : null),
    })
    /* The fragment is only ours to write once the editor has been seeded.
       Before that it is still the one the page arrived with, and this effect
       runs before the seeding one and again on every render, so an empty state
       overwrote it within a frame of the load. */
    const hash =
      seeded.current && example
        ? writeHashState(
            { css, markup },
            {
              css: example.css || CSS_START,
              markup: syntax === 'html' ? example.html : htmlToJsx(example.html),
            },
          )
        : window.location.hash
    window.history.replaceState(null, '', `${window.location.pathname}${query}${hash}`)
  }, [
    read,
    direction,
    exampleSlug,
    familySlug,
    forcedTier,
    layout,
    /* The effect reads it now, so it has to rerun when the drawer moves it. */
    preferredTier,
    previewTheme,
    showEditor,
    showPanel,
    showRail,
    showStatus,
    syntax,
    css,
    example,
    markup,
  ])

  /* Seeding and converting are one effect, because they are the same question
     asked of two inputs: what should be in the editor for this example in this
     language. Split across an effect and a menu handler they disagreed on
     mount, where an address naming `x=tsx` sets the syntax in a state update
     the seeding effect's closure cannot see yet, so the example was seeded as
     HTML and then shown under a TSX tab. Comparing against what was last put
     there settles it on the following render instead of needing the two to be
     ordered. */
  /**
   * Reloads the preview when its bundle changes, in development only.
   *
   * The frame runs its own build of the component library, carried in as a
   * classic script because a sandboxed document has an opaque origin and cannot
   * import a module from this site. That script is outside the module graph, so
   * nothing about it hot-reloads: the sandbox around the preview updates on
   * every component change and the preview keeps running whatever it loaded
   * when the tab was opened. It looks exactly like a fix that did not work, and
   * it cost most of two days before anyone looked at the file in the middle.
   *
   * `frame.html` is tiny and served `no-store`, and it names both stamped URLs,
   * so its text *is* the version. Compared rather than its `ETag`, which is
   * derived from mtime and changes on a rebuild that produced identical output.
   *
   * Nothing is resent here: the frame announces itself on load and the preview
   * answers, which is the same path the first load takes.
   */
  useEffect(() => {
    if (process.env.NODE_ENV === 'production') {
      return
    }
    let last: string | null = null
    const check = async (): Promise<void> => {
      let text: string
      try {
        text = await (await fetch('/sandbox/frame.html', { cache: 'no-store' })).text()
      } catch {
        return // The dev server is restarting. Ask again on the next tick.
      }
      if (last !== null && text !== last) {
        /* Guarded the same way and for the same reason as the terminal's
           `clear` below: a method on an element that has not upgraded is not
           there. This one is reached from a two second timer rather than from
           mount, so the window has almost always closed by the time it runs,
           which is exactly what makes it the harder one to notice. */
        preview.current?.reload?.()
      }
      last = text
    }
    void check()
    const timer = setInterval(() => void check(), 2000)
    return () => clearInterval(timer)
  }, [])

  useEffect(() => {
    if (!example) {
      return
    }
    const address = `${family.slug}/${example.slug}`
    const last = seeded.current
    if (!last || last.example !== address) {
      /* Only for the example the address named. A fragment carries an edit to
         one component, and every other seed has to leave it alone. Where the
         query named a family without an example, the first of that family's
         examples is what it meant; where it named nothing at all, the first
         seed is the only candidate there is. */
      const waiting = arrived.current
      const meant =
        waiting === null ||
        (waiting.family === null && waiting.example === null) ||
        (waiting.example !== null
          ? address === `${waiting.family}/${waiting.example}`
          : address.startsWith(`${waiting.family}/`))
      const carried = meant ? waiting : null
      if (meant) {
        arrived.current = null
      }
      const seed = carried?.markup ?? (syntax === 'html' ? example.html : htmlToJsx(example.html))
      pristine.current = seed
      setMarkup(seed)
      /* The example's own stylesheet where it ships one, and the placeholder
         where it does not. Pushed at the preview here as well as in the effect
         that follows every edit: that effect runs after this render, so seeding
         only the state showed one frame of the example unstyled, which on the
         examples that lay themselves out is the whole preview jumping. */
      setCss(carried?.css ?? (example.css || CSS_START))
      if (preview.current) {
        preview.current.styles = carried?.css ?? example.css
      }
      /* Output belongs to the example that wrote it. Carrying it across reads
         as the new example having produced warnings it never produced.
       *
         **`clear?.()` and not `clear()`, because the element may not be an
         element yet.** `?.` on the ref guards it being null, which is a
         different question from whether what it points at has upgraded: the
         registration import moved into an effect when #121 stopped React
         reporting a hydration mismatch, so on a first paint there is a window
         where `<helix-sandbox-terminal>` is an unknown element with no methods
         on it at all. This effect runs inside that window and threw
         `clear is not a function`, which took the whole page down. */
      terminal.current?.clear?.()
    } else if (last.syntax !== syntax) {
      // The same text in the other language, so edits survive the switch.
      setMarkup((current) => {
        const converted = syntax === 'html' ? jsxToHtml(current) : htmlToJsx(current)
        /* The baseline moves with it. What came out of the converter is the new
           "untouched", or the next switch would compare this language's text
           against the last one's and call every document edited. */
        pristine.current = converted
        return converted
      })
    }
    seeded.current = { example: address, syntax }
  }, [example, family, syntax])

  // The preview follows the markup, and the site is what puts it there. The
  // sandbox forwards a pane it can render, which is one named `html`; this one
  // is named `source` and holds whichever syntax is selected, so converting it
  // and handing over the result is the consumer's job rather than a rule the
  // component has to guess at.
  useEffect(() => {
    if (!preview.current) {
      return
    }
    /* Who was typing, before the preview is handed anything.
     *
     * An example is free to take focus when it renders, and some of them must:
     * `showModal()` moves focus into the dialog, and a dialog that does not is
     * not modal. Measured, that focus lands on the *iframe* from the page's
     * side, so a reader halfway through typing a dialog example loses the
     * editor on every keystroke and their next character goes nowhere.
     *
     * The example is not wrong to do it and the frame cannot be asked not to,
     * so the sandbox puts focus back where the reader had it. Only when they
     * were in an editor: focus is theirs to move, and returning it from
     * anywhere else would fight them for it. */
    const typing = Object.values(editors.current).find(
      (editor) => editor === document.activeElement,
    )

    preview.current.source = syntax === 'html' ? markup : jsxToHtml(markup)
    preview.current.styles = css

    if (!typing) {
      return
    }
    /* After the frame has rendered and taken whatever it takes. One frame is
       enough because the theft happens during the preview's own paint, and
       waiting longer would mean returning focus after the reader had chosen to
       move it themselves. */
    const restore = requestAnimationFrame(() => {
      if (document.activeElement !== typing) {
        typing.focus()
      }
    })
    return () => cancelAnimationFrame(restore)
  }, [css, markup, syntax])

  // Switching files moves focus into the file switched to. It is what you were
  // going to do anyway, and it is also what corrects the status bar: the editor
  // reports its cursor when it gains focus, so the position and the language
  // beside it stay describing the same pane.
  useEffect(() => {
    editors.current[pane]?.focus()
  }, [pane])

  const share = async () => {
    await navigator.clipboard.writeText(window.location.href)
    setCopied(true)
    window.setTimeout(() => setCopied(false), 2000)
  }

  const query = filter.trim().toLowerCase()
  const hit = (text: string) => text.toLowerCase().includes(query)

  /* The top-level branches, which are the families.
   *
   * `useCallback` with no dependencies, and it has to be: a plain function
   * declared in the body is a new value every render, so naming it in the
   * effects below would make them run every render, which is the bug they were
   * written to fix. It closes over nothing but `treeRef`, which React keeps
   * stable, and reads `.current` when it is called rather than when it is
   * made. */
  const branches = useCallback(
    (): HelixTreeItem[] => [
      ...(tree?.querySelectorAll<HelixTreeItem>(':scope > helix-tree-item') ?? []),
    ],
    [tree],
  )

  /* Driven, not owned, and the second half of that took two goes to get right.
   *
   * It was a prop on each row, re-set on every render, so a reader opening a
   * branch had it closed again by the next one and the chevrons read as dead.
   * So it became an effect writing the elements, which fixed the chevrons and
   * broke something worse. The effect
   * had no dependency array, so it ran after *every* render and put every
   * branch back to what this file thought it should be. Opening a branch
   * re-rendered the page, the effect ran, and the branch shut again before the
   * reader's hand left the mouse.
   *
   * The rule that was missing: only write when the *reason* to write has
   * changed. Two effects, because there are two reasons and they are not the
   * same kind of thing.
   */

  /* A command about every branch at once. Filtering is a request to see what
     came back, so a narrowed tree opens itself rather than making the reader
     open each branch to find out; expand-all is the reader saying it outright.
     Neither runs while the other is idle, which is what leaves a hand-opened
     branch alone. */
  useEffect(() => {
    if (query === '' && expandAll === null) {
      return
    }
    for (const item of branches()) {
      item.open = query !== '' || expandAll === true
    }
  }, [branches, expandAll, query])

  /* Navigation, which is additive and never closes anything. Arriving at a
     family shows where you are; it says nothing about the branches you left
     open on the way, and closing those was the whole bug.
   *
   * `item.value`, not `getAttribute('value')`. React assigns a prop as a
   * *property* on a custom element when the element declares one, so a
   * `<helix-tree-item value={slug}>` written in JSX carries no attributes at
   * all: measured, `element.attributes` is empty and `element.value` is the
   * slug. The attribute form read `null` for every row, so this matched
   * nothing and the current family never opened itself either. Two bugs in one
   * effect, and only the loud one was reported. */
  useEffect(() => {
    for (const item of branches()) {
      if (item.value === family.slug) {
        item.open = true
      }
    }
  }, [branches, family.slug])

  const chosen = example ? `${family.slug}/${example.slug}` : undefined

  /* And then show the reader where they are.
   *
   * Arriving with a component already chosen, which is what every link into the
   * sandbox does, opened the right branch and marked the right row and left
   * both below the fold. The list is long enough that a family late in the
   * alphabet sat 2277 pixels down, so the panel looked like it had ignored the
   * address.
   *
   * **Here and not in `Tree`, which was tried first.** Teaching `active` to
   * reveal itself meant opening the branches above the row, and opening is a
   * write: a later sync ran it again and reopened a branch the reader had just
   * clicked shut, which one of `Tree`'s own specs caught. Revealing is this
   * panel's intent about its own address rather than something every tree
   * should do to its consumer.
   *
   * `scrollItemIntoView` rather than `scrollIntoView`, for the reason `Tree`
   * gives where the keyboard uses it: the platform's own scrolls every
   * scrollable ancestor including the document, and a reader following a link
   * into a sidebar did not ask the page to move. Its default scroller is the
   * item's `offsetParent`, which is the nearest *positioned* ancestor and has
   * nothing to do with overflow, so the panel is passed explicitly: measured
   * without it, the row 3228 pixels down and the scroller still at zero.
   *
   * Waiting for the tree rather than for a frame. Opening a branch is itself a
   * render, so the rows above this one had not been laid out when a lone
   * `requestAnimationFrame` fired and they pushed it down afterwards: the panel
   * scrolled 2277 and left one pixel of the row showing. */
  useEffect(() => {
    const panel = scroller.current
    if (!tree || !panel || chosen === undefined) {
      return
    }
    let canceled = false
    const show = async (): Promise<void> => {
      await tree.updateComplete
      /* **The tree's own update is not its rows'.** Awaiting `tree.updateComplete`
         waits for the element that holds them; each row is a custom element that
         upgrades on its own, and before it does it has no `value` property at
         all, only the attribute React wrote. So this matched nothing on a cold
         arrival: measured at `?e=tooltip`, 530 rows in the DOM and every one of
         them reporting `undefined`, so the branch stayed shut and the panel sat
         at zero with the row 3681 pixels below it.

         Waiting for the definition rather than for a frame, for the same reason
         the frame below is not enough on its own: a frame is a guess about when
         the work is done and this is the work being done. */
      await customElements.whenDefined('helix-tree-item')
      const row = [...tree.querySelectorAll<HelixTreeItem>('helix-tree-item')].find(
        /* The attribute as well, because the two disagree for as long as an
           upgrade is outstanding and either one being right is enough. */
        (one) => (one.value || one.getAttribute('value')) === chosen,
      )
      if (!row) {
        return
      }
      /* Opened here as well as in the navigation effect above, and not instead
         of it. That one runs once, on the render where the tree arrives, and a
         row is only in the DOM to be opened if React has finished putting the
         rows there: arriving at `?e=tooltip` cold, the branch was still shut and
         the row inside it had no layout at all, so there was nothing to scroll
         to and the panel stayed at zero with the row 3681 pixels below it.

         This one waits for the tree by construction, which is the whole reason
         it is written as an async walk rather than a frame. Additive in the same
         way: it opens the one branch the address names and closes nothing, so a
         reader's own open branches are left alone. */
      const branch = row.parentElement?.closest<HelixTreeItem>('helix-tree-item')
      if (branch && !branch.open) {
        branch.open = true
        await branch.updateComplete
      }
      await row.updateComplete
      await new Promise((settled) => {
        requestAnimationFrame(() => {
          settled(undefined)
        })
      })
      if (!canceled) {
        scrollItemIntoView(row, { padding: 8, scroller: panel })
      }
    }
    void show()
    return () => {
      canceled = true
    }
  }, [chosen, tree])

  /* Every hook is above this, and has to be: an early return past one changes
     how many run, which is the rule React has no way to recover from. The tree
     effect in particular reads nothing this branch decides. */
  if (!example) {
    return (
      <helix-text as="p" tone="subtle">
        No examples are shipped yet.
      </helix-text>
    )
  }

  const activeValue = chosen ?? `${family.slug}/${example.slug}`

  /* A family matching by name keeps all of its examples, because the reader
     asked for the component and not for a particular one of its pages. A family
     that does not match is kept only for the examples that do, and drops out
     entirely when none of them do. */
  const shown =
    query === ''
      ? withExamples
      : withExamples
          .map((entry) =>
            hit(entry.label)
              ? entry
              : { ...entry, examples: entry.examples.filter((item) => hit(item.label)) },
          )
          .filter((entry) => hit(entry.label) || entry.examples.length > 0)

  const allOpen = expandAll ?? false

  /* Only the state. The sweep that used to be here is the effect above, which
     fires on `expandAll` and therefore reaches branches the reader opened by
     hand as well: those changed the element without changing anything React
     holds, and that is exactly what the button has to override. */
  const toggleAll = () => {
    setExpandAll(!allOpen)
  }

  const examplesPane = (
    <>
      <helix-flex align="center" class={styles.examplesHeader} data-density="sm" gap="2xs">
        <helix-input
          aria-label="Filter examples"
          class={styles.examplesFilter}
          onInput={filterChanged}
          placeholder="Filter"
          ref={filterRef}
          type="search"
          value={filter}
        >
          <helix-icon name="funnel-simple" slot="start"></helix-icon>
          {/* **The one thing on the page that says which key it answers to.**
              A shortcut nobody is told about is a feature for whoever wrote it,
              which is the argument `SiteFind` makes for showing its own chord on
              its own trigger.

              `document`, and that is the exception rather than the default: `/`
              has to work while the reader is in the tree, which is the whole
              point of a key that focuses the field. `control` would mean
              pressing it inside the field it had already focused. */}
          <helix-kbd
            keys="/"
            onhelix-shortcut={focusFilter}
            slot="end"
            within="document"
          ></helix-kbd>
        </helix-input>
        {/* Filled, so it and the field beside it are one piece of chrome rather
            than a box with a button floating after it. The tooltip repeats the
            label rather than adding to it: a lone glyph is only guessable, and
            the name a screen reader already reads is the thing a pointer user
            is missing. */}
        <helix-tooltip content={allOpen ? 'Collapse all' : 'Expand all'} placement="bottom">
          <helix-icon-button
            emphasis="outlined"
            label={allOpen ? 'Collapse all' : 'Expand all'}
            onClick={toggleAll}
          >
            {/* The arrows say what the button does. A caret is what a thing to
              open looks like, not what opening everything looks like, and two of
              them stacked in a rail full of chevrons said nothing at all. */}
            <helix-icon
              name={allOpen ? 'arrows-in-line-vertical' : 'arrows-out-line-vertical'}
            ></helix-icon>
          </helix-icon-button>
        </helix-tooltip>
      </helix-flex>

      <div className={styles.examplesScroll} ref={scroller}>
        {shown.length === 0 ? (
          <helix-text tone="subtle" variant="caption">
            Nothing matches {filter}.
          </helix-text>
        ) : (
          <helix-tree
            active={activeValue}
            chevron-placement="end"
            label="Examples"
            onhelix-select={exampleChosen}
            ref={setTree}
          >
            {shown.map((entry) => (
              <helix-tree-item key={entry.slug} value={entry.slug}>
                {/* Out of the workbench and into the family's own page, which is
                    the reading the rail could not otherwise reach: the sandbox
                    shows what a component does and the docs page says what it
                    is, and there was no way from the first to the second.

                    On the row that names the family rather than on an example,
                    because a docs page is about the family. Pressing it must
                    not open the branch, which is what a press anywhere else in
                    this row does, and `Tree.Item` asks whether the press landed
                    on a link before it toggles. */}
                <helix-tooltip content={`${entry.label} documentation`} slot="end">
                  <a
                    aria-label={`${entry.label} documentation`}
                    className={styles.docsJump}
                    href={`/helix/components/${entry.slug}`}
                  >
                    <helix-icon name="book-open-text" />
                  </a>
                </helix-tooltip>
                {/* Everything here is experimental, and saying so on each row is the
              honest form of that: a badge on the page a reader has already
              opened tells them after they chose it. */}
                {entry.status === 'experimental' && (
                  <helix-tooltip content="Experimental. The API can change." slot="end">
                    <helix-icon label="Experimental" name="flask"></helix-icon>
                  </helix-tooltip>
                )}
                {entry.label}
                {entry.examples.map((item) => (
                  <helix-tree-item
                    key={item.slug}
                    slot="children"
                    value={`${entry.slug}/${item.slug}`}
                  >
                    {item.label}
                  </helix-tree-item>
                ))}
              </helix-tree-item>
            ))}
          </helix-tree>
        )}
      </div>
    </>
  )

  return (
    <>
      {/* The same component the site's own header is, rather than a flex row
          shaped like one. It is a header with a brand at the start and actions
          at the end, which is what this component is for, and taking it means
          the header height and the dense-by-nature sizing come from one place
          instead of being restated here. The class only makes it full bleed:
          this is a tool, so the row runs to the window rather than to the
          site's text column. */}
      <helix-app-header class={styles.workbenchHeader}>
        {/* The mark and the name, and the way out. No trail beside them: the
            rail already says which component and which example, and a
            breadcrumb repeating it is a second answer to a question nobody
            asked twice.

            The name is the accessible one, so the mark beside it is decoration
            rather than a second reading of the same word. */}
        {/* `/`, because the mark reads "Fusion". It pointed at `/helix` on the
            reasoning that the sandbox sits under Helix and the wordmark is the
            way up, and that is a breadcrumb's job rather than a brand mark's: a
            lockup that says one thing and goes to another is a link nobody can
            predict. The site's header has always sent it to `/` and this is the
            same mark. Helix is one row down in the palette either way. */}
        {/* **The way out, and the sandbox had none.** The wordmark went home
            and nothing else went anywhere, so a reader who opened the sandbox
            from the components page could reach the rest of the site only by
            going back the way they came. A tool is still a page on this site.

            A button rather than the row of destinations the site's header
            carries, and ahead of the mark rather than after it. A tool's header
            is already full of the tool, so what belongs in it is one way out
            rather than four; and the menu is the outermost thing on the page,
            so it sits outside the mark that names the page. */}
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

        {/* What is about the site rather than the sandbox: how the whole thing
            looks, and on a phone, the way to the examples. The sandbox's own
            settings are in its toolbar. */}
        <helix-flex align="center" gap="2xs" slot="end">
          {/* **The palette, which this header did not have and the site's did.**
              A reader in the sandbox could reach nothing without going back to
              the site first, which is the request that opened #128.

              **With its trigger, which this header refused once and should not
              have.** The argument was chrome economy: a tool's header has no
              room for a button the site's has room for, and the hotkey still
              works because the palette listens on the document. `SiteFind`
              answers that in its own comment, written for the site and just as
              true here: a shortcut nobody is told about is a feature for
              whoever wrote it, and the button is the only thing on the page
              that says which keys it answers to. Hidden, the palette was
              something you had to already know about, which is the state #128
              set out to end rather than to move. */}
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

      {/* The body is a splitter now, so the rail is a pane a reader can size
          rather than a column at whatever width this file chose. It is rendered
          on every viewport, the rail pane simply going empty on a narrow one:
          wrapping the sandbox conditionally would unmount it at the breakpoint,
          and the preview is an iframe that reloads when it does. */}
      {/* **A floor for the editor, in rem rather than per cent.**
          
          The pane on this side holds source, and source is the thing a
          percentage minimum cannot protect: twenty per cent is 280px on a desk
          and 100px on a laptop split in half, and the number worth picking was
          always about how much of a line fits. 20rem is 320px of it, which is
          where a line stops being cut mid-token.
          
          Only this side has one. The rail closes by being driven to 100, and a
          `min` is a lower bound, so the toggle still shuts it completely. The
          theme builder deliberately has no `min` for the mirror of that reason:
          it hides its controls by driving the divider to *zero*, every position
          goes through the same clamp, and a minimum would hold the panel open
          at the floor instead of letting it shut. */}
      <helix-splitter
        className={styles.workbenchBody}
        default-position={railHome}
        min="20rem"
        onhelix-before-resize={railMoved}
        position={railPosition}
        ref={setRailSplitter}
      >
        <div className={styles.workbenchMain} slot="start">
          <helix-sandbox
            /* **The preview leads on a narrow viewport.** Stacked, the pane a
               reader came to see should be the one they land on, and the source
               is what they scroll to when they want to change it. The component
               already carries this, so it is a value rather than a layout
               written here. */
            lead={narrow ? 'preview' : 'source'}
            onhelix-before-edit={paneEdited}
            onhelix-before-resize={sandboxChanged}
            orientation={narrow ? 'vertical' : 'horizontal'}
            ref={sandbox}
            split={showEditor ? split : 0}
          >
            <helix-sandbox-toolbar slot="toolbar">
              {/* A toggle group, not a tab list. A tab in the toolbar would carry
                `aria-controls` for a panel down in the source pane, and an
                IDREF cannot leave the tab's shadow root to reach it: the
                component's own note is that pointing at nothing is worse than
                not pointing. This is a choice among files, and it says so. */}
              <helix-toggle-group
                aria-label="Files"
                onChange={paneChosen}
                separation="plain"
                value={pane}
              >
                <helix-toggle value="source">{current.file}</helix-toggle>
                <helix-toggle value="css">styles.css</helix-toggle>
              </helix-toggle-group>

              <helix-toolbar label="Sandbox actions" slot="end">
                <helix-tooltip
                  content={copied ? 'Link copied' : 'Copy a link to this example'}
                  placement="bottom"
                >
                  <helix-icon-button
                    label={copied ? 'Link copied' : 'Copy a link to this example'}
                    onClick={share}
                  >
                    <helix-icon name={copied ? 'check' : 'share-network'}></helix-icon>
                  </helix-icon-button>
                </helix-tooltip>

                {/* Layout and Direction drill down; the last three tick. The menu
                  reads its state from here rather than holding its own, so what
                  is ticked is what is showing. */}
                <helix-menu label="Environment" onhelix-select={settingChosen}>
                  <helix-tooltip content="Sandbox settings" placement="bottom" slot="trigger">
                    <helix-icon-button label="Sandbox settings">
                      <helix-icon name="sliders-horizontal"></helix-icon>
                    </helix-icon-button>
                  </helix-tooltip>

                  <helix-menu-item value="syntax">
                    Environment
                    {SYNTAXES.map((option) => (
                      <helix-menu-item
                        checkable
                        checked={syntax === option.value ? true : undefined}
                        key={option.value}
                        slot="submenu"
                        value={`syntax:${option.value}`}
                      >
                        {option.label}
                      </helix-menu-item>
                    ))}
                  </helix-menu-item>

                  <helix-menu-item value="layout">
                    Layout
                    {LAYOUTS.map((option) => (
                      <helix-menu-item
                        checkable
                        checked={layout === option.value ? true : undefined}
                        key={option.value}
                        slot="submenu"
                        value={`layout:${option.value}`}
                      >
                        {option.label}
                      </helix-menu-item>
                    ))}
                  </helix-menu-item>

                  <helix-menu-item value="color">
                    Color mode
                    <helix-menu-item
                      checkable
                      checked={previewTheme === null ? true : undefined}
                      slot="submenu"
                      value="color:site"
                    >
                      Follow the site
                    </helix-menu-item>
                    <helix-menu-item
                      checkable
                      checked={previewTheme === 'light' ? true : undefined}
                      slot="submenu"
                      value="color:light"
                    >
                      Light
                    </helix-menu-item>
                    <helix-menu-item
                      checkable
                      checked={previewTheme === 'dark' ? true : undefined}
                      slot="submenu"
                      value="color:dark"
                    >
                      Dark
                    </helix-menu-item>
                  </helix-menu-item>

                  <helix-menu-item value="direction">
                    Direction
                    {DIRECTIONS.map((option) => (
                      <helix-menu-item
                        checkable
                        checked={direction === option.value ? true : undefined}
                        key={option.value}
                        slot="submenu"
                        value={`direction:${option.value}`}
                      >
                        {option.label}
                      </helix-menu-item>
                    ))}
                  </helix-menu-item>

                  <helix-divider announced></helix-divider>

                  <helix-menu-item checkable checked={showEditor ? true : undefined} value="editor">
                    Editor
                  </helix-menu-item>
                  <helix-menu-item checkable checked={showPanel ? true : undefined} value="panel">
                    Panel
                  </helix-menu-item>
                  <helix-menu-item checkable checked={showStatus ? true : undefined} value="status">
                    Status bar
                  </helix-menu-item>
                </helix-menu>

                {/* Beside the settings, because it is the same kind of thing: a
                  switch for a region of the tool rather than anything to do
                  with the example.

                  **And it is the only control for the rail at either width.**
                  On a narrow viewport the rail is a drawer rather than a pane,
                  and this used to go on calling `setShowRail`, which positions
                  a pane that is not rendered there: a button that did nothing,
                  while a second one in the masthead did the work. One control
                  in one place, saying the same thing at both widths, and the
                  masthead gets its room back. */}
                <helix-tooltip
                  content={railShown ? 'Hide examples' : 'Show examples'}
                  placement="bottom"
                >
                  <helix-icon-button
                    class={styles.railToggle}
                    label={railShown ? 'Hide examples' : 'Show examples'}
                    onClick={() =>
                      narrow ? setRailOpen((open) => !open) : setShowRail((open) => !open)
                    }
                  >
                    <helix-icon name="sidebar-simple"></helix-icon>
                  </helix-icon-button>
                </helix-tooltip>
              </helix-toolbar>
            </helix-sandbox-toolbar>

            {/* Both stay mounted, so switching files does not discard what was
              typed in the other, and they share one cell so the hidden one
              costs no height. */}
            <div className={styles.sourceFiles} slot="source">
              {/* One editor, keyed on the syntax so a change of environment
                rebuilds it rather than reconfiguring a document in place. What
                is on screen is what runs: an edit here is read back into the
                markup, and the markup is what the preview renders. */}
              <div data-file hidden={pane !== 'source'}>
                <helix-sandbox-editor
                  field-label={`Example, as ${current.label}`}
                  key={`${activeValue}-${syntax}`}
                  language={current.language}
                  name="source"
                  ref={(node: HelixSandboxEditor | null) => {
                    editors.current.source = node
                  }}
                  value={markup}
                ></helix-sandbox-editor>
              </div>

              <div data-file hidden={pane !== 'css'}>
                <helix-sandbox-editor
                  field-label="Example stylesheet"
                  key={`${activeValue}-css`}
                  language="css"
                  name="css"
                  ref={(node: HelixSandboxEditor | null) => {
                    editors.current.css = node
                  }}
                  value={css}
                ></helix-sandbox-editor>
              </div>
            </div>

            <helix-sandbox-preview
              data-color-mode={previewTheme ?? siteTheme}
              direction={direction === 'rtl' ? 'rtl' : undefined}
              layout={layout === 'padded' ? undefined : layout}
              ref={preview}
              slot="preview"
              src="/sandbox/frame.html"
            ></helix-sandbox-preview>

            {/* The panel's tabs are `helix-tabs`, not a second tab set built
              into the sandbox: tabs are the only behavior the region has, and
              that behavior already exists.

              Dense, like the toolbar. A bar of the tool says so once and the
              controls in it follow; this one did not, so its tabs took the
              default control height and stood eight pixels taller than the file
              tabs across the split from them. */}
            {showPanel && (
              <helix-tabs
                data-density="sm"
                defaultActive="terminal"
                label="Panel"
                ref={panelTabs}
                slot="panel"
              >
                <helix-tabs-tab value="terminal">Terminal</helix-tabs-tab>
                <helix-tabs-tab value="specs">Specs</helix-tabs-tab>
                <helix-tabs-panel slot="panels" value="terminal">
                  <helix-sandbox-terminal ref={terminal}></helix-sandbox-terminal>
                </helix-tabs-panel>
                <helix-tabs-panel slot="panels" value="specs">
                  {/* The family, not the example: specs belong to a component, and
                  every example of it runs the same ones. */}
                  <helix-sandbox-specs
                    family={family.slug}
                    src="/helix/sandbox/specs"
                  ></helix-sandbox-specs>
                </helix-tabs-panel>
              </helix-tabs>
            )}

            {/* Fed by the sandbox, not from here. `line` and `column` are never
              passed as props, so React leaves them alone and the element
              writes them on every cursor move without a re-render. */}
            {showStatus && (
              <helix-sandbox-status-bar
                language={pane === 'css' ? 'css' : current.value}
                slot="status"
              ></helix-sandbox-status-bar>
            )}
          </helix-sandbox>

          {/* Asked before the conversion, not after.
 
            Changing the environment does not throw the text away, it runs it
            through `htmlToJsx` or `jsxToHtml`, and that is the problem: the
            converters do not reproduce half-typed markup, so a document with
            work in it can come back altered in ways nobody asked for. Untouched,
            there is nothing to lose and the switch is silent.
 
            Rendered always rather than gated on `pendingSyntax`, because a
            dialog that unmounts cannot animate out, and `open` is what drives
            `showModal()`. */}
          <helix-dialog
            align="center"
            label="Change environment"
            onhelix-before-close={confirmClosed}
            open={pendingSyntax !== null}
            ref={confirmSyntax}
            size="sm"
          >
            <helix-icon
              className={styles.dialogWarning}
              name="warning-fill"
              slot="icon"
            ></helix-icon>
            <helix-text as="h2" slot="header">
              Change environment?
            </helix-text>
            You have edited this example.
            <helix-flex gap="sm" slot="footer">
              <helix-button
                emphasis="solid"
                onClick={() => {
                  const next = pendingSyntax
                  setPendingSyntax(null)
                  if (next) {
                    applySyntax(next)
                  }
                }}
                tone="primary"
                width="standard"
              >
                Change anyway
              </helix-button>
              <helix-button onClick={() => setPendingSyntax(null)} width="standard">
                Keep editing
              </helix-button>
            </helix-flex>
          </helix-dialog>
        </div>

        {/* A real drawer on a phone: focus trapped, Escape closes, page behind
            covered. The CSS transform it replaced was none of those. It lives
            outside the splitter, because a drawer is not a pane. */}
        {!narrow && (
          /* `inert` while it is shut, so what a reader cannot see is also
             something the keyboard cannot reach and a screen reader does not
             read: a pane closed to nothing takes it off the screen and leaves it
             in the page. */
          <aside className={styles.examplesRail} inert={!showRail} slot="end">
            {examplesPane}
          </aside>
        )}
      </helix-splitter>

      {narrow && (
        <helix-drawer
          class={styles.examplesDrawerHost}
          label="Examples"
          material="glass"
          onhelix-before-close={() => setRailOpen(false)}
          onhelix-before-open={() => setRailOpen(true)}
          open={railOpen}
          placement="end"
        >
          {/* Wrapped, because the pane is two rows and a drawer is one box: the
              grid is what pins the filter while the tree scrolls under it, and
              without it the filter scrolled away. */}
          <div className={styles.examplesDrawer}>{examplesPane}</div>
        </helix-drawer>
      )}
    </>
  )
}
