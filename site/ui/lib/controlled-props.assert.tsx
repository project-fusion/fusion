import type { HelixInput } from '@helix-io/web'
import type { Ref } from 'react'

/**
 * Assertions that a controlled property cannot be declared without an answer.
 *
 * **Not a spec, deliberately.** Specs are excluded from `tsconfig`, and the only
 * thing being asserted here is what the compiler does, so a file it never reads
 * would assert nothing. This is an ordinary module the site typechecks, exports
 * nothing, and nothing imports, so it never reaches a bundle.
 *
 * `@ts-expect-error` is the whole mechanism: it fails the build if the error it
 * names stops happening. The generated union lives in `jsx.d.ts` and is written
 * by `helix-controlled-props` at analyze time, several steps from anything a
 * person edits, and it went from covering 24 tags to covering 194 on one regex
 * change. Without this, the way to find out it had quietly stopped constraining
 * anything would be a consumer's frozen input.
 *
 * The other direction is covered by the site itself: the workbench answers its
 * filter field through a ref and `useHelixEvent`, and the documentation nav
 * derives a tree's `active` from the route. Both typecheck in the ordinary
 * course of `bun run typecheck`, so a rule that grew too strict fails there.
 */

// @ts-expect-error `value` is a claim of ownership, and nothing here answers it.
const unanswered = <helix-input label="Name" value="Ada" />

// @ts-expect-error `open` is controlled, and neither direction is answered.
const overlay = <helix-dialog label="Confirm" open />

const answered = <helix-input label="Name" onhelix-change={() => {}} value="Ada" />

const imperative = (field: Ref<HelixInput>) => <helix-input label="Name" ref={field} value="Ada" />

const seeded = <helix-input default-value="Ada" label="Name" />

/* Referenced so nothing is reported as unused. The array is never exported and
   this module is never imported, so it exists only for the compiler. */
void [unanswered, overlay, answered, imperative, seeded]
