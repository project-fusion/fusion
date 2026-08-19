'use client'

import type { HelixSandboxPreview } from '@helix-io/web'
import { useEffect, useRef, useState } from 'react'

interface Props {
  /** The example's stylesheet, or empty where it needs none. */
  css: string
  html: string
}

/**
 * The headline example, running.
 *
 * A client component because the sandbox is one: the preview talks to its frame
 * over `postMessage` and the source pane dispatches events the root listens
 * for. The page around it stays a server component, which is the whole point of
 * keeping this in its own file.
 *
 * `lead="preview"` is why the pane order became a property. A workbench is a
 * place to write, so the source leads there; a reference page is a place to
 * look, so the preview leads here and the source is what a reader opens if they
 * want to know how it was done.
 *
 * The bar rides inside the source region rather than in the `toolbar` slot,
 * because the toolbar spans both panes at the top and what is wanted is a bar
 * *between* the preview and the editor. Slotting a wrapper is the same shape
 * the workbench already uses for its own file tabs.
 */
export function ComponentPreview({ css, html }: Props) {
  const preview = useRef<HelixSandboxPreview>(null)
  const [file, setFile] = useState<'index.html' | 'styles.css'>('index.html')
  const files = css ? (['index.html', 'styles.css'] as const) : (['index.html'] as const)

  /* Pushed rather than waited for. The root relays a *change*, and nothing has
     changed yet on first paint: the source pane holds its value and has had no
     reason to announce it. Setting both here is what makes the preview show the
     example rather than an empty frame until someone types. */
  useEffect(() => {
    const frame = preview.current
    if (!frame) {
      return
    }
    frame.source = html
    frame.styles = css
  }, [css, html])

  return (
    <helix-sandbox class="docsPreview" lead="preview" orientation="vertical" split={62}>
      <helix-sandbox-preview
        label="Example preview"
        ref={preview}
        slot="preview"
        src="/sandbox/frame.html"
      ></helix-sandbox-preview>

      <div className="docsPreviewSource" slot="source">
        <div className="docsPreviewBar">
          {files.map((name) => (
            <button
              aria-pressed={file === name}
              className="docsPreviewTab"
              key={name}
              onClick={() => setFile(name)}
              type="button"
            >
              {name}
            </button>
          ))}
          {/* Copies whichever file is showing, not the example as a whole. The
              tab and the button are one control between them: a reader looking
              at `styles.css` and pressing copy means that stylesheet. Keyed on
              the file so the confirmation cannot survive a tab change and claim
              the new file was the one copied. */}
          <helix-copy-button
            className="docsPreviewCopy"
            key={file}
            label={`Copy ${file}`}
            value={file === 'styles.css' ? css : html}
          ></helix-copy-button>
        </div>
        {/* One pane, re-keyed per file. Two panes both named `source` would be
            two elements answering to one slot, and the assignment goes to the
            first: the second file would never be shown. */}
        <helix-sandbox-source
          key={file}
          name={file === 'styles.css' ? 'css' : 'html'}
          slot=""
          value={file === 'styles.css' ? css : html}
        ></helix-sandbox-source>
      </div>
    </helix-sandbox>
  )
}
