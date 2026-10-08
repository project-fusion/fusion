import type { CSSResult } from 'lit'

/**
 * Adds a sheet to an element's shadow root, after the sheets it already has,
 * once.
 *
 * **For a feature with an entry of its own**, such as Map's compass: the
 * styled tier's entry hands in the sheet that draws it, so a page that never
 * imports the feature carries none of its rules either. The element has
 * adopted its own sheets by the time the feature draws, so this one goes
 * last, where the rules stood at the end of the element's own sheet.
 *
 * Nothing where there is no shadow root, as on a server, or no sheet, as on
 * the headless tier.
 */
export const adoptSheet = (element: Element, sheet: CSSResult | undefined): void => {
  const root = element.shadowRoot
  const adopted = sheet?.styleSheet
  if (!root || !adopted || root.adoptedStyleSheets.includes(adopted)) {
    return
  }
  root.adoptedStyleSheets = [...root.adoptedStyleSheets, adopted]
}
