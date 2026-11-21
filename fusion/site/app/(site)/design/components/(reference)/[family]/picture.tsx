'use client'

import type { HelixSandboxPreview } from '@fusion.dev/helix'
import { useEffect, useRef } from 'react'
import { PREVIEW_RELAY } from '@/preview/preview-relay'
import { useSiteScheme } from '@/utils/site-scheme/site-scheme'
import { useInertFrame } from './inert-frame'
import type { PreviewLayout } from './preview'

interface Props {
  className: string
  css: string
  /** A family's headline example, with the picture template after it. */
  html: string
  layout?: PreviewLayout
}

/**
 * A family's headline example drawn small, at the start of a row in the
 * choosing table. The frame scales it to the tile: see
 * `preview/preview-picture.ts`.
 *
 * Hidden from assistive technology, since the row's words name the family and
 * the situation it is for.
 */
export function FamilyPicture({ className, css, html, layout = 'centered' }: Props) {
  const scheme = useSiteScheme()
  const preview = useRef<HelixSandboxPreview>(null)

  useEffect(() => {
    const frame = preview.current
    if (!frame) {
      return
    }
    frame.source = html
    frame.styles = css
  }, [html, css])

  useInertFrame(preview)

  return (
    /* Hidden on a wrapper, so it is hidden in the server's markup as well,
       before the effect makes the frame inert. */
    <span aria-hidden="true" className={className} data-site-picture="">
      <helix-sandbox-preview
        color-mode={scheme}
        label="Family picture"
        layout={layout}
        ref={preview}
        relay={PREVIEW_RELAY}
        src="/sandbox/frame.html"
        style={{ blockSize: '100%' }}
      ></helix-sandbox-preview>
    </span>
  )
}
