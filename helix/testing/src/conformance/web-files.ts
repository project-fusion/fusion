import type { Intent } from './format.js'
import type { Mounted } from './web-left.js'

/*
 * Picking files, as the web half of a conformance scenario performs it: the
 * element's own `<input type="file">` is answered as a browser answers it
 * once its chooser closes. A script cannot open the chooser, so the harness
 * stands in for the reader there.
 */

/** The element's file input, inside its shadow root. */
const fileInputOf = (mounted: Mounted): HTMLInputElement | undefined => {
  const found = mounted.root.shadowRoot?.querySelector('input[type="file"]')
  return found instanceof HTMLInputElement ? found : undefined
}

/**
 * Answers the element's chooser with `files`, as `File`s of their sizes,
 * and sends `input` and `change`, as a browser does once a reader chooses.
 * A closed chooser sends `cancel` and changes nothing. A disabled input
 * takes nothing, as a browser opens no chooser for one.
 */
export const pick = (
  mounted: Mounted,
  intent: Extract<Intent, { kind: 'pick' }>,
): string | undefined => {
  const input = fileInputOf(mounted)
  if (input === undefined) {
    return 'The element draws no file input.'
  }
  if (input.disabled) {
    return undefined
  }
  if (intent.files.length === 0) {
    input.dispatchEvent(new Event('cancel', { bubbles: true }))
    return undefined
  }
  const holding = new DataTransfer()
  for (const file of intent.files) {
    holding.items.add(new File([new Uint8Array(file.size)], file.name, { type: file.type }))
  }
  input.files = holding.files
  input.dispatchEvent(new Event('input', { bubbles: true, composed: true }))
  input.dispatchEvent(new Event('change', { bubbles: true }))
  return undefined
}

/** The names of the files the element holds, in order. */
export const filesOf = (mounted: Mounted): string[] =>
  [...((mounted.root as { files?: readonly File[] }).files ?? [])].map((file) => file.name)
