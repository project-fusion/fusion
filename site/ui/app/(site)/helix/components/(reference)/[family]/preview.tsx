'use client'

import type {
  HelixBeforeEditEvent,
  HelixResizeEvent,
  HelixSandbox,
  HelixSandboxPreview,
} from '@fusion.dev/helix'
import { useEffect, useRef, useState } from 'react'
import { useSandboxEditor } from '@/hooks/use-sandbox-editor/use-sandbox-editor'
import docs from '../docs.module.css'

/**
 * The cycle order, which is deliberate rather than alphabetical.
 *
 * `hug` to `centered` to `padded` to `fullscreen` is least room to most, so pressing
 * the control repeatedly walks one direction and arrives back where it started.
 * Ordered by what the modes do, so it is not sorted with the rest of this file.
 */
const LAYOUTS: PreviewLayout[] = ['hug', 'centered', 'padded', 'fullscreen']

/**
 * What each mode is called and what it is drawn as.
 *
 * The tooltip names the mode the reader is *in*, not the one the next press
 * would bring, because the control is showing a state rather than promising an
 * action: the icon and the words have to agree about which of the three is
 * currently true.
 */
const LAYOUT_LABEL: Record<PreviewLayout, string> = {
  centered: 'Centered layout',
  fullscreen: 'Fullscreen layout',
  hug: 'Hugged layout',
  padded: 'Padded layout',
}

const LAYOUT_ICON: Record<PreviewLayout, string> = {
  centered: 'corners-in',
  fullscreen: 'corners-out',
  hug: 'arrows-in-line-vertical',
  padded: 'layout',
}

/** The frame's three layout modes, which the example may pick from. */
export type PreviewLayout = 'centered' | 'fullscreen' | 'hug' | 'padded'

interface Props {
  /** The example's stylesheet, or empty where it needs none. */
  css: string
  html: string
  /**
   * What the example asked for with `@layout`, where it asked for anything.
   *
   * `centered` when it did not, because that is what suits most of the
   * library: only the examples the default is wrong for carry an annotation.
   */
  layout?: PreviewLayout
  /**
   * A floor for the pane, from `@min`, where measurement cannot answer.
   *
   * The overlay families and nothing else: they draw a trigger, and what they
   * open is `position: fixed` and excluded from the frame's measurement on
   * purpose, so the pane has to be given room to open into rather than fitted
   * to what it can see.
   */
  min?: number
  /** Where the same example opens for real, with its siblings beside it. */
  sandboxHref: string
}

/**
 * How much room the two panes get, in pixels.
 *
 * **The preview follows its content and the editor does not**, which is the
 * whole of the change: a source pane is worth the same five or six lines
 * whatever is drawn above it, and a fixed share of a fixed box could say neither
 * thing. Before this both were a percentage of 32rem, so every family got the
 * same 317 over 195 whether it rendered a button or a table.
 *
 * The floor keeps a small example on a stage rather than collapsing it onto its
 * own content. 180 rather than the 300 this was first written with: measured on
 * the carousel page, the frame reported 79 pixels of content into a pane held at
 * 299, so the floor was doing all the work and every small example still came out
 * the same height. A floor should catch the ones that would vanish, not decide
 * for most of them. The ceiling keeps a long one from pushing the API tables beneath
 * it off the screen; past it the frame scrolls, which is what a frame is for.
 */
const PREVIEW_MIN = 180
const PREVIEW_MAX = 720
const EDITOR = 256

/** What the preview pane should be, given what the frame says it drew. */
const previewSize = (drawn: number | undefined, min = PREVIEW_MIN): number =>
  Math.min(PREVIEW_MAX, Math.max(min, drawn ?? min))

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
export function ComponentPreview({
  css,
  html,
  layout: declared = 'centered',
  min = PREVIEW_MIN,
  sandboxHref,
}: Props) {
  /* **What the example asked for is the starting point, not the whole answer.**
     `@layout` is authored knowledge about the component and belongs in the
     file; which of the three a reader wants to look at right now is theirs and
     cannot be predicted. The annotation seeds the state and the control moves
     it. */
  const [layout, setLayout] = useState<PreviewLayout>(declared)
  /* **The editor is a subpath and it is asked for after hydration**, which is
     two decisions rather than one. The subpath because it carries CodeMirror
     and a page showing a sandbox without an editable pane should not pay for
     one; this page has one, so it pays. The effect because a module-scope
     `import '@fusion.dev/helix-sandbox/editor'` registers the definitions during the
     client bundle's evaluation, so the elements upgrade and write their own
     bookkeeping before React hydrates, and React then reads a DOM that has
     gained attributes since the server wrote it.

     That is 241's fault exactly, and 241 fixed two of the three files that had
     it. This one was never named in the row, and the reference pages went on
     reporting a `data-settled` the server never sent while `/helix/theme` and
     `/helix/sandbox` had gone quiet. Found by probing a route the row had not
     listed.

     **The fourth report is what settled it, and the cause is fixed rather than
     avoided.** Three routes were patched one at a time by moving a registration
     to the other side of hydration, which is three fixes for a timing and none
     for the cause: the element was keeping private bookkeeping on the host,
     where React reconciles. `HelixElement` records it as an
     `ElementInternals.states` entry now, which is not in the DOM at all, so no
     route can report it whenever its definitions happen to land.

     The effect stays because the reason above it stands on its own: this page
     has one sandbox and the editor is worth deferring on its own weight. */
  useSandboxEditor()

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
  /* How tall the frame says its example is, once it has said so. `undefined`
     until the first measurement, so the pane sits at its floor through the
     moment before the frame has drawn anything rather than collapsing and then
     jumping. */
  const [drawn, setDrawn] = useState<number>()
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

  const sourceEdited = (event: HelixBeforeEditEvent) => {
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

  /* **Only when it has moved, and only by enough to see.** The observer inside
     the frame reports through every step of an upgrade, so a run of measurements
     a pixel apart would set state on each and re-render the page under somebody
     who is typing into it. Eight pixels is under half a line and over the noise. */
  const measured = (event: HelixResizeEvent) => {
    const { size } = event.detail
    setDrawn((held) => (held !== undefined && Math.abs(held - size) < 8 ? held : size))
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
      class={docs.docsPreview}
      lead="preview"
      onhelix-before-edit={sourceEdited}
      orientation="vertical"
      ref={sandbox}
      split={Math.round((previewSize(drawn, min) / (previewSize(drawn, min) + EDITOR)) * 100)}
      style={{ blockSize: `${previewSize(drawn, min) + EDITOR}px` }}
    >
      {/* Laid out by the frame, not by this page. The preview renders into a
          document with its own layout modes; styling the pane from out here
          instead shrank the iframe to its content and clipped the example,
          because a centered grid item does not stretch. The frame is the only
          thing that can lay out its own body.
          
          **`centered` since 25 Aug 2026, and this argued for `padded` until
          then.** The case against was that a card floated in the middle of a
          tall pane and a full-width component looked identical to one that had
          failed to fill it. Both of those were consequences of the pane being a
          fixed 32rem whatever it held. It is not any more: it follows what the
          frame says it drew, so there is no tall pane for a small example to
          float in, and the space a full-width component fills is the space
          there is. What centering does now is hold the example against the
          middle of its own stage rather than the top left corner of one. */}
      {/* **Bound here and not on the sandbox around it.** `helix-resize` is
          composed and does reach the root, but React repairs an `on` prop at the
          moment the element itself dispatches, and an event merely passing
          through a host on its way up never calls that host's own
          `dispatchEvent`. Written on `<helix-sandbox>` the prop was recorded and
          never wired, so nothing set the measured height and every page sat at
          the floor looking exactly like the fixed pane it replaced. */}
      <helix-sandbox-preview
        label="Example preview"
        layout={layout}
        onhelix-resize={measured}
        ref={preview}
        slot="preview"
        src="/sandbox/frame.html"
      ></helix-sandbox-preview>

      <div className={docs.docsPreviewSource} slot="source">
        {/* Dense, which the bar should have declared from the start. A toolbar
            is dense by nature and the library's own say so themselves; this one
            did not, so its two controls came out at the full 40px control
            height inside a 49px bar. `data-density` costs the controls no API
            and crosses their shadow boundaries on its own. */}
        <div className={docs.docsPreviewBar} data-density="sm">
          {files.map((name) => (
            <button
              aria-pressed={file === name}
              className={docs.docsPreviewTab}
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
            className={docs.docsPreviewCopy}
            key={file}
            label={`Copy ${file}`}
            value={file === 'styles.css' ? styles : source}
          ></helix-copy-button>
          {/* Cycles the three frame layouts, showing the one it is in.
              **A cycle rather than a menu**, because three is few enough that
              pressing twice is faster than opening anything, and the control
              stays one icon wide in a bar that already holds two. The order
              runs least framing to most, so repeated presses walk one way and
              come back round.

              The tooltip and the `aria-label` say the same words, so what a
              pointer reveals and what a screen reader announces cannot
              disagree. */}
          <helix-tooltip content={LAYOUT_LABEL[layout]}>
            <button
              aria-label={LAYOUT_LABEL[layout]}
              className={docs.docsPreviewOpen}
              onClick={() =>
                setLayout(LAYOUTS[(LAYOUTS.indexOf(layout) + 1) % LAYOUTS.length] as PreviewLayout)
              }
              type="button"
            >
              <helix-icon name={LAYOUT_ICON[layout]}></helix-icon>
            </button>
          </helix-tooltip>
          {/* The way out to the real thing. An anchor rather than a button,
              because it goes somewhere: middle click and open-in-new-tab are
              free, and a button would have had to reimplement both badly. */}
          {/* No `data-button`: that helper draws a button's fill and border, and
              beside a copy button that is transparent at rest the pair read as
              two different kinds of control. This is an icon button's box, and
              the tooltip is what the copy button already has. */}
          <helix-tooltip content="Open in the sandbox">
            <a aria-label="Open in the sandbox" className={docs.docsPreviewOpen} href={sandboxHref}>
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
