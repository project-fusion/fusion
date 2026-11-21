'use client'

import type { HelixSandboxPreview } from '@fusion.dev/helix'
import { type RefObject, useEffect } from 'react'

/**
 * Makes a preview a picture: `inert`, with any focus it takes handed back.
 *
 * **Inert, because a picture is not for pressing.** A press could close the
 * part a legend numbers, and the words beside a picture say the same thing.
 * Set here, since the element's typings take no `inert`.
 *
 * **Focus that arrives is handed back.** `inert` keeps a reader from moving
 * into the frame, and a modal an example opens still moves the page's focus
 * into it as it loads: measured on Dialog and Drawer in Chromium. The page
 * hears that only as its window losing focus, with this element active, so the
 * frame inside it is blurred then, and once on mount for a frame that took
 * focus before the page hydrated.
 */
export const useInertFrame = (preview: RefObject<HelixSandboxPreview | null>): void => {
  useEffect(() => {
    const host = preview.current
    if (!host) {
      return
    }
    host.inert = true
    const release = () => {
      const frame = document.activeElement === host ? host.shadowRoot?.activeElement : undefined
      if (frame instanceof HTMLElement) {
        frame.blur()
      }
    }
    release()
    addEventListener('blur', release)
    return () => removeEventListener('blur', release)
  }, [preview])
}
