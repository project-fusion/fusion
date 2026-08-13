'use client'

import type { HelixSandboxPreview } from '@helix-io/sandbox'
import Link from 'next/link'
import { useCallback, useEffect, useRef, useState } from 'react'
import type { Family } from '../../../lib/catalog'

/**
 * The sandbox workbench: source panes, a live preview, and the example browser.
 *
 * Everything that identifies what you are looking at lives in the URL, so the
 * address bar is the share format and no server state is involved. Everything
 * about how you are looking at it, the split and the preview theme, is local to
 * the session.
 */

interface Props {
  families: Family[]
}

/** Reads the example named by the URL, falling back to the first one shipped. */
const resolve = (families: Family[], familySlug: string | null, exampleSlug: string | null) => {
  const withExamples = families.filter((entry) => entry.examples.length > 0)
  const family =
    withExamples.find((entry) => entry.slug === familySlug) ?? (withExamples[0] as Family)
  const example = family.examples.find((entry) => entry.slug === exampleSlug) ?? family.examples[0]
  return { example, family }
}

export function SandboxWorkbench({ families }: Props) {
  const preview = useRef<HelixSandboxPreview>(null)
  const [familySlug, setFamilySlug] = useState<string | null>(null)
  const [exampleSlug, setExampleSlug] = useState<string | null>(null)
  const [pane, setPane] = useState<'html' | 'css'>('html')
  const [previewTheme, setPreviewTheme] = useState<'dark' | 'light'>('dark')
  const [copied, setCopied] = useState(false)

  // Read the URL after mount rather than during render: the page is static, so
  // the server has no query string and reading one during render would make the
  // first paint disagree with the URL.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    setFamilySlug(params.get('family'))
    setExampleSlug(params.get('example'))
    setPreviewTheme(document.documentElement.dataset.theme === 'light' ? 'light' : 'dark')
  }, [])

  const { example, family } = resolve(families, familySlug, exampleSlug)

  const select = useCallback((nextFamily: string, nextExample: string) => {
    setFamilySlug(nextFamily)
    setExampleSlug(nextExample)
    const url = `${window.location.pathname}?family=${nextFamily}&example=${nextExample}`
    // Replace, so browsing the tree does not bury the way back under one entry
    // per example looked at.
    window.history.replaceState(null, '', url)
  }, [])

  // Seed the preview whenever the example changes. The source pane carries the
  // markup as a property, but nothing has been edited, so the SourceChange
  // handshake that normally feeds the preview has not fired.
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
    return <p className="empty">No examples are shipped yet.</p>
  }

  return (
    <>
      <header className="workbenchHeader">
        <Link className="brand" href="/">
          <strong>Helix</strong>
          <span>sandbox</span>
        </Link>

        <div className="workbenchTitle">
          {family.label} <span>/</span> {example.label}
        </div>

        <div className="workbenchActions">
          <button
            aria-pressed={previewTheme === 'light'}
            onClick={() => setPreviewTheme(previewTheme === 'light' ? 'dark' : 'light')}
            type="button"
          >
            {previewTheme === 'light' ? 'Light preview' : 'Dark preview'}
          </button>
          <button onClick={share} type="button">
            {copied ? 'Copied' : 'Share'}
          </button>
          <Link href={`/components/${family.slug}`}>API</Link>
        </div>
      </header>

      <div className="workbenchBody">
        <helix-sandbox orientation="horizontal" split={45}>
          <div className="sourcePane" slot="source">
            <div className="paneTabs" role="tablist">
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
            </div>
            {/* Both panes stay mounted and one is hidden, so switching tabs
                does not discard what was typed in the other. */}
            <helix-sandbox-source
              field-label="Example markup"
              hidden={pane !== 'html'}
              key={`${family.slug}-${example.slug}-html`}
              name="html"
              value={example.html}
            ></helix-sandbox-source>
            <helix-sandbox-source
              field-label="Example stylesheet"
              hidden={pane !== 'css'}
              key={`${family.slug}-${example.slug}-css`}
              name="css"
              value=""
            ></helix-sandbox-source>
          </div>

          {/* The preview carries its own theme attribute, so it can be read in
              light while the tool around it stays dark. */}
          <helix-sandbox-preview
            data-theme={previewTheme}
            ref={preview}
            slot="preview"
          ></helix-sandbox-preview>
        </helix-sandbox>

        <nav aria-label="Examples" className="examplesRail">
          {families
            .filter((entry) => entry.examples.length > 0)
            .map((entry) => (
              <div className="railGroup" key={entry.slug}>
                <span className="railFamily">{entry.label}</span>
                {entry.examples.map((item) => (
                  <button
                    aria-current={
                      entry.slug === family.slug && item.slug === example.slug ? 'true' : undefined
                    }
                    key={item.slug}
                    onClick={() => select(entry.slug, item.slug)}
                    type="button"
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            ))}
        </nav>
      </div>
    </>
  )
}
