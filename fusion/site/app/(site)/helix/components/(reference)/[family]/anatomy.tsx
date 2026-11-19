'use client'

import type { HelixResizeEvent, HelixSandboxPreview } from '@fusion.dev/helix'
import { useEffect, useRef, useState } from 'react'
import { PREVIEW_RELAY } from '@/preview/preview-relay'
import { useSiteScheme } from '@/utils/site-scheme/site-scheme'
import type { PreviewLayout } from './preview'
import sheet from './preview.module.css'

interface Props {
  css: string
  /** The headline example, with the anatomy template after it. */
  html: string
  layout?: PreviewLayout
  min?: number
}

/** The frame's floor and ceiling, as the Preview section's are. */
const ANATOMY_MIN = 180
const ANATOMY_MAX = 720

/**
 * The headline example again, with a numbered marker on each part the family
 * lists in `@anatomy`.
 *
 * **A frame of its own, with no editor.** The markers are measured from the
 * running parts, so an edit in the Preview section above would move them
 * under a legend that no longer matched. This one runs the example as it
 * ships, and the frame draws the markers from the template the page sends
 * after it: see `preview/preview-anatomy.ts`.
 */
export function AnatomyPreview({ css, html, layout = 'centered', min = ANATOMY_MIN }: Props) {
  const scheme = useSiteScheme()
  const preview = useRef<HelixSandboxPreview>(null)
  const [drawn, setDrawn] = useState<number>()

  useEffect(() => {
    const frame = preview.current
    if (!frame) {
      return
    }
    frame.source = html
    frame.styles = css
  }, [html, css])

  /* **Focus that arrives is handed back.** `inert` keeps a reader from moving
     into the frame, and a modal the example opens still moves the page's focus
     into it as it loads: measured on Dialog and Drawer in Chromium. The page
     hears that only as its window losing focus, with this element active, so
     the frame inside it is blurred then, and once on mount for a frame that
     took focus before the page hydrated. */
  useEffect(() => {
    const host = preview.current
    if (!host) {
      return
    }
    /* **Inert, because it is a picture.** A press could close the part the
       legend numbers, and the legend under it is the same list in words. Set
       here, since the element's typings take no `inert`. */
    host.inert = true
    const release = () => {
      const frame = document.activeElement === host ? host.shadowRoot?.activeElement : undefined
      if (frame instanceof HTMLElement) {
        frame.blur()
      }
    }
    release()
    /* **Marked once the frame has drawn its markers**, as
       `data-anatomy-drawn`, which the site's visual check waits for before it
       pictures a family page. Only this element's own frame is heard. */
    const drawn = (event: MessageEvent<{ type?: string }>) => {
      const frame = host.shadowRoot?.querySelector('iframe')?.contentWindow
      if (event.data?.type === 'helix-preview-anatomy-drawn' && frame && event.source === frame) {
        host.dataset.anatomyDrawn = ''
      }
    }
    addEventListener('blur', release)
    addEventListener('message', drawn)
    return () => {
      removeEventListener('blur', release)
      removeEventListener('message', drawn)
    }
  }, [])

  /* Eight pixels, for the Preview section's reason: the frame reports through
     every step of an upgrade. */
  const measured = (event: HelixResizeEvent) => {
    const { size } = event.detail
    setDrawn((held) => (held !== undefined && Math.abs(held - size) < 8 ? held : size))
  }

  const size = Math.min(ANATOMY_MAX, Math.max(min, drawn ?? min))
  return (
    <helix-sandbox-preview
      class={sheet.anatomyPreview}
      color-mode={scheme}
      label="Anatomy preview"
      layout={layout}
      onhelix-resize={measured}
      ref={preview}
      relay={PREVIEW_RELAY}
      src="/sandbox/frame.html"
      style={{ blockSize: `${size}px` }}
    ></helix-sandbox-preview>
  )
}
