'use client'

import type { HelixSandboxPreview } from '@helix-io/sandbox'
import { useEffect, useRef } from 'react'

/**
 * Wires an example's markup into the sandbox once the elements are registered.
 *
 * A client component because it holds a ref and seeds the preview: the source
 * pane carries the markup as an attribute, but the preview starts empty and
 * nothing has been edited yet, so the `SourceChange` handshake has not fired.
 * Seeding here rather than repeating the markup in a `source` attribute keeps
 * one copy of the example on the page.
 *
 * The ref is typed to the element class rather than `HTMLElement`, which is
 * what makes `node.source` a checked assignment instead of a cast.
 */
export function SandboxStage({ html }: { html: string }) {
  const preview = useRef<HelixSandboxPreview>(null)

  useEffect(() => {
    // Runs after the definition has loaded, so the property lands on an
    // upgraded element rather than being shadowed by an instance field.
    if (preview.current) {
      preview.current.source = html
    }
  }, [html])

  return (
    <helix-sandbox orientation="horizontal">
      <helix-sandbox-source slot="source" value={html}></helix-sandbox-source>
      <helix-sandbox-preview ref={preview} slot="preview"></helix-sandbox-preview>
    </helix-sandbox>
  )
}
