/**
 * The three modules inside Cortex that earn an evocative name.
 *
 * **They are described here rather than named in the megamenu**, which is the
 * decision on 199. Helix's rows are Components, Sandbox and Theme builder, none
 * of which is one of its packages: `core`, `headless` and `web` are what Helix
 * is made of and appear in no row, because a row is a place a reader goes
 * rather than a part a product has. A Cortex column reading Engram, Trace and
 * Recall would be the first place on the site where those two axes are
 * confused, and it would read as a list of destinations that is really a bill
 * of materials.
 *
 * **A row named Engram also asserts an Engram**, which is the thing the stage
 * labels exist to prevent: a reader who clicks one and lands on a page saying
 * Declared has been told two different things in two seconds. So the names live
 * one level down, where each carries its own stage beside it and the difference
 * between them is visible.
 *
 * Two of the three are further along than the panel suggests and one has no
 * folder at all, which is exactly why they cannot share a label.
 */
export interface CortexModule {
  /** What it is for, in the product's own terms. */
  body: string
  /** Its own stage, which is never the product's. */
  stage: 'Building' | 'Declared'
  /** The evocative name, which it earns by carrying a differentiated idea. */
  title: string
}

export const CORTEX_MODULES: CortexModule[] = [
  {
    body: 'Memory. Episodic and semantic stores, and the consolidation between them: what a system has seen, and what it has come to know from seeing it.',
    stage: 'Building',
    title: 'Engram',
  },
  {
    body: 'Provenance, and the spine of the whole product. Every memory, every context assembly and every output traces to its inputs, which is what makes a claim answerable rather than merely stored.',
    stage: 'Building',
    title: 'Trace',
  },
  {
    body: 'Context. Which of what is known belongs in front of the model right now. Committed direction with no work started, and it is the one of the three with no folder yet.',
    stage: 'Declared',
    title: 'Recall',
  },
]
