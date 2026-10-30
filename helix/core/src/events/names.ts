/**
 * Every name this library dispatches.
 *
 * Exported so a runtime check can ask whether a name is one of ours without
 * keeping a second list of them. `HelixElement` uses it to tell a consumer that
 * the handler prop they wrote is attached to nothing.
 *
 * **Core lists the events that more than one family sends, and a family adds
 * its own.** The names below are the classes in this folder, written as strings
 * so a set read off the classes does not keep every class in every bundle. A
 * family folder holds the events only that family sends and calls
 * `registerEventNames` with them when its `events/index.ts` loads, so an
 * element that is loaded is checked against its own names and a bundle carries
 * the names of the families it imports. `events.pure.spec.ts` holds this list
 * to the classes, so a class added here without its name fails.
 *
 * **Without the shared `helix-`, and separated by spaces.** Every element carries this
 * list, and as quoted strings each paid its quotes, its comma and the prefix.
 */
const names = new Set(
  (
    'activate before-activate before-change before-check before-close before-filter ' +
    'before-listen before-navigate before-open before-pin before-reorder before-resize ' +
    'before-select before-sort check clear complete copy copy-error dismiss expand ' +
    'filter found listen load load-more navigate pin plot-change plot-turn ' +
    'reading-change reading-press reorder resize resized select sort'
  )
    .split(' ')
    .map((name) => `helix-${name}`),
)

/** Every name this library dispatches, including each loaded family's own. */
export const helixEventNames: ReadonlySet<string> = names

/**
 * Adds the names a family dispatches. Called by the family's `events/index.ts`
 * when it loads, with the full names, `helix-` included.
 */
export const registerEventNames = (added: Iterable<string>): void => {
  for (const name of added) {
    names.add(name)
  }
}
