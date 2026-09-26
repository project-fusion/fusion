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
    body: 'Memory. Engram keeps a store of what a system has seen and a store of what it has learned, and moves facts from the first to the second.',
    stage: 'Building',
    title: 'Engram',
  },
  {
    body: 'Provenance, and the core of Cortex. Trace links every memory, context, and output to its inputs, so you can check where any claim came from.',
    stage: 'Building',
    title: 'Trace',
  },
  {
    body: 'Context. Recall chooses which known facts to give a model for the task at hand. It is planned, and work has not started.',
    stage: 'Declared',
    title: 'Recall',
  },
]
