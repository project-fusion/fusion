'use client'

// The editor is on its own path: it carries CodeMirror, and the site's
// element registration runs on every page.
import '@helix-io/sandbox/editor'
import { htmlToJsx, jsxToHtml } from '@helix-io/sandbox'
import type { HelixSandboxEditor } from '@helix-io/sandbox/editor'
import type {
  HelixChangeEvent,
  HelixDialog,
  HelixDrawer,
  HelixInput,
  HelixInputEvent,
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
} from '@helix-io/web'
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import type { Family } from '../../../../lib/catalog'
import { useElementRef } from '../../../../lib/use-element-ref'
import { PreferencesDrawer } from '../../../preferences'
import { Wordmark } from '../../../wordmark'
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

export function SandboxWorkbench({ families }: Props) {
  const preview = useRef<HelixSandboxPreview>(null)
  const files = useRef<HelixToggleGroup>(null)
  /* Held as state, not as a ref: an effect observes the splitter's width and a
     memo reads the tree's rows, and both have to run when the element arrives,
     which a `RefObject` cannot announce. */
  const [tree, setTree] = useElementRef<HelixTree>()
  const [railSplitter, setRailSplitter] = useElementRef<HelixSplitter>()

  /* Handlers are props now. An element rendered in two places, which the
     examples tree is, gets the prop in both, and React binds whichever one it
     rendered. The ref dance this used to need existed because a `RefObject`
     cannot say that its `.current` moved. */
  const sandbox = useRef<HelixSandbox>(null)
  const panelTabs = useRef<HelixTabs>(null)
  const settings = useRef<HelixMenu>(null)
  const [layout, setLayout] = useState<'padded' | 'centered' | 'fullscreen'>('padded')
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
  const railPosition =
    showRail && bodyWidth > 0 ? Math.max(0, 100 - (railSize / bodyWidth) * 100) : 100

  /* Where a double click on the divider puts it back to, which is the width the
     rail opens at rather than the splitter's own half-and-half. Shut, the
     divider is still there and still takes a double click, so this is the way
     back from nothing without reaching for the toggle. */
  const railHome = bodyWidth > 0 ? Math.max(0, 100 - (RAIL_OPEN / bodyWidth) * 100) : 100

  const railMoved = (event: HelixChangeEvent) => {
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
    setFamilySlug(url.family)
    setExampleSlug(url.example)
    setLayout(url.layout)
    setDirection(url.direction)
    setSyntax(url.syntax)
    setPreviewTheme(url.colorMode)
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
  const sandboxChanged = (event: HelixChangeEvent) => {
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

  const { example, family, withExamples } = resolve(families, familySlug, exampleSlug)
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

  /* The proposed value, off the event, not `event.target.value` off the host.
   *
   * `value` makes this field controlled, and a controlled element reports the
   * value the consumer holds rather than the one the reader just typed: reading
   * the host set the filter to what it already was, the element put the text
   * back, and the field could not be typed into at all. The sandbox's own
   * examples were unfilterable in the sandbox.
   */
  const filterChanged = (event: HelixInputEvent) => {
    setFilter(event.detail.value)
  }

  const paneChosen = (event: HelixChangeEvent) => {
    setPane(event.detail.value as Pane)
  }
  // Verbatim. What is typed is what is held and what is handed back.
  const paneEdited = (event: HelixChangeEvent) => {
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
      setLayout(option as 'padded' | 'centered' | 'fullscreen')
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

     Guarded on `familySlug`, which is null until the first effect has read the
     address: writing before then would replace a real query with an empty one
     and lose whatever the link said. */
  useEffect(() => {
    if (!familySlug) {
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
    direction,
    exampleSlug,
    familySlug,
    layout,
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
        preview.current?.reload()
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
      // Output belongs to the example that wrote it. Carrying it across reads
      // as the new example having produced warnings it never produced.
      terminal.current?.clear()
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
   * It was a prop on each row, and a prop set at mount is how a consumer says
   * the state is theirs: those rows had dead chevrons, because a controlled
   * item announces and waits to be told. So it became an effect writing the
   * elements, which fixed the chevrons and broke something worse. The effect
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

  const activeValue = `${family.slug}/${example.slug}`

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
      <helix-flex align="center" class="examplesHeader" data-density="sm" gap="2xs">
        <helix-input
          aria-label="Filter examples"
          class="examplesFilter"
          onhelix-input={filterChanged}
          placeholder="Filter"
          type="search"
          value={filter}
        >
          <helix-icon name="funnel-simple" slot="start"></helix-icon>
        </helix-input>
        {/* Filled, so it and the field beside it are one piece of chrome rather
            than a box with a button floating after it. The tooltip repeats the
            label rather than adding to it: a lone glyph is only guessable, and
            the name a screen reader already reads is the thing a pointer user
            is missing. */}
        <helix-tooltip content={allOpen ? 'Collapse all' : 'Expand all'} placement="bottom">
          <helix-icon-button
            appearance="outlined"
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

      <div className="examplesScroll">
        {shown.length === 0 ? (
          <helix-text appearance="caption" tone="subtle">
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
      <helix-app-header class="workbenchHeader">
        {/* The mark and the name, and the way out. No trail beside them: the
            rail already says which component and which example, and a
            breadcrumb repeating it is a second answer to a question nobody
            asked twice.

            The name is the accessible one, so the mark beside it is decoration
            rather than a second reading of the same word. */}
        <a data-link="quiet" href="/helix" slot="start">
          <Wordmark />
        </a>

        {/* What is about the site rather than the sandbox: how the whole thing
            looks, and on a phone, the way to the examples. The sandbox's own
            settings are in its toolbar. */}
        <helix-flex align="center" gap="2xs" slot="end">
          {narrow && (
            <helix-button appearance="ghost" onClick={() => setRailOpen(true)}>
              Examples
            </helix-button>
          )}
          <helix-tooltip content="Preferences" placement="bottom">
            <helix-icon-button label="Preferences" onClick={() => setPrefsOpen(true)}>
              <helix-icon name="gear"></helix-icon>
            </helix-icon-button>
          </helix-tooltip>
        </helix-flex>
      </helix-app-header>

      <PreferencesDrawer onOpenChange={setPrefsOpen} open={prefsOpen} />

      {/* The body is a splitter now, so the rail is a pane a reader can size
          rather than a column at whatever width this file chose. It is rendered
          on every viewport, the rail pane simply going empty on a narrow one:
          wrapping the sandbox conditionally would unmount it at the breakpoint,
          and the preview is an iframe that reloads when it does. */}
      <helix-splitter
        className="workbenchBody"
        default-position={railHome}
        onhelix-change={railMoved}
        position={railPosition}
        ref={setRailSplitter}
      >
        <div className="workbenchMain" slot="start">
          <helix-sandbox
            onhelix-change={(event) => {
              sandboxChanged(event)
              paneEdited(event)
            }}
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
                appearance="plain"
                aria-label="Files"
                onhelix-change={paneChosen}
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
                  with the example. */}
                <helix-tooltip
                  content={showRail ? 'Hide examples' : 'Show examples'}
                  placement="bottom"
                >
                  <helix-icon-button
                    class="railToggle"
                    label={showRail ? 'Hide examples' : 'Show examples'}
                    onClick={() => setShowRail((open) => !open)}
                  >
                    <helix-icon name="sidebar-simple"></helix-icon>
                  </helix-icon-button>
                </helix-tooltip>
              </helix-toolbar>
            </helix-sandbox-toolbar>

            {/* Both stay mounted, so switching files does not discard what was
              typed in the other, and they share one cell so the hidden one
              costs no height. */}
            <div className="sourceFiles" slot="source">
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
            onhelix-close={confirmClosed}
            open={pendingSyntax !== null}
            ref={confirmSyntax}
            size="sm"
          >
            <helix-icon className="dialogWarning" name="warning-fill" slot="icon"></helix-icon>
            <helix-text as="h2" slot="header">
              Change environment?
            </helix-text>
            You have edited this example.
            <helix-flex gap="sm" slot="footer">
              <helix-button
                appearance="solid"
                fill="standard"
                onClick={() => {
                  const next = pendingSyntax
                  setPendingSyntax(null)
                  if (next) {
                    applySyntax(next)
                  }
                }}
                tone="primary"
              >
                Change anyway
              </helix-button>
              <helix-button fill="standard" onClick={() => setPendingSyntax(null)}>
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
          <aside className="examplesRail" inert={!showRail} slot="end">
            {examplesPane}
          </aside>
        )}
      </helix-splitter>

      {narrow && (
        <helix-drawer
          label="Examples"
          onhelix-close={() => setRailOpen(false)}
          onhelix-open={() => setRailOpen(true)}
          open={railOpen}
          placement="end"
        >
          {examplesPane}
        </helix-drawer>
      )}
    </>
  )
}
