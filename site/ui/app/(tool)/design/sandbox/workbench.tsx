'use client'

// The editor is on its own path: it carries CodeMirror, and the site's
// element registration runs on every page.
import '@helix-io/sandbox/editor'
import {
  type HelixSandbox,
  type HelixSandboxPreview,
  type HelixSandboxTerminal,
  htmlToJsx,
  jsxToHtml,
} from '@helix-io/sandbox'
import type { HelixSandboxEditor } from '@helix-io/sandbox/editor'
import type {
  HelixDrawer,
  HelixMenu,
  HelixTabs,
  HelixToggleGroup,
  HelixTree,
  HelixTreeItem,
} from '@helix-io/web'
import { useCallback, useEffect, useRef, useState } from 'react'
import type { Family } from '../../../../lib/catalog'
import { useHelixEvent } from '../../../../lib/use-helix-event'
import { FusionLogo } from '../../../fusion-logo'
import { PreferencesDrawer } from '../../../preferences'
import { readUrlState, type Section, writeUrlState } from './url-state'

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
  const treeRef = useRef<HelixTree>(null)
  const rail = useRef<HelixDrawer>(null)
  const sandbox = useRef<HelixSandbox>(null)
  const panelTabs = useRef<HelixTabs>(null)
  const settings = useRef<HelixMenu>(null)
  const [layout, setLayout] = useState<'padded' | 'centered' | 'fullscreen'>('padded')
  const [direction, setDirection] = useState<'ltr' | 'rtl'>('ltr')
  const [showEditor, setShowEditor] = useState(true)
  const [showPanel, setShowPanel] = useState(true)
  const [showStatus, setShowStatus] = useState(true)
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
  const [prefsOpen, setPrefsOpen] = useState(false)
  const [narrow, setNarrow] = useState(false)

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
    setShowEditor(!url.hidden.includes('editor'))
    setShowPanel(!url.hidden.includes('panel'))
    setShowStatus(!url.hidden.includes('status'))
    setSiteTheme(document.documentElement.dataset.colorMode === 'light' ? 'light' : 'dark')

    const stored = readArrangement()
    // Only when the address did not say. A link that names a language is a
    // statement about what to show; what this browser last chose is not.
    if (stored.syntax && !new URLSearchParams(window.location.search).has('x')) {
      setSyntax(stored.syntax)
    }
    if (sandbox.current) {
      if (typeof stored.split === 'number') {
        sandbox.current.split = stored.split
      }
      if (typeof stored.panelSize === 'number') {
        sandbox.current.panelSize = stored.panelSize
      }
    }
  }, [])

  // Written back when a divider is let go, not while it is moving: a drag is a
  // stream of positions and only the one it ends at is a preference.
  useHelixEvent(sandbox, 'helix-change', (event) => {
    if (event.detail.name !== 'arrangement') {
      return
    }
    const element = sandbox.current
    if (!element) {
      return
    }
    window.localStorage.setItem(
      ARRANGEMENT,
      JSON.stringify({ panelSize: element.panelSize, split: element.split, syntax }),
    )
  })

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

  // Bound through an effect, not an `onhelix-select` prop. React does not
  // attach custom-element listeners when it hydrates, so the prop form leaves
  // both of these dead on a freshly loaded page. See `useHelixEvent`.
  useHelixEvent(files, 'helix-select', (event) => {
    setPane(event.detail.value as Pane)
  })
  // Verbatim. What is typed is what is held and what is handed back.
  useHelixEvent(sandbox, 'helix-change', (event) => {
    if (event.detail.name === 'source') {
      setMarkup(event.detail.value)
    } else if (event.detail.name === 'css') {
      setCss(event.detail.value)
    }
  })
  // One listener for the whole menu: the value says which setting and, where
  // it drilled down, which option.
  useHelixEvent(settings, 'helix-select', (event) => {
    const [setting, option] = event.detail.value.split(':')
    if (setting === 'syntax' && option) {
      const next = option as Syntax
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
    } else if (setting === 'layout' && option) {
      setLayout(option as 'padded' | 'centered' | 'fullscreen')
    } else if (setting === 'direction' && option) {
      setDirection(option as 'ltr' | 'rtl')
    } else if (setting === 'colour' && option) {
      setPreviewTheme(option === 'site' ? null : (option as 'dark' | 'light'))
    } else if (setting === 'editor') {
      setShowEditor((was) => !was)
    } else if (setting === 'panel') {
      setShowPanel((was) => !was)
    } else if (setting === 'status') {
      setShowStatus((was) => !was)
    }
  })
  useHelixEvent(treeRef, 'helix-select', (event) => {
    select(event.detail.value)
  })
  useHelixEvent(rail, 'helix-close', () => {
    setRailOpen(false)
  })
  useHelixEvent(rail, 'helix-open', () => {
    setRailOpen(true)
  })

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
    const hidden: Section[] = []
    if (!showEditor) {
      hidden.push('editor')
    }
    if (!showPanel) {
      hidden.push('panel')
    }
    if (!showStatus) {
      hidden.push('status')
    }
    const query = writeUrlState({
      colorMode: previewTheme,
      direction,
      example: exampleSlug,
      family: familySlug,
      hidden,
      layout,
      syntax,
    })
    window.history.replaceState(null, '', `${window.location.pathname}${query}`)
  }, [
    direction,
    exampleSlug,
    familySlug,
    layout,
    previewTheme,
    showEditor,
    showPanel,
    showStatus,
    syntax,
  ])

  /* Seeding and converting are one effect, because they are the same question
     asked of two inputs: what should be in the editor for this example in this
     language. Split across an effect and a menu handler they disagreed on
     mount, where an address naming `x=tsx` sets the syntax in a state update
     the seeding effect's closure cannot see yet, so the example was seeded as
     HTML and then shown under a TSX tab. Comparing against what was last put
     there settles it on the following render instead of needing the two to be
     ordered. */
  useEffect(() => {
    if (!example) {
      return
    }
    const address = `${family.slug}/${example.slug}`
    const last = seeded.current
    if (!last || last.example !== address) {
      setMarkup(syntax === 'html' ? example.html : htmlToJsx(example.html))
      setCss(CSS_START)
      if (preview.current) {
        preview.current.styles = ''
      }
      // Output belongs to the example that wrote it. Carrying it across reads
      // as the new example having produced warnings it never produced.
      terminal.current?.clear()
    } else if (last.syntax !== syntax) {
      // The same text in the other language, so edits survive the switch.
      setMarkup((current) => (syntax === 'html' ? jsxToHtml(current) : htmlToJsx(current)))
    }
    seeded.current = { example: address, syntax }
  }, [example, family, syntax])

  // The preview follows the markup, and the site is what puts it there. The
  // sandbox forwards a pane it can render, which is one named `html`; this one
  // is named `source` and holds whichever syntax is selected, so converting it
  // and handing over the result is the consumer's job rather than a rule the
  // component has to guess at.
  useEffect(() => {
    if (preview.current) {
      preview.current.source = syntax === 'html' ? markup : jsxToHtml(markup)
      preview.current.styles = css
    }
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

  if (!example) {
    return (
      <helix-text as="p" tone="subtle">
        No examples are shipped yet.
      </helix-text>
    )
  }

  const activeValue = `${family.slug}/${example.slug}`

  const query = filter.trim().toLowerCase()
  const hit = (text: string) => text.toLowerCase().includes(query)

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

  /* Also set on the elements, not only through the prop. React writes a prop
     when its own value changes, and a reader who opened a branch by pressing
     its chevron changed the element without changing anything React holds: on
     the next "collapse all" React would see `undefined` before and after, write
     nothing, and leave that one branch open. The sweep is what makes the button
     mean every branch. */
  const toggleAll = () => {
    const next = !allOpen
    setExpandAll(next)
    for (const item of treeRef.current?.querySelectorAll<HelixTreeItem>(
      ':scope > helix-tree-item',
    ) ?? []) {
      item.expanded = next
    }
  }

  /* A filter is a request to see what came back, so a narrowed tree opens
     itself rather than making the reader open each branch to find out. */
  const isOpen = (slug: string) => query !== '' || (expandAll ?? slug === family.slug)

  const tree = (
    <>
      <helix-flex align="center" class="examplesHeader" data-density="sm" gap="2xs">
        <helix-flex align="center" class="examplesFilter" gap="2xs">
          <helix-icon name="funnel-simple"></helix-icon>
          <input
            aria-label="Filter examples"
            onChange={(event) => setFilter(event.target.value)}
            placeholder="Filter"
            type="search"
            value={filter}
          />
        </helix-flex>
        {/* Filled, so it and the field beside it are one piece of chrome rather
            than a box with a button floating after it. The tooltip repeats the
            label rather than adding to it: a lone glyph is only guessable, and
            the name a screen reader already reads is the thing a pointer user
            is missing. */}
        <helix-tooltip content={allOpen ? 'Collapse all' : 'Expand all'} placement="bottom">
          <helix-icon-button
            appearance="neutral"
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
          <helix-tree chevron="end" label="Examples" ref={treeRef} value={activeValue}>
            {shown.map((entry) => (
              <helix-tree-item
                expanded={isOpen(entry.slug) ? true : undefined}
                key={entry.slug}
                value={entry.slug}
              >
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
        {/* The mark, and the way out. No trail beside it: the rail already
            says which component and which example, and a breadcrumb repeating
            it is a second answer to a question nobody asked twice. */}
        <a aria-label="Fusion" data-link="quiet" href="/design" slot="start">
          <FusionLogo size="1.25rem" />
        </a>

        {/* What is about the site rather than the sandbox: how the whole thing
            looks, and on a phone, the way to the examples. The sandbox's own
            settings are in its toolbar. */}
        <helix-flex align="center" gap="2xs" slot="end">
          {narrow && (
            <helix-button appearance="subtle" onClick={() => setRailOpen(true)}>
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

      <div className="workbenchBody">
        <helix-sandbox
          orientation={narrow ? 'vertical' : 'horizontal'}
          ref={sandbox}
          split={showEditor ? undefined : 0}
        >
          {/* One declaration for the region, rather than `size="sm"` on each
              control in it. Nothing inside can be missed, and adding a control
              later cannot forget. */}
          <helix-sandbox-toolbar data-density="sm" slot="toolbar">
            {/* A toggle group, not a tab list. A tab in the toolbar would carry
                `aria-controls` for a panel down in the source pane, and an
                IDREF cannot leave the tab's shadow root to reach it: the
                component's own note is that pointing at nothing is worse than
                not pointing. This is a choice among files, and it says so. */}
            <helix-toggle-group appearance="plain" label="Files" ref={files} value={pane}>
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
              <helix-menu label="Environment" ref={settings}>
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

                <helix-menu-item value="colour">
                  Color mode
                  <helix-menu-item
                    checkable
                    checked={previewTheme === null ? true : undefined}
                    slot="submenu"
                    value="colour:site"
                  >
                    Follow the site
                  </helix-menu-item>
                  <helix-menu-item
                    checkable
                    checked={previewTheme === 'light' ? true : undefined}
                    slot="submenu"
                    value="colour:light"
                  >
                    Light
                  </helix-menu-item>
                  <helix-menu-item
                    checkable
                    checked={previewTheme === 'dark' ? true : undefined}
                    slot="submenu"
                    value="colour:dark"
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
              into the sandbox: tabs are the only behaviour the region has, and
              that behaviour already exists. */}
          {showPanel && (
            <helix-tabs label="Panel" ref={panelTabs} slot="panel" value="terminal">
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
                  src="/design/sandbox/specs"
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

        {/* A real drawer on a phone: focus trapped, Escape closes, page behind
            covered. The CSS transform it replaced was none of those. */}
        {narrow ? (
          <helix-drawer label="Examples" open={railOpen} placement="end" ref={rail}>
            {tree}
          </helix-drawer>
        ) : (
          <aside className="examplesRail">{tree}</aside>
        )}
      </div>
    </>
  )
}
