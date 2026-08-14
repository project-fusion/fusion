'use client'

// The editor is on its own path: it carries CodeMirror, and the site's
// element registration runs on every page.
import '@helix-io/sandbox/editor'
import type { HelixSandboxPreview, HelixSandboxTerminal } from '@helix-io/sandbox'
import type { HelixSandboxEditor } from '@helix-io/sandbox/editor'
import type { HelixDrawer, HelixToggleGroup, HelixTree } from '@helix-io/web'
import Link from 'next/link'
import { useCallback, useEffect, useRef, useState } from 'react'
import type { Family } from '../../../../lib/catalog'
import { useHelixEvent } from '../../../../lib/use-helix-event'

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
  const terminal = useRef<HelixSandboxTerminal>(null)
  const editors = useRef<Record<string, HelixSandboxEditor | null>>({})
  const [familySlug, setFamilySlug] = useState<string | null>(null)
  const [exampleSlug, setExampleSlug] = useState<string | null>(null)
  const [pane, setPane] = useState<'html' | 'css'>('html')
  const [previewTheme, setPreviewTheme] = useState<'dark' | 'light'>('dark')
  const [copied, setCopied] = useState(false)
  const [railOpen, setRailOpen] = useState(false)
  const [narrow, setNarrow] = useState(false)

  // Read the URL after mount, not during render: the page is static, so the
  // server has no query string and reading one would make the first paint
  // disagree with the address bar.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    setFamilySlug(params.get('family'))
    setExampleSlug(params.get('example'))
    setPreviewTheme(document.documentElement.dataset.colorMode === 'light' ? 'light' : 'dark')
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

  const select = useCallback((value: string) => {
    const [nextFamily, nextExample] = value.split('/')
    if (!nextFamily || !nextExample) {
      return
    }
    setFamilySlug(nextFamily)
    setExampleSlug(nextExample)
    setRailOpen(false)
    window.history.replaceState(
      null,
      '',
      `${window.location.pathname}?family=${nextFamily}&example=${nextExample}`,
    )
  }, [])

  // Bound through an effect, not an `onhelix-select` prop. React does not
  // attach custom-element listeners when it hydrates, so the prop form leaves
  // both of these dead on a freshly loaded page. See `useHelixEvent`.
  useHelixEvent(files, 'helix-select', (event) => {
    setPane(event.detail.value as 'html' | 'css')
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

  useEffect(() => {
    if (preview.current && example) {
      preview.current.source = example.html
      preview.current.styles = ''
    }
    // Output belongs to the example that wrote it. Carrying it across reads as
    // the new example having produced warnings it never produced.
    terminal.current?.clear()
  }, [example])

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

  const tree = (
    <helix-tree label="Examples" ref={treeRef} value={activeValue}>
      {withExamples.map((entry) => (
        <helix-tree-item expanded={entry.slug === family.slug} key={entry.slug} value={entry.slug}>
          {entry.label}
          {entry.examples.map((item) => (
            <helix-tree-item key={item.slug} slot="children" value={`${entry.slug}/${item.slug}`}>
              {item.label}
            </helix-tree-item>
          ))}
        </helix-tree-item>
      ))}
    </helix-tree>
  )

  return (
    <>
      <helix-flex align="center" class="workbenchHeader" data-density="sm" gap="md">
        <a data-link="quiet" href="/design">
          <helix-flex align="baseline" gap="2xs" inline>
            <helix-text appearance="body-strong">Helix</helix-text>
            <helix-text appearance="label" tone="subtle">
              sandbox
            </helix-text>
          </helix-flex>
        </a>

        <helix-flex align="baseline" class="workbenchTitle" gap="2xs">
          <helix-text appearance="caption">{family.label}</helix-text>
          <helix-text appearance="caption" tone="subtle">
            /
          </helix-text>
          <helix-text appearance="caption" tone="muted">
            {example.label}
          </helix-text>
        </helix-flex>

        {/* The sandbox's own actions live in its toolbar now. What stays here
            is the one control that is about the page rather than the sandbox. */}
        {narrow && (
          <helix-button appearance="subtle" onClick={() => setRailOpen(true)}>
            Examples
          </helix-button>
        )}
      </helix-flex>

      <div className="workbenchBody">
        <helix-sandbox orientation={narrow ? 'vertical' : 'horizontal'} split={narrow ? 50 : 45}>
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
              <helix-toggle value="html">index.html</helix-toggle>
              <helix-toggle value="css">styles.css</helix-toggle>
            </helix-toggle-group>

            {/* The Environment drilldown belongs here and waits on `helix-menu`
                and `helix-popover`. These are the actions that exist today. */}
            <helix-toolbar label="Sandbox actions" slot="end">
              <helix-button
                appearance="subtle"
                onClick={() => setPreviewTheme(previewTheme === 'light' ? 'dark' : 'light')}
              >
                {previewTheme === 'light' ? 'Light' : 'Dark'}
              </helix-button>
              <helix-button appearance="subtle" onClick={share}>
                {copied ? 'Copied' : 'Share'}
              </helix-button>
              <Link data-button="subtle" href={`/design/components/${family.slug}`}>
                API
              </Link>
            </helix-toolbar>
          </helix-sandbox-toolbar>

          {/* Both stay mounted, so switching files does not discard what was
              typed in the other, and they share one cell so the hidden one
              costs no height. */}
          <div className="sourceFiles" slot="source">
            <div data-file hidden={pane !== 'html'}>
              <helix-sandbox-editor
                field-label="Example markup"
                key={`${activeValue}-html`}
                language="html"
                name="html"
                ref={(node: HelixSandboxEditor | null) => {
                  editors.current.html = node
                }}
                value={example.html}
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
                value=""
              ></helix-sandbox-editor>
            </div>
          </div>

          <helix-sandbox-preview
            data-color-mode={previewTheme}
            ref={preview}
            slot="preview"
            src="/sandbox/frame.html"
          ></helix-sandbox-preview>

          {/* The panel's tabs are `helix-tabs`, not a second tab set built
              into the sandbox: tabs are the only behaviour the region has, and
              that behaviour already exists. */}
          <helix-tabs appearance="underline" label="Panel" slot="panel" value="terminal">
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

          {/* Fed by the sandbox, not from here. `line` and `column` are never
              passed as props, so React leaves them alone and the element
              writes them on every cursor move without a re-render. */}
          <helix-sandbox-status-bar language={pane} slot="status"></helix-sandbox-status-bar>
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
