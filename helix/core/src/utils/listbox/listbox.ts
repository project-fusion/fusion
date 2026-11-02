/**
 * The arithmetic of a list of options, which the web element and a phone's
 * listbox machine both read.
 *
 * **A Shift range in a list of options adds only**, by `rangeAdd`: the options
 * it passes join what is chosen, and none is let go. The shared multiple
 * selection machine replaces the last range instead, so this list does not run
 * on that machine.
 */

export { selectsAll } from '../chord/chord.js'
export { chosenValues } from '../chosen-values/chosen-values.js'
export { columnStep } from '../column-step/column-step.js'
export { countLabel } from '../count-label/count-label.js'
export { type DataOption, type DataOptionItem, dataOptions } from '../data-options/data-options.js'
export { filterKeeps } from '../filter-marks/filter-marks.js'
export { pageRows } from '../grid-move/grid-move.js'
export { type Box, type Over, over } from '../option-over/option-over.js'
export { rangeAdd } from '../range-add/range-add.js'
export { Typeahead } from '../typeahead/typeahead.js'
export { toggleEvery } from '../written-list/written-list.js'
export { highlightStep } from './highlight-step.js'
