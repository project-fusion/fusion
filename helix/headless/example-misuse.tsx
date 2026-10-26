/**
 * Usage the typings refuse, checked with the examples.
 *
 * An example is documentation, so a wrong line cannot sit in one. This file is
 * in `tsconfig.examples.json` beside them, and each line here is under the
 * `@ts-expect-error` that says why it is wrong, so a typing that stops refusing
 * it fails `typecheck:examples`. The full set, in every framework and against
 * the packed tarballs, is `bun run smoke:typings`, from `helix/cem/typings`.
 */
import type { HelixHeadlessButton } from '@fusion.dev/helix-headless'

// @ts-expect-error: a removed event class
export type Removed = import('@fusion.dev/helix-headless').HelixToggleEvent

export const Misuse = () => (
  <>
    <helix-headless-tabs
      // @ts-expect-error: a value outside the enum
      orientation="diagonal"
    />
    <helix-headless-switch
      // @ts-expect-error: a misspelled property
      chekced
    />
    <helix-headless-switch
      // @ts-expect-error: a detail field the event does not carry
      onhelix-before-check={(event) => event.detail.value}
    />
    {/* @ts-expect-error: a word for a numeric attribute */}
    <helix-headless-pagination default-page="abc" />
    <helix-headless-button
      // @ts-expect-error: an internal coordination member
      focusable
    />
  </>
)

export const focusable = (button: HelixHeadlessButton) =>
  // @ts-expect-error: an internal coordination member
  button.focusable

const element = document.createElement('helix-headless-switch')
// @ts-expect-error: a misspelled event, which has no typed detail
element.addEventListener('helix-before-chek', (event) => event.detail.checked)
// @ts-expect-error: a removed event name
element.addEventListener('helix-toggle', (event) => event.detail.checked)
