'use client'

/* The editor is a subpath, not the barrel. It carries CodeMirror, and that
   split exists so a page showing a sandbox without an editable pane does not
   pay for one. This page has an editable pane, so it pays. */
import '@helix-io/sandbox/editor'
import type { HelixChangeEvent, HelixSandbox, HelixSandboxPreview } from '@helix-io/web'
import { useEffect, useRef, useState } from 'react'

interface Props {
  /** The example's stylesheet, or empty where it needs none. */
  css: string
  html: string
  /** Where the same example opens for real, with its siblings beside it. */
  sandboxHref: string
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
export function ComponentPreview({ css, html, sandboxHref }: Props) {
  const preview = useRef<HelixSandboxPreview>(null)
  const sandbox = useRef<HelixSandbox>(null)

  /* What has been typed, per file.
   *
   * The editor is keyed on the file so that switching tabs swaps the language
   * as well as the text, and a keyed element is a *new* element: without this
   * it came back holding the example's original source and whatever had been
   * typed was gone. Keeping the edits out here means the remount restores them
   * instead of discarding them.
   *
   * Keyed by the editor's own `name`, which is what the change event carries,
   * so the two halves cannot disagree about which file was edited. */
  const [edits, setEdits] = useState<Record<string, string>>({})
  const [file, setFile] = useState<'index.html' | 'styles.css'>('index.html')
  /* Both files, always. Only 35 of the 272 examples ship a stylesheet, and
     hiding the tab for the rest meant a reader could not add one: the sandbox
     is a place to try things, and the second file is where most of the trying
     happens. An empty `styles.css` is a blank page, which is the correct thing
     to hand someone who wants to write CSS. */
  const files = ['index.html', 'styles.css'] as const

  /* Pushed rather than waited for. The root relays a *change*, and nothing has
     changed yet on first paint: the source pane holds its value and has had no
     reason to announce it. Setting both here is what makes the preview show the
     example rather than an empty frame until someone types. */
  const source = edits.html ?? html
  const styles = edits.css ?? css

  const sourceEdited = (event: HelixChangeEvent) => {
    /* Which pane is the element, not the detail: every pane reports `value`,
       and `composedPath()[0]` is what survives the shadow boundary the event
       crossed to get here. */
    const pane = event.composedPath()[0] as { name?: string }
    const key = pane?.name
    if (key !== 'html' && key !== 'css') {
      return
    }
    const { value } = event.detail
    setEdits((held) => (held[key] === value ? held : { ...held, [key]: value }))
  }

  useEffect(() => {
    const frame = preview.current
    if (!frame) {
      return
    }
    frame.source = source
    frame.styles = styles
  }, [source, styles])

  return (
    <helix-sandbox
      class="docsPreview"
      lead="preview"
      onhelix-change={sourceEdited}
      orientation="vertical"
      ref={sandbox}
      split={62}
    >
      {/* Laid out by the frame, not by this page. The preview renders into a
          document with its own layout modes; styling the pane from out here
          instead shrank the iframe to its content and clipped the example,
          because a centred grid item does not stretch. The frame is the only
          thing that can lay out its own body.
          
          `padded` rather than `centered`: an example reads as a page fragment,
          and a fragment starts where a page starts. Centred, a card floated in
          the middle of a tall pane and a full-width component looked identical
          to one that had failed to fill it. */}
      <helix-sandbox-preview
        label="Example preview"
        layout="padded"
        ref={preview}
        slot="preview"
        src="/sandbox/frame.html"
      ></helix-sandbox-preview>

      <div className="docsPreviewSource" slot="source">
        {/* Dense, which the bar should have declared from the start. A toolbar
            is dense by nature and the library's own say so themselves; this one
            did not, so its two controls came out at the full 40px control
            height inside a 49px bar. `data-density` costs the controls no API
            and crosses their shadow boundaries on its own. */}
        <div className="docsPreviewBar" data-density="sm">
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
            value={file === 'styles.css' ? styles : source}
          ></helix-copy-button>
          {/* The way out to the real thing. An anchor rather than a button,
              because it goes somewhere: middle click and open-in-new-tab are
              free, and a button would have had to reimplement both badly. */}
          {/* No `data-button`: that helper draws a button's fill and border, and
              beside a copy button that is transparent at rest the pair read as
              two different kinds of control. This is an icon button's box, and
              the tooltip is what the copy button already has. */}
          <helix-tooltip content="Open in the sandbox">
            <a aria-label="Open in the sandbox" className="docsPreviewOpen" href={sandboxHref}>
              <helix-icon name="arrow-square-out"></helix-icon>
            </a>
          </helix-tooltip>
        </div>
        {/* One pane, re-keyed per file. Two panes both named `source` would be
            two elements answering to one slot, and the assignment goes to the
            first: the second file would never be shown. */}
        {/* CodeMirror, and still editable. A reference page is a place to look,
            but the cheapest way to understand a component is to change one line
            of it and watch the preview move. Editing here is not saved and is
            not meant to be: `View in Sandbox` is where an example is kept. */}
        <helix-sandbox-editor
          key={file}
          language={file === 'styles.css' ? 'css' : 'html'}
          name={file === 'styles.css' ? 'css' : 'html'}
          value={file === 'styles.css' ? styles : source}
        ></helix-sandbox-editor>
      </div>
    </helix-sandbox>
  )
}
