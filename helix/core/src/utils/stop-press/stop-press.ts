/**
 * Keeps a press on one of a component's own buttons inside the component.
 *
 * A Button or an Icon Button a component composes sends `helix-press`, which
 * bubbles and crosses shadow roots. The page hears what the press did through
 * the component's own events, and not that a button inside it was pressed, so
 * a component binds this as the button's `@helix-press` listener.
 */
export const stopPress = (event: Event): void => {
  event.stopPropagation()
}
