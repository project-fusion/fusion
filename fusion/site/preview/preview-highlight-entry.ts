/**
 * Helix's own highlighter in the preview frame, loaded only when a render
 * carries a Code Input: `@fusion.dev/helix-sandbox/code-block` registers its
 * grammars for every Code Block and Code Input on the page, in the syntax
 * tokens.
 *
 * Bundled to a classic script beside `frame.js` by `build-frame.mjs`, for the
 * reason `preview-terminal-entry.ts` gives, and separate from it because most
 * renders draw no code to type in and the grammars are this file's weight.
 */

import '@fusion.dev/helix-sandbox/code-block'

window.helixPreviewHighlight = true
