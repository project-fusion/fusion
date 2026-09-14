/**
 * Text as a TypeScript source literal, for the generators that write modules.
 *
 * Three generators escaped the same three characters for a template literal
 * and two of them quoted the same way, so a fourth would have copied one of
 * them. Which quote a string ends up in is the formatter's decision: every
 * generated module goes through `formatted`, so what is escaped here is only
 * what would otherwise end the literal early.
 */

/** A single-quoted string literal. */
export const quoted = (value) => `'${value.replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`

/**
 * The body of a template literal.
 *
 * Backticks and `${` would otherwise terminate the literal or start an
 * interpolation, turning prose or a stylesheet into a syntax error or, worse,
 * into an expression that happens to parse.
 */
export const template = (value) =>
  value.replace(/\\/g, '\\\\').replace(/`/g, '\\`').replace(/\$\{/g, '\\${')
