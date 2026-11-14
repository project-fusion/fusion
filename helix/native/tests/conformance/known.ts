import type { Known } from '@fusion.dev/helix-testing/conformance'

/* Where React Native does something other than the web elements, and the
   difference waits on a decision. Each entry names the scenario, the intent
   by its place, counting from 1, and the cause. The native half writes the
   list with its record, and the comparison reports each entry and fails
   where one no longer differs, so the list stays true. */

export const KNOWN: readonly Known[] = []
