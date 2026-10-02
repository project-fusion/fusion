/**
 * What the frame tells what runs inside it, named once for both sides.
 *
 * A module of its own so `frame.js` and the map and graph chunks can share
 * the name without either bundling the other.
 */

/** Sent on the window after the frame applies new styles or a new mode. */
export const RESTYLED = 'helix-preview-restyled'

declare global {
  interface Window {
    /**
     * What the map chunk leaves on the window once it has loaded, and what the
     * frame calls to mount the maps in a render and later take them down.
     */
    helixPreviewMap?: { mount(root: HTMLElement): () => void }
    /** What the graph chunk leaves on the window, the same way. */
    helixPreviewGraph?: { mount(root: HTMLElement): () => void }
    /** What the cosmos.gl graph chunk leaves on the window, the same way. */
    helixPreviewGraphCosmos?: { mount(root: HTMLElement): () => void }
    /** What the three.js graph chunk leaves on the window, the same way. */
    helixPreviewGraphThree?: { mount(root: HTMLElement): () => void }
  }
}
