'use client'

import type { HelixSandboxPreview } from '@helix-io/sandbox'
import type { HelixSelectionChangeEvent } from '@helix-io/web'
import { useCallback, useEffect, useRef, useState } from 'react'
import type { Family } from '../../../lib/catalog'

/**
 * The sandbox workbench: source panes, a live preview, and the example tree.
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
    setPreviewTheme(document.documentElement.dataset.theme === 'light' ? 'light' : 'dark')
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

  useEffect(() => {
    if (preview.current && example) {
      preview.current.source = example.html
      preview.current.styles = ''
    }
  }, [example])

  const share = async () => {
    await navigator.clipboard.writeText(window.location.href)
    setCopied(true)
    window.setTimeout(() => setCopied(false), 2000)
  }

  if (!example) {
    return (
      <helix-text block tone="subtle">
        No examples are shipped yet.
      </helix-text>
    )
  }

  const activeValue = `${family.slug}/${example.slug}`

  return (
    <>
      <helix-flex align="center" class="workbenchHeader" gap="md">
        <helix-link appearance="quiet" href="/">
          <helix-flex align="baseline" gap="2xs" inline>
            <helix-text weight="semibold">Helix</helix-text>
            <helix-text size="xs" tone="subtle">
              sandbox
            </helix-text>
          </helix-flex>
        </helix-link>

        <helix-flex align="baseline" class="workbenchTitle" gap="2xs">
          <helix-text size="sm">{family.label}</helix-text>
          <helix-text size="sm" tone="subtle">
            /
          </helix-text>
          <helix-text size="sm" tone="muted">
            {example.label}
          </helix-text>
        </helix-flex>

        <helix-flex align="center" gap="2xs">
          <helix-button
            appearance="subtle"
            onClick={() => setPreviewTheme(previewTheme === 'light' ? 'dark' : 'light')}
            size="sm"
          >
            {previewTheme === 'light' ? 'Light' : 'Dark'}
          </helix-button>
          <helix-button appearance="subtle" onClick={share} size="sm">
            {copied ? 'Copied' : 'Share'}
          </helix-button>
          <helix-button appearance="subtle" href={`/components/${family.slug}`} size="sm">
            API
          </helix-button>
          {/* Only reachable at narrow widths, where the rail is a drawer. */}
          <helix-button
            appearance="subtle"
            class="railToggle"
            onClick={() => setRailOpen(!railOpen)}
            size="sm"
          >
            Examples
          </helix-button>
        </helix-flex>
      </helix-flex>

      <div className="workbenchBody" data-rail-open={railOpen ? 'true' : 'false'}>
        <helix-sandbox orientation={narrow ? 'vertical' : 'horizontal'} split={narrow ? 50 : 45}>
          <helix-flex class="sourcePane" direction="column" slot="source">
            <helix-flex class="paneTabs" gap="none" role="tablist">
              {(['html', 'css'] as const).map((name) => (
                <button
                  aria-selected={pane === name}
                  key={name}
                  onClick={() => setPane(name)}
                  role="tab"
                  type="button"
                >
                  {name === 'html' ? 'index.html' : 'styles.css'}
                </button>
              ))}
            </helix-flex>
            {/* Both panes stay mounted and one is hidden, so switching tabs
                does not discard what was typed in the other. */}
            <helix-sandbox-source
              field-label="Example markup"
              hidden={pane !== 'html'}
              key={`${activeValue}-html`}
              name="html"
              value={example.html}
            ></helix-sandbox-source>
            <helix-sandbox-source
              field-label="Example stylesheet"
              hidden={pane !== 'css'}
              key={`${activeValue}-css`}
              name="css"
              value=""
            ></helix-sandbox-source>
          </helix-flex>

          <helix-sandbox-preview
            data-theme={previewTheme}
            ref={preview}
            slot="preview"
          ></helix-sandbox-preview>
        </helix-sandbox>

        <aside className="examplesRail">
          <helix-tree
            label="Examples"
            onSelectionChange={(event: HelixSelectionChangeEvent) => select(event.detail.value)}
            value={activeValue}
          >
            {withExamples.map((entry) => (
              <helix-tree-item
                expanded={entry.slug === family.slug}
                key={entry.slug}
                value={entry.slug}
              >
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
        </aside>
      </div>
    </>
  )
}
