/**
 * An `exportparts` list that forwards each of an inner component's parts under
 * a prefix: `exportParts(['button', 'text'], 'copy')` is
 * `button: copy-button, text: copy-text`.
 *
 * **One list per inner component, written once beside it**, so the next part
 * Button gains reaches every family that renders a Button. Ten lists written
 * out by hand each had to be found and edited when Button gained `spinner`.
 *
 * The inner component's parts are its own declared list, never ones read from
 * a rendered element: the attribute is written on the server too, before
 * anything has rendered.
 */
export const exportParts = (parts: readonly string[], prefix: string): string =>
  parts.map((part) => `${part}: ${prefix}-${part}`).join(', ')
