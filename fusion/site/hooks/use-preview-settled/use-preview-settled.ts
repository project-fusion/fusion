import type { HelixSandboxPreview } from '@fusion.dev/helix'
import { type RefObject, useEffect } from 'react'

/**
 * How long a preview is watched for its first drawing, in milliseconds.
 *
 * Twice the five seconds `helix visual` waits for a ready promise, so a frame
 * that never draws is pictured as it is, and a reader's page stops watching it.
 */
const PATIENCE = 10_000

/**
 * Resolves once `preview` shows its frame, or once `until` has passed.
 *
 * **A preview holds its frame transparent until the frame says it drew**, and
 * reports that as `:state(blank)` from its first update. A custom state has no
 * event, so it is read once a frame.
 */
const shown = async (preview: HelixSandboxPreview, until: number): Promise<void> => {
  await customElements.whenDefined('helix-sandbox-preview')
  await preview.updateComplete
  while (preview.isConnected && preview.matches(':state(blank)') && performance.now() < until) {
    await new Promise((done) => requestAnimationFrame(done))
  }
}

/**
 * Gives `holder` a `whenSettled` promise that resolves once `preview` has drawn
 * the first example it was sent.
 *
 * **For `helix visual`**, which awaits a `whenSettled` on every element before
 * it pictures a page: the name `settle.readyProperty` takes in
 * `fusion/site/visual.config.ts`. Every Helix element carries one, and the
 * preview's resolves a frame after its own first update, while its frame is
 * still loading a 2 MB bundle and is held transparent. On October 11, 2026 the
 * theme builder's phone shot failed twice on CI with the preview pictured
 * empty on both takes. Locally, the harness's wait ended with the preview
 * still blank on five of eight fresh loads, and with this promise on none of
 * eight.
 *
 * **The promise goes on an element of the page's own**, because the preview's
 * `whenSettled` is the component's and says something else: that its
 * transitions are on.
 */
export const usePreviewSettled = (
  holder: RefObject<HTMLElement | null>,
  preview: RefObject<HelixSandboxPreview | null>,
): void => {
  useEffect(() => {
    if (holder.current && preview.current) {
      Object.assign(holder.current, {
        whenSettled: shown(preview.current, performance.now() + PATIENCE),
      })
    }
  }, [holder, preview])
}
