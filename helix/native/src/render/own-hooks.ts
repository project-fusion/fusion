/**
 * The hooks an element sets on itself with its `hooks` prop, by each hook's
 * name after the family's prefix.
 *
 * **They stand over every other hook the element reads**, as an inline
 * `style` on the web stands over every rule and over what the elements around
 * set, so `element.tsx` lays them over what the element around sets. What the
 * element sets this way inherits into its parts and the content passed into
 * it, as a custom property inherits.
 */

/** A hook's name in camel case as the web writes it: `backgroundColor` is `background-color`. */
const kebab = (name: string): string => name.replace(/[A-Z]/g, (upper) => `-${upper.toLowerCase()}`)

/** Each hook `own` sets that holds a number or words, by its name as the web writes it. */
export const ownHooks = (own: unknown): Record<string, number | string> => {
  const hooks: Record<string, number | string> = {}
  if (typeof own !== 'object' || own === null) {
    return hooks
  }
  for (const [name, said] of Object.entries(own)) {
    if (typeof said === 'string' || typeof said === 'number') {
      hooks[kebab(name)] = said
    }
  }
  return hooks
}

/**
 * **The custom properties a `style` writes on an element**, by their names after
 * the two dashes, as an inline style sets them on the web:
 * `style={{ '--chat-message-background-color': '#3366cc' }}`.
 */
export const styleCustom = (style: unknown): Record<string, number | string> => {
  const custom: Record<string, number | string> = {}
  if (typeof style !== 'object' || style === null) {
    return custom
  }
  for (const [name, said] of Object.entries(style)) {
    if (name.startsWith('--') && (typeof said === 'string' || typeof said === 'number')) {
      custom[name.slice(2)] = said
    }
  }
  return custom
}
