/**
 * Whether a click is a plain press of the main button, with no Command,
 * Control, Shift or Alt held.
 *
 * A link pressed any other way opens where the browser opens it, a new tab or
 * a new window, so an element that acts on a link's click first (a tab
 * choosing itself, a skip link moving focus, an outline scrolling) leaves
 * every other click to the browser.
 */
export const plainClick = (event: MouseEvent): boolean =>
  event.button === 0 && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey
