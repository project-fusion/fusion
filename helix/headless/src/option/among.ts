import type { HelixHeadlessOption } from './root/option-root.js'

/*
 * What a container reads its options with, in a module that registers nothing.
 *
 * Select, Combobox, Listbox and Command hold options and never draw them: an
 * option is an element the page writes and imports, through
 * `@fusion.dev/helix-headless/option`. The containers import this rather than
 * `option-root.ts`, whose import would register the option for them.
 */

/**
 * Whether an element is an option, by its shape.
 *
 * **Not by `instanceof`.** A tag is defined once, by whichever copy of this
 * class registered it first, and a second copy in the same document tests
 * against a class no element on the page has: every option failed it, and a
 * select said "Choose" over its value. Two copies are a consumer with a
 * duplicated dependency, or the browser specs, where each family's bundle
 * carries its own and they share one page. An option nobody registered has no
 * such shape, and is no option until its entry is imported.
 */
export const isOption = (element: Element): element is HelixHeadlessOption =>
  'text' in element && 'value' in element && 'selected' in element

/**
 * The options among some elements, reaching one level into a group.
 *
 * What a control holding options reads its words from, off its own children
 * rather than off the listbox they are slotted into: the slot exists only once a
 * render has made it, so the listbox has none on a first render, and on a page a
 * server rendered the `slotchange` that would correct it fires before anything
 * listens.
 */
export const optionsAmong = (elements: readonly Element[]): HelixHeadlessOption[] =>
  elements.flatMap((element) =>
    isOption(element) ? [element] : [...element.children].filter(isOption),
  )
