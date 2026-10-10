/**
 * The three modules inside Cortex that earn an evocative name.
 *
 * **They are described here and not named in the megamenu**, which is the
 * decision on 199. Helix's rows are Components, Sandbox and Theme builder, none
 * of which is one of its packages: `core`, `headless` and `web` are what Helix
 * is made of and appear in no row, because a row is a place a reader goes and
 * not a part a product has. A Cortex column reading Engram, Trace and Recall
 * would be the first place on the site where those two axes are confused, and
 * it would read as a list of destinations that is really a bill of materials.
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
  /** What it does, in the product's own terms. */
  body: string
  /** Its one-word job, worn as the cell's claim. `Memory`, `Provenance`, `Context`. */
  job: string
  /** The drawing over its name, by the name `site-nav/tiles.tsx` gives it. */
  picture: string
  /** Its own stage, which is never the product's. */
  stage: 'Building' | 'Declared'
  /** The evocative name, which it earns by carrying a differentiated idea. */
  title: string
}

export const CORTEX_MODULES: CortexModule[] = [
  {
    body: 'Engram keeps a store of what a system has seen and a store of what it has learned, and moves facts from the first to the second.',
    job: 'Memory',
    picture: 'engram',
    stage: 'Building',
    title: 'Engram',
  },
  {
    body: 'Trace links every memory, context, and output to its inputs, so you can check where any claim came from. It is the core of Cortex.',
    job: 'Provenance',
    picture: 'trace',
    stage: 'Building',
    title: 'Trace',
  },
  {
    body: 'Recall chooses which known facts to give a model for the task at hand. It is planned, and work has not started.',
    job: 'Context',
    picture: 'recall',
    stage: 'Declared',
    title: 'Recall',
  },
]
