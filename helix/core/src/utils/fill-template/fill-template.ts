/**
 * A label with its `{placeholders}` filled in.
 *
 * **The one way every translatable sentence here is written**: a property holds
 * the whole sentence, and the numbers and names go in where it says. A
 * sentence built from pieces in code puts the pieces in English order, and
 * another language may want them the other way round.
 *
 * Every occurrence is filled, so a sentence can name the same thing twice. A
 * placeholder with no value is left as written rather than emptied, which
 * shows up on the page as the mistake it is.
 */
export const fillTemplate = (template: string, values: Record<string, string | number>): string =>
  Object.entries(values).reduce(
    (out, [key, value]) => out.replaceAll(`{${key}}`, String(value)),
    template,
  )
