/**
 * What the controlled-property constraint must and must not reject.
 *
 * Read by `tooling/scripts/check-controlled.mjs`, which runs `tsc` over this
 * file and compares the diagnostics against the `@expect` lines below. It is
 * deliberately outside every package's `tsconfig`, because half of it is
 * supposed to fail: nothing else should ever typecheck it.
 *
 * `@expect <code>` asserts that the next line reports exactly that diagnostic.
 * Any line without one must report nothing. Both directions matter. A
 * constraint that stopped constraining and a constraint that grew too strict
 * are the same kind of silent, and the second is the one that reaches a
 * consumer as "the library will not let me write correct code".
 */
import '@helix-io/web/jsx'
import type { HelixInput } from '@helix-io/web'
import type { Ref } from 'react'

// The trap: `value` is a claim of ownership, and nothing here answers it.
// @expect TS2322
const unanswered = <helix-input label="Name" value="Ada" />

// Both directions of a controlled overlay go unanswered.
// @expect TS2322
const overlay = <helix-dialog label="Confirm" open />

// Answered through the prop, which is the path the docs send people down.
const answered = <helix-input label="Name" onhelix-change={() => {}} value="Ada" />

// Answered imperatively behind a ref, which a type cannot see and must allow.
const imperative = (field: Ref<HelixInput>) => <helix-input label="Name" ref={field} value="Ada" />

// Seeded rather than owned, so there is nothing to answer.
const seeded = <helix-input default-value="Ada" label="Name" />

// `active` is left out of the constraint on purpose: a route owns it, and the
// change is answered by a real anchor rather than by a handler.
const routed = <helix-tree active="components" label="Docs" />

// Controlled without a controller mixin anywhere in sight. `page` is declared on
// the component itself, which is how a third of the controlled surface went
// unguarded while every check passed.
// @expect TS2322
const paged = <helix-pagination page={3} pages={10} />

const pagedAnswered = <helix-pagination onhelix-navigate={() => {}} page={3} pages={10} />

void [unanswered, overlay, answered, imperative, seeded, routed, paged, pagedAnswered]
