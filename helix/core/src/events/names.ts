/**
 * Every name this library dispatches.
 *
 * Exported so a runtime check can ask whether a name is one of ours without
 * keeping a second list of them. `HelixElement` uses it to tell a consumer that
 * the handler prop they wrote is attached to nothing.
 *
 * **Written as strings, in a module of its own, and not read off the
 * classes in `registry`.** Every element carries this set through its React
 * prop audit, and a set read off the classes kept every class alive in every
 * bundle: a Badge shipped all eighty of them. As strings, a family ships the
 * classes it dispatches and no others. `events.pure.spec.ts` holds this list to
 * the classes, so a class added without its name here fails.
 *
 * **Without the shared `helix-`, and separated by spaces.** Every element carries this
 * list, and as quoted strings each paid its quotes, its comma and the prefix.
 */
export const helixEventNames: ReadonlySet<string> = new Set(
  (
    'action activate aura-fallback band before-activate before-change before-close ' +
    'before-collapse before-edit before-listen before-move before-open before-panel-resize before-paste before-pin ' +
    'before-reconnect before-relabel before-reorder before-resize before-split before-toggle ' +
    'canvas-edit canvas-pan canvas-view canvas-zoom caret clear collapse complete ' +
    'connect console copy copy-error create device-button device-key device-screenshot ' +
    'device-scroll device-swipe device-tap device-text device-touch dismiss edit end expand facet filter ' +
    'filtered graph-filter graph-layout graph-pan graph-part-change graph-ready ' +
    'graph-signal graph-zoom history listen load load-more map-cluster map-pan map-part-change ' +
    'map-ready map-rotate map-tilt map-zoom move navigate next panel-resize pasted pin plot-change ' +
    'plot-turn press ' +
    'preview previous range-change read reading-change reading-press reconnect reject ' +
    'relabel remove reorder ' +
    'reordered resize resized sample-end sample-start scrolled select selected send ' +
    'shortcut sort sorted split strands-fallback terminal-bell terminal-input terminal-link ' +
    'terminal-resize terminal-restart terminal-title toggle tour-ask tour-status typing'
  )
    .split(' ')
    .map((name) => `helix-${name}`),
)
