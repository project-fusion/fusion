'use client'

import type { HelixResizeEvent, HelixSandboxPreview } from '@fusion.dev/helix'
import { useEffect, useRef, useState } from 'react'
import { PREVIEW_RELAY } from '@/preview/preview-relay'
import { useSiteScheme } from '@/utils/site-scheme/site-scheme'
import { useInertFrame } from './inert-frame'
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

  useInertFrame(preview)

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
      data-site-anatomy=""
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
